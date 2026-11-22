/* CrownPVP support tickets (Supabase). Players open tickets and read staff replies; staff with reports access can answer them.
   Who can read what is enforced by the database (supabase/support-tickets.sql), not by this file. */
(() => {
const { $, $$, esc, date } = CP, N = CP.net, C = window.CROWN, box = $("#tk-app");
const TOPICS = C.ticketTopics || ["Something else"];
const params = new URLSearchParams(location.search);
let view = params.get("new") ? "new" : "list", busy = false;
const LABEL = { open: "Open", answered: "Answered", closed: "Closed" };
const pill = s => `<span class="tk-pill ${esc(s)}">${esc(LABEL[s] || s)}</span>`;
const say = (t, ok) => { const m = $("#tk-msg"); if (m) { m.className = "kmsg " + (ok ? "ok" : t ? "err" : ""); m.textContent = t; } };

function formHtml() {
  return `<form class="kcard tk-form" id="tk-form" novalidate><div class="tk-warn">Before filling out this form, read the relevant thread on <a data-discord>Discord</a> or the <a href="rules.html">rules</a>.</div>
  <label><span>Minecraft username <em>Required</em></span><input class="fi" name="username" maxlength="16" required autocomplete="off" spellcheck="false" placeholder="Example: Player123" value="${esc(params.get("player") || "")}"><small>What is your Minecraft username?</small></label>
  <label><span>Title <em>Required</em></span><input class="fi" name="title" maxlength="100" required><small>What is a short explanation of this ticket?</small></label>
  <label><span>Topic <em>Required</em></span><select class="fi" name="topic" required><option value="">Choose one</option>${TOPICS.map(t => `<option>${esc(t)}</option>`).join("")}</select><small>What is the topic of this ticket?</small></label>
  <label><span>Description <em>Required</em></span><textarea class="fi" name="description" rows="7" minlength="10" maxlength="3000" required></textarea><small>Give as much detail as you can. Never share passwords.</small></label>
  <p class="kmsg" id="tk-msg" role="status" aria-live="polite"></p>
  <div class="tk-actions"><button class="btn gold" type="submit" id="tk-send">Submit</button><button class="btn ghost" type="button" data-view="list">Cancel</button></div></form>`;
}
function card(t, staff) {
  return `<article class="kcase tk-card" data-id="${t.id}"><header><div><b>#${t.id} &middot; ${esc(t.title)}</b><small>${esc(t.topic)} &middot; ${esc(t.username)} &middot; ${date(Date.parse(t.created_at))}</small></div>${pill(t.status)}</header>
  <details${staff && t.status === "open" ? " open" : ""}><summary>Details</summary><p class="pre">${esc(t.description)}</p></details>
  ${t.staff_reply ? `<div class="tk-reply"><b>Staff reply${t.replied_by ? " &middot; " + esc(t.replied_by) : ""}</b><p class="pre">${esc(t.staff_reply)}</p></div>` : ""}
  ${staff && t.status !== "closed" ? `<div class="tk-staff"><textarea class="fi" rows="3" maxlength="2000" placeholder="Write a reply to the player"></textarea><div class="tk-actions"><button class="btn sm" data-reply="${t.id}">Send reply</button><button class="btn ghost sm" data-close="${t.id}">Close ticket</button></div></div>` : ""}</article>`;
}
async function listHtml(auth, a, all) {
  let q = auth.sb.from("support_tickets").select("*").order("created_at", { ascending: false }).limit(100);
  if (!all) q = q.eq("user_id", auth.user.id);
  const { data, error } = await q; if (error) throw error;
  return data.length ? `<div class="clist">${data.map(t => card(t, all)).join("")}</div>` : `<div class="empty"><h3>${all ? "No tickets yet" : "You have no tickets"}</h3><p style="margin-top:8px">${all ? "New tickets from players appear here." : "Press Request Assistance when you need help from staff."}</p></div>`;
}
CP.authReady.then(auth => {
  const discord = () => $$("[data-discord]", box).forEach(a => { a.href = C.discord; a.target = "_blank"; a.rel = "noopener"; });
  if (!auth) { box.innerHTML = N.unavailable; return discord(); }
  async function draw() {
    if (!auth.user) { box.innerHTML = N.gate("Sign in to open a ticket", "Tickets are linked to your account so staff can reply to you here.", "tickets.html"); return; }
    const a = await N.access(auth), staff = N.can(a, "reports_view");
    if (view === "all" && !staff) view = "list";
    const tab = (id, l) => `<button type="button" class="${view === id ? "on" : ""}" data-view="${id}">${l}</button>`;
    box.innerHTML = `<div class="tk-head"><h2>Support Tickets</h2><button class="btn gold" data-view="new">Request Assistance</button></div>
    <div class="ktabs">${tab("list", "My tickets")}${staff ? tab("all", "All tickets (staff)") : ""}</div>
    <div class="tk-arch"><img src="assets/favicon-48.png" alt="" width="44" height="44"><div><b>Support Tickets Archive</b><small>Private. Only you and authorised staff can read your tickets.</small></div></div><div id="tk-body"><div class="skel"><i></i><i></i></div></div>`;
    const body = $("#tk-body");
    if (view === "new") { $(".ktabs").hidden = true; $(".tk-arch").hidden = true; body.innerHTML = formHtml(); discord(); return; }
    try { body.innerHTML = await listHtml(auth, a, view === "all"); } catch (e) { console.error(e); body.innerHTML = `<div class="empty"><h3>Tickets are unavailable</h3><p style="margin-top:8px">${esc(N.friendly(e, "Please try again in a moment."))}</p></div>`; }
  }
  box.addEventListener("click", async e => {
    const v = e.target.closest("[data-view]"); if (v) { view = v.dataset.view; return draw(); }
    const r = e.target.closest("[data-reply],[data-close]"); if (!r || busy) return;
    const id = r.dataset.reply || r.dataset.close, txt = r.closest(".tk-card").querySelector("textarea").value.trim(), close = !!r.dataset.close;
    if (!close && txt.length < 2) return CP.toast("Write a reply first.");
    busy = true; r.disabled = true;
    try { const { error } = await auth.sb.rpc("reply_support_ticket", { p_id: Number(id), p_reply: txt, p_close: close }); if (error) throw error; CP.toast(close ? "Ticket closed" : "Reply sent"); }
    catch (err) { CP.toast(N.friendly(err, "Could not update the ticket.")); }
    busy = false; draw();
  });
  box.addEventListener("submit", async e => {
    e.preventDefault(); if (busy) return;
    const f = e.target, v = k => f.elements[k].value.trim();
    if (!/^\w{3,16}$/.test(v("username"))) return say("Enter a valid Minecraft username (3-16 letters, numbers or underscores).");
    if (v("title").length < 3) return say("Add a short title.");
    if (!v("topic")) return say("Choose a topic.");
    if (v("description").length < 10) return say("Please describe the problem (at least 10 characters).");
    busy = true; $("#tk-send").disabled = true; say("Sending...");
    try { const { error } = await auth.sb.rpc("submit_support_ticket", { p_username: v("username"), p_title: v("title"), p_topic: v("topic"), p_description: v("description") }); if (error) throw error; CP.toast("Ticket submitted"); view = "list"; busy = false; draw(); }
    catch (err) { busy = false; $("#tk-send").disabled = false; say(N.friendly(err, "Your ticket could not be sent. Please try again.")); }
  });
  draw();
});
})();
