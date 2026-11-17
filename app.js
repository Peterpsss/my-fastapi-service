// Dynamic dataset loaded from FastAPI backend (Neon Database)
let YOUTUBERS_DATA = [];

const API_BASE_URL = "http://127.0.0.1:8000"; 

const NICHES_LIST = [
    "All",
    "Gaming",
    "Entertainment",
    "Education",
    "Tech & Gadgets",
    "Lifestyle & Vlog",
    "Music"
];

const CPM_LOW = 0.25;
const CPM_HIGH = 4.0;

const SORT_CONFIG = {
    subs:       { label: "Subscribers",   compare: (a, b) => b.rawSubs - a.rawSubs },
    views:      { label: "Total Views",   compare: (a, b) => b.rawViews - a.rawViews },
    videos:     { label: "Video Count",   compare: (a, b) => b.videoCount - a.videoCount },
    year:       { label: "Joined Year",   compare: (a, b) => a.joinedYear - b.joinedYear },
    earnings:   { label: "Est. Earnings", compare: (a, b) => getEstEarnings(b).yearlyLow - getEstEarnings(a).yearlyLow }
};

let currentNiche = "All";
let currentQuery = "";
let currentSortBy = "subs";
let searchDebounceHandle = null;
let cardObserver = null;

/* ------------------------------------------------------------------
   FETCH DATA FROM BACKEND API
------------------------------------------------------------------- */
async function fetchCreatorsFromDatabase() {
    try {
        const response = await fetch(`${API_BASE_URL}/creators`);
        if (!response.ok) {
            throw new Error(`Failed to fetch creators: ${response.statusText}`);
        }
        const data = await response.json();
        
        YOUTUBERS_DATA = data.creators || [];
        
        const totalCreators = document.getElementById("totalCreators");
        const totalNiches = document.getElementById("totalNiches");
        if (totalCreators) totalCreators.textContent = YOUTUBERS_DATA.length.toLocaleString();
        if (totalNiches) totalNiches.textContent = new Set(YOUTUBERS_DATA.map(creator => creator.niche)).size.toLocaleString();

        setupScrollReveal();
        renderNicheFilterButtons();
        handleRealtimeSearch();
        renderYoutubers();
    } catch (error) {
        console.error("Error connecting to backend database:", error);
        const grid = document.querySelector(".youtuber-list");
        if (grid) {
            grid.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 40px; color: #fff;">
                    <div class="empty-icon" style="font-size: 2rem;">⚠️</div>
                    <h3>Database Connection Error</h3>
                    <p>Could not load creators from FastAPI backend. Make sure Uvicorn is running.</p>
                </div>
            `;
        }
    }
}

/* ------------------------------------------------------------------
   ANALYTICS HELPERS
------------------------------------------------------------------- */

function getAvgViewsPerVideo(creator) {
    if (!creator.videoCount) return 0;
    return Math.round(creator.rawViews / creator.videoCount);
}

function getChannelAgeMonths(creator) {
    const now = new Date().getFullYear();
    return Math.max(1, (now - creator.joinedYear) * 12);
}

function getUploadsPerWeek(creator) {
    const weeks = getChannelAgeMonths(creator) * 4.345;
    return creator.videoCount / weeks;
}

function getEstEarnings(creator) {
    const monthlyViews = getAvgViewsPerVideo(creator) * getUploadsPerWeek(creator) * 4.345;
    const low = Math.round((monthlyViews / 1000) * CPM_LOW);
    const high = Math.round((monthlyViews / 1000) * CPM_HIGH);
    return {
        monthlyLow: low,
        monthlyHigh: high,
        yearlyLow: low * 12,
        yearlyHigh: high * 12
    };
}

function getSortRank(creator, sortBy) {
    const config = SORT_CONFIG[sortBy] || SORT_CONFIG.subs;
    const sorted = [...YOUTUBERS_DATA].sort(config.compare);
    return sorted.findIndex(c => c.id === creator.id) + 1;
}

function formatCompactNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(2).replace(/\.00$/, "") + "B";
    if (num >= 1e6) return (num / 1e6).toFixed(2).replace(/\.00$/, "") + "M";
    if (num >= 1e3) return (num / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
    return String(Math.round(num));
}

function formatCurrency(num) {
    return "$" + formatCompactNumber(num);
}

function buildStatBlocks(creator) {
    const avgViews = getAvgViewsPerVideo(creator);
    const earnings = getEstEarnings(creator);
    const rank = getSortRank(creator, currentSortBy);
    const sortLabel = (SORT_CONFIG[currentSortBy] || SORT_CONFIG.subs).label;

    return [
        { label: "Subscribers", value: creator.subscribers, icon: "👥" },
        { label: "Total Views", value: creator.totalViews, icon: "▶️" },
        { label: "Avg Views/Video", value: formatCompactNumber(avgViews), icon: "📊" },
        { label: "Total Videos", value: Number(creator.videoCount || 0).toLocaleString(), icon: "🎬" },
        { label: "Channel Started", value: String(creator.joinedYear), icon: "📅" },
        { label: "Country", value: creator.country, icon: "🌍" },
        { label: "Category", value: creator.niche, icon: "🏷️" },
        { label: `Rank by ${sortLabel}`, value: "#" + rank + " of " + YOUTUBERS_DATA.length, icon: "📍" },
        { label: "Est. Monthly Earnings", value: `${formatCurrency(earnings.monthlyLow)}–${formatCurrency(earnings.monthlyHigh)}`, icon: "💰" },
        { label: "Est. Yearly Earnings", value: `${formatCurrency(earnings.yearlyLow)}–${formatCurrency(earnings.yearlyHigh)}`, icon: "🪙" }
    ];
}

/* ------------------------------------------------------------------
   ANIMATION HELPERS
------------------------------------------------------------------- */

function animateValue(obj, start, end, duration, isCompact) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const currentVal = Math.floor(progress * (end - start) + start);
        
        obj.innerHTML = isCompact ? formatCompactNumber(currentVal) : currentVal.toLocaleString();
        
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.innerHTML = isCompact ? formatCompactNumber(end) : end.toLocaleString();
        }
    };
    window.requestAnimationFrame(step);
}

/* ------------------------------------------------------------------
   UI RENDERING & INTERACTIVITY
------------------------------------------------------------------- */

function renderNicheFilterButtons() {
    const container = document.querySelector(".category-chips");
    if (!container) return;

    container.innerHTML = NICHES_LIST.map(niche => `
        <button class="chip-btn ${niche === currentNiche ? 'active' : ''}" data-niche="${niche}">
            ${niche}
        </button>
    `).join("");

    container.querySelectorAll(".chip-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            currentNiche = btn.dataset.niche;
            renderNicheFilterButtons();
            renderYoutubers();
        });
    });
}

function handleRealtimeSearch() {
    const searchInput = document.querySelector(".search-bar input");
    const sortSelect = document.querySelector(".sort-container select");

    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            clearTimeout(searchDebounceHandle);
            searchDebounceHandle = setTimeout(() => {
                currentQuery = e.target.value.trim().toLowerCase();
                renderYoutubers();
            }, 200);
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener("change", (e) => {
            currentSortBy = e.target.value;
            renderYoutubers();
        });
    }
}

function setupScrollReveal() {
    if (cardObserver) cardObserver.disconnect();

    cardObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("revealed");
                cardObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
}

function renderYoutubers() {
    const grid = document.querySelector(".youtuber-list");
    if (!grid) return;

    const sortConfig = SORT_CONFIG[currentSortBy] || SORT_CONFIG.subs;
    const filtered = YOUTUBERS_DATA
        .filter(creator => {
            const matchesNiche = currentNiche === "All" || creator.niche === currentNiche;
            const matchesQuery = !currentQuery || 
                creator.name.toLowerCase().includes(currentQuery) || 
                creator.handle.toLowerCase().includes(currentQuery) ||
                creator.niche.toLowerCase().includes(currentQuery);
            return matchesNiche && matchesQuery;
        })
        .sort(sortConfig.compare);

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <h3>No creators found</h3>
                <p>Try adjusting your search terms or selecting a different category.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(creator => {
        const rank = getSortRank(creator, currentSortBy);
        return `
            <div class="youtuber-card" tabIndex="0" data-id="${creator.id}">
                <div class="banner-container">
                    <img class="channel-banner" src="${creator.banner}" alt="${creator.name} Banner" loading="lazy" />
                    <div class="avatar-wrapper">
                        <img class="creator-avatar" src="${creator.avatar}" alt="${creator.name} Avatar" loading="lazy" />
                    </div>
                    <span class="rank-badge">#${rank}</span>
                </div>
                <div class="card-body">
                    <h3>${creator.name} <span class="verified-badge">✓</span></h3>
                    <div class="handle">${creator.handle}</div>
                    <div class="sub-count">${creator.subscribers} subscribers</div>
                    <span class="niche-badge">${creator.niche}</span>
                    <p class="bio">${creator.bio}</p>
                </div>
            </div>
        `;
    }).join("");

    grid.querySelectorAll(".youtuber-card").forEach(card => {
        if (cardObserver) cardObserver.observe(card);
        card.addEventListener("click", () => {
            const creator = YOUTUBERS_DATA.find(c => c.id === card.dataset.id);
            if (creator) openModal(creator);
        });
        card.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                const creator = YOUTUBERS_DATA.find(c => c.id === card.dataset.id);
                if (creator) openModal(creator);
            }
        });
    });
}

function openModal(creator) {
    let overlay = document.querySelector(".modal-overlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.className = "modal-overlay";
        document.body.appendChild(overlay);
    }

    const statBlocks = buildStatBlocks(creator);
    const maxSubs = 508000000;
    const subPercent = Math.min((creator.rawSubs / maxSubs) * 100, 100).toFixed(1);

    overlay.innerHTML = `
        <div class="modal-content">
            <button class="modal-close-btn" aria-label="Close modal">&times;</button>
            <img class="modal-banner" src="${creator.banner}" alt="${creator.name} Banner" />
            <div class="modal-header-info">
                <div class="modal-identity">
                    <div class="modal-avatar-wrapper">
                        <img class="modal-avatar" src="${creator.avatar}" alt="${creator.name}" />
                    </div>
                    <div class="modal-name-block">
                        <h2 style="margin: 0; font-size: 1.4rem;">${creator.name}</h2>
                        <div class="handle">${creator.handle}</div>
                    </div>
                </div>
                <button class="subscribe-btn">Subscribe</button>
            </div>
            <div class="modal-body">
                <h4 class="section-label">Channel Overview</h4>
                
                <div class="stats-grid">
                    ${statBlocks.map((s, idx) => {
                        let idAttr = "";
                        if (s.label === "Total Views") idAttr = 'id="modal-views-counter"';
                        if (s.label === "Total Videos") idAttr = 'id="modal-videos-counter"';
                        
                        return `
                        <div class="stat-item stat-anim" style="animation-delay: ${idx * 0.04}s;">
                            <span>${s.icon}${s.label}</span>
                            <strong ${idAttr}>${s.label === "Total Views" || s.label === "Total Videos" ? "0" : s.value}</strong>
                        </div>
                        `;
                    }).join("")}
                </div>
                
                <h4 class="section-label" style="margin-top: 20px;">Subscribers vs Top Creator</h4>
                <div class="visual-bar-container">
                    <div class="visual-bar-fill" style="width: 0%;" data-target="${subPercent}%"></div>
                </div>
                <span style="color: #aaa; font-size: 0.75rem; margin-bottom: 24px; display: block;">${subPercent}% of the platform's #1 channel</span>
                
                <h4 class="section-label">Most Popular Upload</h4>
                <div class="popular-upload">
                    <img src="${creator.popularVideo.thumb}" alt="${creator.popularVideo.title}" />
                    <div>
                        <strong style="color: #fff; font-size: 0.95rem; display: block;">${creator.popularVideo.title}</strong>
                        <span style="color: #aaa; font-size: 0.85rem;">${creator.popularVideo.views}</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    overlay.classList.add("show");

    const closeBtn = overlay.querySelector(".modal-close-btn");
    closeBtn.addEventListener("click", closeModal);
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeModal();
    });

    setTimeout(() => {
        const bar = overlay.querySelector('.visual-bar-fill');
        if (bar) bar.style.width = bar.getAttribute('data-target');
        
        const viewsEl = document.getElementById("modal-views-counter");
        if (viewsEl) animateValue(viewsEl, 0, creator.rawViews, 1200, true);
        
        const videosEl = document.getElementById("modal-videos-counter");
        if (videosEl) animateValue(videosEl, 0, creator.videoCount, 1200, false);
    }, 50);
}

function closeModal() {
    const overlay = document.querySelector(".modal-overlay");
    if (overlay) overlay.classList.remove("show");
}

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
});

/* ------------------------------------------------------------------
   INIT
------------------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
    // Fetch live data directly from FastAPI backend connected to Neon
    fetchCreatorsFromDatabase();

    const navToggle = document.getElementById("navToggle");
    const siteSwitcher = document.getElementById("siteSwitcher");

    if (navToggle && siteSwitcher) {
        const closeMenu = () => {
            navToggle.classList.remove("open");
            siteSwitcher.classList.remove("open");
            navToggle.setAttribute("aria-expanded", "false");
        };

        navToggle.addEventListener("click", () => {
            const isOpen = !siteSwitcher.classList.contains("open");
            navToggle.classList.toggle("open", isOpen);
            siteSwitcher.classList.toggle("open", isOpen);
            navToggle.setAttribute("aria-expanded", String(isOpen));
        });

        siteSwitcher.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                link.classList.add("is-leaving");
                closeMenu();
            });
        });

        document.addEventListener("click", event => {
            if (!siteSwitcher.contains(event.target) && !navToggle.contains(event.target)) {
                closeMenu();
            }
        });

        window.addEventListener("resize", () => {
            if (window.innerWidth > 820) closeMenu();
        });
    }
});