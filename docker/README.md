# Docker

## Lionweb Repository Image
The `Dockerfile` specifies the creation of an image for the LionWeb repository server.

## Docker Compose
The `compose.yml` starts up a container running both the postgres database server and the LionWeb repository server.
Note that the postgres image should be installed in docker.

## docker.yaml
Github CI to create and publish a docker image when a tage named `release.*` is pushed.
