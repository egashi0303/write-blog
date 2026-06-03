import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "C:/Users/user/write-blog/outputs/production_template";
const outputPath = path.join(outputDir, "article_production_management_template.xlsx");

const workbook = Workbook.create();

const sheets = {
  dashboard: workbook.worksheets.add("00_運用ダッシュボード"),
  cases: workbook.worksheets.add("01_案件一覧"),
  details: workbook.worksheets.add("02_案件詳細"),
  policy: workbook.worksheets.add("03_記事方針"),
  articles: workbook.worksheets.add("04_生成記事"),
  questions: workbook.worksheets.add("05_確認事項"),
  wording: workbook.worksheets.add("06_表現ルール"),
  status: workbook.worksheets.add("99_ステータス定義"),
};

const colors = {
  navy: "#1F4E78",
  blue: "#D9EAF7",
  paleBlue: "#EEF6FC",
  green: "#DDEFE2",
  yellow: "#FFF2CC",
  red: "#FCE4D6",
  gray: "#F3F4F6",
  darkGray: "#374151",
  white: "#FFFFFF",
};

function setTitle(sheet, title, subtitle) {
  sheet.getRange("A1:H1").merge();
  sheet.getRange("A1").values = [[title]];
  sheet.getRange("A1").format = {
    fill: colors.navy,
    font: { bold: true, color: colors.white, size: 16 },
  };
  sheet.getRange("A2:H2").merge();
  sheet.getRange("A2").values = [[subtitle]];
  sheet.getRange("A2").format = {
    fill: colors.paleBlue,
    font: { color: colors.darkGray, size: 10 },
  };
}

function writeTable(sheet, startCell, headers, rows, tableName, widths = []) {
  const start = sheet.getRange(startCell);
  const rowCount = rows.length + 1;
  const colCount = headers.length;
  const range = start.resize(rowCount, colCount);
  range.values = [headers, ...rows];
  const headerRange = start.resize(1, colCount);
  headerRange.format = {
    fill: colors.navy,
    font: { bold: true, color: colors.white },
    wrapText: true,
  };
  range.format = { wrapText: true };
  const table = sheet.tables.add(range.address, true, tableName);
  table.style = "TableStyleMedium2";
  table.showFilterButton = true;
  sheet.freezePanes.freezeRows(4);
  widths.forEach((width, index) => {
    if (!width) return;
    const column = columnName(index + 1);
    sheet.getRange(`${column}:${column}`).format.columnWidthPx = width;
  });
}

function columnName(number) {
  let n = number;
  let name = "";
  while (n > 0) {
    n -= 1;
    name = String.fromCharCode(65 + (n % 26)) + name;
    n = Math.floor(n / 26);
  }
  return name;
}

function addListValidation(sheet, rangeAddress, values) {
  sheet.getRange(rangeAddress).dataValidation = {
    rule: {
      type: "list",
      values,
    },
  };
}

function addDateFormat(sheet, rangeAddress) {
  sheet.getRange(rangeAddress).format.numberFormat = "yyyy-mm-dd";
}

setTitle(
  sheets.dashboard,
  "記事量産プラットフォーム 管理テンプレート",
  "案件情報の共有から記事生成、確認、公開準備までを複数案件で管理するための本番用MVPテンプレート"
);
sheets.dashboard.getRange("A4:B10").values = [
  ["使う順番", "内容"],
  ["1", "01_案件一覧 に案件を1行ずつ登録する"],
  ["2", "02_案件詳細 に商品・サービスの事実情報を入力する"],
  ["3", "03_記事方針 に読者、切り口、SEO、CTAを整理する"],
  ["4", "04_生成記事 にタイトルと本文を保存する"],
  ["5", "05_確認事項 で不足情報を管理する"],
  ["6", "06_表現ルール にNG表現や言い換えを蓄積する"],
];
sheets.dashboard.getRange("A4:B4").format = {
  fill: colors.navy,
  font: { bold: true, color: colors.white },
};
sheets.dashboard.getRange("D4:H9").values = [
  ["運用KPI", "数式", "説明", "", ""],
  ["総案件数", '=COUNTA(\'01_案件一覧\'!A5:A204)', "登録済み案件数", "", ""],
  ["情報待ち", '=COUNTIF(\'01_案件一覧\'!B5:B204,"情報待ち")', "不足情報がある案件", "", ""],
  ["生成準備OK", '=COUNTIF(\'01_案件一覧\'!B5:B204,"生成準備OK")', "記事生成に進める案件", "", ""],
  ["レビュー中", '=COUNTIF(\'01_案件一覧\'!B5:B204,"レビュー中")', "確認中の記事", "", ""],
  ["完了", '=COUNTIF(\'01_案件一覧\'!B5:B204,"完了")', "納品・公開準備完了", "", ""],
];
sheets.dashboard.getRange("D4:H4").format = {
  fill: colors.navy,
  font: { bold: true, color: colors.white },
};
sheets.dashboard.getRange("A:B").format.columnWidthPx = 180;
sheets.dashboard.getRange("D:F").format.columnWidthPx = 150;

const caseHeaders = [
  "案件ID",
  "ステータス",
  "優先度",
  "案件名",
  "企業名/ブランド名",
  "商品・サービス名",
  "記事テーマ",
  "記事の目的",
  "想定読者",
  "掲載先",
  "伝えたいこと",
  "CTA",
  "担当",
  "期限",
  "作成日",
  "更新日",
  "備考",
];
const caseRows = [
  [
    "CASE-0001",
    "情報待ち",
    "高",
    "タイ古式マッサージBANDEE",
    "BANDEE",
    "タイ古式マッサージ",
    "タイ古式マッサージの効果",
    "タイ古式マッサージの効果を伝える",
    "40代女性",
    "Hot Pepper Beauty内ブログ",
    "BANDEEの施術の特徴",
    "予約ページ・ブログ確認",
    "",
    "",
    new Date("2026-06-02"),
    new Date("2026-06-02"),
    "初回サンプル行。運用時は上書きまたは削除してください。",
  ],
];
setTitle(sheets.cases, "01_案件一覧", "案件ごとの進行状況と基本情報を1行で管理します。");
writeTable(sheets.cases, "A4", caseHeaders, caseRows, "CasesTable", [
  110, 120, 80, 180, 180, 180, 220, 220, 140, 190, 220, 160, 100, 100, 110, 110, 260,
]);
addListValidation(sheets.cases, "B5:B204", ["情報待ち", "生成準備OK", "生成済み", "レビュー中", "修正中", "完了", "保留"]);
addListValidation(sheets.cases, "C5:C204", ["高", "中", "低"]);
addDateFormat(sheets.cases, "N5:P204");

const detailHeaders = [
  "案件ID",
  "公式URL",
  "対象エリア",
  "業種/ジャンル",
  "主な特徴",
  "強み",
  "料金",
  "プラン",
  "導入手順/利用方法",
  "対応範囲",
  "実績",
  "口コミ/お客様の声",
  "よくある質問",
  "参考URL",
  "確定情報",
  "未確定情報",
];
setTitle(sheets.details, "02_案件詳細", "記事に使える事実情報を案件IDごとに管理します。未確認情報は本文に混ぜないでください。");
writeTable(sheets.details, "A4", detailHeaders, [["CASE-0001", "", "", "リラクゼーション/マッサージ", "", "", "", "", "", "", "", "", "", "", "", ""]], "CaseDetailsTable", [
  110, 220, 120, 180, 260, 260, 160, 160, 260, 180, 220, 260, 260, 220, 260, 260,
]);

const policyHeaders = [
  "案件ID",
  "記事タイプ",
  "メインキーワード",
  "サブキーワード",
  "想定タイトル",
  "想定見出し",
  "文字数目安",
  "トーン",
  "導入形式",
  "読者の悩み",
  "読者の誤解",
  "新しい視点",
  "具体策",
  "未来イメージ",
  "無料特典/導線",
  "NG表現",
  "必ず入れる表現",
];
setTitle(sheets.policy, "03_記事方針", "生成前のコンセプト、SEO、読者心理、導線を整理します。");
writeTable(sheets.policy, "A4", policyHeaders, [[
  "CASE-0001",
  "Hot Pepper Beautyブログ",
  "タイ古式マッサージ 効果",
  "BANDEE, 40代女性, 体のこわばり",
  "",
  "",
  "700〜1000字",
  "やさしい、初心者向け",
  "共感型",
  "疲れが戻りやすい、体が硬い不安",
  "痛そう、体が硬いと受けられない",
  "ほぐすだけでなく伸ばして整えるケア",
  "不調や苦手な動きを伝える",
  "体が軽くなり日々の過ごし方が変わる",
  "",
  "",
  "",
]], "ArticlePolicyTable", [
  110, 170, 180, 220, 240, 280, 110, 180, 130, 260, 240, 260, 240, 260, 220, 220, 220,
]);
addListValidation(sheets.policy, "B5:B204", ["SEO記事", "ブログ", "比較記事", "導入事例", "サービス紹介", "LP下書き", "レビュー風記事"]);
addListValidation(sheets.policy, "I5:I204", ["断定型", "問いかけ型", "ストーリー型", "共感型", "失敗回避型", "未来提示型"]);

const articleHeaders = [
  "案件ID",
  "記事タイトル",
  "記事本文",
  "生成ステータス",
  "生成日",
  "レビュー担当",
  "修正指示",
  "最終版",
  "掲載URL",
  "備考",
];
setTitle(sheets.articles, "04_生成記事", "生成されたタイトルと本文を案件IDに紐づけて保存します。");
writeTable(sheets.articles, "A4", articleHeaders, [["CASE-0001", "", "", "未生成", "", "", "", "", "", ""]], "GeneratedArticlesTable", [
  110, 320, 520, 130, 110, 120, 260, 120, 220, 220,
]);
addListValidation(sheets.articles, "D5:D204", ["未生成", "生成済み", "レビュー中", "修正中", "承認済み", "掲載済み"]);
addDateFormat(sheets.articles, "E5:E204");

const questionHeaders = [
  "確認ID",
  "案件ID",
  "確認内容",
  "判断できない理由",
  "必要なデータ/ファイル",
  "担当",
  "ステータス",
  "作成日",
  "解決日",
  "回答メモ",
];
setTitle(sheets.questions, "05_確認事項", "推測で記事に入れないための確認事項を管理します。");
writeTable(sheets.questions, "A4", questionHeaders, [["Q-0001", "CASE-0001", "BANDEE固有の施術特徴", "未共有のため本文で断定できない", "施術説明、店舗ページ、メニュー情報", "", "未確認", new Date("2026-06-02"), "", ""]], "QuestionsTable", [
  100, 110, 260, 260, 260, 110, 120, 110, 110, 260,
]);
addListValidation(sheets.questions, "G5:G204", ["未確認", "確認中", "解決", "保留"]);
addDateFormat(sheets.questions, "H5:I204");

const wordingHeaders = [
  "区分",
  "対象語/表現",
  "扱い",
  "推奨表現",
  "理由",
  "適用案件ID",
  "備考",
];
setTitle(sheets.wording, "06_表現ルール", "案件横断で使うNG表現、言い換え、トーンのルールを蓄積します。");
writeTable(sheets.wording, "A4", wordingHeaders, [
  ["禁止", "治る/改善する/必ず効果がある", "使用禁止", "軽く感じる方もいます/整えるケア", "医療的・効果保証に見えるため", "ALL", ""],
  ["注意", "日本一/最高/絶対", "根拠がある場合のみ", "", "比較優位の根拠が必要なため", "ALL", ""],
], "WordingRulesTable", [100, 220, 150, 240, 260, 130, 220]);
addListValidation(sheets.wording, "A5:A204", ["禁止", "注意", "推奨", "言い換え"]);
addListValidation(sheets.wording, "C5:C204", ["使用禁止", "根拠がある場合のみ", "推奨", "要確認"]);

setTitle(sheets.status, "99_ステータス定義", "入力規則に使う選択肢と運用ルールです。");
sheets.status.getRange("A4:D11").values = [
  ["種別", "値", "意味", "次の推奨アクション"],
  ["案件ステータス", "情報待ち", "案件情報が不足", "確認事項を作成する"],
  ["案件ステータス", "生成準備OK", "記事生成に必要な情報が揃っている", "記事を生成する"],
  ["案件ステータス", "生成済み", "初稿がある", "レビューに回す"],
  ["案件ステータス", "レビュー中", "確認中", "修正指示を反映する"],
  ["案件ステータス", "修正中", "修正作業中", "再レビューする"],
  ["案件ステータス", "完了", "納品または掲載準備完了", "公開URLを記録する"],
  ["案件ステータス", "保留", "進行停止中", "再開条件を確認する"],
];
sheets.status.getRange("A4:D4").format = {
  fill: colors.navy,
  font: { bold: true, color: colors.white },
};
sheets.status.getRange("A:D").format.columnWidthPx = 190;

for (const sheet of Object.values(sheets)) {
  sheet.showGridLines = false;
  const used = sheet.getUsedRange();
  if (used) {
    used.format.wrapText = true;
    used.format.verticalAlignment = "top";
  }
}

const dashboardPreview = await workbook.render({
  sheetName: "00_運用ダッシュボード",
  autoCrop: "all",
  scale: 1,
  format: "png",
});
await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(path.join(outputDir, "dashboard_preview.png"), new Uint8Array(await dashboardPreview.arrayBuffer()));

const overview = await workbook.inspect({
  kind: "sheet,table",
  maxChars: 6000,
  tableMaxRows: 4,
  tableMaxCols: 8,
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
