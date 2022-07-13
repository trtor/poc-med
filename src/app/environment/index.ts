import type { RedisOptions } from "ioredis";

const redisOptions: RedisOptions = {
  host: process.env.REDIS_HOST || undefined,
  port: Number(process.env.REDIS_PORT || 6379),
  username: process.env.REDIS_USERNAME || undefined,
  password: process.env.REDIS_PASSWORD || undefined,
};

export default {
  port: Number(process.env.NODE_PORT) || 5004,
  appName: process.env.APP_NAME || "med-search",
  nodeEnv: {
    isProduction: process.env.NODE_ENV === "production",
    isTest: process.env.NODE_ENV === "test",
    isCI: process.env.CI === "true",
  },
  redis: redisOptions,
};
