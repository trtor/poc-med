/* eslint-disable no-console */
import Redis from "ioredis";
import env from "../environment";

const redis = new Redis({ ...env.redis, maxRetriesPerRequest: 2 });

redis
  .on("connection", () => {
    console.log("Redis connected");
  })
  .on("error", error => {
    console.log(error);
    process.exit(1);
  });

export default redis;
