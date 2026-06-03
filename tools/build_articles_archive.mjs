import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";
import { prepareThumbnailArtifacts } from "./thumbnail_preparation.mjs";

const outputDir = "C:/Users/user/write-blog/outputs/articles_archive";
const outputPath = path.join(outputDir, "created_articles_by_case.xlsx");

const articles = {
  "タイ古式マッサージBANDEE": [
    {
      date: "2026-06-02",
      caseId: "CASE-0001",
      caseName: "タイ古式マッサージBANDEE",
      angle: "肩こり・腰の重さ・脚のだるさ全般",
      title: "タイ古式マッサージは痛いだけ？肩こり・腰の重さ・脚のだるさを感じる方へ",
      file: "C:/Users/user/write-blog/outputs/generated_articles/CASE-0001_bandee.md",
    },
    {
      date: "2026-06-02",
      caseId: "CASE-0001",
      caseName: "タイ古式マッサージBANDEE",
      angle: "スマホ時間による首・肩の重さ",
      title: "スマホ時間で首や肩が重い方へ。タイ古式マッサージで気づく体のこわばり",
      file: "C:/Users/user/write-blog/outputs/generated_articles/CASE-0001_bandee_variant_02.md",
    },
    {
      date: "2026-06-02",
      caseId: "CASE-0001",
      caseName: "タイ古式マッサージBANDEE",
      angle: "立ち仕事による脚のだるさ",
      title: "立ち仕事で脚が重い方へ。タイ古式マッサージで全身をゆるめるという選択",
      file: "C:/Users/user/write-blog/outputs/generated_articles/CASE-0001_20260602_leg_fatigue.md",
    },
  ],
  "オンドラフト": [
    {
      date: "2026-06-02",
      caseId: "CASE-0002",
      caseName: "オンドラフト",
      angle: "期間限定メニューとケサディーヤ",
      title: "いつもの飲み会を少し楽しくしたいなら、期間限定メニューを選んでみませんか",
      file: "C:/Users/user/write-blog/outputs/generated_articles/CASE-0002_ondraft.md",
    },
    {
      date: "2026-06-02",
      caseId: "CASE-0002",
      caseName: "オンドラフト",
      angle: "仕事帰りに予約できる飲み場選び",
      title: "仕事帰りに迷わない店選び。お酒も料理も楽しみたい日にオンドラフトへ",
      file: "C:/Users/user/write-blog/outputs/generated_articles/CASE-0002_20260602_after_work_reservation.md",
    },
  ],
};

function stripMarkdownTitle(text) {
  return text.replace(/^# .+\r?\n\r?\n/, "").trim();
}

function safeSheetName(name) {
  return name.replace(/[\\/?*[\]:]/g, "_").slice(0, 31);
}

const workbook = Workbook.create();
const summary = workbook.worksheets.add("記事一覧");
const headers = ["記事作成日", "案件ID", "案件名", "切り口", "記事タイトル", "記事本文", "サムネイルURL"];

const allRows = [];

for (const [caseName, rows] of Object.entries(articles)) {
  const sheet = workbook.worksheets.add(safeSheetName(caseName));
  const values = [headers];

  for (const row of rows) {
    const raw = await fs.readFile(row.file, "utf8");
    const body = stripMarkdownTitle(raw);
    const record = [row.date, row.caseId, row.caseName, row.angle, row.title, body, row.thumbnailUrl ?? ""];
    values.push(record);
    allRows.push(record);
    await prepareThumbnailArtifacts({ articlePath: row.file, articleText: raw });
  }

  sheet.getRangeByIndexes(0, 0, values.length, headers.length).values = values;
  formatArticleSheet(sheet, values.length);
}

summary.getRangeByIndexes(0, 0, allRows.length + 1, headers.length).values = [headers, ...allRows];
formatArticleSheet(summary, allRows.length + 1);

function formatArticleSheet(sheet, rowCount) {
  sheet.showGridLines = false;
  sheet.freezePanes.freezeRows(1);
  sheet.getRange("A1:F1").format = {
    fill: "#1F4E78",
    font: { bold: true, color: "#FFFFFF" },
    horizontalAlignment: "center",
    verticalAlignment: "middle",
    wrapText: true,
  };
  sheet.getRangeByIndexes(1, 0, Math.max(rowCount - 1, 1), 6).format = {
    verticalAlignment: "top",
    wrapText: true,
  };
  sheet.getRange("A:A").format.columnWidthPx = 110;
  sheet.getRange("B:B").format.columnWidthPx = 110;
  sheet.getRange("C:C").format.columnWidthPx = 210;
  sheet.getRange("D:D").format.columnWidthPx = 240;
  sheet.getRange("E:E").format.columnWidthPx = 320;
  sheet.getRange("F:F").format.columnWidthPx = 620;
  sheet.getRange("G:G").format.columnWidthPx = 260;
}

await fs.mkdir(outputDir, { recursive: true });

const overview = await workbook.inspect({
  kind: "sheet,table",
  maxChars: 5000,
  tableMaxRows: 4,
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
console.log(JSON.stringify({ outputPath, sheetCount: Object.keys(articles).length + 1, articleCount: allRows.length }));
