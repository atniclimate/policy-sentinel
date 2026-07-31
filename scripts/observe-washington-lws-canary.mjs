import { createServer } from "vite";

let exitCode = 70;
let server;
try {
  server = await createServer({
    appType: "custom",
    configFile: false,
    envDir: false,
    logLevel: "silent",
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true },
  });
  const canary = await server.ssrLoadModule(
    "/src/contracts/washington-lws/canary-observer.ts",
  );
  if (typeof canary.runWashingtonLwsCanaryCommand !== "function") {
    throw new Error("Canary entry point is unavailable.");
  }
  exitCode = await canary.runWashingtonLwsCanaryCommand(process.argv.slice(2), {
    writeStdout: (value) => process.stdout.write(value),
    writeStderr: (value) => process.stderr.write(value),
  });
} catch {
  process.stderr.write(
    "Washington LWS canary failed inside the repository-owned launcher.\n",
  );
} finally {
  if (server !== undefined) {
    try {
      await server.close();
    } catch {
      // Launcher cleanup must not expose implementation or provider details.
    }
  }
}

process.exitCode = exitCode;
