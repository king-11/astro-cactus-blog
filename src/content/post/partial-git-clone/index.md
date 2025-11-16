---
title: Partial Git Clones
description: Partial Git Clones are a way to save on time and resources that it takes to do full clones by carrying only the information that is necessary for you to complete a task
publishDate: 2025-11-17
coverImage:
  src: cover.webp
  alt: A river winding down the plains
tags:
  - tech
  - git
---

I was recently tasked with **auto scaling** the disk associated with VM that we make use of for crawling git repositories and indexing the code files as it otherwise needed *manual intervention* to increase the size whenever there was **no space left** on disk.

However, I took a step back to find ways on **saving disk space** and **improving crawl times** instead of just doing autoscaling because I had briefly read about the existence of such cloning techniques.

This took me down the rabbit hole of sparse git clones, the caveats associated with them, reading through the RFC and a journey of finally making it work.

So, in this article I intend to share details on what are sparse clones and details associated with their working. Let's begin with understanding how we used to crawl git metadata prior to my changes.

## Existing Algorithm
For indexing the contents present in the code repositories we want to gather following details:
- create and update time for code files
- files or directories that were deleted
- oldest and latest commit associated with each file
- contents of code files

Above all content and metadata is needed for developing **complete context** of the code repositories. The older flow used to look as below for each repository:

```mermaid
sequenceDiagram
	participant C as Crawler
	participant V as Git VM
	participant S as Storage

    C->>V: Clone repository
    loop Poll until complete
        C->>V: Check clone status
        V-->>C: IN_PROGRESS/SUCCESS
    end

    C->>V: Write logs
	V->>S: Upload Logs
    loop Poll until complete
        C->>V: Check write logs status
        V-->>C: IN_PROGRESS/SUCCESS
    end

    C->>V: Directory Diff
	V->>S: Upload Directory Diff
    V-->>C: SUCCESS

    C->>V: Write Files at HEAD
	V->>S: Upload Files at HEAD
    V-->>C: SUCCESS

	C->>C: Parse Directory Diff
	C->>S: Create/Delete Directories

	C->>C: Parse Files at HEAD
	C->>C: Parse Logs
	C->>S: Create/Delete/Update Files

    par File Content Fetching
        C->>V: Get file 1
        and
        C->>V: Get file 2
        and
        C->>V: Get file N
    end

    V-->>C: File contents
    C->>S: Create content docs
```

:::info
We use a compute instance separate from crawlers because tasks like `clone`, `pull`, `log`, etc. are long running IO operations which we want to keep away from CPU intensive crawlers.
:::

### Git Commands
For each of the above tasks the associated git commands look as follows:

| Task                | Git Command                                   |
| ------------------- | --------------------------------------------- |
| Clone               | git clone                                     |
| Write Logs          | git log -c --name-status --diff-filter='AMRD' |
| Write Directories   | git ls-tree -d -r --name-only HEAD            |
| Diff Directories    | diff $OLD_HEAD_DIRS $NEW_HEAD_DIRS            |
| Write Files at HEAD | git ls-tree -r --name-only HEAD               |

:::note
Additionally, we also make use of `pull` for dealing with recently updated content instead of having to download and parse the _complete_ repo metadata again.
:::

The additional parameters in git log command serve the following purposes:
- `-c`: Produce combined diff output for merge commits where conflict resolution was required.
- `--name-status`: Adds detail about whether a file was modified, renamed, added or deleted
- `--diff-filter='AMRD'`: Provides details about only particular kind of change in output

The `ls-tree` command is used to list the files and directories in git the flags are for the following reason:
- `-r`: recurse into sub directory instead of just limiting to the present directory
- `-d`: show only directories
- `--name-only`: show path of file or directory without object type

Without `-d` and with `-r` we get all the files in repository.

:::info
Our use of `ls-tree` is very similar to `ls` but with `ls-tree` we can go in history to see directories that were deleted by diffing current `HEAD` and previous commit.
:::

Before proceeding with the optimizations in the current flow we need to get some basic understanding of how git organizes it's data.

## Data Organization
Git organizes the historical data we have in our files and directories into following entities:
- tree (directory -> triangle)
- blob (file -> squares)
- commitish (commit, branch, tag, etc -> circles)

The time flows from left to right in below diagram.
![git repository data organization](full.webp)

:::note
`HEAD` is the reference where your repository is currently set at.
:::

When we execute a git clone, the client requests data from server (*git forge*) for all the latest commits and then every tree and blob associated with these commits are also fetched.

With an increasing amount of code in age of LLMs git histories and transitively the amount of blobs and trees that are present in repositories are increasing at an exponential rate.

:::question
But do we really need the full change history or data?
:::

## Partial and Shallow Clones
There can be different scenarios of what data we need while cloning:
- We just need the `HEAD` and it's associated trees and blobs but no history
- We only need the blobs at `HEAD` but trees from complete history
- We only need blobs and tress at `HEAD` but complete history

For the above cited scenarios where we don't care about the full data for repository, we can use partial or shallow clones which are more suited and efficient option.

Partial clone feature is accessible using the [`--filter`](https://git-scm.com/docs/git-clone#Documentation/git-clone.txt---filterltfilter-specgt) argument with `clone` command. The full list of filter options exist in the [`git rev-list`](https://git-scm.com/docs/git-rev-list#Documentation/git-rev-list.txt---filterltfilter-specgt) documentation.

There are two specific kinds of clone that we can make use of for the above cited cases.

### Blobs at HEAD
We only need the blobs at `HEAD` along trees from complete history.
```bash
git clone --filter=blob:none
```

Below is how the git repository storage will look like
![blobless clone data organizaion](blobless.webp)

### Trees at HEAD
We only need the blobs and trees at `HEAD` along with the complete history.
```bash
git clone --filter=tree:none
```

Below is how the git repository storage will look like
![treeless clone data organization](treeless.webp)

### Only HEAD
In case of _CI/CD_ throw away environments we can make use of `shallow` clones. They only provide the data at `HEAD` and no commit history is provided.
```bash
git clone --depth=1
```

![shallow git clone](shallow.webp)

:::info
Using `single-branch` with shallow clone ensures we aren't downloading `HEAD` of all the different branches.
:::

Coming back to the optimization for our crawls both `treeless` and `blobless` are good options but just to not be too *aggressive* we went ahead with `blobless` clones. In case you want to read about **caveats** of the other options checkout this [deep dive blog](https://github.blog/open-source/git/get-up-to-speed-with-partial-clone-and-shallow-clone/) from Github.

## Promisor Remotes
The first issue we had with `blobless` clones was around auth failure in fetching missing blobs while doing a `pull` from **promisor remote**.

:::info
A remote that can later provide the missing objects is called a promisor remote, as it promises to send the objects when requested.
:::

The authorization mechanism we use for git operations is OAuth token. The complete command for pull is as below
```bash
git pull https://x-access-token:$TOKEN@github.com/random-github-org/some-repo.git
```

The issue which [chatgpt](https://chatgpt.com/) helped me figure out was that the adhoc url we were providing for fetching content doesn't set the promisor remote. I read through the cited source it had found which was the [specification](https://web.mit.edu/git/git-doc/technical/partial-clone.html) for blobless clone.

:::important
It's very important to read cited sources before believing everything that LLM outputs.
:::

So, I made the change to always set the `origin` remote before starting a `pull` operation so that a fresh token is in place as the one set during `clone` might have expired already.
```bash
git remote set-url origin https://x-access-token:$TOKEN@github.com/random-github-org/some-repo.git && git pull origin
```

:::tip
Reading the man page for `git-pull` I found that we have a `--set-upstream` that would set the remote itself before fetching contents.
:::

## Rename Detection
The second critical error we saw was during `git log` where the command was first failing with the same error as `git pull` about unauthenticated promisor remote. So, I did the same for `git log` also where we first update the promisor with latest token and the try logging.

:::note
We need to always have a freshly set promisor remote as blobless clones need on demand  blob fetch for operations that require those missing blobs.
:::

Even with this we were still failures occurring which talked about repository corruption. Below is a similar error that occurs if we try to clone [tigerbeetle](https://github.com/tigerbeetle/tigerbeetle) with blobless clone and then storing complete logs.
```bash
git clone --filter=blob:none --single-branch https://github.com/tigerbeetle/tigerbeetle
git log -c --name-status > log.txt

fatal: You are attempting to fetch f9c4c763962287ec59d5fa4aa112c6a029aae3df, which is in the commit graph file but not in the object database.
This is probably due to repo corruption.
If you are attempting to repair this repo corruption by refetching the missing object, use 'git fetch --refetch' with the missing object.
fatal: could not fetch 08bfee5769fcac65acf77ee074c27c79b03aa8b0 from promisor remote
```

:::info
The **commit-graph** is a _precomputed index_ that Git stores to make operations involving commits **much faster**, especially on large repositories.
:::

The inability to find the right solution was already leaning me into losing `blobless` clone and reverting to full clones. I found some git mailing list threads which described similar issue but no resolution.

:::error
I was worried about another possible error that our token can **expire** while the commands are running.
:::

I wanted a final go. So, I tried taking help from my pair debugger, [chatgpt](https://www.chatgpt.com). I gave it the full context of what we were trying to do and how our crawls work.

It provided me insights that git needs to *traverse the whole tree* for **rename detection** of files. This made absolute sense imagine a scenario as below
```mermaid
graph LR
	b1((Rename 2)) --> m((Merge))
	a1((Unrelated)) --> m
	a2((Base Commit)) --> a1
	b2((Rename 1)) --> b1
	a2 --> b2
```

The final merge commit has a renamed file but to find what the actual file name was `git` will need to *follow* the commits that were there in a branch which isn't default. So `git` will need on demand blob fetches for rename detection.

In our code though we treat renames as a separate *delete* and *add*. This same thing can be achieved using git where we ask it to not bother with rename detection using `--no-renames`.
```bash
git log -c --name-status --no-renames --diff-filter='AMD'
```

For renamed files git now show in output that original file was deleted and a new file was added to the repository.

## Verdict
The disk usage reduction we get with blobless clone range from **2x upto 10x** depending on the branching and size of repository.

| Repository     | Full Clone | Blobless Clone |
| -------------- | ---------- | -------------- |
| Kubernetes     | 1.5G       | 575M           |
| Tigerbeetle    | 40M        | 21M            |
| Bitcoin Core   | 365M       | 132M           |
| Signal Android | 2G         | 193M           |
| Zed            | 384M       | 135M           |
| Glean          | 8.1G       | 2.2G           |

Apart from disk usage savings there was also time savings given clones are much faster now, with speedup ranging from **1.4x upto 20x**

| Repository     | Full Clone Time (s) | Blobless Clone Time (s) |
| -------------- | ------------------- | ----------------------- |
| Kubernetes     | 280.1               | 64.1                    |
| Tigerbeetle    | 5.9                 | 4.2                     |
| Bitcoin Core   | 88s                 | 24.6                    |
| Signal Android | 390.1               | 18.9                    |
| Zed            | 84.2                | 15.6                    |
| Glean          | 884                 | 215.3                   |

:::tip
I recently had to setup my office laptop again due to some crash. Full cloning our main repository would have wasted so much of my time.
:::

The no rename detection feature that we added doesn't provide much speed up as compared to base scenario of full clone because in full clone it's very easy to traverse the whole repository given everything has already been downloaded and indexed in the **commit-graph**.

The cost of logging only comes in blobless clone where every on demand blob needs a *network request* to the git forge which is more expensive than traversing locally stored files.

:::note
Still `no-renames` provides us somewhere around 2x speedup in traversing the logs of a repository completely.
:::

## Conclusion
With these optimizations in place I finally went ahead and also created a **health check** that takes care of auto scaling disk so no manual intervention by engineers is required.

The first version of any software in 90% of the cases is built just with getting a **MVP** out so there is always *possibility* of new innovations and engineering improvements, the only question to answer is..

:::question
Does it help in saving engineering time or improves the product in some impactful way?
:::

For us Harvesters at Glean the major metric is **crawl times** and **cost savings** which were both heavily improved with my changes.

The primary reason I was aware about existence of partial and shallow clones is because I enjoy reading technical blogs.
>The knowledge we accumulate might not come in handy right away but someday it might.

Another thing to note in my journey is that **LLMs** with all the data they are trained on are amazing as debuggers. They saved me from reverting the feature when my google searches were failing to provide any help.

It's important though that we should do those **manual searches** and engage with LLM citations because it was the random information that we accumulate while searching that builds the **mental model** and **connections**.

:::warning
The on point answers by LLMs prevent gaining additional information on the boundary of thing that we are actually looking for.
:::

:::important
Read through documentation, stackoverflow, github issues but keep LLM as a tool in your built if all comes to fail.
:::

![now you know](https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExYndsNjE5MnpjODRrZ2JuNzVmc3RjbXF6aHFrM2JoMTA0enBvNnY2cCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/KI39wQ4ILTVvVrPzDQ/giphy.gif)

Thanks for reading you can read more such articles on my [blog](https://blog.king-11.dev).

Photo by <a href="https://unsplash.com/@lachlangowen?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText">Lachlan Gowen</a> on <a href="https://unsplash.com/photos/aerial-view-of-green-grass-field-and-trees-Dato9zko76U?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText">Unsplash</a>
