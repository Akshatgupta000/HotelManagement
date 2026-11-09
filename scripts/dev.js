/**
 * Orchestrates local development by launching both Backend and Frontend.
 * Pure Node.js child_process runner (no external dependencies required).
 */
const { spawn } = require("child_process");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");

console.log("🚀 Starting Hotel Booking Management System (Backend + Frontend)...");

// Spawn backend
const backend = spawn("npm", ["run", "dev"], {
  cwd: path.join(rootDir, "backend"),
  stdio: "inherit",
  shell: true,
});

// Spawn frontend
const frontend = spawn("npm", ["run", "dev"], {
  cwd: path.join(rootDir, "frontend"),
  stdio: "inherit",
  shell: true,
});

const cleanup = (code) => {
  console.log("\n🛑 Shutting down development processes...");
  try {
    backend.kill();
  } catch (_) {}
  try {
    frontend.kill();
  } catch (_) {}
  process.exit(code || 0);
};

process.on("SIGINT", () => cleanup(0));
process.on("SIGTERM", () => cleanup(0));

backend.on("exit", (code) => {
  if (code !== 0 && code !== null) {
    console.error(`Backend process exited with code ${code}`);
    cleanup(code);
  }
});

frontend.on("exit", (code) => {
  if (code !== 0 && code !== null) {
    console.error(`Frontend process exited with code ${code}`);
    cleanup(code);
  }
});

