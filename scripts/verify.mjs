import { spawn } from "node:child_process";
import { createServer } from "node:net";

const PREVIEW_HOST = process.env.PREVIEW_HOST || "127.0.0.1";
const PREVIEW_PORT = Number(process.env.PREVIEW_PORT || process.env.PORT) || (await getAvailablePort(PREVIEW_HOST));
const APP_URL = process.env.APP_URL || `http://${PREVIEW_HOST}:${PREVIEW_PORT}`;

await run("node", ["scripts/public-audit.mjs"]);
await run("npm", ["run", "build"]);

const preview = spawn(
  "npm",
  [
    "run",
    "preview:ci",
    "--",
    "--host",
    PREVIEW_HOST,
    "--port",
    String(PREVIEW_PORT),
    "--strictPort"
  ],
  {
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"]
  }
);

const previewDone = new Promise((resolve, reject) => {
  preview.once("error", reject);
  preview.once("exit", (code, signal) => resolve({ code, signal }));
});

preview.stdout.on("data", (chunk) => process.stdout.write(chunk));
preview.stderr.on("data", (chunk) => process.stderr.write(chunk));

try {
  const startupResult = await Promise.race([
    waitForApp(APP_URL).then(() => ({ ready: true })),
    previewDone.then(({ code, signal }) => ({ ready: false, code, signal }))
  ]);

  if (!startupResult.ready) {
    throw new Error(
      `Preview server exited before ${APP_URL} was reachable (${formatExit(startupResult)}).`
    );
  }

  await run("npm", ["run", "visual:test"], {
    env: { ...process.env, APP_URL }
  });
} finally {
  await stopPreview(preview, previewDone);
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: options.env || process.env,
      stdio: "inherit"
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} ${formatExit({ code, signal })}`));
      }
    });
  });
}

async function waitForApp(url) {
  const deadline = Date.now() + 45_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
      if (response.ok && (await response.text()).includes('id="app"')) {
        return;
      }
    } catch {
      // Vite preview may still be booting.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function stopPreview(child, done) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  child.kill("SIGTERM");
  const forceKill = setTimeout(() => child.kill("SIGKILL"), 5_000);

  try {
    await done;
  } finally {
    clearTimeout(forceKill);
  }
}

function getAvailablePort(host) {
  return new Promise((resolve, reject) => {
    const server = createServer();

    server.unref();
    server.once("error", reject);
    server.listen(0, host, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;

      server.close(() => {
        if (port) {
          resolve(port);
        } else {
          reject(new Error("Unable to reserve an available preview port."));
        }
      });
    });
  });
}

function formatExit({ code, signal }) {
  if (signal) {
    return `exited with signal ${signal}`;
  }

  return `exited with code ${code}`;
}
