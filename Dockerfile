# First Stage
FROM node:16-alpine AS builder

ARG PROXY
ENV HTTP_PROXY=$PROXY \
  HTTPS_PROXY=$PROXY \
  http_proxy=$PROXY \
  https_proxy=$PROXY

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY package*.json ./

RUN npm config set proxy ${PROXY}
RUN npm config set https-proxy ${PROXY}

RUN npm install 
RUN npm run build
RUN npm run copy-csv

# COPY yarn.lock ./
# COPY .yarnrc.yml ./
# COPY .yarn ./.yarn
# COPY . ./

# RUN yarn config set httpProxy ${PROXY} && \
#   yarn config set httpsProxy ${PROXY}
# RUN yarn set version berry
# RUN yarn config set httpProxy ${PROXY} && \
# yarn config set httpsProxy ${PROXY}

# RUN yarn -v

# RUN yarn install --silent
# COPY . ./
# RUN yarn build
# RUN yarn copy-csv

# Second Stage
FROM node:16-alpine
ENV NODE_ENV=production
ARG PROXY
ENV HTTP_PROXY=$PROXY \
  HTTPS_PROXY=$PROXY \
  http_proxy=$PROXY \
  https_proxy=$PROXY
# RUN yarn config set httpProxy ${PROXY} && \
#   yarn config set httpsProxy ${PROXY}
# RUN yarn set version berry
# RUN yarn config set httpProxy ${PROXY} && \
#   yarn config set httpsProxy ${PROXY}

RUN npm config set proxy ${PROXY}
RUN npm config set https-proxy ${PROXY}

WORKDIR /usr/src/app
# RUN chown node:node .
# USER node
COPY package*.json ./
# COPY yarn.lock ./
# COPY .yarnrc.yml ./
# COPY .yarn ./.yarn

# RUN yarn config set httpProxy ${PROXY} && \
# yarn config set httpsProxy ${PROXY}
# RUN yarn set version berry
# RUN yarn config set httpProxy ${PROXY} && \
# yarn config set httpsProxy ${PROXY}

# RUN yarn install --production --silent
RUN npm install --production

COPY .env ./.env
COPY --from=builder /usr/src/app/dist ./dist

ENV HTTP_PROXY=null  \
  HTTPS_PROXY=null \
  http_proxy=null \
  https_proxy=null

EXPOSE 5000

# CMD [ "yarn", "start:prod" ]
CMD ["node", "dist/src/app/index.js"]
