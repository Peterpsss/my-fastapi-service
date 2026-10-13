const API_BASE_URL = "https://my-fastapi-service-sigma.vercel.app/";
const API_KEY = "supersecret123";
const API_ENDPOINT = "/api/v1/creators";
const PUBLIC_API_ENDPOINT = "/creators";
const API_TIMEOUT_MS = 12000;

const DAILY_MAX_GUESSES = 6;
const STORAGE_KEYS = {
  higherLowerBest: "youtubeGames_higherLowerBest",
  dailyStats: "youtubeGames_dailyStats",
  dailyStatePrefix: "youtubeGames_daily_"
};

let creators = [];
let currentRoute = "home";
let selectedMetric = null;
let higherLowerScore = 0;
let leftCreator = null;
let rightCreator = null;
let roundLocked = false;
let dailyAnswer = null;
let dailySelectedCreator = null;
let dailyState = null;
let activeSuggestionIndex = -1;

const metricConfig = {
  rawSubs: { label: "Subscribers", display: creator => creator.subscribers || formatNumber(creator.rawSubs) },
  rawViews: { label: "Total Views", display: creator => creator.totalViews || formatNumber(creator.rawViews) },
  videoCount: { label: "Videos", display: creator => Number(creator.videoCount || 0).toLocaleString() }
};

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

function safeText(value, fallback = "N/A") {
  return value === undefined || value === null || value === "" ? fallback : String(value);
}

function formatNumber(value) {
  const number = Number(value || 0);
  if (number >= 1_000_000_000) return `${(number / 1_000_000_000).toFixed(number >= 10_000_000_000 ? 0 : 1)}B`;
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(number >= 10_000_000 ? 0 : 1)}M`;
  if (number >= 1_000) return `${(number / 1_000).toFixed(number >= 10_000 ? 0 : 1)}K`;
  return number.toLocaleString();
}

function normalizeCreator(raw) {
  return {
    id: raw.id,
    name: safeText(raw.name),
    handle: safeText(raw.handle),
    niche: safeText(raw.niche),
    country: safeText(raw.country),
    subscribers: safeText(raw.subscribers, formatNumber(raw.rawSubs)),
    rawSubs: Number(raw.rawSubs || 0),
    totalViews: safeText(raw.totalViews, formatNumber(raw.rawViews)),
    rawViews: Number(raw.rawViews || 0),
    videoCount: Number(raw.videoCount || 0),
    avatar: safeText(raw.avatar, "https://ui-avatars.com/api/?background=272727&color=fff&name=YT"),
    banner: safeText(raw.banner, ""),
    bio: safeText(raw.bio, "No description available."),
    joinedYear: Number(raw.joinedYear || 0),
    popularVideo: raw.popularVideo || null
  };
}

function setApiStatus(type, text) {
  const box = $("#apiStatus");
  const label = $("#apiStatusText");
  if (!box || !label) return;
  box.className = `api-status ${type}`;
  label.textContent = text;
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 1900);
}

function getApiBaseUrl() {
  return API_BASE_URL.trim().replace(/\/$/, "");
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function requestCreatorData() {
  const base = getApiBaseUrl();
  const protectedUrl = `${base}${API_ENDPOINT}`;

  const response = await fetchWithTimeout(protectedUrl, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "x-api-key": API_KEY
    }
  });

  if (response.ok) return response.json();

  // Your original API also exposes /creators publicly. This fallback keeps the
  // project usable if the protected route is unavailable during local testing.
  if ([401, 403, 404].includes(response.status)) {
    const publicResponse = await fetchWithTimeout(`${base}${PUBLIC_API_ENDPOINT}`, {
      method: "GET",
      headers: { "Accept": "application/json" }
    });
    if (publicResponse.ok) return publicResponse.json();
  }

  if (response.status === 401) throw new Error("The API rejected the key. Check API_KEY in app.js.");
  if (response.status === 404) throw new Error("API endpoint not found. Check API_BASE_URL in app.js.");
  throw new Error(`API request failed with status ${response.status}.`);
}

async function loadCreators() {
  showGlobalState("loading");
  setApiStatus("connecting", "Connecting");
  $("#loadingMessage").textContent = "Connecting to the creator API...";

  try {
    const data = await requestCreatorData();
    if (!data || !Array.isArray(data.creators)) {
      throw new Error("The API returned an unexpected response format.");
    }

    creators = data.creators.map(normalizeCreator).filter(creator => creator.name !== "N/A");
    if (creators.length < 2) throw new Error("The API did not return enough creators to start the games.");

    setApiStatus("online", `${creators.length} creators`);
    initializeAfterDataLoad();
  } catch (error) {
    const friendlyMessage = error.name === "AbortError"
      ? "The API took too long to respond. Check API_BASE_URL or your deployment."
      : error.message || "Could not connect to the creator API.";
    console.error("YouTube Games API error:", error);
    setApiStatus("offline", "Offline");
    showGlobalState("error", friendlyMessage);
  }
}

function showGlobalState(state, message = "") {
  $("#loadingView").classList.toggle("hidden", state !== "loading");
  $("#errorView").classList.toggle("hidden", state !== "error");
  $$(".view").forEach(view => view.classList.add("hidden"));
  if (state === "error") $("#errorMessage").textContent = message;
}

function initializeAfterDataLoad() {
  setupDailyGame();
  updatePlayerStats();
  $("#loadingView").classList.add("exit-state");
  setTimeout(() => {
    $("#loadingView").classList.add("hidden");
    $("#loadingView").classList.remove("exit-state");
    $("#errorView").classList.add("hidden");
    navigateTo("home");
  }, 320);
}

function navigateTo(route) {
  const map = {
    home: "#homeView",
    "higher-lower": "#higherLowerView",
    daily: "#dailyView"
  };
  if (!map[route]) return;

  currentRoute = route;
  $$(".view").forEach(view => view.classList.add("hidden"));
  $(map[route]).classList.remove("hidden");
  $$(".nav-link").forEach(link => link.classList.toggle("active", link.dataset.route === route));

  if (route === "home") updatePlayerStats();
  if (route === "daily") renderDailyGame();

  $("#app").focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function startHigherLower(metric) {
  if (!metricConfig[metric] || creators.length < 2) return;
  selectedMetric = metric;
  higherLowerScore = 0;
  roundLocked = false;
  $("#metricPicker").classList.add("hidden");
  $("#gameOverPanel").classList.add("hidden");
  $("#higherLowerGame").classList.remove("hidden");
  $("#roundFeedback").textContent = "";
  $("#currentMetricLabel").textContent = metricConfig[metric].label;

  leftCreator = randomCreator();
  rightCreator = randomCreator([leftCreator.id]);
  renderHigherLowerRound(false, true);
}

function resetHigherLowerToPicker() {
  selectedMetric = null;
  higherLowerScore = 0;
  $("#higherLowerGame").classList.add("hidden");
  $("#gameOverPanel").classList.add("hidden");
  $("#metricPicker").classList.remove("hidden");
}

function randomCreator(excludedIds = []) {
  const excluded = new Set(excludedIds.map(String));
  const pool = creators.filter(creator => !excluded.has(String(creator.id)));
  return pool[Math.floor(Math.random() * pool.length)];
}

function renderCreatorBattleCard(creator, revealValue) {
  const cfg = metricConfig[selectedMetric];
  const safeBanner = creator.banner ? creator.banner.replace(/'/g, "%27") : "";
  const bannerStyle = safeBanner ? `style="background-image:url('${safeBanner}')"` : "";
  return `
    <div class="creator-visual" ${bannerStyle}>
      <div class="creator-gradient"></div>
      <img class="creator-avatar" src="${creator.avatar}" alt="${creator.name} avatar" onerror="this.src='https://ui-avatars.com/api/?background=272727&color=fff&name=YT'">
      <span class="creator-niche">${creator.niche}</span>
    </div>
    <div class="creator-body">
      <h2>${creator.name}</h2>
      <div class="creator-meta">${creator.handle} • ${creator.country}</div>
      <div class="creator-value ${revealValue ? "revealed-value" : "mystery"}">
        ${revealValue ? `<strong>${cfg.display(creator)}</strong><small>${cfg.label}</small>` : `<strong>???</strong><small>${cfg.label}</small>`}
      </div>
    </div>`;
}

function renderHigherLowerRound(revealRight, animateIn = false) {
  $("#hlScore").textContent = higherLowerScore;
  $("#hlBest").textContent = getHigherLowerBest();
  $("#leftCreatorCard").innerHTML = renderCreatorBattleCard(leftCreator, true);
  $("#rightCreatorCard").innerHTML = renderCreatorBattleCard(rightCreator, revealRight);

  if (animateIn) {
    $("#leftCreatorCard").classList.add("card-enter-left");
    $("#rightCreatorCard").classList.add("card-enter-right");
    setTimeout(() => {
      $("#leftCreatorCard").classList.remove("card-enter-left");
      $("#rightCreatorCard").classList.remove("card-enter-right");
    }, 500);
  }
}

function answerHigherLower(answer) {
  if (roundLocked || !selectedMetric) return;
  roundLocked = true;

  const leftValue = Number(leftCreator[selectedMetric] || 0);
  const rightValue = Number(rightCreator[selectedMetric] || 0);
  const correctAnswer = rightValue >= leftValue ? "higher" : "lower";
  const isCorrect = answer === correctAnswer;

  $("#rightCreatorCard").innerHTML = renderCreatorBattleCard(rightCreator, true);
  $("#rightCreatorCard").classList.add("reveal-pop");
  $$(".answer-btn").forEach(button => button.disabled = true);

  const clicked = $(`.answer-btn[data-answer="${answer}"]`);
  clicked.classList.add(isCorrect ? "correct" : "wrong");

  if (isCorrect) {
    higherLowerScore += 1;
    saveHigherLowerBest(higherLowerScore);
    $("#hlScore").textContent = higherLowerScore;
    $("#hlBest").textContent = getHigherLowerBest();
    $("#roundFeedback").textContent = `Correct — ${rightCreator.name} has ${metricConfig[selectedMetric].display(rightCreator)} ${metricConfig[selectedMetric].label.toLowerCase()}.`;
    $("#roundFeedback").className = "round-feedback good show-feedback";
    pulseScore();

    setTimeout(() => {
      leftCreator = rightCreator;
      rightCreator = randomCreator([leftCreator.id]);
      roundLocked = false;
      $("#roundFeedback").textContent = "";
      $("#roundFeedback").className = "round-feedback";
      $$(".answer-btn").forEach(button => {
        button.disabled = false;
        button.classList.remove("correct", "wrong");
      });
      renderHigherLowerRound(false, true);
    }, 1200);
  } else {
    const correctButton = $(`.answer-btn[data-answer="${correctAnswer}"]`);
    correctButton.classList.add("correct");
    $("#roundFeedback").textContent = `Wrong — the correct answer was ${correctAnswer.toUpperCase()}.`;
    $("#roundFeedback").className = "round-feedback bad show-feedback";
    shakeElement($("#rightCreatorCard"));
    setTimeout(showHigherLowerGameOver, 1100);
  }
}

function pulseScore() {
  const score = $("#hlScore");
  score.classList.remove("score-pop");
  void score.offsetWidth;
  score.classList.add("score-pop");
}

function shakeElement(element) {
  element.classList.remove("shake");
  void element.offsetWidth;
  element.classList.add("shake");
}

function showHigherLowerGameOver() {
  const cfg = metricConfig[selectedMetric];
  $("#higherLowerGame").classList.add("hidden");
  $("#finalScore").textContent = higherLowerScore;
  $("#correctAnswerText").textContent = `${rightCreator.name}: ${cfg.display(rightCreator)} ${cfg.label.toLowerCase()}. Best streak: ${getHigherLowerBest()}.`;
  $("#gameOverPanel").classList.remove("hidden");
  updatePlayerStats();
}

function getHigherLowerBest() {
  return Number(localStorage.getItem(STORAGE_KEYS.higherLowerBest) || 0);
}

function saveHigherLowerBest(score) {
  if (score > getHigherLowerBest()) localStorage.setItem(STORAGE_KEYS.higherLowerBest, String(score));
}

function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dayNumberFromDate(dateKey) {
  const start = new Date("2026-01-01T00:00:00");
  const current = new Date(`${dateKey}T00:00:00`);
  return Math.max(1, Math.floor((current - start) / 86400000) + 1);
}

function hashString(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function creatorDatasetSignature() {
  return creators.map(c => `${c.id}:${c.name}`).sort().join("|");
}

function getDailyAnswer(dateKey) {
  const seed = hashString(`${dateKey}|${creatorDatasetSignature()}`);
  return creators[seed % creators.length];
}

function defaultDailyState(dateKey) {
  return { date: dateKey, guesses: [], completed: false, won: false, statsRecorded: false };
}

function loadDailyState(dateKey) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.dailyStatePrefix + dateKey);
    if (!raw) return defaultDailyState(dateKey);
    const parsed = JSON.parse(raw);
    return {
      date: dateKey,
      guesses: Array.isArray(parsed.guesses) ? parsed.guesses : [],
      completed: Boolean(parsed.completed),
      won: Boolean(parsed.won),
      statsRecorded: Boolean(parsed.statsRecorded)
    };
  } catch {
    return defaultDailyState(dateKey);
  }
}

function saveDailyState() {
  localStorage.setItem(STORAGE_KEYS.dailyStatePrefix + dailyState.date, JSON.stringify(dailyState));
}

function setupDailyGame() {
  const dateKey = localDateKey();
  dailyAnswer = getDailyAnswer(dateKey);
  dailyState = loadDailyState(dateKey);
  dailySelectedCreator = null;
}

function renderDailyGame() {
  if (!dailyState) setupDailyGame();
  $("#dailyNumber").textContent = `Daily #${dayNumberFromDate(dailyState.date)}`;
  $("#dailyDateText").textContent = new Date(`${dailyState.date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric", year: "numeric"
  });
  $("#attemptCount").textContent = dailyState.guesses.length;
  renderGuessHistory();
  renderDailyCompletion();
}

function findCreatorById(id) {
  return creators.find(creator => String(creator.id) === String(id));
}

function renderGuessHistory() {
  const history = $("#guessHistory");
  history.innerHTML = "";
  dailyState.guesses.forEach((id, rowIndex) => {
    const guess = findCreatorById(id);
    if (!guess) return;
    history.insertAdjacentHTML("beforeend", createGuessRow(guess, rowIndex));
  });
}

function createGuessRow(guess, rowIndex = 0) {
  const cells = [
    { value: guess.name, state: String(guess.id) === String(dailyAnswer.id) ? "exact" : "miss", sub: guess.handle },
    { value: guess.country, state: textState(guess.country, dailyAnswer.country), sub: "Country" },
    { value: guess.niche, state: textState(guess.niche, dailyAnswer.niche), sub: "Niche" },
    numericClue(guess.rawSubs, dailyAnswer.rawSubs, guess.subscribers, "Subscribers", 0.2),
    numericClue(guess.rawViews, dailyAnswer.rawViews, guess.totalViews, "Views", 0.25),
    numericClue(guess.joinedYear, dailyAnswer.joinedYear, guess.joinedYear, "Joined", 2)
  ];

  return `<div class="guess-row">${cells.map((cell, index) => `
    <div class="clue-cell ${cell.state}" style="animation-delay:${index * 75 + rowIndex * 10}ms">
      <strong>${cell.value}</strong>
      <small>${cell.sub || ""}</small>
    </div>`).join("")}</div>`;
}

function textState(a, b) {
  return String(a).toLowerCase() === String(b).toLowerCase() ? "exact" : "miss";
}

function numericClue(guess, target, display, label, closeThreshold) {
  const a = Number(guess || 0);
  const b = Number(target || 0);
  const exact = a === b;
  let close = false;

  if (!exact) {
    if (label === "Joined") close = Math.abs(a - b) <= closeThreshold;
    else close = b > 0 && Math.abs(a - b) / b <= closeThreshold;
  }

  const direction = exact ? "✓" : b > a ? "↑" : "↓";
  return {
    value: `${display} ${direction}`,
    state: exact ? "exact" : close ? "close" : "miss",
    sub: label
  };
}

function handleDailyInput() {
  if (dailyState.completed) return;
  const query = $("#creatorGuessInput").value.trim().toLowerCase();
  dailySelectedCreator = null;
  activeSuggestionIndex = -1;

  if (!query) {
    $("#autocompleteList").classList.add("hidden");
    $("#submitGuessButton").disabled = true;
    return;
  }

  const guessedIds = new Set(dailyState.guesses.map(String));
  const matches = creators
    .filter(c => !guessedIds.has(String(c.id)))
    .filter(c => c.name.toLowerCase().includes(query) || c.handle.toLowerCase().includes(query))
    .slice(0, 8);

  renderSuggestions(matches);
  const exact = matches.find(c => c.name.toLowerCase() === query || c.handle.toLowerCase() === query);
  if (exact) selectDailyCreator(exact, false);
}

function renderSuggestions(matches) {
  const list = $("#autocompleteList");
  if (!matches.length) {
    list.innerHTML = `<div class="empty-suggestion"><strong>No matching creator</strong><small>Choose a creator from the API dataset.</small></div>`;
    list.classList.remove("hidden");
    return;
  }

  list.innerHTML = matches.map((creator, index) => `
    <button class="suggestion" type="button" role="option" data-id="${creator.id}" data-index="${index}">
      <img src="${creator.avatar}" alt="" onerror="this.src='https://ui-avatars.com/api/?background=272727&color=fff&name=YT'">
      <span><strong>${creator.name}</strong><small>${creator.handle} • ${creator.niche}</small></span>
    </button>`).join("");
  list.classList.remove("hidden");
}

function selectDailyCreator(creator, closeList = true) {
  dailySelectedCreator = creator;
  $("#creatorGuessInput").value = creator.name;
  $("#submitGuessButton").disabled = false;
  if (closeList) $("#autocompleteList").classList.add("hidden");
}

function submitDailyGuess() {
  if (dailyState.completed || !dailySelectedCreator) return;
  if (dailyState.guesses.some(id => String(id) === String(dailySelectedCreator.id))) {
    showToast("You already guessed that creator.");
    return;
  }

  dailyState.guesses.push(dailySelectedCreator.id);
  if (String(dailySelectedCreator.id) === String(dailyAnswer.id)) {
    dailyState.completed = true;
    dailyState.won = true;
    finishDailyGame();
  } else if (dailyState.guesses.length >= DAILY_MAX_GUESSES) {
    dailyState.completed = true;
    dailyState.won = false;
    finishDailyGame();
  }

  saveDailyState();
  dailySelectedCreator = null;
  $("#creatorGuessInput").value = "";
  $("#submitGuessButton").disabled = true;
  $("#autocompleteList").classList.add("hidden");
  renderDailyGame();
}

function finishDailyGame() {
  if (dailyState.statsRecorded) return;

  const stats = getDailyStats();
  stats.gamesPlayed += 1;
  if (dailyState.won) stats.wins += 1;

  const previousDate = stats.lastCompletedDate;
  const yesterday = new Date(`${dailyState.date}T00:00:00`);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = localDateKey(yesterday);

  if (dailyState.won) {
    stats.currentStreak = previousDate === yesterdayKey ? stats.currentStreak + 1 : 1;
    stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
  } else {
    stats.currentStreak = 0;
  }

  stats.lastCompletedDate = dailyState.date;
  localStorage.setItem(STORAGE_KEYS.dailyStats, JSON.stringify(stats));
  dailyState.statsRecorded = true;

  if (dailyState.won) launchConfetti();
}

function getDailyStats() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.dailyStats) || "{}");
    return {
      gamesPlayed: Number(parsed.gamesPlayed || 0),
      wins: Number(parsed.wins || 0),
      currentStreak: Number(parsed.currentStreak || 0),
      longestStreak: Number(parsed.longestStreak || 0),
      lastCompletedDate: parsed.lastCompletedDate || null
    };
  } catch {
    return { gamesPlayed: 0, wins: 0, currentStreak: 0, longestStreak: 0, lastCompletedDate: null };
  }
}

function renderDailyCompletion() {
  const inputArea = $("#dailyInputArea");
  const result = $("#dailyResult");
  inputArea.classList.toggle("hidden", dailyState.completed);

  if (!dailyState.completed) {
    result.classList.add("hidden");
    result.innerHTML = "";
    return;
  }

  const stats = getDailyStats();
  result.classList.remove("hidden");
  result.innerHTML = `
    <div class="result-avatar-wrap"><img src="${dailyAnswer.avatar}" alt="${dailyAnswer.name} avatar" onerror="this.src='https://ui-avatars.com/api/?background=272727&color=fff&name=YT'"></div>
    <p class="eyebrow">${dailyState.won ? "YOU GOT IT" : "ANSWER REVEALED"}</p>
    <h2>${dailyAnswer.name}</h2>
    <p>${dailyState.won ? `Solved in ${dailyState.guesses.length}/${DAILY_MAX_GUESSES} guesses.` : `Today's mystery creator was ${dailyAnswer.name}.`} Come back tomorrow for a new creator.</p>
    <div class="result-stats">
      <span class="result-pill">Current streak: ${stats.currentStreak}</span>
      <span class="result-pill">Longest streak: ${stats.longestStreak}</span>
      <span class="result-pill">Wins: ${stats.wins}/${stats.gamesPlayed}</span>
    </div>
    <button id="shareDailyButton" class="btn btn-secondary" type="button">Share Result</button>`;

  $("#shareDailyButton").addEventListener("click", shareDailyResult);
}

function shareDailyResult() {
  const rows = dailyState.guesses.map(id => {
    const guess = findCreatorById(id);
    if (!guess) return "";
    const states = [
      String(guess.id) === String(dailyAnswer.id) ? "exact" : "miss",
      textState(guess.country, dailyAnswer.country),
      textState(guess.niche, dailyAnswer.niche),
      numericClue(guess.rawSubs, dailyAnswer.rawSubs, guess.subscribers, "Subscribers", .2).state,
      numericClue(guess.rawViews, dailyAnswer.rawViews, guess.totalViews, "Views", .25).state,
      numericClue(guess.joinedYear, dailyAnswer.joinedYear, guess.joinedYear, "Joined", 2).state
    ];
    return states.map(state => state === "exact" ? "🟩" : state === "close" ? "🟨" : "⬛").join("");
  }).join("\n");

  const score = dailyState.won ? `${dailyState.guesses.length}/${DAILY_MAX_GUESSES}` : `X/${DAILY_MAX_GUESSES}`;
  const text = `YouTube Daily #${dayNumberFromDate(dailyState.date)}\n${rows}\n${score}`;

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(() => showToast("Result copied to clipboard!"));
  } else {
    showToast("Clipboard is not supported in this browser.");
  }
}

function launchConfetti() {
  const layer = $("#confettiLayer");
  layer.innerHTML = "";
  for (let i = 0; i < 34; i += 1) {
    const piece = document.createElement("i");
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.animationDelay = `${Math.random() * 0.5}s`;
    piece.style.animationDuration = `${1.8 + Math.random() * 1.2}s`;
    piece.style.setProperty("--drift", `${-80 + Math.random() * 160}px`);
    layer.appendChild(piece);
  }
  setTimeout(() => layer.replaceChildren(), 3600);
}

function animateStatNumber(element, target) {
  const end = Number(target || 0);
  const start = Number(element.textContent || 0);
  if (end === start) return;
  const duration = 450;
  const started = performance.now();
  function frame(now) {
    const progress = Math.min(1, (now - started) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = Math.round(start + (end - start) * eased);
    if (progress < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function updatePlayerStats() {
  const daily = getDailyStats();
  animateStatNumber($("#bestHigherLower"), getHigherLowerBest());
  animateStatNumber($("#dailyGames"), daily.gamesPlayed);
  animateStatNumber($("#dailyWins"), daily.wins);
  animateStatNumber($("#dailyStreak"), daily.currentStreak);
}

function setupCardMotion() {
  if (window.matchMedia("(pointer: coarse)").matches) return;
  $$(".mode-card").forEach(card => {
    card.addEventListener("pointermove", event => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.setProperty("--rx", `${(-y * 3).toFixed(2)}deg`);
      card.style.setProperty("--ry", `${(x * 4).toFixed(2)}deg`);
      card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      card.style.setProperty("--my", `${event.clientY - rect.top}px`);
    });
    card.addEventListener("pointerleave", () => {
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
    });
  });
}

function setupEvents() {
  $$('[data-route]').forEach(element => {
    element.addEventListener("click", () => navigateTo(element.dataset.route));
  });

  $$(".metric-btn").forEach(button => button.addEventListener("click", () => startHigherLower(button.dataset.metric)));
  $$(".answer-btn").forEach(button => button.addEventListener("click", () => answerHigherLower(button.dataset.answer)));

  $("#changeMetricButton").addEventListener("click", resetHigherLowerToPicker);
  $("#playAgainButton").addEventListener("click", () => startHigherLower(selectedMetric));
  $("#retryButton").addEventListener("click", loadCreators);
  $("#showApiHelpButton").addEventListener("click", () => $("#apiHelp").classList.toggle("hidden"));

  $("#creatorGuessInput").addEventListener("input", handleDailyInput);
  $("#creatorGuessInput").addEventListener("keydown", event => {
    const suggestions = $$("#autocompleteList .suggestion[data-id]");
    if (event.key === "ArrowDown" && suggestions.length) {
      event.preventDefault();
      activeSuggestionIndex = Math.min(activeSuggestionIndex + 1, suggestions.length - 1);
      suggestions.forEach((item, index) => item.classList.toggle("active", index === activeSuggestionIndex));
    } else if (event.key === "ArrowUp" && suggestions.length) {
      event.preventDefault();
      activeSuggestionIndex = Math.max(activeSuggestionIndex - 1, 0);
      suggestions.forEach((item, index) => item.classList.toggle("active", index === activeSuggestionIndex));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (activeSuggestionIndex >= 0 && suggestions[activeSuggestionIndex]) {
        selectDailyCreator(findCreatorById(suggestions[activeSuggestionIndex].dataset.id));
      } else if (dailySelectedCreator) {
        submitDailyGuess();
      }
    } else if (event.key === "Escape") {
      $("#autocompleteList").classList.add("hidden");
    }
  });

  $("#autocompleteList").addEventListener("click", event => {
    const button = event.target.closest(".suggestion[data-id]");
    if (!button) return;
    const creator = findCreatorById(button.dataset.id);
    if (creator) selectDailyCreator(creator);
  });

  $("#submitGuessButton").addEventListener("click", submitDailyGuess);

  document.addEventListener("click", event => {
    if (!event.target.closest(".autocomplete-wrap")) $("#autocompleteList").classList.add("hidden");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupEvents();
  setupCardMotion();
  loadCreators();
});
