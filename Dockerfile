FROM linuxserver/ffmpeg

# curl and ca-certificates are needed for volta installation
RUN apt-get update \
  && apt-get install -y \
  curl \
  ca-certificates \
  --no-install-recommends

# bash will load volta() function via .bashrc 
# using $VOLTA_HOME/load.sh
SHELL ["/bin/bash", "-c"]

# since we're starting non-interactive shell, 
# we wil need to tell bash to load .bashrc manually
ENV BASH_ENV ~/.bashrc
# needed by volta() function
ENV VOLTA_HOME /root/.volta
# make sure packages managed by volta will be in PATH
ENV PATH $VOLTA_HOME/bin:$PATH

# install volta
RUN curl https://get.volta.sh | bash

# Build App
COPY . /app
WORKDIR /app
RUN volta install node yarn

RUN yarn --immutable
RUN yarn build

ENV SUBTITLE_EXTRACTOR_PATH "/data"
ENV SUBTITLE_EXTRACTOR_LANGUAGE ""
ENV SUBTITLE_EXTRACTOR_VIDEO_FORMAT ""
ENV SUBTITLE_EXTRACTOR_SUBTITLE_FORMAT ""
ENV SUBTITLE_EXTRACTOR_WATCH "true"
ENV SUBTITLE_EXTRACTOR_TIMEOUT ""

ENTRYPOINT []
CMD ["yarn", "start:prod"]