/* CrownPVP player profile. Everything shown comes from real data:
   - join dates, last seen, playtime and punishments: JSON exported from the LiteBans database by litebans-sync/sync-litebans.py
   - website registration date: the account creation time in the website database
   Nothing is generated, estimated or filled in. If a value is not available, the page says so. */
(() => {
const { $, esc, date, head } = CP, C = window.CROWN, N = CP.net;
const TYPES = [["ban", "Ban"], ["mute", "Mute"], ["warn", "Warning"], ["kick", "Kick"]];
const base = C.punishmentsData || "";
let index = null, seq = 0;

const day = ms => ms ? new Date(ms).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : null;
function dur(ms) {
  const m = Math.round(ms / 60000); if (m < 60) return `${Math.max(1, m)} minute${m === 1 ? "" : "s"}`;
  const h = Math.round(m / 60); if (h < 48) return `${h} hour${h === 1 ? "" : "s"}`;
  const d = Math.round(h / 24); if (d < 60) return `${d} days`;
  const mo = Math.round(d / 30.44); return mo < 24 ? `${mo} months` : `${(d / 365.25).toFixed(1).replace(/\.0$/, "")} years`;
}
const getJson = async f => { const r = await fetch(`${base}/${f}`, { cache: "no-cache" }); if (!r.ok) throw new Error("Player data has not been published yet. Please check back in a few minutes."); const d = await r.json(); return d; };
async function loadIndex() {
  if (index) return index;
  try { const d = await getJson("players.json"); index = { list: Array.isArray(d.players) ? d.players : [], playtime: !!d.playtime, updated: d.updated || 0, ok: true }; }
  catch { index = { list: [], playtime: false, updated: 0, ok: false }; }
  return index;
}
const row = (l, v, cls = "") => `<div class="pstat ${cls}"><span>${l}</span><b>${v}</b></div>`;
const na = t => `<b class="na">${t}</b>`;

function status(all, now) {
  const live = all.filter(p => (p.type === "ban" || p.type === "mute") && p.active && !p.removed_by && (p.until <= 0 || p.until > now));
  const ban = live.find(p => p.type === "ban"), mute = live.find(p => p.type === "mute");
  if (!ban && !mute) return { cls: "ok", title: "Good standing", text: "No active bans or mutes.", items: [] };
  return { cls: ban ? "bad" : "warn", title: ban ? "Currently banned" : "Currently muted", text: "", items: [ban, mute].filter(Boolean) };
}

function view(name, rec, all, site, idx) {
  const now = Date.now(), uuid = rec?.[0] || all[0]?.uuid, display = rec?.[1] || all[0]?.name || name;
  const cnt = t => all.filter(p => p.type === t).length, st = status(all, now);
  const sorted = [...all].sort((a, b) => b.time - a.time || b.id - a.id);
  const first = rec?.[2] ? day(rec[2]) : null, last = rec?.[3] ? day(rec[3]) : null;
  const pt = idx.playtime && rec?.[4] != null ? `${Math.floor(rec[4] / 3600).toLocaleString("en-US")} h ${Math.floor((rec[4] % 3600) / 60)} m` : null;
  const lab = Object.fromEntries(TYPES);
  return `<article class="pprof">
  <header class="pprof-h"><img class="pbody" src="https://mc-heads.net/body/${encodeURIComponent(uuid || display)}/160" alt="${esc(display)}'s skin" width="96" height="160" loading="lazy">
    <div class="pmain"><span class="keyebrow">PLAYER PROFILE</span><h2>${esc(display)}</h2><div class="pst ${st.cls}"><i></i>${esc(st.title)}</div>
    <div class="pact"><a class="btn ghost sm" href="support.html?player=${encodeURIComponent(display)}">Report this player</a>${st.items.map(p => `<a class="btn sm" href="appeals.html?type=${p.type}&id=${p.id}&name=${encodeURIComponent(display)}">Appeal this ${p.type}</a>`).join("")}</div></div></header>
  ${st.items.length ? `<div class="kcard cur">${st.items.map(p => `<div><b>${lab[p.type]} #${p.id}</b> &middot; ${esc(CP.clean(p.reason)) || "<i>No reason given</i>"}<br><small>By ${esc(p.staff)} on ${date(p.time)} &middot; ${p.until <= 0 ? "Permanent" : `Expires ${date(p.until)}`}</small></div>`).join("")}</div>` : ""}
  <div class="pgrid2">
    ${row("First join", first || na(rec ? "Not recorded" : "Not seen yet"))}
    ${row("Last seen", last || na(rec ? "Not recorded" : "Not seen yet"))}
    ${row("Total playtime", pt || na("Not tracked"))}
    ${row("Website registered", site?.registered_at ? day(Date.parse(site.registered_at)) : na(site === undefined ? "Unavailable" : "No website account"))}
  </div>
  <div class="pcounts">${TYPES.map(([k, l]) => `<div class="pc ${k}"><b>${cnt(k)}</b><span>${k === "warn" ? "Warnings" : l + "s"}</span></div>`).join("")}</div>
  <h3 class="ksub">Punishment history</h3>
  ${sorted.length ? `<div class="tbw"><table class="kt"><thead><tr><th>Type</th><th>Reason</th><th>Staff member</th><th>Date</th><th>Duration</th></tr></thead><tbody>${sorted.map(p => {
    const timed = p.type === "ban" || p.type === "mute", live = timed && p.active && !p.removed_by && (p.until <= 0 || p.until > now);
    return `<tr><td data-l="Type"><span class="tp ${p.type}">${lab[p.type]}</span>${timed ? `<small class="ps ${live ? "live" : ""}">${p.removed_by ? "Removed" : live ? "Active" : "Expired"}</small>` : ""}</td><td data-l="Reason" class="rs">${esc(CP.clean(p.reason)) || "<i>No reason given</i>"}</td><td data-l="Staff"><span class="u">${p.staff === "CONSOLE" ? "<b>CONSOLE</b>" : `<img src="${esc(head(p.staff, 22))}" alt="" width="22" height="22" loading="lazy"><b>${esc(p.staff)}</b>`}</span></td><td data-l="Date" class="dt">${date(p.time)}</td><td data-l="Duration">${timed ? (p.until <= 0 ? "Permanent" : dur(p.until - p.time)) : "N/A"}</td></tr>`;
  }).join("")}</tbody></table></div>` : `<div class="empty"><h3>Clean record</h3><p style="margin-top:8px">No punishments are recorded for ${esc(display)}.</p></div>`}
  <p class="dmuted src">Data from the CrownPVP server database${idx.updated ? `, updated ${CP.ago(idx.updated)}` : ""}. IP addresses and other private details are never published. Very old records may be missing if the export limit was reached.</p></article>`;
}

async function search(name) {
  const out = $("#pl-out"), my = ++seq;
  if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) { out.innerHTML = `<div class="empty"><h3>Invalid username</h3><p style="margin-top:8px">Minecraft usernames are 3 to 16 letters, numbers or underscores.</p></div>`; return; }
  history.replaceState(null, "", `${location.pathname}?name=${encodeURIComponent(name)}`);
  out.innerHTML = `<div class="skel"><i></i><i></i><i></i><i></i></div>`;
  try {
    if (!base) throw new Error("Punishment data is not configured for this site.");
    const [idx, ...lists] = await Promise.all([loadIndex(), ...TYPES.map(([t]) => getJson(`${t}.json`).then(l => l.map(p => ({ ...p, type: t }))))]);
    const lower = name.toLowerCase();
    let rec = idx.list.find(r => String(r[1]).toLowerCase() === lower) || null;
    const everything = lists.flat();
    let all = rec ? everything.filter(p => p.uuid === rec[0]) : everything.filter(p => String(p.name).toLowerCase() === lower);
    const auth = await CP.authReady; let site;
    if (auth) { try { const { data, error } = await auth.sb.rpc("public_player_site_info", { p_name: name }); if (!error) site = data?.[0] || null; } catch { /* unavailable */ } }
    if (my !== seq) return;
    if (!rec && !all.length) {
      out.innerHTML = `<div class="empty"><h3>No record of ${esc(name)}</h3><p style="margin-top:8px">${idx.ok ? "This player has not joined CrownPVP or has no recorded punishments." : "Player join data is not published yet, and this player has no recorded punishments."} Check the spelling and try again.</p>${site ? `<p style="margin-top:8px">They do have a CrownPVP website account (registered ${day(Date.parse(site.registered_at))}).</p>` : ""}</div>`;
      return;
    }
    out.innerHTML = view(name, rec, all, site, idx);
  } catch (e) { if (my === seq) out.innerHTML = `<div class="empty"><h3>Lookup unavailable</h3><p style="margin-top:8px">${esc(e.message || "Please try again in a moment.")}</p></div>`; }
}

const form = $("#pl-form"), input = $("#pl-name");
form.addEventListener("submit", e => { e.preventDefault(); search(input.value.trim()); });
const q = new URLSearchParams(location.search).get("name");
if (q) { input.value = q.slice(0, 16); search(input.value.trim()); }
})();
