import fs from "node:fs/promises";
import { prepareThumbnailArtifacts } from "./thumbnail_preparation.mjs";

const [, , articlePath, outputRootArg] = process.argv;

if (!articlePath) {
  throw new Error("Usage: node prepare_thumbnail_from_article.mjs <articlePath> [outputRoot]");
}

const outputRoot = outputRootArg ?? "C:/Users/user/write-blog/outputs/記事生成の準備";
const articleText = await fs.readFile(articlePath, "utf8");
const result = await prepareThumbnailArtifacts({
  articlePath,
  articleText,
  outputRoot,
});

console.log(JSON.stringify({ articlePath, ...result }, null, 2));
