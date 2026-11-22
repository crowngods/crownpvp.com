(() => {
const { $, esc } = CP, box = $("#lg");
const here = file => new URL(file, location.href).href;
const nextPage = (() => { const n = new URLSearchParams(location.search).get("next") || ""; return /^[a-z0-9_-]+(\.html)?$/i.test(n) ? n : "alerts.html"; })();
const field = (id, label, type, extra = "") => `<label class="cu" for="${id}">${label}</label><input class="fi" id="${id}" name="${id}" type="${type}" ${extra} required>`;
const msg = (t, ok) => { const m = $("#lg-msg"); if (!m) return; m.className = "cm " + (ok ? "okm" : "errm"); m.textContent = t; };
const nice = e => {
  const m = String(e?.message || e || "");
  if (/invalid login/i.test(m)) return "Wrong email or password.";
  if (/not confirmed/i.test(m)) return "Please confirm your email first. Check your inbox (and spam).";
  if (/rate limit|too many/i.test(m)) return "Too many tries. Please wait a few minutes and try again.";
  if (/already registered|already been registered/i.test(m)) return "An account with that email already exists. Try signing in.";
  if (/password/i.test(m) && /(least|short|weak)/i.test(m)) return "Choose a stronger password (at least 8 characters).";
  if (/database error/i.test(m)) return "That username could not be used. Pick another one.";
  return "Something went wrong. Please try again.";
};
const busy = (f, on, label) => { const b = $("button[type=submit]", f); b.disabled = on; if (label) b.textContent = on ? "Please wait..." : label; };

CP.authReady.then(auth => {
  if (!auth) { box.innerHTML = `<div class="card gate"><h3>Accounts are not set up yet</h3><p>The site owner still needs to finish the account setup (see the README).</p></div>`; return; }
  const signedIn = () => { box.innerHTML = `<div class="card gate"><h3>You are signed in</h3><p>Signed in as <b>${esc(auth.profile?.username || auth.user.email)}</b>.</p><p style="margin-top:18px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><a class="btn" style="width:auto" href="alerts.html">Open alerts</a><button class="btn ghost" style="width:auto" data-signout>Sign out</button></p></div>`; };
  const forms = tab => {
    box.innerHTML = `<div class="card gate authbox"><div class="ptabs" role="tablist"><button type="button" role="tab" data-tab="in" class="${tab === "in" ? "on" : ""}">Sign in</button><button type="button" role="tab" data-tab="up" class="${tab === "up" ? "on" : ""}">Create account</button></div>
    ${tab === "in" ? `<form id="f-in" autocomplete="on">${field("email", "Email", "email", 'autocomplete="email"')}${field("password", "Password", "password", 'autocomplete="current-password"')}<button class="btn wide" type="submit">Sign in</button><p class="cs"><a href="#" data-forgot>Forgot your password?</a></p></form>`
    : `<form id="f-up" autocomplete="on">${field("username", "Minecraft username", "text", 'maxlength="16" pattern="\\w{3,16}" autocomplete="username" spellcheck="false"')}${field("email", "Email", "email", 'autocomplete="email"')}${field("password", "Password (8+ characters)", "password", 'minlength="8" autocomplete="new-password"')}<button class="btn wide" type="submit">Create account</button><p class="cs">Your username is not checked against Minecraft. Staff alerts are sent to your account.</p></form>`}
    <p id="lg-msg" class="cm" aria-live="polite"></p></div>`;
  };
  const recovery = () => { box.innerHTML = `<div class="card gate authbox"><h3>Choose a new password</h3><form id="f-new">${field("password", "New password (8+ characters)", "password", 'minlength="8" autocomplete="new-password"')}<button class="btn wide" type="submit">Save password</button></form><p id="lg-msg" class="cm" aria-live="polite"></p></div>`; };

  auth.on((evt) => { if (evt === "PASSWORD_RECOVERY") recovery(); else if (evt === "SIGNED_OUT") forms("in"); });
  if (/type=recovery/.test(location.hash + location.search)) recovery(); else if (auth.user) signedIn(); else forms("in");

  box.addEventListener("click", async e => {
    const t = e.target.closest("[data-tab]"); if (t) return forms(t.dataset.tab);
    if (e.target.closest("[data-forgot]")) {
      e.preventDefault();
      const email = ($("#email")?.value || "").trim();
      if (!email) return msg("Type your email above first, then click Forgot your password.");
      const { error } = await auth.sb.auth.resetPasswordForEmail(email, { redirectTo: here("login.html") });
      return error ? msg(nice(error)) : msg("If that email has an account, a reset link is on its way.", true);
    }
  });
  box.addEventListener("submit", async e => {
    e.preventDefault(); const f = e.target;
    if (f.id === "f-in") {
      busy(f, true, "Sign in");
      const { error } = await auth.sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.password.value });
      if (error) { busy(f, false, "Sign in"); return msg(nice(error)); }
      location.href = nextPage;
    } else if (f.id === "f-up") {
      const username = f.username.value.trim(), email = f.email.value.trim(), password = f.password.value;
      if (!/^\w{3,16}$/.test(username)) return msg("Username: 3-16 letters, numbers or _.");
      if (password.length < 8) return msg("Password must be at least 8 characters.");
      busy(f, true, "Create account");
      try {
        const { data: free } = await auth.sb.rpc("username_available", { u: username });
        if (free === false) { busy(f, false, "Create account"); return msg("That username is already taken."); }
        const { data, error } = await auth.sb.auth.signUp({ email, password, options: { data: { username }, emailRedirectTo: here("login.html") } });
        if (error) throw error;
        if (data.session) { location.href = nextPage; return; }
        box.innerHTML = `<div class="card gate"><h3>Check your email</h3><p>We sent a confirmation link to <b>${esc(email)}</b>. Click it, then come back and sign in.</p></div>`;
      } catch (err) { busy(f, false, "Create account"); msg(nice(err)); }
    } else if (f.id === "f-new") {
      busy(f, true, "Save password");
      const { error } = await auth.sb.auth.updateUser({ password: f.password.value });
      if (error) { busy(f, false, "Save password"); return msg(nice(error)); }
      msg("Password saved. Taking you to your alerts...", true); setTimeout(() => location.href = "alerts.html", 900);
    }
  });
});
})();
