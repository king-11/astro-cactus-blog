---
title: Zombies in Production
description: An incident report on how we found about zombie processes in our java service and the resolution to that problem using zombie reaper while ensuring signal handling.
tags:
  - tech
  - operating-system
publishDate: 2026-06-01
coverImage:
  src: cover.webp
  alt: police controlling a riot
---

I recently encountered those supposedly _theoretical_ OS concepts from college, in a real production service.

This blog would be like an incident report filled with actual deep technical insights unlike the ones you ought to write for your leadership in the aftermath of an outage.

I would cover the change that caused regression and how it slipped past our QA testing. Then the triage using [**Claude Code**](https://claude.com/product/claude-code), and coming to a final fix that handles both signal passing and zombie reaping.

## Process Signal Handling
In my earlier blog about git crawler uptime, I briefly talked about [process signals](https://blog.king-11.dev/posts/oom-prevention/). Process receive signal from operating system around different events:
- `SIGTERM` -> termination signal
- `SIGKILL` -> kill program
- `SIGINT` -> interrupt program
- `SIGSEGV` -> segmentation violation

There is a whole [bunch](https://man7.org/linux/man-pages/man7/signal.7.html#:~:text=Linux%20supports%20the,POSIX.1%2D2024.) of these through which operating system communicates with processes.

I was working on adding `SIGTERM` handler into git crawler service on the suspicion of a **disk corruption** (which wasn't the case) as a result of not handling `SIGTERM` properly. For a java [servlet](https://stackoverflow.com/a/7226610/13854616) (class that handles http requests) it is done by subscribing to [context](https://docs.oracle.com/javaee/7/api/javax/servlet/ServletContext.html) [destruction](https://docs.oracle.com/javaee/7/api/javax/servlet/ServletContextListener.html#contextDestroyed-javax.servlet.ServletContextEvent-) events.
```java
public class GitCrawlerServletContextListener implements ServletContextListener {
  public void contextInitialized(ServletContextEvent servletContextEvent) {
	 // dependency injection
  }

  @Override
  public void contextDestroyed(ServletContextEvent servletContextEvent) {
	// ShellCommandRunner executes git commands using thread pool executor
    ShellCommandRunner.shutdownExecutors();
    logger.strictlySafe("Executor Shutdown Successful", Level.INFO);
  }
}
```

For Git Crawler specifically we perform the following operations on `SIGTERM`:
- The thread pool executors are shutdown
- Running processes receive an `InterruptedException`
	- Process is sent graceful stop (`SIGTERM`)
	- Process is forcibly killed (`SIGKILL`) after a wait of 5s

## Signal Passing in Containers
I thought my task was done by implementing signal handling. As you expected it wasn't otherwise I won't be writing this blog because:
:::info
Shells _ignore_ `SIGTERM` by default.
:::

`bash` [ignores](https://www.gnu.org/software/bash/manual/html_node/Signals.html) `SIGTERM` in interactive mode to prevent accidental self termination from commands like `kill 0` which are supposed to kill everything in the process group.

This relates to our java service because it is started in a container using a shell script.
```dockerfile
ENTRYPOINT ["/home/startup.sh"]
```

:::info
Java services generally use a script for startup because they setup environment variables, threadpool config files, etc before running the `jar` file.
:::

The way around it as our beloved co-worker claude code suggested was to startup java process using `exec` which makes the java process replace parent process, making it **PID1**.
```diff
-  java -jar "$JETTY_HOME"/start.jar --exec -XX:MaxRAMPercentage=80.0 -XX:+ExitOnOutOfMemoryError \
+  exec java -jar "$JETTY_HOME"/start.jar --exec -XX:MaxRAMPercentage=80.0 -XX:+ExitOnOutOfMemoryError \
```

Now, given the child process itself is PID1 it will receive all the signals from container runtime.

:::error
The only difference that got missed here was `bash` reaps all kinds of processes, whereas `java` **doesn't reap beyond its direct child**.
:::

### What makes a zombie?
A process carries an entry in process table even after completing so that the parent can check on its exit status. Hence, a parent process has to use system call like [wait](https://man7.org/linux/man-pages/man2/wait.2.html) or [waitpid](https://linux.die.net/man/2/waitpid), which _reaps_ the process from process table.

If parent doesn't reap the child process, child process becomes **zombie**, and retains entry in process table until restart.

:::info
Process table stores details about each process's identifier, state, parent id, etc.
:::

## QA Testing
At glean our quality bar is pretty high before shipping things. It enabled our QA team to catch this regression. They raised an _escalation_ but during triage, the errors on-call saw seemed like _OOMs_. The below was captured in application logs when trying to start a new git command:
```
java.io.IOException: Cannot run program "bash": error=11, Resource temporarily unavailable
```

:::info
Exit code `11` represents resource exhaustion.
:::

We also saw below error messages in VM system logs:
```
java.lang.OutOfMemoryError: unable to create native thread: possibly out of memory or process/resource limits reached.
```

The on-call given the history of OOMs _assumed_ that it was due to memory and started deploy operation to recreate the VM. This led to process table getting _purged_ and QA being able to run their test scenarios without failure this time.

:::note
PID table has a limit of `38515` so it was taking ~3.5hrs for limit to exhaust.
:::

Checking memory metrics after recreation was already underway, it was found that only `12/32Gi` was being used. Given QA team was successful at running scenarios and on-call load was too high, nobody spent time on finding the real root cause.

:::warning
If on-call load is too high people don't really get time to think through forward looking resolutions or even thorough triages. They just try to get done with escalations quickly as there are already too many.
:::

The release went out to all customers but soon enough in the next release's QA testing this error came up again but this time the on-call spent time on root causing it.

## Finding Zombies
On-call took help from **claude code** and asked it to triage. Claude Code figured out, given access to the virtual machine where service was running that it was due to a large number of zombie processes.

:::tip
LLMs don't have notion of [time and laziness](https://bcantrill.dtrace.org/2026/04/12/the-peril-of-laziness-lost/) so they are great at hammering onto things.
:::

Using below command, we could see that the number of zombie processes was pretty high.
```bash
ps -eo pid,ppid,command,args,state | grep -c ^Z
```

:::info
`Z` is the state value for a zombie process in process table.
:::

[Control Groups](https://man7.org/linux/man-pages/man7/cgroups.7.html) have a limit on total number of process ids its allowed to create which could be found as below:
```bash
CONTAINER_ID=$(sudo docker inspect klt-git-crawler-ghlv --format '{{.Id}}')
CGROUP_PATH="/sys/fs/cgroup/system.slice/docker-${CONTAINER_ID}.scope"

cat ${CGROUP_PATH}/pids.current   # → 38515
cat ${CGROUP_PATH}/pids.max       # → 38515
cat ${CGROUP_PATH}/cgroup.procs | wc -l   # → 2
```

From the results, we understood that there were a lot of _"orphaned processes"_ which were becoming **zombies** as java wasn't reaping them, unlike `bash`.

:::info
An orphaned process is the one where parent didn't wait for child to complete, so it gets assigned to `init` or PID 1 for handling.
:::

A quick workaround is by setting the PID limit to `max` which allows more processes to be created.
```bash
echo max > ${CGROUP_PATH}/pids.max
```

## Signal & Reaping
Given `SIGTERM` handling was less important than preventing zombie process accumulation we _reverted_ the change and cherry-picked to all the customers.

The next step was to use a better `init` process for our containers that:
- Handles `SIGTERM` by propagating to the children
- Reaps zombie processes

The alternatives that are readily used are [tini](https://github.com/krallin/tini) and [dumb-init](https://github.com/Yelp/dumb-init).

:::info
`tini` is used by docker containers by default if `--init` command is passed.
:::

We also went ahead with using `tini` as the init process and `java` process started using `exec` replacing its parent shell.
- `tini` reaps zombies as PID1
- `java` receives `SIGTERM`

## Final Thoughts
Nobody, ever said _how much fun they had as on-call_, but here I must even though I wasn't on-call. Being involved in triage and seeing the theoretical concepts taught in class come to life was pretty **educating**.

Even though I was aware of `tini`, I never understood its requirement maybe I shouldn't have been lazy and read its [why tini?](https://github.com/krallin/tini#why-tini) section. I hope you are aware of the repercussions of not using the right `init` process for containers now.

I'm still trying to figure out what particularly in our usage of `git` command execution caused zombie spawn. A hint was it had something to do with pattern of using sub-shells while running commands. Each sub-shell spawns a new process which doesn't get _reaped_.
```bash
bash -c "
  (cd $REPO_DIR && git remote set-url origin $FETCH_URL) &&
  (if git rev-parse --verify HEAD --quiet >/dev/null 2>&1; then
    git log --oneline $LAST_KNOWN_HEAD;
  fi) &&
  (echo DONE > $METADATA_ID.status)
"
```

![plants vs zombies](https://c.tenor.com/ETbs0_d_37AAAAAC/tenor.gif)

Nevertheless, I hope everyone keeps those zombies in check! Thanks for reading, see you in the next blog.

Cover photo by <a href="https://unsplash.com/@spenserh">Spenser H</a>.
