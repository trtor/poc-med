import "dotenv/config";
import app from "./app";
import env from "./environment";
import redis from "./redis/redis-con";

const port = env.port;

const server = app.listen(port, () => {
  // eslint-disable-next-line no-console
  if (!env.nodeEnv.isTest && !env.nodeEnv.isCI) console.log(`Poc medication backend, listening on port`, port);
});

/**
 * Stop Node.js process
 */
["SIGINT", "SIGTERM", "SIGQUIT"].forEach(signal =>
  process.on(signal, () => {
    // Close server
    server.close(() => {
      // eslint-disable-next-line no-console
      if (!env.nodeEnv.isTest && !env.nodeEnv.isCI) console.log("\nClosed out remaining connections");
      redis
        .quit()
        .then(() => {
          console.log("Redis closed");
          process.exit(0);
        })
        .catch(e => console.error(e));
    });
  })
);

// eslint-disable-next-line no-console
if (!process.env.NODE_PORT) console.error("Cannot read PORT from environment variable");
