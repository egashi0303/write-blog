import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOST = process.env.ARTICLE_COMMAND_HOST || "127.0.0.1";
const PORT = Number(process.env.ARTICLE_COMMAND_PORT || 8787);
const RUNNER = path.join(ROOT, "tools", "run_article_batch.mjs");
const INDEX = path.join(ROOT, "index.html");
const STYLES = path.join(ROOT, "styles.css");
const ARTICLE_COMMAND = "\u8a18\u4e8b\u751f\u6210";

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);

    if (req.method === "GET" && url.pathname === "/") {
      return serveFile(INDEX, "text/html; charset=utf-8", res);
    }

    if (req.method === "GET" && url.pathname === "/styles.css") {
      return serveFile(STYLES, "text/css; charset=utf-8", res);
    }

    if (req.method === "GET" && url.pathname === "/api/health") {
      return sendJson(res, 200, {
        ok: true,
        mode: "article-command-server",
        runner: path.relative(ROOT, RUNNER),
      });
    }

    if (req.method === "POST" && url.pathname === "/api/article-generation") {
      const body = await readJsonBody(req);
      const command = String(body.command ?? "").trim();
      if (!command) {
        return sendJson(res, 400, { ok: false, error: "command is required" });
      }
      if (command !== ARTICLE_COMMAND && !command.startsWith(ARTICLE_COMMAND)) {
        return sendJson(res, 400, {
          ok: false,
          error: "Unsupported command",
          expected: ARTICLE_COMMAND,
        });
      }

      const result = spawnSync(process.execPath, [RUNNER], {
        cwd: ROOT,
        encoding: "utf8",
        maxBuffer: 1024 * 1024 * 30,
      });

      if (result.error) throw result.error;
      if (result.status !== 0) {
        return sendJson(res, 500, {
          ok: false,
          error: `Article generation failed with code ${result.status}`,
          stdout: String(result.stdout ?? ""),
        });
      }

      return sendJson(res, 200, {
        ok: true,
        message: "\u8a18\u4e8b\u751f\u6210\u304b\u3089\u4fdd\u5b58\u307e\u3067\u5b8c\u4e86\u3057\u307e\u3057\u305f\u3002",
        output: parseJsonTail(result.stdout),
      });
    }

    return sendText(res, 404, "Not Found", "text/plain; charset=utf-8");
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Article command server running at http://${HOST}:${PORT}/`);
});

async function serveFile(filePath, contentType, res) {
  const content = await fs.readFile(filePath);
  res.writeHead(200, {
    "content-type": contentType,
    "cache-control": "no-store",
  });
  res.end(content);
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(payload);
}

function sendText(res, status, body, contentType) {
  res.writeHead(status, {
    "content-type": contentType,
    "cache-control": "no-store",
  });
  res.end(body);
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (!text) return {};
  return JSON.parse(text);
}

function parseJsonTail(stdout) {
  const text = String(stdout ?? "").trim();
  if (!text) return {};
  const lines = text.split(/\r?\n/).filter(Boolean);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    if (line.startsWith("{")) {
      try {
        return JSON.parse(lines.slice(index).join("\n"));
      } catch {
        // keep searching
      }
    }
  }
  return {};
}
