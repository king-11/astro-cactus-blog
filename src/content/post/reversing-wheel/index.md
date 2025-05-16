---
title: Reversing Wheel File
tags:
- python
- tech
- programming-language
description: Python wheel file is a portable way to share python packages. The file
  from top looks very opaque but its possible to modify it based on requirements using
  a little bit of reverse engineering.
publishDate: 2024-06-14
coverImage:
  src: cover.webp
  alt: Reversing Wheel File
---

Let's talk about wheel today, definitely hoping it was a ferris wheel but its going to be python's wheel for now.
![ferris wheel](https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExcTJkYjkwY2doNmxkM21lb3FzaGlvNjNwaGlrM20zMXVjeXNwMjVjbiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/WO58RdwZFxTQ37dicR/giphy.gif)

A wheel file is a relocatable package format for distribution of python packages for easy, quick and deterministic installations. All the packages published on [pypi](https://pypi.org) have under their `Download files` section a `tar` file and `whl` file.

For example you can head over to [Django](https://pypi.org/project/Django/#files) and download its wheel file which can then be installed simply by doing
```bash
pip install Django-5.0.6-py3-none-any.whl
```

## Naming Format
A wheel file name tells us details about the particular package that we are going to install. In our case the Django wheel file tells us that:

|              Property              | Value  |
| :--------------------------------: | ------ |
|     Package/Distribution Name      | Django |
|              Version               | 5.0.6  |
|      Implementation Language       | py3    |
| ABI (Application Binary Interface) | none   |
|              Platform              | any    |

## Contents
A wheel file apart from the package code also contains metadata. To look at the contents of wheel file we can run the following commands to unpack things as its just a zip file.

```bash
cp Django-5.0.6-py3-none-any.whl Django-5.0.6-py3-none-any.zip
unzip Django-5.0.6-py3-none-any.zip -d Django-5.0.6-py3-none-any
ls Django-5.0.6-py3-none-any
```

There are two directory in inside of the uncompressed directory
- django
- Django-5.0.6.dist-info

Of these two the `dist-info` folder is always present in all packages it contains the metadata of the package. The rest packages are generally collected either using [automatic discovery](https://setuptools.pypa.io/en/latest/userguide/package_discovery.html#automatic-discovery) or based on findings of

```python
setuptools.find_packages(where = "src")
```

## Distribution Information
The following files are present inside the `dist-info` directory

```bash
➜ ls --tree Django-5.0.6.dist-info
Django-5.0.6.dist-info
├── AUTHORS
├── entry_points.txt
├── LICENSE
├── LICENSE.python
├── METADATA
├── RECORD
├── top_level.txt
└── WHEEL
```

`METADATA` contains information about the package name, version, readme, dependencies etc. The `WHEEL` file consists details about how the package build was generated. Rest files have a self understandable name.

### RECORD File
The `RECORD` file is a CSV file, composed of records, one line per installed file. It ensures that file used during installation are the same ones from which package was built. It is done by keeping digital signatures of each file.

```
django/views/templates/technical_500.txt,sha256=b0ihE_FS7YtfAFOXU_yk0-CTgUmZ4ZkWVfkFHdEQXQI,3712
```

Each line is composed of three elements:
- The path of included file
- A hash of the file’s contents
- Size of file in bytes

The hash used here is `sha256` earlier it used to be `md5sum` which is a weak hash. The `sha256` hash is encoded in a URL safe base64 encoding with no trailing "=" characters.

## Incorrect Package Build
The problem I encountered was that the wheel for a package I received didn't include all its required dependencies. The person who built this package and knew where code was had left the team :) so I couldn't really bother him

So the only possible workaround I had to remedy this was to specify the required dependencies of this package inside my module.

![no fricking way](https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExZG51dmNqcmduOHk2OGJvdGkzbnhxajJmaWxpcGJ0MXBpcnZsMTg4ayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/5xtDarC0XyqmUhD5eDK/giphy.gif)

I said a big **NO!** because this is a bad practice. We definitely don't want to start specifying transitive dependencies of each package that we use it's their responsibility.

### METADATA injection
Armed with information provided above I updated the `METADATA` file to correctly specify all required additional dependencies.

```
Requires-Dist: ruptures ==1.1.9
Requires-Dist: numba ==0.59.1
```

### Re-Hash Signature
Given I went through contents of `RECORD` file it was clear that just updating `METADATA` won't be sufficient as the install will start failing due to mis match of expected v/s newly generated digital signature of `METADATA`.

I took help from our old friends at [stackoverflow](https://stackoverflow.com/a/55906133/13854616) instead of fighting with AI Chat bots. The suggested way to generate hash was using this python script.
```python
from hashlib import sha256
from base64 import urlsafe_b64encode

file_content = open('METADATA', 'rb').read()
digest = sha256(file_content).digest()
encoding = urlsafe_b64encode(digest)
print(encoding.decode('latin1').rstrip('='))
```

Given the size of file might have also changed I needed to update that as well
```bash
wc -c METADATA
```
### Release New Version
We also have to update the version references of package so that a new one can be released from these places:
- `METADATA`
- `Django-5.0.6.dist-info`

We can just update from `5.0.6` to `5.0.7` for now.

Now that we have modified required files we need to re compress things and build the wheel file again, which can be done as below
```bash
cd Django-5.0.6-py3-none-any
zip -r Django-5.0.7-py3-none-any.zip ./*
cp Django-5.0.7-py3-none-any.zip Django-5.0.7-py3-none-any.whl
```

What all was left was to push this package to our package repository and then using it.
```bash
twine upload -r $REPOSITORY_NAME Django-5.0.7-py3-none-any.whl
pip install $mypackage
```

![thank you](https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmgzY3Z2ZnhkODhkMmJzZTd0YmdpMjdiZmFqZGE2MWM2d3VubXpvcyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/mP3Xyab9FgurhvSnlU/giphy.gif)

That's all folks been messing with python for sometime now. You can be sure that I still don't like it there are too many foot guns but am learning about it somebody has to so that you can keep using your LLMs.
