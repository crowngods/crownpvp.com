/* CrownPVP backend. Runs as a Cloudflare Pages Function (see functions/api/[[path]].js)
   and is also imported by dev/server.mjs for local testing.

   Bindings / environment (see README):
     DB                   D1 database
     SESSION_SECRET       long random string, signs login cookies
     MS_CLIENT_ID         Azure app registration (Microsoft sign-in)
     MS_CLIENT_SECRET     Azure app client secret
     SYNC_TOKEN           shared secret used by litebans-sync/sync-litebans.py
     TRACE_FINGERPRINT_SECRET private key for trace-only HMAC fingerprints
     REPORT_OWNER_KEY     private secret for the owner-only reports/application inbox
     REPORT_OWNER_NAME    optional display name for saved owner replies
     STAFF_UUIDS          comma separated Minecraft UUIDs allowed to answer appeals
     TEBEX_PUBLIC_TOKEN   public webstore token for the Tebex Headless API
     DISCORD_WEBHOOK      optional, announces new appeals in a staff channel
*/
const TYPES = ["ban", "kick", "mute", "warn"];
const APPEALABLE = ["ban", "mute"];
const STATUSES = ["open", "accepted", "denied", "closed"];
const PAGE = 25;
const DAY = 86400000;
const te = new TextEncoder();

/* ---------- small helpers ---------- */
export const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers }
});
const fail = (status, error, extra = {}) => json({ error, ...extra }, status);
const dash = id => String(id || "").toLowerCase().replace(/-/g, "").replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
const text = (v, max) => String(v ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, max);
const int = v => { const n = Number(v); return Number.isFinite(n) ? Math.trunc(n) : 0; };

const b64u = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
const safeEq = (a, b) => { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };
const hmac = async (secret, data) => b64u(await crypto.subtle.sign("HMAC",
  await crypto.subtle.importKey("raw", te.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]), te.encode(data)));
export const sign = async (secret, obj) => { const body = b64u(te.encode(JSON.stringify(obj))); return `${body}.${await hmac(secret, body)}`; };
const unsign = async (secret, token) => {
  if (!secret || !token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (!safeEq(sig, await hmac(secret, body))) return null;
  try { const o = JSON.parse(new TextDecoder().decode(unb64u(body))); return o.exp && o.exp < Date.now() ? null : o; } catch { return null; }
};
const cookies = req => Object.fromEntries((req.headers.get("cookie") || "").split(/;\s*/).filter(Boolean).map(c => { const i = c.indexOf("="); return [c.slice(0, i), c.slice(i + 1)]; }));
const cookie = (name, value, maxAge, secure) => `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
const redirect = (to, setCookies = []) => { const h = new Headers({ location: to }); setCookies.forEach(c => h.append("set-cookie", c)); return new Response(null, { status: 302, headers: h }); };
const staffSet = env => new Set((env.STAFF_UUIDS || "").split(",").map(s => dash(s.trim())).filter(Boolean));

async function getUser(req, env) {
  const s = await unsign(env.SESSION_SECRET, cookies(req).cp_session);
  return s && s.u ? { uuid: s.u, name: s.n, staff: staffSet(env).has(s.u) } : null;
}

/* ---------- Microsoft -> Xbox -> Minecraft ---------- */
class AuthError extends Error { constructor(code) { super(code); this.code = code; } }
async function post(url, body, headers = {}) {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json", accept: "application/json", ...headers }, body: JSON.stringify(body) });
  let d = null; try { d = await r.json(); } catch { /* not json */ }
  return { r, d };
}
/* Takes a Microsoft access token, returns the Minecraft Java profile. The token and every other
   credential is discarded here; only the uuid and name are kept in the session. */
export async function minecraftProfile(msToken) {
  let { r, d } = await post("https://user.auth.xboxlive.com/user/authenticate", {
    Properties: { AuthMethod: "RPS", SiteName: "user.auth.xboxlive.com", RpsTicket: `d=${msToken}` },
    RelyingParty: "http://auth.xboxlive.com", TokenType: "JWT" });
  if (!r.ok || !d?.Token) throw new AuthError("failed");
  const uhs = d.DisplayClaims?.xui?.[0]?.uhs;
  ({ r, d } = await post("https://xsts.auth.xboxlive.com/xsts/authorize", {
    Properties: { SandboxId: "RETAIL", UserTokens: [d.Token] }, RelyingParty: "rp://api.minecraftservices.com/", TokenType: "JWT" }));
  if (!r.ok) { const x = d?.XErr; throw new AuthError(x === 2148916233 ? "no_xbox" : x === 2148916238 ? "child" : x === 2148916235 ? "region" : "failed"); }
  ({ r, d } = await post("https://api.minecraftservices.com/authentication/login_with_xbox", { identityToken: `XBL3.0 x=${uhs};${d.Token}` }));
  if (r.status === 403) throw new AuthError("app_not_approved");
  if (!r.ok || !d?.access_token) throw new AuthError("failed");
  const pr = await fetch("https://api.minecraftservices.com/minecraft/profile", { headers: { authorization: `Bearer ${d.access_token}` } });
  if (pr.status === 404) throw new AuthError("no_java");
  if (!pr.ok) throw new AuthError("failed");
  const p = await pr.json();
  if (!p?.id || !p?.name) throw new AuthError("failed");
  return { uuid: dash(p.id), name: p.name };
}

/* ---------- punishments ---------- */
const shape = (p, now) => {
  const permanent = p.until <= 0, live = p.type === "ban" || p.type === "mute";
  return { id: p.id, type: p.type, name: p.name, uuid: p.uuid, staff: p.staff, reason: p.reason, time: p.time,
    until: permanent ? 0 : p.until, permanent,
    status: !live ? "none" : p.removed_by ? "removed" : p.active && (permanent || p.until > now) ? "active" : "expired" };
};
const P_COLS = "id,type,name,uuid,staff,reason,time,until,active,removed_by";

async function listPunishments(env, url) {
  const type = url.searchParams.get("type") || "ban";
  if (!TYPES.includes(type)) return fail(400, "Unknown type");
  const page = Math.max(1, int(url.searchParams.get("page")) || 1), q = text(url.searchParams.get("q"), 16), now = Date.now();
  let where = "type=?"; const binds = [type];
  if (q) { where += " AND name LIKE ? ESCAPE '\\'"; binds.push(q.replace(/[\\%_]/g, "\\$&") + "%"); }
  if (url.searchParams.get("status") === "active") { where += " AND active=1 AND removed_by IS NULL AND (until<=0 OR until>?)"; binds.push(now); }
  const total = (await env.DB.prepare(`SELECT COUNT(*) c FROM punishments WHERE ${where}`).bind(...binds).first())?.c || 0;
  const rows = (await env.DB.prepare(`SELECT ${P_COLS} FROM punishments WHERE ${where} ORDER BY time DESC LIMIT ? OFFSET ?`).bind(...binds, PAGE, (page - 1) * PAGE).all()).results || [];
  return json({ total, page, pages: Math.max(1, Math.ceil(total / PAGE)), items: rows.map(r => shape(r, now)) });
}

async function syncPunishments(req, env) {
  const given = req.headers.get("authorization") || "";
  if (!env.SYNC_TOKEN || !safeEq(given, `Bearer ${env.SYNC_TOKEN}`)) return fail(401, "Unauthorized");
  let data; try { data = await req.json(); } catch { return fail(400, "Invalid JSON"); }
  const list = Array.isArray(data?.records) ? data.records.slice(0, 500) : [];
  const stmt = env.DB.prepare(`INSERT INTO punishments(type,ext_id,uuid,name,staff,reason,time,until,active,removed_by) VALUES(?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(type,ext_id) DO UPDATE SET uuid=excluded.uuid,name=excluded.name,staff=excluded.staff,reason=excluded.reason,time=excluded.time,until=excluded.until,active=excluded.active,removed_by=excluded.removed_by`);
  const ops = [];
  for (const r of list) {
    if (!TYPES.includes(r?.type) || r.id == null || !text(r.name, 16) || !dash(r.uuid) || String(r.uuid).startsWith("#")) continue; // "#" = IP-only entry, no player
    const staff = text(r.staff, 32);
    ops.push(stmt.bind(r.type, String(r.id).slice(0, 40), dash(r.uuid), text(r.name, 16), !staff || /^console$/i.test(staff) ? "CONSOLE" : staff, text(r.reason, 500),
      int(r.time), int(r.until), r.active ? 1 : 0, r.removed_by ? text(r.removed_by, 32) : null));
  }
  for (let i = 0; i < ops.length; i += 50) await env.DB.batch(ops.slice(i, i + 50));
  return json({ ok: true, count: ops.length });
}

/* ---------- appeals ---------- */
const A_SEL = `SELECT a.id,a.uuid,a.name,a.status,a.created,a.updated,p.id pid,p.type,p.reason,p.staff,p.time,p.until,p.active,p.removed_by,p.uuid puuid,p.name pname,
  (SELECT COUNT(*) FROM appeal_posts WHERE appeal_id=a.id) replies FROM appeals a JOIN punishments p ON p.id=a.punishment_id`;
const appealRow = (a, now) => ({ id: a.id, name: a.name, uuid: a.uuid, status: a.status, created: a.created, updated: a.updated, replies: a.replies,
  punishment: shape({ id: a.pid, type: a.type, name: a.pname, uuid: a.puuid, staff: a.staff, reason: a.reason, time: a.time, until: a.until, active: a.active, removed_by: a.removed_by }, now) });
const canSee = (a, u) => u && (u.staff || a.uuid === u.uuid);

async function addPost(env, appealId, user, body, { staff = 0, system = 0 } = {}) {
  const now = Date.now();
  await env.DB.prepare("INSERT INTO appeal_posts(appeal_id,uuid,name,staff,system,body,created) VALUES(?,?,?,?,?,?,?)").bind(appealId, user.uuid, user.name, staff, system, body, now).run();
  await env.DB.prepare("UPDATE appeals SET updated=? WHERE id=?").bind(now, appealId).run();
}

async function appealsRoutes(req, env, ctx, user, parts, url) {
  const now = Date.now(), m = req.method;
  if (!user) return fail(401, "Sign in with Microsoft first.");
  if (parts.length === 0 && m === "GET") {
    const all = user.staff && url.searchParams.get("all") === "1", st = url.searchParams.get("status");
    let where = all ? "1=1" : "a.uuid=?"; const binds = all ? [] : [user.uuid];
    if (STATUSES.includes(st)) { where += " AND a.status=?"; binds.push(st); }
    const rows = (await env.DB.prepare(`${A_SEL} WHERE ${where} ORDER BY a.updated DESC LIMIT 100`).bind(...binds).all()).results || [];
    return json({ items: rows.map(r => appealRow(r, now)) });
  }
  if (parts.length === 0 && m === "POST") {
    let d; try { d = await req.json(); } catch { return fail(400, "Invalid request"); }
    const body = text(d.body, 4000);
    if (body.length < 20) return fail(400, "Please explain your appeal in at least 20 characters.");
    const p = await env.DB.prepare(`SELECT ${P_COLS} FROM punishments WHERE id=?`).bind(int(d.punishmentId)).first();
    if (!p || p.uuid !== user.uuid) return fail(404, "That punishment is not on your account.");
    if (!APPEALABLE.includes(p.type)) return fail(400, "Only bans and mutes can be appealed.");
    if (shape(p, now).status !== "active") return fail(400, "That punishment is no longer active.");
    const open = await env.DB.prepare("SELECT id FROM appeals WHERE punishment_id=? AND status='open'").bind(p.id).first();
    if (open) return fail(409, "You already have an open appeal for this punishment.", { id: open.id });
    const denied = await env.DB.prepare("SELECT id FROM appeals WHERE punishment_id=? AND status='denied' AND updated>?").bind(p.id, now - 7 * DAY).first();
    if (denied) return fail(429, "Your last appeal was denied less than 7 days ago. Please wait before appealing again.");
    const recent = (await env.DB.prepare("SELECT COUNT(*) c FROM appeals WHERE uuid=? AND created>?").bind(user.uuid, now - DAY).first())?.c || 0;
    if (recent >= 5) return fail(429, "Too many appeals today. Try again tomorrow.");
    const res = await env.DB.prepare("INSERT INTO appeals(punishment_id,uuid,name,status,created,updated) VALUES(?,?,?,'open',?,?)").bind(p.id, user.uuid, user.name, now, now).run();
    const id = res.meta.last_row_id;
    await addPost(env, id, user, body);
    if (env.DISCORD_WEBHOOK) ctx?.waitUntil?.(fetch(env.DISCORD_WEBHOOK, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ allowed_mentions: { parse: [] }, content: `New ${p.type} appeal #${id} from **${user.name.replace(/[*_`~|]/g, "")}**. Reason on record: ${text(p.reason, 200).replace(/[*_`~|@]/g, "")}` }) }).catch(() => {}));
    return json({ id }, 201);
  }
  const id = int(parts[0]);
  const a = id ? await env.DB.prepare(`${A_SEL} WHERE a.id=?`).bind(id).first() : null;
  if (!a || !canSee(a, user)) return fail(404, "Appeal not found.");
  if (parts.length === 1 && m === "GET") {
    const posts = (await env.DB.prepare("SELECT id,uuid,name,staff,system,body,created FROM appeal_posts WHERE appeal_id=? ORDER BY id").bind(id).all()).results || [];
    return json({ appeal: appealRow(a, now), posts, viewer: { uuid: user.uuid, staff: user.staff, owner: a.uuid === user.uuid } });
  }
  if (parts[1] === "posts" && m === "POST") {
    let d; try { d = await req.json(); } catch { return fail(400, "Invalid request"); }
    const body = text(d.body, 4000);
    if (!body) return fail(400, "Write a message first.");
    if (a.status !== "open" && !user.staff) return fail(409, "This appeal is closed.");
    const hour = (await env.DB.prepare("SELECT COUNT(*) c FROM appeal_posts WHERE uuid=? AND created>?").bind(user.uuid, now - 3600000).first())?.c || 0;
    if (hour >= 20) return fail(429, "Slow down a little.");
    await addPost(env, id, user, body, { staff: user.staff && a.uuid !== user.uuid ? 1 : 0 });
    return json({ ok: true }, 201);
  }
  if (parts[1] === "status" && m === "POST") {
    if (!user.staff) return fail(403, "Staff only.");
    if (a.uuid === user.uuid) return fail(403, "You cannot decide your own appeal.");
    let d; try { d = await req.json(); } catch { return fail(400, "Invalid request"); }
    if (!STATUSES.includes(d.status)) return fail(400, "Unknown status");
    await env.DB.prepare("UPDATE appeals SET status=? WHERE id=?").bind(d.status, id).run();
    await addPost(env, id, user, `Appeal marked as ${d.status}.`, { staff: 1, system: 1 });
    return json({ ok: true });
  }
  return fail(404, "Not found");
}


const REPORT_CATEGORIES = {
  player: ["Cheating", "Harassment", "Scamming", "Abuse", "Other"],
  faction: ["Rule violation", "Raid / cannon abuse", "F-Top manipulation", "Other"],
  bug: ["Bug or exploit", "Website issue", "Suggestion"]
};
const STAFF_ROLES = { admin: 3, moderator: 2, helper: 3, trial: 5 };
const APP_STATUSES = ["pending", "reviewing", "accepted", "denied"];
const ownerKeyOK = (req, env) => {
  const key = req.headers.get("x-owner-key") || "";
  return !!env.REPORT_OWNER_KEY && safeEq(key, env.REPORT_OWNER_KEY);
};
const parseBody = async req => { try { const d = await req.json(); return d && typeof d === "object" ? d : null; } catch { return null; } };

async function reportsRoutes(req, env, parts) {
  const m = req.method, now = Date.now();
  if (parts.length === 0 && m === "POST") {
    const d = await parseBody(req);
    if (!d) return fail(400, "The report could not be read. Please try again.");
    const type = text(d.type, 16).toLowerCase();
    const category = text(d.category, 48);
    const details = text(d.details, 3000);
    const evidence = text(d.evidence, 500);
    const contact = text(d.contact, 64);
    let target = text(d.target, 32);
    if (!REPORT_CATEGORIES[type]) return fail(400, "Choose a report type.");
    if (!REPORT_CATEGORIES[type].includes(category)) return fail(400, "Choose a valid category for this report type.");
    if (type === "player" && !/^[A-Za-z0-9_]{3,16}$/.test(target)) return fail(400, "Enter a valid Minecraft player username.");
    if (type === "faction" && !/^[A-Za-z0-9 _-]{2,32}$/.test(target)) return fail(400, "Enter a valid faction name.");
    if (type === "bug") target = target || "Website / server bug";
    if (details.length < 20) return fail(400, "Please provide at least 20 characters of detail.");
    if (evidence) {
      try { const u = new URL(evidence); if (!['http:', 'https:'].includes(u.protocol)) throw new Error(); }
      catch { return fail(400, "Evidence must be a valid http or https link."); }
    }
    const label = type === "player" ? "Player report" : type === "faction" ? "Faction report" : "Bug report";
    const result = await env.DB.prepare("INSERT INTO reports(player,category,details,evidence,created,status) VALUES(?,?,?,?,?,'new')")
      .bind(target, `${label} · ${category}`, details, evidence, now).run();
    if (contact) await env.DB.prepare("INSERT INTO report_contacts(report_id,contact) VALUES(?,?)").bind(result.meta.last_row_id, contact).run();
    return json({ ok: true, id: result.meta.last_row_id }, 201);
  }

  if (!ownerKeyOK(req, env)) return fail(403, "Owner access only.");
  if (parts.length === 0 && m === "GET") {
    const rows = (await env.DB.prepare(`SELECT r.id,r.player,r.category,r.details,r.evidence,r.created,r.status,
      (SELECT contact FROM report_contacts rc WHERE rc.report_id=r.id) contact,
      (SELECT body FROM report_messages rm WHERE rm.report_id=r.id ORDER BY rm.id DESC LIMIT 1) last_message,
      (SELECT COUNT(*) FROM report_messages rm WHERE rm.report_id=r.id) reply_count
      FROM reports r ORDER BY r.created DESC LIMIT 200`).all()).results || [];
    return json({ items: rows });
  }
  const id = int(parts[0]);
  if (!id) return fail(404, "Report not found.");
  const report = await env.DB.prepare(`SELECT r.id,r.player,r.category,r.details,r.evidence,r.created,r.status,
    (SELECT contact FROM report_contacts rc WHERE rc.report_id=r.id) contact FROM reports r WHERE r.id=?`).bind(id).first();
  if (!report) return fail(404, "Report not found.");
  if (parts.length === 1 && m === "GET") {
    const messages = (await env.DB.prepare("SELECT id,author,body,created FROM report_messages WHERE report_id=? ORDER BY id").bind(id).all()).results || [];
    return json({ report, messages });
  }
  if (parts[1] === "reply" && m === "POST") {
    const d = await parseBody(req), body = text(d?.body, 3000);
    if (!body || body.length < 2) return fail(400, "Write a reply first.");
    await env.DB.prepare("INSERT INTO report_messages(report_id,author,body,created) VALUES(?,?,?,?)")
      .bind(id, text(env.REPORT_OWNER_NAME || "Owner", 32), body, now).run();
    return json({ ok: true }, 201);
  }
  if (parts[1] === "status" && m === "POST") {
    const d = await parseBody(req);
    if (!d || !["new", "reviewing", "resolved", "dismissed"].includes(d.status)) return fail(400, "Choose a valid report status.");
    await env.DB.prepare("UPDATE reports SET status=? WHERE id=?").bind(d.status, id).run();
    return json({ ok: true });
  }
  return fail(404, "Not found");
}

async function applicationOpenings(env) {
  const rows = (await env.DB.prepare("SELECT role,name FROM staff_applications WHERE status='accepted' ORDER BY created ASC").all()).results || [];
  const members = {};
  for (const row of rows) (members[row.role] ||= []).push(row.name);
  return Object.fromEntries(Object.entries(STAFF_ROLES).map(([role, total]) => {
    const accepted = members[role] || [];
    return [role, { total, filled: accepted.length, available: Math.max(0, total - accepted.length), members: accepted }];
  }));
}

async function applicationsRoutes(req, env, parts) {
  const m = req.method, now = Date.now();
  if (parts[0] === "openings" && parts.length === 1 && m === "GET") return json({ roles: await applicationOpenings(env) });
  if (parts.length === 0 && m === "POST") {
    const d = await parseBody(req);
    if (!d) return fail(400, "The application could not be read. Please try again.");
    const name = text(d.name, 16), discord = text(d.discord, 64), role = text(d.role, 16).toLowerCase();
    const ageBand = text(d.ageBand, 12), timezone = text(d.timezone, 64), availability = text(d.availability, 16);
    const experience = text(d.experience, 1200), motivation = text(d.motivation, 2500);
    if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) return fail(400, "Enter a valid Minecraft username.");
    if (discord.length < 2 || discord.length > 64) return fail(400, "Enter your Discord username so staff can contact you.");
    if (!Object.hasOwn(STAFF_ROLES, role)) return fail(400, "Choose a staff role.");
    if (!["13-15", "16-17", "18+"].includes(ageBand)) return fail(400, "Choose your age range.");
    if (!timezone || timezone.length > 64) return fail(400, "Enter your time zone.");
    if (!["1-3", "3-5", "5-10", "10-20", "20+"].includes(availability)) return fail(400, "Choose your weekly availability.");
    if (motivation.length < 50) return fail(400, "Tell us at least 50 characters about why you want to join.");
    const openings = await applicationOpenings(env);
    if (!openings[role] || openings[role].available < 1) return fail(409, "There are no open positions for that role right now.");
    const existing = await env.DB.prepare("SELECT id FROM staff_applications WHERE name=? COLLATE NOCASE AND status IN ('pending','reviewing') LIMIT 1").bind(name).first();
    if (existing) return fail(409, "You already have an application being reviewed.");
    const result = await env.DB.prepare(`INSERT INTO staff_applications(name,discord,role,age_band,timezone,availability,experience,motivation,created,status)
      VALUES(?,?,?,?,?,?,?,?,?,'pending')`).bind(name, discord, role, ageBand, timezone, availability, experience, motivation, now).run();
    return json({ ok: true, id: result.meta.last_row_id }, 201);
  }
  if (!ownerKeyOK(req, env)) return fail(403, "Owner access only.");
  if (parts.length === 0 && m === "GET") {
    const rows = (await env.DB.prepare(`SELECT a.id,a.name,a.discord,a.role,a.age_band,a.timezone,a.availability,a.experience,a.motivation,a.created,a.status,
      (SELECT body FROM application_messages am WHERE am.application_id=a.id ORDER BY am.id DESC LIMIT 1) last_message,
      (SELECT COUNT(*) FROM application_messages am WHERE am.application_id=a.id) reply_count
      FROM staff_applications a ORDER BY CASE a.status WHEN 'pending' THEN 0 WHEN 'reviewing' THEN 1 WHEN 'accepted' THEN 2 ELSE 3 END, a.created DESC LIMIT 200`).all()).results || [];
    return json({ items: rows, openings: await applicationOpenings(env) });
  }
  const id = int(parts[0]);
  if (!id) return fail(404, "Application not found.");
  const application = await env.DB.prepare("SELECT id,name,discord,role,age_band,timezone,availability,experience,motivation,created,status FROM staff_applications WHERE id=?").bind(id).first();
  if (!application) return fail(404, "Application not found.");
  if (parts.length === 1 && m === "GET") {
    const messages = (await env.DB.prepare("SELECT id,author,body,created FROM application_messages WHERE application_id=? ORDER BY id").bind(id).all()).results || [];
    return json({ application, messages });
  }
  if (parts[1] === "reply" && m === "POST") {
    const d = await parseBody(req), body = text(d?.body, 3000);
    if (!body || body.length < 2) return fail(400, "Write a reply first.");
    await env.DB.prepare("INSERT INTO application_messages(application_id,author,body,created) VALUES(?,?,?,?)")
      .bind(id, text(env.REPORT_OWNER_NAME || "Owner", 32), body, now).run();
    return json({ ok: true }, 201);
  }
  if (parts[1] === "status" && m === "POST") {
    const d = await parseBody(req);
    if (!d || !APP_STATUSES.includes(d.status)) return fail(400, "Choose a valid application decision.");
    if (d.status === "accepted" && application.status !== "accepted") {
      const openings = await applicationOpenings(env);
      if (!openings[application.role] || openings[application.role].available < 1) return fail(409, "That role has no remaining slots. Update the staff roster before accepting another application.");
    }
    await env.DB.prepare("UPDATE staff_applications SET status=? WHERE id=?").bind(d.status, id).run();
    return json({ ok: true, openings: await applicationOpenings(env) });
  }
  return fail(404, "Not found");
}

/* ---------- independent CrownPVP service project intake ---------- */
async function serviceTicketsRoutes(req, env, parts) {
  const now = Date.now(), method = req.method;
  if (method === "POST" && parts.length === 0) {
    const d = await parseBody(req);
    if (!d) return fail(400, "We could not read your project brief. Please try again.");
    // Quiet honeypot for basic bot filtering.
    if (text(d.website, 120)) return json({ ok: true, id: "received" }, 201);
    const name = text(d.name, 64), email = text(d.email, 120).toLowerCase();
    const discord = text(d.discord, 64), service = text(d.service, 80), budget = text(d.budget, 40);
    const timeline = text(d.timeline, 40), brief = text(d.brief, 4000), reference = text(d.reference, 500);
    if (name.length < 2) return fail(400, "Please enter your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(400, "Enter a valid email address.");
    const allowed = ["Website design & development","Full-stack application","UI / UX redesign","Website maintenance","Minecraft resource pack","Minecraft plugin","Minecraft map or build","Minecraft website","Something custom"];
    if (!allowed.includes(service)) return fail(400, "Choose the service you need.");
    if (brief.length < 30) return fail(400, "Please add at least 30 characters to your project brief.");
    if (reference) { try { const u = new URL(reference); if (!["http:","https:"].includes(u.protocol)) throw new Error(); } catch { return fail(400, "Reference link must start with http:// or https://."); } }
    const ip = req.headers.get("cf-connecting-ip") || "unknown";
    const ipHash = b64u(await crypto.subtle.digest("SHA-256", te.encode(ip)));
    const recent = await env.DB.prepare("SELECT COUNT(*) c FROM service_project_tickets WHERE ip_hash=? AND created>?").bind(ipHash, now - 3600000).first();
    if ((recent?.c || 0) >= 5) return fail(429, "Too many project requests from this connection. Please try again later.");
    const result = await env.DB.prepare(`INSERT INTO service_project_tickets(name,email,discord,service,budget,timeline,brief,reference,created,status,ip_hash)
      VALUES(?,?,?,?,?,?,?,?,?,'new',?)`).bind(name,email,discord,service,budget,timeline,brief,reference,now,ipHash).run();
    const id = result.meta.last_row_id, ref = `CP-SV-${String(id).padStart(5,"0")}`;
    if (env.SERVICE_TICKET_WEBHOOK) {
      const safe = v => String(v || "").replace(/[*_`~|@]/g, "").slice(0, 500);
      const notice = `**New CrownPVP project request · ${ref}**\n**Name:** ${safe(name)}\n**Email:** ${safe(email)}\n**Discord:** ${safe(discord) || "Not provided"}\n**Service:** ${safe(service)}\n**Budget:** ${safe(budget)}\n**Timeline:** ${safe(timeline)}\n**Brief:** ${safe(brief)}`;
      try { await fetch(env.SERVICE_TICKET_WEBHOOK, { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({allowed_mentions:{parse:[]},content:notice}) }); } catch { /* Stored request remains valid if notifications fail. */ }
    }
    return json({ ok:true, reference:ref }, 201);
  }
  if (method === "GET" && parts.length === 0) {
    if (!ownerKeyOK(req, env)) return fail(403, "Owner access only.");
    const rows = (await env.DB.prepare("SELECT id,name,email,discord,service,budget,timeline,brief,reference,created,status FROM service_project_tickets ORDER BY created DESC LIMIT 200").all()).results || [];
    return json({ items: rows.map(r => ({...r, reference_id:`CP-SV-${String(r.id).padStart(5,"0")}`})) });
  }
  return fail(404, "Not found");
}

/* ---------- player stats (gold, activity) ---------- */
async function syncStats(req, env) {
  const given = req.headers.get("authorization") || "";
  if (!env.SYNC_TOKEN || !safeEq(given, `Bearer ${env.SYNC_TOKEN}`)) return fail(401, "Unauthorized");
  let data; try { data = await req.json(); } catch { return fail(400, "Invalid JSON"); }
  const list = Array.isArray(data?.players) ? data.players.slice(0, 500) : [];
  const stmt = env.DB.prepare(`INSERT INTO player_stats(uuid,name,gold,kills,deaths,playtime,last_seen,updated) VALUES(?,?,?,?,?,?,?,?)
    ON CONFLICT(uuid) DO UPDATE SET name=excluded.name,gold=excluded.gold,kills=excluded.kills,deaths=excluded.deaths,playtime=excluded.playtime,last_seen=excluded.last_seen,updated=excluded.updated`);
  const now = Date.now(), ops = [];
  for (const p of list) {
    if (!text(p?.name, 16) || !dash(p.uuid)) continue;
    ops.push(stmt.bind(dash(p.uuid), text(p.name, 16), Math.max(0, int(p.gold)), Math.max(0, int(p.kills)), Math.max(0, int(p.deaths)), Math.max(0, int(p.playtime)), Math.max(0, int(p.last_seen)), now));
  }
  for (let i = 0; i < ops.length; i += 50) await env.DB.batch(ops.slice(i, i + 50));
  return json({ ok: true, count: ops.length });
}
async function statsGet(env, url, parts) {
  const cols = "uuid,name,gold,kills,deaths,playtime,last_seen,updated";
  if (parts[0] === "top") {
    const n = Math.min(25, Math.max(1, int(url.searchParams.get("limit")) || 10));
    const rows = (await env.DB.prepare(`SELECT ${cols} FROM player_stats WHERE gold>0 ORDER BY gold DESC LIMIT ?`).bind(n).all()).results || [];
    return json({ items: rows });
  }
  const name = text(decodeURIComponent(parts[0] || ""), 16);
  if (!/^\w{3,16}$/.test(name)) return fail(400, "Enter a valid Minecraft username.");
  const row = await env.DB.prepare(`SELECT ${cols} FROM player_stats WHERE name=? COLLATE NOCASE`).bind(name).first();
  if (!row) return fail(404, "No stats recorded for that player yet.");
  const above = await env.DB.prepare("SELECT COUNT(*) c FROM player_stats WHERE gold>?").bind(row.gold).first();
  return json({ ...row, rank: (above?.c || 0) + 1 });
}

/* ---------- private account trace ---------- */
const validTraceUuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const traceUuid = value => dash(text(value, 40));
const normalizeTraceAddress = address => {
  if (address.includes(":")) {
    try { return new URL(`http://[${address}]/`).hostname.slice(1, -1).toLowerCase(); } catch { return null; }
  }
  const octets = address.split(".");
  return octets.length === 4 && octets.every(part => /^(0|[1-9]\d{0,2})$/.test(part) && Number(part) <= 255)
    ? octets.map(Number).join(".") : null;
};

async function traceSync(req, env) {
  const given = req.headers.get("authorization") || "";
  if (!env.SYNC_TOKEN || !safeEq(given, `Bearer ${env.SYNC_TOKEN}`)) return fail(401, "Unauthorized.");
  if (!env.TRACE_FINGERPRINT_SECRET) return fail(503, "Trace fingerprinting is not configured.");
  const data = await parseBody(req);
  if (!data || !Array.isArray(data.records) || data.records.length > 500) return fail(400, "Provide up to 500 authorized player records.");
  const now = Date.now(), records = data.records, ops = [];
  let loginCount = 0;
  for (const record of records) {
    const uuid = traceUuid(record?.uuid), username = text(record?.name, 16);
    if (!validTraceUuid(uuid) || !/^[A-Za-z0-9_]{3,16}$/.test(username)) return fail(400, "Every record needs a valid Minecraft UUID and username.");
    const logins = Array.isArray(record.logins) ? record.logins : [];
    if (logins.length > 100 || loginCount + logins.length > 2000) return fail(400, "A sync may contain at most 2,000 login events.");
    loginCount += logins.length;
    const times = logins.map(item => Number(item?.at));
    if (times.some(at => !Number.isSafeInteger(at) || at < 0 || at > now + 300000)) return fail(400, "Login event timestamps must be Unix milliseconds and cannot be in the future.");
    const first = times.length ? Math.min(...times) : 0, last = times.length ? Math.max(...times) : 0;
    ops.push(env.DB.prepare(`INSERT INTO mc_trace_accounts(uuid,username,first_seen,last_seen,updated) VALUES(?,?,?,?,?)
      ON CONFLICT(uuid) DO UPDATE SET username=excluded.username,
      first_seen=CASE WHEN mc_trace_accounts.first_seen=0 THEN excluded.first_seen WHEN excluded.first_seen=0 THEN mc_trace_accounts.first_seen ELSE MIN(mc_trace_accounts.first_seen,excluded.first_seen) END,
      last_seen=MAX(mc_trace_accounts.last_seen,excluded.last_seen),updated=excluded.updated`).bind(uuid, username, first, last, now));
    for (const item of logins) {
      let fingerprint = null;
      if (item.ip !== undefined && item.ip !== null && String(item.ip).trim()) {
        const address = String(item.ip).trim();
        const normalizedAddress = address.length <= 64 ? normalizeTraceAddress(address) : null;
        if (!normalizedAddress) return fail(400, "A login address is malformed.");
        fingerprint = await hmac(env.TRACE_FINGERPRINT_SECRET, `trace-ip:${normalizedAddress}`);
      }
      const eventKey = await hmac(env.TRACE_FINGERPRINT_SECRET, `trace-event:${uuid}:${Number(item.at)}:${fingerprint || ""}`);
      ops.push(env.DB.prepare("INSERT OR IGNORE INTO mc_trace_logins(event_key,uuid,occurred,ip_fingerprint) VALUES(?,?,?,?)")
        .bind(eventKey, uuid, Number(item.at), fingerprint));
    }
  }
  for (let i = 0; i < ops.length; i += 50) await env.DB.batch(ops.slice(i, i + 50));
  return json({ ok: true, accounts: records.length, loginEvents: loginCount, ipStorage: "keyed fingerprints only" }, 200);
}

async function traceRoutes(req, env, parts, url) {
  if (!ownerKeyOK(req, env)) return fail(403, "Owner access only.");
  const method = req.method, now = Date.now();
  if (parts.length === 0 && method === "GET") {
    const [accounts, logins, conversations, notes, latest] = await Promise.all([
      env.DB.prepare("SELECT COUNT(*) AS count FROM mc_trace_accounts").first(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM mc_trace_logins").first(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM mc_trace_conversations").first(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM mc_trace_notes").first(),
      env.DB.prepare("SELECT MAX(occurred) AS at FROM mc_trace_logins").first()
    ]);
    return json({ accounts: accounts?.count || 0, logins: logins?.count || 0, conversations: conversations?.count || 0,
      notes: notes?.count || 0, latest: latest?.at || null, server: "play.crownpvp.eu" });
  }
  if (parts[0] === "search" && method === "GET") {
    const query = text(url.searchParams.get("q"), 40);
    if (!query || query.length < 3) return fail(400, "Enter a username or UUID.");
    const uuidQuery = traceUuid(query), byUuid = validTraceUuid(uuidQuery);
    if (!byUuid && !/^[A-Za-z0-9_]{3,16}$/.test(query)) return fail(400, "Enter a valid Minecraft username or UUID.");
    let account = byUuid
      ? await env.DB.prepare("SELECT uuid,username,first_seen,last_seen,updated FROM mc_trace_accounts WHERE uuid=?").bind(uuidQuery).first()
      : await env.DB.prepare("SELECT uuid,username,first_seen,last_seen,updated FROM mc_trace_accounts WHERE username=? COLLATE NOCASE").bind(query).first();
    if (!account) {
      account = byUuid
        ? await env.DB.prepare("SELECT uuid,name AS username,NULL AS first_seen,last_seen,updated FROM player_stats WHERE uuid=?").bind(uuidQuery).first()
        : await env.DB.prepare("SELECT uuid,name AS username,NULL AS first_seen,last_seen,updated FROM player_stats WHERE name=? COLLATE NOCASE").bind(query).first();
    }
    if (!account) return fail(404, "No authorized record was found for this player.");
    const uuid = traceUuid(account.uuid);
    const [logins, notes, conversations] = await Promise.all([
      env.DB.prepare("SELECT occurred,ip_fingerprint,source FROM mc_trace_logins WHERE uuid=? ORDER BY occurred DESC LIMIT 200").bind(uuid).all(),
      env.DB.prepare("SELECT id,author,body,created FROM mc_trace_notes WHERE uuid=? ORDER BY created DESC LIMIT 100").bind(uuid).all(),
      env.DB.prepare("SELECT id,author,body,evidence,created FROM mc_trace_conversations WHERE uuid=? ORDER BY created DESC LIMIT 100").bind(uuid).all()
    ]);
    const ownLogins = logins.results || [], fingerprints = [...new Set(ownLogins.map(row => row.ip_fingerprint).filter(Boolean))];
    let possibleAlts = [];
    if (fingerprints.length) {
      const marks = fingerprints.map(() => "?").join(",");
      const peers = (await env.DB.prepare(`SELECT a.uuid,a.username FROM mc_trace_accounts a
        WHERE a.uuid<>? AND a.uuid IN (SELECT uuid FROM mc_trace_logins WHERE ip_fingerprint IN (${marks}) GROUP BY uuid)
        ORDER BY a.username COLLATE NOCASE LIMIT 50`).bind(uuid, ...fingerprints).all()).results || [];
      if (peers.length) {
        const peerMarks = peers.map(() => "?").join(",");
        const peerRows = (await env.DB.prepare(`SELECT uuid,occurred,ip_fingerprint FROM mc_trace_logins
          WHERE uuid IN (${peerMarks}) AND occurred>=? ORDER BY occurred DESC LIMIT 3000`)
          .bind(...peers.map(p => p.uuid), now - 90 * DAY).all()).results || [];
        const rowsByPeer = new Map();
        for (const row of peerRows) {
          if (!rowsByPeer.has(row.uuid)) rowsByPeer.set(row.uuid, []);
          rowsByPeer.get(row.uuid).push(row);
        }
        const ownRecent = ownLogins.filter(row => row.occurred >= now - 90 * DAY);
        for (const peer of peers) {
          const matches = new Set();
          for (const a of ownRecent) for (const b of rowsByPeer.get(peer.uuid) || []) {
            if (a.ip_fingerprint && a.ip_fingerprint === b.ip_fingerprint &&
                Math.abs(a.occurred - b.occurred) <= 30 * 60 * 1000 &&
                new Date(a.occurred).toISOString().slice(0, 10) === new Date(b.occurred).toISOString().slice(0, 10)) {
              matches.add(new Date(a.occurred).toISOString().slice(0, 10));
            }
          }
          if (matches.size >= 3) possibleAlts.push({ uuid: peer.uuid, username: peer.username,
            confidence: matches.size >= 5 ? "MODERATE" : "LOW", matchingDays: matches.size,
            evidence: ["Repeated shared-network fingerprint", `${matches.size} separate days with logins within 30 minutes`],
            caution: "A possible lead only; household, campus, VPN, and shared-network use can explain overlap." });
        }
        possibleAlts.sort((a, b) => b.confidence - a.confidence);
        possibleAlts = possibleAlts.slice(0, 10);
      }
    }
    return json({ account: { uuid, username: account.username, firstSeen: account.first_seen || null,
      lastSeen: account.last_seen || null, updated: account.updated || null, ipAddress: null },
      logins: ownLogins.map(row => ({ occurred: row.occurred, networkFingerprint: row.ip_fingerprint ? "stored; address discarded" : null, source: row.source })),
      notes: notes.results || [], conversations: conversations.results || [], possibleAlts });
  }
  if ((parts[0] === "notes" || parts[0] === "conversations") && method === "POST") {
    const data = await parseBody(req), uuid = traceUuid(data?.uuid), body = text(data?.body, parts[0] === "notes" ? 3000 : 5000);
    if (!validTraceUuid(uuid)) return fail(400, "A valid player UUID is required.");
    if (!body) return fail(400, "Write a note or conversation record.");
    let account = await env.DB.prepare("SELECT uuid FROM mc_trace_accounts WHERE uuid=?").bind(uuid).first();
    if (!account) {
      account = await env.DB.prepare("SELECT uuid,name,last_seen FROM player_stats WHERE uuid=?").bind(uuid).first();
      if (account) {
        await env.DB.prepare(`INSERT OR IGNORE INTO mc_trace_accounts(uuid,username,first_seen,last_seen,updated)
          VALUES(?,?,0,?,?)`).bind(uuid, account.name, account.last_seen || 0, now).run();
      }
    }
    if (!account) return fail(404, "Import an authorized player record before adding linked records.");
    const author = text(data.author || env.REPORT_OWNER_NAME || "Administrator", 60);
    const created = Number(data.created) || now;
    if (!Number.isSafeInteger(created) || created > now + 300000) return fail(400, "The record timestamp is invalid.");
    if (parts[0] === "notes") {
      const result = await env.DB.prepare("INSERT INTO mc_trace_notes(uuid,author,body,created) VALUES(?,?,?,?)")
        .bind(uuid, author, body, created).run();
      return json({ ok: true, id: result.meta.last_row_id }, 201);
    }
    const evidence = text(data.evidence, 1000);
    const result = await env.DB.prepare("INSERT INTO mc_trace_conversations(uuid,author,body,evidence,created) VALUES(?,?,?,?,?)")
      .bind(uuid, author, body, evidence, created).run();
    return json({ ok: true, id: result.meta.last_row_id }, 201);
  }
  return fail(404, "Not found.");
}

/* ---------- public Minecraft profile lookup ---------- */
async function publicProfileGet(url) {
  const username = text(url.searchParams.get("username"), 16);
  if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) return fail(400, "Enter a valid Minecraft username.");
  let response;
  try {
    response = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`, {
      headers: { accept: "application/json", "user-agent": "CrownPVP public profile lookup" }
    });
  } catch {
    return fail(502, "The public profile service could not be reached.");
  }
  if (response.status === 204 || response.status === 404) return fail(404, "No public Minecraft profile was found.");
  if (response.status === 429) return fail(503, "The public profile service is rate-limiting requests. Try again later.");
  if (!response.ok) return fail(502, "The public profile service returned an error.");
  let profile;
  try { profile = await response.json(); } catch { return fail(502, "The public profile service returned invalid data."); }
  const id = String(profile?.id || "");
  if (!/^[0-9a-f]{32}$/i.test(id) || !/^[A-Za-z0-9_]{3,16}$/.test(String(profile?.name || ""))) {
    return fail(502, "The public profile service returned an invalid profile.");
  }
  const uuid = id.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5").toLowerCase();
  return json({ username: profile.name, uuid, source: "Mojang public profile API" });
}

/* ---------- Tebex checkout (headless API) ---------- */
async function checkout(req, env, user) {
  if (!env.TEBEX_PUBLIC_TOKEN) return fail(503, "Checkout is not configured yet.", { code: "checkout_not_configured" });
  let d; try { d = await req.json(); } catch { return fail(400, "Invalid request"); }
  const items = (Array.isArray(d.items) ? d.items : []).slice(0, 20).map(i => ({ id: String(i.id || "").replace(/\D/g, "").slice(0, 12), qty: Math.min(10, Math.max(1, int(i.qty))) })).filter(i => i.id);
  if (!items.length) return fail(400, "Your cart is empty.");
  const origin = new URL(req.url).origin, base = "https://headless.tebex.io/api";
  const { r, d: basket } = await post(`${base}/accounts/${encodeURIComponent(env.TEBEX_PUBLIC_TOKEN)}/baskets`, {
    complete_url: `${origin}/store.html?paid=1`, cancel_url: `${origin}/store.html`, complete_auto_redirect: true,
    username: user.name, ip_address: req.headers.get("cf-connecting-ip") || undefined, custom: { uuid: user.uuid } });
  const ident = basket?.data?.ident;
  if (!r.ok || !ident) return fail(502, "Tebex did not accept the checkout. Please try again or ask on Discord.");
  for (const i of items) {
    const res = await post(`${base}/baskets/${encodeURIComponent(ident)}/packages`, { package_id: i.id, quantity: i.qty });
    if (!res.r.ok) return fail(502, `Tebex could not add package ${i.id}. Check the package ID in js/config.js.`);
  }
  const link = basket.data.links?.checkout;
  return link && /^(https:\/\/|http:\/\/localhost[:\/])/.test(link) ? json({ url: link }) : fail(502, "Tebex did not return a checkout link.");
}

/* ---------- router ---------- */
export async function handle(request, env, ctx = {}) {
  const url = new URL(request.url), m = request.method;
  const parts = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean), route = parts.shift() || "";
  const secure = url.protocol === "https:";
  try {
    if (m !== "GET" && m !== "HEAD" && route !== "punishments" && route !== "stats" &&
        !(route === "trace" && parts[0] === "sync")) {
      const origin = request.headers.get("origin");
      if ((origin && origin !== url.origin) || request.headers.get("x-requested-with") !== "crown") return fail(403, "Blocked request");
    }
    if (route === "punishments" && parts[0] === "sync" && m === "POST") { if (!env.DB) return fail(503, "Database not configured."); return syncPunishments(request, env); }
    if (route === "stats" && parts[0] === "sync" && m === "POST") { if (!env.DB) return fail(503, "Database not configured."); return syncStats(request, env); }
    if (route === "trace" && parts[0] === "sync" && m === "POST") { if (!env.DB) return fail(503, "Database not configured."); return traceSync(request, env); }
    if (route === "auth") {
      const ready = env.MS_CLIENT_ID && env.MS_CLIENT_SECRET && env.SESSION_SECRET;
      if (parts[0] === "login" && m === "GET") {
        if (!ready) return redirect("/account.html?error=not_configured");
        const ret = url.searchParams.get("return") || "/account.html";
        const state = b64u(crypto.getRandomValues(new Uint8Array(24)));
        const jar = await sign(env.SESSION_SECRET, { s: state, r: /^\/[^/\\]/.test(ret) ? ret : "/account.html", exp: Date.now() + 600000 });
        const q = new URLSearchParams({ client_id: env.MS_CLIENT_ID, response_type: "code", redirect_uri: `${url.origin}/api/auth/callback`, response_mode: "query", scope: "XboxLive.signin", state, prompt: "select_account" });
        return redirect(`https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?${q}`, [cookie("cp_oauth", jar, 600, secure)]);
      }
      if (parts[0] === "callback" && m === "GET") {
        const clear = cookie("cp_oauth", "", 0, secure), jar = await unsign(env.SESSION_SECRET, cookies(request).cp_oauth);
        const code = url.searchParams.get("code");
        if (!ready || !jar || !code || !safeEq(String(url.searchParams.get("state") || ""), jar.s)) return redirect("/account.html?error=" + (url.searchParams.get("error") ? "cancelled" : "failed"), [clear]);
        try {
          const tr = await fetch("https://login.microsoftonline.com/consumers/oauth2/v2.0/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ client_id: env.MS_CLIENT_ID, client_secret: env.MS_CLIENT_SECRET, code, grant_type: "authorization_code", redirect_uri: `${url.origin}/api/auth/callback`, scope: "XboxLive.signin" }) });
          const tok = await tr.json();
          if (!tr.ok || !tok.access_token) throw new AuthError("failed");
          const prof = await minecraftProfile(tok.access_token);
          const session = await sign(env.SESSION_SECRET, { u: prof.uuid, n: prof.name, exp: Date.now() + 7 * DAY });
          return redirect(jar.r, [cookie("cp_session", session, 7 * 86400, secure), clear]);
        } catch (e) { return redirect("/account.html?error=" + (e.code || "failed"), [clear]); }
      }
      if (parts[0] === "logout" && m === "POST") return json({ ok: true }, 200, { "set-cookie": cookie("cp_session", "", 0, secure) });
      return fail(404, "Not found");
    }
    if (route === "health" && (m === "GET" || m === "HEAD")) {
      let db = false, forms = false;
      if (env.DB) {
        try { await env.DB.prepare("SELECT 1 AS ok").first(); db = true; await env.DB.prepare("SELECT COUNT(*) c FROM reports").first(); await env.DB.prepare("SELECT COUNT(*) c FROM staff_applications").first(); forms = true; } catch { /* tables or binding missing */ }
      }
      return json({ ok: true, service: "crownpvp-api", database: db, forms, ownerKey: !!env.REPORT_OWNER_KEY, syncToken: !!env.SYNC_TOKEN, checkout: !!env.TEBEX_PUBLIC_TOKEN,
        hint: forms ? "Everything is ready." : db ? "Database is bound but schema.sql has not been applied." : "No D1 database is bound as DB. See README.md.", time: Date.now() });
    }
    if (route === "public-profile" && m === "GET") return publicProfileGet(url);
    const user = await getUser(request, env);
    if (route === "me") return json({ user, login: !!(env.MS_CLIENT_ID && env.MS_CLIENT_SECRET && env.SESSION_SECRET), checkout: !!env.TEBEX_PUBLIC_TOKEN });
    if (!env.DB && route !== "checkout") return fail(503, "Database not configured.");
    if (route === "trace") return traceRoutes(request, env, parts, url);
    if (route === "stats" && m === "GET") return statsGet(env, url, parts);
    if (route === "service-tickets") return serviceTicketsRoutes(request, env, parts);
    if (route === "reports") return reportsRoutes(request, env, parts);
    if (route === "applications") return applicationsRoutes(request, env, parts);
    if (route === "punishments" && m === "GET") return listPunishments(env, url);
    if (route === "account" && m === "GET") {
      if (!user) return fail(401, "Sign in with Microsoft first.");
      const now = Date.now();
      const rows = (await env.DB.prepare(`SELECT ${P_COLS} FROM punishments WHERE uuid=? ORDER BY time DESC LIMIT 50`).bind(user.uuid).all()).results || [];
      const ap = (await env.DB.prepare(`${A_SEL} WHERE a.uuid=? ORDER BY a.updated DESC LIMIT 50`).bind(user.uuid).all()).results || [];
      return json({ user, punishments: rows.map(r => shape(r, now)), appeals: ap.map(r => appealRow(r, now)) });
    }
    if (route === "appeals") return appealsRoutes(request, env, ctx, user, parts, url);
    if (route === "checkout" && m === "POST") return user ? checkout(request, env, user) : fail(401, "Sign in with Microsoft first.");
    return fail(404, "Not found");
  } catch (e) {
    console.error("api error", e);
    return fail(500, "Something went wrong on our side.");
  }
}
