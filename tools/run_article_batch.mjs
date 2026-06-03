import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { prepareThumbnailArtifacts } from "./thumbnail_preparation.mjs";

const ROOT = "C:/Users/user/write-blog";
const ARTICLE_DIR = path.join(ROOT, "outputs/generated_articles");
const THUMBNAIL_REPORT_DIR = path.join(ROOT, "outputs/article_run_thumbnail_reports");
const PUBLISH_SCRIPT = path.join(ROOT, "tools/publish_thumbnail_report_to_drive.mjs");
const ARTICLE_RULE_PATH = path.join(ROOT, "ARTICLE_RULES.md");
const CONFIG_PATH = path.join(ROOT, "config/article_output_spreadsheets.json");
const SAVE_ROOT_FOLDER_ID = "1Wd_sWynNWrOfofWM3uYVzfXS6fgtEvQN";
const THUMBNAIL_SOURCE_URL =
  "https://drive.google.com/file/d/1Eu9JtOr_irGY0xsCY4dU39_hJfaw7c5i/view?usp=drivesdk";
const RUN_DATE = "2026-06-03";

const cases = [
  {
    caseId: "CASE-0001",
    caseName: "タイ古式マッサージBANDEE",
    angle: "前かがみが続く一日",
    slug: "forward_posture_reset",
    title: "前かがみが続く一日に。タイ古式マッサージで背中と腰をゆるめる",
    body: [
      "家事やデスクワーク、スマホを見る時間が重なると、知らないうちに体が前のめりになりがちです。肩の重さより先に、背中や腰の張りが気になる日もあるのではないでしょうか。",
      "そんなときは、気になる場所だけを我慢してやり過ごすより、体全体をゆるめる時間をつくるほうが合うことがあります。タイ古式マッサージは、筋肉をほぐしながら、普段は伸ばしにくいところまでゆっくり動かしていく施術です。背中や腰、股関節まわりを含めて見ていくことで、自分では気づかなかったこわばりに気づきやすくなります。",
      "BANDEEでは、5000人以上の施術経験をもとに、一人ひとりの状態に合わせた施術を大切にしています。どこがつらいか、どんな姿勢が多いかを伝えれば、無理にがまんする時間ではなく、今の体に合った整え方を相談しやすいのが特徴です。",
      "柏駅から徒歩約3分、営業時間は11時から24時まで。仕事帰りでも立ち寄りやすいので、前かがみが続いて背中や腰が重いときに、体をゆるめる選択肢として覚えておくと便利です。まずは施術内容を確認して、自分に合う整え方を見つけてみてください。",
    ],
  },
  {
    caseId: "CASE-0002",
    caseName: "オンドラフト",
    angle: "お酒を控えめにしたい夜",
    slug: "light_meal_night",
    title: "お酒を控えめにしたい夜に。食事を主役にできるオンドラフト",
    body: [
      "今日はしっかり飲むより、食事をおいしく楽しみたい。そんな夜に合う店があると、外食の使い方が少し楽になります。",
      "オンドラフトは、お酒だけを楽しむ場というより、料理と一緒に気分よく過ごしたいときに向いています。期間限定メニューやケサディーヤのように、ひと皿ごとに会話が生まれやすい料理があると、飲む量を控えめにしたい日でも満足感をつくりやすくなります。",
      "ひとりでふらっと寄る夜でも、友人と少人数で集まる夜でも、無理に盛り上げなくていい空気があると気が楽です。仕事帰りに予約して立ち寄れるなら、気分に合わせて使い分けやすいのも助かります。",
      "お酒を主役にしない夜がほしいときは、料理を中心に選べるお店を知っておくと便利です。飲みすぎたくないけれど、外で食事は楽しみたい。そんな日にオンドラフトを候補に入れてみてください。",
    ],
  },
  {
    caseId: "CASE-0003",
    caseName: "サロンドオズ",
    angle: "夏前の準備",
    slug: "before_summer_planning",
    title: "夏前に慌てないために。サロンドオズで自分に合う脱毛方法を早めに考える",
    body: [
      "薄着になる季節が近づくと、急にムダ毛ケアが気になり始めることがあります。けれど、脱毛は思い立った日にすぐ終わるものではないので、早めに考えておくほうが気持ちに余裕が生まれます。",
      "サロンドオズでは、WAX、シュガーリング、ルミクスといった方法を比べながら、自分に合うケアを考えやすいのがポイントです。肌との相性や痛みの感じ方は人それぞれなので、方法を知ってから選べることは大きな安心につながります。",
      "さらに、完全個室で相談しやすいので、初めての脱毛でも身構えすぎずに話しやすいはずです。1回だけで終わらせるのではなく、通いやすさまで含めて考えると、続けるイメージも持ちやすくなります。",
      "夏になってから慌てるより、少し早めに準備を始めておく。サロンドオズは、そんな考え方に合う脱毛サロンとして見ておくと使いやすいです。",
    ],
  },
  {
    caseId: "CASE-0004",
    caseName: "medinaturals",
    angle: "考えごとが止まらない夜",
    slug: "mind_off_night",
    title: "考えごとが止まらない夜に。CBDを休む前の選択肢として知っておく",
    body: [
      "仕事が終わっても頭の中だけが忙しくて、気持ちの切り替えがうまくいかない。そんな夜は、休む準備そのものを見直したくなることがあります。",
      "CBDは、眠れない夜をどうにかする魔法ではありませんが、休息前の選択肢として知っておくと、気持ちを整えるきっかけになります。毎日の緊張をそのまま持ち込まず、少しずつ落ち着く時間をつくりたいときに、候補のひとつとして考えやすい存在です。",
      "medinaturalsのようなブランドを見ておくと、回復を大げさに考えすぎず、日々のリズムづくりの中で取り入れるイメージが持ちやすくなります。朝のだるさをどうにかしたいというより、夜に気持ちを切り替えるところから始めたい人に向いています。",
      "考えごとが止まらない夜ほど、休む前の準備を丁寧にしてみてください。自分に合う選択肢を知っておくだけでも、気持ちの置き方は少し変わります。",
    ],
  },
  {
    caseId: "CASE-0005",
    caseName: "株案件テスト",
    angle: "株と投資信託の違い",
    slug: "stock_vs_fund",
    title: "60代から始めるなら、株と投資信託の違いも知っておきたい",
    body: [
      "株式投資に興味はあるけれど、株そのものと投資信託の違いがよく分からない。そんな段階から始めるのは、とても自然なことです。",
      "株は自分で銘柄を選び、値動きを見ながら考えていく方法です。一方で投資信託は、複数の資産に分けて運用する考え方なので、ひとつずつ選ぶのが不安な人でも比べやすくなります。どちらが正しいかではなく、どんな進め方が自分に合うかを知ることが大切です。",
      "60代から始めるなら、急いで増やすことより、理解しながら続けられる形を選ぶほうが安心です。少額から、基本を知りながら進めるだけでも、投資への見え方はかなり変わります。",
      "まずは株だけに絞らず、投資信託も含めて選択肢を見ておくと、自分のペースに合った資産づくりを考えやすくなります。メールアドレスを登録して教材を受け取り、基本を整理するところから始めてみてください。",
    ],
  },
];

await fs.mkdir(ARTICLE_DIR, { recursive: true });
await fs.mkdir(THUMBNAIL_REPORT_DIR, { recursive: true });

const config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf8"));
const accessToken = await getAccessToken();
const results = [];

for (const item of cases) {
  const articleFileName = `${item.caseId}_${RUN_DATE.replace(/-/g, "")}_${item.slug}.md`;
  const articlePath = path.join(ARTICLE_DIR, articleFileName);
  const articleMarkdown = `# ${item.title}\n\n${item.body.join("\n\n")}\n`;
  await fs.writeFile(articlePath, articleMarkdown, "utf8");

  await appendArticleRow({
    accessToken,
    spreadsheetId: config.files[item.caseId].spreadsheet_id,
    sheetName: config.sheet_name,
    row: [RUN_DATE, item.caseId, item.caseName, item.angle, item.title, item.body.join("\n\n"), ""],
  });

  const prepared = await prepareThumbnailArtifacts({
    articlePath,
    articleText: articleMarkdown,
  });

  const reportPath = path.join(THUMBNAIL_REPORT_DIR, `${item.caseId}_${item.slug}.json`);
  const report = JSON.parse(await fs.readFile(prepared.reportPath, "utf8"));
  report.case_id = item.caseId;
  report.case_name = item.caseName;
  report.source_article = articlePath;
  report.source_title = item.title;
  report.selected_candidate_thumbnail_url = THUMBNAIL_SOURCE_URL;
  report.notes = Array.from(
    new Set([...(report.notes ?? []), "Run generated from article batch flow.", "Thumbnail source reused for Drive upload verification."]),
  );
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

  const publishResult = spawnSync(process.execPath, [PUBLISH_SCRIPT, reportPath, SAVE_ROOT_FOLDER_ID], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
    maxBuffer: 1024 * 1024 * 20,
  });
  if (publishResult.error) throw publishResult.error;
  if (publishResult.status !== 0) {
    throw new Error(`Thumbnail publish failed for ${item.caseId}: ${publishResult.status}`);
  }

  const publishJson = parseJsonOutput(publishResult.stdout);
  results.push({
    caseId: item.caseId,
    caseName: item.caseName,
    articlePath,
    reportPath,
    thumbnailUrl: publishJson?.thumbnailLinkResult?.thumbnailUrl ?? "",
  });
}

console.log(JSON.stringify({ ok: true, count: results.length, results }, null, 2));

async function getAccessToken() {
  const env = parseEnv(await fs.readFile(path.join(ROOT, ".env.local"), "utf8"));
  const required = ["GOOGLE_DRIVE_CLIENT_ID", "GOOGLE_DRIVE_CLIENT_SECRET", "GOOGLE_DRIVE_REFRESH_TOKEN"];
  for (const key of required) {
    if (!env[key]) throw new Error(`Missing ${key}`);
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_DRIVE_CLIENT_ID,
      client_secret: env.GOOGLE_DRIVE_CLIENT_SECRET,
      refresh_token: env.GOOGLE_DRIVE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`Token request failed: ${tokenResponse.status} ${await tokenResponse.text()}`);
  }

  const { access_token: accessToken } = await tokenResponse.json();
  return accessToken;
}

async function appendArticleRow({ accessToken, spreadsheetId, sheetName, row }) {
  const range = encodeURIComponent(`${sheetName}!A:G`);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        majorDimension: "ROWS",
        values: [row],
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Append row failed for ${spreadsheetId}: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

function parseEnv(text) {
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
    const [key, ...rest] = line.split("=");
    env[key.trim()] = rest.join("=").trim();
  }
  return env;
}

function parseJsonOutput(stdout) {
  const text = String(stdout ?? "").trim();
  if (!text) return {};
  const lines = text.split(/\r?\n/).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i];
    if (line.startsWith("{")) {
      try {
        return JSON.parse(lines.slice(i).join("\n"));
      } catch {
        // continue
      }
    }
  }
  return {};
}
