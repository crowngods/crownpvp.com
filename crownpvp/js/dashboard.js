/* CrownPVP staff dashboard: reports, ban appeals, staff applications, audit log and staff management. */
(() => {
const { $, $$, esc, date } = CP, N = CP.net, box = $("#dash");
const PER = 20;
const GAMEMODES = ["Factions", "SkyBlock", "Survival", "KitPvP", "Other"];
const CATEGORIES = ["Hacking / Cheating", "Abusing Bugs", "Scamming", "Inappropriate Behaviour", "Exploiting", "Other"];
const ROLES = ["helper", "moderator", "admin", "media"];
const S = {
  tab: "", access: null,
  reports: { q: "", status: "open", gamemode: "", category: "", page: 0 },
  appeals: { q: "", status: "open", ptype: "", page: 0 },
  applications: { q: "", status: "open", role: "", page: 0 },
  audit: { q: "", action: "", page: 0 }
};
const QUICK = [
  ["Accept", "Congratulations, you are accepted! Join our Discord and open a ticket so we can set up your staff interview."],
  ["Interview", "Your application looks good. Please open a ticket on Discord so we can schedule a short voice interview."],
  ["Need more", "Your answers were too short. Please apply again with more detail about your moderation experience."],
  ["Deny", "Thank you for applying. We are not moving forward right now. You can re-apply in 14 days."]
];
const safeQ = s => String(s || "").replace(/[^A-Za-z0-9_]/g, "").slice(0, 16);
const sel = (name, cur, items) => `<select class="fi" data-f="${name}" aria-label="${name}">${items.map(([v, l]) => `<option value="${esc(v)}"${v === cur ? " selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
const STATUS_ITEMS = [["open", "Open (pending + review)"], ["all", "All statuses"], ["pending", "Pending"], ["under_review", "Under review"], ["approved", "Accepted / Approved"], ["denied", "Denied"]];
const pager = (page, total) => { const pages = Math.max(1, Math.ceil(total / PER)); return `<nav class="pager" aria-label="Pages"><button data-pg="-1" ${page <= 0 ? "disabled" : ""}>&larr; Previous</button><span>Page ${page + 1} of ${pages} &middot; ${total.toLocaleString("en-US")} total</span><button data-pg="1" ${page + 1 >= pages ? "disabled" : ""}>Next &rarr;</button></nav>`; };
const av = n => `<img class="mh" src="${esc(CP.head(n, 28))}" alt="" width="28" height="28" loading="lazy">`;

/* ---------- action box shown under a case ---------- */
function actions(kind, row, a) {
  const decideP = kind === "report" ? "reports_decide" : kind === "appeal" ? "appeals_decide" : "applications_decide";
  const reviewP = kind === "report" ? "reports_review" : kind === "appeal" ? "appeals_decide" : "applications_view";
  const canDecide = N.can(a, decideP), canReview = N.can(a, reviewP) || canDecide;
  const closed = row.status === "approved" || row.status === "denied";
  if (!canReview) return `<p class="dmuted">Your rank can read this ${kind} but not act on it.</p>`;
  if (closed && !N.can(a, "cases_reopen")) return `<p class="dmuted">This ${kind} was decided. Only a Manager or above can change a decision.</p>`;

  const okLabel = kind === "application" ? "ACCEPT" : "Approve";
  const noLabel = kind === "application" ? "DENY" : "Deny";
  const revLabel = kind === "application" ? "REVIEW" : "Mark under review";

  const b = (st, label, cls = "ghost") => row.status === st ? "" : `<button type="button" class="btn ${cls} sm" data-set="${st}">${label}</button>`;
  const chips = kind === "application" && canDecide ? `<div class="qchips" aria-label="Quick notes"><span>Quick notes:</span>${QUICK.map(([k, t]) => `<button type="button" data-fill="${esc(t)}" data-fill-kind="${k}">${esc(k)}</button>`).join("")}</div>` : "";
  return `<div class="act"><label>${kind === "application" ? "Staff Description / Decision Note" : "Reason"}<small>${canDecide ? "Required to accept/approve or deny. The applicant sees it with your name and rank." : "Optional note for the history."}</small>
    <textarea class="fi" rows="3" maxlength="1000" placeholder="${kind === "application" ? "Add staff description, interview instructions, or denial reason…" : "Write your own reason…"}">${esc(row.decision_reason || "")}</textarea></label>
    ${chips}<div class="kactions">${canDecide ? b("approved", okLabel, "ok") + b("denied", noLabel, "no") : ""}${b("under_review", revLabel)}${closed || row.status === "under_review" ? b("pending", "Back to pending") : ""}</div>
    <p class="kmsg err amsg" aria-live="polite"></p></div>`;
}

/* ---------- cases ---------- */
function reportCard(r, a) {
  return `<article class="kcase" data-kind="report" data-id="${r.id}"><header><div class="who">${av(r.reported_player)}<div><b>RPT-${r.id} &middot; ${esc(r.reported_player)}</b><small>${esc(r.gamemode)} &middot; ${esc(r.category)}</small></div></div>${N.pill(r.status)}</header>
  <p class="meta">Reported by <b>${esc(r.reporter)}</b> &middot; submitted ${date(Date.parse(r.created_at))}${r.decided_at ? ` &middot; decided ${date(Date.parse(r.decided_at))}` : ""}</p>
  ${N.decision("report", r)}
  <details data-extra><summary>Explanation, evidence and history</summary><p class="pre">${esc(r.details)}</p><div class="xbody"><p class="dmuted">Loading&hellip;</p></div></details>
  ${actions("report", r, a)}</article>`;
}
function appealCard(r, a) {
  return `<article class="kcase" data-kind="appeal" data-id="${r.id}"><header><div class="who">${av(r.mc_username)}<div><b>APL-${r.id} &middot; ${esc(r.mc_username)}</b><small>${esc(r.punishment_type)} appeal${r.punishment_id ? ` &middot; punishment #${r.punishment_id}` : " &middot; no ID given"}</small></div></div>${N.pill(r.status)}</header>
  <p class="meta">Sent by account <b>${esc(r.account_name)}</b> &middot; submitted ${date(Date.parse(r.created_at))}${r.decided_at ? ` &middot; decided ${date(Date.parse(r.decided_at))}` : ""}</p>
  ${N.decision("appeal", r)}
  <details data-extra><summary>Appeal, original punishment, evidence and history</summary>
    <dl class="kv"><dt>Reason given by player</dt><dd>${esc(r.punishment_reason)}</dd><dt>Why reconsider</dt><dd class="pre">${esc(r.reconsider_reason)}</dd>${r.additional ? `<dt>Additional</dt><dd class="pre">${esc(r.additional)}</dd>` : ""}</dl>
    <div class="xbody"><p class="dmuted">Loading&hellip;</p></div></details>
  ${actions("appeal", r, a)}</article>`;
}
/* The form stores several answers in two text columns; split them back into labelled blocks for staff. */
function parseApplication(r) {
  const exp = String(r.experience || ""), mot = String(r.motivation || "");
  const mic = /\[Mic:\s*([^|\]]*?)\s*\|\s*Recording:\s*([^\]]*?)\s*\]/.exec(exp);
  const pun = /\[Punishment History:\s*([^\]]*)\]/.exec(exp);
  const prior = /Prior Staff\/Plugins:\s*([\s\S]*)$/.exec(exp);
  const blocks = [...mot.matchAll(/\[([^\]\n]+)\]\n([\s\S]*?)(?=\n\n\[|$)/g)].map(m => [m[1].trim(), m[2].trim()]);
  return { mic: mic?.[1], rec: mic?.[2], pun: pun?.[1]?.trim(), prior: prior?.[1]?.trim(), blocks, parsed: !!(mic || pun || blocks.length) };
}
function applicationCard(r, a) {
  const x = parseApplication(r), rc = N.RANKS[r.role]?.color || "var(--gold)";
  const chip = (k, v, cls = "") => v ? `<span class="achip ${cls}"><small>${k}</small><b>${esc(v)}</b></span>` : "";
  const answers = x.parsed
    ? `${x.prior ? `<div class="ans"><h5>Prior staff experience &amp; plugins</h5><p>${esc(x.prior)}</p></div>` : ""}${x.blocks.map(([h, t]) => `<div class="ans"><h5>${esc(h)}</h5><p>${esc(t)}</p></div>`).join("")}`
    : `<dl class="kv"><dt>Experience &amp; Details</dt><dd class="pre">${esc(r.experience)}</dd><dt>Answers &amp; Motivation</dt><dd class="pre">${esc(r.motivation)}</dd></dl>`;
  return `<article class="kcase appcard ${esc(r.status)}" data-kind="application" data-id="${r.id}">
    <header>
      <div class="who">${av(r.mc_username)}<div><b>APP-${r.id} &middot; ${esc(r.mc_username)}</b><small>Applying for <b class="rolechip" style="--rc:${rc}">${esc(r.role.toUpperCase())}</b> &middot; submitted ${date(Date.parse(r.created_at))}</small></div></div>
      ${N.pill(r.status)}
    </header>
    <div class="achips">${chip("Discord", r.discord)}${chip("Age", r.age_band)}${chip("Time zone", r.timezone)}${chip("Hours / week", r.availability)}${chip("Microphone", x.mic)}${chip("Can record", x.rec)}${chip("Punishment history", x.pun, /clean|none|no\b|never/i.test(x.pun || "") ? "good" : "warn")}</div>
    ${N.decision("appeal", r)}
    <details open><summary>Application answers</summary><div class="answers">${answers}</div></details>
    <details data-extra><summary>Review history</summary><div class="xbody"><p class="dmuted">Loading&hellip;</p></div></details>
    ${actions("application", r, a)}
  </article>`;
}

async function casesView(kind, a, auth) {
  const isR = kind === "report", isApp = kind === "application";
  const st = S[isR ? "reports" : isApp ? "applications" : "appeals"];
  const table = isR ? "player_reports" : isApp ? "staff_applications" : "ban_appeals";
  let q = auth.sb.from(table).select("*", { count: "exact" }).order("created_at", { ascending: false }).range(st.page * PER, st.page * PER + PER - 1);
  if (st.status === "open") q = q.in("status", ["pending", "under_review"]); else if (st.status !== "all") q = q.eq("status", st.status);
  const s = safeQ(st.q);

  if (isR) {
    if (st.gamemode) q = q.eq("gamemode", st.gamemode);
    if (st.category) q = q.eq("category", st.category);
    if (s) q = q.or(`reported_player.ilike.%${s}%,reporter.ilike.%${s}%`);
  } else if (isApp) {
    if (st.role) q = q.eq("role", st.role);
    if (s) q = q.or(`mc_username.ilike.%${s}%,discord.ilike.%${s}%`);
  } else {
    if (st.ptype) q = q.eq("punishment_type", st.ptype);
    if (s) q = /^\d+$/.test(s) ? q.or(`punishment_id.eq.${Number(s)},mc_username.ilike.%${s}%`) : q.or(`mc_username.ilike.%${s}%,account_name.ilike.%${s}%`);
  }
  const { data, error, count } = await q; if (error) throw error;

  const filters = isR
    ? `<input class="fi" type="search" data-f="q" maxlength="16" placeholder="Search player username&hellip;" value="${esc(st.q)}">${sel("gamemode", st.gamemode, [["", "All gamemodes"], ...GAMEMODES.map(g => [g, g])])}${sel("category", st.category, [["", "All categories"], ...CATEGORIES.map(g => [g, g])])}${sel("status", st.status, STATUS_ITEMS)}`
    : isApp
    ? `<input class="fi" type="search" data-f="q" maxlength="16" placeholder="Search applicant IGN&hellip;" value="${esc(st.q)}">${sel("role", st.role, [["", "All roles"], ...ROLES.map(r => [r, r.toUpperCase()])])}${sel("status", st.status, STATUS_ITEMS)}`
    : `<input class="fi" type="search" data-f="q" maxlength="16" placeholder="Search username or punishment ID&hellip;" value="${esc(st.q)}">${sel("ptype", st.ptype, [["", "All types"], ["ban", "Bans"], ["mute", "Mutes"], ["other", "Other"]])}${sel("status", st.status, STATUS_ITEMS)}`;

  const cardFn = isR ? reportCard : isApp ? applicationCard : appealCard;
  return `<div class="filters">${filters}</div>${data.length ? `<div class="clist">${data.map(r => cardFn(r, a)).join("")}</div>${pager(st.page, count || 0)}` : `<div class="empty"><h3>Nothing here</h3><p style="margin-top:8px">No ${isR ? "reports" : isApp ? "applications" : "appeals"} match these filters.</p></div>`}`;
}

/* ---------- audit log ---------- */
async function auditView(auth) {
  const st = S.audit;
  let q = auth.sb.from("audit_log").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(st.page * PER, st.page * PER + PER - 1);
  const s = safeQ(st.q);
  if (s) q = q.or(`actor_name.ilike.%${s}%,target_label.ilike.%${s}%`);
  if (st.action) q = q.like("action", st.action + "%");
  const { data, error, count } = await q; if (error) throw error;
  const label = r => r.target_kind === "staff" ? `Staff: ${esc(r.target_label)}` : `${r.target_kind === "report" ? "RPT" : r.target_kind === "application" ? "APP" : "APL"}-${r.target_id} &middot; ${esc(r.target_label)}`;
  const act = r => ({
    "report.approved": "Approved report", "report.denied": "Denied report", "report.under_review": "Reviewing report", "report.pending": "Reset report",
    "appeal.approved": "Approved appeal", "appeal.denied": "Denied appeal", "appeal.under_review": "Reviewing appeal", "appeal.pending": "Reset appeal",
    "application.approved": "Accepted application", "application.denied": "Denied application", "application.under_review": "Reviewing application", "application.pending": "Reset application",
    "staff.rank": "Changed rank"
  })[r.action] || r.action;
  const chg = r => r.target_kind === "staff" ? `${esc(N.rankName(r.from_status) || "None")} &rarr; ${esc(N.rankName(r.to_status) || "None")}` : `${esc(N.statusName(r.from_status))} &rarr; ${esc(N.statusName(r.to_status))}`;
  return `<div class="filters"><input class="fi" type="search" data-f="q" maxlength="16" placeholder="Search staff or target&hellip;" value="${esc(st.q)}">${sel("action", st.action, [["", "All actions"], ["report.", "Reports"], ["appeal.", "Appeals"], ["application.", "Applications"], ["staff.", "Staff changes"]])}</div>
  ${data.length ? `<div class="tbw"><table class="kt"><thead><tr><th>When</th><th>Staff</th><th>Action</th><th>Target</th><th>Status change</th><th>Reason / Description</th></tr></thead><tbody>${data.map(r => `<tr><td data-l="When">${new Date(r.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</td><td data-l="Staff">${esc(r.actor_name)} ${N.badge(r.actor_rank)}</td><td data-l="Action">${esc(act(r))}</td><td data-l="Target">${label(r)}</td><td data-l="Change">${chg(r)}</td><td data-l="Reason" class="rs">${esc(r.reason) || "<i>-</i>"}</td></tr>`).join("")}</tbody></table></div>${pager(st.page, count || 0)}` : `<div class="empty"><h3>No entries</h3><p style="margin-top:8px">Nothing has been logged yet.</p></div>`}`;
}

/* ---------- staff management ---------- */
async function staffView(a, auth) {
  const { data, error } = await auth.sb.rpc("list_staff"); if (error) throw error;
  const myLv = N.RANKS[a.rank]?.lv || 99;
  const ranks = Object.entries(N.RANKS).filter(([, v]) => a.rank === "owner" || v.lv > myLv);
  return `<div class="duo2"><div><h3 class="ksub">Team</h3><div class="tbw"><table class="kt"><thead><tr><th>Member</th><th>Rank</th><th>Position title</th><th>Public</th></tr></thead><tbody>${data.map(m => `<tr><td data-l="Member">${av(m.username)} <b>${esc(m.username)}</b></td><td data-l="Rank">${N.badge(m.staff_rank)}</td><td data-l="Title">${esc(m.position_title || "") || "<i>-</i>"}</td><td data-l="Public">${m.public_listed ? "Yes" : "Hidden"}</td></tr>`).join("") || `<tr><td colspan="4"><i>No staff yet.</i></td></tr>`}</tbody></table></div></div>
  <form class="kcard kform" id="sf" novalidate><h3 class="ksub">Set a rank</h3><p class="dmuted">The person needs a CrownPVP website account first. You can only manage ranks below your own.</p>
  <label>Website username<input class="fi" name="user" maxlength="16" required autocomplete="off"></label>
  <label>Rank<select class="fi" name="rank"><option value="">Remove from staff</option>${ranks.map(([k, v]) => `<option value="${k}">${esc(v.name)}</option>`).join("")}</select></label>
  <label>Position title<small>Optional, shown on the team page (e.g. Lead Builder)</small><input class="fi" name="title" maxlength="40"></label>
  <p class="kmsg" id="sf-msg" role="status" aria-live="polite"></p><button class="btn gold wide" type="submit">Save rank</button></form></div>`;
}

/* ---------- shell ---------- */
CP.authReady.then(auth => {
  if (!auth) { box.innerHTML = N.unavailable; return; }
  const TABS = [
    ["reports", "Reports", "reports_view"],
    ["appeals", "Appeals", "appeals_view"],
    ["applications", "Applications", "applications_view"],
    ["audit", "Audit log", "audit_view"],
    ["staff", "Staff", "staff_manage"]
  ];
  let counts = {};

  async function loadCounts(a) {
    const c = async (t, st) => { try { const { count } = await auth.sb.from(t).select("id", { count: "exact", head: true }).in("status", st); return count || 0; } catch { return null; } };
    counts = {};
    if (N.can(a, "reports_view")) counts.reports = await c("player_reports", ["pending", "under_review"]);
    if (N.can(a, "appeals_view")) counts.appeals = await c("ban_appeals", ["pending", "under_review"]);
    if (N.can(a, "applications_view")) counts.applications = await c("staff_applications", ["pending", "under_review"]);
  }
  async function draw() {
    if (!auth.user) { box.innerHTML = N.gate("Staff sign in", "Sign in with your staff account to open the dashboard.", "dashboard.html"); return; }
    auth.access = undefined; const a = await N.access(auth); S.access = a;
    const tabs = TABS.filter(t => N.can(a, t[2]));
    if (!a?.rank || !tabs.length) {
      box.innerHTML = `<div class="card gate"><h3>No dashboard access</h3><p>${a?.rank ? "Your rank does not include dashboard tools." : "This area is for CrownPVP staff. If you should have access, ask the Owner to assign your rank."}</p></div>`; return;
    }
    const h = location.hash.slice(1); if (!S.tab || !tabs.some(t => t[0] === S.tab)) S.tab = tabs.some(t => t[0] === h) ? h : tabs[0][0];
    await loadCounts(a);
    box.innerHTML = `<div class="dwho2"><span class="av">${av(a.username)}</span><div><b>${esc(a.username)}</b> ${N.badge(a.rank)}</div></div>
    <div class="kpi">${counts.reports != null ? `<div><b>${counts.reports}</b><span>Open reports</span></div>` : ""}${counts.appeals != null ? `<div><b>${counts.appeals}</b><span>Open appeals</span></div>` : ""}${counts.applications != null ? `<div><b>${counts.applications}</b><span>Open applications</span></div>` : ""}</div>
    <div class="ktabs" role="tablist">${tabs.map(([k, l]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${S.tab === k}" class="${S.tab === k ? "on" : ""}">${l}${counts[k] ? ` <i class="cn">${counts[k]}</i>` : ""}</button>`).join("")}</div><div id="d-body"><div class="skel"><i></i><i></i><i></i></div></div>`;
    await body();
  }
  let seq = 0;
  async function body(keepFocus) {
    const my = ++seq, a = S.access, el = $("#d-body"); if (!el) return;
    const focus = keepFocus ? document.activeElement?.dataset?.f : null, pos = keepFocus ? document.activeElement?.selectionStart : null;
    try {
      const html = S.tab === "reports" ? await casesView("report", a, auth)
                 : S.tab === "appeals" ? await casesView("appeal", a, auth)
                 : S.tab === "applications" ? await casesView("application", a, auth)
                 : S.tab === "audit" ? await auditView(auth)
                 : await staffView(a, auth);
      if (my !== seq) return; el.innerHTML = html;
      if (focus) { const f = $(`[data-f="${focus}"]`, el); if (f) { f.focus(); try { f.setSelectionRange(pos, pos); } catch { /* select */ } } }
    } catch (e) { if (my !== seq) return; console.error("Dashboard error", e); el.innerHTML = `<div class="empty"><h3>Could not load this tab</h3><p style="margin-top:8px">${esc(N.friendly(e, "Please try again in a moment."))}</p></div>`; }
  }

  async function original(card) {
    const id = Number(card.dataset.id), x = card.querySelector(".xbody");
    try {
      if (card.dataset.kind === "application") {
        const tl = await auth.sb.from("case_events").select("actor_name,actor_rank,from_status,to_status,reason,created_at").eq("kind", "application").eq("case_id", id).order("created_at", { ascending: true });
        x.innerHTML = tl.error ? `<p class="dmuted">History is unavailable.</p>` : N.timeline(tl.data) || `<p class="dmuted">No history yet.</p>`;
        return;
      }
      const { data: row } = await auth.sb.from(card.dataset.kind === "report" ? "player_reports" : "ban_appeals").select("*").eq("id", id).single();
      let extra = "";
      if (card.dataset.kind === "appeal") {
        let orig = `<p class="dmuted">No punishment ID was given, so the original record cannot be looked up automatically.</p>`;
        if (row.punishment_id && row.punishment_type !== "other") {
          try { const p = await N.findPunishment(row.punishment_type, row.punishment_id); orig = p ? `<div class="pfound"><b>Original ${esc(row.punishment_type)} #${p.id} (from the server database)</b>${p.name.toLowerCase() !== row.mc_username.toLowerCase() ? `<p class="kmsg err">Warning: this punishment belongs to ${esc(p.name)}, not ${esc(row.mc_username)}.</p>` : ""}${N.punishmentHtml(p)}</div>` : `<p class="kmsg err">No ${esc(row.punishment_type)} with ID ${row.punishment_id} exists in the published punishment data.</p>`; }
          catch { orig = `<p class="dmuted">The punishment data could not be loaded right now.</p>`; }
        }
        const { count } = await auth.sb.from("ban_appeals").select("id", { count: "exact", head: true }).ilike("mc_username", row.mc_username).neq("id", id);
        extra = `<h4 class="xh">Original punishment</h4>${orig}<p class="dmuted">${count ? `${count} other appeal${count > 1 ? "s" : ""} from ${esc(row.mc_username)} on record.` : "No other appeals from this player."}</p>`;
      }
      x.innerHTML = extra + await N.extras(auth.sb, card.dataset.kind, row);
    } catch (e) { card.querySelector("details").dataset.loaded = ""; x.innerHTML = `<p class="dmuted">${esc(N.friendly(e, "Could not load this case."))}</p>`; }
  }

  box.addEventListener("toggle", e => { const d = e.target; if (!d.matches?.("details[data-extra]") || !d.open || d.dataset.loaded) return; d.dataset.loaded = "1"; original(d.closest(".kcase")); }, true);
  box.addEventListener("click", async e => {
    const t = e.target.closest("[data-tab]"); if (t) { S.tab = t.dataset.tab; history.replaceState(null, "", "#" + S.tab); return draw(); }
    const pg = e.target.closest("[data-pg]"); if (pg) { const st = S[S.tab]; st.page = Math.max(0, st.page + Number(pg.dataset.pg)); await body(); return scrollTo({ top: 0, behavior: "smooth" }); }
    const fill = e.target.closest("[data-fill]");
    if (fill) { const ta = fill.closest(".act").querySelector("textarea"); ta.value = fill.dataset.fill; ta.focus(); return; }
    const b = e.target.closest("[data-set]"); if (!b) return;
    const card = b.closest(".kcase"), kind = card.dataset.kind, status = b.dataset.set, msg = card.querySelector(".amsg"), reason = card.querySelector(".act textarea").value.trim();
    const decided = status === "approved" || status === "denied";
    if (decided && reason.length < 5) { msg.textContent = "Write your own description/reason first (at least 5 characters)."; card.querySelector(".act textarea").focus(); return; }
    const prefix = kind === "report" ? "report RPT" : kind === "appeal" ? "appeal APL" : "application APP";
    const verb = kind === "application" ? (status === "approved" ? "ACCEPT" : "DENY") : (status === "approved" ? "Approve" : "Deny");
    if (decided && !confirm(`${verb} ${prefix}-${card.dataset.id}? The player will see your name, rank and description.`)) return;
    msg.textContent = ""; const btns = $$(".act button", card); btns.forEach(x => x.disabled = true);

    const rpc = kind === "report" ? "set_report_status" : kind === "appeal" ? "set_appeal_status" : "set_application_status";
    const { error } = await auth.sb.rpc(rpc, { p_id: Number(card.dataset.id), p_status: status, p_reason: reason });
    if (error) { btns.forEach(x => x.disabled = false); msg.textContent = N.friendly(error, "Could not save. Nothing was changed."); return; }
    CP.toast(decided ? `${kind === "report" ? "Report" : kind === "appeal" ? "Appeal" : "Application"} ${status}. The player was alerted.` : "Status updated.");
    await loadCounts(S.access); await draw();
  });

  let deb;
  box.addEventListener("input", e => { const f = e.target.dataset.f; if (f !== "q") return; clearTimeout(deb); deb = setTimeout(() => { S[S.tab].q = e.target.value.trim(); S[S.tab].page = 0; body(true); }, 350); });
  box.addEventListener("change", e => { const f = e.target.dataset.f; if (!f || f === "q") return; S[S.tab][f] = e.target.value; S[S.tab].page = 0; body(); });

  box.addEventListener("submit", async e => {
    if (e.target.id !== "sf") return; e.preventDefault();
    const f = e.target, m = $("#sf-msg"), v = n => f.elements[n].value.trim(), btn = f.querySelector("button[type=submit]");
    const say = (t, ok) => { m.className = "kmsg " + (ok ? "ok" : "err"); m.textContent = t; };
    if (!/^[A-Za-z0-9_]{3,16}$/.test(v("user"))) return say("Enter the person's website username.");
    if (!v("rank") && !confirm(`Remove ${v("user")} from staff?`)) return;
    btn.disabled = true;
    const { error } = await auth.sb.rpc("set_staff_rank", { p_username: v("user"), p_rank: v("rank") || null, p_title: v("title") || null });
    btn.disabled = false;
    if (error) return say(N.friendly(error, "Could not save the rank."));
    CP.toast("Rank saved"); await body();
  });

  addEventListener("hashchange", () => { const h = location.hash.slice(1); if (TABS.some(t => t[0] === h && N.can(S.access, t[2])) && h !== S.tab) { S.tab = h; draw(); } });
  let uid = auth.user?.id || null;
  auth.on(() => { const now = auth.user?.id || null; if (now !== uid) { uid = now; S.tab = ""; draw(); } });
  draw();
});
})();
