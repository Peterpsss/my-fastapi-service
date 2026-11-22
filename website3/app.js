/* YouTuber Taste Matcher - 6 simple questions -> explainable score -> YouTubers picked for you.
   Uses the shared client in yt-core.js (window.YT) for data, shell and helpers. */
(function () {
  'use strict';
  const Y = window.YT;
  const { $, $$, esc, store } = Y;
  const calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STORE_KEY = 'matcher';
  const PAGE = 6, LIMIT = 11, MAX_FAVS = 5;

  /* ---------------- the choices (plain words, no jargon) ---------------- */
  const INTERESTS = [
    { id: 'gaming',     emoji: '🎮', label: 'Gaming',               cat: 'Gaming' },
    { id: 'music',      emoji: '🎵', label: 'Music',                cat: 'Music' },
    { id: 'comedy',     emoji: '😂', label: 'Comedy & skits',       cat: 'Comedy' },
    { id: 'science',    emoji: '🧪', label: 'Science & learning',   cat: 'Education' },
    { id: 'tech',       emoji: '📱', label: 'Tech & gadgets',       cat: 'Tech & Gadgets' },
    { id: 'food',       emoji: '🍳', label: 'Food & cooking',       cat: 'Food' },
    { id: 'vlogs',      emoji: '🎥', label: 'Vlogs & lifestyle',    cat: 'Lifestyle & Vlog' },
    { id: 'challenges', emoji: '🏆', label: 'Challenges & stunts',  cat: 'Challenges & Stunts' },
    { id: 'sports',     emoji: '⚽', label: 'Sports & fitness',     cat: 'Sports & Fitness' },
    { id: 'beauty',     emoji: '💄', label: 'Beauty & fashion',     cat: 'Beauty & Fashion' },
    { id: 'stories',    emoji: '🕵️', label: 'Stories & mysteries',  cat: 'Stories & Mystery' },
    { id: 'family',     emoji: '👨‍👩‍👧', label: 'Family & kids',        cat: 'Family' },
    { id: 'news',       emoji: '📰', label: 'News & commentary',    cat: 'News & Commentary' },
    { id: 'shows',      emoji: '🎬', label: 'Shows & entertainment', cat: 'Entertainment' }
  ];
  const INTEREST_BY_ID = Object.fromEntries(INTERESTS.map(i => [i.id, i]));

  const MOODS = [
    { id: 'laugh',   emoji: '😆', label: 'Make me laugh',        cats: ['Comedy', 'Entertainment', 'Challenges & Stunts'] },
    { id: 'learn',   emoji: '🧠', label: 'Teach me something',   cats: ['Education', 'Tech & Gadgets', 'News & Commentary', 'Stories & Mystery'] },
    { id: 'chill',   emoji: '😌', label: 'Help me relax',        cats: ['Music', 'Lifestyle & Vlog', 'Food', 'Family'] },
    { id: 'hype',    emoji: '🔥', label: 'Get me hyped',         cats: ['Gaming', 'Challenges & Stunts', 'Sports & Fitness'] },
    { id: 'inspire', emoji: '✨', label: 'Inspire me',           cats: ['Lifestyle & Vlog', 'Beauty & Fashion', 'Education'] }
  ];
  const MOOD_BY_ID = Object.fromEntries(MOODS.map(m => [m.id, m]));

  const FAME = [
    { value: 'any',    label: 'No preference' },
    { value: 'famous', label: 'Famous channels',  small: 'The biggest names on YouTube' },
    { value: 'gems',   label: 'Hidden gems',      small: 'Smaller channels worth finding' }];
  const ERA = [
    { value: 'any',     label: 'Either is fine' },
    { value: 'classic', label: 'Classic favourites', small: 'On YouTube since the early days' },
    { value: 'new',     label: 'Fresh faces',        small: 'Newer channels' }];
  const BINGE = [
    { value: 'any',   label: "Doesn't matter" },
    { value: 'big',   label: 'Lots to binge',   small: 'A huge library of videos' },
    { value: 'small', label: 'Short and sweet', small: 'A smaller library' }];
  const LABELS = { fame: Object.fromEntries(FAME.map(o => [o.value, o.label])), era: Object.fromEntries(ERA.map(o => [o.value, o.label])), binge: Object.fromEntries(BINGE.map(o => [o.value, o.label])) };

  const S = { creators: [], q: 0, answers: null, matches: [], shown: PAGE, mode: 'main', shared: false, timer: 0,
              subRank: new Map(), subPct: new Map(), vidPct: new Map(), counts: new Map() };
  const screens = {};

  const defaults = () => ({ interests: [], moods: [], fame: 'any', era: 'any', binge: 'any', favs: [] });
  const show = (el, on) => el.classList.toggle('hidden', !on);
  const listText = arr => arr.length <= 1 ? (arr[0] || '') : arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1];

  function showScreen(name, focusSel) {
    Object.entries(screens).forEach(([k, el]) => el.classList.toggle('active', k === name));
    window.scrollTo(0, 0);
    const f = $(focusSel || ({ landing: '#landingTitle', quiz: '#questionTitle', analysis: '#analysisTitle', results: '#resultsTitle' }[name] || 'main'));
    if (f) f.focus({ preventScroll: true });
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); Y.toast('Copied to clipboard'); return true; } catch { /* fallback */ }
    try {
      const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0'; document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy'); ta.remove(); Y.toast(ok ? 'Copied to clipboard' : 'Could not copy'); return ok;
    } catch { Y.toast('Could not copy'); return false; }
  }

  /* ---------------- data helpers ---------------- */
  const availableInterests = () => INTERESTS.filter(i => S.counts.get(i.cat));
  const byKey = key => S.creators.find(c => c.key === key);

  function prepare() {
    const N = S.creators.length;
    S.counts = new Map();
    S.creators.forEach(c => c.categories.forEach(cat => S.counts.set(cat, (S.counts.get(cat) || 0) + 1)));
    const bySubs = S.creators.slice().sort((a, b) => b.rawSubs - a.rawSubs);
    bySubs.forEach((c, i) => { S.subRank.set(c.key, i + 1); S.subPct.set(c.key, N > 1 ? 1 - i / (N - 1) : 1); });
    const vids = S.creators.map(c => c.videoCount).sort((a, b) => a - b);
    S.creators.forEach(c => { S.vidPct.set(c.key, vids.filter(v => v <= c.videoCount).length / N); });
  }

  /* ---------------- questions ---------------- */
  const QUESTIONS = [
    { key: 'interests', type: 'multi', required: true, eyebrow: 'Your interests', title: 'What do you like to watch?',
      help: 'Pick as many as you like - the more you pick, the more variety you get.',
      options: () => availableInterests().map(i => ({ value: i.id, emoji: i.emoji, label: i.label, small: `${S.counts.get(i.cat)} channels` })) },
    { key: 'moods', type: 'multi', eyebrow: 'Your mood', title: 'What are you in the mood for?',
      help: 'Optional. Pick any that sound right, or skip.',
      options: () => MOODS.map(m => ({ value: m.id, emoji: m.emoji, label: m.label })) },
    { key: 'fame', type: 'single', eyebrow: 'Your taste', title: 'Big stars or hidden gems?',
      help: 'Compared with the other channels in this collection.', options: () => FAME },
    { key: 'era', type: 'single', eyebrow: 'Your taste', title: 'Old favourites or fresh faces?',
      help: 'Based on the year each channel joined YouTube.', options: () => ERA },
    { key: 'binge', type: 'single', eyebrow: 'Your taste', title: 'How much do you want to binge?',
      help: 'Based on how many videos each channel has.', options: () => BINGE },
    { key: 'favs', type: 'multi', fav: true, eyebrow: 'Your favourites', title: 'Any YouTubers you already love?',
      help: `Optional. Pick up to ${MAX_FAVS} - we will find similar ones and leave these out.`,
      options: () => S.creators.slice().sort((a, b) => b.rawSubs - a.rawSubs).slice(0, 16).map(c => ({ value: c.key, label: c.name, creator: c })) }
  ];

  function renderQuestion(focus) {
    const q = QUESTIONS[S.q], a = S.answers;
    $('#questionCounter').textContent = `Question ${S.q + 1} of ${QUESTIONS.length}`;
    $('#quizProgress').style.width = `${((S.q + 1) / QUESTIONS.length) * 100}%`;
    const track = $('#quizTrack'); track.setAttribute('aria-valuemax', QUESTIONS.length); track.setAttribute('aria-valuenow', S.q + 1);
    $('#questionEyebrow').textContent = q.eyebrow;
    $('#questionTitle').textContent = q.title;
    $('#questionHelp').textContent = q.help || '';
    $('#backButton').disabled = S.q === 0;

    const grid = $('#optionsGrid'), single = q.type === 'single';
    grid.className = 'options-grid' + (single ? ' single' : '') + (q.fav ? ' faves' : '');
    grid.setAttribute('role', single ? 'radiogroup' : 'group');
    grid.setAttribute('aria-labelledby', 'questionTitle');
    const cur = a[q.key];
    grid.innerHTML = q.options().map((o, i) => {
      const on = single ? cur === o.value : cur.includes(o.value);
      const body = q.fav
        ? `${Y.avatarImg(o.creator, 'yt-avatar', 56)}<span class="opt-label">${esc(o.label)}</span>`
        : `${o.emoji ? `<span class="opt-emoji" aria-hidden="true">${o.emoji}</span>` : ''}<span class="opt-label">${esc(o.label)}${o.small ? `<small>${esc(o.small)}</small>` : ''}</span>`;
      return `<button type="button" class="opt${q.fav ? ' fav' : ''}" role="${single ? 'radio' : 'checkbox'}" aria-checked="${on}" data-value="${esc(o.value)}" tabindex="${single ? (on ? 0 : -1) : 0}">${body}<span class="opt-check" aria-hidden="true">&#10003;</span></button>`;
    }).join('');
    updateContinue();
    if (focus) $('#questionTitle').focus({ preventScroll: true });
  }

  function syncOptions() {
    const q = QUESTIONS[S.q], cur = S.answers[q.key], single = q.type === 'single';
    $$('#optionsGrid .opt').forEach(b => {
      const on = single ? cur === b.dataset.value : cur.includes(b.dataset.value);
      b.setAttribute('aria-checked', String(on));
      if (single) b.tabIndex = on ? 0 : -1;
    });
    updateContinue();
  }

  function pick(value) {
    const q = QUESTIONS[S.q];
    if (q.type === 'single') S.answers[q.key] = value;
    else {
      const arr = S.answers[q.key], i = arr.indexOf(value);
      if (i >= 0) arr.splice(i, 1);
      else if (q.key === 'favs' && arr.length >= MAX_FAVS) { Y.toast(`Pick up to ${MAX_FAVS}`); return; }
      else arr.push(value);
    }
    syncOptions();
  }

  function updateContinue() {
    const q = QUESTIONS[S.q], v = S.answers[q.key], last = S.q === QUESTIONS.length - 1;
    const btn = $('#continueButton'), count = $('#pickCount');
    if (q.type === 'multi') {
      count.textContent = v.length ? `${v.length} picked` : (q.required ? 'Pick at least one to continue.' : '');
      btn.disabled = !!q.required && !v.length;
      btn.innerHTML = last ? (v.length ? 'See my matches &rarr;' : 'Skip and see matches &rarr;') : (v.length || q.required ? 'Continue &rarr;' : 'Skip &rarr;');
    } else {
      count.textContent = '';
      btn.disabled = false;
      btn.innerHTML = last ? 'See my matches &rarr;' : 'Continue &rarr;';
    }
  }

  function startQuiz(reset = true) {
    if (reset) { S.q = 0; S.answers = defaults(); }
    renderQuestion(false);
    showScreen('quiz');
  }

  /* ---------------- scoring (deterministic, explainable) ---------------- */
  // How strongly a creator's categories overlap a set of categories. Main category counts most.
  function catStats(c, set) {
    const matched = []; let mw = 0, tw = 0, best = 0;
    c.categories.forEach((cat, i) => {
      const w = i === 0 ? 1 : i === 1 ? .6 : .4; tw += w;
      if (set.has(cat)) { matched.push(cat); mw += w; best = Math.max(best, w); }
    });
    return { matched, best, precision: tw ? mw / tw : 0 };
  }
  function interestFit(c, set) {
    const s = catStats(c, set), n = s.matched.length;
    if (!n) return { fit: 0, matched: [] };
    const strength = Math.min(1, s.best + .2 * (n - 1));
    const coverage = Math.min(1, n / Math.min(set.size, 3));
    return { fit: .5 * strength + .2 * s.precision + .3 * coverage, matched: s.matched };
  }
  function moodFit(c, moods) {
    const set = new Set(moods.flatMap(id => MOOD_BY_ID[id].cats));
    const s = catStats(c, set);
    if (!s.matched.length) return { fit: 0, mood: null };
    // which chosen mood explains it best
    let bestMood = moods[0], bestN = -1;
    moods.forEach(id => { const n = c.categories.filter(x => MOOD_BY_ID[id].cats.includes(x)).length; if (n > bestN) { bestN = n; bestMood = id; } });
    return { fit: .7 * s.best + .3 * s.precision, mood: bestMood };
  }
  const fameFit = (c, v) => v === 'famous' ? S.subPct.get(c.key) : 1 - S.subPct.get(c.key);
  const eraFit = (c, v) => {
    const y = c.joinedYear; if (!y) return .5;
    return v === 'classic' ? (y <= 2012 ? 1 : Math.max(0, 1 - (y - 2012) / 6)) : (y >= 2015 ? 1 : Math.max(0, 1 - (2015 - y) / 6));
  };
  const bingeFit = (c, v) => v === 'big' ? S.vidPct.get(c.key) : 1 - S.vidPct.get(c.key);
  function favFit(c, favs) {
    let best = 0, who = null; const mine = new Set(c.categories);
    favs.forEach(k => {
      const f = byKey(k); if (!f) return;
      const theirs = new Set(f.categories);
      const inter = [...mine].filter(x => theirs.has(x)).length, uni = new Set([...mine, ...theirs]).size;
      const j = uni ? inter / uni : 0;
      if (j > best) { best = j; who = f; }
    });
    return { fit: best, who };
  }

  /* mode 'main': creators that fit the picked interests. mode 'surprise': creators outside them. */
  function scoreCreator(c, a, mode, interestSet) {
    const parts = [];
    const add = (key, w, fit, reason) => parts.push({ key, w, fit: Math.max(0, Math.min(1, fit)), reason });
    const ifit = interestFit(c, interestSet);

    if (mode === 'main') {
      const m = ifit.matched;
      add('interests', .5, ifit.fit, m.length >= 2 ? `Covers ${listText(m.slice(0, 3))}, which you picked`
        : m.length === 1 ? (c.categories[0] === m[0] ? `Mostly ${m[0]} - one of your picks` : `Also covers ${m[0]}, one of your picks`) : '');
    }
    if (a.favs.length) { const f = favFit(c, a.favs); add('favs', .1, f.fit, f.who && f.fit >= .5 ? `Similar to ${f.who.name}` : ''); }
    if (a.moods.length) {
      const mo = moodFit(c, a.moods);
      add('moods', .12, mo.fit, mo.mood && mo.fit >= .55 ? `Fits your "${MOOD_BY_ID[mo.mood].label.toLowerCase()}" mood` : '');
    }
    if (a.fame !== 'any') add('fame', .12, fameFit(c, a.fame), a.fame === 'famous'
      ? `One of the biggest channels (#${S.subRank.get(c.key)} by subscribers)` : `A smaller channel (${c.subscribers} subscribers) - a hidden gem`);
    else add('prior', .05, S.subPct.get(c.key), '');
    if (a.era !== 'any' && c.joinedYear) add('era', .08, eraFit(c, a.era), a.era === 'classic' ? `On YouTube since ${c.joinedYear}` : `A newer channel - joined in ${c.joinedYear}`);
    if (a.binge !== 'any') add('binge', .08, bingeFit(c, a.binge), a.binge === 'big'
      ? `Huge library - ${Y.fmt.int(c.videoCount)} videos to binge` : `Compact library - just ${Y.fmt.int(c.videoCount)} videos`);

    const W = parts.reduce((s, p) => s + p.w, 0) || 1;
    const score = parts.reduce((s, p) => s + p.w * p.fit, 0) / W;
    const reasons = parts.filter(p => p.reason && p.fit >= .65).map(p => p.reason);
    if (mode === 'surprise') reasons.unshift(`A different flavour: ${c.categories.slice(0, 2).join(' & ')}`);
    if (!reasons.length) reasons.push(`A popular ${c.niche} channel`);
    return { creator: c, score, interest: ifit.fit, percentage: Math.max(1, Math.min(99, Math.round(score * 100))), reasons: reasons.slice(0, 3) };
  }

  // Ties are broken by how well it fits your interests, then by channel size - never by the alphabet.
  const rank = list => list.slice().sort((x, y) =>
    y.score - x.score || y.interest - x.interest || y.creator.rawSubs - x.creator.rawSubs || x.creator.name.localeCompare(y.creator.name));

  function computeMatches(a, mode = 'main') {
    const set = new Set(a.interests.map(id => INTEREST_BY_ID[id].cat));
    const skip = new Set(a.favs);
    const scored = S.creators.filter(c => !skip.has(c.key)).map(c => scoreCreator(c, a, mode, set));
    let pool;
    if (mode === 'surprise') pool = scored.filter(r => !r.creator.categories.some(x => set.has(x)));
    else { const hit = scored.filter(r => r.interest > 0); pool = hit.length >= 5 ? hit : scored; }
    return rank(pool).slice(0, LIMIT);
  }

  const matchLabel = p => p >= 90 ? 'Excellent match' : p >= 80 ? 'Great match' : p >= 70 ? 'Good match' : p >= 55 ? 'Fair match' : 'Worth a look';

  /* ---------------- analysis + results ---------------- */
  function runAnalysis() {
    showScreen('analysis');
    const msgs = ['Reading what you picked…', `Comparing ${S.creators.length} channels…`, 'Ranking your matches…'];
    const msg = $('#analysisMessage'), fill = $('#analysisProgressFill');
    msg.textContent = msgs[0]; fill.style.width = '10%';
    clearInterval(S.timer);
    let step = 0;
    S.timer = setInterval(() => {
      step++;
      msg.textContent = msgs[Math.min(step, msgs.length - 1)];
      fill.style.width = `${Math.min(100, 10 + step * 45)}%`;
      if (step >= msgs.length) {
        clearInterval(S.timer);
        S.mode = 'main'; S.matches = computeMatches(S.answers, 'main');
        store.set(STORE_KEY, { answers: S.answers, ts: Date.now() });
        updateSavedUI();
        setTimeout(() => renderResults(true), calm ? 30 : 200);
      }
    }, calm ? 60 : 380);
  }

  function profileHtml() {
    const a = S.answers;
    const chips = a.interests.map(id => `<span class="yt-cat" style="--cat:${esc(Y.nicheColor(INTEREST_BY_ID[id].cat))}"><i></i>${esc(INTEREST_BY_ID[id].label)}</span>`).join('');
    const bits = [];
    if (a.moods.length) bits.push(`Mood: <b>${esc(listText(a.moods.map(id => MOOD_BY_ID[id].label.toLowerCase())))}</b>`);
    if (a.fame !== 'any') bits.push(`<b>${esc(LABELS.fame[a.fame])}</b>`);
    if (a.era !== 'any') bits.push(`<b>${esc(LABELS.era[a.era])}</b>`);
    if (a.binge !== 'any') bits.push(`<b>${esc(LABELS.binge[a.binge])}</b>`);
    const favs = a.favs.map(k => byKey(k)).filter(Boolean).map(c => c.name);
    if (favs.length) bits.push(`Loves <b>${esc(listText(favs))}</b>`);
    return `<span>You picked:</span> ${chips}${bits.length ? `<span class="profile-bits">${bits.join(' · ')}</span>` : ''}`;
  }

  function renderResults(focus, keep = 0) {
    if (!S.matches.length) { Y.toast('No matches found - try different answers'); return; }
    const surprise = S.mode === 'surprise';
    $('#resultsEyebrow').textContent = surprise ? 'Something different' : 'Picked for you';
    $('#resultsTitle').textContent = surprise ? 'Outside your usual picks' : 'Your top matches';
    $('#resultsSub').textContent = S.shared ? 'Someone shared these answers with you. Press "Start over" to get your own matches.'
      : surprise ? 'Channels from categories you did not choose - but they still fit the rest of your answers.'
      : 'Best fit first. Each one shows why it was picked.';
    $('#tasteProfile').innerHTML = profileHtml();
    $('#surpriseButton').textContent = surprise ? 'Back to my matches' : 'Surprise me';

    const list = S.matches.slice(0, S.shown);
    $('#resultsList').innerHTML = list.map((r, i) => {
      const c = r.creator;
      return `<article class="match reveal${i < keep ? ' in' : ''}" data-key="${esc(c.key)}">
        <div class="match-banner yt-banner" style="${esc(Y.bannerVars(c))}"><span class="match-rank">#${i + 1}</span></div>
        <div class="match-body">
          ${Y.avatarImg(c, 'yt-avatar match-avatar', 88)}
          <div class="match-main">
            <div class="match-top"><h3>${esc(c.name)}</h3><span class="match-pct">${r.percentage}% <small>${esc(matchLabel(r.percentage))}</small></span></div>
            <div class="match-bar" aria-hidden="true"><i style="--w:${r.percentage}%"></i></div>
            <p class="match-meta">${esc(c.handle)} · ${esc(c.subscribers)} subscribers · ${esc(c.country)}</p>
            <div class="match-cats">${Y.categoryChips(c, 4)}</div>
            <ul class="match-why">${r.reasons.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
            <div class="match-actions"><a class="yt-btn yt-btn-primary yt-btn-sm" href="${esc(Y.siteUrl('archive', { creator: c.key }))}">View profile</a></div>
          </div>
        </div>
      </article>`;
    }).join('');
    const more = $('#showMoreButton');
    show(more, S.matches.length > S.shown);
    more.textContent = `Show ${Math.min(LIMIT - S.shown, S.matches.length - S.shown)} more matches`;
    if (focus || !screens.results.classList.contains('active')) showScreen('results', '#resultsTitle');
    Y.stagger($('#resultsList'), ':scope > .match');
    Y.reveal($('#resultsList'));
  }

  function toggleSurprise() {
    if (S.mode === 'surprise') { S.mode = 'main'; S.matches = computeMatches(S.answers, 'main'); }
    else {
      const m = computeMatches(S.answers, 'surprise');
      if (!m.length) { Y.toast('You picked every category - nothing outside them'); return; }
      S.mode = 'surprise'; S.matches = m;
    }
    S.shown = PAGE; renderResults(true);
  }

  /* ---------------- saving + sharing ---------------- */
  const FAME_SET = new Set(FAME.map(o => o.value)), ERA_SET = new Set(ERA.map(o => o.value)), BINGE_SET = new Set(BINGE.map(o => o.value));
  function sanitizeAnswers(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const arr = (v, ok, max = 20) => Array.isArray(v) ? Array.from(new Set(v.filter(x => typeof x === 'string' && ok(x)))).slice(0, max) : [];
    const out = {
      interests: arr(raw.interests, id => INTEREST_BY_ID[id] && S.counts.get(INTEREST_BY_ID[id].cat)),
      moods: arr(raw.moods, id => MOOD_BY_ID[id]),
      fame: FAME_SET.has(raw.fame) ? raw.fame : 'any',
      era: ERA_SET.has(raw.era) ? raw.era : 'any',
      binge: BINGE_SET.has(raw.binge) ? raw.binge : 'any',
      favs: arr(raw.favs, k => !!byKey(k), MAX_FAVS)
    };
    return out.interests.length ? out : null;
  }
  const getSaved = () => { const s = store.get(STORE_KEY, null); return s && sanitizeAnswers(s.answers) ? { answers: sanitizeAnswers(s.answers), ts: s.ts } : null; };

  function answersToParams(a) {
    return { i: a.interests.join(','), m: a.moods.join(','), f: a.fame === 'any' ? '' : a.fame, e: a.era === 'any' ? '' : a.era, b: a.binge === 'any' ? '' : a.binge, v: a.favs.join(',') };
  }
  function answersFromParams(p) {
    if (!p.get('i')) return null;
    const list = k => (p.get(k) || '').split(',').map(s => s.trim()).filter(Boolean);
    return sanitizeAnswers({ interests: list('i'), moods: list('m'), fame: p.get('f') || 'any', era: p.get('e') || 'any', binge: p.get('b') || 'any', favs: list('v') });
  }

  function updateSavedUI() {
    const saved = getSaved();
    show($('#viewSavedButton'), !!saved);
    show($('#welcomeBack'), !!saved);
    if (saved) {
      const d = new Date(saved.ts);
      $('#welcomeText').textContent = `Your last answers are saved on this device${isFinite(d) ? ' (' + d.toLocaleDateString() + ')' : ''}.`;
    }
  }

  function showSaved() {
    const saved = getSaved(); if (!saved) { startQuiz(true); return; }
    S.answers = saved.answers; S.mode = 'main'; S.matches = computeMatches(S.answers); S.shown = PAGE; S.shared = false;
    renderResults(true);
  }

  function shareText() {
    const top = S.matches[0];
    return `My top YouTube match is ${top.creator.name} (${top.percentage}%). Find yours: ${Y.siteUrl('matcher', answersToParams(S.answers))}`;
  }

  /* ---------------- boot ---------------- */
  function bind() {
    $('#startButton').addEventListener('click', () => startQuiz(true));
    $('#viewSavedButton').addEventListener('click', showSaved);
    $('#clearSaved').addEventListener('click', () => {
      try { localStorage.removeItem('yt:' + STORE_KEY); } catch { /* ignore */ }
      updateSavedUI(); Y.toast('Saved answers removed');
    });
    $('#homeFromResults').addEventListener('click', () => showScreen('landing'));
    $('#exitQuizButton').addEventListener('click', () => showScreen('landing'));
    $('#backButton').addEventListener('click', () => { if (S.q > 0) { S.q--; renderQuestion(true); } });
    $('#continueButton').addEventListener('click', () => {
      if ($('#continueButton').disabled) return;
      if (S.q < QUESTIONS.length - 1) { S.q++; renderQuestion(true); } else { S.shown = PAGE; S.shared = false; runAnalysis(); }
    });
    const grid = $('#optionsGrid');
    grid.addEventListener('click', e => { const b = e.target.closest('.opt'); if (b) pick(b.dataset.value); });
    grid.addEventListener('keydown', e => {
      const b = e.target.closest('.opt'); if (!b || b.getAttribute('role') !== 'radio') return;
      const all = $$('.opt', grid), idx = all.indexOf(b); let n = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (idx + 1) % all.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (idx - 1 + all.length) % all.length;
      if (n >= 0) { e.preventDefault(); all[n].focus(); pick(all[n].dataset.value); }
    });
    $('#retakeButton').addEventListener('click', () => { S.shared = false; startQuiz(true); });
    $('#changeAnswersButton').addEventListener('click', () => { S.q = 0; S.shared = false; renderQuestion(false); showScreen('quiz'); });
    $('#surpriseButton').addEventListener('click', toggleSurprise);
    $('#shareButton').addEventListener('click', () => S.matches.length && copyText(shareText()));
    $('#showMoreButton').addEventListener('click', () => {
      const first = S.shown; S.shown = Math.min(LIMIT, S.matches.length); renderResults(false, first);
      const b = $$('.match .yt-btn')[first]; if (b) b.focus({ preventScroll: true });
    });
  }

  async function init() {
    Object.assign(screens, { state: $('#stateScreen'), landing: $('#landingScreen'), quiz: $('#quizScreen'), analysis: $('#analysisScreen'), results: $('#resultsScreen') });
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens.state.classList.add('active');
    Y.showState(screens.state, { type: 'loading', title: 'Loading creators', message: 'Fetching the creator roster…' });
    let result;
    try {
      result = await Y.loadCreators({ onSlow: () => { const m = $('[data-state-message]', screens.state); if (m) m.textContent = 'The API is waking up - this can take a few seconds.'; } });
    } catch (err) {
      Y.setStatus('offline', 'Offline');
      Y.showState(screens.state, { type: 'error', message: Y.friendlyError(err), onRetry: init });
      return;
    }
    S.creators = result.creators.filter(c => c && c.key);
    Y.statusFromSource(result.source, S.creators.length);
    prepare();
    if (S.creators.length < 3 || availableInterests().length < 2) {
      Y.showState(screens.state, { type: 'error', title: 'Not enough creators', message: 'The matcher needs creators from at least two categories.', onRetry: init, retryLabel: 'Reload' });
      return;
    }
    screens.state.innerHTML = '';
    screens.state.classList.remove('active');

    $('#apiNote').textContent = `Matching against ${S.creators.length} YouTubers from the shared YouTuber API.`;
    $('#heroStack').innerHTML = S.creators.slice().sort((a, b) => b.rawSubs - a.rawSubs).slice(0, 4).map(c => Y.avatarImg(c, 'yt-avatar', 60)).join('');
    S.answers = defaults();
    updateSavedUI();

    // shared link: ?i=gaming,comedy&m=laugh&f=gems&e=new&b=big&v=mrbeast
    const shared = answersFromParams(Y.params());
    if (shared) {
      S.answers = shared; S.mode = 'main'; S.matches = computeMatches(shared); S.shown = PAGE; S.shared = true;
      const note = $('#sharedNote'); note.textContent = 'You opened shared answers. Start the quiz to get your own matches.'; show(note, true);
      renderResults(true);
    } else showScreen('landing');
  }

  Y.mountShell({ site: 'matcher' });
  bind();
  init();
})();
