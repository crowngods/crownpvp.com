(() => {
  const form = document.querySelector("#staff-application");
  if (!form) return;

  const button = document.querySelector("#application-submit");
  const message = document.querySelector("#application-message");
  const clearDraft = window.CrownForms.enhance(form, "staff");
  const box = document.createElement("div");
  message.after(box);

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (!form.elements.confirm.checked) {
      message.textContent = "Please confirm the application details.";
      return;
    }

    button.disabled = true;
    button.textContent = "Submitting application…";
    message.className = "form-message";
    message.textContent = "Sending securely to the owner inbox…";
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

    try {
      const res = await window.CrownForms.send("applications", payload);
      if (res.ok) {
        form.reset();
        clearDraft();
        message.textContent = `Application #${res.data.id} submitted! The owner will review your answers and contact you on Discord.`;
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
    } catch (error) {
      message.textContent = error.message;
      message.classList.remove("success");
    } finally {
      button.disabled = false;
      button.textContent = "Submit Staff Application";
    }
  });
})();
