/* Admin "Add / edit" tab: pick a YouTuber (or add a new one) and type in its pictures, most-viewed video, bio,
   categories and numbers. Whatever is typed here is remembered by the API, so the automatic catalog update never
   overwrites it. The API checks every value again - the checks here only give faster, friendlier messages. */
(function () {
  'use strict';
  const { $, $$, esc } = YT;

  const IMG_LINK = /^https:\/\/[^\s"'<>\\]{4,580}$/;
  const VIDEO_ID = /^[\w-]{11}$/;
  const CHANNEL_ID = /^UC[\w-]{22}$/;
  const YT_HOSTS = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com', 'youtu.be', 'www.youtu.be'];
  const AUTO_AVATAR = /^https:\/\/unavatar\.io\//;
  const WORDS = { identity: 'name / handle', stats: 'numbers', avatar: 'picture', banner: 'banner', bio: 'bio', country: 'country', categories: 'categories', video: 'top video' };

  /* Same rules as api/overrides_engine.py video_id_from: any normal YouTube video address, or the bare 11-character id. */
  function videoIdFrom(text) {
    const t = String(text || '').trim();
    if (!t) return '';
    if (VIDEO_ID.test(t)) return t;
    let u;
    try { u = new URL(t); } catch { return ''; }
    const host = u.hostname.toLowerCase();
    if (!/^https?:$/.test(u.protocol) || !YT_HOSTS.includes(host)) return '';
    let cand = '';
    if (host.endsWith('youtu.be')) cand = u.pathname.split('/').filter(Boolean)[0] || '';
    else if (u.pathname.replace(/\/+$/, '') === '/watch') cand = u.searchParams.get('v') || '';
    else { const parts = u.pathname.split('/').filter(Boolean); if (parts.length >= 2 && ['shorts', 'embed', 'live', 'v'].includes(parts[0])) cand = parts[1]; }
    return VIDEO_ID.test(cand) ? cand : '';
  }
  const compactNum = n => { for (const [lim, s] of [[1e9, 'B'], [1e6, 'M'], [1e3, 'K']]) if (n >= lim) { const v = n / lim; return (v >= 100 ? String(Math.round(v)) : v.toFixed(1).replace(/\.0$/, '')) + s; } return String(n); };
  const oneLine = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const digits = s => { const t = String(s == null ? '' : s).replace(/[\s,._]/g, ''); return /^\d+$/.test(t) ? Number(t) : NaN; };
  const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

  function startValues(c) {
    const pv = c.popularVideo || {};
    const hasVideo = !!(pv.url || pv.videoId);
    return {
      name: c.name || '', handle: c.handle || '', channelId: c.channelId || '',
      avatar: c.avatar && IMG_LINK.test(c.avatar) && !AUTO_AVATAR.test(c.avatar) ? c.avatar : '',   // the automatic picture is shown as "empty"
      banner: c.banner || '',
      video: hasVideo ? (pv.url || `https://www.youtube.com/watch?v=${pv.videoId}`) : '', vtitle: hasVideo ? (pv.title || '') : '', vviews: hasVideo ? (pv.views || '') : '',
      bio: c.bio || '', country: c.country || '',
      categories: (c.categories && c.categories.length ? c.categories : [c.niche]).filter(Boolean),
      subsText: c.subscribers || '', subs: String(c.rawSubs ?? ''), viewsText: c.totalViews || '', views: String(c.rawViews ?? ''),
      videoCount: String(c.videoCount ?? ''), year: String(c.joinedYear || '')
    };
  }
  const blankValues = () => ({ name: '', handle: '', channelId: '', avatar: '', banner: '', video: '', vtitle: '', vviews: '', bio: '', country: '', categories: [], subsText: '', subs: '', viewsText: '', views: '', videoCount: '', year: '' });

  /* ---------- turning the typed values into an API request ---------- */
  function buildEdit(init, now) {
    const body = {}, errs = [];
    const bad = m => errs.push(m);
    if (now.name !== init.name) { if (!now.name) bad('The name cannot be empty.'); else body.name = now.name; }
    if (now.handle !== init.handle) { if (!/^@?[\w.\-]{2,50}$/.test(now.handle)) bad('The handle should look like @name (letters, numbers, dots, dashes, underscores).'); else body.handle = now.handle; }
    if (now.channelId !== init.channelId) { if (now.channelId && !CHANNEL_ID.test(now.channelId)) bad('The channel ID starts with UC and has 24 characters (or leave it empty).'); else body.channelId = now.channelId; }
    if (!sameList(now.categories, init.categories)) { if (!now.categories.length) bad('Pick at least one category.'); else body.categories = now.categories; }
    for (const [key, label] of [['country', 'Country'], ['bio', 'Bio']]) {
      if (now[key] !== init[key]) { if (!now[key]) bad(`${label} cannot be empty - type something or put the old text back.`); else body[key] = now[key]; }
    }
    for (const [key, field, label] of [['subs', 'rawSubs', 'Subscribers (exact number)'], ['views', 'rawViews', 'Total views (exact number)'], ['videoCount', 'videoCount', 'Number of videos'], ['year', 'joinedYear', 'Joined year']]) {
      if (now[key] !== init[key]) {
        const n = digits(now[key]);
        if (Number.isNaN(n)) bad(`${label} must be a whole number, like 1250000.`);
        else if (field === 'joinedYear' && (n < 2005 || n > 2026)) bad('Joined year must be between 2005 and 2026.');
        else body[field] = n;
      }
    }
    if (now.subsText !== init.subsText && now.subsText) body.subscribers = now.subsText;
    if (now.viewsText !== init.viewsText && now.viewsText) body.totalViews = now.viewsText;
    for (const [key, label] of [['avatar', 'The profile picture link'], ['banner', 'The banner link']]) {
      if (now[key] !== init[key]) { if (now[key] && !IMG_LINK.test(now[key])) bad(`${label} must be a full address that starts with https:// (no spaces).`); else body[key] = now[key]; }
    }
    const oldId = videoIdFrom(init.video), newId = videoIdFrom(now.video);
    if (now.video && !newId) bad('That is not a YouTube video link. Open the video and copy the address from the browser bar.');
    else if (now.video !== init.video && newId !== oldId) {
      body.popularVideoUrl = now.video;
      if (now.video && now.vtitle) body.popularVideoTitle = now.vtitle;
      if (now.video && now.vviews) body.popularVideoViews = now.vviews;
    } else if (now.video) {
      if (now.vtitle !== init.vtitle && now.vtitle) body.popularVideoTitle = now.vtitle;
      if (now.vviews !== init.vviews) body.popularVideoViews = now.vviews;
    } else if ((now.vtitle || now.vviews) && !init.video) bad('Add the video link first, then its title and views.');
    return { body, errs };
  }

  function buildNew(now) {
    const errs = [], bad = m => errs.push(m);
    if (!now.name) bad('Type the YouTuber\'s name.');
    if (!/^@?[\w.\-]{2,50}$/.test(now.handle)) bad('The handle should look like @name (letters, numbers, dots, dashes, underscores).');
    if (!now.categories.length) bad('Pick at least one category.');
    if (!now.country) bad('Type the country (or "Unknown").');
    const subs = digits(now.subs), views = now.views === '' ? 0 : digits(now.views), vc = now.videoCount === '' ? 0 : digits(now.videoCount), year = digits(now.year);
    if (Number.isNaN(subs)) bad('Subscribers (exact number) must be a whole number, like 1250000.');
    if (Number.isNaN(views)) bad('Total views must be a whole number (or leave it empty).');
    if (Number.isNaN(vc)) bad('Number of videos must be a whole number (or leave it empty).');
    if (Number.isNaN(year) || year < 2005 || year > 2026) bad('Joined year must be between 2005 and 2026.');
    if (now.channelId && !CHANNEL_ID.test(now.channelId)) bad('The channel ID starts with UC and has 24 characters (or leave it empty).');
    for (const [key, label] of [['avatar', 'The profile picture link'], ['banner', 'The banner link']]) if (now[key] && !IMG_LINK.test(now[key])) bad(`${label} must be a full address that starts with https:// (no spaces).`);
    const vid = videoIdFrom(now.video);
    if (now.video && !vid) bad('That is not a YouTube video link. Open the video and copy the address from the browser bar.');
    if (errs.length) return { errs };
    const handle = now.handle.startsWith('@') ? now.handle : '@' + now.handle;
    const body = {
      name: now.name, handle, niche: now.categories[0], categories: now.categories, country: now.country,
      subscribers: now.subsText || compactNum(subs), rawSubs: subs, totalViews: now.viewsText || compactNum(views), rawViews: views,
      videoCount: vc, bio: now.bio || 'No description yet.', joinedYear: year, channelId: now.channelId, avatar: now.avatar, banner: now.banner
    };
    if (vid) Object.assign(body, {
      popularVideoId: vid, popularVideoStatus: 'verified', popularVideoTitle: now.vtitle || 'Most viewed video', popularVideoViews: now.vviews,
      popularVideoThumb: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`, popularVideoUrl: `https://www.youtube.com/watch?v=${vid}`
    });
    return { body, errs };
  }

  /* ---------- the tab ---------- */
  async function mount(ctx) {
    ctx.loading();
    let list;
    try {
      const d = await ctx.call('/portal/creators');
      list = (d.creators || []).filter(c => c.access !== 'locked').sort((a, b) => (b.rawSubs - a.rawSubs) || String(a.id).localeCompare(String(b.id)));
    } catch (err) { if (ctx.current()) ctx.errorBox(err, ctx.reload); return; }
    if (!ctx.current()) return;                            // the admin moved to another tab while this was loading
    const panel = ctx.panel;
    const st = { list, norm: new Map(), sel: null, isNew: false, filter: 'all', q: '', init: null, armed: null, busy: false, cats: [] };
    const hasVideo = c => !!(c.popularVideo && (c.popularVideo.url || c.popularVideo.videoId));
    const edited = c => (c.editedFields || []).length > 0;
    const FILTERS = [
      ['all', 'All', () => true],
      ['nobanner', 'No banner', c => !c.banner],
      ['novideo', 'No top video', c => !hasVideo(c)],
      ['edited', 'Edited by you', edited]
    ];
    const normOf = c => { let n = st.norm.get(c.id); if (!n) { n = YT.normalize(c); st.norm.set(c.id, n); } return n; };
    const find = id => st.list.find(c => c.id === id);

    panel.innerHTML = `<div class="ed">
      <aside class="ed-side" aria-label="YouTubers">
        <div class="a-toolbar"><label class="sr-only" for="edSearch">Search YouTubers</label><input id="edSearch" type="search" placeholder="Search a YouTuber..." autocomplete="off"></div>
        <div class="ed-filters" id="edFilters" role="group" aria-label="Show"></div>
        <button type="button" class="yt-btn yt-btn-primary yt-btn-sm ed-new" id="edNew">+ Add a new YouTuber</button>
        <ul class="ed-items" id="edItems"></ul>
        <p class="a-count" id="edCount" aria-live="polite"></p>
      </aside>
      <section class="ed-pane" id="edPane" aria-label="Editor"></section>
    </div>`;
    const root = $('.ed', panel), pane = $('#edPane', panel), itemsEl = $('#edItems', panel), countEl = $('#edCount', panel), filtersEl = $('#edFilters', panel);

    /* ----- left: list ----- */
    function renderFilters() {
      filtersEl.innerHTML = FILTERS.map(([id, label, fn]) => `<button type="button" class="yt-chip" data-filter="${id}" aria-pressed="${st.filter === id}">${label} <small>${st.list.filter(fn).length}</small></button>`).join('');
    }
    function renderList() {
      const fn = FILTERS.find(f => f[0] === st.filter)[2], q = st.q.trim().toLowerCase();
      const rows = st.list.filter(c => fn(c) && (!q || c.name.toLowerCase().includes(q) || String(c.handle).toLowerCase().includes(q)));
      itemsEl.innerHTML = rows.map(c => {
        const n = normOf(c);
        return `<li><button type="button" class="ed-item" data-id="${esc(c.id)}"${c.id === st.sel && !st.isNew ? ' aria-current="true"' : ''}>
          ${YT.avatarImg(n, 'ed-item-av', 36)}
          <span class="ed-item-text"><strong>${esc(c.name)}</strong><small>${esc(c.handle)}</small></span>
          <span class="ed-item-badges">${c.banner ? '' : '<span class="a-badge warn" title="No banner yet">no banner</span>'}${hasVideo(c) ? '' : '<span class="a-badge warn" title="No top video yet">no video</span>'}${edited(c) ? '<span class="a-badge ok" title="Typed in by an admin">edited</span>' : ''}</span>
        </button></li>`;
      }).join('') || '<li class="ed-none">No YouTuber matches.</li>';
      countEl.textContent = `${rows.length} of ${st.list.length} shown`;
    }

    /* ----- right: form ----- */
    const field = (id, label, value, extra = {}) => `<label for="${id}">${label}${extra.hint ? `<small>${extra.hint}</small>` : ''}
        <input id="${id}" type="${extra.type || 'text'}" value="${esc(value)}"${extra.ph ? ` placeholder="${esc(extra.ph)}"` : ''}${extra.mode ? ` inputmode="${extra.mode}"` : ''}${extra.max ? ` maxlength="${extra.max}"` : ''} autocomplete="off" spellcheck="false"></label>`;

    function formHtml(v, c) {
      const isNew = !c;
      const editedLine = c && edited(c) ? `<span class="a-badge ok">typed in by an admin: ${esc(c.editedFields.map(g => WORDS[g] || g).join(', '))}</span>` : '';
      return `<form class="a-form ed-form" id="edForm" novalidate>
        <div class="ed-head">
          <span id="edHeadAv">${c ? YT.avatarImg(normOf(c), 'ed-head-av', 56) : '<span class="ed-head-plus" aria-hidden="true">+</span>'}</span>
          <div><h2>${isNew ? 'Add a new YouTuber' : esc(c.name)}</h2><p>${isNew ? 'Fill in the boxes marked with *. Everything else is optional.' : `${esc(c.handle)} &middot; ${esc(c.subscribers)} subscribers`} ${editedLine}</p></div>
        </div>

        <section class="ed-sec"><h3>Pictures</h3>
          <div class="ed-pics">
            <div class="ed-pic">
              ${field('edAvatar', 'Profile picture link', v.avatar, { ph: 'https://... (empty = automatic picture)', hint: 'The round picture' })}
              <div class="ed-prevrow"><span id="edAvPrev" class="ed-prev-av"></span><p class="a-note" id="edAvNote"></p></div>
            </div>
            <div class="ed-pic">
              ${field('edBanner', 'Banner link', v.banner, { ph: 'https://... (empty = colourful design)', hint: 'The wide picture at the top of the channel' })}
              <div id="edBnPrev" class="yt-banner ed-prev-banner" role="img" aria-label="Banner preview"></div><p class="a-note" id="edBnNote"></p>
            </div>
          </div>
          <details class="ed-help"><summary>How do I get these links?</summary>
            <ol><li>Open the YouTuber's channel on YouTube in another tab.</li>
            <li>Right-click the round picture (or the wide banner) and choose <strong>Copy image address</strong>.</li>
            <li>Paste it here. It must start with <code>https://</code>.</li></ol>
            <p class="a-note">Leave a box empty to use the automatic picture / the coloured design. Pictures that load here will load for everyone.</p></details>
        </section>

        <section class="ed-sec"><h3>Most-viewed video</h3>
          <div class="ed-video">
            <div class="ed-vcol">
              ${field('edVideo', 'Video link', v.video, { ph: 'https://www.youtube.com/watch?v=...', hint: 'Any YouTube video address works' })}
              <div class="a-grid"><div>${field('edVTitle', 'Video title', v.vtitle, { max: 200 })}</div><div>${field('edVViews', 'Views shown', v.vviews, { ph: 'e.g. 329M views', max: 40 })}</div></div>
              <p class="a-note" id="edVNote"></p>
              ${c && v.video ? '<button type="button" class="yt-btn yt-btn-ghost yt-btn-sm danger" id="edVRemove">Remove this video</button>' : ''}
            </div>
            <div class="ed-vprev" id="edVPrev" aria-label="Video preview"></div>
          </div>
          <details class="ed-help"><summary>Where do I find the most-viewed video?</summary>
            <ol><li>Open the channel on YouTube and go to the <strong>Videos</strong> tab.</li><li>Press <strong>Popular</strong> - the first video is the most viewed.</li>
            <li>Open it and copy the address from the browser bar, then paste it here and type its title and views.</li></ol></details>
        </section>

        <section class="ed-sec"><h3>About</h3>
          <div class="a-grid">
            <label class="span2" for="edBio">Bio <small>One or two sentences</small><textarea id="edBio" maxlength="1000" rows="3">${esc(v.bio)}</textarea></label>
            <div>${field('edCountry', 'Country' + (isNew ? ' *' : ''), v.country, { max: 50, ph: 'e.g. United States' })}</div>
          </div>
          <div class="ed-cats"><span class="ed-cats-label" id="edCatsLabel">Categories${isNew ? ' *' : ''} <small>up to 4</small></span>
            <div class="ed-chips" role="group" aria-labelledby="edCatsLabel">${YT.CATEGORIES.map(k => `<button type="button" class="yt-chip" data-cat="${esc(k)}" aria-pressed="${v.categories.includes(k)}">${esc(k)}</button>`).join('')}</div>
            <label class="ed-main" for="edMain">Main category <select id="edMain"></select></label>
          </div>
        </section>

        <details class="ed-sec ed-more"${isNew ? ' open' : ''}><summary><h3>Numbers &amp; identity</h3></summary>
          <div class="a-grid">
            <div>${field('edName', 'Name' + (isNew ? ' *' : ''), v.name, { max: 100 })}</div><div>${field('edHandle', 'Handle' + (isNew ? ' *' : ''), v.handle, { ph: '@name', max: 50 })}</div>
            <div class="span2">${field('edChannel', 'Channel ID', v.channelId, { ph: 'UC... (24 characters, optional)', hint: 'Makes the channel link always correct' })}</div>
            <div>${field('edSubs', 'Subscribers (exact number)' + (isNew ? ' *' : ''), v.subs, { mode: 'numeric', ph: 'e.g. 1250000' })}</div><div>${field('edSubsText', 'Subscribers shown', v.subsText, { ph: 'e.g. 1.3M - empty = worked out for you', max: 20 })}</div>
            <div>${field('edViews', 'Total views (exact number)', v.views, { mode: 'numeric' })}</div><div>${field('edViewsText', 'Total views shown', v.viewsText, { ph: 'e.g. 2.4B - empty = worked out for you', max: 20 })}</div>
            <div>${field('edVidCount', 'Number of videos', v.videoCount, { mode: 'numeric' })}</div><div>${field('edYear', 'Joined year' + (isNew ? ' *' : ''), v.year, { mode: 'numeric', ph: 'e.g. 2012' })}</div>
          </div>
        </details>

        <div class="ed-bar">
          <p class="ed-status" id="edStatus" role="status" aria-live="polite"></p>
          <div class="ed-bar-btns">
            ${isNew ? '<button type="button" class="yt-btn yt-btn-ghost" id="edCancel">Cancel</button>' : '<button type="button" class="yt-btn yt-btn-ghost" id="edUndo">Undo changes</button>'}
            <button type="submit" class="yt-btn yt-btn-primary" id="edSave">${isNew ? 'Add YouTuber' : 'Save changes'}</button>
          </div>
        </div>
      </form>`;
    }

    function placeholder() {
      const nb = st.list.filter(c => !c.banner).length, nv = st.list.filter(c => !hasVideo(c)).length;
      pane.innerHTML = `<div class="ed-empty"><div class="ed-empty-icon" aria-hidden="true">&#9998;</div><h2>Pick a YouTuber to edit</h2>
        <p>Choose a name on the left to type in its <strong>profile picture</strong>, <strong>banner</strong>, <strong>most-viewed video</strong>, bio, categories and numbers - or add someone new.</p>
        <p class="a-note">${nb} YouTuber${nb === 1 ? ' has' : 's have'} no banner yet and ${nv} ${nv === 1 ? 'has' : 'have'} no top video. Use the filters above the list to jump to them.</p></div>`;
    }

    /* ----- reading and previewing the form ----- */
    const val = id => { const el = $('#' + id, pane); return el ? el.value : ''; };
    function readNow() {
      return {
        name: oneLine(val('edName')), handle: oneLine(val('edHandle')), channelId: oneLine(val('edChannel')),
        avatar: val('edAvatar').trim(), banner: val('edBanner').trim(),
        video: val('edVideo').trim(), vtitle: oneLine(val('edVTitle')), vviews: oneLine(val('edVViews')),
        bio: oneLine(val('edBio')), country: oneLine(val('edCountry')),
        categories: st.cats.slice(),
        subsText: oneLine(val('edSubsText')), subs: oneLine(val('edSubs')), viewsText: oneLine(val('edViewsText')), views: oneLine(val('edViews')),
        videoCount: oneLine(val('edVidCount')), year: oneLine(val('edYear'))
      };
    }
    const sameVideo = (a, b) => { const x = videoIdFrom(a), y = videoIdFrom(b); return x || y ? x === y : a === b; };
    const dirty = () => { const now = readNow(), init = st.init; return Object.keys(init).some(k => (k === 'categories' ? !sameList(now[k], init[k]) : k === 'video' ? !sameVideo(now.video, init.video) : now[k] !== init[k])); };

    function setStatus(msg, kind) {
      const el = $('#edStatus', pane); if (!el) return;
      el.textContent = msg || ''; el.dataset.kind = kind || '';
    }
    function probe(url, done) {                          // does this picture actually load?
      const img = new Image(); img.referrerPolicy = 'no-referrer';
      img.onload = () => done(true); img.onerror = () => done(false); img.src = url;
    }
    let previewTimer = 0, probeToken = 0;
    function previews() {
      clearTimeout(previewTimer);
      if (!$('#edAvPrev', pane)) return;                 // the form was closed in the meantime
      const now = readNow(), base = st.sel && !st.isNew ? find(st.sel) : null;
      const raw = { ...(base || {}), name: now.name || (base && base.name) || 'New YouTuber', handle: now.handle || (base && base.handle) || '', banner: IMG_LINK.test(now.banner) ? now.banner : '', avatar: IMG_LINK.test(now.avatar) ? now.avatar : '' };
      const n = YT.normalize(raw) || YT.normalize({ ...raw, name: 'New YouTuber', handle: '@new' });
      $('#edAvPrev', pane).innerHTML = YT.avatarImg(n, 'ed-prev-avimg', 72);
      const bn = $('#edBnPrev', pane); bn.setAttribute('style', YT.bannerVars(n));
      const token = ++probeToken, avNote = $('#edAvNote', pane), bnNote = $('#edBnNote', pane), vNote = $('#edVNote', pane);
      const noteFor = (el, typed, auto) => {
        if (!typed) { el.textContent = auto; el.dataset.kind = ''; return false; }
        if (!IMG_LINK.test(typed)) { el.textContent = 'Not a valid link yet - it must start with https:// and have no spaces.'; el.dataset.kind = 'bad'; return false; }
        el.textContent = 'Checking the picture...'; el.dataset.kind = ''; return true;
      };
      if (noteFor(avNote, now.avatar, 'Automatic picture (or the first letters of the name).')) probe(now.avatar, ok => { if (token === probeToken) { avNote.textContent = ok ? 'Picture loads - looks good.' : 'This picture does not load. Check the link (or try copying the image address again).'; avNote.dataset.kind = ok ? 'ok' : 'bad'; } });
      if (noteFor(bnNote, now.banner, 'No banner - the colourful design is shown.')) probe(now.banner, ok => { if (token === probeToken) { bnNote.textContent = ok ? 'Banner loads - looks good.' : 'This banner does not load. Check the link (or try copying the image address again).'; bnNote.dataset.kind = ok ? 'ok' : 'bad'; } });
      const vid = videoIdFrom(now.video), vp = $('#edVPrev', pane);
      if (!now.video) { vp.innerHTML = '<div class="ed-vempty">No video yet</div>'; vNote.textContent = 'No top video yet - members see a link to the channel\'s most-popular list instead.'; vNote.dataset.kind = ''; }
      else if (!vid) { vp.innerHTML = '<div class="ed-vempty">?</div>'; vNote.textContent = 'That is not a YouTube video link. Open the video and copy the address from the browser bar.'; vNote.dataset.kind = 'bad'; }
      else {
        vp.innerHTML = `<img src="https://i.ytimg.com/vi/${vid}/hqdefault.jpg" alt="" referrerpolicy="no-referrer" loading="lazy"><div class="ed-vcap"><strong>${esc(now.vtitle || 'Most viewed video')}</strong><small>${esc(now.vviews || 'views not typed yet')}</small></div>`;
        vNote.textContent = `Video found (${vid}). Type its title and views below so they show on the card.`; vNote.dataset.kind = 'ok';
      }
    }
    const schedulePreview = () => { clearTimeout(previewTimer); previewTimer = setTimeout(previews, 250); };

    function syncCats() {
      $$('[data-cat]', pane).forEach(b => { const on = st.cats.includes(b.dataset.cat); b.setAttribute('aria-pressed', on); b.disabled = !on && st.cats.length >= 4; });
      const sel = $('#edMain', pane);
      sel.innerHTML = st.cats.map(k => `<option value="${esc(k)}">${esc(k)}</option>`).join('') || '<option value="">Pick a category first</option>';
      sel.disabled = st.cats.length < 2; if (st.cats.length) sel.value = st.cats[0];
    }

    /* ----- opening / closing the editor ----- */
    function open(id, isNew) {
      st.isNew = !!isNew; st.sel = isNew ? null : id; st.armed = null;
      const c = isNew ? null : find(id);
      st.init = c ? startValues(c) : blankValues();
      st.cats = st.init.categories.slice();
      pane.innerHTML = formHtml(st.init, c);
      syncCats(); previews(); renderList();
      if (window.matchMedia('(max-width: 900px)').matches) pane.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function requestOpen(id, isNew) {
      const key = isNew ? 'new' : id;
      const editing = st.isNew || st.sel;
      if (editing && dirty() && st.armed !== key) {
        st.armed = key; setStatus('You have changes that are not saved. Press Save - or click the same name again to throw them away.', 'warn'); return;
      }
      open(id, isNew);
    }

    async function save(ev) {
      ev.preventDefault();
      if (st.busy) return;
      const now = readNow(), btn = $('#edSave', pane), wasNew = st.isNew;
      const { body, errs } = st.isNew ? buildNew(now) : buildEdit(st.init, now);
      if (errs.length) return setStatus(errs[0], 'bad');
      if (!st.isNew && !Object.keys(body).length) return setStatus('Nothing has changed yet - change a box first.', 'warn');
      st.busy = true; btn.disabled = true; btn.textContent = 'Saving...'; setStatus('', '');
      try {
        const res = st.isNew ? await ctx.call('/creators', { method: 'POST', body }) : await ctx.call('/admin/creators/' + st.sel.replace(/^yt/, ''), { method: 'PUT', body });
        const c = res.creator; if (!c) throw new Error('The server did not send the saved YouTuber back. Reload the page to check.');
        const i = st.list.findIndex(x => x.id === c.id);
        if (i >= 0) st.list[i] = c; else st.list.unshift(c);
        st.norm.delete(c.id);
        ctx.flash(wasNew ? 'YouTuber added' : 'Saved');
        renderFilters(); open(c.id, false);
        setStatus(wasNew ? 'Added. You can keep editing it here.' : 'Saved. This is now remembered - automatic updates will not overwrite it.', 'ok');
      } catch (err) {
        if (err && err.status === 401) return ctx.errorBox(err, ctx.reload);
        setStatus(ctx.fail(err), 'bad'); btn.disabled = false; btn.textContent = st.isNew ? 'Add YouTuber' : 'Save changes';
      } finally { st.busy = false; }
    }

    /* ----- events ----- */
    root.addEventListener('click', e => {
      const item = e.target.closest('.ed-item'); if (item) return requestOpen(item.dataset.id, false);
      const f = e.target.closest('[data-filter]'); if (f) { st.filter = f.dataset.filter; renderFilters(); return renderList(); }
      if (e.target.closest('#edNew')) return requestOpen(null, true);
      if (e.target.closest('#edCancel')) { st.sel = null; st.isNew = false; st.init = null; placeholder(); return renderList(); }
      if (e.target.closest('#edUndo')) { open(st.sel, false); return setStatus('Changes undone.', ''); }
      if (e.target.closest('#edVRemove')) { $('#edVideo', pane).value = ''; $('#edVTitle', pane).value = ''; $('#edVViews', pane).value = ''; previews(); return setStatus('The video will be removed when you press Save.', 'warn'); }
      const cat = e.target.closest('[data-cat]');
      if (cat) {
        const k = cat.dataset.cat, i = st.cats.indexOf(k);
        if (i >= 0) st.cats.splice(i, 1); else if (st.cats.length < 4) st.cats.push(k);
        syncCats(); setStatus('', '');
      }
    });
    root.addEventListener('input', e => {
      if (e.target.id === 'edSearch') { st.q = e.target.value; return renderList(); }
      if (e.target.closest('#edForm')) { st.armed = null; schedulePreview(); }
    });
    root.addEventListener('change', e => {
      if (e.target.id === 'edMain') { const k = e.target.value; st.cats = [k, ...st.cats.filter(x => x !== k)]; syncCats(); return; }
      if (e.target.id === 'edVideo') {                    // a different video: its old title / views no longer apply
        const now = videoIdFrom(e.target.value), was = videoIdFrom(st.init.video);
        if (now && now !== was && val('edVTitle') === st.init.vtitle) { $('#edVTitle', pane).value = ''; $('#edVViews', pane).value = ''; previews(); }
      }
    });
    root.addEventListener('submit', e => { if (e.target.id === 'edForm') save(e); });

    /* ----- start ----- */
    renderFilters(); renderList(); placeholder();
  }

  window.AdminEditor = { mount, videoIdFrom };
})();
