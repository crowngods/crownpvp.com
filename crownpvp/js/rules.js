(() => {
const D=window.CROWN_RULES, root=document.getElementById('rules');if(!D||!root)return;
const e=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const L=['1st offense','2nd offense','3rd offense'];
const rule=x=>`<div class="rule"><h4>${e(x.n)}</h4>${x.d?`<p>${e(x.d)}</p>`:''}${x.l?`<ul>${x.l.map(i=>`<li>${e(i)}</li>`).join('')}</ul>`:''}${x.o?`<div class="off">${x.o.map((o,i)=>`<div><small>${L[i]||'Further offense'}</small>${e(o)}</div>`).join('')}</div>`:''}${x.t?`<div class="tbw"><table class="tb"><tr>${x.t.h.map(h=>`<th>${e(h)}</th>`).join('')}</tr>${x.t.rows.map(r=>`<tr>${r.map(c=>`<td>${e(c)}</td>`).join('')}</tr>`).join('')}</table></div>`:''}${x.p?`<div class="pn">${e(x.p)}</div>`:''}</div>`;
const ladder=`<div class="rule"><h4>Faction strike ladder</h4><div class="ladder">${D.ladder.map(l=>`<div class="${l[0]==='13'?'dq':''}"><b>${l[0]} ${l[0]==='1'?'strike':'strikes'}</b>${e(l[1])}</div>`).join('')}</div></div>`;
root.innerHTML=D.sections.map((s,i)=>`<details id="${s.id}" ${i===0?'open':''}><summary>${e(s.t)}</summary><div>${s.id==='strikes'?ladder:''}${s.sub.map(g=>`<div class="sg2"><div class="sub">${e(g[0])}</div>${g[1].map(rule).join('')}</div>`).join('')}</div></details>`).join('');
document.getElementById('toc').innerHTML=D.sections.map(s=>`<a href="#${s.id}">${e(s.t)}</a>`).join('');
const simple=(rootId,groups)=>{document.getElementById(rootId).innerHTML=groups.map(g=>`<article class="simple-rule"><h3>${e(g[0])}</h3><ul>${g[1].map(x=>`<li>${e(x)}</li>`).join('')}</ul></article>`).join('');};
simple('other-rules',[
 ['Respect and conduct',['Treat players and staff respectfully. Harassment, hate speech, threats and targeted abuse are not allowed.','Do not impersonate staff or another player.','Do not advertise unrelated servers, stores or services.','Do not share another person’s private information.']],
 ['Fair gameplay',['Do not use hacked clients, cheats, x-ray, autoclickers, macros that automate gameplay or other unfair modifications.','Do not exploit bugs, duplication glitches or unintended mechanics for an advantage. Report issues to staff instead.','Do not intentionally crash, lag or disrupt the server.','Use only features and modifications permitted by the rules of the game mode you are playing.']],
 ['Trading and community',['Use the official in-game systems where provided. Be careful when trading with other players.','Scamming, account theft and payment fraud are not allowed.','Do not evade punishments with alternate accounts or other workarounds.']],
 ['Mode-specific rules',['Each game mode may publish additional rules for its economy, progression, events, PvP and team systems.','When a mode is released, its specific rules will be added here. Until then, do not assume an unreleased mode is available.','Staff may investigate suspected abuse and take proportionate action to protect the mode.']]
]);
simple('discord-rules',[
 ['Be respectful',['No harassment, hate speech, threats, discrimination or targeted abuse.','Do not provoke, bully or repeatedly antagonize other members.','Respect staff decisions and use the correct appeal or support channel.']],
 ['Keep channels appropriate',['Post in the channel that matches the topic and follow each channel description.','Do not spam, flood, mass-mention, abuse reactions or disrupt conversations.','Keep usernames, nicknames, avatars and status messages appropriate.','No NSFW, graphic, illegal or otherwise prohibited content.']],
 ['Safety and privacy',['Never share passwords, login codes, private messages or another person’s personal information.','Do not post suspicious downloads, phishing links, malware or scam links.','Do not impersonate CrownPVP staff, partners or other community members.']],
 ['Promotion and support',['Do not advertise other Minecraft servers, Discord servers, stores or services without permission.','Do not sell accounts, ranks or items through unauthorized channels.','Use support and report channels for issues. Do not create duplicate tickets or publicly expose private reports.']]
]);

const MODES=[
['lifesteal','LifestealSMP',['Hearts: killing a player steals one heart. Do not trade kills with friends or alternate accounts to farm hearts.','No combat logging. Leaving during a fight counts as a death.','No spawn camping or trapping new players at spawn.','Do not use bugs to keep or duplicate hearts.']],
['skyblock','Skyblock',['Do not grief or enter islands you have not been invited to.','AFK farms must not lag the server. Staff may remove farms that do.','Do not manipulate the auction house or shop prices with alternate accounts.','Do not exploit generators, minions or island upgrades.']],
['survival','Survival',['Claim your builds. Unclaimed builds may not be restored after griefing.','No x-ray, ore finders or freecam. Texture packs that reveal ores are not allowed.','Respect spawn and other players\u2019 builds. No lag machines.','Do not use duplication glitches.']],
['prison','Prison',['Do not use macros or autoclickers to mine. Auto-mine features are only those we provide.','Do not exploit rank-up, sell or crate bugs.','Do not scam players in trades or plots.','Keep plots free of lag machines and offensive builds.']],
['kitpvp','KitPvP',['No hacked clients, reach, autoclickers or kill aura.','No kill boosting or trading kills for stats.','Do not abuse spawn protection to hit players safely.','Do not exploit kit or ability bugs. Report them instead.']]
];
const common=['Network rules also apply: respect, no cheating, no scamming, no punishment evasion.','Mode rules may be updated when the mode is released. Staff decide on cases not covered here.'];
const tabBar=document.querySelector('[data-rule-tab="discord"]');
MODES.forEach(m=>{const b=document.createElement('button');b.type='button';b.setAttribute('data-rule-tab',m[0]);b.textContent=m[1]+' rules';tabBar.before(b);
const p=document.createElement('div');p.className='rule-panel';p.dataset.rulePanel=m[0];p.hidden=true;p.innerHTML=`<div class="rules-toolbar"><div><h2>${e(m[1])}</h2><p>Rules for ${e(m[1])} only.</p></div><span class="rule-draft-label">DRAFT RULES</span></div><div id="r-${m[0]}" class="simple-rules"></div>`;document.querySelector('[data-rule-panel="discord"]').before(p);
simple('r-'+m[0],[['Gameplay',m[2]],['General',common]]);});
tabBar.style.marginLeft='18px';
const want=new URLSearchParams(location.search).get('mode');
const tabs=[...document.querySelectorAll('[data-rule-tab]')],panels=[...document.querySelectorAll('[data-rule-panel]')];
const show=b=>{tabs.forEach(x=>x.classList.toggle('on',x===b));panels.forEach(p=>p.hidden=p.dataset.rulePanel!==b.dataset.ruleTab);};tabs.forEach(b=>b.addEventListener('click',()=>show(b)));if(want){const w=tabs.find(t=>t.dataset.ruleTab===want);if(w)show(w);}
const q=document.getElementById('rq'),none=document.getElementById('none');q.addEventListener('input',()=>{const v=q.value.trim().toLowerCase();let any=false;root.querySelectorAll('details').forEach(d=>{let hit=!v;d.querySelectorAll('.rule').forEach(r=>{const m=!v||r.textContent.toLowerCase().includes(v);r.classList.toggle('hide',!m);hit=hit||m;});d.querySelectorAll('.sg2').forEach(g=>g.classList.toggle('hide',![...g.querySelectorAll('.rule')].some(r=>!r.classList.contains('hide'))));d.classList.toggle('hide',!hit);if(v&&hit)d.open=true;any=any||hit;});none.hidden=any;});
document.getElementById('ex').onclick=()=>root.querySelectorAll('details:not(.hide)').forEach(d=>d.open=true);document.getElementById('co').onclick=()=>root.querySelectorAll('details').forEach(d=>d.open=false);addEventListener('hashchange',()=>{const d=document.querySelector(location.hash);if(d&&d.tagName==='DETAILS')d.open=true;});
})();