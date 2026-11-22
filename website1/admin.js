/* Admin panel (admin only: overview, add / edit creators, users, audit log, CSV export).
   The API re-checks the role on every call - hiding a tab here is only a convenience. */
(function () {
  'use strict';
  const { $, $$, esc, fmt } = YT;
  YT.mountShell({ site: 'archive' });
  { const st = document.getElementById('ytStatus'); if (st) st.remove(); }   // no data feed on this page

  const gate = $('#adminGate'), app = $('#adminApp'), panel = $('#adminPanel'), tabsEl = $('#adminTabs');
  const state = { tab: 'overview', run: 0 };
  let me = null;

  const fail = err => (err && err.message) || 'Something went wrong.';
  const flash = (msg, bad) => YT.toast((bad ? 'Error: ' : '') + msg);
  const idNum = id => String(id).replace(/^yt/, '');

  /* ---------- gate ---------- */
  function showGate(title, message, withLogin) {
    app.hidden = true;
    gate.innerHTML = `<div class="yt-state" role="alert"><div class="yt-state-icon" aria-hidden="true">&#128274;</div><h2>${esc(title)}</h2><p>${esc(message)}</p>
      <div class="auth-actions">${withLogin ? `<a class="yt-btn yt-btn-primary" href="${esc(YTAuth.loginUrl())}">Sign in</a>` : ''}<a class="yt-btn yt-btn-ghost" href="index.html">Back to the archive</a></div></div>`;
  }

  async function init() {
    const stored = YTAuth.read();
    if (!stored || stored.user.role === 'guest') return showGate('Login required', 'The admin area is only for signed-in admin accounts.', true);
    const fresh = await YTAuth.refresh();
    if (!fresh) return showGate('Login required', 'Your session has expired. Please sign in again.', true);
    me = fresh.user;
    if (!YTAuth.permsFor(me.role).edit) return showGate('Admin access required', 'Your account is a member account. Only the site admin can open this area.', false);
    gate.innerHTML = ''; app.hidden = false;
    YTAuth.mountAccount();
    $('#adminRole').textContent = 'Admin';
    $('#adminTitle').textContent = 'Admin panel';
    $('#adminSub').textContent = 'Add or fix a YouTuber (pictures, top video, info), manage member accounts and read the audit log.';
    const tabs = [['overview', 'Overview'], ['editor', 'Add / edit'], ['users', 'Users'], ['audit', 'Audit log']];
    tabsEl.innerHTML = tabs.map(([id, label]) => `<button type="button" role="tab" id="tab-${id}" data-tab="${id}" aria-selected="false" aria-controls="adminPanel" tabindex="-1">${label}</button>`).join('');
    tabsEl.addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) go(b.dataset.tab); });
    tabsEl.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const list = $$('[data-tab]', tabsEl), i = list.findIndex(b => b.getAttribute('aria-selected') === 'true');
      const n = list[(i + (e.key === 'ArrowRight' ? 1 : list.length - 1)) % list.length]; go(n.dataset.tab); n.focus();
    });
    $('#exportBtn').addEventListener('click', exportCsv);
    go(YT.params().get('tab') || 'overview');
  }

  function go(tab) {
    if (!$(`[data-tab="${tab}"]`, tabsEl)) tab = 'overview';
    state.tab = tab;
    $$('[data-tab]', tabsEl).forEach(b => { const on = b.dataset.tab === tab; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
    panel.setAttribute('aria-labelledby', 'tab-' + tab);
    YT.setParam('tab', tab === 'overview' ? '' : tab);
    state.run++; panel.onclick = panel.onchange = null;          // every tab starts clean; a slow answer from the previous tab is ignored
    ({ overview, editor: editorTab, users: usersTab, audit: auditTab })[tab]();
  }
  const loading = () => { panel.innerHTML = '<div class="yt-state compact" role="status"><div class="yt-spinner" aria-hidden="true"></div><p>Loading...</p></div>'; };
  const errorBox = (err, retry) => {
    if (err && err.status === 401) { YTAuth.logout(); return showGate('Login required', 'Your session has expired. Please sign in again.', true); }
    panel.innerHTML = `<div class="yt-state compact" role="alert"><div class="yt-state-icon" aria-hidden="true">!</div><p>${esc(fail(err))}</p><button class="yt-btn yt-btn-primary" type="button" id="retry">Try again</button></div>`;
    $('#retry').addEventListener('click', retry);
  };

  /* ---------- add / edit (see admin-editor.js) ---------- */
  function editorTab() {
    const run = state.run;
    AdminEditor.mount({ panel, loading, errorBox, flash, fail, call: YTAuth.call, current: () => state.run === run && state.tab === 'editor', reload: editorTab });
  }

  /* ---------- overview ---------- */
  async function overview() {
    loading();
    try {
      const o = await YTAuth.call('/admin/overview');
      const v = o.topVideos || {}, u = o.users;
      const tile = (n, l, hint) => `<div class="a-tile"><strong>${esc(n)}</strong><span>${esc(l)}</span>${hint ? `<small>${esc(hint)}</small>` : ''}</div>`;
      panel.innerHTML = `
        <div class="a-tiles">
          ${tile(o.creators, 'Creators in the database', `catalog has ${o.catalogSize}`)}
          ${tile(o.verifiedCreators, 'Profiles verified', 'channel ID and counts checked')}
          ${tile(v.verified || 0, 'Top videos verified', 'from the channel\'s popular list')}
          ${tile(v.checked || 0, 'Top videos checked', 'exists, ranking unconfirmed')}
          ${tile(v.unverified || 0, 'Top videos missing', 'link to the channel\'s most-popular list')}
          ${u ? tile((u.user || 0) + (u.admin || 0), 'Accounts', `${u.user || 0} members · ${u.admin || 0} admins`) : ''}
        </div>
        <div class="a-card"><h3>Access limits</h3>
          <p>Guests see the top <strong>${o.limits.guest}</strong> creators (basic details, no YouTube links). Signed-up members with a confirmed email see up to <strong>${o.limits.user}</strong> with full profiles and links. Admins see all ${o.creators}.
          Change the limits with the <code>GUEST_LIMIT</code> and <code>USER_LIMIT</code> environment variables on the API.</p></div>
        <div class="a-card"><h3>About the data</h3><ul class="a-list">
          <li>The creator catalog (names, categories, avatars, numbers, top videos) updates itself whenever a new version of the site is deployed. Anything you type in <button class="linkish" type="button" data-go="editor">Add / edit</button> is remembered and never overwritten by those automatic updates.</li>
          <li>${(v.unverified || 0)} creators have no single confirmed most-viewed video yet - open <button class="linkish" type="button" data-go="editor">Add / edit</button>, choose the filter <strong>No top video</strong> and paste the video link. Until then, members get a link to the channel's own most-popular list.</li>
          <li>A creator without a picture or banner can be fixed the same way: paste the image address and the site uses it everywhere.</li>
          <li>See who signed up, and whether they confirmed their email, in <button class="linkish" type="button" data-go="users">Users</button>.</li>
        </ul></div>`;
      $$('[data-go]', panel).forEach(b => b.addEventListener('click', () => go(b.dataset.go)));
    } catch (err) { errorBox(err, overview); }
  }

  /* ---------- helpers ---------- */
  const badge = (text, kind) => `<span class="a-badge ${kind}">${esc(text)}</span>`;

  /* ---------- users (admin) ---------- */
  async function usersTab() {
    loading();
    try {
      const d = await YTAuth.call('/admin/users');
      panel.innerHTML = `<div class="table-scroll"><table class="a-table"><thead><tr><th scope="col">Username</th><th scope="col">Email</th><th scope="col">Role</th><th scope="col">Joined</th><th scope="col">Actions</th></tr></thead><tbody>
        ${d.users.map(u => `<tr><th scope="row">${esc(u.username)}${u.id === me.id ? ' <small>(you)</small>' : ''}</th>
          <td>${u.email ? `${esc(u.email)}<small>${u.emailVerified === false ? badge('not confirmed', 'warn') : badge('confirmed', 'ok')}</small>` : '<small>no email</small>'}</td>
          <td><label class="sr-only" for="role-${u.id}">Role for ${esc(u.username)}</label>
            <select id="role-${u.id}" data-role="${u.id}" ${u.id === me.id ? 'disabled' : ''}>${['user', 'admin'].map(r => `<option value="${r}"${u.role === r ? ' selected' : ''}>${r === 'user' ? 'member' : r}</option>`).join('')}</select></td>
          <td>${esc((u.createdAt || '').slice(0, 10))}</td>
          <td>${u.id === me.id ? '' : `<button class="yt-btn yt-btn-ghost yt-btn-sm danger" type="button" data-deluser="${u.id}">Delete</button>`}</td></tr>`).join('')}
        </tbody></table></div><p class="a-count">${d.count} account${d.count === 1 ? '' : 's'}. Anyone who signs up is a member once they confirm their email; promote trusted people to admin.</p>`;
      panel.onchange = async e => {
        const s = e.target.closest('[data-role]'); if (!s) return;
        try { await YTAuth.call(`/admin/users/${s.dataset.role}/role`, { method: 'PUT', body: { role: s.value } }); flash('Role updated'); }
        catch (err) { flash(fail(err), true); usersTab(); }
      };
      panel.onclick = async e => {
        const b = e.target.closest('[data-deluser]'); if (!b) return;
        if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'Click again to delete'; setTimeout(() => { b.dataset.armed = ''; b.textContent = 'Delete'; }, 4000); return; }
        try { await YTAuth.call('/admin/users/' + b.dataset.deluser, { method: 'DELETE' }); flash('User deleted'); usersTab(); }
        catch (err) { flash(fail(err), true); }
      };
    } catch (err) { errorBox(err, usersTab); }
  }

  /* ---------- audit (admin) ---------- */
  async function auditTab() {
    loading();
    try {
      const d = await YTAuth.call('/admin/audit');
      panel.innerHTML = `<div class="table-scroll"><table class="a-table"><thead><tr><th scope="col">When</th><th scope="col">Who</th><th scope="col">What</th><th scope="col">Target</th></tr></thead><tbody>
        ${d.entries.map(a => `<tr><td>${esc(a.at.replace('T', ' ').slice(0, 16))}</td><td>${esc(a.actor)}</td><td>${esc(a.action)}</td><td>${esc(a.target)}</td></tr>`).join('') || '<tr><td colspan="4">Nothing recorded yet.</td></tr>'}
        </tbody></table></div><p class="a-count">Latest ${d.count} actions.</p>`;
    } catch (err) { errorBox(err, auditTab); }
  }

  /* ---------- CSV export ---------- */
  async function exportCsv() {
    try {
      const a = YTAuth.read();
      const res = await fetch(YT.CONFIG.API_BASE + '/portal/export', { headers: { Authorization: 'Bearer ' + a.token } });
      if (!res.ok) throw new Error(res.status === 403 ? 'Only admin accounts can export.' : `Export failed (${res.status}).`);
      const url = URL.createObjectURL(await res.blob());
      const link = document.createElement('a'); link.href = url; link.download = 'youtuber-archive.csv'; document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000); flash('CSV downloaded');
    } catch (err) { flash(fail(err), true); }
  }

  init();
})();
