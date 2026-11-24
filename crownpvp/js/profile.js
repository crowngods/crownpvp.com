/* Public player profile and own-profile controls. Social actions are handled by social-hub.js. */
(() => {
  const root = document.getElementById("pf"), CP = window.CP, esc = CP.esc;
  const AV_OK = /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/avatars\//;
  const RANKS = { owner: "Owner", coowner: "Co-Owner", manager: "Manager", admin: "Admin", developer: "Developer", media: "Media", moderator: "Moderator", helper: "Helper" };
  const note = (h, link) => root.innerHTML = `<p class="hx-note" style="color:#e9dcc3;text-align:center;padding:40px 0">${h}${link ? ` <a href="login.html?next=profile.html" style="color:#ffd76a;font-weight:700">Log in</a>` : ""}</p>`;
  const square = file => new Promise((ok, no) => {
    const i = new Image();
    i.onload = () => {
      const side = Math.min(i.width, i.height), canvas = document.createElement("canvas");
      canvas.width = canvas.height = 256;
      canvas.getContext("2d").drawImage(i, (i.width - side) / 2, (i.height - side) / 2, side, side, 0, 0, 256, 256);
      canvas.toBlob(blob => blob ? ok(blob) : no(), "image/jpeg", .88);
    };
    i.onerror = no; i.src = URL.createObjectURL(file);
  });
  const errText = message => /taken/.test(message) ? "That username is already taken." : /already changed/.test(message) ? "You have already used your one username change." : /invalid/.test(message) ? "Use 3 to 16 letters, numbers or underscores." : "Something went wrong. Try again.";

  CP.authReady.then(async auth => {
    if (!auth) return note("Profiles turn on once account login is set up.");
    const want = new URLSearchParams(location.search).get("u") || auth.profile?.username;
    if (!want) return note(auth.user ? "Your profile is still being created. Refresh in a moment." : "Log in to see your profile.", !auth.user);

    const { data, error } = await auth.sb.rpc("get_social_profile", { p_username: want });
    if (error) return note("Player profiles and friend status are not set up yet. The owner needs to run supabase/social-hub.sql.");
    const p = data?.[0];
    if (!p) return note("No player found with that name.");

    const own = !!auth.user && auth.profile?.username?.toLowerCase() === p.username.toLowerCase();
    const pic = AV_OK.test(p.avatar_url || "") ? p.avatar_url : CP.head(p.username, 256);
    const joinedDate = new Date(p.created_at);
    const joined = Number.isNaN(joinedDate.getTime()) ? "Unknown" : joinedDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const presence = `<span class="pf-presence ${p.is_online ? "is-online" : ""}"><i></i>${p.is_online ? "Online now" : "Offline"}</span>`;
    let actions = "";
    if (own) {
      actions = `<button type="button" class="hx-btn sm" id="pf-toggle">Edit profile</button>`;
    } else if (!auth.user) {
      actions = `<a class="hx-btn sm" href="login.html?next=${encodeURIComponent("profile.html?u=" + p.username)}">Sign in to add friend</a><a class="hx-btn sm dark" href="support.html">Report</a>`;
    } else if (p.friendship_status === "friends") {
      actions = `<button type="button" class="hx-btn sm" data-social-message="${esc(p.username)}">Message</button><button type="button" class="hx-btn sm dark" data-social-remove="${esc(p.username)}">Remove friend</button><a class="hx-btn sm dark" href="support.html">Report</a>`;
    } else if (p.friendship_status === "incoming") {
      actions = `<button type="button" class="hx-btn sm" data-social-accept="${Number(p.friend_request_id)}">Accept request</button><button type="button" class="hx-btn sm dark" data-social-decline="${Number(p.friend_request_id)}">Decline</button><a class="hx-btn sm dark" href="support.html">Report</a>`;
    } else if (p.friendship_status === "outgoing") {
      actions = `<button type="button" class="hx-btn sm dark" data-social-cancel="${Number(p.friend_request_id)}">Request pending · Cancel</button><a class="hx-btn sm dark" href="support.html">Report</a>`;
    } else {
      actions = `<button type="button" class="hx-btn sm" data-social-friend="${esc(p.username)}">＋ Add friend</button><a class="hx-btn sm dark" href="support.html">Report</a>`;
    }

    document.title = p.username + " | CrownPVP";
    root.innerHTML = `<div class="pf-head"><div class="pf-av"><img src="${esc(pic)}" alt="${esc(p.username)}'s picture" width="170" height="170">${own ? `<label for="pf-file">Change picture</label><input id="pf-file" type="file" accept="image/*" hidden>` : ""}</div>
      <div class="pf-info"><h1>${esc(p.username)}${p.staff_rank && RANKS[p.staff_rank] ? `<span class="pf-rank">${RANKS[p.staff_rank]}</span>` : ""}</h1>${presence}<p><b>Joined:</b> ${esc(joined)}</p>
      <p class="pf-bio${p.bio ? "" : " empty"}">${p.bio ? esc(p.bio) : own ? "You have not written a bio yet." : "This player has not written a bio yet."}</p></div>
      <div class="pf-act">${actions}</div></div>
      <div class="pf-stats"><div><b>${Number(p.comments || 0).toLocaleString()}</b><span>Comments</span></div><div><b>${Number(p.reactions || 0).toLocaleString()}</b><span>Reactions</span></div><div><b>${esc(joined === "Unknown" ? "—" : joined.split(",")[1].trim())}</b><span>Member since</span></div></div>
      ${own ? `<div class="pf-edit" id="pf-edit" hidden>
        <section><h2>Bio</h2><textarea id="pf-bio" maxlength="300" aria-label="Bio" placeholder="Tell players about yourself">${esc(p.bio || "")}</textarea><div class="row"><button class="hx-btn sm" id="pf-save" type="button">Save bio</button><small id="pf-count"></small></div><p class="pf-msg" id="pf-m1" aria-live="polite"></p></section>
        <section><h2>Profile picture</h2><p class="hx-note">Pick a square-ish image. It is cropped to a square and shrunk for you.</p><div class="row"><label class="hx-btn sm dark" for="pf-file">Upload picture</label><button class="hx-btn sm dark" id="pf-clear" type="button">Use Minecraft head</button></div><p class="pf-msg" id="pf-m2" aria-live="polite"></p></section>
        <section><h2>Username</h2><p class="hx-note">${auth.profile?.username_changed ? "You have already used your one username change." : "You can change your username only once. Choose carefully."}</p><input type="text" id="pf-name" value="${esc(p.username)}" maxlength="16" pattern="[A-Za-z0-9_]{3,16}" aria-label="New username" ${auth.profile?.username_changed ? "disabled" : ""}><div class="row"><button class="hx-btn sm" id="pf-rename" type="button" ${auth.profile?.username_changed ? "disabled" : ""}>Change username</button></div><p class="pf-msg" id="pf-m3" aria-live="polite"></p></section></div>` : ""}`;

    if (!own) return;
    const $ = id => document.getElementById(id);
    const say = (id, message, ok) => { const el = $(id); el.textContent = message; el.className = "pf-msg " + (ok ? "ok" : "err"); };
    const count = () => { $("pf-count").textContent = $("pf-bio").value.length + "/300"; };
    count(); $("pf-bio").oninput = count;
    $("pf-toggle").onclick = () => { const el = $("pf-edit"); el.hidden = !el.hidden; };
    $("pf-save").onclick = async () => {
      const { error } = await auth.sb.rpc("update_my_profile", { p_bio: $("pf-bio").value });
      error ? say("pf-m1", "Could not save your bio.") : (say("pf-m1", "Bio saved.", true), document.querySelector(".pf-bio").textContent = $("pf-bio").value.trim() || "You have not written a bio yet.");
    };
    $("pf-file").onchange = async event => {
      const file = event.target.files[0]; if (!file) return;
      say("pf-m2", "Uploading…", true);
      try {
        const blob = await square(file), path = `${auth.user.id}/avatar.jpg`;
        const up = await auth.sb.storage.from("avatars").upload(path, blob, { contentType: "image/jpeg", upsert: true });
        if (up.error) throw up.error;
        const url = auth.sb.storage.from("avatars").getPublicUrl(path).data.publicUrl + "?v=" + Date.now();
        const saved = await auth.sb.rpc("update_my_profile", { p_bio: $("pf-bio").value, p_avatar_url: url });
        if (saved.error) throw saved.error;
        document.querySelector(".pf-av img").src = url; say("pf-m2", "Picture updated.", true);
      } catch { say("pf-m2", "Upload failed. Use a JPG, PNG or WebP under 2 MB."); }
    };
    $("pf-clear").onclick = async () => {
      const { error } = await auth.sb.rpc("update_my_profile", { p_bio: $("pf-bio").value, p_clear_avatar: true });
      if (error) return say("pf-m2", "Could not reset.");
      document.querySelector(".pf-av img").src = CP.head(p.username, 256); say("pf-m2", "Using your Minecraft head.", true);
    };
    $("pf-rename").onclick = async () => {
      const value = $("pf-name").value.trim();
      if (value === p.username) return say("pf-m3", "That is already your username.");
      if (!/^[A-Za-z0-9_]{3,16}$/.test(value)) return say("pf-m3", "Use 3 to 16 letters, numbers or underscores.");
      if (!confirm(`Change your username to "${value}"? You can only do this once.`)) return;
      const { error } = await auth.sb.rpc("change_my_username", { p_username: value });
      if (error) return say("pf-m3", errText(error.message || ""));
      location.href = "profile.html";
    };
  });
})();
