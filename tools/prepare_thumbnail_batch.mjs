import fs from "node:fs/promises";
import path from "node:path";
import { prepareThumbnailArtifacts, sanitizeName } from "./thumbnail_preparation.mjs";

const [, , ...args] = process.argv;

if (args.length === 0) {
  throw new Error(
    "Usage: node prepare_thumbnail_batch.mjs <articlePath> [articlePath...] [--output-root <path>]",
  );
}

const { articlePaths, outputRoot } = parseArgs(args);
if (articlePaths.length === 0) {
  throw new Error("At least one articlePath is required.");
}

const batchId = `batch_${timestamp()}`;
const batchDir = path.join(outputRoot, batchId);
await fs.mkdir(batchDir, { recursive: true });

const entries = [];
for (const articlePath of articlePaths) {
  const articleText = await fs.readFile(articlePath, "utf8");
  const result = await prepareThumbnailArtifacts({ articlePath, articleText, outputRoot });
  entries.push({
    articlePath,
    ...result,
  });
}

const manifest = {
  batch_id: batchId,
  created_at: new Date().toISOString(),
  article_count: entries.length,
  output_root: outputRoot,
  template_policy: {
    name: "thumbnail_no_text_template",
    must_use_every_time: true,
    preferred_canva_design_type: "desktop_wallpaper",
    reject_if_any_readable_text_appears: true,
  },
  entries: entries.map((entry) => ({
    articlePath: entry.articlePath,
    title: entry.title,
    outputFolder: entry.outputFolder,
    promptPath: entry.promptPath,
    reportPath: entry.reportPath,
    nextStepPath: entry.nextStepPath,
  })),
};

await fs.writeFile(path.join(batchDir, "batch_manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
await fs.writeFile(
  path.join(batchDir, "batch_next_step.md"),
  [
    "# Batch Next Step",
    "",
    `Batch ID: ${batchId}`,
    "",
    "1. Open each `thumbnail_prompt.md` and run Canva generation.",
    "2. For each article, capture the `thumbnail_url` from Canva.",
    "3. Update each `thumbnail_generation_report.json` with the Canva result.",
    "4. Run `tools/publish_thumbnail_reports_batch.mjs` with the report paths.",
  ].join("\n"),
  "utf8",
);

console.log(
  JSON.stringify(
    {
      batchId,
      batchDir,
      articleCount: entries.length,
      outputRoot,
      entries,
    },
    null,
    2,
  ),
);

function parseArgs(values) {
  const articlePaths = [];
  let outputRoot = "C:/Users/user/write-blog/outputs/記事生成の準備";

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--output-root") {
      outputRoot = values[index + 1];
      index += 1;
      continue;
    }
    if (value.startsWith("--output-root=")) {
      outputRoot = value.split("=", 2)[1];
      continue;
    }
    articlePaths.push(value);
  }

  return { articlePaths, outputRoot };
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}
