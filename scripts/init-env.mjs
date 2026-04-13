import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(import.meta.dirname, "..");
const envPath = resolve(rootDir, ".env");

const args = process.argv.slice(2);
const options = {
  apiBaseUrl: "http://localhost:4000",
  roleBypass: "false",
  force: false,
  dryRun: false,
};

for (const arg of args) {
  if (arg.startsWith("--api-base-url=")) {
    options.apiBaseUrl = arg.slice("--api-base-url=".length);
  } else if (arg.startsWith("--role-bypass=")) {
    options.roleBypass = arg.slice("--role-bypass=".length);
  } else if (arg === "--force") {
    options.force = true;
  } else if (arg === "--dry-run") {
    options.dryRun = true;
  }
}

const content = [
  "# Generated for frontend development",
  "HOST_PORT=3000",
  `NEXT_PUBLIC_API_BASE_URL=${options.apiBaseUrl}`,
  `NEXT_PUBLIC_DEV_ROLE_BYPASS=${options.roleBypass}`,
  "",
].join("\n");

if (options.dryRun) {
  process.stdout.write(content);
  process.exit(0);
}

if (existsSync(envPath) && !options.force) {
  console.log(`.env already exists at ${envPath}`);
  console.log("Use --force to overwrite it.");
  process.exit(0);
}

writeFileSync(envPath, content, "utf8");
console.log(`Created ${envPath}.`);
console.log("Next: docker compose up");
