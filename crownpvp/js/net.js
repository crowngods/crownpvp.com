/* CrownPVP shared helpers for reports, appeals, the staff dashboard and the team page.
   Security note: nothing here grants access. Every permission is enforced by the database (supabase/network-upgrade.sql).
   The checks in the browser only decide what to show. */
(() => {
const CP = window.CP, C = window.CROWN, { esc, date } = CP;

const RANKS = {
  owner:     { name: "Owner",     color: "#f5c542", lv: 1 },
  coowner:   { name: "Co-Owner",  color: "#ff4d5e", lv: 2 },
  manager:   { name: "Manager",   color: "#ff8a3d", lv: 3 },
  admin:     { name: "Admin",     color: "#a78bfa", lv: 4 },
  developer: { name: "Developer", color: "#2dd4bf", lv: 5 },
  moderator: { name: "Moderator", color: "#60a5fa", lv: 6 },
  helper:    { name: "Helper",    color: "#4ade80", lv: 7 },
  media:     { name: "Media",     color: "#f472b6", lv: 8 }
};
const SHIELD = `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M12 2.5 4.5 5.4v5.6c0 4.6 3 8.4 7.5 10.5 4.5-2.1 7.5-5.9 7.5-10.5V5.4L12 2.5Z" fill="currentColor" opacity=".18" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="m8.8 12.2 2.2 2.2 4.2-4.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const rankName = r => RANKS[r]?.name || (r ? String(r) : "");
const badge = r => RANKS[r] ? `<span class="rbadge" style="--rc:${RANKS[r].color}">${SHIELD}${esc(RANKS[r].name)}</span>` : "";

const STATUS = {
  pending: ["Pending", "st-pending"], under_review: ["Under review", "st-review"],
  approved: ["Approved", "st-ok"], denied: ["Denied", "st-no"],
  reviewing: ["Reviewing", "st-review"], accepted: ["Accepted", "st-ok"] /* staff applications */
};
const DONE = ["approved", "accepted", "denied"], REVIEW = ["under_review", "reviewing"];
const pill = s => `<span class="spill ${(STATUS[s] || ["", ""])[1]}">${esc((STATUS[s] || [s])[0])}</span>`;
const statusName = s => (STATUS[s] || [s])[0];

/* The staff decision block. Reports use [Rank Name], appeals use <Rank Name> and a Status line.
   Staff applications use [Rank Name] and a Status line. */
function decision(kind, e) {
  if (!e.handled_by_name || ![...DONE, ...REVIEW].includes(e.status)) return "";
  const who = `${rankName(e.handled_by_rank)} ${e.handled_by_name}`.trim();
  const tag = kind === "appeal" ? `&lt;${esc(who)}&gt;` : `[${esc(who)}]`;
  const color = RANKS[e.handled_by_rank]?.color || "var(--gold)";
  const done = DONE.includes(e.status);
  return `<div class="decision ${e.status}"><div class="dline"><b class="dwho" style="color:${color}">${tag}</b>${e.decided_at ? `<time>${date(Date.parse(e.decided_at))}</time>` : ""}</div>
  ${(kind === "appeal" || kind === "application") && done ? `<div><span class="dk">Status:</span> <b class="dstat ${e.status}">${esc(e.status.toUpperCase())}</b></div>` : ""}
  ${done ? `<div><span class="dk">Reason:</span> <span class="dreason">${esc(e.decision_reason)}</span></div>` : `<div class="dmuted">Being reviewed by this staff member.</div>`}</div>`;
}

/* history timeline from case_events */
function timeline(events) {
  if (!events?.length) return "";
  return `<ol class="ktl">${events.map(v => {
    const label = !v.from_status ? "Submitted" : `${statusName(v.from_status)} → ${statusName(v.to_status)}`;
    const who = v.actor_rank ? `${esc(rankName(v.actor_rank))} ${esc(v.actor_name)}` : esc(v.actor_name);
    return `<li><i class="${(STATUS[v.to_status] || ["", ""])[1]}"></i><div><b>${esc(label)}</b> <span class="tw">by ${who} · ${date(Date.parse(v.created_at))}</span>${v.reason ? `<p>${esc(v.reason)}</p>` : ""}</div></li>`;
  }).join("")}</ol>`;
}

/* ---------- friendly errors (database messages are written to be readable) ---------- */
function friendly(err, fallback = "Something went wrong. Please try again.") {
  const m = String(err?.message || "");
  if (/Failed to fetch|NetworkError|network/i.test(m)) return "Could not reach the server. Check your connection and try again.";
  if (/JWT|not authenticated|Sign in first/i.test(m)) return "Your session expired. Please sign in again.";
  if (/permission denied|row-level security|violates/i.test(m) && !/Write a reason/i.test(m)) return "You do not have permission to do that.";
  if (/function .* does not exist|schema cache|relation .* does not exist/i.test(m)) return "This feature is not set up yet. Ask the owner to run the SQL scripts in the supabase folder (network-upgrade.sql, then staff-applications.sql).";
  return m && m.length < 200 && !/[{}]|SQLSTATE|pg_|public\./.test(m) ? m : fallback;
}

/* ---------- evidence ---------- */
const MIME = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "video/mp4": "mp4", "video/webm": "webm" };
const MAX_FILES = 5, MAX_BYTES = 25 * 1024 * 1024;
function checkFiles(files) {
  if (files.length > MAX_FILES) return `You can upload up to ${MAX_FILES} files.`;
  for (const f of files) {
    if (!MIME[f.type]) return `"${f.name}" is not allowed. Use PNG, JPG, WEBP, GIF, MP4 or WEBM.`;
    if (f.size > MAX_BYTES) return `"${f.name}" is larger than 25 MB.`;
    if (f.size < 1) return `"${f.name}" is empty.`;
  }
  return "";
}
/* Parses a textarea (one https link per line). Returns { links } or { error }. */
function parseLinks(text) {
  const links = [...new Set(String(text || "").split(/\s+/).map(s => s.trim()).filter(Boolean))];
  if (links.length > 5) return { error: "Add at most 5 evidence links." };
  for (const l of links) {
    let u; try { u = new URL(l); } catch { return { error: `"${l.slice(0, 60)}" is not a valid link.` }; }
    if (u.protocol !== "https:" || l.length > 480) return { error: "Evidence links must start with https:// and be under 480 characters." };
  }
  return { links };
}
async function uploadFiles(sb, uid, files, onProgress) {
  const paths = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i], rnd = crypto.getRandomValues(new Uint32Array(2)).join("");
    const path = `${uid}/${Date.now()}-${rnd}.${MIME[f.type]}`; // name never comes from the user
    onProgress?.(i + 1, files.length);
    const { error } = await sb.storage.from("evidence").upload(path, f, { contentType: f.type, upsert: false });
    if (error) throw new Error(`Could not upload "${f.name}". ${/size|exceed|large/i.test(error.message) ? "It is too large." : "Please try again."}`);
    paths.push(path);
  }
  return paths;
}
/* Evidence for a case. Files are private: they are loaded through short-lived signed links. */
async function evidenceHtml(sb, row) {
  const links = row.evidence_links || [], files = row.evidence_files || [];
  if (!links.length && !files.length) return `<p class="dmuted">No evidence attached.</p>`;
  let signed = {};
  if (files.length) {
    try { const { data } = await sb.storage.from("evidence").createSignedUrls(files, 3600); (data || []).forEach(d => { if (d.signedUrl) signed[d.path] = d.signedUrl; }); } catch { /* shown as unavailable */ }
  }
  const lk = links.map(l => `<li><a href="${esc(l)}" target="_blank" rel="noopener noreferrer nofollow">${esc(l)}</a></li>`).join("");
  const fl = files.map(p => {
    const u = signed[p], ext = p.split(".").pop();
    if (!u) return `<li class="dmuted">File unavailable</li>`;
    return /^(mp4|webm)$/.test(ext) ? `<li class="evf"><video src="${esc(u)}" controls preload="metadata"></video></li>`
      : `<li class="evf"><a href="${esc(u)}" target="_blank" rel="noopener noreferrer"><img src="${esc(u)}" alt="Uploaded evidence" loading="lazy"></a></li>`;
  }).join("");
  return `<ul class="evl">${lk}</ul><ul class="evg">${fl}</ul>`;
}

/* ---------- LiteBans data (static JSON written by the GitHub Action) ---------- */
const punCache = {};
async function punishments(type) {
  const base = C.punishmentsData; if (!base) throw new Error("Punishment data is not configured.");
  if (!punCache[type]) {
    const r = await fetch(`${base}/${type}.json`, { cache: "no-cache" });
    if (!r.ok) throw new Error("Punishment data has not been published yet.");
    const d = await r.json(); if (!Array.isArray(d)) throw new Error("Punishment data is invalid.");
    punCache[type] = d.map(p => ({ ...p, type }));
  }
  return punCache[type];
}
async function findPunishment(type, id) {
  if (!["ban", "mute"].includes(type) || !(id > 0)) return null;
  return (await punishments(type)).find(p => Number(p.id) === Number(id)) || null;
}
function punishmentHtml(p) {
  const perm = p.until <= 0, live = p.active && !p.removed_by && (perm || p.until > Date.now());
  return `<dl class="kv"><dt>Player</dt><dd>${esc(p.name)}</dd><dt>Type</dt><dd>${esc(p.type)} #${p.id}</dd><dt>Reason</dt><dd>${esc(CP.clean(p.reason)) || "<i>No reason given</i>"}</dd><dt>Staff</dt><dd>${esc(p.staff)}</dd><dt>Date</dt><dd>${date(p.time)}</dd><dt>Expires</dt><dd>${perm ? "Never (permanent)" : date(p.until)}</dd><dt>Status</dt><dd>${p.removed_by ? `Removed by ${esc(p.removed_by)}` : live ? "Active" : "Expired"}</dd></dl>`;
}

/* Decision history for one case (report, appeal or staff application). */
async function history(sb, kind, row) {
  const tl = await sb.from("case_events").select("actor_name,actor_rank,from_status,to_status,reason,created_at").eq("kind", kind).eq("case_id", row.id).order("created_at", { ascending: true });
  return `<h4 class="xh">History</h4>${tl.error ? `<p class="dmuted">History is unavailable.</p>` : timeline(tl.data) || `<p class="dmuted">No history yet.</p>`}`;
}
/* Evidence + decision history for one case, loaded when a card is opened. */
async function extras(sb, kind, row) {
  const [ev, hist] = await Promise.all([evidenceHtml(sb, row), history(sb, kind, row)]);
  return `<h4 class="xh">Evidence</h4>${ev}${hist}`;
}

/* ---------- staff applications ---------- */
const ROLE_NAMES = { helper: "Helper", moderator: "Moderator", admin: "Admin", media: "Media" };
const roleName = r => ROLE_NAMES[r] || (r ? String(r) : "");
/* Every answer of an application, shown to staff in the dashboard and to the applicant on the staff page. */
function applicationHtml(r) {
  const q = (title, text) => `<div class="qa"><h4 class="xh">${esc(title)}</h4><p class="pre">${esc(text) || "<i>No answer</i>"}</p></div>`;
  return `<dl class="kv"><dt>Minecraft</dt><dd>${esc(r.mc_username)}</dd><dt>Discord</dt><dd>${esc(r.discord)}</dd><dt>Position</dt><dd>${esc(roleName(r.role))}</dd><dt>Age range</dt><dd>${esc(r.age_band)}</dd><dt>Time zone</dt><dd>${esc(r.timezone)}</dd><dt>Weekly hours</dt><dd>${esc(r.availability)}</dd><dt>Microphone</dt><dd>${esc(r.mic_status)}</dd><dt>Can record</dt><dd>${esc(r.can_record)}</dd><dt>Punishments</dt><dd>${esc(r.punishment_history)}</dd></dl>
  ${q("Previous staff experience and plugins", r.experience)}${q("1 · Hacked clients and anticheat", r.q_cheats)}${q("2 · OpFactions and raid disputes", r.q_factions)}${q("3 · Staff integrity and friends", r.q_integrity)}${q("4 · Why CrownPVP", r.motivation)}`;
}

/* ---------- access info for the signed-in person ---------- */
async function access(auth) {
  if (!auth?.user) return null;
  if (auth.access !== undefined && auth._accessFor === auth.user.id) return auth.access;
  let a = null; try { const { data } = await auth.sb.rpc("my_access"); a = data || null; } catch { /* not set up */ }
  auth.access = a; auth._accessFor = auth.user.id; return a;
}
const can = (a, p) => !!a?.perms?.includes(p);

const gate = (title, text, next) => `<div class="card gate"><h3>${esc(title)}</h3><p>${esc(text)}</p><p style="margin-top:18px"><a class="btn" style="width:auto" href="login.html?next=${esc(next)}">Sign in or create an account</a></p></div>`;
const unavailable = `<div class="card gate"><h3>This feature is not available right now</h3><p>Accounts are not connected yet. Please contact staff on Discord instead.</p><p style="margin-top:18px"><a class="btn" style="width:auto" data-discord>Open Discord</a></p></div>`;

CP.net = { RANKS, SHIELD, rankName, badge, pill, statusName, decision, timeline, friendly, checkFiles, parseLinks, uploadFiles, evidenceHtml, extras, history, roleName, applicationHtml, findPunishment, punishmentHtml, access, can, gate, unavailable, MAX_FILES };
})();
