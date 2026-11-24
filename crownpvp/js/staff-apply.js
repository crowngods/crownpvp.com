/* Staff application page.
   Signed-in players submit through Supabase (submit_staff_application) and the application lands in the
   Staff Dashboard > Applications tab, where staff press ACCEPT / DENY / REVIEW and write a description.
   Visitors who are not signed in are asked to sign in first, so every application can be handled in the dashboard. */
(() => {
  const { esc, date } = CP, N = CP.net;
  const form = document.querySelector("#staff-application");
  if (!form) return;

  const button = document.querySelector("#application-submit");
  const message = document.querySelector("#application-message");
  const myAppsBox = document.querySelector("#my-applications");
  const clearDraft = window.CrownForms.enhance(form, "staff");
  const box = document.createElement("div");
  message.after(box);

  /* ---------- progress bar ---------- */
  const bar = document.createElement("div");
  bar.className = "apply-progress";
  bar.innerHTML = `<div class="ap-top"><b>Application progress</b><span id="ap-count">0 / 0 required</span></div><div class="ap-track"><i id="ap-fill"></i></div>`;
  form.prepend(bar);
  const required = () => [...form.querySelectorAll("[required]")];
  function progress() {
    const list = required();
    let done = 0;
    const seen = new Set();
    for (const el of list) {
      if (el.type === "checkbox") { if (el.checked) done++; continue; }
      if (el.name && seen.has(el.name)) continue;
      if (el.name) seen.add(el.name);
      const v = (el.value || "").trim();
      const min = Number(el.getAttribute("minlength")) || 1;
      if (v.length >= min) done++;
    }
    const total = list.length;
    bar.querySelector("#ap-count").textContent = `${done} / ${total} required`;
    bar.querySelector("#ap-fill").style.width = Math.round((done / Math.max(1, total)) * 100) + "%";
    bar.classList.toggle("full", done >= total);
  }
  form.addEventListener("input", progress);
  form.addEventListener("change", progress);
  progress();

  /* ---------- status tracker ---------- */
  function tracker(status) {
    const reviewed = status === "under_review" || status === "approved" || status === "denied";
    const decided = status === "approved" || status === "denied";
    const end = status === "approved" ? "ok" : status === "denied" ? "no" : "";
    const label = status === "approved" ? "Accepted" : status === "denied" ? "Denied" : "Decision";
    return `<ol class="atrack" aria-label="Application progress">
      <li class="done"><i>✓</i><span>Submitted</span></li>
      <li class="${reviewed ? "done" : "now"}"><i>${reviewed ? "✓" : "2"}</i><span>Staff review</span></li>
      <li class="${decided ? "done " + end : status === "under_review" ? "now" : ""}"><i>${decided ? (status === "approved" ? "✓" : "✕") : "3"}</i><span>${label}</span></li>
    </ol>`;
  }

  function appCard(r) {
    return `<article class="kcase apply-card ${esc(r.status)}">
      <header>
        <div><b>APP-${r.id} &middot; ${esc(r.mc_username)}</b><small>Role: ${esc(r.role.toUpperCase())} &middot; Submitted ${date(Date.parse(r.created_at))}</small></div>
        ${r.status === "pending" ? `<span class="spill st-pending">Submitted</span>` : N.pill(r.status)}
      </header>
      ${tracker(r.status)}
      ${N.decision("appeal", r)}
      ${r.status === "pending" ? `<p class="dmuted">Waiting in the Staff Dashboard. You will get an alert on the bell when a staff member picks it up.</p>` : ""}
    </article>`;
  }

  let openApp = null;
  let lockUntil = 0;           /* 24-hour cooldown after the last submitted application */
  let lockTimer = null;
  const DAY = 24 * 60 * 60 * 1000;
  const isLocked = () => !!openApp || Date.now() < lockUntil;
  const left = ms => { const m = Math.max(1, Math.ceil(ms / 60000)); return `${Math.floor(m / 60)}h ${m % 60}m`; };

  async function renderMyApplications(auth) {
    if (!myAppsBox || !auth?.user) return;
    const { data, error } = await auth.sb.from("staff_applications").select("*").eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(10);
    openApp = null;
    if (error || !data?.length) { myAppsBox.innerHTML = ""; if (error) { setLocked(); } else { lockUntil = 0; setLocked(); } return; }
    openApp = data.find(r => r.status === "pending" || r.status === "under_review") || null;
    lockUntil = Math.max(0, Date.parse(data[0].created_at) + DAY) || 0;
    setLocked(openApp || data[0]);
    myAppsBox.innerHTML = `
      <div class="section-head" style="margin-bottom:14px;">
        <div><div class="eyebrow">APPLICATION STATUS</div><h3>Your Submitted Applications</h3></div>
      </div>
      <div class="clist">${data.map(appCard).join("")}</div>`;
  }

  function setLocked(app) {
    clearTimeout(lockTimer);
    const locked = isLocked();
    form.classList.toggle("is-locked", locked);
    let note = form.parentElement.querySelector(".apply-locked");
    if (locked) {
      if (!note) { note = document.createElement("div"); note.className = "apply-locked"; form.before(note); }
      const wait = Date.now() < lockUntil ? `You can apply again in <b>${left(lockUntil - Date.now())}</b>.` : "You can apply again once it is accepted or denied.";
      note.innerHTML = `<b>${app?.id ? `Application APP-${app.id} submitted.` : "Application submitted."}</b><span>${openApp ? "Staff are working through it. " : ""}${wait} Only one application is allowed every 24 hours.</span>`;
      lockTimer = setTimeout(() => setLocked(app), 60000);
    } else if (note) note.remove();
    button.disabled = locked;
    button.textContent = locked ? "APPLICATION SUBMITTED" : "SUBMIT APPLICATION";
  }

  /* ---------- sign-in gate (applications must reach the dashboard) ---------- */
  let gate = null;
  function showGate(on) {
    if (on && !gate) {
      gate = document.createElement("div");
      gate.className = "apply-gate";
      gate.innerHTML = `<div class="ag-ico" aria-hidden="true">🛡️</div><h3>Sign in to apply</h3>
        <p>Your application is sent straight to the <b>CrownPVP Staff Dashboard</b>, where management can ACCEPT, DENY or REVIEW it and leave you a note. You need a free website account so we can alert you when it is handled.</p>
        <div class="ag-btns"><a class="aq-btn aq-btn-red" href="login.html?tab=up&next=${encodeURIComponent("staff.html#apply")}"><span>Create account</span><small>Free · 1 minute</small></a><a class="aq-btn aq-btn-gold" href="login.html?next=${encodeURIComponent("staff.html#apply")}"><span>Log in</span><small>Already have one</small></a></div>`;
      form.before(gate);
    } else if (!on && gate) { gate.remove(); gate = null; }
    form.hidden = on;
  }

  function receipt(id, role) {
    document.querySelectorAll(".apply-receipt").forEach(n => n.remove());
    const el = document.createElement("div");
    el.className = "apply-receipt";
    el.innerHTML = `<div class="ar-badge">✓</div><div><span class="eyebrow">SUBMITTED</span><h3>Your application was submitted</h3>
      <p>Reference <b>APP-${id}</b> &middot; Role: <b>${esc(String(role || "").toUpperCase())}</b>. Staff will mark it <b>Under review</b>, then <b>Accepted</b> or <b>Denied</b> with a written note. You get a bell alert at every step. You can send another application in 24 hours.</p>${tracker("pending")}</div>`;
    return el;
  }

  CP.authReady.then(auth => {
    const signedIn = !!auth?.user;
    if (auth && !signedIn) showGate(true);

    if (signedIn && auth.profile?.username && !form.elements.name.value) form.elements.name.value = auth.profile.username;
    renderMyApplications(auth);
    auth?.on?.((evt, a) => {
      const now = !!a.user;
      showGate(!now);
      if (now) { if (a.profile?.username && !form.elements.name.value) form.elements.name.value = a.profile.username; renderMyApplications(a); }
      else { if (myAppsBox) myAppsBox.innerHTML = ""; openApp = null; lockUntil = 0; setLocked(null); }
    });

    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      if (!form.elements.confirm.checked) { message.textContent = "Please confirm the application details."; return; }
      if (isLocked()) { message.textContent = openApp ? `You already have APP-${openApp.id} waiting for review.` : `You can apply again in ${left(lockUntil - Date.now())}.`; return; }

      button.disabled = true;
      button.textContent = "SUBMITTING APPLICATION…";
      message.className = "form-message";
      message.textContent = "Sending to the Staff Dashboard…";
      box.innerHTML = "";

      const raw = Object.fromEntries(new FormData(form).entries());
      const compiledExperience = [
        `[Mic: ${raw.micStatus} | Recording: ${raw.canRecord}]`,
        `[Punishment History: ${raw.punishmentHistory}]`,
        raw.experience ? `Prior Staff/Plugins: ${raw.experience.trim()}` : "Prior Staff/Plugins: None listed"
      ].join("\n").slice(0, 1200);
      const compiledMotivation = [
        `[Why CrownPVP]\n${raw.motivation.trim()}`,
        `[Q1 · Hacked Clients & Anticheat]\n${raw.qCheats.trim()}`,
        `[Q2 · OpFactions & Raid Disputes]\n${raw.qFactions.trim()}`,
        `[Q3 · Staff Integrity & Impartiality]\n${raw.qIntegrity.trim()}`
      ].join("\n\n").slice(0, 2500);

      try {
        if (auth?.user) {
          const args = {
            p_mc_username: raw.name.trim(), p_discord: raw.discord.trim(), p_role: raw.role, p_age_band: raw.ageBand,
            p_timezone: raw.timezone.trim(), p_availability: raw.availability, p_experience: compiledExperience, p_motivation: compiledMotivation
          };
          let { data: appId, error } = await auth.sb.rpc("submit_staff_application", args);
          /* Real answers like "You already have an open application" use code P0001 and must be shown as-is.
             Anything else (permission / schema / policy problems) gets one more try straight into the table,
             which every signed-in player is allowed to do once supabase/fix-staff-applications.sql has been run. */
          if (error && error.code !== "P0001") {
            console.warn("submit_staff_application failed, trying direct insert:", error);
            const direct = await auth.sb.from("staff_applications").insert({
              user_id: auth.user.id, account_name: auth.profile?.username || args.p_mc_username,
              mc_username: args.p_mc_username, discord: args.p_discord, role: args.p_role, age_band: args.p_age_band,
              timezone: args.p_timezone, availability: args.p_availability, experience: args.p_experience, motivation: args.p_motivation,
              status: "pending"
            }).select("id").single();
            if (!direct.error && direct.data?.id) { appId = direct.data.id; error = null; }
            else error.directError = direct.error;
          }
          if (error) throw error;
          const role = raw.role;
          form.reset(); clearDraft(); progress();
          message.textContent = "";
          const r = receipt(appId, role);
          form.before(r);
          r.scrollIntoView({ behavior: "smooth", block: "center" });
          lockUntil = Date.now() + DAY;
          CP.toast(`Application APP-${appId} submitted!`);
          await renderMyApplications(auth);
        } else {
          /* Supabase accounts are not available on this deployment: keep the older private-inbox path. */
          const payload = { name: raw.name.trim(), discord: raw.discord.trim(), role: raw.role, ageBand: raw.ageBand, timezone: raw.timezone.trim(), availability: raw.availability, experience: compiledExperience, motivation: compiledMotivation };
          const res = await window.CrownForms.send("applications", payload);
          if (res.ok) { form.reset(); clearDraft(); progress(); message.textContent = `Application #${res.data.id} submitted!`; message.classList.add("success"); }
          else {
            window.CrownForms.keep("applications", payload); form.reset(); clearDraft(); progress();
            message.textContent = "Application saved. Copy and send it in a Discord ticket below."; message.classList.add("success");
            window.CrownForms.offlinePanel(box, "applications", payload, () => { message.textContent = ""; });
          }
        }
      } catch (error) {
        console.error("Staff application failed:", error, error?.directError);
        const detail = String(error?.message || "");
        const code = error?.code ? ` [${error.code}]` : "";
        if (error?.code === "P0001" || /Sign in first|JWT|Failed to fetch|NetworkError/i.test(detail)) {
          message.textContent = N.friendly(error, detail);
        } else {
          /* Database problem on our side: tell the applicant plainly, show the real reason, and never lose their answers. */
          message.textContent = `We could not save your application on the website right now${code}. Your answers are kept below: copy them into a Discord ticket so you can still apply. The owner has been given the exact reason in the browser console.`;
          const payload = { name: raw.name.trim(), discord: raw.discord.trim(), role: raw.role, ageBand: raw.ageBand, timezone: raw.timezone.trim(), availability: raw.availability, experience: compiledExperience, motivation: compiledMotivation };
          try { window.CrownForms.keep("applications", payload); window.CrownForms.offlinePanel(box, "applications", payload, () => { message.textContent = ""; }); } catch {}
          const why = document.createElement("small");
          why.className = "dmuted";
          why.style.cssText = "display:block;margin-top:8px;opacity:.75;word-break:break-word";
          why.textContent = `Owner info: ${detail}${error?.directError?.message ? " | direct: " + error.directError.message : ""} — run supabase/fix-staff-applications.sql in Supabase.`;
          box.appendChild(why);
        }
        message.classList.remove("success");
      } finally {
        setLocked(openApp);
      }
    });
  });
})();
