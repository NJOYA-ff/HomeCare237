/**
 * Observes what network request Storyset's own "Download SVG" button makes.
 *
 * Storyset serves no download endpoint that can be discovered from the static
 * HTML — the bro/pana/rafiki style variants are resolved client-side, and the
 * button routes through their editor. This drives the real page and records
 * every response so the asset URL can be read off the wire rather than guessed.
 *
 * Usage: node scripts/probe-storyset.mjs <pageUrl> [seconds]
 * Read-only: it clicks nothing but Download, and writes no files.
 */
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const targetUrl = process.argv[2];
const dwell = Number(process.argv[3] ?? 25);
const port = 9600 + Math.floor(Math.random() * 200);

const chrome = spawn(
  "google-chrome",
  [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    `--remote-debugging-port=${port}`,
    "--window-size=1400,1200",
    "about:blank",
  ],
  { stdio: "ignore" },
);
process.on("exit", () => chrome.kill());

let page;
for (let i = 0; i < 40; i += 1) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    page = list.find((t) => t.type === "page");
    if (page) break;
  } catch {
    /* not up */
  }
  await delay(250);
}

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => {
  ws.onopen = r;
  ws.onerror = j;
});

let id = 0;
const pending = new Map();
const seen = [];
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
  } else if (msg.method === "Network.responseReceived") {
    const r = msg.params.response;
    if (/\.(svg|json|zip)(\?|$)/i.test(r.url) || /download|export/i.test(r.url)) {
      seen.push({ status: r.status, type: r.mimeType, url: r.url });
    }
  }
};
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const n = (id += 1);
    pending.set(n, { resolve, reject });
    ws.send(JSON.stringify({ id: n, method, params }));
  });
const evalJs = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  return r.result?.value;
};

await send("Page.enable");
await send("Runtime.enable");
await send("Network.enable");
await send("Page.navigate", { url: targetUrl });
await delay(8000);

console.log(
  "buttons:",
  JSON.stringify(
    await evalJs(`[...document.querySelectorAll('button,a')]
      .map(b => (b.innerText||'').trim()).filter(t => /download/i.test(t)).slice(0,10)`),
  ),
);

console.log("clicking Download SVG…");
await evalJs(`(() => {
  const el = [...document.querySelectorAll('button,a')]
    .find(b => /download\\s*svg/i.test((b.innerText||'').trim()));
  if (!el) return false;
  el.click();
  return true;
})()`);
await delay(dwell * 1000);

console.log(`\ncandidate network responses (${seen.length}):`);
const uniq = [...new Map(seen.map((s) => [s.url, s])).values()];
for (const s of uniq) console.log(`  ${s.status} ${s.type} ${s.url}`);

console.log("\ndialog/page state:");
console.log(JSON.stringify(await evalJs(`({
  url: location.href,
  hasLoginWall: /login|signup|register/i.test(location.href) || !!document.querySelector('input[type=password]'),
  dialogs: [...document.querySelectorAll('[role=dialog],dialog')].map(d => (d.innerText||'').slice(0,120)),
})`), null, 2));

ws.close();
chrome.kill();
process.exit(0);