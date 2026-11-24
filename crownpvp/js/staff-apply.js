/* CrownPVP staff application form.
   Signed-in players send the application to the staff dashboard (supabase/staff-applications.sql). It starts as REVIEWING;
   staff then accept or deny it and the applicant is alerted. The applicant follows the status in the panel above the form.
   Who may read or decide an application is enforced by the database, never by this file.
   If accounts are not connected at all, the old behaviour is kept: the application is saved on the device and can be copied to Discord. */
(() => {
  const form = document.querySelector("#staff-application");
  if (!form) return;

  const { $, esc, date } = CP, N = CP.net;
  const button = document.querySelector("#application-submit");
  const message = document.querySelector("#application-message");
  const mine = document.querySelector("#my-application");
  const clearDraft = window.CrownForms.enhance(form, "staff");
  const box = document.createElement("div");
  message.after(box);
  let auth = null, busy = false;

  const say = (text, ok) => { message.className = "form-message" + (ok ? " success" : ""); message.textContent = text; };
  const NOT_SET_UP = /schema cache|does not exist|Could not find the function/i;

  /* ---------- the applicant's own application(s) ---------- */
  const STATUS_TEXT = {
    reviewing: "Your application is on the staff dashboard and is being reviewed. Staff will accept or deny it and you will get an alert on the bell.",
    accepted: "Your application was accepted. Read the staff reason below and check Discord for the next steps.",
    denied: "Your application was denied this time. Read the staff reason below. You can apply again when you are ready."
  };
  function appCard(r) {
    return `<article class="kcase myapp" data-id="${r.id}"><header><div><b>APP-${r.id} &middot; ${esc(N.roleName(r.role))} application</b><small>Sent ${date(Date.parse(r.created_at))}</small></div>${N.pill(r.status)}</header>
    <p class="meta">${esc(STATUS_TEXT[r.status] || "")}</p>
    ${N.decision("application", r)}
    <details data-extra><summary>Your answers and history</summary>${N.applicationHtml(r)}<div class="xbody"><p class="dmuted">Loading&hellip;</p></div></details></article>`;
  }
  async function loadMine() {
    if (!auth?.user) return;
    const { data, error } = await auth.sb.from("staff_applications").select("*").eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(5);
    if (error) { console.warn("Application status unavailable (has staff-applications.sql been run?)", error); mine.innerHTML = ""; form.style.display = ""; return; }
    const open = data.some(r => r.status === "reviewing");
    mine.innerHTML = data.length ? `<div class="myapp-wrap"><div class="xh">Your application${data.length > 1 ? "s" : ""}</div><div class="clist">${data.map(appCard).join("")}</div>${open ? `<p class="knote">You can send a new application once staff decide on this one.</p>` : ""}</div>` : "";
    form.style.display = open ? "none" : ""; /* one open application at a time */
  }
  function gate() {
    form.style.display = "";
    mine.innerHTML = `<div class="card gate apply-gate"><h3>Sign in to apply</h3><p>You need a CrownPVP account so staff can review your application and you can follow its status: Reviewing, then Accepted or Denied. You can fill in the form first; your answers are saved on this device.</p><p style="margin-top:18px"><a class="btn" style="width:auto" href="login.html?next=staff.html">Sign in or create an account</a></p></div>`;
  }
  mine.addEventListener("toggle", async e => {
    const d = e.target; if (!d.matches?.("details[data-extra]") || !d.open || d.dataset.loaded) return;
    d.dataset.loaded = "1";
    const id = Number(d.closest(".kcase").dataset.id), x = d.querySelector(".xbody");
    try { x.innerHTML = await N.history(auth.sb, "application", { id }); } catch { d.dataset.loaded = ""; x.innerHTML = `<p class="dmuted">Could not load the history.</p>`; }
  }, true);

  /* ---------- sending ---------- */
  /* Old behaviour (accounts not connected, or the database script has not been run yet): keep it on the device and offer a Discord message. */
  function keepOnDevice(raw) {
    const payload = {
      name: raw.name.trim(), discord: raw.discord.trim(), role: raw.role, ageBand: raw.ageBand, timezone: raw.timezone.trim(), availability: raw.availability,
      experience: [`[Mic: ${raw.micStatus} | Recording: ${raw.canRecord}]`, `[Punishment History: ${raw.punishmentHistory}]`, raw.experience ? `Prior Staff/Plugins: ${raw.experience.trim()}` : "Prior Staff/Plugins: None listed"].join("\n").slice(0, 1200),
      motivation: [`[Why CrownPVP]\n${raw.motivation.trim()}`, `[Q1 · Hacked Clients & Anticheat]\n${raw.qCheats.trim()}`, `[Q2 · OpFactions & Raid Disputes]\n${raw.qFactions.trim()}`, `[Q3 · Staff Integrity & Impartiality]\n${raw.qIntegrity.trim()}`].join("\n\n").slice(0, 2500)
    };
    window.CrownForms.keep("applications", payload);
    form.reset();
    clearDraft();
    say("Application saved. Copy and send it in a Discord ticket below.", true);
    window.CrownForms.offlinePanel(box, "applications", payload, () => { message.textContent = ""; });
  }

  async function sendToDashboard(raw) {
    const t = k => String(raw[k] || "").trim();
    const { data, error } = await auth.sb.rpc("submit_staff_application", {
      p_mc: t("name"), p_discord: t("discord"), p_role: raw.role, p_age_band: raw.ageBand, p_timezone: t("timezone"), p_availability: raw.availability,
      p_mic: raw.micStatus, p_record: raw.canRecord, p_punishment: t("punishmentHistory"), p_experience: t("experience"),
      p_cheats: t("qCheats"), p_factions: t("qFactions"), p_integrity: t("qIntegrity"), p_motivation: t("motivation")
    });
    if (error) throw error;
    form.reset();
    clearDraft();
    say(`Application APP-${data} submitted! Status: Reviewing. Staff will accept or deny it and you will get an alert.`, true);
    CP.toast("Application submitted. Status: Reviewing");
    await loadMine();
    mine.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;
    if (!form.elements.confirm.checked) { say("Please confirm the application details."); return; }
    if (auth && !auth.user) { gate(); say("Sign in first, then press Submit again. Your answers are saved on this device."); mine.scrollIntoView({ behavior: "smooth", block: "center" }); return; }

    busy = true;
    button.disabled = true;
    button.textContent = "Submitting application…";
    say(auth ? "Sending your application to the staff dashboard…" : "Saving your application…");
    box.innerHTML = "";
    const raw = Object.fromEntries(new FormData(form).entries());

    try {
      if (!auth) keepOnDevice(raw);
      else await sendToDashboard(raw);
    } catch (error) {
      console.error("Application error", error);
      if (NOT_SET_UP.test(String(error?.message || ""))) keepOnDevice(raw); /* staff-applications.sql not run yet: do not lose the answers */
      else say(N.friendly(error, "Your application could not be sent. Nothing was saved. Please try again."));
    } finally {
      busy = false;
      button.disabled = false;
      button.textContent = "Submit Staff Application";
    }
  });

  /* ---------- accounts ---------- */
  CP.authReady.then(a => {
    auth = a;
    if (!auth) return; /* accounts are not connected: the form works in device-only mode */
    const refresh = async () => {
      if (!auth.user) return gate();
      mine.innerHTML = "";
      const ign = auth.profile?.username;
      if (ign && /^\w{3,16}$/.test(ign) && !form.elements.name.value) form.elements.name.value = ign;
      await loadMine();
    };
    let uid = auth.user?.id || null;
    auth.on(() => { const now = auth.user?.id || null; if (now !== uid) { uid = now; refresh(); } });
    refresh();
  });
})();
