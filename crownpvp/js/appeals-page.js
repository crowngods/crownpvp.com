/* CrownPVP ban appeals. Separate from reports. Players send an appeal and follow the status and staff decision.
   Who can read what is enforced by the database (supabase/network-upgrade.sql), not by this file. */
(() => {
const { $, $$, esc, date } = CP, N = CP.net, box = $("#ap-app");
const qs = new URLSearchParams(location.search);
let tab = qs.get("tab") === "mine" ? "mine" : "new", chosen = [], busy = false;
const pre = { type: ["ban", "mute", "other"].includes(qs.get("type")) ? qs.get("type") : "ban", id: /^\d{1,12}$/.test(qs.get("id") || "") ? qs.get("id") : "", name: /^\w{3,16}$/.test(qs.get("name") || "") ? qs.get("name") : "" };
const bytes = n => n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";
const TYPE = { ban: "Ban", mute: "Mute", other: "Other" };

function formHtml(a, auth) {
  const mc = pre.name || (/^\w{3,16}$/.test(auth.profile?.username || "") ? auth.profile.username : "");
  return `<form class="kcard kform" id="af" novalidate>
  <div class="kform-h"><div><span class="keyebrow">PUNISHMENT APPEAL</span><h2>Appeal a punishment</h2></div>${N.can(a, "appeals_view") ? `<a class="btn ghost sm" href="dashboard.html#appeals">Staff dashboard</a>` : ""}</div>
  <div class="two">
    <label>Minecraft username<small>The punished account</small><input class="fi" name="mc" maxlength="16" required autocomplete="off" spellcheck="false" value="${esc(mc)}"></label>
    <label>What are you appealing?<small>Type of punishment</small><select class="fi" name="ptype" required>${["ban", "mute", "other"].map(k => `<option value="${k}"${pre.type === k ? " selected" : ""}>${TYPE[k]}</option>`).join("")}</select></label>
  </div>
  <label>Punishment ID<small>Optional. Find it on the <a href="punishments.html">Punishments page</a> (click your punishment).</small><input class="fi" name="pid" inputmode="numeric" maxlength="12" autocomplete="off" value="${esc(pre.id)}" placeholder="e.g. 1042"></label>
  <div class="plook" id="af-look" aria-live="polite"></div>
  <label>Reason shown for your punishment<small>Copy the reason from the Punishments page.</small><input class="fi" name="preason" maxlength="300" required></label>
  <label>Why should your punishment be reconsidered?<small>At least 30 characters. Be honest and specific.</small><textarea class="fi" name="why" rows="5" minlength="30" maxlength="2000" required></textarea><span class="cnt" id="af-cnt">0 / 2000</span></label>
  <label>Additional explanation<small>Optional. Anything else staff should know.</small><textarea class="fi" name="extra" rows="3" maxlength="2000"></textarea></label>
  <fieldset class="kfs"><legend>Evidence / supporting links</legend>
    <label>Links<small>One https:// link per line. Up to 5.</small><textarea class="fi" name="links" rows="3" placeholder="https://"></textarea></label>
    <div class="drop"><label class="dropl" for="af-files"><b>Upload screenshots or a short clip</b><small>PNG, JPG, WEBP, GIF, MP4 or WEBM &middot; up to ${N.MAX_FILES} files &middot; 25 MB each</small></label>
    <input id="af-files" type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm"><ul class="flist" id="af-list"></ul></div>
  </fieldset>
  <p class="kmsg" id="af-msg" role="status" aria-live="polite"></p>
  <button class="btn gold wide" type="submit" id="af-btn">Submit appeal</button>
  <small class="knote">You can have one open appeal at a time. Only you and authorised staff can read it. Do not open a second appeal for the same punishment.</small></form>`;
}
const say = (t, ok) => { const m = $("#af-msg"); if (!m) return; m.className = "kmsg " + (ok ? "ok" : t ? "err" : ""); m.textContent = t; };
const fileList = () => { $("#af-list").innerHTML = chosen.map((f, i) => `<li><span>${esc(f.name)} <small>${bytes(f.size)}</small></span><button type="button" data-rm="${i}" aria-label="Remove ${esc(f.name)}">&times;</button></li>`).join(""); };

function card(r) {
  return `<article class="kcase" data-id="${r.id}"><header><div><b>APL-${r.id} &middot; ${esc(r.mc_username)}</b><small>${TYPE[r.punishment_type]} appeal${r.punishment_id ? ` &middot; #${r.punishment_id}` : ""} &middot; ${date(Date.parse(r.created_at))}</small></div>${N.pill(r.status)}</header>
  ${N.decision("appeal", r)}
  <details data-extra><summary>Your appeal, evidence and history</summary><dl class="kv"><dt>Punishment reason</dt><dd>${esc(r.punishment_reason)}</dd><dt>Your explanation</dt><dd class="pre">${esc(r.reconsider_reason)}</dd>${r.additional ? `<dt>Additional</dt><dd class="pre">${esc(r.additional)}</dd>` : ""}</dl><div class="xbody"><p class="dmuted">Loading&hellip;</p></div></details></article>`;
}
async function mineHtml(auth) {
  const { data, error } = await auth.sb.from("ban_appeals").select("*").eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(50);
  if (error) throw error;
  return data.length ? `<div class="clist">${data.map(card).join("")}</div>` : `<div class="empty"><h3>No appeals yet</h3><p style="margin-top:8px">Appeals you send appear here with their status and the staff decision.</p></div>`;
}

CP.authReady.then(auth => {
  if (!auth) { box.innerHTML = N.unavailable; $$("[data-discord]", box).forEach(a => { a.href = window.CROWN.discord; a.target = "_blank"; a.rel = "noopener"; }); return; }
  const tabBtn = (id, l) => `<button type="button" role="tab" data-tab="${id}" aria-selected="${tab === id}" class="${tab === id ? "on" : ""}">${l}</button>`;
  async function draw() {
    if (!auth.user) { box.innerHTML = N.gate("Sign in to appeal", "You need a CrownPVP account so staff can reply to you and you can follow your appeal.", "appeals.html"); return; }
    const a = await N.access(auth);
    box.innerHTML = `<div class="kpage"><div class="ktabs" role="tablist">${tabBtn("new", "New appeal")}${tabBtn("mine", "My appeals")}</div><div id="ap-body"><div class="skel"><i></i><i></i></div></div></div>`;
    const body = $("#ap-body"); chosen = [];
    try {
      if (tab === "new") {
        const { data, error } = await auth.sb.from("ban_appeals").select("id,created_at,status").eq("user_id", auth.user.id).in("status", ["pending", "under_review"]).limit(1);
        if (error) throw error;
        if (data.length) { body.innerHTML = `<div class="kcard kdone"><div class="tick wait" aria-hidden="true">&hellip;</div><h2>Your appeal is waiting</h2><p><b class="ref">APL-${data[0].id}</b> was sent on ${date(Date.parse(data[0].created_at))} and is ${esc(N.statusName(data[0].status).toLowerCase())}. You can send a new appeal once staff decide.</p><div class="kactions"><button class="btn" type="button" data-mine>View my appeals</button></div></div>`; return; }
        body.innerHTML = formHtml(a, auth); lookup(); return;
      }
      body.innerHTML = await mineHtml(auth);
    } catch (e) { console.error(e); body.innerHTML = `<div class="empty"><h3>Appeals are unavailable</h3><p style="margin-top:8px">${esc(N.friendly(e, "Please try again in a moment."))}</p></div>`; }
  }

  /* Looks the punishment up in the published LiteBans data so the player can confirm it is the right one. Staff always see the live record themselves. */
  let seq = 0;
  async function lookup() {
    const f = $("#af"), out = $("#af-look"); if (!f || !out) return;
    const id = Number(f.elements.pid.value.trim()), type = f.elements.ptype.value, my = ++seq;
    if (!f.elements.pid.value.trim()) { out.innerHTML = ""; return; }
    if (!(id > 0) || !/^\d+$/.test(f.elements.pid.value.trim())) { out.innerHTML = `<p class="kmsg err">The punishment ID must be a number.</p>`; return; }
    if (type === "other") { out.innerHTML = ""; return; }
    out.innerHTML = `<p class="dmuted">Checking punishment #${id}&hellip;</p>`;
    try {
      const p = await N.findPunishment(type, id); if (my !== seq) return;
      if (!p) { out.innerHTML = `<p class="kmsg err">No ${type} with ID ${id} was found. Check the ID on the Punishments page, or leave it empty.</p>`; return; }
      const mine = f.elements.mc.value.trim().toLowerCase();
      out.innerHTML = `<div class="pfound"><b>Found ${esc(type)} #${id}</b>${mine && p.name.toLowerCase() !== mine ? `<p class="kmsg err">This punishment belongs to ${esc(p.name)}, not ${esc(f.elements.mc.value.trim())}.</p>` : ""}${N.punishmentHtml(p)}</div>`;
      if (!f.elements.preason.value.trim()) f.elements.preason.value = CP.clean(p.reason).slice(0, 300);
      if (!f.elements.mc.value.trim()) f.elements.mc.value = p.name;
    } catch (e) { if (my === seq) out.innerHTML = `<p class="dmuted">Could not check this ID right now. You can still send your appeal; staff will verify it.</p>`; }
  }

  let deb;
  box.addEventListener("click", e => {
    const t = e.target.closest("[data-tab]"); if (t) { tab = t.dataset.tab; return draw(); }
    const rm = e.target.closest("[data-rm]"); if (rm) { chosen.splice(Number(rm.dataset.rm), 1); fileList(); return; }
    if (e.target.closest("[data-mine]")) { tab = "mine"; return draw(); }
  });
  box.addEventListener("input", e => {
    if (e.target.name === "why") $("#af-cnt").textContent = `${e.target.value.length} / 2000`;
    if (e.target.name === "pid") { clearTimeout(deb); deb = setTimeout(lookup, 350); }
  });
  box.addEventListener("change", e => {
    if (e.target.name === "ptype") return lookup();
    if (e.target.id !== "af-files") return;
    const next = [...chosen]; for (const f of e.target.files) if (!next.some(x => x.name === f.name && x.size === f.size)) next.push(f);
    e.target.value = "";
    const err = N.checkFiles(next); if (err) { say(err); return; }
    chosen = next; say(""); fileList();
  });
  box.addEventListener("toggle", async e => {
    const d = e.target; if (!d.matches?.("details[data-extra]") || !d.open || d.dataset.loaded) return;
    d.dataset.loaded = "1";
    const id = Number(d.closest(".kcase").dataset.id), x = d.querySelector(".xbody");
    try { const { data } = await auth.sb.from("ban_appeals").select("*").eq("id", id).single(); x.innerHTML = await N.extras(auth.sb, "appeal", data); }
    catch (err) { d.dataset.loaded = ""; x.innerHTML = `<p class="dmuted">${esc(N.friendly(err, "Could not load this appeal."))}</p>`; }
  }, true);

  box.addEventListener("submit", async e => {
    if (e.target.id !== "af") return;
    e.preventDefault(); if (busy) return;
    const f = e.target, v = n => f.elements[n].value.trim(), btn = $("#af-btn");
    if (!/^[A-Za-z0-9_]{3,16}$/.test(v("mc"))) return say("Enter a valid Minecraft username (3-16 letters, numbers or underscores).");
    const ptype = v("ptype"); if (!["ban", "mute", "other"].includes(ptype)) return say("Choose what you are appealing.");
    if (v("pid") && !/^[1-9]\d{0,11}$/.test(v("pid"))) return say("The punishment ID must be a positive number, or leave it empty.");
    if (v("preason").length < 3) return say("Enter the reason shown for your punishment.");
    if (v("why").length < 30) return say(`Explain why it should be reconsidered in at least 30 characters (${v("why").length} so far).`);
    const pl = N.parseLinks(v("links")); if (pl.error) return say(pl.error);
    const fe = N.checkFiles(chosen); if (fe) return say(fe);
    busy = true; btn.disabled = true; btn.textContent = "Submitting\u2026"; say("");
    try {
      let files = [];
      if (chosen.length) files = await N.uploadFiles(auth.sb, auth.user.id, chosen, (i, n) => { btn.textContent = `Uploading evidence ${i}/${n}\u2026`; });
      btn.textContent = "Sending appeal\u2026";
      const { data, error } = await auth.sb.rpc("submit_ban_appeal", { p_mc_username: v("mc"), p_type: ptype, p_punishment_id: v("pid") ? Number(v("pid")) : null, p_punishment_reason: v("preason"), p_reconsider: v("why"), p_additional: v("extra"), p_links: pl.links, p_files: files });
      if (error) throw error;
      CP.toast("Appeal submitted");
      $("#ap-body").innerHTML = `<div class="kcard kdone"><div class="tick" aria-hidden="true">&#10003;</div><h2>Appeal submitted</h2><p>Your reference is <b class="ref">APL-${esc(String(data))}</b>. Staff will review it and you will get an alert on the bell with their decision.</p><div class="kactions"><button class="btn" type="button" data-mine>View my appeals</button></div></div>`;
    } catch (err) {
      console.error("Appeal error", err);
      say(N.friendly(err, "Your appeal could not be sent. Nothing was saved. Please try again."));
      btn.disabled = false; btn.textContent = "Submit appeal";
    } finally { busy = false; }
  });

  let uid = auth.user?.id || null;
  auth.on(() => { const now = auth.user?.id || null; if (now !== uid) { uid = now; draw(); } });
  draw();
});
})();
