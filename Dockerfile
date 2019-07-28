ARG NODE_VERSION

FROM "node:${NODE_VERSION}-alpine"

ARG WEBPACK_VERSION
ENV WEBPACK_VERSION ${WEBPACK_VERSION}

RUN set -ex \
	&& yarn global add "webpack@^${WEBPACK_VERSION}" \
	&& yarn install --dev

ENV NODE_PATH=/usr/local/share/.config/yarn/global
