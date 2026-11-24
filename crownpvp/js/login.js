(() => {
const { $, esc } = CP, box = $("#lg");
const here = file => new URL(file, location.href).href;
const nextPage = (() => { const n = new URLSearchParams(location.search).get("next") || ""; return /^[a-z0-9_-]+(\.html)?(\?[a-z0-9_=&.-]*)?(#[a-z0-9_-]+)?$/i.test(n) ? n : "alerts.html"; })();
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
const GG='<svg viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7A14.500 14.500 0 0 1 9.500 24c0-1.600.3-3.200.8-4.700l-7.900-6.100A24 24 0 0 0 0 24c0 3.900.9 7.500 2.600 10.800l7.900-6.100z"/><path fill="#34A853" d="M24 48c6.500 0 11.900-2.100 15.900-5.800l-7.500-5.800c-2.100 1.400-4.800 2.300-8.400 2.300-6.300 0-11.600-4.100-13.500-9.800l-7.900 6.100C6.500 42.600 14.600 48 24 48z"/></svg>';
const DC='<svg viewBox="0 0 24 24" fill="#fff"><path d="M20.3 4.4A19.800 19.800 0 0 0 15.400 3l-.2.5a18 18 0 0 0-6.400 0L8.600 3a19.700 19.700 0 0 0-4.900 1.400C.600 9 0 13.500.300 18a19.900 19.900 0 0 0 6 3l1.300-2.100-2-1 .5-.4a14 14 0 0 0 12 0l.5.400-2 1 1.300 2.100a19.900 19.900 0 0 0 6-3c.4-5.200-.7-9.700-3.600-13.600zM8.500 15.300c-1.200 0-2.100-1.100-2.100-2.400s.9-2.400 2.100-2.400 2.100 1.100 2.100 2.400-.9 2.400-2.100 2.400zm7 0c-1.200 0-2.100-1.100-2.100-2.400s.9-2.400 2.100-2.400 2.100 1.100 2.100 2.400-.9 2.400-2.100 2.400z"/></svg>';
const oauthBlock = `<div class="hx-oauth"><button type="button" class="hx-oa dc" data-oauth="discord">${DC} Continue with Discord</button><button type="button" class="hx-oa gg" data-oauth="google">${GG} Continue with Google</button></div><div class="hx-or">or use email</div>`;
const busy = (f, on, label) => { const b = $("button[type=submit]", f); b.disabled = on; if (label) b.textContent = on ? "Please wait..." : label; };

CP.authReady.then(auth => {
  if (!auth) { box.innerHTML = `<div class="card gate"><h3>Accounts are not set up yet</h3><p>The site owner still needs to finish the account setup (see the README).</p></div>`; return; }
  const signedIn = () => { box.innerHTML = `<div class="card gate"><h3>You are signed in</h3><p>Signed in as <b>${esc(auth.profile?.username || auth.user.email)}</b>.</p><p style="margin-top:18px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><a class="btn" style="width:auto" href="alerts.html">Open alerts</a><button class="btn ghost" style="width:auto" data-signout>Sign out</button></p></div>`; };
  const forms = tab => {
    box.innerHTML = `<div class="card gate authbox"><div class="ptabs" role="tablist"><button type="button" role="tab" data-tab="in" class="${tab === "in" ? "on" : ""}">Sign in</button><button type="button" role="tab" data-tab="up" class="${tab === "up" ? "on" : ""}">Create account</button></div>
    ${oauthBlock}${tab === "in" ? `<form id="f-in" autocomplete="on">${field("email", "Email", "email", 'autocomplete="email"')}${field("password", "Password", "password", 'autocomplete="current-password"')}<button class="btn wide" type="submit">Sign in</button><p class="cs"><a href="#" data-forgot>Forgot your password?</a></p></form>`
    : `<form id="f-up" autocomplete="on">${field("username", "Minecraft username", "text", 'maxlength="16" pattern="\\w{3,16}" autocomplete="username" spellcheck="false"')}${field("email", "Email", "email", 'autocomplete="email"')}${field("password", "Password (8+ characters)", "password", 'minlength="8" autocomplete="new-password"')}<button class="btn wide" type="submit">Create account</button><p class="cs">Your username is not checked against Minecraft. Staff alerts are sent to your account.</p></form>`}
    <p id="lg-msg" class="cm" aria-live="polite"></p></div>`;
  };
  const recovery = () => { box.innerHTML = `<div class="card gate authbox"><h3>Choose a new password</h3><form id="f-new">${field("password", "New password (8+ characters)", "password", 'minlength="8" autocomplete="new-password"')}<button class="btn wide" type="submit">Save password</button></form><p id="lg-msg" class="cm" aria-live="polite"></p></div>`; };

  auth.on((evt) => { if (evt === "PASSWORD_RECOVERY") recovery(); else if (evt === "SIGNED_OUT") forms("in"); });
  if (/type=recovery/.test(location.hash + location.search)) recovery(); else if (auth.user) signedIn(); else forms("in");

  box.addEventListener("click", async e => {
    const o = e.target.closest("[data-oauth]");
    if (o) { const { error } = await auth.sb.auth.signInWithOAuth({ provider: o.dataset.oauth, options: { redirectTo: here("login.html?next=" + encodeURIComponent(nextPage)), scopes: o.dataset.oauth === "discord" ? "identify email" : undefined } }); if (error) msg("Could not start " + o.dataset.oauth + " sign in. Ask the owner to enable it in Supabase."); return; }
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
