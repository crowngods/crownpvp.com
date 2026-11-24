/* CrownPVP Social Hub — friend requests, friend presence and private messages. */
(() => {
  if (window.CrownSocial) return;
  const CP = window.CP, esc = CP?.esc || (v => String(v ?? ""));
  const auth = CP?.auth || null;
  const sb = auth?.sb || null;
  const AV_OK = /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/avatars\//;
  const state = { tab: "friends", friends: [], requests: [], active: null, chatUser: "", messages: [], busy: false, count: null, hasSocial: false };

  const widget = document.createElement("div");
  widget.id = "cph-widget";
  widget.innerHTML = `
    <button type="button" class="cph-launch" id="cph-launch" aria-controls="cph-panel" aria-expanded="false">
      <span class="cph-launch-icon" aria-hidden="true">✉</span><span>Community</span><small class="cph-launch-count" id="cph-launch-count">… active</small><span class="cph-launch-badge" id="cph-unread" hidden>0</span>
    </button>
    <section class="cph-panel" id="cph-panel" aria-label="CrownPVP community messages" aria-hidden="true">
      <header class="cph-panel-head">
        <div><span class="cph-eyebrow">CROWNPVP COMMUNITY</span><h2 id="cph-panel-title">Your friends</h2><p><i class="cph-live-dot"></i><span id="cph-panel-count">Checking active visitors…</span></p></div>
        <button type="button" class="cph-close" data-cph-close aria-label="Close community panel">×</button>
      </header>
      <nav class="cph-tabs" aria-label="Community sections"><button type="button" data-cph-tab="friends" class="is-active">Friends <span id="cph-friend-count">0</span></button><button type="button" data-cph-tab="messages">Messages <span id="cph-message-count">0</span></button></nav>
      <div class="cph-panel-body" id="cph-panel-body"><div class="cph-loading">Loading your community…</div></div>
    </section>`;
  document.body.append(widget);

  const rpc = async (name, args = {}) => {
    if (!sb) throw new Error("Website accounts are not available right now.");
    const { data, error } = await sb.rpc(name, args);
    if (error) throw error;
    return data;
  };
  const avatar = person => AV_OK.test(person?.avatar_url || "") ? person.avatar_url : CP.head(person?.username || "Steve", 64);
  const fmtTime = value => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };
  const countText = () => state.count == null ? "Active visitor count unavailable" : `${state.count.toLocaleString()} active on the website`;
  const panel = () => document.getElementById("cph-panel");
  const body = () => document.getElementById("cph-panel-body");
  const isOpen = () => widget.classList.contains("is-open");
  const toast = message => CP?.toast ? CP.toast(message) : window.alert(message);

  function setOpen(open) {
    widget.classList.toggle("is-open", !!open);
    document.getElementById("cph-launch")?.setAttribute("aria-expanded", String(!!open));
    panel()?.setAttribute("aria-hidden", String(!open));
    if (open) renderPanel();
  }

  function requestMarkup(request) {
    const person = { username: request.username, avatar_url: request.avatar_url };
    return `<div class="cph-person cph-request"><img src="${esc(avatar(person))}" alt="" width="40" height="40"><div class="cph-person-main"><a href="profile.html?u=${encodeURIComponent(request.username)}">${esc(request.username)}</a><small>${request.direction === "incoming" ? "Wants to be your friend" : "Request sent"}</small></div>${request.direction === "incoming" ? `<div class="cph-person-actions"><button type="button" class="cph-mini primary" data-social-accept="${request.request_id}">Accept</button><button type="button" class="cph-mini" data-social-decline="${request.request_id}">Decline</button></div>` : `<button type="button" class="cph-mini" data-social-cancel="${request.request_id}">Cancel</button>`}</div>`;
  }

  function friendMarkup(friend, messageMode = false) {
    const unread = Number(friend.unread_count || 0);
    return `<div class="cph-person">
      <a class="cph-avatar" href="profile.html?u=${encodeURIComponent(friend.username)}" aria-label="Open ${esc(friend.username)}'s profile"><img src="${esc(avatar(friend))}" alt="" width="44" height="44"><i class="${friend.is_online ? "is-online" : ""}"></i></a>
      <div class="cph-person-main"><a href="profile.html?u=${encodeURIComponent(friend.username)}">${esc(friend.username)}</a><small>${friend.is_online ? "Online now" : "Offline"}${unread ? ` · ${unread} unread` : ""}</small></div>
      <div class="cph-person-actions">${messageMode ? `<button type="button" class="cph-mini primary" data-cph-chat="${esc(friend.username)}">Open</button>` : `<button type="button" class="cph-mini primary" data-cph-chat="${esc(friend.username)}">Message</button>`}</div>
    </div>`;
  }

  function renderFriends() {
    const incoming = state.requests.filter(r => r.direction === "incoming");
    const outgoing = state.requests.filter(r => r.direction === "outgoing");
    const friends = state.friends.length ? state.friends.map(f => friendMarkup(f)).join("") : `<div class="cph-empty"><span>♙</span><b>Your friends list is empty</b><p>Add a CrownPVP player by their website username to see when they are online and message them.</p></div>`;
    const search = auth?.user ? `<form class="cph-add-form" id="cph-add-form"><label for="cph-add-name">Add a player</label><div><input id="cph-add-name" name="username" maxlength="16" minlength="3" pattern="[A-Za-z0-9_]{3,16}" placeholder="CrownPVP website username" autocomplete="off" required><button type="submit" ${state.busy ? "disabled" : ""}>Add</button></div><small>Players need a CrownPVP website account.</small></form>` : "";
    const requests = incoming.length || outgoing.length ? `<section class="cph-block"><div class="cph-block-title">Friend requests <span>${state.requests.length}</span></div>${[...incoming, ...outgoing].map(requestMarkup).join("")}</section>` : "";
    return `${search}${requests}<section class="cph-block"><div class="cph-block-title">Your friends <span>${state.friends.length}</span></div>${friends}</section>`;
  }

  function renderMessages() {
    if (state.chatUser) {
      const friend = state.friends.find(f => f.username.toLowerCase() === state.chatUser.toLowerCase());
      const list = state.messages.map(m => {
        const mine = m.sender_id === auth?.user?.id;
        return `<div class="cph-message ${mine ? "mine" : "theirs"}"><p>${esc(m.body)}</p><time>${fmtTime(m.created_at)}</time></div>`;
      }).join("");
      return `<div class="cph-thread-head"><button type="button" class="cph-back" data-cph-chat-back>← Friends</button><div><b>${esc(state.chatUser)}</b><small>${friend?.is_online ? "Online now" : "Private conversation"}</small></div><a href="profile.html?u=${encodeURIComponent(state.chatUser)}">Profile ↗</a></div>
        <div class="cph-message-list" id="cph-message-list">${list || `<div class="cph-empty"><span>✉</span><b>Start the conversation</b><p>Say hello to ${esc(state.chatUser)}.</p></div>`}</div>
        <form class="cph-compose" id="cph-compose"><textarea id="cph-compose-text" maxlength="2000" rows="2" placeholder="Write a message…" aria-label="Write a message" required></textarea><button type="submit" aria-label="Send message">Send</button></form>`;
    }
    return `<section class="cph-block"><div class="cph-block-title">Start a conversation <span>${state.friends.length}</span></div>${state.friends.length ? state.friends.map(f => friendMarkup(f, true)).join("") : `<div class="cph-empty"><span>✉</span><b>No conversations yet</b><p>Add a friend first, then select Message to start a private conversation.</p><button type="button" class="cph-mini primary" data-cph-tab="friends">Find friends</button></div>`}</section>`;
  }

  function renderPanel() {
    const existingInput = document.getElementById("cph-compose-text");
    const draft = existingInput?.value || "";
    const hadFocus = existingInput === document.activeElement;
    const title = document.getElementById("cph-panel-title");
    const friendCount = document.getElementById("cph-friend-count");
    const messageCount = document.getElementById("cph-message-count");
    const totalUnread = state.friends.reduce((n, f) => n + Number(f.unread_count || 0), 0);
    if (title) title.textContent = state.tab === "messages" ? (state.chatUser || "Messages") : "Your friends";
    if (friendCount) friendCount.textContent = String(state.friends.length);
    if (messageCount) messageCount.textContent = totalUnread > 99 ? "99+" : String(totalUnread);
    document.getElementById("cph-panel-count").textContent = countText();
    document.querySelectorAll("[data-cph-tab]").forEach(b => b.classList.toggle("is-active", b.dataset.cphTab === state.tab));
    if (!auth?.user) {
      body().innerHTML = `<div class="cph-signin"><div class="cph-signin-mark">♛</div><h3>Join the community</h3><p>Sign in to add friends, see who is online and send private messages.</p><a class="cph-signin-btn" href="login.html?next=index.html">Sign in or create an account</a></div>`;
      return;
    }
    if (!state.hasSocial) {
      body().innerHTML = `<div class="cph-empty"><span>♙</span><b>Community features are being set up</b><p>Friends and private messages will appear here once the Social Hub database update has been applied.</p></div>`;
      return;
    }
    body().innerHTML = state.tab === "messages" ? renderMessages() : renderFriends();
    const nextInput = document.getElementById("cph-compose-text");
    if (nextInput && draft) nextInput.value = draft;
    if (nextInput && hadFocus) nextInput.focus();
    if (state.tab === "messages" && state.chatUser) {
      const list = document.getElementById("cph-message-list");
      if (list) list.scrollTop = list.scrollHeight;
    }
  }

  function renderSidebar() {
    const root = document.getElementById("social-sidebar");
    if (!root) return;
    const visibleFriends = state.friends.slice(0, 5);
    const friends = visibleFriends.length ? visibleFriends.map(f => `<div class="cph-side-friend"><img src="${esc(avatar(f))}" alt="" width="30" height="30"><span><a href="profile.html?u=${encodeURIComponent(f.username)}">${esc(f.username)}</a><small class="${f.is_online ? "online" : ""}">${f.is_online ? "Online" : "Offline"}</small></span><button type="button" data-cph-chat="${esc(f.username)}" aria-label="Message ${esc(f.username)}">✉</button></div>`).join("") : `<p class="cph-side-empty">${auth?.user ? "Add friends to see their online status here." : "Sign in to build your friends list."}</p>`;
    root.innerHTML = `<section class="cph-sidecard"><div class="cph-side-head"><div><span>COMMUNITY</span><h3>Community Hub</h3></div><i>LIVE</i></div><div class="cph-side-active"><b>${state.count == null ? "—" : state.count.toLocaleString()}</b><span>active on the website</span></div><div class="cph-side-section"><div class="cph-side-label">YOUR FRIENDS <small>${state.friends.length}</small></div>${friends}</div><button type="button" class="cph-side-open" data-cph-open>Open friends & messages <span>↗</span></button></section>`;
  }

  function refreshBadges() {
    const unread = state.friends.reduce((n, f) => n + Number(f.unread_count || 0), 0);
    const b = document.getElementById("cph-unread");
    if (b) { b.hidden = unread < 1; b.textContent = unread > 99 ? "99+" : String(unread); }
    const count = document.getElementById("cph-panel-count");
    if (count) count.textContent = countText();
    const launcherCount = document.getElementById("cph-launch-count");
    if (launcherCount) launcherCount.textContent = state.count == null ? "— active" : `${state.count} active`;
    renderSidebar();
  }

  async function refreshFriends() {
    if (!auth?.user || !sb) { renderSidebar(); renderPanel(); return; }
    const [friends, requests] = await Promise.all([
      rpc("get_my_friends").catch(() => null),
      rpc("get_my_friend_requests").catch(() => null)
    ]);
    if (friends === null || requests === null) {
      state.hasSocial = false;
    } else {
      state.friends = friends || [];
      state.requests = requests || [];
      state.hasSocial = true;
    }
    refreshBadges();
    if (isOpen()) renderPanel();
  }

  async function refreshCount() {
    if (!sb) return;
    try { state.count = Number(await rpc("get_website_active_count")); }
    catch { state.count = null; }
    refreshBadges();
  }

  function getSessionId() {
    const key = "crownpvp_visitor_id";
    try {
      let id = localStorage.getItem(key);
      if (!id) {
        id = window.crypto?.randomUUID ? window.crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
          const r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16);
        });
        localStorage.setItem(key, id);
      }
      return id;
    } catch { return null; }
  }

  async function heartbeat() {
    if (!sb) return;
    const sessionId = getSessionId();
    if (sessionId) await rpc("ping_website_presence", { p_session_id: sessionId }).catch(() => {});
    if (auth?.user) await rpc("ping_my_presence").catch(() => {});
  }

  async function openChat(username) {
    if (!auth?.user) { toast("Sign in to message players."); location.href = "login.html?next=index.html"; return; }
    if (!state.hasSocial) {
      await refreshFriends();
      if (!state.hasSocial) { toast("The Social Hub database update has not been applied yet."); return; }
    }
    const friend = state.friends.find(f => f.username.toLowerCase() === String(username).toLowerCase());
    if (!friend) { toast("Add this player as a friend before sending a private message."); return; }
    state.chatUser = friend.username;
    state.tab = "messages";
    setOpen(true);
    await loadMessages();
  }

  async function loadMessages() {
    if (!state.chatUser || !auth?.user) return;
    const draft = document.getElementById("cph-compose-text")?.value || "";
    try {
      const rows = await rpc("get_direct_messages", { p_username: state.chatUser });
      state.messages = (rows || []).reverse();
      if (isOpen() && state.tab === "messages") renderPanel();
      const input = document.getElementById("cph-compose-text");
      if (input && draft) input.value = draft;
      const friends = await rpc("get_my_friends").catch(() => null);
      if (friends !== null) state.friends = friends || [];
      refreshBadges();
    } catch (error) {
      if (isOpen()) body().innerHTML = `<div class="cph-empty"><b>Could not open this conversation</b><p>${esc(error.message || "Please try again.")}</p></div>`;
    }
  }

  async function sendFriend(username) {
    try {
      const result = await rpc("send_friend_request", { p_username: username.trim() });
      toast(result === "accepted" ? `You and ${username} are now friends.` : result === "friends" ? "You are already friends." : "Friend request sent.");
      await refreshFriends();
      return true;
    } catch (error) { toast(error.message || "Could not send the friend request."); return false; }
  }

  window.CrownSocial = {
    open: () => setOpen(true),
    close: () => setOpen(false),
    openChat,
    sendFriend,
    refresh: async () => { await refreshFriends(); await refreshCount(); },
    get friends() { return state.friends.slice(); }
  };

  widget.addEventListener("click", async event => {
    const target = event.target.closest("button");
    if (!target) return;
    if (target.id === "cph-launch") return setOpen(!isOpen());
    if (target.closest("[data-cph-close]")) return setOpen(false);
    if (target.dataset.cphTab) {
      state.tab = target.dataset.cphTab;
      if (state.tab !== "messages") state.chatUser = "";
      renderPanel(); return;
    }
    if (target.dataset.cphChat) return openChat(target.dataset.cphChat);
    if (target.dataset.cphChatBack) { state.chatUser = ""; state.tab = "messages"; renderPanel(); return; }
  });

  document.addEventListener("click", async event => {
    const open = event.target.closest("[data-cph-open]");
    if (open) { state.tab = "friends"; state.chatUser = ""; return setOpen(true); }
    const chat = event.target.closest("[data-social-message]");
    if (chat) return openChat(chat.dataset.socialMessage);
    const add = event.target.closest("[data-social-friend]");
    if (add) { const ok = await sendFriend(add.dataset.socialFriend); if (ok && document.body.dataset.page === "profile") location.reload(); return; }
    const accept = event.target.closest("[data-social-accept]");
    const decline = event.target.closest("[data-social-decline]");
    const cancel = event.target.closest("[data-social-cancel]");
    const remove = event.target.closest("[data-social-remove]");
    if (accept || decline) {
      const id = Number((accept || decline).dataset.socialAccept || (accept || decline).dataset.socialDecline);
      try { await rpc("respond_friend_request", { p_request_id: id, p_accept: !!accept }); toast(accept ? "Friend request accepted." : "Friend request declined."); await refreshFriends(); if (document.body.dataset.page === "profile") location.reload(); }
      catch (error) { toast(error.message || "Could not update this friend request."); }
    } else if (cancel) {
      try { await rpc("cancel_friend_request", { p_request_id: Number(cancel.dataset.socialCancel) }); toast("Friend request cancelled."); await refreshFriends(); if (document.body.dataset.page === "profile") location.reload(); }
      catch (error) { toast(error.message || "Could not cancel this request."); }
    } else if (remove) {
      if (!confirm(`Remove ${remove.dataset.socialRemove} from your friends?`)) return;
      try { await rpc("remove_friend", { p_username: remove.dataset.socialRemove }); toast("Friend removed."); await refreshFriends(); if (document.body.dataset.page === "profile") location.reload(); }
      catch (error) { toast(error.message || "Could not remove this friend."); }
    }
  });

  document.addEventListener("submit", async event => {
    if (event.target.id === "cph-add-form") {
      event.preventDefault();
      const input = event.target.querySelector("input[name=username]");
      const name = input.value.trim();
      if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) return toast("Use a valid website username (3–16 letters, numbers or underscores).");
      state.busy = true;
      const ok = await sendFriend(name);
      state.busy = false;
      if (ok) input.value = "";
      renderPanel();
    }
    if (event.target.id === "cph-compose") {
      event.preventDefault();
      const input = document.getElementById("cph-compose-text"), button = event.target.querySelector("button[type=submit]");
      const message = input.value.trim();
      if (!message || !state.chatUser) return;
      button.disabled = true;
      try {
        await rpc("send_direct_message", { p_username: state.chatUser, p_body: message });
        input.value = "";
        await loadMessages();
      } catch (error) { toast(error.message || "Message could not be sent."); }
      button.disabled = false;
      input.focus();
    }
  });

  async function init() {
    await heartbeat();
    await Promise.all([refreshCount(), refreshFriends()]);
    const params = new URLSearchParams(location.search);
    const chat = params.get("chat");
    if (chat) { setOpen(true); await openChat(chat); }
    else if (params.get("tab") === "friends") { state.tab = "friends"; setOpen(true); }
    setInterval(heartbeat, 45000);
    setInterval(refreshCount, 30000);
    setInterval(() => {
      refreshFriends();
      if (isOpen() && state.tab === "messages" && state.chatUser) loadMessages();
    }, 12000);
    window.addEventListener("focus", heartbeat);
  }
  init();
})();
