FROM node:8

ENV DEBIAN_FRONTEND noninteractive
ENV TERM dumb

ENV CONTAINER_INIT /usr/local/bin/init-container
RUN echo '#!/usr/bin/env bash' > $CONTAINER_INIT ; chmod +x $CONTAINER_INIT
RUN echo 'rm -rf ~/.npm && mkdir -p /cache/npm && ln -sf /cache/npm ~/.npm' >> $CONTAINER_INIT

# update npm to 6.x
RUN npm install -g npm@6

WORKDIR /workspace
CMD ci/test.sh
