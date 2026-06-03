import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const [, , folderId, ...args] = process.argv;

if (!folderId || args.length === 0) {
  throw new Error(
    "Usage: node publish_thumbnail_reports_batch.mjs <folderId> <reportPath> [reportPath...]",
  );
}

const dryRun = args.includes("--dry-run");
const reportPaths = [];
for (const input of args.filter((value) => value !== "--dry-run")) {
  const expanded = await expandInput(input);
  reportPaths.push(...expanded);
}
const results = [];

if (dryRun) {
  console.log(JSON.stringify({ folderId, reportCount: reportPaths.length, dryRun: true, reportPaths }, null, 2));
  process.exit(0);
}

for (const reportPath of reportPaths) {
  const child = spawnSync(
    process.execPath,
    ["C:/Users/user/write-blog/tools/publish_thumbnail_report_to_drive.mjs", reportPath, folderId],
    {
      encoding: "utf8",
      stdio: "inherit",
    },
  );

  results.push({
    reportPath,
    status: child.status,
    error: child.error ? String(child.error) : null,
  });
}

console.log(JSON.stringify({ folderId, reportCount: reportPaths.length, results }, null, 2));

async function expandInput(input) {
  const resolved = path.resolve(input);
  const stat = await fs.stat(resolved);

  if (stat.isDirectory()) {
    const manifestPath = path.join(resolved, "batch_manifest.json");
    return expandInput(manifestPath);
  }

  const fileName = path.basename(resolved);
  if (fileName === "batch_manifest.json") {
    const manifest = JSON.parse(await fs.readFile(resolved, "utf8"));
    return (manifest.entries ?? []).map((entry) => path.resolve(entry.reportPath));
  }

  return [resolved];
}
