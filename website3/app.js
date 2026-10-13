// API CONFIGURATION
// Put ONLY the domain that contains api/index.py here. Do not add /api/v1.
const API_BASE_URL = "https://my-fastapi-service-sigma.vercel.app/";
const API_KEY = "supersecret123";
const API_TIMEOUT_MS = 12000;
const API_ENDPOINTS = [
  { path: "/api/v1/creators", protected: true },
  { path: "/creators", protected: false }
];

// WEBSITE NAVIGATION
const SITE_URLS = {
  archive: "https://my-fastapi-service-sigma.vercel.app/",
  games: "https://my-fastapi-service-website2.vercel.app//",
  matcher: "https://my-fastapi-service-website3.vercel.app/"
};

const STORAGE_KEY = "youtubeTasteMatcherResultsV1";

const state = {
  creators: [],
  currentQuestion: 0,
  answers: {},
  recommendations: [],
  currentModalId: null
};

const screens = {
  landing: document.getElementById("landingScreen"),
  quiz: document.getElementById("quizScreen"),
  analysis: document.getElementById("analysisScreen"),
  results: document.getElementById("resultsScreen"),
  error: document.getElementById("errorScreen")
};

const questionCounter = document.getElementById("questionCounter");
const quizProgress = document.getElementById("quizProgress");
const questionEyebrow = document.getElementById("questionEyebrow");
const questionTitle = document.getElementById("questionTitle");
const questionHelp = document.getElementById("questionHelp");
const optionsGrid = document.getElementById("optionsGrid");
const sliderWrap = document.getElementById("sliderWrap");
const backButton = document.getElementById("backButton");
const continueButton = document.getElementById("continueButton");
const resultsList = document.getElementById("resultsList");
const tasteProfile = document.getElementById("tasteProfile");
const creatorModal = document.getElementById("creatorModal");
const modalBanner = document.getElementById("modalBanner");
const modalBody = document.getElementById("modalBody");

function showScreen(name) {
  Object.values(screens).forEach(screen => screen.classList.remove("active"));
  screens[name].classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setNavigation() {
  document.getElementById("archiveLink").href = SITE_URLS.archive;
  document.getElementById("gamesLink").href = SITE_URLS.games;
  document.getElementById("matcherLink").href = SITE_URLS.matcher;
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

function buildApiBases() {
  const bases = [];

  // When deployed together with the FastAPI project, try the current origin first.
  if (window.location.protocol === "http:" || window.location.protocol === "https:") {
    bases.push(window.location.origin);
  }

  const configured = API_BASE_URL.trim().replace(/\/$/, "");
  if (configured && !bases.includes(configured)) bases.push(configured);

  return bases;
}

async function loadCreators() {
  const bases = buildApiBases();
  let lastError = null;

  if (!bases.length) {
    throw new Error("No API host is configured. Open this project with Live Server and check API_BASE_URL in app.js.");
  }

  for (const base of bases) {
    for (const endpoint of API_ENDPOINTS) {
      try {
        const headers = { Accept: "application/json" };
        if (endpoint.protected) headers["x-api-key"] = API_KEY;

        const response = await fetchWithTimeout(`${base}${endpoint.path}`, {
          method: "GET",
          headers,
          cache: "no-store"
        });

        if (!response.ok) {
          lastError = new Error(`API request failed with status ${response.status} at ${endpoint.path}.`);
          continue;
        }

        let data;
        try {
          data = await response.json();
        } catch {
          lastError = new Error("The API returned invalid JSON.");
          continue;
        }

        if (!data || !Array.isArray(data.creators)) {
          lastError = new Error("The API response did not include a creators array.");
          continue;
        }

        const validCreators = data.creators.filter(creator =>
          creator &&
          typeof creator.id !== "undefined" &&
          typeof creator.name === "string" &&
          typeof creator.niche === "string"
        );

        if (!validCreators.length) {
          lastError = new Error("The API returned no usable creators.");
          continue;
        }

        state.creators = validCreators;
        return validCreators;
      } catch (error) {
        if (error?.name === "AbortError") {
          lastError = new Error("The API request timed out.");
        } else {
          lastError = error;
        }
      }
    }
  }

  if (window.location.protocol === "file:") {
    throw new Error(
      "Failed to reach the API while this page is opened as a local file. Open web3/index.html with VS Code Live Server (http://127.0.0.1:5500/...) and try again. If it still fails, set API_BASE_URL to the deployment that contains api/index.py."
    );
  }

  throw lastError || new Error("Could not reach the creator API.");
}

function getAvailableNiches() {
  return [...new Set(state.creators.map(c => c.niche).filter(Boolean))].sort();
}

function getAvailableCountries() {
  return [...new Set(state.creators.map(c => c.country).filter(Boolean))].sort();
}

function nicheOptions(excludePrimary = false) {
  const primary = state.answers.primaryNiche;
  return getAvailableNiches()
    .filter(niche => !excludePrimary || niche !== primary)
    .map(niche => ({ value: niche, label: niche }));
}

function countryOptions() {
  return [
    { value: "none", label: "No preference", description: "Recommend creators from anywhere." },
    ...getAvailableCountries().map(country => ({ value: country, label: country }))
  ];
}

const questions = [
  {
    key: "primaryNiche",
    eyebrow: "CONTENT DNA",
    title: "What type of content interests you the most?",
    help: "This is the strongest signal in your match score.",
    options: () => nicheOptions(false)
  },
  {
    key: "secondaryNiche",
    eyebrow: "SECOND SIGNAL",
    title: "What is your second favorite category?",
    help: "Pick another niche so we can make your recommendations less one-dimensional.",
    options: () => [{ value: "none", label: "No second category" }, ...nicheOptions(true)]
  },
  {
    key: "creatorSize",
    eyebrow: "CREATOR SCALE",
    title: "What kind of creator do you prefer?",
    help: "Subscriber ranges are compared with each creator's raw subscriber count.",
    options: () => [
      { value: "massive", label: "Huge mainstream creator", description: "50M+ subscribers" },
      { value: "large", label: "Popular creator", description: "20M–49.9M subscribers" },
      { value: "medium", label: "Medium-size creator", description: "5M–19.9M subscribers" },
      { value: "small", label: "Smaller creator", description: "Under 5M subscribers" },
      { value: "none", label: "No preference" }
    ]
  },
  {
    key: "librarySize",
    eyebrow: "WATCH DEPTH",
    title: "How big should their content library be?",
    help: "We compare your choice with each channel's video count.",
    options: () => [
      { value: "large", label: "Lots of videos", description: "A deep library with thousands of uploads" },
      { value: "medium", label: "Moderate amount", description: "Enough variety without being endless" },
      { value: "small", label: "Smaller curated library", description: "A tighter catalog" },
      { value: "none", label: "Doesn't matter" }
    ]
  },
  {
    key: "creatorEra",
    eyebrow: "CHANNEL ERA",
    title: "Do you prefer YouTube veterans or newer creators?",
    help: "Joined year is used to estimate how established a channel is.",
    options: () => [
      { value: "veteran", label: "YouTube veterans", description: "Joined 2011 or earlier" },
      { value: "established", label: "Established creators", description: "Joined 2012–2017" },
      { value: "new", label: "New generation", description: "Joined 2018 or later" },
      { value: "none", label: "Doesn't matter" }
    ]
  },
  {
    key: "viewPopularity",
    eyebrow: "POPULARITY",
    title: "How important are massive total view counts?",
    help: "This compares your preference with the creator's real raw view count.",
    options: () => [
      { value: "massive", label: "Very popular content", description: "I like creators with huge lifetime reach" },
      { value: "middle", label: "Somewhere in the middle", description: "Popular, but not necessarily enormous" },
      { value: "none", label: "Popularity doesn't matter" }
    ]
  },
  {
    key: "country",
    eyebrow: "LOCATION",
    title: "Would you like creators from a particular country?",
    help: "These options come directly from countries available in the API.",
    options: countryOptions
  },
  {
    key: "priority",
    eyebrow: "WHAT MATTERS MOST",
    title: "Which signal should have extra influence?",
    help: "This changes the weighting of your final compatibility score.",
    options: () => [
      { value: "entertainment", label: "Content fit", description: "Prioritize niche/category matches" },
      { value: "information", label: "Channel depth", description: "Prioritize library size and longevity" },
      { value: "personality", label: "Creator identity", description: "Prioritize country and channel era" },
      { value: "popularity", label: "Popularity", description: "Prioritize subscribers and total views" }
    ]
  },
  {
    key: "nicheImportance",
    eyebrow: "MATCH PRECISION",
    title: "How important is your favorite category?",
    help: "Higher values make niche matching more important in the final score.",
    type: "slider",
    min: 1,
    max: 5,
    defaultValue: 4
  },
  {
    key: "discovery",
    eyebrow: "DISCOVERY MODE",
    title: "How far outside your usual interests should we explore?",
    help: "This changes how heavily category matches are weighted compared with other traits.",
    options: () => [
      { value: "surprise", label: "Yes, surprise me", description: "Let strong non-category traits compete" },
      { value: "balanced", label: "A little", description: "Balance category fit with discovery" },
      { value: "accurate", label: "Keep it very accurate", description: "Make category fit dominant" }
    ]
  }
];

function renderQuestion() {
  const question = questions[state.currentQuestion];
  questionCounter.textContent = `Question ${state.currentQuestion + 1} of ${questions.length}`;
  quizProgress.style.width = `${((state.currentQuestion + 1) / questions.length) * 100}%`;
  questionEyebrow.textContent = question.eyebrow;
  questionTitle.textContent = question.title;
  questionHelp.textContent = question.help || "";
  backButton.disabled = state.currentQuestion === 0;
  continueButton.textContent = state.currentQuestion === questions.length - 1 ? "SEE MY MATCHES →" : "CONTINUE →";

  optionsGrid.innerHTML = "";
  sliderWrap.innerHTML = "";
  sliderWrap.classList.add("hidden");
  optionsGrid.classList.remove("hidden");

  if (question.type === "slider") {
    optionsGrid.classList.add("hidden");
    sliderWrap.classList.remove("hidden");
    const currentValue = Number(state.answers[question.key] || question.defaultValue);
    state.answers[question.key] = currentValue;
    sliderWrap.innerHTML = `
      <div class="slider-value" id="sliderValue">${currentValue}</div>
      <input id="questionSlider" type="range" min="${question.min}" max="${question.max}" step="1" value="${currentValue}">
      <div class="slider-labels"><span>Not Important</span><span>Very Important</span></div>
    `;
    const slider = document.getElementById("questionSlider");
    const value = document.getElementById("sliderValue");
    slider.addEventListener("input", () => {
      state.answers[question.key] = Number(slider.value);
      value.textContent = slider.value;
      updateContinueState();
    });
  } else {
    const options = question.options();
    options.forEach(option => {
      const button = document.createElement("button");
      button.className = "option-card";
      if (state.answers[question.key] === option.value) button.classList.add("selected");
      button.innerHTML = `<strong>${escapeHtml(option.label)}</strong>${option.description ? `<small>${escapeHtml(option.description)}</small>` : ""}`;
      button.addEventListener("click", () => {
        state.answers[question.key] = option.value;
        document.querySelectorAll(".option-card").forEach(card => card.classList.remove("selected"));
        button.classList.add("selected");
        updateContinueState();
      });
      optionsGrid.appendChild(button);
    });
  }

  updateContinueState();
}

function updateContinueState() {
  const question = questions[state.currentQuestion];
  continueButton.disabled = typeof state.answers[question.key] === "undefined" || state.answers[question.key] === "";
}

function startQuiz(fromBeginning = true) {
  if (!state.creators.length) {
    attemptLoadAndStart();
    return;
  }
  if (fromBeginning) {
    state.currentQuestion = 0;
    state.answers = {};
  }
  renderQuestion();
  showScreen("quiz");
}

async function attemptLoadAndStart() {
  showScreen("analysis");
  document.getElementById("analysisMessage").textContent = "Connecting to the YouTuber API...";
  document.getElementById("analysisProgressFill").style.width = "30%";
  try {
    await loadCreators();
    document.getElementById("analysisProgressFill").style.width = "100%";
    setTimeout(() => startQuiz(true), 250);
  } catch (error) {
    showApiError(error);
  }
}

function scoreRange(value, min, max, softMargin = 0.3) {
  if (!Number.isFinite(value)) return 0;
  if (value >= min && value <= max) return 1;
  const width = Math.max(1, max - min);
  const distance = value < min ? min - value : value - max;
  return Math.max(0, 1 - distance / (width * softMargin + 1));
}

function subscriberFit(creator, preference) {
  const value = Number(creator.rawSubs);
  if (!Number.isFinite(value) || preference === "none") return null;
  if (preference === "small") return value < 5_000_000 ? 1 : Math.max(0, 1 - (value - 5_000_000) / 15_000_000);
  if (preference === "medium") return scoreRange(value, 5_000_000, 20_000_000, .8);
  if (preference === "large") return scoreRange(value, 20_000_000, 50_000_000, .8);
  if (preference === "massive") return value >= 50_000_000 ? 1 : Math.max(0, value / 50_000_000);
  return 0;
}

function libraryFit(creator, preference) {
  const value = Number(creator.videoCount);
  if (!Number.isFinite(value) || preference === "none") return null;
  if (preference === "small") return value <= 700 ? 1 : Math.max(0, 1 - (value - 700) / 2500);
  if (preference === "medium") return scoreRange(value, 700, 3000, .75);
  if (preference === "large") return value >= 3000 ? 1 : Math.min(1, value / 3000);
  return 0;
}

function eraFit(creator, preference) {
  const year = Number(creator.joinedYear);
  if (!Number.isFinite(year) || preference === "none") return null;
  if (preference === "veteran") return year <= 2011 ? 1 : Math.max(0, 1 - (year - 2011) / 7);
  if (preference === "established") return scoreRange(year, 2012, 2017, 1.2);
  if (preference === "new") return year >= 2018 ? 1 : Math.max(0, 1 - (2018 - year) / 7);
  return 0;
}

function viewsFit(creator, preference) {
  const value = Number(creator.rawViews);
  if (!Number.isFinite(value) || preference === "none") return null;
  if (preference === "massive") {
    const target = 10_000_000_000;
    return Math.min(1, Math.log10(Math.max(value, 1)) / Math.log10(target));
  }
  if (preference === "middle") {
    return scoreRange(Math.log10(Math.max(value, 1)), Math.log10(500_000_000), Math.log10(10_000_000_000), .8);
  }
  return 0;
}

function buildWeights() {
  const importance = Number(state.answers.nicheImportance || 3);
  const discovery = state.answers.discovery || "balanced";

  let primary = 28 + (importance - 3) * 4;
  let secondary = 13 + (importance - 3) * 2;
  let size = 15;
  let library = 11;
  let era = 10;
  let views = 13;
  let country = 10;

  if (discovery === "accurate") {
    primary += 8;
    secondary += 3;
    size -= 3;
    views -= 3;
    country -= 2;
  } else if (discovery === "surprise") {
    primary -= 10;
    secondary -= 5;
    size += 4;
    library += 3;
    era += 3;
    views += 3;
    country += 2;
  }

  const priority = state.answers.priority;
  if (priority === "entertainment") { primary += 7; secondary += 3; }
  if (priority === "information") { library += 6; era += 4; }
  if (priority === "personality") { era += 4; country += 6; }
  if (priority === "popularity") { size += 5; views += 5; }

  return { primary, secondary, size, library, era, views, country };
}

function addCriterion(bucket, key, label, weight, fit, reason) {
  if (fit === null || fit === undefined || weight <= 0) return;
  const safeFit = Math.max(0, Math.min(1, fit));
  bucket.possible += weight;
  bucket.earned += weight * safeFit;
  bucket.breakdown[key] = { label, weight, fit: safeFit, earned: weight * safeFit };
  if (safeFit >= .72 && reason) bucket.reasons.push(reason);
}

function scoreCreator(creator) {
  const weights = buildWeights();
  const bucket = { earned: 0, possible: 0, reasons: [], breakdown: {} };

  addCriterion(
    bucket,
    "primaryNiche",
    "Favorite category",
    weights.primary,
    creator.niche === state.answers.primaryNiche ? 1 : 0,
    `Matches your favorite ${state.answers.primaryNiche} category.`
  );

  if (state.answers.secondaryNiche && state.answers.secondaryNiche !== "none") {
    addCriterion(
      bucket,
      "secondaryNiche",
      "Second category",
      weights.secondary,
      creator.niche === state.answers.secondaryNiche ? 1 : 0,
      `Matches your second-choice ${state.answers.secondaryNiche} category.`
    );
  }

  addCriterion(
    bucket,
    "creatorSize",
    "Creator size",
    weights.size,
    subscriberFit(creator, state.answers.creatorSize),
    "Falls inside or near your preferred subscriber range."
  );

  addCriterion(
    bucket,
    "librarySize",
    "Content library",
    weights.library,
    libraryFit(creator, state.answers.librarySize),
    `Their ${formatNumber(creator.videoCount)}-video library fits your preference.`
  );

  addCriterion(
    bucket,
    "creatorEra",
    "Creator era",
    weights.era,
    eraFit(creator, state.answers.creatorEra),
    `Their ${creator.joinedYear} join year matches the creator era you prefer.`
  );

  addCriterion(
    bucket,
    "viewPopularity",
    "Total views",
    weights.views,
    viewsFit(creator, state.answers.viewPopularity),
    "Their total reach fits the popularity level you selected."
  );

  if (state.answers.country && state.answers.country !== "none") {
    addCriterion(
      bucket,
      "country",
      "Country",
      weights.country,
      creator.country === state.answers.country ? 1 : 0,
      `Matches your ${state.answers.country} location preference.`
    );
  }

  const percentage = bucket.possible > 0
    ? Math.round(Math.max(0, Math.min(100, (bucket.earned / bucket.possible) * 100)))
    : 0;

  return { creator, percentage, reasons: bucket.reasons, breakdown: bucket.breakdown };
}

function createRecommendations() {
  return state.creators
    .map(scoreCreator)
    .sort((a, b) => b.percentage - a.percentage || String(a.creator.name).localeCompare(String(b.creator.name)))
    .slice(0, 5);
}

function getMatchLabel(score) {
  if (score >= 90) return "Excellent Match";
  if (score >= 80) return "Great Match";
  if (score >= 70) return "Good Match";
  if (score >= 60) return "Fair Match";
  return "Possible Match";
}

function runAnalysis() {
  showScreen("analysis");
  const messages = [
    "Comparing your favorite categories...",
    "Checking creator size and channel depth...",
    "Measuring popularity and channel era...",
    "Ranking creators by compatibility..."
  ];
  const messageElement = document.getElementById("analysisMessage");
  const fill = document.getElementById("analysisProgressFill");
  fill.style.width = "0%";

  let step = 0;
  const interval = setInterval(() => {
    step += 1;
    messageElement.textContent = messages[Math.min(step - 1, messages.length - 1)];
    fill.style.width = `${Math.min(100, step * 25)}%`;
    if (step === messages.length) {
      clearInterval(interval);
      state.recommendations = createRecommendations();
      saveResults();
      setTimeout(renderResults, 350);
    }
  }, 420);
}

function buildTasteProfile() {
  const primary = state.answers.primaryNiche || "Mixed";
  const discoveryLabel = {
    surprise: "Explorer",
    balanced: "Balanced",
    accurate: "Precision"
  }[state.answers.discovery] || "Balanced";

  const sizeLabel = {
    massive: "Mainstream",
    large: "Popular",
    medium: "Mid-size",
    small: "Smaller",
    none: "Any Size"
  }[state.answers.creatorSize] || "Any Size";

  const libraryLabel = {
    large: "Large",
    medium: "Moderate",
    small: "Curated",
    none: "Any"
  }[state.answers.librarySize] || "Any";

  const title = `${primary} ${discoveryLabel}`;
  const description = state.answers.discovery === "surprise"
    ? `You like ${primary}, but you are open to creators whose other traits make them worth discovering.`
    : state.answers.discovery === "accurate"
      ? `Your profile strongly favors ${primary} creators that also fit your channel preferences.`
      : `Your profile balances ${primary} relevance with creator size, history, popularity, and channel depth.`;

  tasteProfile.innerHTML = `
    <div class="profile-main">
      <p class="eyebrow">YOUR YOUTUBE PROFILE</p>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(description)}</p>
    </div>
    <div class="profile-stat"><span>Favorite Category</span><strong>${escapeHtml(primary)}</strong></div>
    <div class="profile-stat"><span>Creator Preference</span><strong>${escapeHtml(sizeLabel)}</strong></div>
    <div class="profile-stat"><span>Content Library</span><strong>${escapeHtml(libraryLabel)} · ${escapeHtml(discoveryLabel)}</strong></div>
  `;
}

function renderResults() {
  if (!state.recommendations.length) {
    showApiError(new Error("No recommendations could be created."));
    return;
  }

  buildTasteProfile();
  resultsList.innerHTML = state.recommendations.map((result, index) => {
    const creator = result.creator;
    const reasons = result.reasons.slice(0, 3);
    return `
      <article class="result-card ${index === 0 ? "top-match" : ""}" data-id="${escapeHtml(String(creator.id))}">
        <span class="rank-badge">#${index + 1}</span>
        <img class="creator-avatar" src="${escapeHtml(creator.avatar || "")}" alt="${escapeHtml(creator.name)}" onerror="this.style.visibility='hidden'">
        <div class="creator-copy">
          <h3>${escapeHtml(creator.name)}</h3>
          <div class="creator-handle">${escapeHtml(creator.handle || "")}</div>
          <div class="creator-meta">
            <span>${escapeHtml(creator.niche || "Unknown niche")}</span>
            <span>${escapeHtml(creator.country || "Unknown country")}</span>
            <span>${escapeHtml(creator.subscribers || formatNumber(creator.rawSubs))} subscribers</span>
          </div>
          <div class="reasons">
            ${reasons.map(reason => `<span class="reason">${escapeHtml(reason)}</span>`).join("")}
          </div>
        </div>
        <div class="match-side">
          <div>
            <div class="match-score"><strong>${result.percentage}%</strong><span>match</span></div>
            <div class="match-label">${getMatchLabel(result.percentage)}</div>
          </div>
          <div class="match-bar"><div data-score="${result.percentage}"></div></div>
          <button class="details-button" data-details="${escapeHtml(String(creator.id))}">VIEW DETAILS →</button>
        </div>
      </article>
    `;
  }).join("");

  showScreen("results");

  requestAnimationFrame(() => {
    document.querySelectorAll(".match-bar div").forEach(bar => {
      bar.style.width = `${bar.dataset.score}%`;
    });
  });
}

function openCreatorDetails(id) {
  const result = state.recommendations.find(item => String(item.creator.id) === String(id));
  if (!result) return;
  const creator = result.creator;
  state.currentModalId = creator.id;

  modalBanner.style.backgroundImage = creator.banner ? `url("${creator.banner}")` : "none";
  const video = creator.popularVideo && typeof creator.popularVideo === "object" ? creator.popularVideo : null;

  modalBody.innerHTML = `
    <div class="modal-header">
      <img class="modal-avatar" src="${escapeHtml(creator.avatar || "")}" alt="${escapeHtml(creator.name)}">
      <div>
        <h2 id="modalCreatorName">${escapeHtml(creator.name)}</h2>
        <p>${escapeHtml(creator.handle || "")} · ${escapeHtml(creator.niche || "")}</p>
      </div>
      <div class="modal-score">${result.percentage}%<small>COMPATIBILITY</small></div>
    </div>

    <div class="modal-grid">
      <div class="modal-stat"><span>Country</span><strong>${escapeHtml(creator.country || "N/A")}</strong></div>
      <div class="modal-stat"><span>Subscribers</span><strong>${escapeHtml(creator.subscribers || formatNumber(creator.rawSubs))}</strong></div>
      <div class="modal-stat"><span>Total Views</span><strong>${escapeHtml(creator.totalViews || formatNumber(creator.rawViews))}</strong></div>
      <div class="modal-stat"><span>Videos</span><strong>${escapeHtml(formatNumber(creator.videoCount))}</strong></div>
      <div class="modal-stat"><span>Joined</span><strong>${escapeHtml(String(creator.joinedYear || "N/A"))}</strong></div>
      <div class="modal-stat"><span>Match</span><strong>${getMatchLabel(result.percentage)}</strong></div>
    </div>

    ${creator.bio ? `<section class="modal-section"><h3>About</h3><p>${escapeHtml(creator.bio)}</p></section>` : ""}

    <section class="modal-section">
      <h3>Why this match?</h3>
      <div class="modal-reasons">
        ${result.reasons.length ? result.reasons.map(reason => `<span class="reason">${escapeHtml(reason)}</span>`).join("") : `<span class="reason">This creator ranked well across your active matching criteria.</span>`}
      </div>
    </section>

    ${video && (video.title || video.thumb || video.views) ? `
      <section class="modal-section">
        <h3>Recommended Video</h3>
        <div class="video-card">
          ${video.thumb ? `<img src="${escapeHtml(video.thumb)}" alt="Recommended video thumbnail">` : ""}
          <div><strong>${escapeHtml(video.title || "Popular video")}</strong><span>${escapeHtml(video.views || "")}</span></div>
        </div>
      </section>
    ` : ""}
  `;

  creatorModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeCreatorDetails() {
  creatorModal.classList.add("hidden");
  document.body.style.overflow = "";
  state.currentModalId = null;
}

function saveResults() {
  const payload = {
    answers: state.answers,
    recommendations: state.recommendations.map(item => ({
      creatorId: item.creator.id,
      percentage: item.percentage,
      reasons: item.reasons,
      breakdown: item.breakdown
    }))
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  updateSavedStateUI();
}

function getSavedResults() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

function restoreSavedResults() {
  const saved = getSavedResults();
  if (!saved || !saved.answers || !Array.isArray(saved.recommendations) || !state.creators.length) return false;

  state.answers = saved.answers;
  state.recommendations = saved.recommendations
    .map(savedItem => {
      const creator = state.creators.find(c => String(c.id) === String(savedItem.creatorId));
      return creator ? { creator, percentage: savedItem.percentage, reasons: savedItem.reasons || [], breakdown: savedItem.breakdown || {} } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.percentage - a.percentage);

  if (!state.recommendations.length) return false;
  renderResults();
  return true;
}

function updateSavedStateUI() {
  const hasSaved = Boolean(getSavedResults());
  document.getElementById("viewSavedButton").classList.toggle("hidden", !hasSaved);
  document.getElementById("welcomeBack").classList.toggle("hidden", !hasSaved);
}

function surpriseMe() {
  if (state.recommendations.length < 2) return;
  const topPool = state.recommendations.slice(0, Math.min(5, state.recommendations.length));
  const bestDifferentNiche = topPool.find(item => item.creator.niche !== state.answers.primaryNiche) || topPool[1] || topPool[0];
  openCreatorDetails(bestDifferentNiche.creator.id);
}

function showApiError(error) {
  console.error(error);
  document.getElementById("errorMessage").textContent = error?.message || "Check your API configuration and try again.";
  showScreen("error");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "N/A";
  return new Intl.NumberFormat("en-US", { notation: number >= 1_000_000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(number);
}

function bindEvents() {
  document.getElementById("startButton").addEventListener("click", () => startQuiz(true));
  document.getElementById("viewSavedButton").addEventListener("click", async () => {
    try {
      if (!state.creators.length) await loadCreators();
      if (!restoreSavedResults()) startQuiz(true);
    } catch (error) { showApiError(error); }
  });
  document.getElementById("retakeFromHome").addEventListener("click", () => startQuiz(true));
  document.getElementById("brandHome").addEventListener("click", event => { event.preventDefault(); showScreen("landing"); });
  document.getElementById("homeFromResults").addEventListener("click", () => showScreen("landing"));
  document.getElementById("exitQuizButton").addEventListener("click", () => showScreen("landing"));

  backButton.addEventListener("click", () => {
    if (state.currentQuestion > 0) {
      state.currentQuestion -= 1;
      renderQuestion();
    }
  });

  continueButton.addEventListener("click", () => {
    if (continueButton.disabled) return;
    if (state.currentQuestion < questions.length - 1) {
      state.currentQuestion += 1;
      renderQuestion();
    } else {
      runAnalysis();
    }
  });

  document.getElementById("retakeButton").addEventListener("click", () => startQuiz(true));
  document.getElementById("changeAnswersButton").addEventListener("click", () => {
    state.currentQuestion = 0;
    renderQuestion();
    showScreen("quiz");
  });
  document.getElementById("surpriseButton").addEventListener("click", surpriseMe);
  document.getElementById("retryButton").addEventListener("click", attemptLoadAndStart);

  resultsList.addEventListener("click", event => {
    const button = event.target.closest("[data-details]");
    if (button) openCreatorDetails(button.dataset.details);
  });

  document.getElementById("closeModal").addEventListener("click", closeCreatorDetails);
  creatorModal.addEventListener("click", event => {
    if (event.target === creatorModal) closeCreatorDetails();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !creatorModal.classList.contains("hidden")) closeCreatorDetails();
  });

  const navToggle = document.getElementById("navToggle");
  const siteNav = document.getElementById("siteNav");
  navToggle.addEventListener("click", () => {
    siteNav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", siteNav.classList.contains("open") ? "true" : "false");
  });
}

async function initialize() {
  setNavigation();
  bindEvents();
  updateSavedStateUI();

  try {
    await loadCreators();
  } catch (error) {
    console.warn("Creator data will be retried when the quiz starts.", error);
  }
}

initialize();
