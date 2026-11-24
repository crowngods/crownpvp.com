/* Home page hub: news feed (config.news) and the crown team widget (config.leadership + config.developer). */
(() => {
const C = window.CROWN, esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"], LABEL = { owner: "Owner", coowner: "Co-Owner", developer: "Developer" };
const feed = document.getElementById("news-feed"), team = document.getElementById("hub-team");
if (feed) feed.innerHTML = (C.news || []).map(n => { const d = new Date(n.date + "T12:00:00");
  return `<article class="news-card"><div class="news-date" aria-hidden="true"><b>${d.getDate()}</b><span>${MON[d.getMonth()]}</span></div><div class="news-body"><div class="news-meta"><span class="news-tag">${esc(n.tag)}</span><span>by ${esc(n.author)}</span></div><h3>${esc(n.title)}</h3><p>${esc(n.body)}</p>${n.link ? `<a href="${esc(n.link)}">${esc(n.cta || "Read more")} →</a>` : ""}</div></article>`; }).join("");
if (team) team.innerHTML = [...(C.leadership || []), C.developer && { rank: "developer", name: C.developer.name }].filter(Boolean).map(m =>
  `<div class="hub-person ${esc(m.rank)}"><img src="https://mc-heads.net/avatar/${encodeURIComponent(m.name)}/64" alt="" width="44" height="44" loading="lazy"><div><b>${esc(m.name)}</b><small>${esc(LABEL[m.rank] || m.rank)}</small></div></div>`).join("");
})();
