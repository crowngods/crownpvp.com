/* CrownPVP appeals. Players send an appeal and see its status; staff review, approve or decline.
   Privacy is enforced by the database (appeals.sql): only the sender and staff can read an appeal. */
(() => {
const { $, esc, date } = CP, box = $("#ap");
const KIND = { ban: "Ban", mute: "Mute", other: "Other" };
const STATUS = { pending: "Pending", approved: "Approved", declined: "Declined" };
const badge = s => `<span class="apst ${esc(s)}">${STATUS[s] || esc(s)}</span>`;
const link = t => /^https:\/\/\S+$/.test(t) ? `<a href="${esc(t)}" target="_blank" rel="noopener noreferrer">${esc(t)}</a>` : esc(t);
const when = s => date(Date.parse(s));
const FILTERS = ["pending", "approved", "declined", "all"];
let tab = "new", filter = "pending";

const gate = () => { box.innerHTML = `<div class="card gate"><h3>Sign in to send an appeal</h3><p>You need a CrownPVP account so staff can reply to you and you can follow your appeal.</p><p style="margin-top:18px"><a class="btn" style="width:auto" href="login.html?next=appeals.html">Sign in or create an account</a></p></div>`; };
const unavailable = () => `<div class="empty"><h3>Appeals are unavailable right now</h3><p style="margin-top:8px">Please try again in a moment.</p></div>`;

function card(a, staff) {
  return `<article class="card apc" data-id="${a.id}">
  <header><div><b>${esc(a.username)}</b><small>${KIND[a.kind] || "Other"} appeal &middot; ${when(a.created_at)}</small></div>${badge(a.status)}</header>
  <dl><dt>Punishment reason</dt><dd>${esc(a.reason)}</dd><dt>Appeal</dt><dd class="pre">${esc(a.details)}</dd>${a.evidence ? `<dt>Evidence</dt><dd>${link(a.evidence)}</dd>` : ""}${a.discord ? `<dt>Discord</dt><dd>${esc(a.discord)}</dd>` : ""}</dl>
  ${a.status !== "pending" ? `<p class="apn"><b>${a.status === "approved" ? "Approved" : "Declined"}${a.reviewed_at ? ` on ${when(a.reviewed_at)}` : ""}.</b> ${esc(a.staff_note) || "No note."}</p>` : ""}
  ${staff && a.status === "pending" ? `<div class="apr"><label class="cu" for="n-${a.id}">Note to the player (shown to them, required to decline)</label><textarea class="fi" id="n-${a.id}" maxlength="400" rows="2"></textarea>
  <div class="apact"><button type="button" class="btn" style="width:auto" data-dec="approved">Approve</button><button type="button" class="btn ghost" style="width:auto" data-dec="declined">Decline</button></div><p class="cm errm apmsg" aria-live="polite"></p></div>` : ""}
  </article>`;
}

CP.authReady.then(auth => {
  if (!auth) { box.innerHTML = `<div class="card gate"><h3>Online appeals are not set up yet</h3><p>Please open an appeal in a ticket on our Discord instead.</p><p style="margin-top:18px"><a class="btn" style="width:auto" href="${esc(window.CROWN.discord)}" target="_blank" rel="noopener">Open Discord</a></p></div>`; return; }
  const q = auth.sb.from.bind(auth.sb);
  const tabBtn = (id, label) => `<button type="button" role="tab" data-tab="${id}" class="${tab === id ? "on" : ""}">${label}</button>`;

  async function countPending() {
    try { const { count } = await q("appeals").select("id", { count: "exact", head: true }).eq("status", "pending"); return count || 0; } catch { return 0; }
  }
  async function newView() {
    const { data, error } = await q("appeals").select("id,created_at").eq("user_id", auth.user.id).eq("status", "pending").limit(1);
    if (error) throw error;
    if (data.length) return `<div class="card gate"><h3>Your appeal is being reviewed</h3><p>You sent it on ${when(data[0].created_at)}. You can have one open appeal at a time. You will get an alert on the bell when staff decide.</p></div>`;
    return `<form class="card staffbox" id="f-ap"><h3>Send an appeal</h3>
    <p class="apnote">Appealing as <b>${esc(auth.profile?.username || "your account")}</b>. Use the account whose name matches the punished player.</p>
    <label class="cu" for="ap-kind">What are you appealing?</label><select class="fi" id="ap-kind" name="kind" required><option value="ban">A ban</option><option value="mute">A mute</option><option value="other">Something else</option></select>
    <label class="cu" for="ap-reason">Reason shown on the Punishments page</label><input class="fi" id="ap-reason" name="reason" maxlength="200" required>
    <label class="cu" for="ap-details">Why should it be removed? (at least 30 characters)</label><textarea class="fi" id="ap-details" name="details" minlength="30" maxlength="2000" rows="6" required></textarea>
    <label class="cu" for="ap-evidence">Link to a video or screenshot (optional)</label><input class="fi" id="ap-evidence" name="evidence" maxlength="500" autocomplete="off">
    <label class="cu" for="ap-discord">Your Discord name (optional)</label><input class="fi" id="ap-discord" name="discord" maxlength="60" autocomplete="off">
    <button class="btn wide" type="submit">Send appeal</button><p id="ap-msg" class="cm" aria-live="polite"></p></form>`;
  }
  async function mineView() {
    const { data, error } = await q("appeals").select("*").eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    return data.length ? `<div class="aplist">${data.map(a => card(a, false)).join("")}</div>` : `<div class="empty"><h3>No appeals yet</h3><p style="margin-top:8px">When you send an appeal, you can follow it here.</p></div>`;
  }
  async function reviewView() {
    let r = q("appeals").select("*").order("created_at", { ascending: filter === "pending" }).limit(100);
    if (filter !== "all") r = r.eq("status", filter);
    const { data, error } = await r;
    if (error) throw error;
    return `<p class="apnote">Approving or declining here records the decision and sends the player an alert. It does not change anything in game: lift the ban or mute yourself when you approve.</p>
    <div class="apf">${FILTERS.map(f => `<button type="button" class="btn ghost${f === filter ? " on" : ""}" style="width:auto" data-filter="${f}">${f[0].toUpperCase() + f.slice(1)}</button>`).join("")}</div>
    ${data.length ? `<div class="aplist">${data.map(a => card(a, true)).join("")}</div>` : `<div class="empty"><h3>Nothing here</h3><p style="margin-top:8px">No ${filter === "all" ? "" : filter + " "}appeals.</p></div>`}`;
  }

  async function draw() {
    if (!auth.user) return gate();
    const staff = !!auth.profile?.is_staff;
    if (!staff && tab === "review") tab = "new";
    const pending = staff ? await countPending() : 0;
    box.innerHTML = `<div class="appage"><div class="ptabs" role="tablist">${tabBtn("new", "New appeal")}${tabBtn("mine", "My appeals")}${staff ? tabBtn("review", `Staff review${pending ? ` (${pending})` : ""}`) : ""}</div><div id="ap-body"><div class="skel"><i></i><i></i></div></div></div>`;
    try { $("#ap-body").innerHTML = await (tab === "new" ? newView() : tab === "mine" ? mineView() : reviewView()); }
    catch (err) { console.error("Appeals error (did you run appeals.sql in Supabase?)", err); $("#ap-body").innerHTML = unavailable(); }
  }

  box.addEventListener("click", async e => {
    const t = e.target.closest("[data-tab]"); if (t) { tab = t.dataset.tab; return draw(); }
    const f = e.target.closest("[data-filter]"); if (f) { filter = f.dataset.filter; return draw(); }
    const d = e.target.closest("[data-dec]"); if (!d) return;
    const art = d.closest(".apc"), msg = art.querySelector(".apmsg"), btns = art.querySelectorAll("button");
    const decision = d.dataset.dec, note = art.querySelector("textarea").value.trim();
    if (decision === "declined" && note.length < 3) { msg.textContent = "Write a short reason so the player knows why."; return; }
    if (!confirm(`${decision === "approved" ? "Approve" : "Decline"} this appeal?`)) return;
    msg.textContent = ""; btns.forEach(b => b.disabled = true);
    const { error } = await auth.sb.rpc("review_appeal", { p_id: Number(art.dataset.id), p_decision: decision, p_note: note });
    if (error) {
      btns.forEach(b => b.disabled = false);
      msg.textContent = /already reviewed/i.test(error.message) ? "Someone already reviewed this appeal. Reload the page." : /staff only/i.test(error.message) ? "Only staff can review appeals." : "Could not save. Please try again.";
      return;
    }
    CP.toast(decision === "approved" ? "Appeal approved. The player was alerted." : "Appeal declined. The player was alerted.");
    draw();
  });

  box.addEventListener("submit", async e => {
    if (e.target.id !== "f-ap") return;
    e.preventDefault();
    const f = e.target, m = $("#ap-msg"), v = n => f.elements[n].value.trim(), btn = f.querySelector("button[type=submit]");
    const say = (t, ok) => { m.className = "cm " + (ok ? "okm" : "errm"); m.textContent = t; };
    if (v("details").length < 30) return say("Please explain in at least 30 characters.");
    btn.disabled = true;
    const { error } = await auth.sb.rpc("submit_appeal", { p_kind: v("kind"), p_reason: v("reason"), p_details: v("details"), p_evidence: v("evidence"), p_discord: v("discord") });
    if (error) { btn.disabled = false; return say(/pending appeal/i.test(error.message) ? "You already have an appeal waiting for review." : "Could not send your appeal. Please try again."); }
    CP.toast("Appeal sent. Staff will review it soon.");
    tab = "mine"; draw();
  });

  auth.on(evt => { if (evt === "SIGNED_OUT") gate(); });
  draw();
});
})();
