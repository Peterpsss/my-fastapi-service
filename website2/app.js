/* YouTube Games - Higher or Lower, Daily YouTuber and Mystery Channel.
   Uses the shared client in yt-core.js (window.YT) for data, shell and helpers. */
(function () {
  'use strict';
  const Y = window.YT;
  const { $, $$, esc, store } = Y;
  const MAX_DAILY = 8;          // more guesses = friendlier
  const DAILY_POOL = 70;        // the daily answer is always one of the 70 best-known channels
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let ALL = [];          // full roster
  let POOL = [];         // roster filtered by the chosen niche (Higher or Lower, Mystery)
  let poolNiche = '';

  const METRICS = {
    rawSubs: { label: 'Subscribers', word: 'subscribers', fmt: Y.fmt.compact },
    rawViews: { label: 'Total views', word: 'views', fmt: Y.fmt.compact },
    videoCount: { label: 'Video count', word: 'videos', fmt: Y.fmt.int }
  };

  /* ---------------- small helpers ---------------- */
  const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const rand = n => Math.floor(Math.random() * n);
  const show = (el, on) => el.classList.toggle('hidden', !on);
  const pad = n => String(n).padStart(2, '0');

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); Y.toast('Copied to clipboard'); return true; } catch { /* fall through */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy'); ta.remove();
      Y.toast(ok ? 'Copied to clipboard' : 'Could not copy - select and copy manually');
      return ok;
    } catch { Y.toast('Could not copy'); return false; }
  }

  function burst() {
    if (reduceMotion) return;
    const box = $('#confetti'); if (!box) return;
    const colors = ['#ff2a3d', '#22c55e', '#9d7bff', '#eab308', '#4da3ff', '#ffffff'];
    box.innerHTML = Array.from({ length: 46 }, () =>
      `<i style="left:${rand(100)}%;background:${colors[rand(colors.length)]};--dx:${rand(160) - 80}px;animation-delay:${(Math.random() * .4).toFixed(2)}s"></i>`).join('');
    setTimeout(() => { box.innerHTML = ''; }, 2600);
  }

  /* Hide the creator's own name/handle inside free text so it can be used as a clue. */
  function maskText(text, c, max) {
    let out = String(text || '');
    try {
      const terms = new Set();
      c.name.split(/\s+/).forEach(w => { const t = w.replace(/[^\p{L}\p{N}]/gu, ''); if (t.length >= 3) terms.add(t); });
      terms.add(c.name.replace(/[^\p{L}\p{N}]/gu, ''));
      terms.add(c.key);
      const list = [...terms].filter(t => t.length >= 3).sort((a, b) => b.length - a.length)
        .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      if (list.length) out = out.replace(new RegExp(list.join('|'), 'giu'), '█████');
    } catch { /* keep unmasked text on odd input */ }
    if (max && out.length > max) out = out.slice(0, max).replace(/\s+\S*$/, '') + '…';
    return out;
  }

  /* ---------------- stats ---------------- */
  const DEFAULT_STATS = () => ({
    hl: { rawSubs: 0, rawViews: 0, videoCount: 0 },
    daily: { wins: 0, played: 0, streak: 0, lastWin: '' },
    mystery: { best: 0 }
  });
  function getStats() {
    const s = store.get('games', null), d = DEFAULT_STATS();
    if (!s || typeof s !== 'object') return d;
    return {
      hl: Object.assign(d.hl, s.hl || {}),
      daily: Object.assign(d.daily, s.daily || {}),
      mystery: Object.assign(d.mystery, s.mystery || {})
    };
  }
  const saveStats = s => store.set('games', s);

  const utcDate = (d = new Date()) => d.toISOString().slice(0, 10);
  const utcYesterday = () => utcDate(new Date(Date.now() - 864e5));
  const EPOCH = Date.UTC(2026, 0, 1);
  const dailyNumber = (dateStr = utcDate()) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return Math.max(1, Math.floor((Date.UTC(y, m - 1, d) - EPOCH) / 864e5) + 1);
  };

  function renderStats() {
    const s = getStats();
    const streakAlive = s.daily.lastWin === utcDate() || s.daily.lastWin === utcYesterday();
    $('#statBestHL').textContent = Math.max(s.hl.rawSubs, s.hl.rawViews, s.hl.videoCount);
    $('#statDailyWins').textContent = s.daily.wins;
    $('#statDailyStreak').textContent = streakAlive ? s.daily.streak : 0;
    $('#statMystery').textContent = s.mystery.best;
    $$('[data-best]').forEach(el => {
      const v = s.hl[el.dataset.best] || 0;
      el.textContent = v ? `Best: ${v}` : '';
    });
    $('#hlBest').textContent = hl.metric ? (s.hl[hl.metric] || 0) : 0;
    $('#myBest').textContent = s.mystery.best;
  }

  /* ---------------- autocomplete (ARIA combobox) ---------------- */
  function autocomplete({ input, list, button, exclude, onSubmit }) {
    let items = [], active = -1, selected = null;
    const wrap = input.parentElement;

    const close = () => {
      show(list, false); input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant'); active = -1;
    };
    const setSelected = c => { selected = c; button.disabled = !c; };
    const mark = () => {
      $$('.ac-item', list).forEach((el, i) => el.setAttribute('aria-selected', String(i === active)));
      if (active >= 0) {
        input.setAttribute('aria-activedescendant', `${list.id}-o${active}`);
        const el = $(`#${list.id}-o${active}`); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
      } else input.removeAttribute('aria-activedescendant');
    };
    const open = () => {
      list.innerHTML = items.length
        ? items.map((c, i) => `<div class="ac-item" role="option" id="${list.id}-o${i}" data-i="${i}" aria-selected="false">${Y.avatarImg(c, 'yt-avatar', 36)}<span><strong>${esc(c.name)}</strong><small>${esc(c.handle)} · ${esc(c.niche)}</small></span></div>`).join('')
        : '<div class="ac-empty">No matching creator</div>';
      show(list, true); input.setAttribute('aria-expanded', 'true');
    };
    const pick = c => { input.value = c.name; setSelected(c); close(); input.focus(); };

    input.addEventListener('input', () => {
      const q = fold(input.value.trim());
      if (!q) { items = []; close(); setSelected(null); return; }
      const ex = exclude();
      const pool = ALL.filter(c => !ex.has(c.key));
      const starts = [], contains = [];
      pool.forEach(c => {
        const n = fold(c.name), h = c.key;
        if (n.startsWith(q) || h.startsWith(q) || n.split(/\s+/).some(w => w.startsWith(q))) starts.push(c);
        else if (n.includes(q) || h.includes(q)) contains.push(c);
      });
      items = starts.concat(contains).slice(0, 8);
      setSelected(pool.find(c => fold(c.name) === q || c.key === q.replace(/^@/, '')) || null);
      active = -1; open();
    });
    input.addEventListener('keydown', e => {
      const isOpen = !list.classList.contains('hidden');
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!isOpen || !items.length) return;
        e.preventDefault();
        active = e.key === 'ArrowDown' ? (active + 1) % items.length : (active <= 0 ? items.length - 1 : active - 1);
        mark();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (isOpen && active >= 0 && items[active]) pick(items[active]);
        else if (selected && !button.disabled) onSubmit();
      } else if (e.key === 'Escape' && isOpen) { e.preventDefault(); e.stopPropagation(); close(); }
    });
    list.addEventListener('mousedown', e => e.preventDefault());
    list.addEventListener('click', e => {
      const el = e.target.closest('.ac-item'); if (el && items[+el.dataset.i]) pick(items[+el.dataset.i]);
    });
    document.addEventListener('click', e => { if (!wrap.contains(e.target)) close(); });
    button.addEventListener('click', () => { if (selected) onSubmit(); });

    return {
      get selected() { return selected; },
      reset() { input.value = ''; items = []; close(); setSelected(null); },
      focus() { input.focus({ preventScroll: true }); },
      setDisabled(d) { input.disabled = d; if (d) button.disabled = true; else button.disabled = !selected; }
    };
  }

  /* =====================================================
     HIGHER OR LOWER
     ===================================================== */
  const hl = { active: false, metric: '', score: 0, left: null, right: null, locked: false, history: [], timer: 0, newBest: false, lastMiss: null };

  function pickOpponent(left) {
    const m = hl.metric;
    const cap = Math.min(6, Math.max(0, POOL.length - 3));
    const recent = new Set(hl.history.slice(-cap)); recent.add(left.key);
    let elig = POOL.filter(c => !recent.has(c.key));
    if (!elig.length) elig = POOL.filter(c => c.key !== left.key);
    const lv = Math.max(1, left[m]);
    const ratio = c => { const v = Math.max(1, c[m]); return Math.max(v, lv) / Math.min(v, lv); };
    const maxR = Math.max(1.12, 10 * Math.pow(0.82, hl.score));      // pairs get closer as the streak grows
    let near = elig.filter(c => ratio(c) <= maxR);
    if (!near.length) { elig = elig.slice().sort((a, b) => ratio(a) - ratio(b)); near = elig.slice(0, 3); }
    return near[rand(near.length)];
  }

  function paintBattleCard(el, c, metric, value, revealed, swap) {
    el.className = 'battle-card yt-banner' + (swap ? ' swap-in' : '');
    el.setAttribute('style', Y.bannerVars(c));
    el.innerHTML = `${Y.avatarImg(c, 'yt-avatar bc-avatar', 84)}
      <h3>${esc(c.name)}</h3>
      <p class="bc-meta">${esc(c.niche)} · ${esc(c.country)}</p>
      <div class="bc-value${revealed ? '' : ' hidden-val'}"><small>${esc(metric.label)}</small><strong>${revealed ? esc(metric.fmt(value)) : '?'}</strong></div>`;
  }

  function renderHL(swap) {
    const m = METRICS[hl.metric];
    paintBattleCard($('#leftCard'), hl.left, m, hl.left[hl.metric], true, swap);
    paintBattleCard($('#rightCard'), hl.right, m, 0, false, swap);
    $('#hlPrompt').textContent = `Does ${hl.right.name} have higher or lower ${m.word} than ${hl.left.name}?`;
    $('#hlScore').textContent = hl.score;
    $('#hlMetric').textContent = m.label;
    $('#hlFeedback').textContent = ''; $('#hlFeedback').className = 'feedback';
    $$('.answer-btn').forEach(b => { b.disabled = false; });
    renderStats();
  }

  function startHL(metric) {
    clearTimeout(hl.timer);
    Object.assign(hl, { active: true, metric, score: 0, locked: false, history: [], newBest: false, lastMiss: null });
    hl.left = POOL[rand(POOL.length)];
    hl.right = pickOpponent(hl.left);
    show($('#metricPicker'), false); show($('#hlOver'), false); show($('#hlGame'), true);
    renderHL(false);
    $('#hlPrompt').scrollIntoView({ block: 'nearest' });
  }

  function answerHL(dir) {
    if (!hl.active || hl.locked) return;
    hl.locked = true;
    $$('.answer-btn').forEach(b => { b.disabled = true; });
    const m = METRICS[hl.metric];
    const lv = hl.left[hl.metric], rv = hl.right[hl.metric];
    const ok = dir === 'higher' ? rv >= lv : rv <= lv;
    const card = $('#rightCard');
    $('.bc-value strong', card).textContent = m.fmt(rv);
    $('.bc-value', card).classList.remove('hidden-val');
    card.classList.add(ok ? 'correct' : 'wrong');
    const fb = $('#hlFeedback');
    if (ok) {
      hl.score++;
      const stats = getStats();
      if (hl.score > stats.hl[hl.metric]) { stats.hl[hl.metric] = hl.score; hl.newBest = true; saveStats(stats); }
      fb.className = 'feedback good';
      fb.textContent = `Correct! ${hl.right.name} has ${m.fmt(rv)} ${m.word}${rv === lv ? ' - an exact tie counts as right' : ''}.`;
      $('#hlScore').textContent = hl.score; renderStats();
      hl.timer = setTimeout(() => {
        hl.history.push(hl.left.key);
        hl.left = hl.right; hl.right = pickOpponent(hl.left);
        hl.locked = false; renderHL(true);
      }, reduceMotion ? 700 : 1150);
    } else {
      hl.lastMiss = { right: hl.right, left: hl.left, rv, lv };
      fb.className = 'feedback bad';
      fb.textContent = `Not quite - ${hl.right.name} has ${m.fmt(rv)} ${m.word}, ${hl.left.name} has ${m.fmt(lv)}.`;
      hl.timer = setTimeout(endHL, reduceMotion ? 800 : 1500);
    }
  }

  function endHL() {
    hl.active = false; hl.locked = false;
    const m = METRICS[hl.metric], best = getStats().hl[hl.metric];
    $('#hlFinal').textContent = hl.score;
    const miss = hl.lastMiss;
    $('#hlOverText').textContent =
      (hl.newBest && hl.score > 0 ? `New personal best for ${m.label.toLowerCase()}! ` : `Your best for ${m.label.toLowerCase()} is ${best}. `) +
      (miss ? `${miss.right.name} has ${m.fmt(miss.rv)} ${m.word}; ${miss.left.name} has ${m.fmt(miss.lv)}.` : '');
    show($('#hlGame'), false); show($('#hlOver'), true);
    if (hl.newBest && hl.score > 2) burst();
    renderStats();
    $('#hlAgain').focus({ preventScroll: true });
  }

  function wireHL() {
    $$('.metric-btn').forEach(b => b.addEventListener('click', () => startHL(b.dataset.metric)));
    $$('.answer-btn').forEach(b => b.addEventListener('click', () => answerHL(b.dataset.answer)));
    $('#hlChange').addEventListener('click', () => {
      clearTimeout(hl.timer); hl.active = false; hl.locked = false;
      show($('#hlGame'), false); show($('#hlOver'), false); show($('#metricPicker'), true);
      $('.metric-btn').focus({ preventScroll: true });
    });
    $('#hlAgain').addEventListener('click', () => startHL(hl.metric));
    $('#hlShare').addEventListener('click', () => copyText(`I scored ${hl.score} on Higher or Lower (${METRICS[hl.metric].label}) in YouTube Games! Can you beat it? ${Y.CONFIG.SITES.games.url}`));
    document.addEventListener('keydown', e => {
      if (!hl.active || e.ctrlKey || e.metaKey || e.altKey || currentView() !== 'higher-lower') return;
      if (document.querySelector('.yt-modal:not(.hidden)')) return;
      const k = e.key.toLowerCase();
      if (k === 'arrowup' || k === 'h') { e.preventDefault(); answerHL('higher'); }
      else if (k === 'arrowdown' || k === 'l') { e.preventDefault(); answerHL('lower'); }
    });
  }

  /* =====================================================
     DAILY YOUTUBER
     ===================================================== */
  let daily = null;       // { date, answerKey, guesses:[keys], status, counted }
  let dailyAC = null;

  function dailyAnswerFor(dateStr) {
    const sorted = ALL.slice().sort((a, b) => b.rawSubs - a.rawSubs || (a.key < b.key ? -1 : 1)).slice(0, Math.min(DAILY_POOL, ALL.length))
      .sort((a, b) => a.key < b.key ? -1 : 1);
    const n = sorted.length, day = dailyNumber(dateStr) - 1;
    const cycle = Math.floor(day / n);
    // a fresh hash-ordered permutation of the roster per cycle: no repeats until everyone has been used
    const order = sorted.map(c => ({ c, h: Y.hash(`yt-daily:${cycle}:${c.key}`) }))
      .sort((a, b) => a.h - b.h || (a.c.key < b.c.key ? -1 : 1));
    return order[day % n].c;
  }

  function loadDaily() {
    const today = utcDate();
    let s = store.get('daily', null);
    const valid = s && s.date === today && Array.isArray(s.guesses) && ALL.some(c => c.key === s.answerKey);
    if (!valid) {
      s = { date: today, answerKey: dailyAnswerFor(today).key, guesses: [], status: 'playing', counted: false };
      store.set('daily', s);
    }
    daily = s;
  }
  const dailyAnswer = () => ALL.find(c => c.key === daily.answerKey) || dailyAnswerFor(daily.date);
  const saveDaily = () => store.set('daily', daily);

  function numClue(g, a, key, closeRatio) {
    const gv = g[key], av = a[key];
    if (gv === av) return { cls: 'exact', mark: '✓', text: 'Exact' };
    const hi = Math.max(gv, av, 1), lo = Math.max(Math.min(gv, av), 1);
    const close = hi / lo <= closeRatio;
    return { cls: close ? 'close' : 'miss', mark: close ? '≈' : '✕', text: av > gv ? '↑ Higher' : '↓ Lower', word: av > gv ? 'higher' : 'lower' };
  }
  function yearClue(g, a) {
    if (g.joinedYear === a.joinedYear) return { cls: 'exact', mark: '✓', text: 'Exact' };
    const close = Math.abs(g.joinedYear - a.joinedYear) <= 2;
    return { cls: close ? 'close' : 'miss', mark: close ? '≈' : '✕', text: a.joinedYear > g.joinedYear ? '↑ Later' : '↓ Earlier', word: a.joinedYear > g.joinedYear ? 'later' : 'earlier' };
  }
  function catClue(g, a) {
    const shared = g.categories.filter(x => a.categories.includes(x)).length;
    if (shared && shared === g.categories.length && shared === a.categories.length) return { cls: 'exact', mark: '✓', text: 'Same categories' };
    if (shared) return { cls: 'close', mark: '≈', text: shared + ' in common' };
    return { cls: 'miss', mark: '✕', text: 'None in common' };
  }
  function clueSet(g, a) {
    const txt = (eq) => eq ? { cls: 'exact', mark: '✓', text: 'Match' } : { cls: 'miss', mark: '✕', text: 'Different' };
    return [
      Object.assign(txt(g.country === a.country), { label: 'Country', value: g.country }),
      Object.assign(catClue(g, a), { label: 'Category', value: g.categories.slice(0, 3).join(' · ') }),
      Object.assign(numClue(g, a, 'rawSubs', 1.5), { label: 'Subscribers', value: g.subscribers }),
      Object.assign(numClue(g, a, 'rawViews', 1.75), { label: 'Views', value: g.totalViews }),
      Object.assign(yearClue(g, a), { label: 'Joined', value: g.joinedYear ? String(g.joinedYear) : '?' })
    ];
  }
  const CLUE_EMOJI = { exact: '🟩', close: '🟨', miss: '⬛' };

  function renderDaily(animateLast) {
    const a = dailyAnswer();
    $('#dailyNumber').textContent = `Daily #${dailyNumber(daily.date)}`;
    $('#dailyDate').textContent = new Date(daily.date + 'T00:00:00Z').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
    $('#attemptCount').textContent = daily.guesses.length;
    const rows = $('#guessRows');
    if (!daily.guesses.length) {
      rows.innerHTML = '<div class="gempty">Make your first guess - the clues appear here.</div>';
    } else {
      rows.innerHTML = daily.guesses.map((key, idx) => {
        const g = ALL.find(c => c.key === key); if (!g) return '';
        const clues = clueSet(g, a);
        const fresh = animateLast && idx === daily.guesses.length - 1;
        return `<div class="grow${fresh ? ' fresh' : ''}" role="row">
          <div class="gname" role="cell">${Y.avatarImg(g, 'yt-avatar', 40)}<span><strong>${esc(g.name)}</strong><small>${esc(g.handle)}</small></span></div>
          ${clues.map((c, i) => `<div class="gcell ${c.cls}" role="cell" data-label="${esc(c.label)}" style="--i:${i}" aria-label="${esc(c.label)}: ${esc(c.value)}. ${c.cls === 'exact' ? 'Exact match' : c.cls === 'close' ? 'Close, target is ' + esc(c.word || 'similar') : c.word ? 'Different, target is ' + esc(c.word) : 'Different'}.">
            <span>${esc(c.value)}</span><small aria-hidden="true">${c.mark} ${esc(c.text)}</small></div>`).join('')}
        </div>`;
      }).join('');
    }

    // free hints
    // hints: three are free from the very start, more unlock after every guess
    const hints = [];
    if (daily.status === 'playing') {
      const n = daily.guesses.length;
      hints.push(`<div class="hint"><b>Free hint · categories:</b> ${esc(a.categories.join(' · '))}</div>`);
      hints.push(`<div class="hint"><b>Free hint · audience size:</b> ${esc(subBracket(a.rawSubs))}</div>`);
      hints.push(`<div class="hint"><b>Free hint · country:</b> ${esc(a.country)}</div>`);
      if (n >= 1) hints.push(`<div class="hint"><b>Hint 4 · channel description:</b> “${esc(maskText(a.bio, a, 170))}”</div>`);
      if (n >= 2) hints.push(`<div class="hint"><b>Hint 5 · the name:</b> starts with “${esc(Array.from(a.name)[0].toUpperCase())}” and has ${a.name.replace(/\s+/g, '').length} letters.</div>`);
      if (n >= 3) hints.push(a.popularVideo && a.popularVideo.has
        ? `<div class="hint"><b>Hint 6 · most popular video:</b> “${esc(maskText(a.popularVideo.title, a, 110))}”</div>`
        : `<div class="hint"><b>Hint 6 · channel totals:</b> ${esc(a.totalViews)} views across ${esc(Y.fmt.int(a.videoCount))} videos</div>`);
      if (n >= 4 && a.joinedYear) hints.push(`<div class="hint"><b>Hint 7 · joined YouTube:</b> in the ${Math.floor(a.joinedYear / 5) * 5}s (${Math.floor(a.joinedYear / 5) * 5}-${Math.floor(a.joinedYear / 5) * 5 + 4})</div>`);
      if (n < 4) hints.push(`<div class="hint next">Another hint unlocks after your ${n + 1}${['st', 'nd', 'rd', 'th'][Math.min(n, 3)]} guess.</div>`);
    }
    $('#dailyHints').innerHTML = hints.join('');

    const done = daily.status !== 'playing';
    show($('#dailyInput'), !done);
    show($('#dailyResult'), done);
    if (done) renderDailyResult(a);
    renderHomeDaily();
  }

  function dailyShareText() {
    const a = dailyAnswer();
    const lines = daily.guesses.map(k => { const g = ALL.find(c => c.key === k); return g ? clueSet(g, a).map(c => CLUE_EMOJI[c.cls]).join('') : ''; });
    return `YouTube Games Daily #${dailyNumber(daily.date)} ${daily.status === 'won' ? daily.guesses.length : 'X'}/${MAX_DAILY}\n${lines.join('\n')}\n${Y.CONFIG.SITES.games.url}#daily`;
  }

  function renderDailyResult(a) {
    const box = $('#dailyResult'), won = daily.status === 'won';
    box.className = 'result ' + (won ? 'win' : 'lose');
    const s = getStats(), alive = s.daily.lastWin === utcDate() || s.daily.lastWin === utcYesterday();
    box.innerHTML = `<h3>${won ? `Solved in ${daily.guesses.length}/${MAX_DAILY}!` : 'Out of guesses'}</h3>
      <p>${won ? 'Nice work - you got today\'s creator.' : 'Today\'s creator was:'} Daily streak: <strong>${alive ? s.daily.streak : 0}</strong></p>
      <div class="reveal">${Y.avatarImg(a, 'yt-avatar', 72)}<div><strong>${esc(a.name)}</strong><small>${esc(a.handle)} · ${esc(a.categories.join(' · '))} · ${esc(a.country)}</small></div></div>
      <div class="result-actions">
        <button class="yt-btn yt-btn-primary" type="button" id="dailyShare">Share result</button>
        <a class="yt-btn yt-btn-ghost" href="${esc(Y.siteUrl('archive', { creator: a.key }))}">See them in the Archive</a>
        <a class="yt-btn yt-btn-ghost" href="#mystery">Play Mystery Channel</a>
      </div>`;
    $('#dailyShare').addEventListener('click', () => copyText(dailyShareText()));
  }

  function renderHomeDaily() {
    const el = $('#homeDaily'); if (!el || !daily) return;
    el.textContent = daily.status === 'won' ? `Solved today in ${daily.guesses.length}/${MAX_DAILY} ✓`
      : daily.status === 'lost' ? 'Today\'s challenge is over - come back tomorrow'
      : daily.guesses.length ? `In progress: ${daily.guesses.length}/${MAX_DAILY} guesses used` : 'Not played yet today';
  }

  function submitDaily() {
    const g = dailyAC.selected;
    if (!g || daily.status !== 'playing' || daily.guesses.includes(g.key)) return;
    daily.guesses.push(g.key);
    const a = dailyAnswer();
    if (g.key === a.key) daily.status = 'won';
    else if (daily.guesses.length >= MAX_DAILY) daily.status = 'lost';
    if (daily.status !== 'playing' && !daily.counted) {
      daily.counted = true;
      const s = getStats();
      s.daily.played++;
      if (daily.status === 'won') {
        s.daily.wins++;
        s.daily.streak = s.daily.lastWin === utcYesterday() ? s.daily.streak + 1 : 1;
        s.daily.lastWin = daily.date;
      } else s.daily.streak = 0;
      saveStats(s);
    }
    saveDaily();
    dailyAC.reset();
    renderDaily(true); renderStats();
    if (daily.status === 'won') burst();
    if (daily.status === 'playing') dailyAC.focus();
    else $('#dailyShare').focus({ preventScroll: true });
  }

  function tickCountdown() {
    const now = new Date();
    const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
    const s = Math.max(0, Math.floor((next - now.getTime()) / 1000));
    const t = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s % 3600 / 60))}:${pad(s % 60)}`;
    $$('[data-countdown]').forEach(el => { el.textContent = t; });
    // date rolled over while the page was open -> start the new daily
    if (daily && daily.date !== utcDate()) {
      loadDaily(); dailyAC.reset(); renderDaily(false); renderStats();
      Y.toast('A new Daily YouTuber is ready!');
    }
  }

  /* =====================================================
     MYSTERY CHANNEL
     ===================================================== */
  const MAX_CLUES = 5;
  const START_CLUES = 2;        // a round opens with two clues already visible (categories + audience, then where & when)
  const my = { round: 1, points: 0, creator: null, clues: 1, guessed: [], done: false, history: [] };
  let myAC = null;

  const SUB_STEPS = [500e3, 1e6, 2e6, 5e6, 10e6, 15e6, 20e6, 30e6, 40e6, 50e6, 75e6, 100e6, 150e6, 200e6, 300e6];
  function subBracket(v) {
    const lo = [...SUB_STEPS].reverse().find(s => s <= v), hi = SUB_STEPS.find(s => s > v);
    if (lo === undefined) return `Fewer than ${Y.fmt.compact(SUB_STEPS[0])} subscribers`;
    if (hi === undefined) return `More than ${Y.fmt.compact(lo)} subscribers`;
    return `Between ${Y.fmt.compact(lo)} and ${Y.fmt.compact(hi)} subscribers`;
  }

  function clueDefs(c) {
    return [
      { title: 'Categories & audience', html: `<p>${esc(c.categories.join(' · '))}</p><p>${esc(subBracket(c.rawSubs))}</p>` },
      { title: 'Where & when', html: `<p>Based in ${esc(c.country)} · ${c.joinedYear ? `joined YouTube in ${esc(c.joinedYear)}` : 'join year unknown'} · ${esc(Y.fmt.int(c.videoCount))} videos</p>` },
      { title: 'Channel description', html: `<p class="mask">“${esc(maskText(c.bio, c, 190))}”</p>` },
      c.popularVideo && c.popularVideo.has ? {
        title: 'Most popular video',
        html: `<p>“${esc(maskText(c.popularVideo.title, c, 120))}”${c.popularVideo.views ? ` · ${esc(/views?\s*$/i.test(c.popularVideo.views) ? c.popularVideo.views : c.popularVideo.views + ' views')}` : ''}</p>` +
          (c.popularVideo.thumb ? `<div class="clue-thumbwrap" data-thumb><img class="clue-thumb" src="${esc(c.popularVideo.thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer"></div>` : '')
      } : {
        // no confirmed top video for this creator: use channel totals instead of showing something unverified
        title: 'Channel totals',
        html: `<p>${esc(c.totalViews)} total views across ${esc(Y.fmt.int(c.videoCount))} videos</p>`
      },
      { title: 'The name', html: `<p>Starts with “${esc(Array.from(c.name)[0].toUpperCase())}” · ${c.name.replace(/\s+/g, '').length} letters</p>` +
          `<div class="clue-thumbwrap clue-avwrap" data-reveal>${Y.avatarImg(c, 'clue-thumb clue-avatar', 120)}</div>` }
    ];
  }

  function renderMystery() {
    const worth = Math.max(1, MAX_CLUES - (my.clues - START_CLUES));
    $('#myRound').textContent = my.round;
    $('#myPoints').textContent = my.points;
    $('#myWorth').textContent = my.done ? 0 : worth;
    const defs = clueDefs(my.creator);
    $('#myClues').innerHTML = defs.map((d, i) => i < my.clues
      ? `<div class="clue"><div class="clue-n" aria-hidden="true">${i + 1}</div><div><h3>Clue ${i + 1} · ${esc(d.title)}</h3>${d.html}</div></div>`
      : `<div class="clue locked"><div class="clue-n" aria-hidden="true">${i + 1}</div><div><h3>Clue ${i + 1} · locked</h3><p>Unlocks after ${i - START_CLUES + 1} wrong guess${i - START_CLUES + 1 > 1 ? 'es' : ''}.</p></div></div>`).join('');
    $$('#myClues [data-thumb], #myClues [data-reveal]').forEach(w => {
      if (my.done) w.classList.add('revealed');
      if (w.hasAttribute('data-thumb')) $('img', w).addEventListener('error', () => w.remove());
    });
    renderStats();
  }

  function newMysteryRound() {
    const cap = Math.min(10, Math.max(0, POOL.length - 2));
    const recent = new Set(my.history.slice(-cap));
    let elig = POOL.filter(c => !recent.has(c.key));
    if (!elig.length) elig = POOL;
    if (my.round <= 3 && elig.length > 8) {        // the first rounds use the best-known channels
      const ranked = elig.slice().sort((a, b) => b.rawSubs - a.rawSubs);
      elig = ranked.slice(0, Math.max(6, Math.ceil(ranked.length * 0.4)));
    }
    my.creator = elig[rand(elig.length)];
    my.history.push(my.creator.key);
    Object.assign(my, { clues: START_CLUES, guessed: [], done: false });
    show($('#myResult'), false); show($('#myInput'), true);
    $('#myMsg').textContent = ''; $('#myMsg').className = 'feedback';
    myAC.reset(); myAC.setDisabled(false);
    renderMystery();
  }

  function startMysteryRun() {
    Object.assign(my, { round: 1, points: 0 });
    newMysteryRound();
  }

  function mysteryResult(solved, gained) {
    const c = my.creator, box = $('#myResult');
    box.className = 'result ' + (solved ? 'win' : 'lose');
    const s = getStats();
    box.innerHTML = `<h3>${solved ? `Correct! +${gained} point${gained > 1 ? 's' : ''}` : 'Run over'}</h3>
      <p>${solved ? `You solved round ${my.round} with ${my.clues} clue${my.clues > 1 ? 's' : ''} showing.` : `It was ${esc(c.name)}.`} Run points: <strong>${my.points}</strong> · Best run: <strong>${s.mystery.best}</strong></p>
      <div class="reveal">${Y.avatarImg(c, 'yt-avatar', 72)}<div><strong>${esc(c.name)}</strong><small>${esc(c.handle)} · ${esc(c.categories.join(' · '))} · ${esc(c.country)}</small></div></div>
      <div class="result-actions">
        <button class="yt-btn yt-btn-primary" type="button" id="myNext">${solved ? 'Next channel' : 'Start a new run'}</button>
        <a class="yt-btn yt-btn-ghost" href="${esc(Y.siteUrl('archive', { creator: c.key }))}">See them in the Archive</a>
        ${Y.channelUrl(c) ? `<a class="yt-btn yt-btn-ghost" href="${esc(Y.channelUrl(c))}" target="_blank" rel="noopener noreferrer">Open on YouTube</a>` : ''}
      </div>`;
    $('#myNext').addEventListener('click', () => {
      if (solved) { my.round++; newMysteryRound(); } else startMysteryRun();
      myAC.focus();
    });
    show($('#myInput'), false); show(box, true);
    $('#myNext').focus({ preventScroll: true });
  }

  function submitMystery() {
    const g = myAC.selected;
    if (!g || my.done || my.guessed.includes(g.key)) return;
    const msg = $('#myMsg');
    if (g.key === my.creator.key) {
      const gained = Math.max(1, MAX_CLUES - (my.clues - START_CLUES));
      my.points += gained; my.done = true;
      const s = getStats(); if (my.points > s.mystery.best) { s.mystery.best = my.points; saveStats(s); }
      msg.textContent = ''; renderMystery(); mysteryResult(true, gained); burst();
      return;
    }
    my.guessed.push(g.key);
    myAC.reset();
    if (my.clues >= MAX_CLUES) {
      my.done = true; msg.textContent = '';
      renderMystery(); mysteryResult(false, 0);
    } else {
      my.clues++;
      msg.className = 'feedback bad';
      const left = Math.max(1, MAX_CLUES - (my.clues - START_CLUES));
      msg.textContent = `Not ${g.name}. A new clue is unlocked - ${left} point${left > 1 ? 's' : ''} left on this one.`;
      renderMystery(); myAC.focus();
    }
  }

  /* =====================================================
     POOL (niche filter), routing, init
     ===================================================== */
  function setupPool() {
    const counts = {};
    ALL.forEach(c => c.categories.forEach(n => { counts[n] = (counts[n] || 0) + 1; }));
    const niches = Object.keys(counts).filter(n => counts[n] >= 6).sort();
    const sel = $('#poolSelect');
    sel.innerHTML = `<option value="">All creators (${ALL.length})</option>` + niches.map(n => `<option value="${esc(n)}">${esc(n)} (${counts[n]})</option>`).join('');
    const wanted = (Y.params().get('niche') || store.get('pool', '') || '').toLowerCase();
    const match = niches.find(n => n.toLowerCase() === wanted);
    poolNiche = match || '';
    sel.value = poolNiche;
    applyPool(false);
    sel.addEventListener('change', () => {
      poolNiche = sel.value;
      store.set('pool', poolNiche);
      Y.setParam('niche', poolNiche);
      applyPool(true);
    });
  }

  function applyPool(reset) {
    POOL = poolNiche ? ALL.filter(c => c.categories.includes(poolNiche)) : ALL.slice();
    $('#poolInfo').textContent = poolNiche ? `${POOL.length} ${poolNiche} creators in play` : `${POOL.length} creators in play`;
    $$('.section-copy').forEach(el => {
      if (!el.dataset.base) el.dataset.base = el.textContent;
      el.textContent = el.dataset.base + (el.closest('#hlView, #mysteryView') && poolNiche ? ` Pool: ${poolNiche}.` : '');
    });
    if (reset) {
      clearTimeout(hl.timer); hl.active = false; hl.locked = false;
      show($('#hlGame'), false); show($('#hlOver'), false); show($('#metricPicker'), true);
      if (myAC) startMysteryRun();
      Y.toast(poolNiche ? `Playing with ${poolNiche} creators` : 'Playing with all creators');
    }
  }

  const VIEWS = { home: 'homeView', 'higher-lower': 'hlView', daily: 'dailyView', mystery: 'mysteryView' };
  const TITLES = { home: '#homeTitle', 'higher-lower': '#hlTitle', daily: '#dailyTitle', mystery: '#mysteryTitle' };
  const currentView = () => { const h = location.hash.replace('#', ''); return VIEWS[h] ? h : 'home'; };

  function route() {
    const v = currentView();
    Object.entries(VIEWS).forEach(([k, id]) => show($('#' + id), k === v));
    document.title = (v === 'home' ? 'YouTube Games' : { 'higher-lower': 'Higher or Lower', daily: 'Daily YouTuber', mystery: 'Mystery Channel' }[v] + ' · YouTube Games') + ' - one creator API';
    window.scrollTo(0, 0);
    if (v === 'home') renderStats();
    if (v === 'daily') renderDaily(false);
    if (v === 'mystery' && !my.creator) startMysteryRun();
    if (v === 'mystery') renderMystery();
    const h = $(TITLES[v]); if (h) h.focus({ preventScroll: true });
  }

  async function init() {
    const state = $('#appState');
    Y.showState(state, { type: 'loading', title: 'Loading creators', message: 'Fetching the creator roster…' });
    let result;
    try {
      result = await Y.loadCreators({
        onSlow: () => { const m = $('[data-state-message]', state); if (m) m.textContent = 'The API is waking up - this can take a few seconds.'; }
      });
    } catch (err) {
      Y.setStatus('offline', 'Offline');
      Y.showState(state, { type: 'error', message: Y.friendlyError(err), onRetry: init });
      return;
    }
    ALL = result.creators.filter(c => c && c.key);
    Y.statusFromSource(result.source, ALL.length);
    if (ALL.length < 6) {
      Y.showState(state, { type: 'error', title: 'Not enough creators', message: 'The games need at least 6 creators. Add more to the API and reload.', onRetry: () => init(), retryLabel: 'Reload' });
      return;
    }
    state.innerHTML = '';

    setupPool();
    loadDaily();
    dailyAC = autocomplete({
      input: $('#dailyGuess'), list: $('#dailyList'), button: $('#dailySubmit'),
      exclude: () => new Set(daily.guesses), onSubmit: submitDaily
    });
    myAC = autocomplete({
      input: $('#myGuess'), list: $('#myList'), button: $('#mySubmit'),
      exclude: () => new Set(my.guessed), onSubmit: submitMystery
    });
    wireHL();
    renderHomeDaily();
    tickCountdown(); setInterval(tickCountdown, 1000);
    window.addEventListener('hashchange', route);
    route();
  }

  Y.mountShell({ site: 'games' });
  init();
})();
