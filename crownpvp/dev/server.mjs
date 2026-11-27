/* Local preview server. Needs Node 22+.   node dev/server.mjs   then open http://localhost:8788
   Serves the site, runs the real backend code against an in-memory SQLite database filled with made-up demo data,
   and replaces Microsoft sign-in and Tebex with fakes so you can click through everything without any accounts.
   Never deploy this file; Cloudflare uses functions/ instead. */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { handle, sign } from "../server/core.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT) || 8788;
const uuidOf = n => { const h = crypto.createHash("md5").update("crown:" + n.toLowerCase()).digest("hex"); return h.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5"); };

const sqlite = new DatabaseSync(":memory:");
sqlite.exec(fs.readFileSync(path.join(root, "schema.sql"), "utf8"));
const DB = {
  prepare: sql => {
    const st = sqlite.prepare(sql);
    const wrap = args => ({
      first: async () => st.get(...args) ?? null,
      all: async () => ({ results: st.all(...args) }),
      run: async () => { const r = st.run(...args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; }
    });
    return { bind: (...args) => wrap(args), ...wrap([]) };
  },
  batch: async list => { for (const s of list) await s.run(); return []; }
};

/* demo data (invented names) */
const now = Date.now(), H = 3600000, D = 24 * H;
const names = ["AshenKnight", "RedstoneRex", "PixelPilgrim", "NetherNomad", "CobbleKing", "TntTitan", "ObsidianOwl", "VoidWalker77", "SkyBridger", "LavaLarry", "GoldenGrub", "CreeperCaleb"];
const reasons = ["[Practice] Cheating is not allowed on this server.", "&e⚡ [VL#1] [BedWars] Cheating is not allowed on our server.", "Unfair client modification (reach)", "Exploiting a duplication glitch", "Advertising another server", "Harassment in chat", "Bypassing a mute with alt account"];
const ins = sqlite.prepare("INSERT INTO punishments(type,ext_id,uuid,name,staff,reason,time,until,active,removed_by) VALUES(?,?,?,?,?,?,?,?,?,?)");
let n = 0;
for (const [type, count] of [["ban", 34], ["mute", 14], ["warn", 10], ["kick", 14]]) for (let i = 0; i < count; i++) {
  const nm = names[(i * 5 + n) % names.length] + (i > 11 ? i : ""), t = now - i * 2.7 * H - Math.random() * H;
  const len = [0, 7 * D, 3 * D, 2 * H][i % 4], until = len ? t + len : 0, active = type === "kick" ? 0 : (until === 0 || until > now) ? 1 : 0;
  ins.run(type, String(++n), uuidOf(nm), nm, i % 3 ? "CONSOLE" : "StaffAlex", reasons[i % reasons.length], Math.round(t), Math.round(until), active, i % 9 === 8 ? "StaffAlex" : null);
}
ins.run("ban", "900", uuidOf("DevPlayer"), "DevPlayer", "CONSOLE", "[Practice] Cheating is not allowed on this server.", now - 2 * H, now + 7 * D, 1, null);
ins.run("mute", "901", uuidOf("DevPlayer"), "DevPlayer", "StaffAlex", "Spamming chat", now - 5 * H, 0, 1, null);

const st = sqlite.prepare("INSERT INTO player_stats(uuid,name,gold,kills,deaths,playtime,last_seen,updated) VALUES(?,?,?,?,?,?,?,?)");
names.forEach((nm, i) => st.run(uuidOf(nm), nm, 250000 - i * 17300, 400 - i * 23, 90 + i * 4, 3600 * (300 - i * 17), i < 3 ? now - i * 60000 : now - (i + 1) * 5 * H, now));
const env = { DB, SESSION_SECRET: "dev-secret", MS_CLIENT_ID: "dev", MS_CLIENT_SECRET: "dev", SYNC_TOKEN: "dev-sync", TRACE_FINGERPRINT_SECRET: "dev-trace-fingerprint", STAFF_UUIDS: uuidOf("StaffAlex"), TEBEX_PUBLIC_TOKEN: "dev", REPORT_OWNER_KEY: process.env.REPORT_OWNER_KEY || "crown-local-owner-key", REPORT_OWNER_NAME: "Rai (Local Preview)" };

const realFetch = globalThis.fetch;
globalThis.fetch = async (u, o) => String(u).startsWith("https://headless.tebex.io")
  ? new Response(JSON.stringify({ data: { ident: "dev-basket", links: { checkout: `http://localhost:${port}/store.html?paid=1` } } }), { headers: { "content-type": "application/json" } })
  : realFetch(u, o);

const aliases = { "/": "/index.html", "/home": "/index.html", "/client": "/client.html", "/store": "/store.html", "/stats": "/stats.html", "/staff": "/staff.html", "/rules": "/rules.html", "/punishments": "/punishments.html", "/support": "/support.html", "/appeals": "/appeals.html", "/faq": "/faq.html", "/account": "/account.html", "/owner": "/reports-admin.html", "/trace": "/trace/index.html", "/trace/": "/trace/index.html" };
const cleanRedirects = { "/index.html": "/", "/client.html": "/client", "/store.html": "/store", "/stats.html": "/stats", "/staff.html": "/staff", "/rules.html": "/rules", "/punishments.html": "/punishments", "/support.html": "/support", "/appeals.html": "/appeals", "/faq.html": "/faq", "/account.html": "/account", "/reports-admin.html": "/owner", "/trace.html": "/trace" };
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".txt": "text/plain; charset=utf-8", ".json": "application/json" };
const send = async (res, r) => {
  const h = {}; r.headers.forEach((v, k) => { if (k !== "set-cookie") h[k] = v; });
  const sc = r.headers.getSetCookie?.() || []; if (sc.length) h["set-cookie"] = sc;
  res.writeHead(r.status, h); res.end(Buffer.from(await r.arrayBuffer()));
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  try {
    if (url.pathname === "/api/auth/login") { res.writeHead(302, { location: "/dev/choose?return=" + encodeURIComponent(url.searchParams.get("return") || "/account.html") }); return res.end(); }
    if (url.pathname === "/dev/choose") {
      const ret = url.searchParams.get("return") || "/account.html";
      res.writeHead(200, { "content-type": "text/html" });
      return res.end(`<body style="font:16px system-ui;background:#111;color:#eee;padding:40px"><h2>Fake Microsoft sign-in (local preview only)</h2>${["DevPlayer", "StaffAlex", "FreshPlayer"].map(x => `<p><a style="color:#F5D76E" href="/dev/login?name=${x}&return=${encodeURIComponent(ret)}">Sign in as ${x}</a></p>`).join("")}`);
    }
    if (url.pathname === "/dev/login") {
      const name = (url.searchParams.get("name") || "DevPlayer").slice(0, 16);
      const s = await sign(env.SESSION_SECRET, { u: uuidOf(name), n: name, exp: Date.now() + 7 * D });
      res.writeHead(302, { location: url.searchParams.get("return") || "/", "set-cookie": `cp_session=${s}; Path=/; HttpOnly; SameSite=Lax` }); return res.end();
    }
    if (url.pathname.startsWith("/api/")) {
      const body = ["GET", "HEAD"].includes(req.method) ? undefined : await new Promise(r => { const c = []; req.on("data", d => c.push(d)); req.on("end", () => r(Buffer.concat(c))); });
      return send(res, await handle(new Request(url, { method: req.method, headers: req.headers, body }), env));
    }
    if (cleanRedirects[url.pathname]) { res.writeHead(301, { location: cleanRedirects[url.pathname] + url.search }); return res.end(); }
    if (url.pathname === "/js/config.js") {
      res.writeHead(200, { "content-type": types[".js"] });
      return res.end(fs.readFileSync(path.join(root, "js/config.js"), "utf8") + `\n;Object.keys(CROWN.tebex).forEach((k, i) => CROWN.tebex[k] = "https://crownpvp.tebex.io/package/" + (1000 + i));`);
    }
    const localPath = aliases[url.pathname] || url.pathname;
    let file = path.join(root, decodeURIComponent(localPath));
    if (!file.startsWith(root + path.sep) || /[\\/](server|dev|tools|functions)[\\/]|\.dev\.vars/.test(file.slice(root.length)) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream" }); fs.createReadStream(file).pipe(res);
  } catch (e) { console.error(e); res.writeHead(500); res.end("dev server error"); }
}).listen(port, () => console.log(`CrownPVP preview: http://localhost:${port}\nLocal owner inbox: http://localhost:${port}/owner\nLocal-only owner key: ${env.REPORT_OWNER_KEY}`));
