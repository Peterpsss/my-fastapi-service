/* Login page: sign in, create account (email confirmation), confirm the emailed link, continue as guest. */
(function () {
  'use strict';
  const { $, $$, esc } = YT;
  YT.mountShell({ site: 'archive', bare: true });   // login is a standalone gate: no site header, nav or footer

  /* Only allow redirecting to a page of this site (no external URLs, no javascript:). */
  function safeNext(value) {
    const v = String(value || '').trim();
    return /^[A-Za-z0-9_.-]+(\?[A-Za-z0-9_=&%.,@:/-]*)?$/.test(v) && !v.startsWith('.') ? v : 'index.html';
  }
  const params = YT.params();
  const next = safeNext(params.get('next'));
  const go = () => { location.href = next; };
  const verifyToken = (params.get('verify') || '').trim();

  const card = $('#authCard');
  const states = { forms: $('#stateForms'), inbox: $('#stateInbox'), verify: $('#stateVerify') };
  function showState(name) {
    Object.entries(states).forEach(([k, el]) => { el.hidden = k !== name; if (k === name) { el.classList.remove('swap-in'); void el.offsetWidth; el.classList.add('swap-in'); } });
  }
  const setError = (id, msg) => { const el = $('#' + id); if (!el) return; el.textContent = msg || ''; el.hidden = !msg; };
  function busy(btn, on, label) { btn.disabled = on; btn.classList.toggle('is-busy', on); btn.textContent = on ? 'Please wait...' : label; }

  /* ---------- 1) the emailed link: ?verify=TOKEN ---------- */
  if (verifyToken) { confirmEmail(verifyToken); return; }

  /* ---------- 2) already signed in? ---------- */
  const existing = YTAuth.read();
  if (existing && existing.user.role !== 'guest') {
    const u = existing.user, perms = YTAuth.permsFor(u.role);
    card.innerHTML = `
      <div class="auth-brand"><span class="yt-logo" aria-hidden="true"></span><strong>YouTuber Archive</strong></div>
      <h1>You are signed in</h1>
      <p class="auth-lead">Signed in as <strong>${esc(u.username)}</strong> <span class="role-pill" data-role="${esc(u.role)}">${esc(perms.label)}</span></p>
      <div class="auth-actions">
        <a class="yt-btn yt-btn-primary yt-btn-lg" href="${esc(next)}">Continue to the archive</a>
        ${perms.edit ? '<a class="yt-btn yt-btn-ghost yt-btn-lg" href="admin.html">Open admin panel</a>' : ''}
        <button class="yt-btn yt-btn-ghost yt-btn-lg" type="button" id="signOut">Sign out</button>
      </div>`;
    $('#signOut').addEventListener('click', () => { YTAuth.logout(); location.href = 'login.html'; });
  } else {
    wireForms();
  }

  /* ---------- confirm the link from the email ---------- */
  async function confirmEmail(token) {
    showState('verify');
    try { history.replaceState(null, '', location.pathname + (next !== 'index.html' ? '?next=' + encodeURIComponent(next) : '')); } catch { /* ignore */ }
    try {
      const a = await YTAuth.verify(token);
      $('#verifySpin').hidden = true; $('#verifyCheck').hidden = false;
      $('#verifyTitle').textContent = 'Email confirmed!';
      $('#verifyLead').innerHTML = `Welcome, <strong>${esc(a.user.username)}</strong>. Taking you to the full archive...`;
      $('#verifyGo').href = next; $('#verifyActions').hidden = false;
      setTimeout(go, 1600);
    } catch (err) {
      $('#verifySpin').hidden = true;
      $('#verifyTitle').textContent = 'That link did not work';
      $('#verifyLead').textContent = 'It may have expired or been used already.';
      setError('verifyError', (err && err.message) || 'Could not confirm the email.');
      $('#verifyGo').hidden = true; $('#verifyActions').hidden = false;
      $('#verifyRetry').addEventListener('click', () => { location.href = 'login.html'; });
    }
  }

  /* ---------- "check your inbox" with a resend cooldown ---------- */
  let resendTo = '', cooldownTimer = null;
  function startCooldown(seconds) {
    const btn = $('#inboxResend');
    clearInterval(cooldownTimer);
    let left = Math.max(0, Math.round(seconds || 0));
    const paint = () => { btn.disabled = left > 0; btn.textContent = left > 0 ? `Resend email (${left}s)` : 'Resend email'; };
    paint();
    if (left <= 0) return;
    cooldownTimer = setInterval(() => { left -= 1; paint(); if (left <= 0) clearInterval(cooldownTimer); }, 1000);
  }
  function showInbox({ who, shownEmail, seconds = 60, lead }) {
    resendTo = who;
    $('#inboxLead').innerHTML = lead || `We sent a confirmation link to <strong>${esc(shownEmail || 'your email')}</strong>.`;
    setError('inboxError', ''); const ok = $('#inboxOk'); ok.hidden = true;
    showState('inbox'); startCooldown(seconds);
    $('#inboxTitle').focus({ preventScroll: true });
  }
  function wireInbox() {
    $('#inboxResend').addEventListener('click', async () => {
      const btn = $('#inboxResend'); setError('inboxError', ''); $('#inboxOk').hidden = true; btn.disabled = true;
      try {
        const r = await YTAuth.resend(resendTo);
        const ok = $('#inboxOk'); ok.textContent = 'Sent. A fresh email is on its way - the older link no longer works.'; ok.hidden = false;
        startCooldown(r.resendAfterSeconds || 60);
      } catch (err) {
        setError('inboxError', err.message || 'Could not resend the email.');
        startCooldown(err.status === 429 ? (err.retryAfter || 60) : 5);
      }
    });
    $('#inboxBack').addEventListener('click', () => { clearInterval(cooldownTimer); showState('forms'); });
  }

  /* ---------- tabs + forms ---------- */
  function wireForms() {
    showState('forms');
    wireInbox();
    const tabs = $$('[data-tab]'), panes = { login: $('#paneLogin'), register: $('#paneRegister') };
    const title = $('#authTitle'), lead = $('#authLead'), ink = $('.auth-tab-ink');
    function show(which, focus) {
      tabs.forEach(t => { const on = t.dataset.tab === which; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
      ink.style.transform = `translateX(${which === 'login' ? 0 : 100}%)`;
      panes.login.classList.toggle('hidden', which !== 'login');
      panes.register.classList.toggle('hidden', which !== 'register');
      const pane = panes[which]; pane.classList.remove('swap-in'); void pane.offsetWidth; pane.classList.add('swap-in');
      title.textContent = which === 'login' ? 'Sign in' : 'Create your account';
      lead.textContent = which === 'login' ? 'to continue to the archive' : 'free - unlocks every creator and all YouTube links';
      if (focus) (which === 'login' ? $('#loginUser') : $('#regUser')).focus();
    }
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => show(t.dataset.tab, true));
      t.addEventListener('keydown', e => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        show(n.dataset.tab, false); n.focus();
      });
    });
    show(params.get('tab') === 'register' ? 'register' : 'login', false);

    $$('[data-toggle-pw]').forEach(b => b.addEventListener('click', () => {
      const input = $('#' + b.dataset.togglePw), on = input.type === 'password';
      input.type = on ? 'text' : 'password';
      b.textContent = on ? 'Hide' : 'Show';
      b.setAttribute('aria-pressed', on); b.setAttribute('aria-label', on ? 'Hide password' : 'Show password');
    }));

    const friendly = err => (err && err.status === 401 ? 'Incorrect username or password.' : err && err.message) || 'Something went wrong. Please try again.';

    /* sign in - an unconfirmed account gets a "resend" shortcut instead of a dead end */
    let unconfirmedUser = '';
    panes.login.addEventListener('submit', async e => {
      e.preventDefault(); setError('loginError', ''); $('#loginUnverified').hidden = true;
      const username = $('#loginUser').value.trim(), password = $('#loginPass').value;
      if (!username || !password) { setError('loginError', 'Enter your username (or email) and password.'); return; }
      const btn = $('#loginSubmit'); busy(btn, true);
      try { await YTAuth.login(username, password); go(); }
      catch (err) {
        if (err && err.code === 'email_not_verified') {
          unconfirmedUser = username;
          setError('loginError', err.message);
          $('#loginUnverified').hidden = false;
        } else setError('loginError', friendly(err));
        busy(btn, false, 'Sign in');
      }
    });
    $('#loginResend').addEventListener('click', async () => {
      const btn = $('#loginResend'); btn.disabled = true;
      try {
        const r = await YTAuth.resend(unconfirmedUser);
        showInbox({ who: unconfirmedUser, seconds: r.resendAfterSeconds || 60,
          lead: 'If that account is waiting for confirmation, a new link is on its way to the email you signed up with.' });
      } catch (err) { setError('loginError', err.message || 'Could not resend the email.'); }
      btn.disabled = false;
    });

    /* create account - needs a real email; the account only works after the link in that email is opened */
    const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    panes.register.addEventListener('submit', async e => {
      e.preventDefault(); setError('regError', '');
      const username = $('#regUser').value.trim(), email = $('#regEmail').value.trim(), password = $('#regPass').value, again = $('#regPass2').value;
      if (!/^[A-Za-z0-9_.-]{3,50}$/.test(username)) { setError('regError', 'Username must be 3-50 characters: letters, numbers, _ . -'); return; }
      if (!EMAIL.test(email) || email.length > 254) { setError('regError', 'Enter a valid email address - we send the confirmation link there.'); return; }
      if (password.length < 8) { setError('regError', 'Password must be at least 8 characters.'); return; }
      if (password !== again) { setError('regError', 'The two passwords do not match.'); return; }
      const btn = $('#regSubmit'); busy(btn, true);
      try {
        const r = await YTAuth.register(username, email, password);
        if (!r.pending) { go(); return; }                   // owner switched email confirmation off: signed in straight away
        showInbox({ who: email, shownEmail: email.toLowerCase(), seconds: r.resendAfterSeconds });
        busy(btn, false, 'Create account');
      } catch (err) { setError('regError', friendly(err)); busy(btn, false, 'Create account'); }
    });

    $('#guestBtn').addEventListener('click', async () => {
      const btn = $('#guestBtn'); setError('guestError', ''); busy(btn, true);
      try { await YTAuth.guest(); }
      catch (err) { YTAuth.localGuest(); }          // API unreachable: browse as a guest stored only in this browser
      go();
    });
  }
})();
