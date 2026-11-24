(() => {
const { $, esc, date } = CP, box = $("#al");
const gate = () => { box.innerHTML = `<div class="card gate"><h3>Sign in to see your alerts</h3><p>Staff messages and updates show up here once you have an account.</p><p style="margin-top:18px"><a class="btn" style="width:auto" href="login.html?next=alerts.html">Sign in or create an account</a></p></div>`; };

CP.authReady.then(auth => {
  if (!auth) { box.innerHTML = `<div class="card gate"><h3>Accounts are not set up yet</h3><p>The site owner still needs to finish the account setup (see the README).</p></div>`; return; }
  const draw = async () => {
    if (!auth.user) return gate();
    let items = [];
    try { items = await auth.alerts(100); } catch { box.innerHTML = `<div class="empty"><h3>Alerts are unavailable right now</h3><p style="margin-top:8px">Please try again in a moment.</p></div>`; return; }
    const unread = items.filter(a => !a.read).length;
    box.innerHTML = `<div class="alpage"><div class="alpbar"><span>${items.length ? `${items.length} alert${items.length === 1 ? "" : "s"}${unread ? ` &middot; ${unread} unread` : ""}` : ""}</span>${unread ? `<button class="btn ghost" style="width:auto" data-readall>Mark all read</button>` : ""}</div>
    ${items.length ? `<div class="allist">${items.map(a => `<a class="ali${a.read ? "" : " un"}" href="${esc(auth.safeLink(a.link) || "#")}" data-id="${a.id}"><b>${esc(a.title)}</b>${a.body ? `<span>${esc(a.body)}</span>` : ""}<time>${date(Date.parse(a.created_at))}</time></a>`).join("")}</div>` : `<div class="empty"><h3>No alerts yet</h3><p style="margin-top:8px">When staff message you, it shows up here and on the bell in the menu.</p></div>`}
    ${auth.profile?.is_staff ? staffForm() : ""}</div>`;
  };
  const staffForm = () => `<form class="card staffbox" id="f-send"><h3>Send an alert (staff)</h3>
    <label class="cu" for="s-to">To (username, or leave empty to send to everyone)</label><input class="fi" id="s-to" maxlength="16" autocomplete="off" spellcheck="false">
    <label class="cu" for="s-title">Title</label><input class="fi" id="s-title" maxlength="120" required>
    <label class="cu" for="s-body">Message (optional)</label><textarea class="fi" id="s-body" maxlength="500" rows="3"></textarea>
    <label class="cu" for="s-link">Link (optional, https://... or a page like store.html)</label><input class="fi" id="s-link" maxlength="300" autocomplete="off">
    <button class="btn wide" type="submit">Send alert</button><p id="s-msg" class="cm" aria-live="polite"></p></form>`;

  box.addEventListener("click", async e => {
    if (e.target.closest("[data-readall]")) { await auth.markRead(); return draw(); }
    const it = e.target.closest(".ali[data-id]");
    if (it) { const href = it.getAttribute("href"); if (!it.classList.contains("un") && href === "#") return e.preventDefault(); e.preventDefault(); try { await auth.markRead([Number(it.dataset.id)]); } catch { /* ignore */ } if (href && href !== "#") location.href = href; else draw(); }
  });
  box.addEventListener("submit", async e => {
    if (e.target.id !== "f-send") return;
    e.preventDefault();
    const to = $("#s-to").value.trim(), title = $("#s-title").value.trim(), body = $("#s-body").value.trim(), link = $("#s-link").value.trim(), m = $("#s-msg");
    const say = (t, ok) => { m.className = "cm " + (ok ? "okm" : "errm"); m.textContent = t; };
    if (link && !auth.safeLink(link)) return say("The link must start with https:// or be a page name like store.html.");
    if (to && !/^\w{3,16}$/.test(to)) return say("That is not a valid username.");
    if (!to && !confirm("Send this alert to EVERYONE with an account?")) return;
    const btn = e.target.querySelector("button[type=submit]"); btn.disabled = true;
    const { data, error } = to ? await auth.sb.rpc("send_alert", { target: to, p_title: title, p_body: body, p_link: link || null })
                               : await auth.sb.rpc("broadcast_alert", { p_title: title, p_body: body, p_link: link || null });
    btn.disabled = false;
    if (error) return say(/staff only/i.test(error.message) ? "Only staff can send alerts." : /no account/i.test(error.message) ? "No account with that username." : "Could not send the alert.");
    say(to ? `Alert sent to ${to}.` : `Alert sent to ${data} account${data === 1 ? "" : "s"}.`, true);
    e.target.reset();
  });
  auth.on(evt => { if (evt === "SIGNED_OUT") gate(); });
  draw();
});
})();
