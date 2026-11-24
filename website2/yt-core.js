/* ==========================================================================
   yt-core.js  -  shared foundation for all three sites
   (YouTuber Archive · YouTuber Games · Taste Matcher)

   Keep this file IDENTICAL in every site folder (root, web2/, web3/).
   Edit the CONFIG block below once, then copy the file to the other folders.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- CONFIG: the only place you ever edit URLs ---------- */
  const CONFIG = {
    // The API that serves creator data (CORS is open, so every site can call it directly).
    API_BASE: 'https://my-fastapi-service-sigma.vercel.app',
    // READ-ONLY key for the legacy /api/v1 route. It cannot create, edit or delete anything.
    // The write key must NEVER appear in browser code.
    READ_ONLY_KEY: 'supersecret123',
    TIMEOUT_MS: 12000,
    CACHE_KEY: 'yt:creators:v2',
    CACHE_TTL_MS: 5 * 60 * 1000,
    SNAPSHOT_URL: 'creators-snapshot.json',
    SITES: {
      archive: { name: 'YouTuber Archive', short: 'Archive', url: 'https://my-fastapi-service-sigma.vercel.app/' },
      games: { name: 'YouTuber Games', short: 'Games', url: 'https://my-fastapi-service-website2.vercel.app/' },
      matcher: { name: 'YouTuber Taste Matcher', short: 'Taste Matcher', url: 'https://my-fastapi-service-website3.vercel.app/' }
    }
  };

  const isLocalHost = ['localhost', '127.0.0.1', '[::1]', ''].includes(location.hostname);
  // `?api=http://localhost:8000` is honoured on local machines only (never on a live domain).
  if (isLocalHost) {
    const override = new URLSearchParams(location.search).get('api');
    if (override) CONFIG.API_BASE = override;
    if (window.YT_API_BASE) CONFIG.API_BASE = window.YT_API_BASE;
  }
  CONFIG.API_BASE = CONFIG.API_BASE.replace(/\/+$/, '');

  /* ---------- tiny helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function debounce(fn, ms = 200) {
    let t;
    return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms); };
  }

  function hash(text) {                      // FNV-1a, 32-bit
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  const store = {
    get(key, fallback = null) {
      try { const raw = localStorage.getItem('yt:' + key); return raw === null ? fallback : JSON.parse(raw); }
      catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem('yt:' + key, JSON.stringify(value)); return true; } catch { return false; }
    }
  };

  /* ---------- number formatting ---------- */
  function compact(n) {
    n = Number(n) || 0;
    const trim = x => String(Math.round(x * 10) / 10).replace(/\.0$/, '');
    if (n >= 1e9) return trim(n / 1e9) + 'B';
    if (n >= 1e6) return trim(n / 1e6) + 'M';
    if (n >= 1e3) return trim(n / 1e3) + 'K';
    return String(Math.round(n));
  }
  const int = n => (Number(n) || 0).toLocaleString('en-US');

  /* ---------- niches ---------- */
  const NICHE_COLORS = {
    'Gaming': '#8b5cf6', 'Entertainment': '#f59e0b', 'Education': '#22c55e', 'Tech & Gadgets': '#38bdf8',
    'Lifestyle & Vlog': '#f472b6', 'Music': '#fb7185', 'Family': '#fbbf24', 'Comedy': '#facc15',
    'News & Commentary': '#94a3b8', 'Food': '#fb923c', 'Beauty & Fashion': '#e879f9', 'Sports & Fitness': '#4ade80',
    'Challenges & Stunts': '#ef4444', 'Stories & Mystery': '#2dd4bf'
  };
  // Every creator can have several categories (first = main one). Order here = order of the filter chips.
  const CATEGORIES = Object.keys(NICHE_COLORS);
  const LEGACY_CATEGORY = { 'Sports': 'Sports & Fitness' };
  const cleanCategory = v => { const t = String(v || '').trim(); return LEGACY_CATEGORY[t] || t; };
  const nicheColor = niche => NICHE_COLORS[cleanCategory(niche)] || '#9ca3af';

  /* ---------- creators: normalise once, use everywhere ---------- */
  const PLACEHOLDER_BANNER = /images\.unsplash\.com\/photo-1511512578047/;

  function initialsAvatar(name, hue) {
    const letters = String(name || '?').split(/\s+/).map(w => (w.match(/[\p{L}\p{N}]/u) || [''])[0]).filter(Boolean);
    const ini = esc((letters.slice(0, 2).join('') || '?').toUpperCase());
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 65% 46%)"/><stop offset="1" stop-color="hsl(${(hue + 55) % 360} 70% 28%)"/></linearGradient></defs><rect width="128" height="128" fill="url(#g)"/><text x="64" y="66" dy=".35em" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="50" font-weight="700" fill="#fff">${ini}</text></svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  const asText = (v, fallback = '') => (v === undefined || v === null || String(v).trim() === '' ? fallback : String(v).trim());
  const asNum = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
  const isHttp = u => /^https?:\/\//i.test(String(u || '').trim());
  const CHANNEL_ID = /^UC[\w-]{22}$/, VIDEO_ID = /^[\w-]{11}$/;

  function normalize(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const name = asText(raw.name);
    if (!name) return null;
    let handle = asText(raw.handle);
    if (!handle) handle = '@' + name.toLowerCase().replace(/[^a-z0-9]+/g, '');
    const key = handle.toLowerCase().replace(/^@/, '');
    const rawSubs = asNum(raw.rawSubs), rawViews = asNum(raw.rawViews), videoCount = asNum(raw.videoCount);
    const hue = hash(key) % 360;
    let categories = (Array.isArray(raw.categories) ? raw.categories : []).map(cleanCategory).filter(Boolean);
    const mainNiche = cleanCategory(asText(raw.niche, categories[0] || 'Other'));
    if (!categories.includes(mainNiche)) categories.unshift(mainNiche);
    categories = Array.from(new Set(categories));
    const pv = raw.popularVideo && typeof raw.popularVideo === 'object' ? raw.popularVideo : {};
    const videoId = VIDEO_ID.test(asText(pv.videoId)) ? asText(pv.videoId) : '';
    const pvThumb = isHttp(pv.thumb) ? asText(pv.thumb) : (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '');
    const pvUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : (isHttp(pv.url) ? asText(pv.url) : '');
    // 'verified' = from the channel's popular list, 'checked' = video confirmed on the channel, 'unverified' = nothing to show
    const hasVideo = !!(videoId || pvUrl);
    const popular = {
      title: hasVideo ? asText(pv.title, 'Popular upload') : '',
      views: hasVideo ? asText(pv.views, '') : '',
      thumb: hasVideo ? pvThumb : '',
      url: pvUrl, videoId,
      status: hasVideo ? (['verified', 'checked'].includes(pv.status) ? pv.status : 'checked') : 'unverified',
      has: hasVideo,
      // the channel's own "most viewed" list on YouTube - available for every creator, even without a confirmed single video
      popularUrl: isHttp(pv.popularUrl) ? asText(pv.popularUrl) : '',
      channelTitle: asText(pv.channelTitle, ''),
      onChannel: pv.onChannel !== false,
      published: asText(pv.published, '')
    };
    return {
      id: asText(raw.id, key),
      key, handle, name,
      niche: categories[0],
      categories,
      country: asText(raw.country, 'Unknown'),
      subscribers: asText(raw.subscribers, compact(rawSubs)),
      rawSubs,
      totalViews: asText(raw.totalViews, compact(rawViews)),
      rawViews, videoCount,
      joinedYear: asNum(raw.joinedYear),
      avgViews: videoCount ? Math.round(rawViews / videoCount) : 0,
      hue,
      // picture chain: real channel avatar -> unavatar lookup by handle -> generated initials (always works)
      avatar: isHttp(raw.avatar) ? asText(raw.avatar) : (/^@[\w.\-]+$/.test(handle) && !/^@locked-/.test(handle) ? 'https://unavatar.io/youtube/' + encodeURIComponent(key) : initialsAvatar(name, hue)),
      avatarFallback: /^@[\w.\-]+$/.test(handle) && !/^@locked-/.test(handle) ? 'https://unavatar.io/youtube/' + encodeURIComponent(key) : initialsAvatar(name, hue),
      avatarInitials: initialsAvatar(name, hue),
      banner: isHttp(raw.banner) && !PLACEHOLDER_BANNER.test(raw.banner) ? asText(raw.banner) : '',
      bio: asText(raw.bio, 'No description available.'),
      channelId: CHANNEL_ID.test(asText(raw.channelId)) ? asText(raw.channelId) : '',
      channelHref: isHttp(raw.channelUrl) ? asText(raw.channelUrl) : '',
      verified: raw.verified === true,
      // access: 'full' (everything) | 'basic' (guest preview) | 'locked' (anonymous stub from the tiered API)
      access: ['full', 'basic', 'locked'].includes(raw.access) ? raw.access : 'full',
      rank: asNum(raw.rank),
      unlock: asText(raw.unlock, ''),
      popularVideo: popular
    };
  }

  function normalizeList(list) {
    const seen = new Set(), out = [];
    for (const raw of list) {
      const c = normalize(raw);
      if (c && !seen.has(c.key)) { seen.add(c.key); out.push(c); }
    }
    return out;
  }

  /* ---------- links & media ---------- */
  // Always prefer the permanent channel id (a handle can be misspelled or change; an id cannot). Locked stubs have no link.
  function channelUrl(c) {
    if (c.access !== 'full') return '';             // links are a member feature: guest previews and locked stubs have none
    if (c.channelId) return 'https://www.youtube.com/channel/' + c.channelId;
    if (c.channelHref) return c.channelHref;
    return 'https://www.youtube.com/@' + encodeURIComponent(c.handle.replace(/^@/, ''));
  }
  // The exact video link, or '' when no most-viewed video has been confirmed (we never fall back to a search page).
  const videoUrl = c => (c.access === 'full' && c.popularVideo && c.popularVideo.has ? c.popularVideo.url : '');
  // Opens the channel's videos sorted by "Most popular" on YouTube.
  function popularUrl(c) {
    if (c.access !== 'full') return '';
    if (c.popularVideo && c.popularVideo.popularUrl) return c.popularVideo.popularUrl;
    return c.channelId ? `https://www.youtube.com/channel/${c.channelId}/videos?view=0&sort=p&flow=grid` : '';
  }
  function cssUrl(u) {
    return isHttp(u) ? 'url("' + String(u).replace(/["\\\n\r]/g, ch => encodeURIComponent(ch)) + '")' : 'none';
  }
  /* Inline-style fragment for an element with class "yt-banner": real banner if it loads, gradient otherwise. */
  const bannerVars = c => `--h:${c.hue};--banner-img:${cssUrl(c.banner)}`;

  const avatarImg = (c, cls = 'yt-avatar', size = 56) =>
    `<img class="${esc(cls)}" src="${esc(c.avatar)}" data-yt-fallback="${esc(c.avatarFallback)}" data-yt-fallback2="${esc(c.avatarInitials)}" alt="" width="${size}" height="${size}" loading="lazy" decoding="async" referrerpolicy="no-referrer">`;

  // One capture-phase listener replaces every inline onerror="" handler: real avatar -> unavatar -> initials.
  document.addEventListener('error', e => {
    const img = e.target;
    if (!img || img.tagName !== 'IMG') return;
    const stage = Number(img.dataset.ytStage || 0);
    const next = stage === 0 ? img.dataset.ytFallback : stage === 1 ? img.dataset.ytFallback2 : '';
    if (next && next !== img.getAttribute('src')) { img.dataset.ytStage = String(stage + 1); img.src = next; }
    else if (stage < 2 && img.dataset.ytFallback2) { img.dataset.ytStage = '2'; img.src = img.dataset.ytFallback2; }
  }, true);

  /* Category chips for a creator (all of them, main one first). */
  const categoryChips = (c, max = 4) => (c.categories || [c.niche]).slice(0, max)
    .map(n => `<span class="yt-cat" style="--cat:${esc(nicheColor(n))}"><i></i>${esc(n)}</span>`).join('');

  /* ---------- API client: public route -> legacy keyed route -> cache -> snapshot ---------- */
  function httpError(status) {
    const err = new Error(status === 404 ? 'API endpoint not found.' : `API request failed with status ${status}.`);
    err.status = status; return err;
  }

  async function fetchJson(url, headers) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS);
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json', ...(headers || {}) }, signal: controller.signal });
      if (!res.ok) throw httpError(res.status);
      return await res.json();
    } catch (err) {
      if (err.name === 'AbortError') { const e = new Error('The API took too long to respond.'); e.timeout = true; throw e; }
      throw err;
    } finally { clearTimeout(timer); }
  }

  const extractList = data => (data && Array.isArray(data.creators) ? data.creators : Array.isArray(data) ? data : []);

  async function fetchFromApi() {
    // A plain GET with no custom headers is a "simple" CORS request: no preflight round-trip, and the CDN can cache it.
    const attempts = [
      { url: CONFIG.API_BASE + '/creators' },
      { url: CONFIG.API_BASE + '/api/v1/creators', headers: { 'x-api-key': CONFIG.READ_ONLY_KEY } }
    ];
    let lastError = new Error('Could not reach the creator API.');
    for (const attempt of attempts) {
      try {
        const list = extractList(await fetchJson(attempt.url, attempt.headers));
        if (list.length) return list;
        lastError = new Error('The API returned no creators.');
      } catch (err) { lastError = err; }
    }
    throw lastError;
  }

  function readCache() {
    const c = store.get('creatorsCacheV3');
    return c && Array.isArray(c.list) && c.list.length ? c : null;
  }

  /* Returns { creators, source } where source is 'api' | 'cache' | 'stale' | 'snapshot'. Throws only if nothing works. */
  async function loadCreators({ force = false, onSlow } = {}) {
    const cached = readCache();
    if (!force && cached && Date.now() - cached.t < CONFIG.CACHE_TTL_MS) {
      return { creators: normalizeList(cached.list), source: 'cache' };
    }
    const slow = onSlow ? setTimeout(onSlow, 3500) : null;
    try {
      const list = await fetchFromApi();
      store.set('creatorsCacheV3', { t: Date.now(), list });
      return { creators: normalizeList(list), source: 'api' };
    } catch (apiError) {
      if (cached) return { creators: normalizeList(cached.list), source: 'stale', error: apiError };
      try {
        const snap = extractList(await fetchJson(CONFIG.SNAPSHOT_URL));
        const creators = normalizeList(snap);
        if (creators.length) return { creators, source: 'snapshot', error: apiError };
      } catch { /* fall through */ }
      throw apiError;
    } finally { if (slow) clearTimeout(slow); }
  }

  function friendlyError(err) {
    if (!err) return 'Could not connect to the creator API.';
    if (err.timeout) return 'The API took too long to respond. It may be waking up - try again in a few seconds.';
    if (err.status === 404) return 'The API endpoint was not found. Check API_BASE in yt-core.js.';
    if (err.status) return `The API answered with an error (${err.status}). Please try again shortly.`;
    return 'Could not reach the creator API. Check your connection and try again.';
  }

  /* ---------- shell: header, switcher, status pill, footer, toast ---------- */
  const BRAND_TAGLINES = {
    archive: 'Discover creators through data.',
    games: 'Guess, compare, climb streaks.',
    matcher: 'Find creators made for your feed.'
  };

  function siteUrl(site, params) {
    const base = CONFIG.SITES[site].url;
    const qs = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') qs.set(k, v); });
    const s = qs.toString();
    return base + (s ? '?' + s : '');
  }

  function mountShell({ site, main, bare }) {
    document.body.dataset.site = site;
    const info = CONFIG.SITES[site];
    const links = Object.entries(CONFIG.SITES).map(([id, s]) => {
      const current = id === site;
      return `<a href="${current ? './' : esc(s.url)}"${current ? ' aria-current="page"' : ''}><span class="yt-dot" aria-hidden="true"></span>${esc(s.short)}</a>`;
    }).join('');

    const skip = document.createElement('a');
    skip.className = 'yt-skip'; skip.href = '#' + (main || 'main'); skip.textContent = 'Skip to content';

    const header = document.createElement('header');
    header.className = 'yt-header';
    header.innerHTML = `
      <div class="yt-header-inner">
        <a class="yt-brand" href="./" aria-label="${esc(info.name)} home">
          <span class="yt-logo" aria-hidden="true"></span>
          <span class="yt-brand-text"><strong>${esc(info.name)}</strong><small>${esc(BRAND_TAGLINES[site])}</small></span>
        </a>
        <nav class="yt-switcher" id="ytSwitcher" aria-label="Project websites">${links}</nav>
        <div class="yt-status" id="ytStatus" role="status" aria-live="polite"><span class="yt-status-dot" aria-hidden="true"></span><span id="ytStatusText">Connecting</span></div>
        <div class="yt-account" id="ytAccount"></div>
                <button class="yt-nav-toggle" id="ytNavToggle" type="button" aria-label="Open site menu" aria-expanded="false" aria-controls="ytSwitcher"><span></span><span></span><span></span></button>
      </div>`;

    const footer = document.createElement('footer');
    footer.className = 'yt-footer';
    footer.innerHTML = `
      <div class="yt-container yt-footer-inner">
        <p>One API, three experiences. Creator figures are snapshot estimates and may be out of date. Not affiliated with or endorsed by YouTube.</p>
        <nav aria-label="Project websites footer">${Object.values(CONFIG.SITES).map(s => `<a href="${esc(s.url)}">${esc(s.short)}</a>`).join('')}</nav>
      </div>`;

    const aurora = document.createElement('div');
    aurora.className = 'yt-aurora'; aurora.setAttribute('aria-hidden', 'true');
    aurora.innerHTML = '<i></i><i></i><i></i>';
    document.body.prepend(aurora);
    const bar = document.createElement('div');       // thin red "page is loading" bar across the top, like YouTube
    bar.className = 'yt-loadbar'; bar.setAttribute('aria-hidden', 'true');
    document.body.prepend(bar);

    const toast = document.createElement('div');
    toast.className = 'yt-toast'; toast.id = 'ytToast'; toast.setAttribute('role', 'status'); toast.setAttribute('aria-live', 'polite');

    if (bare) {                                   // login page: no site header, nav or footer - just the page and toasts
      document.body.prepend(skip);
      document.body.append(toast);
      return;
    }
    document.body.prepend(header);
    document.body.prepend(skip);
    document.body.append(footer, toast);

    const toggle = $('#ytNavToggle'), nav = $('#ytSwitcher');
    const setOpen = open => { nav.classList.toggle('open', open); toggle.classList.toggle('open', open); toggle.setAttribute('aria-expanded', String(open)); };
    toggle.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
    document.addEventListener('click', e => { if (!header.contains(e.target)) setOpen(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
    window.addEventListener('resize', () => { if (window.innerWidth > 820) setOpen(false); });
  }

  function setStatus(state, text) {
    const box = $('#ytStatus'), label = $('#ytStatusText');
    if (!box || !label) return;
    box.className = 'yt-status ' + state;
    label.textContent = text;
  }
  function statusFromSource(source, count) {
    if (source === 'api') setStatus('online', `Live · ${count} creators`);
    else if (source === 'cache') setStatus('online', `${count} creators`);
    else if (source === 'stale') setStatus('snapshot', `Cached · ${count} creators`);
    else if (source === 'snapshot') setStatus('snapshot', `Offline snapshot · ${count}`);
  }

  let toastTimer;
  function toast(message) {
    const el = $('#ytToast'); if (!el) return;
    el.textContent = message; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  /* Consistent loading / error panels for every site. */
  function showState(container, { type = 'loading', title, message, onRetry, retryLabel = 'Try again' }) {
    const isError = type === 'error';
    container.innerHTML = `
      <div class="yt-state" role="${isError ? 'alert' : 'status'}">
        ${isError ? '<div class="yt-state-icon" aria-hidden="true">!</div>' : '<div class="yt-spinner" aria-hidden="true"></div>'}
        <h2>${esc(title || (isError ? 'Could not load creator data' : 'Loading creators'))}</h2>
        <p data-state-message>${esc(message || '')}</p>
        ${isError && onRetry ? `<button class="yt-btn yt-btn-primary" type="button" data-retry>${esc(retryLabel)}</button>` : ''}
      </div>`;
    const btn = $('[data-retry]', container);
    if (btn && onRetry) btn.addEventListener('click', onRetry);
  }

  /* ---------- accessible modal with focus trap ---------- */
  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  function createModal(id) {
    const root = document.createElement('div');
    root.className = 'yt-modal hidden'; root.id = id;
    root.innerHTML = `<div class="yt-modal-backdrop" data-close></div>
      <div class="yt-modal-panel" role="dialog" aria-modal="true" tabindex="-1">
        <button class="yt-modal-close" type="button" aria-label="Close dialog" data-close>&times;</button>
        <div class="yt-modal-content"></div>
      </div>`;
    document.body.appendChild(root);
    const panel = $('.yt-modal-panel', root), content = $('.yt-modal-content', root);
    let opener = null, onClose = null;

    function trap(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      const items = $$(FOCUSABLE, panel).filter(el => el.offsetParent !== null);
      if (!items.length) { e.preventDefault(); panel.focus(); return; }
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    function open(html, { labelledBy, onClose: cb } = {}) {
      const wasOpen = !root.classList.contains('hidden');
      if (!wasOpen) opener = document.activeElement;   // swapping content keeps the original opener
      onClose = cb || onClose;
      content.innerHTML = html;
      if (labelledBy) panel.setAttribute('aria-labelledby', labelledBy); else panel.removeAttribute('aria-labelledby');
      root.classList.remove('hidden');
      document.body.classList.add('yt-modal-open');
      document.addEventListener('keydown', trap);
      requestAnimationFrame(() => { root.classList.add('show'); panel.scrollTop = 0; (panel.querySelector('[data-autofocus]') || panel).focus({ preventScroll: true }); });
    }
    function close() {
      if (root.classList.contains('hidden')) return;
      root.classList.remove('show'); root.classList.add('hidden');
      document.body.classList.remove('yt-modal-open');
      document.removeEventListener('keydown', trap);
      if (opener && typeof opener.focus === 'function') opener.focus({ preventScroll: true });
      const cb = onClose; onClose = null; if (cb) cb();
    }
    root.addEventListener('click', e => { if (e.target.closest('[data-close]')) close(); });
    return { el: root, content, open, close, isOpen: () => !root.classList.contains('hidden') };
  }

  /* ---------- URL helpers ---------- */
  const params = () => new URLSearchParams(location.search);
  function setParam(key, value) {
    const p = params();
    if (value === null || value === undefined || value === '') p.delete(key); else p.set(key, value);
    const qs = p.toString();
    try { history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash); } catch { /* file:// */ }
  }

  /* ---------- "alive" helpers: scroll reveal, count-up numbers, ripples, header shadow ---------- */
  const calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('js');
  let revealObserver = null;
  /* Fades elements with class .reveal in as they scroll into view. Call again after rendering new content. */
  function reveal(root = document) {
    const nodes = root.querySelectorAll('.reveal:not(.in)');
    if (calm || !('IntersectionObserver' in window)) { nodes.forEach(n => n.classList.add('in')); return; }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(entries => entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add('in'); revealObserver.unobserve(en.target); }
      }), { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    }
    nodes.forEach(n => revealObserver.observe(n));
  }
  /* Gives each child a --i index (used for staggered entrance delays, capped so long lists do not wait). */
  function stagger(container, selector = ':scope > *', cap = 14) {
    container.querySelectorAll(selector).forEach((n, i) => n.style.setProperty('--i', Math.min(i, cap)));
  }
  function countUp(node, to, format = int, ms = 1100) {
    if (!node) return;
    if (calm || to < 2) { node.textContent = format(to); return; }
    const t0 = performance.now();
    const step = now => {
      const t = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - t, 4);
      node.textContent = format(Math.round(to * e));
      if (t < 1) requestAnimationFrame(step); else node.textContent = format(to);
    };
    requestAnimationFrame(step);
  }
  // Material-style ripple on every button / chip / pill link
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest && e.target.closest('.yt-btn, .yt-chip, .yt-ripple');
    if (!b || calm || b.disabled) return;
    const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 1.6;
    const dot = document.createElement('span');
    dot.className = 'yt-ripple-dot';
    dot.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    if (getComputedStyle(b).position === 'static') b.style.position = 'relative';
    b.classList.add('yt-rippling');
    b.appendChild(dot);
    setTimeout(() => dot.remove(), 650);
  }, { passive: true });
  window.addEventListener('scroll', () => {
    const h = document.querySelector('.yt-header'); if (h) h.classList.toggle('scrolled', window.scrollY > 8);
  }, { passive: true });

  /* ---------- account (sign-in shared between the three sites) ----------
     Only the Archive has the login page. The Games site lives on its own address, so after signing in the Archive sends the visitor
     back with the session in the URL *fragment* (#ytsession=...). A fragment is never sent to any server; it is read once here,
     stored in this site's own storage and removed from the address bar. Only the two sibling sites are ever allowed as targets. */
  const account = (() => {
    const b64 = s => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const unb64 = s => atob(String(s).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((String(s).length + 3) % 4));
    const clear = () => { try { localStorage.removeItem('yt:auth'); } catch { /* ignore */ } };
    function get() {                                    // -> { username, role } for a signed-in member / admin, otherwise null
      const a = store.get('auth');
      if (!a || !a.user || !a.token || !['user', 'admin'].includes(a.user.role)) return null;
      if (a.exp && Date.now() > a.exp) { clear(); return null; }
      return { username: String(a.user.username || ''), role: a.user.role };
    }
    function encode(a) {                                // the Archive calls this when it sends a signed-in visitor back to a sibling site
      if (!a || !a.token || !a.user || !['user', 'admin'].includes(a.user.role)) return '';
      return b64(JSON.stringify({ t: a.token, i: a.user.id, u: a.user.username, r: a.user.role, e: a.exp || 0 }));
    }
    function adopt() {                                  // runs once at load: accept a session handed over in the fragment
      const m = /^#ytsession=([A-Za-z0-9_-]{20,3000})$/.exec(location.hash);
      if (!m) return;
      try { history.replaceState(null, '', location.pathname + location.search); } catch { /* ignore */ }
      try {
        const d = JSON.parse(unb64(m[1]));
        const ok = typeof d.t === 'string' && /^[\w-]+\.[\w-]+\.[\w-]+$/.test(d.t) && ['user', 'admin'].includes(d.r)
          && /^[A-Za-z0-9_.@-]{1,254}$/.test(String(d.u)) && Number(d.e) > Date.now();
        if (ok) store.set('auth', { token: d.t, user: { id: Number(d.i) || 0, username: String(d.u), role: d.r }, exp: Number(d.e) });
      } catch { /* a malformed fragment is simply ignored */ }
    }
    async function verify() {                           // asks the API whether the stored session is still good (never blocks the page)
      const a = store.get('auth');
      if (!a || !a.token) return get();
      try {
        const r = await fetch(CONFIG.API_BASE + '/auth/me', { headers: { Accept: 'application/json', Authorization: 'Bearer ' + a.token } });
        if (r.status === 401) { clear(); return null; }
        if (r.ok) { const me = await r.json(); if (me && me.role) store.set('auth', { token: a.token, user: { id: me.id, username: me.username, role: me.role }, exp: a.exp }); }
      } catch { /* offline: keep what we have */ }
      return get();
    }
    const loginUrl = site => CONFIG.SITES.archive.url + 'login.html?next=' + encodeURIComponent(CONFIG.SITES[site].url);
    adopt();
    return { get, encode, verify, signOut: clear, loginUrl };
  })();

  window.YT = {
    CONFIG, $, $$, esc, debounce, hash, store, fmt: { compact, int },
    nicheColor, CATEGORIES, categoryChips, normalize, normalizeList, channelUrl, videoUrl, popularUrl, bannerVars, avatarImg, initialsAvatar,
    loadCreators, friendlyError, mountShell, setStatus, statusFromSource, toast, showState, createModal,
    siteUrl, params, setParam, reveal, countUp, stagger, account
  };
})();
