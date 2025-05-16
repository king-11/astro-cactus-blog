---
title: docker run vlsd
description: setup your lightning signer service with docker in few simple steps on
  any system capable of running containerised solution
tags:
- tech
- bitcoin
- docker
canonicalUrl: https://vls.tech/posts/docker/
publishDate: 2024-02-29
coverImage:
  src: docker-run-vlsd.webp
  alt: docker run vlsd
---
Hey you! Yes, you Lightning dev! We heard you were worried about the safety of your user's funds stored on your Lightning node. It's a hot wallet after all, and we all know that's a big no-no for storing large sums of satoshis.

That's why VLS exists. VLS separates Lightning private keys and security rule validation from the Bitcoin Lightning node to a separate, secure signing device.

What's that? "Sounds great, how do I start?" you say?

A fully functional `CLN + VLS` system consists of at least the below mentioned services:
- `bitcoind`
- `lightnind`
- `txood`
- `vlsd`
- `lightning-storage-server`

### How to Run VLS
We recommend all Lightning devs test `vls` in `testnet` prior to moving to production.

We have you covered with our [HOWTO](https://gitlab.com/lightning-signer/validating-lightning-signer/-/blob/main/contrib/howto/socket-server.md) covering details about setting up all the services for a single node.

At a high level, for each service you have to:
- Download the git repo/tar ball
- Download and install the necessary dependencies
- Build the service binaries and copy them to right place
- Setup and start daemon service

So just repeat this process for all 5 services and you'll have a `vls` system up and running.

### How to Keep up with Updates
`vls` is currently in its beta stage of development. We are rolling out new changes frequently. To keep up with them you need to rebuild the system by referring to [HOW TO UPDATE](https://gitlab.com/lightning-signer/validating-lightning-signer/-/blob/main/contrib/howto/update.md). So you always need the build dependencies/packages along with source code in your system.

Is it starting to look difficult to manage already?

Wish there was an easier way?

![joke on least possible responsibility](https://media.giphy.com/media/Hn1VPQRmzEZUc/giphy.gif)

### Enter Docker
They say lazy people find ways to make the work require the least amount of effort. To that we say, amen!

We have you covered, running all the services on your system in just a few commands away now:

```bash
## clone the docker image and compose file repo
git clone https://gitlab.com/lightning-signer/vls-container.git
## create volume for each of the services
docker volume create bitcoin_data
docker volume create lightning_data
docker volume create txoo_data
docker volume create vls_data
## run the compose system
docker compose --profile vls up --build
```

**Note**: We have made the assumption you already have either **docker v1/v2** service present in your system. Even if you don't, there's no need to worry.

Depending on the system you are using, you can refer to this [section](https://gitlab.com/lightning-signer/vls-container#docker-documentation) of our README to install docker as a one time setup.

### Who is this for?
Our intended audience for VLS on Docker is Bitcoin Lightning developers who are interested in integrating VLS into their product.

We do not intend to make this a production ready release of VLS or publish on app stores like Umbrel or Start9.

Our hope is this will make it easier for Bitcoin Lightning developers interested in VLS to test it out.

As such, our docker images currently support running `vls` only with `regtest` and `testnet` . By default the above commands will run an isolated `testnet` network of services.

If you want to expose the network or change to `regtest`, use an override:

```bash
export DOCKER_COMPOSE_OVERRIDE=docker-compose.regtest.yml
export COMPOSE_PROJECT_NAME=regtest
docker compose --profile vls -f docker-compose.yml -f $DOCKER_COMPOSE_OVERRIDE up --build
```

You can use `testnet` override as well to expose the network.

### Docker v1 Support
We have gone an extra mile here by providing support for both docker **v1** and **v2**. Even though docker has *deprecated* docker v1 we understand that the currently available docker packages in all major distros are still v1.

So, irrespective of docker version, anyone can run `vls`. We intend to keep our docker images and compose files backwards compatible until the time docker packages aren't updated to v2 in major linux distributions.

### VLS Only
Maybe you already have all the other services except `vls` running on your system or you want to run `vls` on a device separate from where all other services are. In that case you can take advantage of standalone `vls` system.

You can use the compose file for standalone `vls`:

```bash
export BITCOIND_RPC_URL=<RPC_ENDPOINT_BITCOIND>
export CLN_REMOTE_HSMD_URL=<REMOTE_HSMD_ENDPOINT>
cd vlsd
docker compose up
```

If you wish to have a more fine grained control on the `vls` container, instead of using compose setup:

```bash
cd vlsd
docker build -t vlsd .
docker run \
  -d \
  --rm \
  --name vlsd \
  --network host \
  -e VLS_NETWORK=testnet \
  -e BITCOIND_RPC_URL=$BITCOIND_RPC_URL \
  --mount 'type=volume,src=vls_data,dst=/home/vls/.lightning-signer' \
  vlsd \
  --connect=$CLN_REMOTE_HSMD_URL
```

Note: If you don't have the services other than `vlsd` already running you can run just them by getting rid of `profile` flag from the compose commands.
```bash
docker compose up
```

That was all for *vls on docker*, but do make sure to check out the [repository](https://gitlab.com/lightning-signer/vls-container) for more useful commands on running docker system and you can also join our [community](https://matrix.to/#/!iluZKRmCJAHWdwqvma:matrix.org?via=matrix.org).

![that's all folks](https://media.giphy.com/media/lD76yTC5zxZPG/giphy.gif)
