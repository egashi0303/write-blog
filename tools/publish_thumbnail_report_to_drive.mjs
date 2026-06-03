import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const [, , reportPath, parentFolderId, outputRootArg] = process.argv;

if (!reportPath || !parentFolderId) {
  throw new Error(
    "Usage: node publish_thumbnail_report_to_drive.mjs <reportPath> <parentFolderId> [outputRoot]",
  );
}

const report = JSON.parse(await fs.readFile(reportPath, "utf8"));
const sourceUrl =
  report.selected_candidate_local_path ||
  report.selected_candidate_thumbnail_url ||
  report.selected_candidate_export_url ||
  report.selected_candidate_preview_url;
if (!sourceUrl) {
  throw new Error(`Report does not contain a usable thumbnail source: ${reportPath}`);
}

const caseLabel = report.case_name || report.case_id || report.source_title || report.variant ||
  path.basename(reportPath, path.extname(reportPath));
const fileTitle =
  report.source_title ||
  report.article_title ||
  report.created_design?.title ||
  report.variant ||
  path.basename(reportPath, path.extname(reportPath));

const scriptPath = path.resolve("C:/Users/user/write-blog/tools/download_and_upload_image_to_drive.mjs");
const args = [scriptPath, sourceUrl, parentFolderId, caseLabel, fileTitle];
if (outputRootArg) args.push(outputRootArg);

const result = spawnSync(process.execPath, args, {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "inherit"],
  maxBuffer: 1024 * 1024 * 20,
});

if (result.error) throw result.error;
if (result.status !== 0) {
  throw new Error(`Script failed with code ${result.status}`);
}

const uploadResult = parseJsonStdout(result.stdout);
const linkScriptPath = path.resolve("C:/Users/user/write-blog/tools/link_thumbnail_url_to_sheet.mjs");
const linkArgs = [linkScriptPath, reportPath, uploadResult.uploaded?.webViewLink ?? uploadResult.uploaded?.fileUrl ?? uploadResult.uploaded?.webViewUrl ?? ""];
if (!linkArgs[2]) {
  throw new Error(`Upload result did not include a usable URL: ${result.stdout}`);
}

const linkResult = spawnSync(process.execPath, linkArgs, {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "inherit"],
  maxBuffer: 1024 * 1024 * 20,
});

if (linkResult.error) throw linkResult.error;
if (linkResult.status !== 0) {
  throw new Error(`Link script failed with code ${linkResult.status}`);
}

console.log(
  JSON.stringify(
    {
      ...uploadResult,
      thumbnailLinkResult: parseJsonStdout(linkResult.stdout),
    },
    null,
    2,
  ),
);

function parseJsonStdout(stdout) {
  const trimmed = String(stdout ?? "").trim();
  if (!trimmed) return {};
  return JSON.parse(trimmed);
}
