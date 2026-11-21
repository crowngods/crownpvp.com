/* CrownPVP reports panel (shown under the report form on support.html).
   Players see their own reports and their status; staff see every report and can start a review, resolve or dismiss.
   Privacy is enforced by the database (appeals-and-reports.sql): only the sender and staff can read a report. */
(() => {
const { $, esc, date } = CP, box = $("#rp-extra");
if (!box) return;
const TYPE = { player: "Player", faction: "Faction", bug: "Bug" };
const STATUS = { new: "New", reviewing: "Reviewing", resolved: "Resolved", dismissed: "Dismissed" };
const badge = s => `<span class="apst ${esc(s)}">${STATUS[s] || esc(s)}</span>`;
const link = t => /^https:\/\/\S+$/.test(t) ? `<a href="${esc(t)}" target="_blank" rel="noopener noreferrer">${esc(t)}</a>` : esc(t);
const when = s => date(Date.parse(s));
const FILTERS = [["open", "Open"], ["resolved", "Resolved"], ["dismissed", "Dismissed"], ["all", "All"]];
let tab = "mine", filter = "open", started = false;

function card(r, staff) {
  const open = r.status === "new" || r.status === "reviewing";
  return `<article class="card apc" data-id="${r.id}">
  <header><div><b>RPT-${r.id} &middot; ${esc(r.target)}</b><small>${TYPE[r.type] || "Other"} report${staff ? ` from ${esc(r.reporter)}` : ""} &middot; ${when(r.created_at)}</small></div>${badge(r.status)}</header>
  <dl><dt>Category</dt><dd>${esc(r.category)}</dd><dt>Details</dt><dd class="pre">${esc(r.details)}</dd>${r.evidence ? `<dt>Evidence</dt><dd>${link(r.evidence)}</dd>` : ""}${r.contact ? `<dt>Contact</dt><dd>${esc(r.contact)}</dd>` : ""}</dl>
  ${!open ? `<p class="apn"><b>${r.status === "resolved" ? "Resolved" : "Dismissed"}${r.reviewed_at ? ` on ${when(r.reviewed_at)}` : ""}.</b> ${esc(r.staff_note) || "No note."}</p>` : ""}
  ${staff && open ? `<div class="apr"><label class="cu" for="n-${r.id}">Note (optional, the reporter sees it when the report is closed)</label><textarea class="fi" id="n-${r.id}" maxlength="400" rows="2"></textarea>
  <div class="apact">${r.status === "new" ? `<button type="button" class="btn ghost" style="width:auto" data-set="reviewing">Start review</button>` : ""}<button type="button" class="btn" style="width:auto" data-set="resolved">Resolve</button><button type="button" class="btn ghost" style="width:auto" data-set="dismissed">Dismiss</button></div><p class="cm errm apmsg" aria-live="polite"></p></div>` : ""}
  </article>`;
}

CP.authReady.then(auth => {
  if (!auth) return; // accounts not set up: the form keeps using its old behaviour
  const q = auth.sb.from.bind(auth.sb);
  const tabBtn = (id, label) => `<button type="button" role="tab" data-tab="${id}" class="${tab === id ? "on" : ""}">${label}</button>`;

  async function countOpen() {
    try { const { count } = await q("reports").select("id", { count: "exact", head: true }).in("status", ["new", "reviewing"]); return count || 0; } catch { return 0; }
  }
  async function mineView() {
    const { data, error } = await q("reports").select("*").eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    return data.length ? `<div class="aplist">${data.map(r => card(r, false)).join("")}</div>` : `<div class="empty"><h3>No reports yet</h3><p style="margin-top:8px">Reports you send show up here with their status.</p></div>`;
  }
  async function reviewView() {
    let r = q("reports").select("*").order("created_at", { ascending: filter === "open" }).limit(100);
    r = filter === "open" ? r.in("status", ["new", "reviewing"]) : filter === "all" ? r : r.eq("status", filter);
    const { data, error } = await r;
    if (error) throw error;
    return `<div class="apf">${FILTERS.map(([k, l]) => `<button type="button" class="btn ghost${k === filter ? " on" : ""}" style="width:auto" data-filter="${k}">${l}</button>`).join("")}</div>
    ${data.length ? `<div class="aplist">${data.map(r => card(r, true)).join("")}</div>` : `<div class="empty"><h3>Nothing here</h3><p style="margin-top:8px">No ${filter === "all" ? "" : filter + " "}reports.</p></div>`}`;
  }

  async function draw() {
    if (!auth.user) {
      box.innerHTML = `<div class="card gate"><h3>Sign in to send a report</h3><p>Reports are linked to your account so staff can follow up and you can see what happened.</p><p style="margin-top:18px"><a class="btn" style="width:auto" href="login.html?next=support.html">Sign in or create an account</a></p></div>`;
      return;
    }
    const staff = !!auth.profile?.is_staff;
    if (!started) { started = true; if (staff) tab = "review"; }
    if (!staff && tab === "review") tab = "mine";
    const n = staff ? await countOpen() : 0;
    box.innerHTML = `<div class="appage"><div class="ptabs" role="tablist">${tabBtn("mine", "My reports")}${staff ? tabBtn("review", `Staff review${n ? ` (${n})` : ""}`) : ""}</div><div id="rp-body"><div class="skel"><i></i><i></i></div></div></div>`;
    try { $("#rp-body").innerHTML = await (tab === "mine" ? mineView() : reviewView()); }
    catch (err) { console.error("Reports error (did you run appeals-and-reports.sql in Supabase?)", err); $("#rp-body").innerHTML = `<div class="empty"><h3>Reports are unavailable right now</h3><p style="margin-top:8px">Please try again in a moment.</p></div>`; }
  }

  box.addEventListener("click", async e => {
    const t = e.target.closest("[data-tab]"); if (t) { tab = t.dataset.tab; return draw(); }
    const f = e.target.closest("[data-filter]"); if (f) { filter = f.dataset.filter; return draw(); }
    const d = e.target.closest("[data-set]"); if (!d) return;
    const art = d.closest(".apc"), msg = art.querySelector(".apmsg"), btns = art.querySelectorAll("button");
    const status = d.dataset.set, note = art.querySelector("textarea").value.trim();
    if (status !== "reviewing" && !confirm(`${status === "resolved" ? "Resolve" : "Dismiss"} this report? The reporter will get an alert.`)) return;
    msg.textContent = ""; btns.forEach(b => b.disabled = true);
    const { error } = await auth.sb.rpc("review_report", { p_id: Number(art.dataset.id), p_status: status, p_note: note });
    if (error) {
      btns.forEach(b => b.disabled = false);
      msg.textContent = /already closed/i.test(error.message) ? "Someone already closed this report. Reload the page." : /staff only/i.test(error.message) ? "Only staff can handle reports." : "Could not save. Please try again.";
      return;
    }
    CP.toast(status === "reviewing" ? "Marked as reviewing." : status === "resolved" ? "Report resolved. The reporter was alerted." : "Report dismissed. The reporter was alerted.");
    draw();
  });

  auth.on(evt => { if (evt === "SIGNED_OUT") draw(); });
  draw();
});
})();
