(() => {
  "use strict";
  const form = document.querySelector("#lookupForm");
  const input = document.querySelector("#username");
  const button = document.querySelector("#lookupButton");
  const message = document.querySelector("#message");
  const result = document.querySelector("#result");
  const profileName = document.querySelector("#profileName");
  const profileUuid = document.querySelector("#profileUuid");
  const avatar = document.querySelector("#avatar");

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const username = input.value.trim();
    if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) {
      message.textContent = "Enter a valid 3-16 character Java username.";
      message.className = "message error";
      result.hidden = true;
      return;
    }

    button.disabled = true;
    button.textContent = "Looking up...";
    message.textContent = "Checking the public profile service...";
    message.className = "message";
    result.hidden = true;
    try {
      const response = await fetch(`/api/public-profile?username=${encodeURIComponent(username)}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Profile lookup failed.");
      profileName.textContent = data.username;
      profileUuid.textContent = data.uuid;
      avatar.textContent = data.username.slice(0, 1).toUpperCase();
      result.hidden = false;
      message.textContent = `Public profile found for ${data.username}.`;
      message.className = "message";
    } catch (error) {
      message.textContent = error.message || "The public profile service could not be reached.";
      message.className = "message error";
    } finally {
      button.disabled = false;
      button.innerHTML = "Lookup <span>→</span>";
    }
  });

  document.querySelector("#copyButton").addEventListener("click", async event => {
    try {
      await navigator.clipboard.writeText(profileUuid.textContent);
      event.currentTarget.textContent = "Copied";
      setTimeout(() => { event.currentTarget.textContent = "Copy UUID"; }, 1400);
    } catch {
      message.textContent = "Clipboard access is unavailable in this browser.";
      message.className = "message error";
    }
  });
})();
