/* Live Discord card. Counts come from Discord's public invite API; avatars come from the server widget.
   For avatars: Discord > Server Settings > Widget > "Enable Server Widget". If anything is unavailable the card still shows the Join button. */
(() => {
const C = window.CROWN, card = document.getElementById("dc-card"); if (!card) return;
const code = ((C.discord || "").match(/(?:discord\.gg|discord\.com\/invite)\/([\w-]+)/) || [])[1], gid = C.discordGuildId;
const $ = id => document.getElementById(id), fmt = n => Number(n).toLocaleString("en-US");
const get = u => fetch(u, { headers: { accept: "application/json" } }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
const safeImg = u => typeof u === "string" && /^https:\/\/(cdn|media)\.discordapp\.(com|net)\//.test(u);
Promise.allSettled([
  code ? get(`https://discord.com/api/v10/invites/${encodeURIComponent(code)}?with_counts=true`) : Promise.reject(),
  gid ? get(`https://discord.com/api/guilds/${encodeURIComponent(gid)}/widget.json`) : Promise.reject()
]).then(([inv, wid]) => {
  const i = inv.status === "fulfilled" ? inv.value : null, w = wid.status === "fulfilled" ? wid.value : null;
  const name = i?.guild?.name || w?.name; if (name) $("dc-name").textContent = name;
  if (i?.guild?.icon && i.guild.id) { const img = $("dc-icon"); img.onerror = () => { img.src = "assets/icon-192.png"; }; img.src = `https://cdn.discordapp.com/icons/${encodeURIComponent(i.guild.id)}/${encodeURIComponent(i.guild.icon)}.png?size=128`; }
  const online = i?.approximate_presence_count ?? w?.presence_count, total = i?.approximate_member_count;
  if (online != null || total != null) {
    if (online != null) $("dc-on").textContent = fmt(online);
    if (total != null) $("dc-total").textContent = fmt(total); else { $("dc-total").parentElement.hidden = true; document.querySelector("#dc-counts .sep").hidden = true; }
    $("dc-counts").hidden = false; $("dc-fallback").hidden = true;
  }
  const lp = $("lp-dc"); if (lp && total != null) { lp.textContent = fmt(total); lp.hidden = false; }
  const people = (w?.members || []).filter(m => safeImg(m.avatar_url)).slice(0, 8);
  if (people.length) {
    const more = Math.max(0, (online ?? w.presence_count ?? people.length) - people.length), box = $("dc-avatars");
    box.replaceChildren(...people.map(m => { const im = document.createElement("img"); im.src = m.avatar_url; im.alt = ""; im.width = im.height = 36; im.loading = "lazy"; return im; }));
    if (more) { const s = document.createElement("span"); s.textContent = "+" + fmt(more); box.append(s); }
    box.hidden = false;
  }
});
})();
