import fs from "node:fs/promises";
import path from "node:path";

const CASE_CONFIG_PATH = "C:/Users/user/write-blog/config/article_output_spreadsheets.json";
const SHEET_NAME_FALLBACK = "記事一覧";

const [, , reportPath, thumbnailUrl, linkTextArg] = process.argv;

if (!reportPath || !thumbnailUrl) {
  throw new Error(
    "Usage: node link_thumbnail_url_to_sheet.mjs <reportPath> <thumbnailUrl> [linkText]",
  );
}

const linkText = linkTextArg ?? "サムネイル";
const report = JSON.parse(await fs.readFile(reportPath, "utf8"));
const caseId = resolveCaseId(report);
if (!caseId) {
  throw new Error(`Could not resolve case id from report: ${reportPath}`);
}

const sourceTitle = report.source_title || report.article_title || report.created_design?.title;
if (!sourceTitle) {
  throw new Error(`Could not resolve source title from report: ${reportPath}`);
}

const config = JSON.parse(await fs.readFile(CASE_CONFIG_PATH, "utf8"));
const caseEntry = config.files?.[caseId];
if (!caseEntry?.spreadsheet_id) {
  throw new Error(`Could not find spreadsheet for ${caseId} in ${CASE_CONFIG_PATH}`);
}

const sheetName = config.sheet_name || SHEET_NAME_FALLBACK;
const spreadsheetId = caseEntry.spreadsheet_id;
const accessToken = await getAccessToken();
const values = await getSheetValues(accessToken, spreadsheetId, `${sheetName}!A:G`);
if (!values.length) {
  throw new Error(`No rows found in ${spreadsheetId} ${sheetName}`);
}

const header = values[0].map((value) => String(value ?? ""));
const headerNeedsThumbnailColumn = header[6] !== "サムネイルURL";
const targetRowNumber = findTargetRow(values, caseId, sourceTitle);
if (!targetRowNumber) {
  throw new Error(`Could not find matching row for ${caseId} / ${sourceTitle}`);
}

const updates = [];
if (headerNeedsThumbnailColumn) {
  updates.push({
    range: `${sheetName}!G1`,
    values: [["サムネイルURL"]],
  });
}
updates.push({
  range: `${sheetName}!G${targetRowNumber}`,
  values: [[`=HYPERLINK("${escapeFormulaString(thumbnailUrl)}","${escapeFormulaString(linkText)}")`]],
});

await batchUpdateValues(accessToken, spreadsheetId, updates);

console.log(
  JSON.stringify(
    {
      spreadsheetId,
      sheetName,
      caseId,
      sourceTitle,
      targetRowNumber,
      thumbnailUrl,
      linkText,
      headerAdded: headerNeedsThumbnailColumn,
    },
    null,
    2,
  ),
);

function resolveCaseId(reportValue) {
  if (reportValue.case_id) return String(reportValue.case_id).trim();
  if (typeof reportValue.source_article === "string") {
    const match = reportValue.source_article.match(/(CASE-\d{4})/i);
    if (match) return match[1].toUpperCase();
  }
  if (typeof reportValue.articlePath === "string") {
    const match = reportValue.articlePath.match(/(CASE-\d{4})/i);
    if (match) return match[1].toUpperCase();
  }
  return "";
}

function findTargetRow(values, caseIdValue, sourceTitleValue) {
  const title = String(sourceTitleValue).trim();
  let foundRow = 0;
  for (let i = 1; i < values.length; i += 1) {
    const row = values[i] || [];
    const rowCaseId = String(row[1] ?? "").trim();
    const rowTitle = String(row[4] ?? "").trim();
    if (rowCaseId === caseIdValue && rowTitle === title) {
      foundRow = i + 1;
    }
  }
  return foundRow;
}

async function getAccessToken() {
  const env = parseEnv(await fs.readFile("C:/Users/user/write-blog/.env.local", "utf8"));
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

async function getSheetValues(accessToken, spreadsheetId, range) {
  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`);
  url.searchParams.set("majorDimension", "ROWS");
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Sheets get failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.values ?? [];
}

async function batchUpdateValues(accessToken, spreadsheetId, updates) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        valueInputOption: "USER_ENTERED",
        data: updates,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Sheets batchUpdate failed: ${response.status} ${await response.text()}`);
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

function escapeFormulaString(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
