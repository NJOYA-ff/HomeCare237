/**
 * CDP capture for the first-run showcase. Not part of the suite.
 *
 * Usage: node scripts/shot-showcase.mjs <url> <outPrefix> [width] [height] [clicks]
 * Prints console errors and a few DOM probes so failures are diagnosable
 * without looking at the image.
 */
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { writeFileSync, mkdirSync } from "node:fs";
import sharp from "sharp";

const [url, prefix, w = "390", h = "844", clicks = "0"] = process.argv.slice(2);
const port = 9333 + Math.floor(Math.random() * 400);
const chrome = spawn(
  "google-chrome",
  [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--hide-scrollbars",
    `--remote-debugging-port=${port}`,
    `--window-size=${w},${h}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);

process.on("exit", () => chrome.kill());

let target;
for (let i = 0; i < 40; i += 1) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/json/list`);
    const list = await res.json();
    target = list.find((t) => t.type === "page");
    if (target) break;
  } catch {
    /* not up yet */
  }
  await delay(250);
}
if (!target) {
  console.error("chrome did not expose a page target");
  process.exit(1);
}

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r, j) => {
  ws.onopen = r;
  ws.onerror = j;
});

let id = 0;
const pending = new Map();
const events = [];
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
  } else if (msg.method) {
    events.push(msg);
  }
};
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const n = (id += 1);
    pending.set(n, { resolve, reject });
    ws.send(JSON.stringify({ id: n, method, params }));
  });

await send("Page.enable");
await send("Runtime.enable");
await send("Log.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: Number(w),
  height: Number(h),
  deviceScaleFactor: 1,
  mobile: true,
});

await send("Page.navigate", { url });
await delay(6000);

const evalJs = async (expr) => {
  const r = await send("Runtime.evaluate", {
    expression: expr,
    returnByValue: true,
    awaitPromise: true,
  });
  return r.result?.value;
};

console.log(
  "probe:",
  JSON.stringify(
    await evalJs(`(() => {
      const q = (s) => document.querySelector(s);
      const box = (s) => { const e = q(s); if (!e) return null; const r = e.getBoundingClientRect();
        return {w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y),
                op: getComputedStyle(e).opacity, z: getComputedStyle(e).zIndex}; };
      const copy = {};
      for (const sel of ['.sc-kicker', '.sc-skip', '.sc-card-art', '.sc-card-title', '.sc-card-body', '.sc-sub', '.sc-dots', '.sc-actions']) {
        copy[sel] = box(sel);
      }
      /* Vendored stock art renders as <img>; a 404 or a failed Vite url import
         leaves naturalWidth at 0, which is otherwise invisible in a screenshot. */
      const imgs = [...document.querySelectorAll('.sc-art-img')].map((e) => ({
        src: (e.getAttribute('src') || '').slice(-60),
        complete: e.complete,
        natural: e.naturalWidth + 'x' + e.naturalHeight,
      }));
      return {
        url: location.href,
        bodyChildren: document.body.children.length,
        hasScContent: !!q('.sc-content'),
        hasRipple: !!q('.sc-ripple-svg'),
        hasCard: !!q('.sc-card'),
        stockImgs: imgs,
        ripple: box('.sc-ripple-svg'),
        card: box('.sc-card'),
        content: box('.sc-content'),
        contentBg: q('.sc-content') ? getComputedStyle(q('.sc-content')).backgroundImage.slice(0,90) : null,
        cardBg: q('.sc-card') ? getComputedStyle(q('.sc-card')).backgroundColor : null,
        cardFilter: q('.sc-card') ? getComputedStyle(q('.sc-card')).backdropFilter : null,
        copy,
      };
    })()`),
    null,
    2,
  ),
);

const errs = events.filter(
  (e) =>
    e.method === "Log.entryAdded" && e.params.entry.level === "error"
    || (e.method === "Runtime.consoleAPICalled" && e.params.type === "error")
    || e.method === "Runtime.exceptionThrown",
);
console.log(`console errors: ${errs.length}`);
for (const e of errs.slice(0, 8)) {
  const txt =
    e.params?.entry?.text ||
    e.params?.exceptionDetails?.text ||
    (e.params?.args || []).map((a) => a.value ?? a.description).join(" ");
  console.log("  ERR:", String(txt).slice(0, 300));
}

mkdirSync("/tmp/shots", { recursive: true });
const grab = async (name) => {
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  const buf = Buffer.from(data, "base64");
  if (name) {
    mkdirSync("/tmp/shots", { recursive: true });
    writeFileSync(`/tmp/shots/${prefix}-${name}.png`, buf);
    console.log(`wrote /tmp/shots/${prefix}-${name}.png`);
  }
  return buf;
};
/* Injected stylesheet so a treatment can be A/B'd without touching the source. */
const applyCss = async (css) => {
  await evalJs(`(() => {
    let s = document.getElementById('shot-lab');
    if (!s) { s = document.createElement('style'); s.id = 'shot-lab'; document.head.appendChild(s); }
    s.textContent = ${JSON.stringify(css)};
    return true;
  })()`);
  await delay(400);
};

await grab("slide1");

/* A/B the ripple against the same frame with it removed, so its actual
   contribution to each pixel is measurable rather than guessed at. */
await evalJs(`(() => {
  const el = document.querySelector('.sc-ripple-svg');
  if (el) el.style.display = 'none';
  return !!el;
})()`);
await delay(400);
await grab("norep");

const delta = await evalJs(`(() => {
  const el = document.querySelector('.sc-ripple-svg');
  if (el) el.style.display = '';
  return !!el;
})()`);
console.log("ripple restored:", delta);

/* Slide through and assert the ripple never lands on copy, at each breakpoint
   the CSS actually has rules for. Regions come from the live layout, so a
   reflow that moves the type is caught rather than assumed away. */
const VIEWPORTS = [
  { w: 390, h: 844, name: "iPhone 12/13/14" },
  { w: 360, h: 740, name: "small Android" },
  { w: 844, h: 390, name: "landscape phone" },
  { w: 430, h: 932, name: "iPhone Pro Max" },
];

for (const vp of VIEWPORTS) {
  await send("Emulation.setDeviceMetricsOverride", {
    width: vp.w,
    height: vp.h,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await delay(700);

  const slides = await evalJs(
    `document.querySelectorAll('.sc-card').length || document.querySelectorAll('.sc-nav').length`,
  );
  console.log(`\n== ${vp.name} ${vp.w}x${vp.h} ==`);

  for (let s = 0; s < Math.min(Number(slides) || 1, 4); s += 1) {
    if (s > 0) {
      await evalJs(`(() => {
        const btns = [...document.querySelectorAll('.sc-nav')];
        const next = btns[btns.length - 1];
        if (next) next.click();
        return !!next;
      })()`);
      await delay(700);
    }

    /* Copy rects read live from the DOM. */
    const rects = await evalJs(`(() => {
      const out = {};
      for (const sel of ['.sc-kicker', '.sc-skip', '.sc-card-title', '.sc-card-body', '.sc-sub', '.sc-dots', '.sc-actions']) {
        const e = document.querySelector(sel);
        if (!e) continue;
        const r = e.getBoundingClientRect();
        if (r.width && r.height) out[sel] = [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
      }
      return out;
    })()`);

    await applyCss(`.sc-ripple-svg { display: none !important; }`);
    const base = await grab();
    await applyCss(`.sc-ripple-svg { display: block !important; }`);
    const withR = await grab();

    const a = await sharp(withR).raw().toBuffer({ resolveWithObject: true });
    const b = await sharp(base).raw().toBuffer({ resolveWithObject: true });
    const cw = a.info.width;
    const ch = a.info.channels;

    let worst = 0;
    let worstAt = "";
    for (const [sel, [x, y, ww, hh]] of Object.entries(rects)) {
      const x1 = Math.min(cw, x + ww);
      const y1 = Math.min(a.info.height, y + hh);
      for (let yy = Math.max(0, y); yy < y1; yy += 1) {
        for (let xx = Math.max(0, x); xx < x1; xx += 1) {
          const i = (yy * cw + xx) * ch;
          const d = Math.max(
            Math.abs(a.data[i] - b.data[i]),
            Math.abs(a.data[i + 1] - b.data[i + 1]),
            Math.abs(a.data[i + 2] - b.data[i + 2]),
          );
          if (d > worst) {
            worst = d;
            worstAt = `${sel} @${xx},${yy}`;
          }
        }
      }
    }
    console.log(
      `  slide ${s + 1}: copy max delta ${String(worst).padStart(3)} ${worst <= 8 ? "OK" : "FAIL <- " + worstAt}`,
    );
  }
}
for (let i = 0; i < Number(clicks); i += 1) {
  await evalJs(`(() => {
    const btns = [...document.querySelectorAll('.sc-nav')];
    const next = btns[btns.length - 1];
    if (next) next.click();
    return !!next;
  })()`);
  await delay(900);
  await grab(`slide${i + 2}`);
}

ws.close();
chrome.kill();
process.exit(0);