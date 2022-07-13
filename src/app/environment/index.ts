export default {
  port: Number(process.env.NODE_PORT) || 5004,
  nodeEnv: {
    isProduction: process.env.NODE_ENV === "production",
    isTest: process.env.NODE_ENV === "test",
    isCI: process.env.CI === "true",
  },
};
