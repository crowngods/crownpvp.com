(() => {
const { $, esc, api, date, ago, clean, head, ready, pill, expires, loginUrl, MS, toast } = CP;
const box = $("#acc");
const errors = {
  cancelled: "Sign-in was cancelled. You can try again whenever you like.",
  failed: "Something went wrong while signing in. Please try again.",
  not_configured: "Microsoft sign-in is not set up on this site yet. The site owner needs to finish the setup in the README.",
  no_xbox: "That Microsoft account has no Xbox profile yet. Sign in once at minecraft.net or xbox.com to create it, then try again.",
  child: "That is a child account. An adult in the Microsoft family group has to allow online play first.",
  region: "Xbox services are not available for that account's region.",
  no_java: "We could not find Minecraft: Java Edition on that Microsoft account. Make sure you picked the account that owns the game.",
  app_not_approved: "Mojang has not approved this site's Microsoft sign-in yet. The site owner needs to finish step 4 of the setup in the README."
};
const code = new URLSearchParams(location.search).get("error");
if (code) { const e = $("#err"); e.hidden = false; e.textContent = errors[code] || errors.failed; }
const wordOf = { ban: "Ban", mute: "Mute", kick: "Kick", warn: "Warning" };

ready.then(async s => {
  if (!s.user) {
    box.innerHTML = `<div class="two"><div class="card gate"><h3>Sign in with Microsoft</h3><p>Use the Microsoft account you play Minecraft with.</p>
      <p style="margin-top:18px"><a class="btn ms" href="${loginUrl()}">${MS}<span>Sign in with Microsoft</span></a></p></div>
      <div class="card"><h3>What we check</h3><ul class="ticks"><li>The account owns <b>Minecraft: Java Edition</b></li><li>Your current <b>username and UUID</b>, so purchases and appeals go to the right player</li><li>Your <b>punishment record</b>, shown only to you</li></ul>
      <p class="cs">You sign in on Microsoft's own page. CrownPVP never sees your password and does not store any Microsoft or Xbox tokens.</p></div></div>`;
    $(".ms", box).onclick = e => { if (!s.up) { e.preventDefault(); toast("Sign-in needs the CrownPVP backend. See the README."); } };
    return;
  }
  try {
    const d = await api("/account"), u = d.user;
    const act = d.punishments.filter(p => p.status === "active" && (p.type === "ban" || p.type === "mute"));
    const openA = d.appeals.filter(a => a.status === "open").length;
    box.innerHTML = `<div class="prof"><img class="bd3" src="https://mc-heads.net/body/${encodeURIComponent(u.uuid)}/220" alt="Your Minecraft skin" height="220"><div class="pi"><small>Minecraft: Java Edition</small><h2>${esc(u.name)}</h2><code class="uu">${esc(u.uuid)}</code>${u.staff ? `<span class="tag">Staff</span>` : ""}
      <ul class="checks"><li class="ok"><i>&#10003;</i><span><b>Signed in with Microsoft</b><small>Your Microsoft account is linked to this session.</small></span></li>
      <li class="ok"><i>&#10003;</i><span><b>Owns Minecraft: Java Edition</b><small>We confirmed this username with Mojang's services.</small></span></li>
      <li class="${act.length ? "bad" : "ok"}"><i>${act.length ? "!" : "&#10003;"}</i><span><b>${act.length ? `${act.length} active ${act.length === 1 ? "punishment" : "punishments"}` : "No active punishments"}</b><small>${act.length ? `You can appeal on the <a href="appeals.html">Appeals page</a>.` : "Your record is clean right now."}</small></span></li></ul>
      <div class="row2"><a class="btn" href="store.html">Open the store</a><a class="btn ghost" href="appeals.html">Appeals${openA ? ` (${openA} open)` : ""}</a><button class="btn ghost" data-out>Sign out</button></div></div></div>
      <h2 class="h2">Your punishment record</h2>
      ${d.punishments.length ? `<div class="tbw2"><table class="pt"><thead><tr><th>Type</th><th>Reason</th><th>Date</th><th>Expires</th></tr></thead><tbody>${d.punishments.map(p => `<tr><td data-l="Type"><b>${wordOf[p.type]}</b></td><td data-l="Reason" class="rs">${esc(clean(p.reason)) || "<i>No reason given</i>"}</td><td data-l="Date" class="dt">${date(p.time)}</td><td data-l="Expires" class="dt">${expires(p)}${pill(p)}</td></tr>`).join("")}</tbody></table></div>` : `<div class="empty"><p>Nothing on record for ${esc(u.name)}.</p></div>`}`;
    $("[data-out]", box).onclick = () => api("/auth/logout", { method: "POST", body: {} }).catch(() => {}).finally(() => location.href = "/");
  } catch (e) { box.innerHTML = `<div class="empty"><h3>Your account details are unavailable</h3><p style="margin-top:8px">${esc(e.message)}</p></div>`; }
});
})();
