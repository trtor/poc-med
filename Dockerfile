# First Stage
FROM node:18-alpine AS builder

ARG PROXY
ENV HTTP_PROXY=$PROXY \
  HTTPS_PROXY=$PROXY \
  http_proxy=$PROXY \
  https_proxy=$PROXY
RUN yarn config set proxy ${PROXY} && \
  yarn config set https-proxy ${PROXY}
RUN yarn config set httpProxy ${PROXY} && \
  yarn config set httpsProxy ${PROXY}
RUN yarn set version berry
RUN yarn config set proxy ${PROXY} && \
  yarn config set https-proxy ${PROXY}

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY package*.json ./
COPY yarn.lock ./
RUN yarn install
COPY . ./
RUN yarn build
RUN yarn copy-csv

# Second Stage
FROM node:18-alpine
ENV NODE_ENV=production
ARG PROXY
ENV HTTP_PROXY=$PROXY \
  HTTPS_PROXY=$PROXY \
  http_proxy=$PROXY \
  https_proxy=$PROXY
RUN yarn config set proxy ${PROXY} && \
  yarn config set https-proxy ${PROXY}
RUN yarn set version berry
RUN yarn config set proxy ${PROXY} && \
  yarn config set https-proxy ${PROXY}

WORKDIR /usr/src/app
# RUN chown node:node .
# USER node
COPY package*.json ./
COPY yarn.lock ./
RUN yarn install --production

COPY .env ./.env
COPY --from=builder /usr/src/app/dist ./dist

ENV HTTP_PROXY=null  \
  HTTPS_PROXY=null \
  http_proxy=null \
  https_proxy=null

EXPOSE 5000

CMD [ "yarn", "start:prod" ]
