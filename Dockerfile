# BUILD
FROM node:14-alpine as build-stage

WORKDIR /usr/src/app

ADD package*.json tsconfig.json yarn.lock ./
RUN yarn install --frozen-lockfile

ADD ./src /usr/src/app/src
RUN yarn run build


# RUN
FROM node:14-alpine as run-stage

WORKDIR /usr/src/app
COPY --from=build-stage /usr/src/app/dist .
COPY --from=build-stage /usr/src/app/node_modules ./node_modules
USER node

ENTRYPOINT [ "node", "index.js" ]
