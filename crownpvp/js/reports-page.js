/* CrownPVP player reports. Players send a report (with link and file evidence) and follow its status and staff decision.
   Who can read what is enforced by the database (supabase/network-upgrade.sql), not by this file. */
(() => {
const { $, $$, esc, date } = CP, N = CP.net, box = $("#rp-app");
const GAMEMODES = ["Factions", "SkyBlock", "Survival", "KitPvP", "Other"];
const CATEGORIES = ["Hacking / Cheating", "Abusing Bugs", "Scamming", "Inappropriate Behaviour", "Exploiting", "Other"];
let tab = new URLSearchParams(location.search).get("tab") === "mine" ? "mine" : "new", chosen = [], busy = false;

const opts = (list, ph) => `<option value="">${ph}</option>${list.map(v => `<option>${esc(v)}</option>`).join("")}`;
const bytes = n => n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";

const prefill = (/^\w{3,16}$/.test(new URLSearchParams(location.search).get("player") || "") ? new URLSearchParams(location.search).get("player") : "");
function formHtml(a) {
  return `<form class="kcard kform" id="rf" novalidate>
  <div class="kform-h"><div><span class="keyebrow">NEW REPORT</span><h2>Report a player</h2></div>${N.can(a, "reports_view") ? `<a class="btn ghost sm" href="dashboard.html">Staff dashboard</a>` : ""}</div>
  <div class="two">
    <label>Reported player<small>Exact Minecraft username</small><input class="fi" name="player" maxlength="16" required autocomplete="off" spellcheck="false" placeholder="e.g. Notch" value="${esc(prefill)}"></label>
    <label>Gamemode<small>Where did it happen?</small><select class="fi" name="gamemode" required>${opts(GAMEMODES, "Choose a gamemode")}</select></label>
  </div>
  <label>Report category<small>Pick the closest match</small><select class="fi" name="category" required>${opts(CATEGORIES, "Choose a category")}</select></label>
  <label>Detailed explanation<small>What happened, when, and where? Minimum 20 characters.</small><textarea class="fi" name="details" rows="7" minlength="20" maxlength="3000" required placeholder="Describe the incident, including the approximate time and any coordinates or faction names involved."></textarea><span class="cnt" id="rf-cnt">0 / 3000</span></label>
  <fieldset class="kfs"><legend>Evidence</legend>
    <label>Video or screenshot links<small>One https:// link per line (YouTube, Medal, Streamable, Imgur). Up to 5.</small><textarea class="fi" name="links" rows="3" placeholder="https://"></textarea></label>
    <div class="drop"><label class="dropl" for="rf-files"><b>Upload screenshots or a short clip</b><small>PNG, JPG, WEBP, GIF, MP4 or WEBM &middot; up to ${N.MAX_FILES} files &middot; 25 MB each</small></label>
    <input id="rf-files" type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm"><ul class="flist" id="rf-list"></ul></div>
  </fieldset>
  <p class="kmsg" id="rf-msg" role="status" aria-live="polite"></p>
  <button class="btn gold wide" type="submit" id="rf-btn">Submit report</button>
  <small class="knote">Only you and authorised CrownPVP staff can read your report and evidence. Reports are never shown publicly.</small></form>`;
}
function fileList() {
  $("#rf-list").innerHTML = chosen.map((f, i) => `<li><span>${esc(f.name)} <small>${bytes(f.size)}</small></span><button type="button" data-rm="${i}" aria-label="Remove ${esc(f.name)}">&times;</button></li>`).join("");
}
const say = (t, ok) => { const m = $("#rf-msg"); if (!m) return; m.className = "kmsg " + (ok ? "ok" : t ? "err" : ""); m.textContent = t; };

function card(r) {
  return `<article class="kcase" data-id="${r.id}"><header><div><b>RPT-${r.id} &middot; ${esc(r.reported_player)}</b><small>${esc(r.gamemode)} &middot; ${esc(r.category)} &middot; ${date(Date.parse(r.created_at))}</small></div>${N.pill(r.status)}</header>
  ${N.decision("report", r)}
  <details data-extra><summary>Details, evidence and history</summary><p class="pre">${esc(r.details)}</p><div class="xbody"><p class="dmuted">Loading&hellip;</p></div></details></article>`;
}
async function mineHtml(auth) {
  const { data, error } = await auth.sb.from("player_reports").select("*").eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(50);
  if (error) throw error;
  return data.length ? `<div class="clist">${data.map(card).join("")}</div>` : `<div class="empty"><h3>No reports yet</h3><p style="margin-top:8px">Reports you send appear here with their status and the staff decision.</p></div>`;
}

CP.authReady.then(auth => {
  if (!auth) { box.innerHTML = N.unavailable; $$("[data-discord]", box).forEach(a => { a.href = window.CROWN.discord; a.target = "_blank"; a.rel = "noopener"; }); return; }
  const tabBtn = (id, l) => `<button type="button" role="tab" data-tab="${id}" aria-selected="${tab === id}" class="${tab === id ? "on" : ""}">${l}</button>`;
  async function draw() {
    if (!auth.user) { box.innerHTML = N.gate("Sign in to send a report", "Reports are linked to your account so staff can follow up and you can see their decision.", "support.html"); return; }
    const a = await N.access(auth);
    box.innerHTML = `<div class="kpage"><div class="ktabs" role="tablist">${tabBtn("new", "New report")}${tabBtn("mine", "My reports")}</div><div id="rp-body"><div class="skel"><i></i><i></i></div></div></div>`;
    const body = $("#rp-body");
    if (tab === "new") { body.innerHTML = formHtml(a); chosen = []; return; }
    try { body.innerHTML = await mineHtml(auth); } catch (e) { console.error(e); body.innerHTML = `<div class="empty"><h3>Reports are unavailable</h3><p style="margin-top:8px">${esc(N.friendly(e, "Please try again in a moment."))}</p></div>`; }
  }

  box.addEventListener("click", e => {
    const t = e.target.closest("[data-tab]"); if (t) { tab = t.dataset.tab; return draw(); }
    const rm = e.target.closest("[data-rm]"); if (rm) { chosen.splice(Number(rm.dataset.rm), 1); fileList(); return; }
    if (e.target.closest("[data-again]")) { tab = "new"; return draw(); }
    if (e.target.closest("[data-mine]")) { tab = "mine"; return draw(); }
  });
  box.addEventListener("input", e => { if (e.target.name === "details") $("#rf-cnt").textContent = `${e.target.value.length} / 3000`; });
  box.addEventListener("change", e => {
    if (e.target.id !== "rf-files") return;
    const next = [...chosen]; for (const f of e.target.files) if (!next.some(x => x.name === f.name && x.size === f.size)) next.push(f);
    e.target.value = "";
    const err = N.checkFiles(next); if (err) { say(err); return; }
    chosen = next; say(""); fileList();
  });
  box.addEventListener("toggle", async e => {
    const d = e.target; if (!d.matches?.("details[data-extra]") || !d.open || d.dataset.loaded) return;
    d.dataset.loaded = "1";
    const id = Number(d.closest(".kcase").dataset.id), x = d.querySelector(".xbody");
    try { const { data } = await auth.sb.from("player_reports").select("*").eq("id", id).single(); x.innerHTML = await N.extras(auth.sb, "report", data); }
    catch (err) { d.dataset.loaded = ""; x.innerHTML = `<p class="dmuted">${esc(N.friendly(err, "Could not load this report."))}</p>`; }
  }, true);

  box.addEventListener("submit", async e => {
    if (e.target.id !== "rf") return;
    e.preventDefault(); if (busy) return;
    const f = e.target, v = n => f.elements[n].value.trim(), btn = $("#rf-btn");
    const player = v("player"), details = v("details");
    if (!/^[A-Za-z0-9_]{3,16}$/.test(player)) return say("Enter a valid Minecraft username (3-16 letters, numbers or underscores).");
    if (auth.profile?.username && player.toLowerCase() === auth.profile.username.toLowerCase()) return say("You cannot report yourself.");
    if (!GAMEMODES.includes(v("gamemode"))) return say("Choose a gamemode.");
    if (!CATEGORIES.includes(v("category"))) return say("Choose a report category.");
    if (details.length < 20) return say(`Your explanation needs at least 20 characters (${details.length} so far).`);
    const pl = N.parseLinks(v("links")); if (pl.error) return say(pl.error);
    const fe = N.checkFiles(chosen); if (fe) return say(fe);
    busy = true; btn.disabled = true; btn.textContent = "Submitting\u2026"; say("");
    try {
      let files = [];
      if (chosen.length) files = await N.uploadFiles(auth.sb, auth.user.id, chosen, (i, n) => { btn.textContent = `Uploading evidence ${i}/${n}\u2026`; });
      btn.textContent = "Sending report\u2026";
      const { data, error } = await auth.sb.rpc("submit_player_report", { p_player: player, p_gamemode: v("gamemode"), p_category: v("category"), p_details: details, p_links: pl.links, p_files: files });
      if (error) throw error;
      CP.toast("Report submitted");
      $("#rp-body").innerHTML = `<div class="kcard kdone"><div class="tick" aria-hidden="true">&#10003;</div><h2>Report submitted</h2><p>Your reference is <b class="ref">RPT-${esc(String(data))}</b>. Staff will review it and you will get an alert on the bell when a decision is made.</p><div class="kactions"><button class="btn" type="button" data-mine>View my reports</button><button class="btn ghost" type="button" data-again>Send another</button></div></div>`;
    } catch (err) {
      console.error("Report error", err);
      say(N.friendly(err, "Your report could not be sent. Nothing was saved. Please try again."));
      btn.disabled = false; btn.textContent = "Submit report";
    } finally { busy = false; }
  });

  let uid = auth.user?.id || null; // redraw only when the person really changed, never on a silent token refresh
  auth.on(() => { const now = auth.user?.id || null; if (now !== uid) { uid = now; draw(); } });
  draw();
});
})();
