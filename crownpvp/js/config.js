/* CrownPVP configuration. Edit this file only. NEVER put Tebex secret keys here. */
window.CROWN = {
  name: "CrownPVP",
  ip: "play.crownpvp.eu",
  discord: "https://discord.gg/nFfnbw844",
  // Discord server ID (the first number in your channel link). Used by the live Discord card on the home page.
  discordGuildId: "1560484926283972608",
  partnershipUrl: "https://discord.com/channels/1560484926283972608/1560484931321471038",
  supportChannel: "https://discord.com/channels/1560484926283972608/1560484931321471038",
  currency: "$",
  // Real status API (shows "unavailable" if it fails). Set to "" to disable.
  // Optional real per-player stats endpoint, e.g. "/api/stats/{name}" returning {"kills":12,"deaths":3}. Leave "" until connected.
  statsApi: "/api/stats/{name}", // reads the D1 table filled by POST /api/stats/sync (see README)
  // Punishments are read from static JSON files published by the GitHub Action (see README). "" = use the API instead.
  punishmentsData: "data/punishments",
  // Accounts + alerts (Supabase). Fill these two in after following supabase/README steps. Both values are PUBLIC and safe here.
  // NEVER paste the "service_role" key. Leave both empty to hide sign-in and alerts.
  supabaseUrl: "https://iwhbnmerwgqtpswwehss.supabase.co",
  supabaseKey: "sb_publishable_JC0T3E13lrD-06j6438PJA_0-Ds0jHS",
  // CrownClient release state. "coming_soon" shows a COMING SOON badge and NO download buttons.
  // When it is really released set status to "released" and paste the https download links (empty link = no button).
  client: { status: "coming_soon", freeDownload: "", premiumUrl: "" },
  // People shown on the Staff page (leadership). Developer is shown in its own section.
  leadership: [
    { rank: "owner",   name: "MedicalWeed", blurb: "Founder of CrownPVP. Leads the network and makes the final decisions." },
    { rank: "coowner", name: "ksa_70007",   blurb: "Runs the network alongside the Owner and keeps the community running smoothly." }
  ],
  developer: {
    name: "Raizukennn",
    discord: "Rairai.32",
    about: "Raizukennn built everything you see on CrownPVP: the Minecraft server and this website. Found a bug, have a technical problem or a website idea? Contact him on Discord."
  },
  // Voting sites (shown on /vote).
  voteSites: [
    { name: "Minecraft Server List", url: "https://minecraft-server-list.com/server/524423/vote/" },
    { name: "Minecraft Buzz",        url: "https://minecraft.buzz/vote/crownpvp-25199" },
    { name: "Minecraft-MP",          url: "https://minecraft-mp.com/server/365901/vote/" },
    { name: "MinecraftServers.org",  url: "https://minecraftservers.org/vote/696405" }
  ],
  ticketTopics: ["About Discord", "Connection issues", "Denied staff application", "Missing prize", "Buy merchandise", "Website services", "Partnership", "Something else"],
  // News feed on the home page. Newest first. date = YYYY-MM-DD.
  news: [
    { date: "2026-11-23", tag: "Website", author: "Raizukennn", title: "The new CrownPVP website is live", body: "Vote on four server lists, open support tickets from the site, search players with 3D skins and browse merchandise: PvP resource packs, plugins, maps and website design.", link: "vote.html", cta: "Vote now" },
    { date: "2026-11-23", tag: "Support", author: "CrownPVP Team", title: "Support tickets are open", body: "Connection issues, a missing prize, a denied staff application, a partnership or a purchase: open a ticket and staff reply to you on the website.", link: "tickets.html?new=1", cta: "Open a ticket" },
    { date: "2026-11-23", tag: "Staff", author: "CrownPVP Team", title: "Join the staff team", body: "Fill in the application on the Staff page. Every application is reviewed privately by management.", link: "staff.html#apply", cta: "Apply now" }
  ],
  siteVersion: "Site v8 · 24 Nov 2026",
  // Merchandise & services (shown on /services). Prices are agreed in the ticket.
  merch: [
    { icon: "✦", tag: "01 / PVP / VISUALS", name: "PvP Resource Packs", desc: "Clean, low-fire, FPS-friendly packs made for PvP. Works on every version from 1.8 to 26.3." },
    { icon: "⌘", tag: "02 / JAVA / SYSTEMS", name: "Custom Plugins", desc: "Java plugins built for your server: kits, factions features, menus, economy and more." },
    { icon: "⌖", tag: "03 / MAPS / BUILDS", name: "Maps & Builds", desc: "Spawns, arenas, faction maps and custom builds designed for your server." },
    { icon: "◈", tag: "04 / WEB / BRANDING", name: "Website Customization", desc: "A website like this one for your own server: store, vote page, staff page, tickets and a live Discord card." },
    { icon: "+", tag: "05 / MADE TO BRIEF", name: "Something Custom", desc: "Need something that is not listed? Describe it in a ticket and we will tell you if we can build it." }
  ],
  topApi: "/api/stats/top?limit=10",
  statusApi: "https://api.mcsrvstat.us/3/play.crownpvp.eu",
  // Tebex Headless checkout. Paste your PUBLIC webstore token (Tebex > Headless API). It is safe to expose.
  // When set, the cart builds one real Tebex basket with your player\'s username and sends them to checkout.
  tebexToken: "",
  // PayPal.me checkout (no Tebex needed). Put your PayPal.Me link or just the name, e.g. "https://www.paypal.com/paypalme/YourName" or "YourName".
  // Leave "" to turn PayPal checkout off. Payments are confirmed and delivered by staff (see README).
  paypalMe: "https://www.paypal.com/paypalme/Angelosluijters",
  paypalCurrency: "USD",
  // Paste each PUBLIC Tebex package URL (https://crownpvp.tebex.io/package/123456).
  tebex: {
    GOLD_2500: "YOUR_TEBEX_PACKAGE_URL",
    GOLD_5000: "YOUR_TEBEX_PACKAGE_URL",
    GOLD_8750: "YOUR_TEBEX_PACKAGE_URL",
    GOLD_12500: "YOUR_TEBEX_PACKAGE_URL",
    GOLD_20000: "YOUR_TEBEX_PACKAGE_URL",
    GOLD_27500: "YOUR_TEBEX_PACKAGE_URL",
    GOLD_37500: "YOUR_TEBEX_PACKAGE_URL",
    GOLD_50000: "YOUR_TEBEX_PACKAGE_URL",
    GOLD_62500: "YOUR_TEBEX_PACKAGE_URL",
    GOLD_125000: "YOUR_TEBEX_PACKAGE_URL"
  },
  // Gold Coins: 2,500 Gold = $10 (250 Gold per $1). Format: [KEY, name, price]
  gold: [
    ["GOLD_2500","Pouch",10],["GOLD_5000","Purse",20],["GOLD_8750","Satchel",35],
    ["GOLD_12500","Chest",50],["GOLD_20000","Coffer",80],["GOLD_27500","Trove",110],
    ["GOLD_37500","Hoard",150],["GOLD_50000","Vault",200],["GOLD_62500","Treasury",250],
    ["GOLD_125000","Royal Treasury",500]
  ],
};
