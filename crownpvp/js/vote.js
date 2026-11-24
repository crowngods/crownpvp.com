/* CrownPVP vote page. Links come from js/config.js (voteSites). The tracker is a personal reminder stored on this device only. */
(() => {
const { $, esc } = CP, C = window.CROWN, KEY = "crown_vote_v1", DAY = 864e5, sites = C.voteSites || [];
let st = { user: "", t: {} };
try { st = Object.assign(st, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch { /* storage unavailable */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* ignore */ } };
const host = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };
const left = ms => { const h = Math.floor(ms / 36e5), m = Math.ceil((ms % 36e5) / 6e4); return h ? `${h}h ${m}m` : `${m}m`; };
function draw() {
  const now = Date.now(); let done = 0;
  $("#vote-list").innerHTML = sites.map((s, i) => {
    const wait = st.t[s.url] ? st.t[s.url] + DAY - now : 0, cool = wait > 0; if (cool) done++;
    return `<article class="vote-row${cool ? " done" : ""}"><span class="vote-no">#${i + 1}</span><div class="vote-info"><h3>${esc(s.name)}</h3><small>${esc(host(s.url))}</small></div>${cool ? `<span class="vote-cool">Opened &middot; again in ${left(wait)}</span>` : ""}<a class="btn ${cool ? "ghost" : "gold"} vote-go" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" data-site="${i}">${cool ? "Open again" : "Click to vote"} <span aria-hidden="true">↗</span></a></article>`;
  }).join("");
  $("#vote-count").textContent = `${done} / ${sites.length}`;
  $("#vote-fill").style.width = (sites.length ? done / sites.length * 100 : 0) + "%";
}
$("#vote-name").value = st.user;
$("#vote-form").addEventListener("submit", e => {
  e.preventDefault(); const v = $("#vote-name").value.trim();
  if (!/^\w{3,16}$/.test(v)) return CP.toast("Enter a valid Minecraft username (3-16 characters).");
  st.user = v; save(); CP.toast("Saved " + v);
});
$("#vote-copy").addEventListener("click", async () => {
  const v = $("#vote-name").value.trim(); if (!/^\w{3,16}$/.test(v)) return CP.toast("Enter your username first.");
  try { await navigator.clipboard.writeText(v); CP.toast("Copied " + v); } catch { CP.toast("Your username: " + v); }
});
$("#vote-list").addEventListener("click", e => { const a = e.target.closest("[data-site]"); if (!a) return; st.t[sites[a.dataset.site].url] = Date.now(); save(); setTimeout(draw, 300); });
document.querySelectorAll("[data-discord]").forEach(a => { a.href = C.discord; a.target = "_blank"; a.rel = "noopener"; });
draw(); setInterval(draw, 60000);
})();
