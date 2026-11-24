(() => {
  const { $, esc, date } = CP, N = CP.net;
  const form = document.querySelector("#staff-application");
  if (!form) return;

  const button = document.querySelector("#application-submit");
  const message = document.querySelector("#application-message");
  const myAppsBox = document.querySelector("#my-applications");
  const clearDraft = window.CrownForms.enhance(form, "staff");
  const box = document.createElement("div");
  message.after(box);

  async function renderMyApplications(auth) {
    if (!myAppsBox || !auth?.user) return;
    const { data, error } = await auth.sb
      .from("staff_applications")
      .select("*")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error || !data?.length) {
      myAppsBox.innerHTML = "";
      return;
    }

    myAppsBox.innerHTML = `
      <div class="section-head" style="margin-bottom:14px;">
        <div><div class="eyebrow">APPLICATION STATUS</div><h3>Your Submitted Applications</h3></div>
      </div>
      <div class="clist">
        ${data.map(r => `
          <article class="kcase">
            <header>
              <div>
                <b>APP-${r.id} &middot; ${esc(r.mc_username)}</b>
                <small>Role: ${esc(r.role.toUpperCase())} &middot; Submitted ${date(Date.parse(r.created_at))}</small>
              </div>
              ${N.pill(r.status)}
            </header>
            ${N.decision("appeal", r)}
          </article>
        `).join("")}
      </div>
    `;
  }

  CP.authReady.then(auth => {
    if (auth?.user && auth.profile?.username && !form.elements.name.value) {
      form.elements.name.value = auth.profile.username;
    }
    renderMyApplications(auth);

    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      if (!form.elements.confirm.checked) {
        message.textContent = "Please confirm the application details.";
        return;
      }

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
          const { data: appId, error } = await auth.sb.rpc("submit_staff_application", {
            p_mc_username: raw.name.trim(),
            p_discord: raw.discord.trim(),
            p_role: raw.role,
            p_age_band: raw.ageBand,
            p_timezone: raw.timezone.trim(),
            p_availability: raw.availability,
            p_experience: compiledExperience,
            p_motivation: compiledMotivation
          });
          if (error) throw error;
          form.reset();
          clearDraft();
          message.textContent = `Application APP-${appId} submitted! Track its status below or on your alerts.`;
          message.classList.add("success");
          CP.toast(`Application APP-${appId} sent to Staff Dashboard!`);
          await renderMyApplications(auth);
        } else {
          const payload = {
            name: raw.name.trim(),
            discord: raw.discord.trim(),
            role: raw.role,
            ageBand: raw.ageBand,
            timezone: raw.timezone.trim(),
            availability: raw.availability,
            experience: compiledExperience,
            motivation: compiledMotivation
          };
          const res = await window.CrownForms.send("applications", payload);
          if (res.ok) {
            form.reset();
            clearDraft();
            message.textContent = `Application #${res.data.id} submitted!`;
            message.classList.add("success");
          } else {
            window.CrownForms.keep("applications", payload);
            form.reset();
            clearDraft();
            message.textContent = "Application saved. Copy and send it in a Discord ticket below.";
            message.classList.add("success");
            window.CrownForms.offlinePanel(box, "applications", payload, () => {
              message.textContent = "";
            });
          }
        }
      } catch (error) {
        message.textContent = N.friendly(error, error.message);
        message.classList.remove("success");
      } finally {
        button.disabled = false;
        button.textContent = "SUBMIT APPLICATION";
      }
    });
  });
})();
