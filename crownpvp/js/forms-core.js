/* Shared form helper for reports and staff applications.
   1. Tries the real API (/api/...).
   2. If the API or database is not deployed yet, nothing breaks: the submission is kept on this device,
      shown as a ready-to-send message (copy + Discord button) and re-sent automatically once the API is healthy. */
(() => {
const BOX = "crown_outbox";
const read = () => { try { const v = JSON.parse(localStorage.getItem(BOX) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };
const write = list => { try { localStorage.setItem(BOX, JSON.stringify(list.slice(-10))); } catch { /* storage blocked */ } };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const FIELD_LABELS = { type: "Type", target: "Target", category: "Category", contact: "Discord", details: "Details", evidence: "Evidence",
  name: "Minecraft", discord: "Discord", role: "Role", ageBand: "Age range", timezone: "Time zone", availability: "Weekly hours", experience: "Experience", motivation: "Why me" };

function toText(kind, payload) {
  const head = kind === "reports" ? "CROWNPVP REPORT" : "CROWNPVP STAFF APPLICATION";
  const rows = Object.entries(payload).filter(([, v]) => String(v || "").trim()).map(([k, v]) => `${FIELD_LABELS[k] || k}: ${String(v).trim()}`);
  return `${head}\n${rows.join("\n")}`;
}

async function parse(r) { const raw = await r.text(); try { return raw ? JSON.parse(raw) : null; } catch { return null; } }

/* resolves {ok:true,data} when saved on the server, {ok:false,offline:true} when the API is not available.
   rejects with a normal Error for real validation problems (bad username, too short, no open role...) */
async function send(kind, payload) {
  let r;
  try {
    r = await fetch("/api/" + kind, { method: "POST", headers: { "content-type": "application/json", "x-requested-with": "crown" }, body: JSON.stringify(payload) });
  } catch { return { ok: false, offline: true }; }
  const data = await parse(r);
  if (r.ok && data) return { ok: true, data };
  if (data?.error && r.status >= 400 && r.status < 500 && ![404, 405].includes(r.status)) throw new Error(data.error);
  return { ok: false, offline: true };
}

function keep(kind, payload) {
  const list = read(); list.push({ kind, payload, at: Date.now() }); write(list);
}

function offlinePanel(container, kind, payload, onDone) {
  const text = toText(kind, payload), disc = (window.CROWN && window.CROWN.discord) || "#";
  container.innerHTML = `<div class="offline-box" role="status"><b>Saved on this device</b><p>The private inbox is not connected on this site yet, so nothing was lost. Copy the message below and send it in a ticket on our Discord. If the inbox comes online, this page sends it for you automatically.</p><textarea readonly rows="7" aria-label="Your submission">${esc(text)}</textarea><div class="offline-actions"><button type="button" class="btn gold" data-of-copy>Copy message</button><a class="btn ghost" href="${esc(disc)}" target="_blank" rel="noopener">Open Discord ↗</a><button type="button" class="btn ghost" data-of-close>Done</button></div></div>`;
  const ta = container.querySelector("textarea");
  container.querySelector("[data-of-copy]").onclick = async () => {
    try { await navigator.clipboard.writeText(text); } catch { ta.select(); document.execCommand("copy"); }
    window.CP?.toast("Message copied. Paste it in a Discord ticket.");
  };
  container.querySelector("[data-of-close]").onclick = () => { container.innerHTML = ""; onDone?.(); };
  container.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* quietly re-send anything saved earlier, but only when the server says forms are ready */
async function flush() {
  const list = read(); if (!list.length) return;
  let h; try { const r = await fetch("/api/health", { headers: { "x-requested-with": "crown" } }); h = r.ok ? await parse(r) : null; } catch { h = null; }
  if (!h?.forms) return;
  const left = []; let sent = 0;
  for (const item of list) {
    try { const res = await send(item.kind, item.payload); if (res.ok) sent++; else left.push(item); } catch { /* invalid or duplicate: drop it */ }
  }
  write(left);
  if (sent) window.CP?.toast(`${sent} saved ${sent === 1 ? "submission was" : "submissions were"} sent to the owner inbox.`);
}

/* live character counter + draft autosave for any form */
function enhance(form, key) {
  const draftKey = "crown_draft_" + key;
  let draft = {}; try { draft = JSON.parse(localStorage.getItem(draftKey) || "{}") || {}; } catch { /* none */ }
  [...form.elements].forEach(el => { if (el.name && draft[el.name] && el.type !== "checkbox" && !el.value) { el.value = draft[el.name]; el.dispatchEvent(new Event("change", { bubbles: true })); } });
  form.querySelectorAll("textarea[maxlength]").forEach(t => {
    const c = document.createElement("small"); c.className = "char-count"; t.after(c);
    const upd = () => { const min = Number(t.getAttribute("minlength")) || 0; c.textContent = `${t.value.length} / ${t.maxLength}${min && t.value.length < min ? ` · minimum ${min}` : ""}`; c.classList.toggle("low", !!min && t.value.length < min); };
    t.addEventListener("input", upd); upd(); t._upd = upd;
  });
  let timer; form.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => {
    const d = {}; [...form.elements].forEach(el => { if (el.name && el.type !== "checkbox" && el.value) d[el.name] = el.value; });
    try { localStorage.setItem(draftKey, JSON.stringify(d)); } catch { /* storage blocked */ }
  }, 400); });
  return () => { try { localStorage.removeItem(draftKey); } catch { /* storage blocked */ } form.querySelectorAll("textarea").forEach(t => t._upd?.()); };
}

window.CrownForms = { send, keep, offlinePanel, flush, enhance };
addEventListener("load", () => setTimeout(flush, 1200));
})();
