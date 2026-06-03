import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";
import { prepareThumbnailArtifacts } from "./thumbnail_preparation.mjs";

const outputDir = "C:/Users/user/write-blog/outputs/article_outputs_workbook";
const outputPath = path.join(outputDir, "article_outputs_by_case.xlsx");

async function readArticle(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  const normalized = raw.replace(/\r\n/g, "\n").trim();
  const lines = normalized.split("\n");
  const title = lines[0]?.replace(/^#\s*/, "").trim() ?? "";
  const body = lines.slice(1).join("\n").trim();
  return { title, body, raw };
}

const articles = {
  bandee: [
    {
      filePath: "C:/Users/user/write-blog/outputs/generated_articles/CASE-0001_bandee.md",
      date: "2026-06-02",
      caseId: "CASE-0001",
      caseName: "タイ古式マッサージBANDEE",
      angle: "肩こり・腰の重さ・脚のだるさ全般",
      ...(await readArticle("C:/Users/user/write-blog/outputs/generated_articles/CASE-0001_bandee.md")),
    },
    {
      filePath: "C:/Users/user/write-blog/outputs/generated_articles/CASE-0001_bandee_variant_02.md",
      date: "2026-06-02",
      caseId: "CASE-0001",
      caseName: "タイ古式マッサージBANDEE",
      angle: "スマホ時間による首・肩の重さ",
      ...(await readArticle("C:/Users/user/write-blog/outputs/generated_articles/CASE-0001_bandee_variant_02.md")),
    },
    {
      filePath: "C:/Users/user/write-blog/outputs/generated_articles/CASE-0001_20260602_leg_fatigue.md",
      date: "2026-06-02",
      caseId: "CASE-0001",
      caseName: "タイ古式マッサージBANDEE",
      angle: "立ち仕事による脚のだるさ",
      ...(await readArticle("C:/Users/user/write-blog/outputs/generated_articles/CASE-0001_20260602_leg_fatigue.md")),
    },
  ],
  ondraft: [
    {
      filePath: "C:/Users/user/write-blog/outputs/generated_articles/CASE-0002_ondraft.md",
      date: "2026-06-02",
      caseId: "CASE-0002",
      caseName: "オンドラフト",
      angle: "期間限定メニューとケサディーヤ",
      ...(await readArticle("C:/Users/user/write-blog/outputs/generated_articles/CASE-0002_ondraft.md")),
    },
    {
      filePath: "C:/Users/user/write-blog/outputs/generated_articles/CASE-0002_20260602_after_work_reservation.md",
      date: "2026-06-02",
      caseId: "CASE-0002",
      caseName: "オンドラフト",
      angle: "仕事帰りに予約できる飲み場選び",
      ...(await readArticle("C:/Users/user/write-blog/outputs/generated_articles/CASE-0002_20260602_after_work_reservation.md")),
    },
  ],
};

const workbook = Workbook.create();
const headers = ["記事作成日", "案件ID", "案件名", "切り口", "記事タイトル", "記事本文", "サムネイルURL"];
const sheetSpecs = [
  ["タイ古式マッサージBANDEE", articles.bandee],
  ["オンドラフト", articles.ondraft],
];

for (const [sheetName, rows] of sheetSpecs) {
  const sheet = workbook.worksheets.add(sheetName);
  sheet.showGridLines = false;
  sheet.freezePanes.freezeRows(1);
  const values = [
    headers,
    ...rows.map((row) => [row.date, row.caseId, row.caseName, row.angle, row.title, row.body, row.thumbnailUrl ?? ""]),
  ];
  for (const row of rows) {
    await prepareThumbnailArtifacts({ articlePath: row.filePath, articleText: `${row.title}\n\n${row.body}` });
  }
  const range = sheet.getRangeByIndexes(0, 0, values.length, headers.length);
  range.values = values;
  range.format = {
    wrapText: true,
    verticalAlignment: "top",
  };
  sheet.getRange("A1:F1").format = {
    fill: "#1F4E78",
    font: { bold: true, color: "#FFFFFF" },
    horizontalAlignment: "center",
    verticalAlignment: "middle",
    wrapText: true,
  };
  sheet.getRange("A:A").format.columnWidthPx = 110;
  sheet.getRange("B:B").format.columnWidthPx = 110;
  sheet.getRange("C:C").format.columnWidthPx = 220;
  sheet.getRange("D:E").format.columnWidthPx = 280;
  sheet.getRange("F:F").format.columnWidthPx = 680;
  sheet.getRange("G:G").format.columnWidthPx = 260;
  sheet.tables.add(sheet.getRangeByIndexes(0, 0, Math.max(values.length, 2), headers.length).address, true, `${rowSafeName(sheetName)}Articles`);
}

function rowSafeName(name) {
  return name.replace(/[^A-Za-z0-9]/g, "").slice(0, 20) || "Case";
}

await fs.mkdir(outputDir, { recursive: true });

const overview = await workbook.inspect({
  kind: "sheet,table",
  maxChars: 4000,
  tableMaxRows: 5,
  tableMaxCols: 6,
});
console.log(overview.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan",
});
console.log(errors.ndjson);

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(JSON.stringify({ outputPath }));
