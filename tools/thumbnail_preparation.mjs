import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_OUTPUT_ROOT = "C:/Users/user/write-blog/outputs/記事生成の準備";
const CASE_CONFIG_PATH = "C:/Users/user/write-blog/config/article_output_spreadsheets.json";

let cachedCaseConfig = null;

export function extractTitle(articleText) {
  for (const line of articleText.split(/\r?\n/)) {
    const match = line.match(/^#\s+(.+?)\s*$/);
    if (match) return match[1];
  }
  return null;
}

export function sanitizeName(name) {
  return name.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_").trim().slice(0, 180);
}

export function extractCaseIdFromPath(articlePath) {
  const stem = path.basename(articlePath, path.extname(articlePath));
  const match = stem.match(/^(CASE-\d{4})(?:_|$)/i);
  return match ? match[1].toUpperCase() : null;
}

async function loadCaseConfig() {
  if (cachedCaseConfig) return cachedCaseConfig;
  const raw = await fs.readFile(CASE_CONFIG_PATH, "utf8");
  cachedCaseConfig = JSON.parse(raw);
  return cachedCaseConfig;
}

async function resolveCaseMetadata(articlePath) {
  const caseId = extractCaseIdFromPath(articlePath);
  if (!caseId) return { caseId: "", caseName: "" };

  try {
    const config = await loadCaseConfig();
    const caseEntry = config.files?.[caseId];
    return {
      caseId,
      caseName: caseEntry?.case_name ?? "",
    };
  } catch {
    return { caseId, caseName: "" };
  }
}

export function buildThumbnailPrompt(title, articlePath) {
  return [
    "# Thumbnail Prompt",
    "",
    `Source article: \`${articlePath}\``,
    "",
    "## Title",
    "",
    title,
    "",
    "## Prompt",
    "",
    "Create a photorealistic editorial photo, not an illustration, not a vector graphic, not a 3D render, not a cartoon.",
    "Use a blank, text-zero canvas with no typography, no caption blocks, no title blocks, and no labels.",
    "Preferred canvas type: desktop_wallpaper.",
    "",
    "Main subject: [article-specific subject]",
    "",
    `Article theme: ${title}`,
    "",
    "Setting: warm natural light, realistic environment, subtle relevant props, calm and trustworthy atmosphere.",
    "",
    "Leave clean negative space for later Japanese title overlay, especially upper-left and center-left.",
    "",
    "Do not include any readable text, letters, numbers, logos, brand names, or fake UI text.",
    "Avoid flashy colors, luxury imagery, stacks of cash, coins, aggressive screens, anxiety, and gambling feeling.",
    "Professional blog thumbnail photograph, soft contrast, warm but restrained colors.",
  ].join("\n");
}

export function buildDirectImagePrompt(title, articlePath) {
  return [
    "# Direct Image Fallback Prompt",
    "",
    `Source article: \`${articlePath}\``,
    "",
    "## Title",
    "",
    title,
    "",
    "## Prompt",
    "",
    "Create a photorealistic editorial photo for the same article theme.",
    "Use this prompt when Canva generation fails, hits a quota limit, or returns a noisy result.",
    "Use a blank, text-zero canvas with no typography, no caption blocks, no title blocks, and no labels.",
    "Do not render any readable text, letters, numbers, logos, brand names, or fake UI text.",
    "Do not make it look like an illustration, vector image, poster mockup, infographic, or cartoon.",
    "",
    `Article theme: ${title}`,
    "Main subject: a clear, realistic scene that matches the article topic.",
    "Setting: warm natural light, realistic environment, subtle relevant props, calm and trustworthy atmosphere.",
    "Leave clean negative space for later Japanese title overlay, especially upper-left and center-left.",
    "Professional blog thumbnail photograph, soft contrast, warm but restrained colors.",
  ].join("\n");
}

export async function prepareThumbnailArtifacts({
  articlePath,
  articleText,
  outputRoot = DEFAULT_OUTPUT_ROOT,
}) {
  const title = extractTitle(articleText) ?? path.basename(articlePath, path.extname(articlePath));
  const caseMetadata = await resolveCaseMetadata(articlePath);
  const articleBaseName = sanitizeName(path.basename(articlePath, path.extname(articlePath)));
  const folder = path.join(outputRoot, articleBaseName);
  await fs.mkdir(folder, { recursive: true });

  const promptPath = path.join(folder, "thumbnail_prompt.md");
  const directImagePromptPath = path.join(folder, "direct_image_prompt.md");
  const reportPath = path.join(folder, "thumbnail_generation_report.json");
  const nextStepPath = path.join(folder, "next_step.md");

  await fs.writeFile(promptPath, buildThumbnailPrompt(title, articlePath), "utf8");
  await fs.writeFile(directImagePromptPath, buildDirectImagePrompt(title, articlePath), "utf8");
  await fs.writeFile(
    reportPath,
    JSON.stringify(
      {
        generation_strategy: {
          primary: "canva",
          fallback: "direct_photorealistic_image",
          fallback_trigger: [
            "canva_quota_limit",
            "canva_monthly_ai_limit",
            "canva_timeout",
            "canva_temporary_error",
            "readable_text_in_candidate",
          ],
        },
        mvp_scope: "title_to_thumbnail_background",
        template_policy: {
          name: "thumbnail_no_text_template",
          must_use_every_time: true,
          preferred_canva_design_type: "desktop_wallpaper",
          reject_if_any_readable_text_appears: true,
        },
        source_article: articlePath,
        case_id: caseMetadata.caseId,
        case_name: caseMetadata.caseName,
        source_title: title,
        canva_design_type: "desktop_wallpaper",
        canva_job_id: "",
        generated_candidate_count: 0,
        selected_policy: "first_candidate_for_mvp",
        selected_candidate_id: "",
        selected_candidate_preview_url: "",
        selected_candidate_thumbnail_url: "",
        created_design: {
          id: "",
          title: "",
          edit_url: "",
          view_url: "",
          page_count: 0,
        },
        direct_image_prompt_path: directImagePromptPath,
        download_status: "not_started",
        local_download_path: "",
        drive_upload: {
          folder_id: "",
          folder_name: "",
          folder_url: "",
          file_id: "",
          file_name: "",
          file_url: "",
        },
        constraints: {
          photorealistic_only: true,
          no_text_template: true,
          text_overlay_added: false,
        },
        notes: [
          "Canvaを最初に試し、上限や一時エラーが出たら direct_image_prompt.md に切り替える。",
          "どちらの経路でも、文字ゼロ・写真ベース・余白ありを維持する。",
          caseMetadata.caseId
            ? `ケースフォルダ認識: ${caseMetadata.caseId}${caseMetadata.caseName ? ` / ${caseMetadata.caseName}` : ""}`
            : "ケースフォルダ認識: なし",
        ],
      },
      null,
      2,
    ),
    "utf8",
  );

  await fs.writeFile(
    nextStepPath,
    [
      "# Next Step",
      "",
      `1. Read title: ${title}`,
      "2. First try Canva with `thumbnail_prompt.md` and `desktop_wallpaper`.",
      "3. If Canva returns a quota limit, monthly AI limit, timeout, or text-heavy candidate, stop immediately.",
      "4. Open `direct_image_prompt.md` and generate the same scene directly as a photorealistic image.",
      "5. Use the first successful image path or URL.",
      "6. Publish with `tools/publish_thumbnail_report_to_drive.mjs`.",
    ].join("\n"),
    "utf8",
  );

  return {
    title,
    caseId: caseMetadata.caseId,
    caseName: caseMetadata.caseName,
    outputFolder: folder,
    promptPath,
    directImagePromptPath,
    reportPath,
    nextStepPath,
  };
}
