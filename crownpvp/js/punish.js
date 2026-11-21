(() => {
const { $, $$, esc, api, date, clean, head, ready, pill, expires, loginUrl } = CP;
const params = new URLSearchParams(location.search), TYPES = ["ban", "kick", "mute", "warn"];
let type = TYPES.includes(params.get("type")) ? params.get("type") : "ban", q = (params.get("q") || "").slice(0, 16), page = 1, items = [], viewer = null, seq = 0;
const word = { ban: "ban", kick: "kick", mute: "mute", warn: "warning" };
const CONSOLE = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="1.5" y="3.5" width="21" height="17" rx="2.5" fill="#111" stroke="#ddd" stroke-width="1.6"/><path d="M6 9l3.5 3L6 15M12 15h6" fill="none" stroke="#ddd" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const who = n => n === "CONSOLE" ? `<span class="ci2">${CONSOLE}</span><b>CONSOLE</b>` : `<img src="${head(n, 24)}" alt="" width="24" height="24" loading="lazy"><b>${esc(n)}</b>`;
const appealable = p => (p.type === "ban" || p.type === "mute") && p.status === "active";

const sync = () => { const u = new URLSearchParams(); if (type !== "ban") u.set("type", type); if (q) u.set("q", q); history.replaceState(null, "", location.pathname + (u.size ? "?" + u : "")); };
const tabs = () => $$("[data-t]").forEach(b => { const on = b.dataset.t === type; b.classList.toggle("on", on); b.setAttribute("aria-selected", on); });

/* Static mode (GitHub Pages): punishments come from JSON files written by litebans-sync/sync-litebans.py --export.
   If CROWN.punishmentsData is empty, or the files are missing, the Cloudflare/dev API is used instead. */
const STATIC = (window.CROWN && CROWN.punishmentsData) || "", cache = {}, PER = 25;
const shapeP = (p, now) => { const permanent = p.until <= 0, live = p.type === "ban" || p.type === "mute";
  return { ...p, until: permanent ? 0 : p.until, permanent, status: !live ? "none" : p.removed_by ? "removed" : p.active && (permanent || p.until > now) ? "active" : "expired" }; };
async function fromStatic() {
  if (!cache[type]) {
    const r = await fetch(`${STATIC}/${type}.json`, { cache: "no-cache" });
    if (!r.ok) throw new Error("missing");
    const list = await r.json(); if (!Array.isArray(list)) throw new Error("bad");
    cache[type] = list.map(p => ({ ...p, type }));
  }
  const now = Date.now(), ql = q.toLowerCase(), all = ql ? cache[type].filter(p => p.name.toLowerCase().startsWith(ql)) : cache[type];
  const pages = Math.max(1, Math.ceil(all.length / PER)); page = Math.min(page, pages);
  return { total: all.length, page, pages, items: all.slice((page - 1) * PER, page * PER).map(p => shapeP(p, now)) };
}
async function getData() {
  const url = `/punishments?type=${type}&page=${page}&q=${encodeURIComponent(q)}`;
  if (!STATIC) return api(url);
  try { return await fromStatic(); }
  catch { try { return await api(url); } catch { throw new Error("Punishment data has not been published yet. Please check back in a few minutes."); } }
}

async function load() {
  const my = ++seq; tabs(); sync();
  $("#pt").innerHTML = `<div class="skel">${"<i></i>".repeat(6)}</div>`;
  try {
    const d = await getData();
    if (my !== seq) return;
    items = d.items; render(d);
  } catch (e) {
    if (my !== seq) return;
    $("#pt").innerHTML = `<div class="empty"><h3>The list is unavailable right now</h3><p style="margin-top:8px">${esc(e.message)}</p></div>`; $("#pg").innerHTML = "";
  }
}

function render(d) {
  const pl = type === "kick" ? "kicks" : type === "warn" ? "warnings" : type + "s";
  if (!items.length) { $("#pt").innerHTML = `<div class="empty"><h3>${q ? `No ${pl} found for "${esc(q)}"` : `No ${pl} yet`}</h3><p style="margin-top:8px">${q ? "Check the spelling or try another tab." : "Nothing has been recorded here."}</p></div>`; $("#pg").innerHTML = ""; return; }
  const head5 = type !== "kick";
  $("#pt").innerHTML = `<div class="tbw2"><table class="pt"><thead><tr><th>User</th><th>Staff</th><th>Reason</th><th>Date</th>${head5 ? "<th>Expires</th>" : ""}</tr></thead><tbody>${items.map((p, i) => `<tr tabindex="0" data-i="${i}">
    <td data-l="User"><span class="u"><img src="${head(p.uuid, 24)}" alt="" width="24" height="24" loading="lazy"><b>${esc(p.name)}</b></span></td>
    <td data-l="Staff"><span class="u">${who(p.staff)}</span></td>
    <td data-l="Reason" class="rs">${esc(clean(p.reason)) || "<i>No reason given</i>"}</td>
    <td data-l="Date" class="dt">${date(p.time)}</td>
    ${head5 ? `<td data-l="Expires" class="dt">${expires(p)}${pill(p)}</td>` : ""}</tr>`).join("")}</tbody></table></div>`;
  $("#pg").innerHTML = d.pages > 1 ? `<button data-p="-1" ${d.page <= 1 ? "disabled" : ""}>&larr; Previous</button><span>Page ${d.page} of ${d.pages} &middot; ${d.total.toLocaleString("en-US")} total</span><button data-p="1" ${d.page >= d.pages ? "disabled" : ""}>Next &rarr;</button>` : `<span>${d.total.toLocaleString("en-US")} ${d.total === 1 ? word[type] : (type === "warn" ? "warnings" : type + "s")}</span>`;
}

function detail(p) {
  let cta = "";
  if (appealable(p)) cta = `<a class="btn" href="appeals.html">Contact staff about this ${word[p.type]}</a>`;
  $("#pd").innerHTML = `<div class="dlg"><button class="ib x" data-x aria-label="Close">&times;</button>
    <div class="dtop"><img src="https://mc-heads.net/avatar/${encodeURIComponent(p.uuid)}/72" alt="" width="72" height="72"><div><small>${word[p.type].toUpperCase()}</small><h2>${esc(p.name)}</h2>${pill(p)}</div></div>
    <dl class="kv"><dt>Reason</dt><dd>${esc(clean(p.reason)) || "<i>No reason given</i>"}</dd><dt>Staff</dt><dd><span class="u">${who(p.staff)}</span></dd><dt>Date</dt><dd>${date(p.time)}</dd>${p.type === "ban" || p.type === "mute" ? `<dt>Expires</dt><dd>${expires(p)}</dd>` : ""}</dl>${cta}</div>`;
  $("#pd").showModal();
}

document.addEventListener("click", e => {
  const t = e.target.closest("[data-t]"); if (t) { type = t.dataset.t; page = 1; return load(); }
  const pg = e.target.closest("[data-p]"); if (pg) { page += Number(pg.dataset.p); load(); return scrollTo({ top: 0, behavior: "smooth" }); }
  const row = e.target.closest("tr[data-i]"); if (row) return detail(items[row.dataset.i]);
  if (e.target.closest("[data-x]") || e.target === $("#pd")) $("#pd").close();
});
document.addEventListener("keydown", e => { const row = e.target.closest?.("tr[data-i]"); if (row && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); detail(items[row.dataset.i]); } });
let deb; $("#pq").value = q; $("#pq").oninput = e => { clearTimeout(deb); deb = setTimeout(() => { q = e.target.value.trim(); page = 1; load(); }, 300); };

ready.then(s => { viewer = s.user; });
load();
})();
