(() => {
  "use strict";
  const $ = (s, root = document) => root.querySelector(s);
  const dialog = $("#authDialog"), authForm = $("#authForm"), authError = $("#authError");
  const C = window.CROWN || {};
  const apiBase = C.supabaseUrl ? `${C.supabaseUrl.replace(/\/+$/, "")}/functions/v1/trace-api` : "";
  const state = { session: "", profile: null, toastTimer: 0 };
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
  const date = value => value ? new Date(Number(value)).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Unavailable";
  const count = value => Number(value || 0).toLocaleString();
  const toast = (message, error = false) => {
    const node = $("#toast"); node.textContent = message; node.className = `toast show${error ? " error" : ""}`;
    clearTimeout(state.toastTimer); state.toastTimer = setTimeout(() => { node.className = "toast"; }, 3200);
  };
  async function api(path, options = {}) {
    if (!apiBase || !C.supabaseKey) throw new Error("Trace service is not configured. Contact the site administrator.");
    const headers = { apikey: C.supabaseKey };
    if (options.body) headers["content-type"] = "application/json";
    if (state.session && !options.auth) headers["x-owner-session"] = state.session;
    let response;
    try {
      response = await fetch(`${apiBase}${path || "/summary"}`, {
        method: options.method || "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        cache: "no-store"
      });
    } catch {
      throw new Error("The secure trace service could not be reached. Check your connection and try again.");
    }
    const data = await response.json().catch(() => ({}));
    if (response.status === 401 && state.session && !options.auth) {
      state.session = "";
      lock("Your private session expired. Enter the owner password to continue.");
    }
    if (!response.ok) throw new Error(data.error || (response.status === 403 ? "Access denied. Verify the owner password." : "The request could not be completed."));
    return data;
  }
  function lock(message = "") {
    state.session = ""; state.profile = null; $("#ownerKey").value = "";
    $("#resultArea").replaceChildren(); $("#emptyState").hidden = false;
    $("#conversationForm").hidden = true; $("#conversationList").innerHTML = `<div class="list-placeholder"><span>▤</span><b>No player selected</b><small>Search for a player to review linked conversations.</small></div>`;
    $("#exportButton").disabled = true; authError.textContent = message; dialog.showModal();
  }
  async function loadSummary() {
    const summary = await api("");
    $("#statAccounts").textContent = count(summary.accounts);
    $("#statLogins").textContent = count(summary.logins);
    $("#statConversations").textContent = count(summary.conversations);
    $("#dataStatus").textContent = "Connected";
    $("#dataUpdated").textContent = summary.latest ? `Latest event ${date(summary.latest)}` : "No imported log events";
  }
  function renderTimeline(profile) {
    const items = [
      ...profile.logins.map(row => ({ at: row.occurred, title: "Authorized server connection", detail: `${row.source} · ${row.networkFingerprint || "No network data"}` })),
      ...profile.conversations.map(row => ({ at: row.created, title: "Conversation recorded", detail: `By ${row.author}` })),
      ...profile.notes.map(row => ({ at: row.created, title: "Investigation note added", detail: `By ${row.author}` }))
    ].sort((a, b) => b.at - a.at).slice(0, 16);
    return items.length ? items.map(item => `<div class="timeline-item"><i class="timeline-dot"></i><div><b>${esc(item.title)}</b><small>${esc(date(item.at))} · ${esc(item.detail)}</small></div></div>`).join("")
      : `<p class="timeline-empty">No connection or investigation events were found in the authorized dataset.</p>`;
  }
  function renderAlts(items) {
    if (!items.length) return `<div class="no-alt"><b>No corroborated account links</b>No candidate met the minimum multi-day evidence threshold. A network overlap alone is never shown as an alternate account.</div>`;
    return `<div class="alt-list">${items.map(item => `<article class="alt-item"><div><b>${esc(item.username)}</b><small>UUID ${esc(item.uuid)}</small><div class="evidence-tags">${item.evidence.map(e => `<span class="evidence-tag">${esc(e)}</span>`).join("")}</div></div><span class="confidence">${esc(item.confidence)} SIGNAL</span><p class="disclaimer">${esc(item.caution)}</p></article>`).join("")}</div>`;
  }
  function renderNotesForm(uuid) {
    return `<form class="note-form" id="noteForm"><label for="noteBody">Investigation note</label><textarea id="noteBody" name="body" maxlength="3000" rows="2" required placeholder="Add a factual, source-attributed note…"></textarea><button class="button button-quiet" type="submit">Attach note <span>＋</span></button></form>`;
  }
  function renderReport(profile) {
    const player = profile.account;
    state.profile = profile; $("#emptyState").hidden = true; $("#exportButton").disabled = false;
    $("#conversationForm").hidden = false;
    $("#resultArea").innerHTML = `<section class="profile-report glass">
      <div class="section-head"><div><span class="section-kicker">INVESTIGATION REPORT · PRIVATE</span><div class="profile-head"><div class="avatar">${esc(player.username.slice(0, 1).toUpperCase())}</div><div class="profile-title"><h2>${esc(player.username)}</h2><p>UUID ${esc(player.uuid)}</p></div><span class="case-status">RECORDS FOUND</span></div></div><span class="source-tag"><i></i> REPORT <b>PRIVATE</b></span></div>
      <div class="profile-meta"><div class="meta-cell"><span>SERVER</span><b>play.pika-network.net</b></div><div class="meta-cell"><span>FIRST SEEN</span><b>${esc(date(player.firstSeen))}</b></div><div class="meta-cell"><span>LAST SEEN</span><b>${esc(date(player.lastSeen))}</b></div></div>
      <div class="report-grid">
        <article class="report-block"><div class="block-head"><h3>Network information</h3><small>PRIVACY RESTRICTED</small></div><div class="ip-unavailable"><span class="ip-icon">⌁</span><div><b>IP address unavailable</b><small>Raw addresses are not retained. Authorized logs may contribute keyed fingerprints only.</small></div></div>
          <div class="block-head" style="margin-top:20px"><h3>Possible account correlations</h3><small>${profile.possibleAlts.length} QUALIFIED</small></div>${renderAlts(profile.possibleAlts)}
        </article>
        <article class="report-block"><div class="block-head"><h3>Investigation timeline</h3><small>${profile.logins.length} CONNECTIONS · ${profile.notes.length} NOTES</small></div><div class="timeline">${renderTimeline(profile)}</div>${renderNotesForm(player.uuid)}</article>
      </div>
    </section>`;
    renderConversations(profile.conversations);
    $("#noteForm").addEventListener("submit", async event => {
      event.preventDefault();
      const body = new FormData(event.currentTarget).get("body");
      try {
        await api("/notes", { method: "POST", body: { uuid: player.uuid, body } });
        renderReport(await api(`/search?q=${encodeURIComponent(player.uuid)}`));
        toast("Investigation note saved.");
      } catch (error) { toast(error.message, true); }
    });
  }
  function renderConversations(records) {
    $("#conversationList").innerHTML = records.length ? records.map(row => `<article class="conversation-card"><header><b>${esc(row.author)}</b><time>${esc(date(row.created))}</time></header><p>${esc(row.body)}</p>${row.evidence ? `<small>Evidence reference · ${esc(row.evidence)}</small>` : ""}</article>`).join("")
      : `<div class="list-placeholder"><span>▤</span><b>No conversation records</b><small>Add an administrator-recorded conversation for this profile.</small></div>`;
  }
  $("#searchForm").addEventListener("submit", async event => {
    event.preventDefault();
    const query = $("#searchInput").value.trim();
    if (!query) return;
    state.profile = null; $("#conversationForm").hidden = true;
    $("#resultArea").innerHTML = `<section class="section glass"><span class="section-kicker">SEARCHING AUTHORIZED RECORDS…</span></section>`;
    try { renderReport(await api(`/search?q=${encodeURIComponent(query)}`)); }
    catch (error) { $("#resultArea").replaceChildren(); $("#emptyState").hidden = false; toast(error.message, true); }
  });
  $("#conversationForm").addEventListener("submit", async event => {
    event.preventDefault();
    if (!state.profile) return;
    const form = new FormData(event.currentTarget), uuid = state.profile.account.uuid;
    try {
      await api("/conversations", { method: "POST", body: { uuid, body: form.get("body"), evidence: form.get("evidence") } });
      event.currentTarget.reset();
      renderReport(await api(`/search?q=${encodeURIComponent(uuid)}`));
      await loadSummary(); toast("Conversation record saved.");
    } catch (error) { toast(error.message, true); }
  });
  $("#exportButton").addEventListener("click", () => {
    if (!state.profile) return;
    const report = { title: "TRACE MINECRAFT ACCOUNT", server: "play.pika-network.net", exportedAt: new Date().toISOString(),
      account: state.profile.account, ipAddress: "Unavailable — raw addresses are not retained",
      possibleAlternateAccounts: state.profile.possibleAlts, connectionHistory: state.profile.logins,
      investigationNotes: state.profile.notes, conversations: state.profile.conversations };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
    link.download = `trace-${state.profile.account.username}-${new Date().toISOString().slice(0, 10)}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  });
  $("#lockButton").addEventListener("click", () => lock());
  authForm.addEventListener("submit", async event => {
    event.preventDefault();
    const password = $("#ownerKey").value;
    $("#ownerKey").value = "";
    authError.textContent = "";
    try {
      const result = await api("/auth", { method: "POST", body: { password }, auth: true });
      state.session = result.session;
      await loadSummary();
      dialog.close();
    } catch (error) {
      state.session = "";
      authError.textContent = error.message || "Authentication failed. Please try again.";
    }
  });
  $("#searchInput").addEventListener("keydown", event => { if (event.key === "Escape") event.currentTarget.value = ""; });
  lock();
})();
