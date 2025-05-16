---
title: Process Management
description: Process is a program in executing mode interacting with system and making
  changes to its state. But how do we manage the life cycle of a process from creating
  it, waiting for it, killing it or communicating with it?
tags:
- tech
- os
- process
publishDate: 2024-10-13
coverImage:
  src: process-management.webp
  alt: Process Management
---

A process is the entity which gets created for executing the program when we run the following commands in a shell
```bash
## compile the program by running gcc
gcc program.c -o a.out
## run the program itself
./a.out
```

Both the above lines lead to execution of two new processes which lead to completion and return the control back to `shell`. Shell in itself is a process, so how is that a process creates a new process?

### Process Creation
A process is created when one executing process calls **[fork](https://linux.die.net/man/2/fork)** system call. This creates a new process which shares the memory space with parent process as _copy on write_ optimisation. They both start executing same program from the point of `fork` call.

```c
#include <stdio.h>
#include <unistd.h>
#include <errno.h>

int main() {
  int pid = fork();
  if (pid < 0) {
    fprintf(stderr, "fork failed %d", errno);
  } else if (pid == 0) {
    printf("I am the child process %d\n", getpid());
  } else {
    printf("I am %d the parent process and father of %d\n", getpid(), pid);
  }
}
```

The `fork` function returns the process id (PID) of child process to parent process and in case of child process it returns a `0`. In case the call is unsuccessful we are returned a negative value.

#### Process Tree
A question comes into mind if a process creates a process who created the first process? what was it? We can run `ps -eaf` to find out
```bash
UID          PID    PPID  C STIME TTY          TIME CMD
root           1       0  0 10:10 ?        00:00:03 /usr/lib/systemd/systemd --switched-root --system --deserialize=45 rhgb
root           2       0  0 10:10 ?        00:00:00 [kthreadd]
```

The result shows us proces with PID `1` and `2`, but what is `0`? The first process that gets created by kernel is the `sched` process which is assigned a PID of `0`. It then goes on and creates two processes the `init` process and `kthread`.

The **[init](https://linux.die.net/man/8/init)** is called the father of all processes with PID of `1`, it is created when the kernel calls `init_task`. `init` is the process management daemon, in some systems it could be `systemd` as well like above.

The process tree can be found starting from PID `0` as root node by running `pstree`, it will provide all details about who ~~forked~~ created what?
```
pstree 0
```

The most interesting for me was seeing what we have always been taught, the hierarchy from kernel to shell to my browser of choice.

```mermaid
graph LR
	K[kernel] --> I
	I[init] --> S[systemd]
	S --> GS[gnome-shell]
	GS --> B[brave]
```

### Waiting for Process
The parent process being a good parent might wanna wait for the child to exit before completing itself.
![wait for me](https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExbndwaHQ4cGxtb2hnNzVtaDcwaHl6dHl0a3Vqd2owcmt6c3p1dTY2dSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/L8hdZuf5cJ7mo/giphy-downsized.gif)

The parent process can wait on it using `wait` system call. It suspends the execution of parent until one of its children terminates and returns the PID of that child.
```c
int status = 0;
int waited_for_child = wait(&status);
```

The `status` can be utilised with other `macros` to see how the child terminated, was it `exit` call, a signal that terminated or stopped it, etc.

A more powerful sibling of wait is **[waitid](https://linux.die.net/man/2/waitid)** which provides a far more granular control over what to wait for, when to wait for and a lot more information about the child.
```c
siginfo_t *infop = (siginfo_t *)malloc(sizeof(siginfo_t));
int ret_val = waitid(P_PID, pid, infop, WEXITED | WSTOPPED);
printf("I am parent of %d (pid:%d) (status:%d)", pid, getpid(), infop->si_status);
```

In above example we are telling `waitid` to wait for a process (`P_PID`) with id `pid`, fill the information back into `siginfo_t` which contains pid, status, user, code, etc in case a children has **exited** (`WEXITED`) or was stopped by a **signal** (`WSTOPPED`).

#### Zombie Process
A child that terminates, but has not been waited for becomes a "***zombie***". The kernel maintains information about zombie processes so that parent can later `wait` on them to obtain information about the child.
![zombie](https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExazl6OWprMDg0a290YWFyOHljdncwOW03dDFiN3QzcXpzNDltOHVucyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/fXb4sSFXz3hNKo4rAs/giphy.gif)

If the zombie is not removed from the system via a `wait`, it will consume a slot in the **kernel process table**, and if this table fills, it will not be possible to create further processes.

>If a parent process terminates though, then its "zombie" children (if any) are adopted by [init](#process-tree), which automatically performs a `wait` to remove the zombies.

### Executing New Program
After `fork` two processes are running the same program what if we wish for `child` to run a different program like in `shell`? Here comes the **[exec](https://linux.die.net/man/3/execvp)** family of functions.

The `exec` function call replaces the the current process space and starts executing a new program in it.
```c
char *args[3];
args[0] = strdup("ls");
args[1] = strdup("/home");
args[2] = NULL;
execvp(args[0], args);
// program was replaced above with ls
printf("this won't print");
```

`execvp` is passed a `NULL` terminated array of strings (`char *`), the first argument is the program to execute (it will lookup `PATH` environment variable as well for it) and second argument is arguments passed to the program.

>The 0th argument is always the name of the program.

#### Variants
There are multiple variants in `exec` family.

```mermaid
graph TD
	E[exec] --> cl[execl]
	E --> cv[execv]
	cl --> cle[execle]
	cl --> clp[execlp]
	cv --> cve[execve]
	cv --> cvp[execvp]
	cv --> cvpe[execvpe]
```

The `cl` class of functions take in multiple arguments which can be thought of as `arg0`, `arg1`, `arg2`, etc. The `v` class of functions take an array of `NULL` terminated strings as argument ending with `NULL`.

The suffix `e` in function name implies that it can be used to change the environment of its execution. By passing an array of null terminated strings `key=value` we can modify the environment.

The suffix `p` in function name implies that it will search for executable program in the space defined by `PATH` variable if name of executable doesn't start with a `/`.

### Why both fork and exec?
The process of creating a process is separated into `fork` and `exec` because the program can then modify the environment of child process after `fork` call but before the `exec` call enabling a variety of interesting features.

```c
if (pid == 0) {
	close(STDOUT_FILENO);
	open("./output", O_CREAT | O_WRONLY | O_TRUNC, S_IRWXU);
	// execvp a program
}
```

The above code is how `ls -l > output` would work. By closing the `stdout` file descriptor we allow *first file descriptor* to be assigned to `output` file instead and then executing program will write to it assuming its `stdout`.

### Signals
The **[kill](https://linux.die.net/man/3/kill)** system call is used to send signals to process. The process also has to listen for signals using `signal` system call so as to properly react on receiving them. Signals should be handled/caught by the process in graceful manner

Some common signals are:

| Signal  | Command  | Task                             |
| :-----: | -------- | -------------------------------- |
| SIGINT  | CTRL + C | interrupt                        |
| SIGSTP  | CTRL + Z | stop (bring back using `fg`)     |
| SIGKILL | -        | kill immediately `kill -9`       |
| SIGTERM | -        | politely ask to terminate `kill` |

```c
kill(SIGTERM, pid);
```

`kill` can send signal like `SIGTERM` to group its a part of, all the processes in system which it can send signal to so it can be catastrophic if you run something like
```c
kill(SIGKILL, -1);
```

![burn them all](https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExbDdiam8wMzI5MHhjOGpqczNqaGM3ejlvdW42NTZkOWo0OGd0Z2IxNiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/11C9FF35M6aXu0/giphy.gif)

### Conclusion
Managing process is something that's usually abstracted but in case you want to build the next `shell` its important to understand these system calls. It's crucial to understand the *relationship* between different processes running on your operating system.

Apart from that the most important thing I feel is about handling signals, your process should cleanup all resources properly on receiving them before a `SIGKILL` is dropped.

![thank you arigato](https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExczIzODE2bDdnNzNjYWE1ODAxZTI4cWxwZXkxcGJwM3Y4dm0xb213dCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3ohhwh1Nme90Zf0B6E/giphy.gif)
As always **Arigato gozaimasu** for reading and reach out to me on [@1108King](https://twitter.com/1108King) in case you have any queries or suggestions. I was travelling for the past 10 days finally back home and ready for the next flight. It's been 10/10 trips now just 2 more to go :))
