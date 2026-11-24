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

    // Profile likes are stored in Supabase and are unique per signed-in account.
    // A likes migration/network error should never prevent the rest of the profile from loading.
    let likeData = null, likeError = null;
    try { ({ data: likeData, error: likeError } = await auth.sb.rpc("get_profile_likes", { p_username: p.username })); }
    catch (error) { likeError = error; }
    const likeRow = Array.isArray(likeData) ? likeData[0] : likeData;
    const likesEnabled = !likeError && !!likeRow;
    let likeCount = likesEnabled ? Number(likeRow.like_count || 0) : 0;
    let likedByMe = likesEnabled && !!likeRow.liked_by_me;

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

    let likeControl = "";
    if (own) {
      likeControl = `<span class="pf-like-own" title="Other players can like your profile. You cannot like your own.">♥ ${likesEnabled ? likeCount.toLocaleString() + (likeCount === 1 ? " player likes" : " players like") + " you" : "Your profile"}</span>`;
    } else if (!likesEnabled) {
      likeControl = `<button type="button" class="pf-like-btn is-disabled" disabled title="The profile-likes database update has not been applied">♥ Likes unavailable</button>`;
    } else if (!auth.user) {
      likeControl = `<a class="pf-like-btn" href="login.html?next=${encodeURIComponent("profile.html?u=" + p.username)}">♥ Like profile</a>`;
    } else {
      likeControl = `<button type="button" class="pf-like-btn${likedByMe ? " is-liked" : ""}" data-profile-like aria-pressed="${likedByMe}"><span aria-hidden="true">♥</span>${likedByMe ? "Liked" : "Like profile"}</button>`;
    }

    document.title = p.username + " | CrownPVP";
    root.innerHTML = `<div class="pf-head"><div class="pf-av"><img src="${esc(pic)}" alt="${esc(p.username)}'s picture" width="170" height="170">${own ? `<label for="pf-file">Change picture</label><input id="pf-file" type="file" accept="image/*" hidden>` : ""}</div>
      <div class="pf-info"><h1>${esc(p.username)}${p.staff_rank && RANKS[p.staff_rank] ? `<span class="pf-rank">${RANKS[p.staff_rank]}</span>` : ""}</h1>${presence}<span class="pf-likepill${likesEnabled ? "" : " off"}" title="Profile likes from other players"><span class="pf-heart" aria-hidden="true">♥</span><b data-profile-likes-pill>${likesEnabled ? likeCount.toLocaleString() : "—"}</b><em>${likesEnabled && likeCount === 1 ? "like" : "likes"}</em></span><p><b>Joined:</b> ${esc(joined)}</p>
      <p class="pf-bio${p.bio ? "" : " empty"}">${p.bio ? esc(p.bio) : own ? "You have not written a bio yet." : "This player has not written a bio yet."}</p></div>
      <div class="pf-act">${actions}${likeControl}</div></div>
      <div class="pf-stats"><div><b>${Number(p.comments || 0).toLocaleString()}</b><span>Comments</span></div><div><b>${Number(p.reactions || 0).toLocaleString()}</b><span>Reactions</span></div><div class="pf-likes-stat"><b data-profile-likes>${likesEnabled ? likeCount.toLocaleString() : "—"}</b><span>Profile likes</span></div><div><b>${esc(joined === "Unknown" ? "—" : joined.split(",")[1].trim())}</b><span>Member since</span></div></div>
      ${own ? `<div class="pf-edit" id="pf-edit" hidden>
        <section><h2>Bio</h2><textarea id="pf-bio" maxlength="300" aria-label="Bio" placeholder="Tell players about yourself">${esc(p.bio || "")}</textarea><div class="row"><button class="hx-btn sm" id="pf-save" type="button">Save bio</button><small id="pf-count"></small></div><p class="pf-msg" id="pf-m1" aria-live="polite"></p></section>
        <section><h2>Profile picture</h2><p class="hx-note">Pick a square-ish image. It is cropped to a square and shrunk for you.</p><div class="row"><label class="hx-btn sm dark" for="pf-file">Upload picture</label><button class="hx-btn sm dark" id="pf-clear" type="button">Use Minecraft head</button></div><p class="pf-msg" id="pf-m2" aria-live="polite"></p></section>
        <section><h2>Username</h2><p class="hx-note">${auth.profile?.username_changed ? "You have already used your one username change." : "You can change your username only once. Choose carefully."}</p><input type="text" id="pf-name" value="${esc(p.username)}" maxlength="16" pattern="[A-Za-z0-9_]{3,16}" aria-label="New username" ${auth.profile?.username_changed ? "disabled" : ""}><div class="row"><button class="hx-btn sm" id="pf-rename" type="button" ${auth.profile?.username_changed ? "disabled" : ""}>Change username</button></div><p class="pf-msg" id="pf-m3" aria-live="polite"></p></section></div>` : ""}`;

    /* "Most liked players": shown when supabase/likes-leaderboard.sql has been run; silently skipped otherwise. */
    (async () => {
      try {
        const { data: top, error: topError } = await auth.sb.rpc("get_top_liked_profiles", { p_limit: 10 });
        if (topError || !Array.isArray(top) || !top.length) return;
        const sec = document.createElement("section");
        sec.className = "pf-top"; sec.id = "top";
        sec.innerHTML = `<div class="pf-top-head"><span class="pf-heart" aria-hidden="true">♥</span><div><h2>Most liked players</h2><p>Players are ranked by profile likes from the community.</p></div></div>
          <ol>${top.map((t, i) => `<li class="${t.username.toLowerCase() === p.username.toLowerCase() ? "me" : ""}"><span class="rk">${i + 1}</span><img src="${esc(AV_OK.test(t.avatar_url || "") ? t.avatar_url : CP.head(t.username, 64))}" alt="" width="36" height="36" loading="lazy"><a href="profile.html?u=${encodeURIComponent(t.username)}">${esc(t.username)}${t.staff_rank && RANKS[t.staff_rank] ? `<em>${RANKS[t.staff_rank]}</em>` : ""}</a><b>♥ ${Number(t.like_count || 0).toLocaleString()}</b></li>`).join("")}</ol>`;
        root.append(sec);
      } catch { /* leaderboard not set up */ }
    })();

    if (!own && auth.user && likesEnabled) {
      const likeButton = root.querySelector("[data-profile-like]");
      likeButton?.addEventListener("click", async () => {
        if (likeButton.disabled) return;
        likeButton.disabled = true;
        likeButton.classList.add("is-loading");
        const { data: updatedData, error: updateError } = await auth.sb.rpc("toggle_profile_like", { p_username: p.username });
        const updated = Array.isArray(updatedData) ? updatedData[0] : updatedData;
        if (updateError || !updated) {
          likeButton.disabled = false;
          likeButton.classList.remove("is-loading");
          CP.toast(updateError?.message || "Could not update this profile like. Please try again.");
          return;
        }
        likeCount = Number(updated.like_count || 0);
        likedByMe = !!updated.liked_by_me;
        const count = root.querySelector("[data-profile-likes]");
        if (count) count.textContent = likeCount.toLocaleString();
        const pill = root.querySelector(".pf-likepill");
        if (pill) {
          pill.querySelector("[data-profile-likes-pill]").textContent = likeCount.toLocaleString();
          pill.querySelector("em").textContent = likeCount === 1 ? "like" : "likes";
          pill.classList.remove("pop"); void pill.offsetWidth; if (likedByMe) pill.classList.add("pop");
        }
        likeButton.classList.toggle("is-liked", likedByMe);
        likeButton.setAttribute("aria-pressed", String(likedByMe));
        likeButton.innerHTML = `<span aria-hidden="true">♥</span>${likedByMe ? "Liked" : "Like profile"}`;
        likeButton.disabled = false;
        likeButton.classList.remove("is-loading");
        CP.toast(likedByMe ? `You liked ${p.username}'s profile.` : `You removed your like from ${p.username}'s profile.`);
      });
    }

    if (!own) return;
    const $ = id => document.getElementById(id);
    const say = (id, message, ok) => { const el = $(id); el.textContent = message; el.className = "pf-msg " + (ok ? "ok" : "err"); };
    const SETUP = "Profile setup is not finished. The site owner needs to run supabase/profiles-upgrade.sql in Supabase.";
    const missing = err => { console.error("Profile action failed:", err); return /could not find the function|schema cache|bucket not found|does not exist|relation .* does not exist/i.test(String(err?.message || err?.error || "")); };
    const count = () => { $("pf-count").textContent = $("pf-bio").value.length + "/300"; };
    count(); $("pf-bio").oninput = count;
    $("pf-toggle").onclick = () => { const el = $("pf-edit"); el.hidden = !el.hidden; };
    $("pf-save").onclick = async () => {
      const { error } = await auth.sb.rpc("update_my_profile", { p_bio: $("pf-bio").value });
      error ? say("pf-m1", missing(error) ? SETUP : "Could not save your bio.") : (say("pf-m1", "Bio saved.", true), document.querySelector(".pf-bio").textContent = $("pf-bio").value.trim() || "You have not written a bio yet.");
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
      } catch (err) { say("pf-m2", missing(err) ? SETUP : "Upload failed. Use a JPG, PNG or WebP under 2 MB."); }
    };
    $("pf-clear").onclick = async () => {
      const { error } = await auth.sb.rpc("update_my_profile", { p_bio: $("pf-bio").value, p_clear_avatar: true });
      if (error) return say("pf-m2", missing(error) ? SETUP : "Could not reset.");
      document.querySelector(".pf-av img").src = CP.head(p.username, 256); say("pf-m2", "Using your Minecraft head.", true);
    };
    $("pf-rename").onclick = async () => {
      const value = $("pf-name").value.trim();
      if (value === p.username) return say("pf-m3", "That is already your username.");
      if (!/^[A-Za-z0-9_]{3,16}$/.test(value)) return say("pf-m3", "Use 3 to 16 letters, numbers or underscores.");
      if (!confirm(`Change your username to "${value}"? You can only do this once.`)) return;
      const { error } = await auth.sb.rpc("change_my_username", { p_username: value });
      if (error) return say("pf-m3", missing(error) ? SETUP : errText(error.message || ""));
      location.href = "profile.html";
    };
  });
})();
