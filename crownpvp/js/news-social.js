/* CrownPVP news feed: Facebook-style posts, emoji reactions and comments. Staff can create posts here.
   Permissions are enforced by the database (supabase/news-social.sql), not by this file. */
(() => {
const feed = document.getElementById("feed"), comp = document.getElementById("composer"); if (!feed) return;
const CP = window.CP, esc = CP.esc;
const QUICK = ["❤️", "😂", "🔥", "😮", "👑"], MORE = "😀 😁 😍 🥰 😎 🤩 😭 😡 🤔 🙌 👏 💪 🎉 💯 ⚔️ 🛡️ 💎 💣 🏆 👀 💀 🤝 ✨ 😢 🥳".split(" ");
const POSTERS = ["owner", "coowner", "manager", "admin", "developer", "media"];
const BADGE = `<svg class="vb" viewBox="0 0 24 24" role="img" aria-label="Verified"><title>Verified</title><circle cx="12" cy="12" r="11" fill="#1877f2"/><path d="M7 12.5l3.2 3.2L17 8.8" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const GLOBE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-label="Public"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>`;
const FALLBACK = [
 { id: "opening-date", image_url: "assets/opening-date.webp", created_at: "2026-11-24T05:00:00Z", body: "SERVER OPENING DATE UPDATE\n\nHey everyone! We've decided to move the official opening of CrownPVP to November 27! We're taking a little extra time to add more exciting features, improve gameplay, and make sure everyone gets the best possible experience when they join.\n\nWe want to make sure CrownPVP is worth the wait, and we're working hard behind the scenes to bring you something you'll truly enjoy! ❤️\n\nThank you for your patience and continued support. We can't wait to see you all on release!" },
 { id: "staff-hiring", created_at: "2026-11-23T05:00:00Z", body: "STAFF APPLICATIONS ARE OPEN\n\nWant to become part of the CrownPVP Staff Team? We're looking for dedicated members to help our growing community as we prepare for more upcoming gamemodes!\n\n📋 Apply now through our website: https://crownpvp.com/staff\n\nGood luck, future staff members! ❤️" },
 { id: "raid-shield", created_at: "2026-11-22T05:00:00Z", body: "⚔️ FACTION RAID SHIELD UPDATE\n\nTo keep raids fair and competitive, OP Factions now uses a 5-hour raid window: shields are open for 5 hours and closed for 19, repeating every 24 hours.\n\n🔥 Prepare your cannons. Protect your base. Choose your raid time wisely.\n\nFull details: https://crownpvp.com/opfactions#raid" }];
const S = { posts: FALLBACK, R: [], C: [], A: new Map(), auth: null, can: false, social: false, open: new Set(), note: "" };
const safeImg = u => /^(https:\/\/|assets\/)[^\s"'<>]+$/.test(u || "") ? u : "";
const rich = t => esc(t).replace(/(https:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
const when = iso => { const m = Math.floor((Date.now() - new Date(iso)) / 60000); if (m < 1) return "Just now"; if (m < 60) return m + (m === 1 ? " minute ago" : " minutes ago"); const h = Math.floor(m / 60); if (h < 24) return h + (h === 1 ? " hour ago" : " hours ago"); const d = Math.floor(h / 24); return d < 7 ? d + (d === 1 ? " day ago" : " days ago") : new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); };
const me = () => S.auth?.user?.id;
const avatarOf = (url, name = "CrownPVP") => {
  const safe = /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/avatars\//.test(url || "") ? url : CP.head(name, 64);
  return `<img class="fb-av" src="${esc(safe)}" alt="" width="42" height="42">`;
};
const commentAv = c => {
  const url = S.A.get(c.user_id)?.avatar_url;
  if (/^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/avatars\//.test(url || "")) return `<img class="fb-av" src="${esc(url)}" alt="" width="32" height="32" loading="lazy">`;
  return `<span class="fb-av" aria-hidden="true">${esc(c.username.slice(0, 1).toUpperCase())}</span>`;
};
const rankName = rank => ({ owner:"Owner", coowner:"Co-Owner", manager:"Manager", admin:"Admin", moderator:"Moderator", helper:"Helper", media:"Media", developer:"Developer" }[String(rank || "").toLowerCase()] || (rank ? String(rank).replace(/[_-]/g," ").replace(/\b\w/g, x => x.toUpperCase()) : "Player"));
const authorFor = p => p.author_profile || (p.created_by ? { username: "CrownPVP Player", staff_rank: null } : { username: "Crown Team", staff_rank: "official" });
const who = () => { const a = S.auth; return a.profile?.username || a.user?.user_metadata?.full_name || a.user?.user_metadata?.name || (a.user?.email || "player").split("@")[0]; };

const postHtml = p => {
  const id = p.id, rs = S.R.filter(x => x.post === id), cs = S.C.filter(x => x.post === id), uid = me(), counts = {};
  rs.forEach(x => counts[x.emoji] = (counts[x.emoji] || 0) + 1);
  const mine = new Set(rs.filter(x => x.user_id === uid).map(x => x.emoji));
  const chips = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([e, n]) => `<button type="button" class="fb-chip${mine.has(e) ? " me" : ""}" data-e="${esc(e)}" aria-label="${esc(e)} ${n}">${esc(e)} ${n}</button>`).join("");
  const list = S.open.has(id) ? cs : cs.slice(0, 3), img = safeImg(p.image_url), author = authorFor(p);
  const authorName = author.username || "Crown Team", rank = author.staff_rank === "official" ? "Official News" : (author.position_title || rankName(author.staff_rank));
  const authorAvatar = author.staff_rank === "official" ? `<img class="fb-av fb-av-logo" src="assets/crown-team-logo.webp" alt="CrownPVP" width="62" height="62">` : avatarOf(author.avatar_url, authorName);
  const bodyParts = String(p.body || "").split(/\r?\n/);
  const title = (bodyParts.shift() || "CrownPVP Update").trim();
  const body = bodyParts.join("\n").trim();
  const profileHref = authorName === "Crown Team" ? "index.html" : `profile.html?u=${encodeURIComponent(authorName)}`;
  const commentBox = uid ? `<form class="fb-cf"><textarea maxlength="500" required placeholder="Write a comment..." aria-label="Write a comment"></textarea><button class="hx-btn sm" type="submit">Post</button></form>` : `<p class="hx-note" style="margin-top:10px"><a href="login.html?next=index.html" style="color:#8d251b;font-weight:700">Log in</a> to react or comment.</p>`;
  return `<article class="hx-card fb" data-post="${esc(id)}">
    <aside class="fb-author-rail">${authorAvatar}<b><a class="fb-name-link" href="${profileHref}">${esc(authorName)}</a> ${authorName === "Crown Team" ? BADGE : ""}</b><small class="fb-author-rank">${esc(rank)}</small></aside>
    <div class="fb-main">
      <div class="fb-h"><span class="fb-date">${when(p.created_at)} &middot; ${GLOBE}</span>${S.can && S.social ? `<button type="button" class="fb-x" data-delpost aria-label="Delete post">&#10005;</button>` : ""}</div>
      <h3 class="fb-title">${rich(title)}</h3>
      ${body ? `<div class="fb-t">${rich(body)}</div>` : ""}
      ${img ? `<img class="fb-img" src="${esc(img)}" alt="" loading="lazy">` : ""}
      ${S.social ? `<div class="fb-stats"><div class="fb-chips">${chips || '<span>Be the first to react</span>'}</div><span>${cs.length} ${cs.length === 1 ? "comment" : "comments"}</span></div>
      <div class="fb-actions"><button type="button" data-e="👍" class="${mine.has("👍") ? "me" : ""}">👍 Like${counts["👍"] ? " " + counts["👍"] : ""}</button><button type="button" data-focus>💬 Comment</button><button type="button" data-more>😊 React</button></div>
      <div class="hx-pick" hidden>${[...QUICK, ...MORE].map(e => `<button type="button" data-e="${e}">${e}</button>`).join("")}</div>
      <div class="fb-cm">${list.map(c => `<div class="fb-c"><a class="fb-c-profile" href="profile.html?u=${encodeURIComponent(c.username)}" aria-label="View ${esc(c.username)}'s profile">${commentAv(c)}</a><div><b><a class="fb-name-link" href="profile.html?u=${encodeURIComponent(c.username)}">${esc(c.username)}</a> <small>${when(c.created_at)}</small>${c.user_id === uid || S.can ? `<button type="button" data-del="${c.id}">Delete</button>` : ""}</b><p>${esc(c.body)}</p></div></div>`).join("")}${cs.length > 3 && !S.open.has(id) ? `<button type="button" class="more" data-all>View all ${cs.length} comments</button>` : ""}${commentBox}</div>` : ""}
    </div>
  </article>`;
};
const drawPost = id => { const el = feed.querySelector(`[data-post="${CSS.escape(id)}"]`), p = S.posts.find(x => x.id === id); if (el && p) el.outerHTML = postHtml(p); };
const drawAll = () => { feed.innerHTML = S.posts.map(postHtml).join("") + (S.note ? `<p class="hx-note" style="color:#e9dcc3">${S.note}</p>` : "") || `<p class="hx-note" style="color:#e9dcc3">No posts yet.</p>`; };

const loadSocial = async () => {
  const ids = S.posts.map(p => p.id); if (!ids.length) { S.R = []; S.C = []; return; }
  const sb = S.auth.sb, [r, c] = await Promise.all([sb.from("news_reactions").select("post,emoji,user_id").in("post", ids), sb.from("news_comments").select("id,post,user_id,username,body,created_at").in("post", ids).order("created_at", { ascending: false }).limit(300)]);
  if (r.error || c.error) { S.social = false; S.note = "Comments and reactions are not set up yet (run supabase/news-social.sql)."; return; }
  S.R = r.data; S.C = c.data; S.social = true; S.note = "";
  const commenterIds = [...new Set(S.C.map(x => x.user_id).filter(Boolean))];
  if (commenterIds.length) {
    const { data: people, error: pe } = await sb.rpc("get_news_comment_authors", { p_user_ids: commenterIds });
    if (!pe && people) S.A = new Map(people.map(a => [a.user_id, a]));
  }
};
const loadPosts = async () => {
  const { data, error } = await S.auth.sb.from("news_posts").select("id,body,image_url,created_at,created_by").order("created_at", { ascending: false }).limit(30);
  if (error) { S.posts = FALLBACK; S.can = false; S.note = "Posting is not set up yet (run supabase/news-social.sql)."; return false; }
  S.posts = data || [];
  const authorIds = [...new Set(S.posts.map(p => p.created_by).filter(Boolean))];
  if (authorIds.length) {
    const { data: authors, error: authorError } = await S.auth.sb.rpc("get_news_post_authors", { p_user_ids: authorIds });
    if (!authorError) {
      const byId = new Map((authors || []).map(a => [a.user_id, a]));
      S.posts = S.posts.map(p => ({ ...p, author_profile: p.created_by ? byId.get(p.created_by) || null : null }));
    }
  }
  return true;
};
let blob = null;
const drawComposer = () => { if (!comp || !S.can || !S.social) { if (comp) comp.innerHTML = ""; return; }
  comp.innerHTML = `<div class="hx-card fb fb-composer"><aside class="fb-author-rail">${avatarOf(S.auth?.profile?.avatar_url, who())}<b>${esc(who())} ${BADGE}</b><small class="fb-author-rank">${esc(S.auth?.profile?.position_title || rankName(S.auth?.profile?.staff_rank))}</small></aside><div class="fb-main"><div class="fb-h"><span class="fb-date">Create a post &middot; staff only</span></div><form id="cform"><textarea maxlength="2000" required placeholder="What's the latest news?" aria-label="Post text"></textarea><img id="cprev" alt="Photo preview" hidden><div class="fb-row"><label class="hx-btn sm dark" for="cfile">Add photo</label><input id="cfile" type="file" accept="image/*" hidden><button class="hx-btn sm" type="submit">Post</button></div><p class="hx-note" id="cmsg" aria-live="polite"></p></form></div></div>`; };

const shrink = file => new Promise((ok, no) => { const i = new Image(); i.onload = () => { const k = Math.min(1, 1280 / i.width), c = document.createElement("canvas"); c.width = Math.round(i.width * k); c.height = Math.round(i.height * k); c.getContext("2d").drawImage(i, 0, 0, c.width, c.height); c.toBlob(b => b ? ok(b) : no(), "image/jpeg", .85); }; i.onerror = no; i.src = URL.createObjectURL(file); });

document.addEventListener("change", async e => { if (e.target.id !== "cfile" || !e.target.files[0]) return;
  try { blob = await shrink(e.target.files[0]); const p = document.getElementById("cprev"); p.src = URL.createObjectURL(blob); p.hidden = false; } catch { document.getElementById("cmsg").textContent = "That image could not be read."; } });
document.addEventListener("submit", async e => { if (e.target.id !== "cform") return; e.preventDefault();
  const f = e.target, btn = f.querySelector("button[type=submit]"), msg = document.getElementById("cmsg"), sb = S.auth.sb; btn.disabled = true; msg.textContent = "Posting...";
  let url = null;
  if (blob) { const path = `${me()}/${Date.now()}.jpg`, up = await sb.storage.from("news-images").upload(path, blob, { contentType: "image/jpeg" });
    if (up.error) { btn.disabled = false; msg.textContent = "Photo upload failed. You may not have permission to post."; return; }
    url = sb.storage.from("news-images").getPublicUrl(path).data.publicUrl; }
  const { error } = await sb.from("news_posts").insert({ body: f.querySelector("textarea").value.trim(), image_url: url });
  if (error) { btn.disabled = false; msg.textContent = "Could not post. Only staff with a posting rank can create posts."; return; }
  blob = null; await loadPosts(); await loadSocial(); drawComposer(); drawAll(); CP.toast("Posted"); });

feed.addEventListener("click", async e => {
  const art = e.target.closest("[data-post]"); if (!art || !S.auth) return; const id = art.dataset.post, sb = S.auth.sb;
  if (e.target.closest("[data-more]")) { const k = art.querySelector(".hx-pick"); k.hidden = !k.hidden; return; }
  if (e.target.closest("[data-focus]")) { art.querySelector("textarea")?.focus(); return; }
  if (e.target.closest("[data-all]")) { S.open.add(id); return drawPost(id); }
  const b = e.target.closest("[data-e]"), d = e.target.closest("[data-del]");
  if (b) { if (!me()) return CP.toast("Log in to react.");
    const on = S.R.some(x => x.post === id && x.emoji === b.dataset.e && x.user_id === me());
    const { error } = on ? await sb.from("news_reactions").delete().match({ post: id, emoji: b.dataset.e, user_id: me() }) : await sb.from("news_reactions").insert({ post: id, emoji: b.dataset.e });
    if (error) return CP.toast("Could not save your reaction."); await loadSocial(); drawPost(id);
  } else if (d) { const { error } = await sb.from("news_comments").delete().eq("id", d.dataset.del); if (error) return CP.toast("Could not delete."); await loadSocial(); drawPost(id);
  } else if (e.target.closest("[data-delpost]")) { if (!confirm("Delete this post for everyone?")) return;
    const { error } = await sb.from("news_posts").delete().eq("id", id); if (error) return CP.toast("Could not delete the post."); await loadPosts(); await loadSocial(); drawAll(); }
});
feed.addEventListener("submit", async e => { e.preventDefault(); const art = e.target.closest("[data-post]"), t = e.target.querySelector("textarea"), v = t.value.trim(); if (!v) return;
  e.target.querySelector("button").disabled = true;
  const { error } = await S.auth.sb.from("news_comments").insert({ post: art.dataset.post, body: v, username: String(who()).slice(0, 40) });
  if (error) { e.target.querySelector("button").disabled = false; return CP.toast("Could not post your comment."); }
  await loadSocial(); drawPost(art.dataset.post); });

drawAll();
CP.authReady.then(async auth => {
  if (!auth) return; S.auth = auth;
  const ok = await loadPosts(); if (!ok) return drawAll();
  await loadSocial(); S.can = POSTERS.includes(auth.profile?.staff_rank);
  drawComposer(); drawAll();
});
})();
