#!/usr/bin/env node
/* Minimal ITAM agent (CommonJS) with explicit http/https, detailed errors) */

const os = require("os");
const { execSync } = require("child_process");
const { URL } = require("url");
const http = require("http");
const https = require("https");

const ENROLL_URL = process.env.AGENT_ENROLL_URL || "http://localhost:5050/api/agent/enroll";
const DEBUG = process.env.DEBUG_AGENT === "1" || process.env.DEBUG_AGENT === "true";

/** helpers */
function log(...a){ if (DEBUG) console.log("[agent]", ...a); }
function safe(cmd) {
  try { return execSync(cmd, { stdio: ["ignore","pipe","ignore"] }).toString().trim(); }
  catch { return ""; }
}
function getSerial() {
  if (process.platform === "darwin") {
    const s = safe("system_profiler SPHardwareDataType | awk -F': ' '/Serial/ {print $2; exit}'");
    return s || null;
  }
  if (process.platform === "win32") {
    const ps = `powershell -NoProfile -Command "(Get-CimInstance -ClassName Win32_BIOS).SerialNumber"`;
    const s = safe(ps);
    return s || null;
  }
  const s = safe("cat /sys/class/dmi/id/product_serial");
  return s || null;
}
function getIps() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const i of nets[name] || []) {
      if (!i.internal && (i.family === "IPv4" || i.family === 4 || i.family === "IPv6" || i.family === 6)) {
        ips.push(i.address);
      }
    }
  }
  return ips;
}

const payload = {
  hostname: os.hostname(),
  serial: getSerial(),
  os: { name: process.platform === "darwin" ? "macOS" : process.platform, version: os.release() },
  username: os.userInfo().username,
  ips: getIps(),
  uptimeSeconds: Math.floor(os.uptime()),
};

function postJsonRaw(urlStr, data, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    let url;
    try {
      url = new URL(urlStr);
    } catch (e) {
      return reject(new Error(`Invalid ENROLL_URL: ${urlStr}`));
    }

    const body = Buffer.from(JSON.stringify(data));
    const isHttps = url.protocol === "https:";
    const mod = isHttps ? https : http;

    const opts = {
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + (url.search || ""),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": body.length,
        "User-Agent": "ITAM-Agent/0.1",
      }
    };

    log("Node", process.version);
    log("POST", `${opts.protocol}//${opts.hostname}:${opts.port}${opts.path}`);
    log("Headers", JSON.stringify(opts.headers));
    log("Body", body.toString());

    const req = mod.request(opts, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString();
        log("HTTP", res.statusCode, res.statusMessage);
        log("Resp body", text);
        resolve({ status: res.statusCode, statusText: res.statusMessage, text });
      });
    });

    req.on("error", (err) => {
      reject(new Error(`Request error: ${err.code || ""} ${err.message}`.trim()));
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Request timeout after ${timeoutMs}ms`));
    });

    req.write(body);
    req.end();
  });
}

(async () => {
  try {
    const resp = await postJsonRaw(ENROLL_URL, payload, 15000);
    let body;
    try { body = JSON.parse(resp.text); } catch { body = { raw: resp.text }; }

    if (resp.status < 200 || resp.status >= 300) {
      console.error("Enroll HTTP", resp.status, resp.statusText, body);
      process.exitCode = 1;
      return;
    }
    console.log("Enroll OK:", body);
  } catch (err) {
    console.error("Agent error:", err && err.message ? err.message : err);
    process.exitCode = 1;
  }
})();
