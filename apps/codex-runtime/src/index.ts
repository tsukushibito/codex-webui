import { buildApp } from "./app.js";

const app = await buildApp();

try {
  await app.listen({
    host: app.runtimeConfig.host,
    port: app.runtimeConfig.port,
  });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
