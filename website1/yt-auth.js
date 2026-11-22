/* ==========================================================================
   yt-auth.js  -  accounts & access levels for Website 1 (YouTuber Archive)
   Needs yt-core.js first.  Roles: guest · user (member) · admin.

   The API is the source of truth: it trims the creator list per role (GET /portal/creators) and the
   admin endpoints re-check the role on every call. This file only STORES the sign-in, asks the API,
   draws the header account chip and shows the "Login required" prompt.  The offline snapshot is
   trimmed here with the same rules as api/access.py so the site behaves the same without the API.
   ========================================================================== */
(function () {
  'use strict';
  const { CONFIG, store, esc, $ } = YT;

  const LIMITS = { guest: 30, user: 1000 };
  const BASE = dict => Object.assign({ browse: true, search: true, profile: false, links: false, follow: false, compare: false, similar: false, topVideo: false,
    crossSites: false, export: false, edit: false, verify: false, manageUsers: false, deleteCreators: false, syncCatalog: false, audit: false }, dict);
  const PERMS = {
    guest: BASE({ label: 'Guest' }),
    user: BASE({ label: 'Member', profile: true, links: true, follow: true, compare: true, similar: true, topVideo: true, crossSites: true }),
    admin: BASE({ label: 'Admin', profile: true, links: true, follow: true, compare: true, similar: true, topVideo: true, crossSites: true, export: true, edit: true, verify: true, manageUsers: true, deleteCreators: true, syncCatalog: true, audit: true })
  };
  const BASIC_FIELDS = ['id', 'name', 'handle', 'niche', 'categories', 'country', 'subscribers', 'rawSubs', 'avatar', 'banner', 'verified'];

  /* ---------- stored sign-in ---------- */
  function jwtExpiry(token) {
    try {
      const body = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const exp = JSON.parse(atob(body + '==='.slice((body.length + 3) % 4))).exp;
      return exp ? exp * 1000 : 0;
    } catch { return 0; }
  }
  function read() {
    const a = store.get('auth');
    if (!a || !a.user || (!a.token && !a.local)) return null;
    if (a.exp && Date.now() > a.exp) { clear(); return null; }
    return a;
  }
  function save(res) {
    const a = { token: res.access_token, user: res.user, exp: jwtExpiry(res.access_token) };
    store.set('auth', a);
    return a;
  }
  function clear() { try { localStorage.removeItem('yt:auth'); } catch { /* ignore */ } }
  const role = () => { const a = read(); return a ? a.user.role : 'guest'; };
  const user = () => { const a = read(); return a ? a.user : null; };
  const isSignedIn = () => { const a = read(); return !!a && a.user.role !== 'guest'; };
  const can = perm => !!(PERMS[role()] || PERMS.guest)[perm];
  const permsFor = r => PERMS[r] || PERMS.guest;

  /* ---------- API ---------- */
  async function call(path, { method = 'GET', body, auth = true } = {}) {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const a = read();
    if (auth && a && a.token) headers.Authorization = 'Bearer ' + a.token;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS);
    let res;
    try {
      res = await fetch(CONFIG.API_BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal });
    } catch (err) {
      const e = new Error(err.name === 'AbortError' ? 'The server took too long to answer. Try again in a few seconds.' : 'Could not reach the server. Check your connection.');
      e.network = true; throw e;
    } finally { clearTimeout(timer); }
    let data = null;
    try { data = await res.json(); } catch { /* not JSON */ }
    if (!res.ok) {
      let msg = data && data.detail;
      if (Array.isArray(msg)) msg = msg.map(m => m.msg || m).join(' ');
      const e = new Error(msg || `Request failed (${res.status}).`);
      e.status = res.status;
      if (data && data.code) e.code = data.code;        // e.g. "email_not_verified"
      if (data && data.email) e.email = data.email;     // masked address the confirmation went to
      const wait = res.headers && res.headers.get && Number(res.headers.get('Retry-After'));
      if (wait) e.retryAfter = wait;
      throw e;
    }
    return data;
  }

  async function login(username, password) { return save(await call('/auth/login', { method: 'POST', body: { username, password }, auth: false })); }
  /* Creating an account needs a real email: the API mails a confirmation link and the account only works after it is opened.
     Returns { pending: true, email } (check your inbox) - or, only when the owner switched confirmation off, a ready session. */
  async function register(username, email, password) {
    const res = await call('/auth/register', { method: 'POST', body: { username, email, password }, auth: false });
    if (res && res.access_token) { save(res); return { pending: false }; }
    return { pending: true, email: res.email || '', resendAfterSeconds: res.resendAfterSeconds || 60 };
  }
  /* The link in the email lands on login.html?verify=TOKEN: this exchanges the token for a signed-in session. */
  async function verify(token) { return save(await call('/auth/verify', { method: 'POST', body: { token }, auth: false })); }
  /* Sends a fresh confirmation email. `who` can be the email address or the username. */
  async function resend(who) { return call('/auth/resend', { method: 'POST', body: { email: who }, auth: false }); }
  async function guest() { return save(await call('/auth/guest', { method: 'POST', auth: false })); }
  /* Guest session that lives only in this browser (used when the API cannot be reached to issue a guest token). */
  function localGuest() {
    const a = { token: '', local: true, user: { id: 0, username: 'guest', role: 'guest' }, exp: Date.now() + 4 * 3600 * 1000 };
    store.set('auth', a);
    return a;
  }
  function logout() { clear(); }

  /* Re-checks the stored token with the API (so a demoted/deleted account or an expired token is noticed). */
  async function refresh() {
    const a = read();
    if (!a) return null;
    if (a.local) return a;
    try {
      const me = await call('/auth/me');
      const next = { token: a.token, user: me, exp: a.exp };
      store.set('auth', next);
      return next;
    } catch (err) {
      if (err.status === 401) { clear(); return null; }
      return a;                                   // offline: keep what we have
    }
  }

  /* ---------- tiered list (client mirror of api/access.py - used for the offline snapshot only) ---------- */
  function tierView(list, r) {
    r = PERMS[r] ? r : 'guest';
    const ranked = [...list].sort((a, b) => (b.rawSubs || 0) - (a.rawSubs || 0) || String(a.id).localeCompare(String(b.id)));
    const rankOf = new Map(ranked.map((c, i) => [c.id, i + 1]));
    let unlocked = 0;
    const out = list.map(c => {
      const rank = rankOf.get(c.id);
      const level = r === 'admin' ? 'full' : r === 'user' ? (rank <= LIMITS.user ? 'full' : 'locked') : (rank <= LIMITS.guest ? 'basic' : 'locked');
      let item;
      if (level === 'full') { item = Object.assign({}, c); unlocked++; }
      else if (level === 'basic') { item = {}; BASIC_FIELDS.forEach(k => { item[k] = c[k]; }); unlocked++; }
      else item = { id: c.id, name: 'Locked creator', handle: '@locked-' + c.id, niche: c.niche, categories: c.categories, rawSubs: 0, unlock: r === 'guest' ? 'login' : 'admin' };
      item.access = level; item.rank = rank;
      return item;
    });
    return { creators: out, meta: { role: r, total: list.length, unlocked, totalSubs: list.reduce((s, c) => s + (c.rawSubs || 0), 0), limits: LIMITS, permissions: PERMS[r] } };
  }

  /* Returns { creators (normalised), meta, source: 'api' | 'snapshot' }. */
  async function loadPortal({ onSlow } = {}) {
    const slow = onSlow ? setTimeout(onSlow, 3500) : null;
    try {
      let data;
      try { data = await call('/portal/creators'); }
      catch (err) {
        if (err.status === 401) { localGuest(); data = await call('/portal/creators', { auth: false }); }   // expired sign-in -> continue as guest
        else throw err;
      }
      const list = Array.isArray(data.creators) ? data.creators : [];
      if (!list.length) throw new Error('The API returned no creators.');
      if (data.meta && data.meta.limits) Object.assign(LIMITS, data.meta.limits);
      return { creators: YT.normalizeList(list), meta: data.meta || tierView(list, role()).meta, source: 'api' };
    } catch (apiError) {
      try {
        const snap = await (await fetch(CONFIG.SNAPSHOT_URL)).json();
        const view = tierView(Array.isArray(snap.creators) ? snap.creators : [], role());
        const creators = YT.normalizeList(view.creators);
        if (creators.length) return { creators, meta: view.meta, source: 'snapshot', error: apiError };
      } catch { /* fall through */ }
      throw apiError;
    } finally { if (slow) clearTimeout(slow); }
  }

  /* ---------- header account chip ---------- */
  function loginUrl(extra) {
    const next = location.pathname.split('/').pop() + location.search;
    const p = new URLSearchParams(Object.assign({ next }, extra || {}));
    return 'login.html?' + p.toString();
  }
  function mountAccount() {
    const box = $('#ytAccount'); if (!box) return;
    const a = read();
    if (!a || a.user.role === 'guest') {
      box.innerHTML = (a ? '<span class="yt-acct-chip"><span>Guest</span><i data-role="guest">guest</i></span>' : '') +
        `<a class="yt-btn yt-btn-primary yt-btn-sm" href="${esc(loginUrl())}">Sign in</a>`;
      return;
    }
    const r = a.user.role;
    box.innerHTML =
      (PERMS[r].edit ? '<a class="yt-btn yt-btn-ghost yt-btn-sm" href="admin.html">Admin</a>' : '') +
      `<span class="yt-acct-chip" title="Signed in as ${esc(a.user.username)}"><span>${esc(a.user.username)}</span><i data-role="${esc(r)}">${esc(PERMS[r].label)}</i></span>` +
      '<button class="yt-btn yt-btn-ghost yt-btn-sm" type="button" data-signout>Sign out</button>';
    $('[data-signout]', box).addEventListener('click', () => { logout(); location.reload(); });
  }

  /* The archive is only shown after the visitor has chosen: sign in, create an account, or continue as guest.
     Without a stored session (member OR guest token) we send them to the login page first. */
  function requireSession() {
    if (read()) return true;
    const p = new URLSearchParams({ next: location.pathname.split('/').pop() + location.search });
    location.replace('login.html?' + p.toString());
    return false;
  }

  /* ---------- "Login required" prompt ---------- */
  let modal;
  const NEED_TEXT = {
    profile: 'Open full creator profiles', follow: 'Follow creators', compare: 'Compare creators', similar: 'See similar creators',
    links: 'Open channels and videos on YouTube', topVideo: 'See the most-viewed video', crossSites: 'Jump to the games and the taste matcher', export: 'Export the catalog', edit: 'Edit creators'
  };
  /* Returns true when the current role has the permission; otherwise opens the prompt and returns false. */
  function require(perm, label) {
    if (can(perm)) return true;
    prompt({ perm, label: label || NEED_TEXT[perm] || 'Use this feature' });
    return false;
  }
  function prompt({ perm, label, locked } = {}) {
    modal = modal || YT.createModal('loginModal');
    const r = role(), signedIn = isSignedIn();
    const staffOnly = perm === 'export' || perm === 'edit' || locked === 'admin';
    const title = staffOnly && signedIn ? 'Admin access required' : 'Login required';
    const msg = staffOnly
      ? (signedIn ? `${label} is available to admin accounts only.` : `${label} is available to admin accounts. Sign in with an admin account to continue.`)
      : `${label} is available to signed-in members. Create a free account or sign in - it takes a few seconds.`;
    modal.open(`
      <div class="lock-prompt">
        <div class="lock-icon" aria-hidden="true">&#128274;</div>
        <h2 id="lockTitle">${esc(title)}</h2>
        <p>${esc(msg)}</p>
        <p class="lock-now">You are browsing as <strong>${esc(PERMS[r].label)}</strong>.</p>
        <div class="lock-actions">
          ${signedIn && staffOnly ? '' : `<a class="yt-btn yt-btn-primary" data-autofocus href="${esc(loginUrl())}">Sign in</a>
          ${signedIn ? '' : `<a class="yt-btn yt-btn-ghost" href="${esc(loginUrl({ tab: 'register' }))}">Create account</a>`}`}
          <button class="yt-btn yt-btn-ghost" type="button" data-close ${signedIn && staffOnly ? 'data-autofocus' : ''}>Maybe later</button>
        </div>
      </div>`, { labelledBy: 'lockTitle' });
  }

  window.YTAuth = { read, role, user, isSignedIn, can, permsFor, call, login, register, verify, resend, guest, localGuest, logout, refresh, loadPortal, tierView, mountAccount, requireSession, require, prompt, loginUrl, LIMITS, PERMS };
})();
