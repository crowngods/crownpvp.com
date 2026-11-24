/* CrownPVP accounts + alerts. Loaded by app.js only when supabaseUrl and supabaseKey are set in config.js.
   Uses Supabase (email + password accounts). The public "anon" key is meant to be public; the database rules protect the data. */
(() => {
const C = window.CROWN, CP = window.CP, { $, esc, ago } = CP;
const sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
const BELL = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg>`;
/* only https links or plain relative page links are ever followed from an alert */
const safeLink = l => typeof l === "string" && /^(https:\/\/\S+|(?!\/\/)[A-Za-z0-9_.\/?=&#%-]+)$/.test(l) ? l : "";
const listeners = [];
const auth = { sb, user: null, profile: null, safeLink, on: fn => listeners.push(fn) };

async function loadProfile() {
  auth.profile = null;
  if (!auth.user) return;
  try {
    let r = await sb.from("profiles").select("username,is_staff,staff_rank,avatar_url,bio,username_changed").eq("id", auth.user.id).maybeSingle();
    if (r.error) r = await sb.from("profiles").select("username,is_staff,staff_rank").eq("id", auth.user.id).maybeSingle(); /* profile columns not added yet */
    auth.profile = r.data || null;
  } catch { /* offline */ }
}
auth.alerts = async (limit = 30) => {
  const { data, error } = await sb.from("notifications").select("id,title,body,link,read,created_at").order("created_at", { ascending: false }).limit(limit);
  if (error) throw error; return data || [];
};
auth.unread = async () => {
  const { count } = await sb.from("notifications").select("id", { count: "exact", head: true }).eq("read", false);
  return count || 0;
};
auth.markRead = async ids => { await sb.rpc("mark_notifications_read", { ids: ids || null }); };
auth.signOut = async () => { await sb.auth.signOut(); location.href = "index.html"; };

/* ---------- header widget: sign-in button, or bell + account menu ---------- */
const slot = () => $("#acct-slot");
function badge(n) { const b = $("#al-n"); if (!b) return; b.hidden = !n; b.textContent = n > 99 ? "99+" : n; }
async function refreshCount() { if (auth.user) { try { badge(await auth.unread()); } catch { /* ignore */ } } }
function panelHtml(items) {
  return `<div class="alh">Alerts</div><div class="alb">${items.length ? items.map(a => `<a class="ali${a.read ? "" : " un"}" href="${esc(safeLink(a.link) || "alerts.html")}" data-id="${a.id}"><b>${esc(a.title)}</b>${a.body ? `<span>${esc(a.body)}</span>` : ""}<time>${ago(Date.parse(a.created_at))}</time></a>`).join("") : `<p class="ale">You are all caught up.</p>`}</div>
  <div class="alf"><button type="button" data-al-readall>Mark all read</button><a href="alerts.html">Show all&hellip;</a></div>`;
}
const AV_OK = /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/avatars\//;
const avatarOf = (p, name) => (p?.avatar_url && AV_OK.test(p.avatar_url)) ? p.avatar_url : CP.head(name, 64);
function render() {
  const s = slot(); if (!s) return;
  if (!auth.user) { s.innerHTML = `<a class="btn acct-in" href="login.html">Sign in</a>`; return; }
  const name = auth.profile?.username || "Account";
  s.innerHTML = `<div class="acct"><button type="button" class="ib" id="al-btn" aria-label="Alerts" aria-expanded="false">${BELL}<span id="al-n" class="bd" hidden>0</span></button>
  <button type="button" class="ib av" id="av-btn" aria-label="Account menu" aria-expanded="false"><img src="${esc(avatarOf(auth.profile, name))}" alt="" width="28" height="28" style="border-radius:6px;object-fit:cover"></button>
  <div class="alp" id="al-panel" hidden></div>
  <div class="avm" id="av-menu" hidden><div class="avn"><small>Signed in as</small><b>${esc(name)}</b></div><a href="profile.html">My profile</a><a href="alerts.html">Alerts${auth.profile?.is_staff ? " &amp; staff tools" : ""}</a>${auth.profile?.staff_rank ? `<a href="dashboard.html">Staff dashboard</a>` : ""}<a href="support.html?tab=mine">My reports</a><a href="appeals.html?tab=mine">My appeals</a><button type="button" data-signout>Sign out</button></div></div>`;
  refreshCount();
}
function closeMenus() { ["al-panel", "av-menu"].forEach(id => { const e = $("#" + id); if (e) e.hidden = true; }); ["al-btn", "av-btn"].forEach(id => $("#" + id)?.setAttribute("aria-expanded", "false")); }
document.addEventListener("click", async e => {
  const bell = e.target.closest("#al-btn"), av = e.target.closest("#av-btn");
  if (bell || av) {
    const panel = $("#al-panel"), menu = $("#av-menu"), target = bell ? panel : menu, wasOpen = !target.hidden;
    closeMenus();
    if (!wasOpen) {
      target.hidden = false; (bell || av).setAttribute("aria-expanded", "true");
      if (bell) { panel.innerHTML = `<div class="alh">Alerts</div><p class="ale">Loading&hellip;</p>`; try { panel.innerHTML = panelHtml(await auth.alerts(15)); } catch { panel.innerHTML = `<div class="alh">Alerts</div><p class="ale">Alerts are unavailable right now.</p>`; } }
    }
    return;
  }
  if (e.target.closest("[data-signout]")) return auth.signOut();
  if (e.target.closest("[data-al-readall]")) { await auth.markRead(); badge(0); $$all(".ali.un").forEach(x => x.classList.remove("un")); return; }
  const item = e.target.closest(".ali[data-id]");
  if (item) { e.preventDefault(); const id = Number(item.dataset.id); try { await auth.markRead([id]); } catch { /* ignore */ } location.href = item.getAttribute("href"); return; }
  if (!e.target.closest(".acct")) closeMenus();
});
document.addEventListener("keydown", e => { if (e.key === "Escape") closeMenus(); });
const $$all = s => [...document.querySelectorAll(s)];

/* ---------- session handling ---------- */
async function setSession(session, evt) {
  auth.user = session?.user || null;
  await loadProfile();
  render();
  listeners.forEach(fn => { try { fn(evt, auth); } catch { /* ignore */ } });
}
sb.auth.onAuthStateChange((evt, session) => { setTimeout(() => setSession(session, evt), 0); });
sb.auth.getSession().then(async ({ data }) => {
  await setSession(data.session, "INITIAL");
  CP.auth = auth; CP._authResolve(auth);
  setInterval(refreshCount, 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshCount(); });
}).catch(() => { CP._authResolve(null); });
})();
