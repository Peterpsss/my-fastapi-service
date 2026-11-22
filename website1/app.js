/* ==========================================================================
   YouTuber Archive  -  app.js
   Depends on yt-core.js (shared API client, escaping, header/footer, modal).
   ========================================================================== */
(function () {
  'use strict';
  const { $, $$, esc, fmt, store, debounce } = YT;

  /* The archive opens only after the visitor has signed in, registered or chosen "Continue as guest". */
  if (!YTAuth.requireSession()) return;

  YT.mountShell({ site: 'archive' });
  YTAuth.mountAccount();

  /* ---------- sorting ---------- */
  const SORTS = {
    subs:   { open: true, label: 'Most subscribers', cmp: (a, b) => b.rawSubs - a.rawSubs,   metric: c => [c.subscribers, 'subscribers'] },
    views:  { label: 'Total views',      cmp: (a, b) => b.rawViews - a.rawViews, metric: c => [c.totalViews, 'total views'] },
    videos: { label: 'Video count',      cmp: (a, b) => b.videoCount - a.videoCount, metric: c => [fmt.int(c.videoCount), 'videos'] },
    avg:    { label: 'Views per video',  cmp: (a, b) => b.avgViews - a.avgViews, metric: c => [fmt.compact(c.avgViews), 'views per video'] },
    oldest: { label: 'Oldest channels',  cmp: (a, b) => (a.joinedYear || 9999) - (b.joinedYear || 9999), metric: c => [String(c.joinedYear || 'N/A'), 'joined'] },
    newest: { label: 'Newest channels',  cmp: (a, b) => b.joinedYear - a.joinedYear, metric: c => [String(c.joinedYear || 'N/A'), 'joined'] },
    name:   { open: true, label: 'Name A-Z',         cmp: (a, b) => a.name.localeCompare(b.name), metric: c => [c.subscribers, 'subscribers'] }
  };
  const PAGE = 60;
  const MAX_COMPARE = 3;

  const state = {
    all: [], byKey: new Map(), meta: { total: 0, unlocked: 0, totalSubs: 0 }, locked: 0,
    q: '', niche: 'All', sort: 'subs', onlyFollowing: false,
    visible: PAGE,
    compare: [],
    follows: new Set(store.get('follows', [])),
    rank: { subs: new Map(), views: new Map(), videos: new Map() },
    nicheCounts: new Map()
  };

  const el = {
    grid: $('#grid'), chips: $('#chips'), search: $('#searchInput'), sort: $('#sortSelect'),
    count: $('#resultsCount'), banner: $('#accessBanner'), more: $('#moreButton'), tray: $('#compareTray'), spotlight: $('#spotlight')
  };
  const modal = YT.createModal('creatorModal');
  const fold = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const basicOnly = () => !YTAuth.can('profile');       // guests only get basic details
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- boot ---------- */
  renderSkeleton();
  boot();

  async function boot(force = false) {
    YT.setStatus('connecting', 'Connecting');
    renderSkeleton();
    try {
      const { creators, meta, source } = await YTAuth.loadPortal({
        onSlow: () => YT.setStatus('connecting', 'Waking the API...')
      });
      // Locked creators arrive as anonymous stubs; they are counted, never listed.
      const open = creators.filter(c => c.access !== 'locked');
      state.meta = meta;
      state.locked = Math.max(0, meta.total - open.length);
      state.all = open.map(c => Object.assign(c, { _s: fold([c.name, c.handle, (c.categories || [c.niche]).join(' '), c.country, c.access === 'full' ? c.bio : ''].join(' ')) }));
      state.byKey = new Map(state.all.map(c => [c.key, c]));
      buildIndexes();
      YT.statusFromSource(source, meta.total);
      if (source === 'snapshot') YT.toast('Showing the built-in snapshot - the live API is unreachable.');
      applySortAccess();
      applyUrlState();
      renderBanner(); renderStats(); renderSpotlight(); renderTicker(); renderChips(); render();
      openFromUrl();
    } catch (err) {
      YT.setStatus('offline', 'Offline');
      el.grid.setAttribute('aria-busy', 'false');
      el.grid.classList.add('grid-error');
      YT.showState(el.grid, { type: 'error', message: YT.friendlyError(err), onRetry: () => { el.grid.classList.remove('grid-error'); boot(true); } });
    }
  }

  /* Guests only get subscriber counts, so the other sort orders are locked for them. */
  function applySortAccess() {
    const limited = basicOnly();
    Object.keys(SORTS).forEach(k => {
      const o = el.sort.querySelector(`option[value="${k}"]`); if (!o) return;
      const locked = limited && !SORTS[k].open;
      o.disabled = locked; o.textContent = SORTS[k].label + (locked ? ' (login required)' : '');
    });
    if (limited && !SORTS[state.sort].open) { state.sort = 'subs'; el.sort.value = 'subs'; }
  }

  function renderBanner() {
    const r = YTAuth.role(), m = state.meta, n = state.all.length;
    let html = '';
    if (r === 'guest') {
      html = `<p><strong>Guest preview</strong> - you can see ${n} of ${m.total} creators, with basic details only.<small>Create a free account (confirm your email) to see all ${m.total}, open their YouTube channels and most-viewed videos, follow and compare.</small></p>
        <div class="banner-actions"><a class="yt-btn yt-btn-primary yt-btn-sm" href="${esc(YTAuth.loginUrl({ tab: 'register' }))}">Create free account</a><a class="yt-btn yt-btn-ghost yt-btn-sm" href="${esc(YTAuth.loginUrl())}">Sign in</a></div>`;
    } else if (r === 'user') {
      html = state.locked
        ? `<p><strong>Member access</strong> - full profiles for the top ${n} of ${m.total} creators.<small>Admin accounts can open all ${m.total}.</small></p>`
        : `<p><strong>Member access</strong> - all ${m.total} creators unlocked.<small>Open any channel or its most-viewed video straight from the cards and profiles.</small></p>`;
    } else {
      html = `<p><strong>${esc(YTAuth.permsFor(r).label)} access</strong> - all ${m.total} creators unlocked.</p>
        <div class="banner-actions"><a class="yt-btn yt-btn-ghost yt-btn-sm" href="admin.html">Open admin panel</a></div>`;
    }
    el.banner.innerHTML = html; el.banner.hidden = !html;
  }

  function renderSkeleton() {
    el.grid.setAttribute('aria-busy', 'true');
    el.grid.innerHTML = Array.from({ length: 8 }, () =>
      '<div class="card card-skel" aria-hidden="true"><div class="yt-skel" style="height:104px;border-radius:0"></div><div style="padding:34px 16px 18px"><div class="yt-skel" style="height:18px;width:60%;margin-bottom:10px"></div><div class="yt-skel" style="height:12px;width:40%;margin-bottom:16px"></div><div class="yt-skel" style="height:12px;width:90%"></div></div></div>'
    ).join('');
  }

  function buildIndexes() {
    ['views', 'videos'].forEach(k => {                // only creators with full data can be ranked on these
      const field = { views: 'rawViews', videos: 'videoCount' }[k];
      [...state.all].filter(c => c.access === 'full').sort((a, b) => b[field] - a[field]).forEach((c, i) => state.rank[k].set(c.key, i + 1));
    });
    state.all.forEach((c, i) => state.rank.subs.set(c.key, c.rank || i + 1));   // global rank comes from the API
    state.nicheCounts = new Map();
    state.all.forEach(c => c.categories.forEach(n => state.nicheCounts.set(n, (state.nicheCounts.get(n) || 0) + 1)));
  }

  function applyUrlState() {
    const p = YT.params();
    const q = p.get('q'), niche = p.get('niche');
    if (q) { state.q = fold(q.trim()); el.search.value = q.trim(); }
    if (niche && state.nicheCounts.has(niche)) state.niche = niche;
    const sort = p.get('sort');
    if (sort && SORTS[sort] && !(basicOnly() && !SORTS[sort].open)) { state.sort = sort; el.sort.value = sort; }
  }

  /* ---------- hero ---------- */
  const animateNumber = (node, to, format = fmt.int) => YT.countUp(node, to, format);

  /* A slow-scrolling strip of avatars under the hero: shows only what the current role may see (no links in it). */
  function renderTicker() {
    const box = $('#ticker'); if (!box || !state.all.length) return;
    const top = [...state.all].sort((a, b) => b.rawSubs - a.rawSubs).slice(0, 24);
    const item = c => `<span class="tick">${YT.avatarImg(c, 'yt-avatar', 28)}<span>${esc(c.name)}</span><b>${esc(c.subscribers)}</b></span>`;
    const run = top.map(item).join('');
    box.innerHTML = `<div class="ticker-track">${run}${run}</div>`;
  }

  function renderStats() {
    animateNumber($('#statCreators'), state.meta.total);
    animateNumber($('#statNiches'), state.nicheCounts.size);
    animateNumber($('#statCountries'), new Set(state.all.map(c => c.country)).size);
    animateNumber($('#statSubs'), state.meta.totalSubs, fmt.compact);
  }

  function renderSpotlight() {
    if (!state.all.length) return;
    const day = Math.floor(Date.now() / 86400000);
    const ordered = [...state.all].sort((a, b) => (a.key < b.key ? -1 : 1));
    const c = ordered[YT.hash('spotlight:' + day) % ordered.length];
    el.spotlight.innerHTML = `
      <div class="spot-banner yt-banner" style="${esc(YT.bannerVars(c))}"></div>
      <div class="spot-body">
        <p class="yt-eyebrow">Creator of the day</p>
        <div class="spot-id">${YT.avatarImg(c, 'yt-avatar spot-avatar', 64)}
          <div><h2>${esc(c.name)}</h2><p>${esc(c.handle)}</p></div></div>
        <div class="yt-cats spot-cats">${YT.categoryChips(c, 3)}</div>
        <p class="spot-line"><strong>${esc(c.subscribers)}</strong> subscribers${c.access === 'full' ? ` &middot; <strong>${esc(c.totalViews)}</strong> views` : ''}</p>
        <button class="yt-btn yt-btn-ghost yt-btn-sm" type="button" data-spot="${esc(c.key)}">View profile</button>
      </div>`;
  }
  el.spotlight.addEventListener('click', e => {
    const b = e.target.closest('[data-spot]'); if (b) openCreator(b.dataset.spot);
  });

  /* ---------- filters ---------- */
  function renderChips() {
    const niches = [...state.nicheCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const chip = (id, label, count, pressed, dot) =>
      `<button class="yt-chip" type="button" data-niche="${esc(id)}" aria-pressed="${pressed}">${dot ? `<span class="yt-niche-dot" style="background:${esc(dot)}"></span>` : ''}${esc(label)} <small>${count}</small></button>`;
    el.chips.innerHTML =
      chip('All', 'All', state.all.length, !state.onlyFollowing && state.niche === 'All') +
      `<button class="yt-chip" type="button" data-following aria-pressed="${state.onlyFollowing}">&#9733; Following <small>${state.follows.size}</small></button>` +
      niches.map(([n, count]) => chip(n, n, count, !state.onlyFollowing && state.niche === n, YT.nicheColor(n))).join('');
  }

  el.chips.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-following')) { state.onlyFollowing = !state.onlyFollowing; }
    else { state.onlyFollowing = false; state.niche = b.dataset.niche; YT.setParam('niche', state.niche === 'All' ? '' : state.niche); }
    state.visible = PAGE; renderChips(); render();
  });
  el.search.addEventListener('input', debounce(() => {
    state.q = fold(el.search.value.trim()); state.visible = PAGE;
    YT.setParam('q', el.search.value.trim()); render();
  }, 160));
  el.sort.addEventListener('change', () => { state.sort = el.sort.value; state.visible = PAGE; YT.setParam('sort', state.sort === 'subs' ? '' : state.sort); render(); });
  el.more.addEventListener('click', () => { const was = state.visible; state.visible += PAGE; render(was); });
  document.addEventListener('keydown', e => {
    if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName) && !modal.isOpen()) { e.preventDefault(); el.search.focus(); }
  });

  function getFiltered() {
    const tokens = state.q ? state.q.split(/\s+/) : [];
    return state.all
      .filter(c => (state.onlyFollowing ? state.follows.has(c.key) : state.niche === 'All' || c.categories.includes(state.niche)))
      .filter(c => tokens.every(t => c._s.includes(t)))
      .sort(SORTS[state.sort].cmp);
  }

  /* ---------- grid ---------- */
  /* The links row: members open the channel / top video from the card; guests see where the links would be. */
  function cardLinks(c) {
    if (c.access !== 'full') return '<p class="card-lock-line"><span aria-hidden="true">&#128274;</span> Sign in for bio, stats and YouTube links</p>';
    const ch = YT.channelUrl(c), vid = YT.videoUrl(c), pop = YT.popularUrl(c);
    const top = vid ? `<a class="card-link card-link-video" href="${esc(vid)}" target="_blank" rel="noopener noreferrer" title="${esc(c.popularVideo.title || 'Top video')}">&#9654; Top video</a>`
      : pop ? `<a class="card-link card-link-video" href="${esc(pop)}" target="_blank" rel="noopener noreferrer" title="Opens this channel's videos sorted by most popular on YouTube">&#9654; Most viewed</a>` : '';
    return `<div class="card-links">${ch ? `<a class="card-link" href="${esc(ch)}" target="_blank" rel="noopener noreferrer">YouTube &#8599;</a>` : ''}${top}</div>`;
  }

  function cardHtml(c, position, index) {
    const sort = SORTS[state.sort];
    const [value, label] = sort.metric(c);
    const followed = state.follows.has(c.key), inCompare = state.compare.includes(c.key);
    const showRank = state.sort !== 'name';
    const basic = c.access !== 'full';
    return `
      <article class="card reveal" data-key="${esc(c.key)}" style="--i:${index % 4};--h:${c.hue}">
        <div class="card-banner yt-banner" style="${esc(YT.bannerVars(c))}">
          ${showRank ? `<span class="rank${position <= 3 ? ' rank-' + position : ''}" aria-label="Rank ${position}">#${position}</span>` : ''}
          <button class="icon-btn" type="button" data-follow="${esc(c.key)}" aria-pressed="${followed}" aria-label="${followed ? 'Unfollow' : 'Follow'} ${esc(c.name)}" title="${followed ? 'Following' : 'Follow'} (saved on this device)">&#9733;</button>
        </div>
        <div class="card-body">
          ${YT.avatarImg(c, 'yt-avatar card-avatar', 60)}
          <h3><button class="card-open" type="button" data-open="${esc(c.key)}">${esc(c.name)}</button></h3>
          <p class="handle">${esc(c.handle)} &middot; ${esc(c.country)}</p>
          <p class="metric"><strong>${esc(value)}</strong> <span>${esc(label)}</span></p>
          <div class="yt-cats card-cats">${YT.categoryChips(c, 3)}</div>
          ${basic ? '' : `<p class="bio">${esc(c.bio)}</p>`}
          ${cardLinks(c)}
          <div class="card-foot">
            ${basic ? '<span>Basic details only</span>' : `<span>${esc(c.totalViews)} views &middot; ${esc(fmt.int(c.videoCount))} videos</span>`}
            <button class="yt-btn yt-btn-ghost yt-btn-sm" type="button" data-compare="${esc(c.key)}" aria-pressed="${inCompare}">${inCompare ? '&#10003; Added' : '+ Compare'}</button>
          </div>
        </div>
      </article>`;
  }

  function lockCard(show) {
    if (!show || !state.locked) return '';
    const r = YTAuth.role(), n = state.locked, total = state.meta.total;
    const who = r === 'guest'
      ? { t: `${n} more creator${n === 1 ? ' is' : 's are'} waiting for you`,
          p: `Create a free account and confirm your email to see all ${total} creators, with full profiles, YouTube channel links and each most-viewed video.`,
          a: `<a class="yt-btn yt-btn-primary yt-ripple lock-cta" href="${esc(YTAuth.loginUrl({ tab: 'register' }))}">Create free account</a><a class="yt-btn yt-btn-ghost" href="${esc(YTAuth.loginUrl())}">Sign in</a>` }
      : { t: `${n} more creator${n === 1 ? ' is' : 's are'} locked`, p: 'Admin accounts can open the full catalog.', a: '' };
    return `<div class="lock-card reveal" role="note"><div class="lock-ghosts" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
      <div class="lock-copy"><h3><span aria-hidden="true">&#128274;</span> ${who.t}</h3><p>${esc(who.p)} Locked creators are hidden from search too.</p></div><div class="lock-actions">${who.a}</div></div>`;
  }

  function render(from = 0) {
    const list = getFiltered();
    const shown = list.slice(0, state.visible);
    el.grid.setAttribute('aria-busy', 'false');
    el.grid.classList.remove('grid-error');
    if (!list.length) {
      const msg = state.onlyFollowing && !state.follows.size
        ? 'You are not following anyone yet. Tap the star on any creator to save them here.'
        : 'Try different words or pick another category.';
      el.grid.innerHTML = `<div class="empty"><div class="empty-icon" aria-hidden="true">&#128269;</div><h3>No creators found</h3><p>${esc(msg)}</p><button class="yt-btn yt-btn-ghost" type="button" data-reset>Clear filters</button></div>`;
    } else {
      el.grid.innerHTML = shown.map((c, i) => cardHtml(c, i + 1, i)).join('');
      if (from) el.grid.querySelectorAll('.card').forEach((n, i) => { if (i < from) n.classList.add('in'); });   // "show more": only the new cards animate
    }
    el.grid.insertAdjacentHTML('beforeend', lockCard(list.length === 0 || shown.length >= list.length));
    el.count.textContent = list.length
      ? `Showing ${shown.length} of ${list.length} creator${list.length === 1 ? '' : 's'} · ${SORTS[state.sort].label}`
      : '0 creators';
    el.more.classList.toggle('hidden', shown.length >= list.length);
    YT.reveal(el.grid);
    renderTray();
  }

  el.grid.addEventListener('click', e => {
    const reset = e.target.closest('[data-reset]');
    if (reset) { state.q = ''; el.search.value = ''; state.niche = 'All'; state.onlyFollowing = false; YT.setParam('q', ''); YT.setParam('niche', ''); renderChips(); render(); return; }
    const fav = e.target.closest('[data-follow]');
    if (fav) { toggleFollow(fav.dataset.follow); return; }
    const cmp = e.target.closest('[data-compare]');
    if (cmp) { toggleCompare(cmp.dataset.compare); return; }
    const open = e.target.closest('[data-open]');
    if (open) { openCreator(open.dataset.open); return; }
    const card = e.target.closest('.card[data-key]');
    if (card && !e.target.closest('button, a')) openCreator(card.dataset.key);
  });

  /* ---------- follow (local to this browser - NOT a YouTube subscription) ---------- */
  function toggleFollow(key) {
    if (!state.follows.has(key) && !YTAuth.require('follow', 'Follow creators')) return;
    if (state.follows.has(key)) state.follows.delete(key); else state.follows.add(key);
    store.set('follows', [...state.follows]);
    const c = state.byKey.get(key);
    YT.toast(state.follows.has(key) ? `Following ${c.name}` : `Unfollowed ${c.name}`);
    renderChips();
    if (state.onlyFollowing) render(); else syncCard(key);
    if (modal.isOpen() && modal.el.dataset.key === key) syncModalFollow(key);
  }
  function syncCard(key) {
    const card = el.grid.querySelector(`.card[data-key="${CSS.escape(key)}"]`); if (!card) return;
    const f = card.querySelector('[data-follow]'), c = state.byKey.get(key), on = state.follows.has(key);
    f.setAttribute('aria-pressed', on); f.setAttribute('aria-label', `${on ? 'Unfollow' : 'Follow'} ${c.name}`);
  }
  function syncModalFollow(key) {
    const b = modal.el.querySelector('[data-m-follow]'); if (!b) return;
    const on = state.follows.has(key);
    b.setAttribute('aria-pressed', on); b.innerHTML = on ? '&#10003; Following' : '&#9733; Follow';
  }

  /* ---------- compare ---------- */
  function toggleCompare(key) {
    const i = state.compare.indexOf(key);
    if (i >= 0) state.compare.splice(i, 1);
    else if (!YTAuth.require('compare', 'Compare creators')) return;
    else if (state.compare.length >= MAX_COMPARE) { YT.toast(`You can compare up to ${MAX_COMPARE} creators.`); return; }
    else state.compare.push(key);
    $$(`[data-compare="${CSS.escape(key)}"]`).forEach(b => {
      const on = state.compare.includes(key);
      b.setAttribute('aria-pressed', on);
      if (b.closest('.card')) b.innerHTML = on ? '&#10003; Added' : '+ Compare';
    });
    renderTray();
  }

  function renderTray() {
    const n = state.compare.length;
    el.tray.classList.toggle('hidden', n === 0 || modal.isOpen());
    if (!n) { el.tray.innerHTML = ''; return; }
    el.tray.innerHTML = `
      <div class="tray-inner">
        <div class="tray-people">${state.compare.map(k => {
          const c = state.byKey.get(k);
          return `<span class="tray-chip">${YT.avatarImg(c, 'yt-avatar', 28)}${esc(c.name)}<button type="button" data-remove="${esc(k)}" aria-label="Remove ${esc(c.name)} from comparison">&times;</button></span>`;
        }).join('')}</div>
        <div class="tray-actions">
          <button class="yt-btn yt-btn-ghost yt-btn-sm" type="button" data-clear>Clear</button>
          <button class="yt-btn yt-btn-primary yt-btn-sm" type="button" data-run ${n < 2 ? 'disabled' : ''}>Compare ${n} &rarr;</button>
        </div>
        ${n < 2 ? '<p class="tray-hint">Add one more creator to compare.</p>' : ''}
      </div>`;
  }
  el.tray.addEventListener('click', e => {
    const rm = e.target.closest('[data-remove]'); if (rm) { toggleCompare(rm.dataset.remove); return; }
    if (e.target.closest('[data-clear]')) { [...state.compare].forEach(toggleCompare); return; }
    if (e.target.closest('[data-run]')) openCompare();
  });

  function openCompare() {
    const people = state.compare.map(k => state.byKey.get(k)).filter(Boolean);
    if (people.length < 2) return;
    const metrics = [
      { label: 'Subscribers', get: c => c.rawSubs, show: c => c.subscribers },
      { label: 'Total views', get: c => c.rawViews, show: c => c.totalViews },
      { label: 'Videos uploaded', get: c => c.videoCount, show: c => fmt.int(c.videoCount) },
      { label: 'Views per video', get: c => c.avgViews, show: c => fmt.compact(c.avgViews) },
      { label: 'Channel age (years)', get: c => (c.joinedYear ? new Date().getFullYear() - c.joinedYear : 0), show: c => (c.joinedYear ? `${new Date().getFullYear() - c.joinedYear} (since ${c.joinedYear})` : 'N/A') }
    ];
    const rows = metrics.map(m => {
      const max = Math.max(...people.map(m.get)) || 1;
      const lead = people.reduce((a, b) => (m.get(b) > m.get(a) ? b : a));
      return `<section class="cmp-metric"><h3>${esc(m.label)}</h3>${people.map(c => {
        const v = m.get(c), win = c === lead && v > 0;
        return `<div class="cmp-row${win ? ' win' : ''}"><span class="cmp-name">${esc(c.name)}</span><div class="cmp-bar" aria-hidden="true"><i style="width:${Math.max(3, Math.round((v / max) * 100))}%;background:hsl(${c.hue} 70% 55%)"></i></div><b>${esc(m.show(c))}${win ? ' <span class="crown" title="Leader">&#9733;</span>' : ''}</b></div>`;
      }).join('')}</section>`;
    }).join('');
    const wins = people.map(c => ({ c, n: metrics.filter(m => { const v = m.get(c); return v > 0 && v === Math.max(...people.map(m.get)); }).length }));
    const best = wins.reduce((a, b) => (b.n > a.n ? b : a));
    modal.el.dataset.key = '';
    modal.open(`
      <div class="cmp">
        <p class="yt-eyebrow">Side by side</p>
        <h2 id="cmpTitle">Compare creators</h2>
        <div class="cmp-people">${people.map(c => `<div class="cmp-person">${YT.avatarImg(c, 'yt-avatar', 52)}<div><strong>${esc(c.name)}</strong><span>${esc(c.niche)} &middot; ${esc(c.country)}</span></div></div>`).join('')}</div>
        ${rows}
        <p class="cmp-verdict"><strong>${esc(best.c.name)}</strong> leads in ${best.n} of ${metrics.length} categories.</p>
        <div class="m-actions"><button class="yt-btn yt-btn-ghost yt-btn-sm" type="button" data-copy-compare>Copy link to this comparison</button></div>
      </div>`, { labelledBy: 'cmpTitle', onClose: () => { YT.setParam('compare', ''); renderTray(); } });
    YT.setParam('compare', state.compare.join(','));
    el.tray.classList.add('hidden');
    modal.el.querySelector('[data-copy-compare]').addEventListener('click', () => copyText(location.href, 'Comparison link copied'));
  }

  /* ---------- creator modal ---------- */
  function similarTo(c) {
    const pool = state.all.filter(o => o.access === 'full');
    const shared = o => o.categories.filter(n => c.categories.includes(n)).length;
    const score = o => (o.niche === c.niche ? 0 : 100) - shared(o) * 40 + Math.abs(Math.log10(o.rawSubs + 1) - Math.log10(c.rawSubs + 1)) * 10;
    return pool.filter(o => o.key !== c.key).sort((a, b) => score(a) - score(b)).slice(0, 4);
  }

  function stat(label, value) { return `<div class="m-stat"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`; }

  /* A section the current account may not use: a "Login required" row instead of the content. */
  function lockedBlock(title, text, perm) {
    const staff = perm === 'export' || perm === 'edit';
    const signedIn = YTAuth.isSignedIn();
    return `<h3 class="m-sub">${esc(title)}</h3><div class="lock-inline"><span><span aria-hidden="true">&#128274;</span> <strong>${staff && signedIn ? 'Admin access required' : 'Login required'}</strong> - ${esc(text)}</span>
      ${signedIn && staff ? '' : `<a class="yt-btn yt-btn-ghost yt-btn-sm" href="${esc(YTAuth.loginUrl())}">Sign in</a>`}</div>`;
  }
  const gate = (perm, title, text, html) => (YTAuth.can(perm) ? html() : lockedBlock(title, text, perm));

  /* Most-viewed video. Every creator gets a working link: the video itself when we confirmed one, otherwise the
     channel's own "Most popular" list on YouTube. */
  function videoBlock(c) {
    const v = c.popularVideo, pop = YT.popularUrl(c);
    const more = pop ? `<a class="yt-btn yt-btn-ghost yt-btn-sm m-pop" href="${esc(pop)}" target="_blank" rel="noopener noreferrer">All their most-viewed videos &#8599;</a>` : '';
    if (!v.has) {
      return `<h3 class="m-sub">Most viewed video</h3>
        <div class="video-missing"><span>We have not pinned one single video for <strong>${esc(c.name)}</strong> yet. YouTube's own "Most popular" list for the channel is one tap away.</span>${more}</div>`;
    }
    const where = v.onChannel === false && v.channelTitle ? `Official video on <strong>${esc(v.channelTitle)}</strong> (the artist's label channel)` : '';
    const note = v.status === 'verified' ? '' : `<p class="verify-note">One of this channel's top videos, with the highest view count we could confirm - the exact #1 may differ slightly. The full "Most popular" list is linked below.</p>`;
    return `<h3 class="m-sub">${v.status === 'verified' ? 'Most viewed video' : 'Top video'}</h3>
      <a class="m-video" href="${esc(YT.videoUrl(c))}" target="_blank" rel="noopener noreferrer">
        <span class="m-thumb">${v.thumb ? `<img src="${esc(v.thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}<span class="m-play" aria-hidden="true">&#9654;</span></span>
        <span><strong>${esc(v.title)}</strong>${v.views ? `<em>${esc(v.views)}${v.published ? ` &middot; ${esc(v.published)}` : ''}</em>` : ''}${where ? `<em>${where}</em>` : ''}<small>Watch on YouTube &#8599;</small></span>
      </a>${note}${more ? `<div class="m-actions">${more}</div>` : ''}`;
  }

  function openCreator(key) {
    const c = state.byKey.get(key);
    if (!c) { YTAuth.prompt({ perm: 'profile', label: 'Open this creator profile', locked: YTAuth.role() === 'user' ? 'admin' : undefined }); return; }
    const full = c.access === 'full';
    const total = state.meta.total, rank = state.rank.subs.get(c.key) || total;
    const beats = total > 1 ? Math.round(((total - rank) / (total - 1)) * 100) : 100;
    const maxSubs = Math.max(...state.all.map(o => o.rawSubs)) || 1;
    const topPct = Math.max(1, Math.min(100, (c.rawSubs / maxSubs) * 100));
    const age = c.joinedYear ? new Date().getFullYear() - c.joinedYear : null;
    const following = state.follows.has(c.key);
    const link = `${location.origin}${location.pathname}?creator=${encodeURIComponent(c.key)}`;
    const unlockedNote = state.all.length < total ? ` among the ${state.all.length} you can open` : '';
    const channel = YT.channelUrl(c);

    const details = full ? `
        <p class="m-bio">${esc(c.bio)}</p>
        <div class="m-stats">
          ${stat('Subscribers', c.subscribers)}${stat('Total views', c.totalViews)}
          ${stat('Videos', fmt.int(c.videoCount))}${stat('Views per video', fmt.compact(c.avgViews))}
          ${stat('Channel started', c.joinedYear ? `${c.joinedYear}${age !== null ? ` (${age} yrs)` : ''}` : 'N/A')}${stat('Country', c.country)}
        </div>
        <h3 class="m-sub">Where they rank</h3>
        <div class="m-ranks">
          <span><b>#${rank}</b> of ${total} by subscribers</span>
          <span><b>#${state.rank.views.get(c.key)}</b> by total views${esc(unlockedNote)}</span>
          <span><b>#${state.rank.videos.get(c.key)}</b> by video count${esc(unlockedNote)}</span>
        </div>
        <div class="m-bar" role="img" aria-label="${Math.round(topPct)}% of the largest channel in the archive"><i style="width:${topPct}%"></i></div>
        <p class="m-barnote">${Math.round(topPct)}% of the biggest channel in the archive &middot; bigger than ${beats}% of the other creators here</p>
        ${gate('topVideo', 'Most viewed video', 'sign in to see the most-viewed video.', () => videoBlock(c))}
        ${gate('similar', 'Similar creators', 'sign in to see similar creators.', () => `<h3 class="m-sub">Similar creators</h3>
          <div class="m-similar">${similarTo(c).map(o => `<button class="yt-chip" type="button" data-similar="${esc(o.key)}">${esc(o.name)} <small>${esc(o.subscribers)}</small></button>`).join('')}</div>`)}
        ${gate('crossSites', 'Keep exploring', 'sign in to jump to the games and the taste matcher.', () => `<h3 class="m-sub">Keep exploring</h3>
          <div class="m-links">
            <a class="yt-btn yt-btn-ghost yt-btn-sm" href="${esc(YT.siteUrl('games', { niche: c.niche }))}">Play ${esc(c.niche)} games</a>
            <a class="yt-btn yt-btn-ghost yt-btn-sm" href="${esc(YT.siteUrl('matcher', {}))}">Find creators that match my taste</a>
          </div>`)}`
    : `
        <div class="m-stats">${stat('Subscribers', c.subscribers)}${stat('Rank', `#${rank} of ${total}`)}${stat('Country', c.country)}</div>
        ${lockedBlock('About this creator', 'sign in to read the full bio and see total views, video count and channel age.', 'profile')}
        ${lockedBlock('Where they rank', 'sign in to see rankings by views and videos.', 'profile')}
        ${lockedBlock('Most viewed video', 'sign in to see their most-viewed video and open the YouTube channel.', 'topVideo')}
        ${lockedBlock('Similar creators', 'sign in to see similar creators.', 'similar')}
        ${lockedBlock('Keep exploring', 'sign in to jump to the games and the taste matcher.', 'crossSites')}`;

    modal.el.dataset.key = c.key;
    modal.open(`
      <div class="m-banner yt-banner" style="${esc(YT.bannerVars(c))}"></div>
      <div class="m-body">
        <div class="m-head">
          ${YT.avatarImg(c, 'yt-avatar m-avatar', 92)}
          <div><h2 id="mTitle">${esc(c.name)}</h2>
          <p class="m-meta">${esc(c.handle)}${full ? ` &middot; ${esc(c.country)}` : ''}</p>
          <div class="yt-cats m-cats">${YT.categoryChips(c, 5)}</div></div>
        </div>
        <div class="m-actions">
          <button class="yt-btn yt-btn-primary yt-btn-sm" type="button" data-m-follow data-autofocus aria-pressed="${following}">${following ? '&#10003; Following' : '&#9733; Follow'}</button>
          ${channel ? `<a class="yt-btn yt-btn-ghost yt-btn-sm" href="${esc(channel)}" target="_blank" rel="noopener noreferrer">Open channel &#8599;</a>`
            : `<button class="yt-btn yt-btn-ghost yt-btn-sm" type="button" data-m-links><span aria-hidden="true">&#128274;</span> YouTube links</button>`}
          <button class="yt-btn yt-btn-ghost yt-btn-sm" type="button" data-m-compare>${state.compare.includes(c.key) ? '&#10003; In comparison' : '+ Compare'}</button>
          <button class="yt-btn yt-btn-ghost yt-btn-sm" type="button" data-m-copy>Copy link</button>
        </div>
        <p class="m-note">${full ? 'Following is saved on this device only - it does not subscribe you on YouTube.' : 'You are seeing the guest preview. Create a free account to unlock the full profile and the YouTube links.'}</p>
        ${details}
        ${c.verified ? '' : '<p class="verify-note">Profile details are awaiting review by an admin.</p>'}
      </div>`, { labelledBy: 'mTitle', onClose: () => { YT.setParam('creator', ''); modal.el.dataset.key = ''; renderTray(); } });

    YT.setParam('creator', c.key);
    el.tray.classList.add('hidden');
    const root = modal.el;
    root.querySelector('[data-m-follow]').addEventListener('click', () => toggleFollow(c.key));
    root.querySelector('[data-m-compare]').addEventListener('click', e => { toggleCompare(c.key); e.currentTarget.innerHTML = state.compare.includes(c.key) ? '&#10003; In comparison' : '+ Compare'; });
    root.querySelector('[data-m-copy]').addEventListener('click', () => copyText(link, 'Link copied'));
    const lk = root.querySelector('[data-m-links]');
    if (lk) lk.addEventListener('click', () => YTAuth.require('links', 'Open channels and videos on YouTube'));
    root.querySelectorAll('[data-similar]').forEach(b => b.addEventListener('click', () => openCreator(b.dataset.similar)));
  }

  function copyText(text, okMessage) {
    const done = () => YT.toast(okMessage);
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => YT.toast('Copy failed - select the address bar instead.'));
    else YT.toast('Copy is not supported here - use the address bar instead.');
  }

  function openFromUrl() {
    const p = YT.params();
    const keys = (p.get('compare') || '').split(',').map(k => k.trim().toLowerCase()).filter(k => state.byKey.has(k)).slice(0, MAX_COMPARE);
    if (keys.length >= 2 && YTAuth.can('compare')) { state.compare = keys; renderTray(); openCompare(); return; }
    const one = (p.get('creator') || '').trim().toLowerCase().replace(/^@/, '');
    if (one && (state.byKey.has(one) || state.locked)) openCreator(one);   // unknown + locked creators exist -> 'Login required'
  }
})();
