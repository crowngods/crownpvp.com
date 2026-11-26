(() => {
const { $, esc } = CP;
const RANKS = [
  { id: "owner", name: "Owner", color: "#f5d76e", blurb: "Leads the network and makes final decisions.", people: ["MedicalWeed"] },
  { id: "dev", name: "Developer", color: "#7dd3fc", blurb: "Builds and maintains the website, plugins and server systems.", people: ["Raizukennn"] },
  { id: "admin", name: "Admin", color: "#fb7185", blurb: "Oversees staff, reviews serious cases and maintains fair enforcement.", slots: 3 },
  { id: "moderator", name: "Moderator", color: "#c4a1ff", blurb: "Investigates reports, moderates chat and handles rule violations.", slots: 2 },
  { id: "helper", name: "Helper", color: "#6ee7a0", blurb: "Welcomes players, answers questions and assists the community.", slots: 3 },
  { id: "trial", name: "Trial Staff", color: "#fdba74", blurb: "Learns team procedures while working with experienced staff.", slots: 5 }
];
let openings = Object.fromEntries(RANKS.filter(r => r.slots).map(r => [r.id, { total: r.slots, available: r.slots }]));
function render() {
  $("#staff").innerHTML = RANKS.map(r => {
    const o = openings[r.id] || { available: r.slots || 0, total: r.slots || 0, members: [] };
    const people = [...new Set([...(r.people || []), ...(o.members || [])])].map(n => `<article class="scard" data-n="${esc(n.toLowerCase())}"><img src="https://mc-heads.net/body/${encodeURIComponent(n)}/180" alt="${esc(n)} skin" width="90" height="160" loading="lazy"><div><h3>${esc(n)}</h3><span class="rtag">${r.name}</span><span class="on-tag" hidden><i class="live-dot"></i> Online now</span></div></article>`).join("");
    const vacancies = r.slots ? (o.available > 0 ? Array.from({length:o.available},(_,i)=>`<article class="scard open"><div class="ph-av" aria-hidden="true">+</div><div><h3>Open position ${i+1}</h3><span class="rtag">${r.name}</span><a href="#apply" data-apply-role="${r.id}">Apply for this role ↗</a></div></article>`).join("") : `<article class="scard open"><div class="ph-av" aria-hidden="true">—</div><div><h3>Applications closed</h3><span class="rtag">${r.name}</span><small>All available places are filled.</small></div></article>`) : "";
    return `<div class="rank" style="--rc:${r.color}"><div class="rank-h"><div><h2>${r.name}</h2><p>${esc(r.blurb)}</p></div><span>${r.slots ? `${o.available} / ${r.slots} open` : `${(r.people || []).length} member`}</span></div><div class="staff-grid">${people}${vacancies}</div></div>`;
  }).join("");
  $("#roles").innerHTML = RANKS.filter(r => r.id !== "owner" && r.id !== "dev").map(r => `<article class="role" style="--rc:${r.color}"><b>${r.name}</b><p>${esc(r.blurb)}</p></article>`).join("");
  const select = $("#application-role");
  if (select) [...select.options].forEach(o => { if (!o.value) return; const x = openings[o.value]; o.disabled = !!x && x.available < 1; o.textContent = `${rTitle(o.value)} · ${x?.available ?? 0} available`; });
  document.querySelectorAll("[data-apply-role]").forEach(a => a.addEventListener("click", () => { const sel = $("#application-role"); if (sel) sel.value = a.dataset.applyRole; }));
}
function rTitle(id) { return ({admin:"Admin",moderator:"Moderator",helper:"Helper",trial:"Trial Staff"})[id] || id; }
render();
fetch("/api/applications/openings").then(r => r.json()).then(d => { if (d.roles) { openings = d.roles; render(); } }).catch(() => {});
document.querySelectorAll("[data-discord]").forEach(a => { a.href = window.CROWN.discord; a.target = "_blank"; a.rel = "noopener"; });
CP.status.then(d => { const on = new Set((d?.players?.list || []).map(p => p.name.toLowerCase())); let n = 0; document.querySelectorAll(".scard[data-n]").forEach(c => { if (on.has(c.dataset.n)) { n++; c.classList.add("is-on"); c.querySelector(".on-tag").hidden = false; } }); $("#staff-on").textContent = !d ? "n/a" : d.players?.list ? n : "n/a"; });
})();