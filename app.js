const API_URL = "https://my-fastapi-service-sigma.vercel.app";
let allMoviesData = [];
let currentFilteredMovies = [];

// List of top genres requested
const GENRES_LIST = [
    "All", "Action", "Drama", "Comedy", "Horror", 
    "Science Fiction", "Romance", "Thriller", "Adventure", "Animation", "Fantasy"
];

// INITIALIZE APP
async function loadMovies() {
    try {
        renderGenreFilterButtons();
        const response = await fetch(`${API_URL}/movies`);
        const data = await response.json();
        
        // Load all 14 movie properties into memory
        allMoviesData = data.movies || [];
        currentFilteredMovies = [...allMoviesData];
        
        sortAndDisplayMovies();
        updateCategoryButtons("All");
    } catch (error) {
        console.error(error);
        document.getElementById("movieList").innerHTML = "<p class='error-msg'>Unable to connect to the API.</p>";
    }
}

// RENDER GENRE FILTER BUTTONS DYNAMICALLY
function renderGenreFilterButtons() {
    const categoryContainer = document.querySelector(".category-filters") || document.getElementById("categoryFilters");
    if (!categoryContainer) return;

    categoryContainer.innerHTML = "";
    GENRES_LIST.forEach(genre => {
        const btn = document.createElement("button");
        btn.className = `chip-btn ${genre === "All" ? "active" : ""}`;
        btn.textContent = genre;
        btn.addEventListener("click", () => filterCategory(genre));
        categoryContainer.appendChild(btn);
    });
}

// REAL-TIME SEARCH ACROSS ALL 14 MOVIE PROPERTIES
function handleRealtimeSearch() {
    const query = document.getElementById("searchInput").value.trim().toLowerCase();
    
    if (query !== "") {
        updateCategoryButtons("");
    } else {
        updateCategoryButtons("All");
    }

    if (!query) {
        currentFilteredMovies = [...allMoviesData];
    } else {
        currentFilteredMovies = allMoviesData.filter(movie => {
            // Checks all 14 properties (title, year, rating, genre, director, writer, producer, studio, country, budget, runtime, cast, description, category, id)
            return Object.values(movie).some(val => {
                if (val === null || val === undefined) return false;
                return String(val).toLowerCase().includes(query);
            });
        });
    }

    updateSearchBanner(query, currentFilteredMovies.length);
    sortAndDisplayMovies();
}

// UPDATE DYNAMIC RESULTS BANNER ABOVE COLLECTION
function updateSearchBanner(query, count) {
    let banner = document.getElementById("searchBanner");
    
    if (!banner) {
        banner = document.createElement("div");
        banner.id = "searchBanner";
        banner.className = "search-banner";
        const collectionHeading = document.querySelector("main section:nth-of-type(2) h2");
        if (collectionHeading) {
            collectionHeading.insertAdjacentElement("afterend", banner);
        }
    }

    if (!query) {
        banner.style.display = "none";
        banner.innerHTML = "";
    } else {
        banner.style.display = "block";
        banner.innerHTML = `Showing <strong>${count}</strong> ${count === 1 ? 'result' : 'results'} matching "<span>${escapeHTML(query)}</span>"`;
    }
}

// HELPER TO PREVENT XSS
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

// FILTER BY GENRE (Supports multi-genre strings like "Action / Crime / Thriller")
function filterCategory(categoryName) {
    document.getElementById("searchInput").value = "";
    updateSearchBanner("", 0);
    updateCategoryButtons(categoryName);

    if (categoryName === "All") {
        currentFilteredMovies = [...allMoviesData];
    } else {
        const target = categoryName.toLowerCase();
        currentFilteredMovies = allMoviesData.filter(movie => {
            const genreMatch = movie.genre && movie.genre.toLowerCase().includes(target);
            const categoryMatch = movie.category && movie.category.toLowerCase().includes(target);
            // Handles "Science Fiction" search against "Sci-Fi" aliases
            const sciFiAliasMatch = (target === "science fiction" || target === "sci-fi") && 
                ((movie.genre && movie.genre.toLowerCase().includes("sci-fi")) || 
                 (movie.category && movie.category.toLowerCase().includes("sci-fi")));

            return genreMatch || categoryMatch || sciFiAliasMatch;
        });
    }
    sortAndDisplayMovies();
}

// SORT MOVIES
function sortAndDisplayMovies() {
    const sortValue = document.getElementById("sortSelect").value;
    let sorted = [...currentFilteredMovies];

    if (sortValue === "rating-desc") sorted.sort((a, b) => b.rating - a.rating);
    else if (sortValue === "rating-asc") sorted.sort((a, b) => a.rating - b.rating);
    else if (sortValue === "year-desc") sorted.sort((a, b) => b.release_year - a.release_year);
    else if (sortValue === "year-asc") sorted.sort((a, b) => a.release_year - b.release_year);

    displayMovies(sorted);
}

// UPDATE ACTIVE BUTTON STATES
function updateCategoryButtons(activeCategory) {
    const buttons = document.querySelectorAll(".chip-btn");
    buttons.forEach(btn => {
        btn.classList.toggle("active", btn.textContent.trim().toLowerCase() === activeCategory.toLowerCase());
    });
}

// HELPER: FILTER OUT BLANK / "N/A" / NULL VALUES
function isValidValue(val) {
    if (val === null || val === undefined) return false;
    const str = String(val).trim();
    return str !== "" && str.toUpperCase() !== "N/A";
}

// DISPLAY MOVIES (ENGAGING CARDS)
function displayMovies(movies) {
    const movieList = document.getElementById("movieList");
    movieList.innerHTML = "";

    if (!movies || movies.length === 0) {
        movieList.innerHTML = "<p class='no-results'>No movies matching your query.</p>";
        return;
    }

    movies.forEach(movie => {
        const card = document.createElement("div");
        card.className = "movie-card";
        card.tabIndex = 0;
        
        const categoryClass = (movie.category || 'default').toLowerCase().replace(/\s+/g, '-');

        // Build engaging metadata front view
        let metaDetailsHTML = "";
        if (isValidValue(movie.genre)) {
            metaDetailsHTML += `<p class="movie-genre"><strong>Genre:</strong> ${movie.genre}</p>`;
        }
        if (isValidValue(movie.director)) {
            metaDetailsHTML += `<p><strong>Director:</strong> ${movie.director}</p>`;
        }
        if (isValidValue(movie.cast)) {
            metaDetailsHTML += `<p><strong>Starring:</strong> ${movie.cast}</p>`;
        }

        card.innerHTML = `
            <div class="poster-container">
                <img src="${movie.poster}" alt="${movie.title}" class="movie-poster" loading="lazy">
                <span class="movie-category-tag ${categoryClass}">${movie.category || 'Movie'}</span>
            </div>
            <div class="card-body">
                <div class="card-header">
                    <span class="movie-year">${movie.release_year || ''}</span>
                    <span class="movie-rating">${isValidValue(movie.rating) ? '★ ' + movie.rating : ''}</span>
                </div>
                <h3>${movie.title}</h3>
                ${metaDetailsHTML}
                ${isValidValue(movie.description) ? `<p class="movie-desc">${movie.description}</p>` : ''}
            </div>
        `;

        card.addEventListener("click", () => {
            selectCard(card);
            viewMovie(movie.id);
        });

        card.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                selectCard(card);
                viewMovie(movie.id);
            }
        });

        movieList.appendChild(card);
    });
}

function selectCard(selectedCard) {
    document.querySelectorAll(".movie-card").forEach(c => c.classList.remove("selected-card"));
    selectedCard.classList.add("selected-card");
}

// OPEN DETAILED MODAL (DISPLAYING ALL 14 MOVIE FEATURES)
async function viewMovie(id) {
    try {
        const response = await fetch(`${API_URL}/movies/${id}`);
        const movie = await response.json();

        const categoryClass = (movie.category || 'default').toLowerCase().replace(/\s+/g, '-');
        
        // Explicitly map all 14 movie features (omitting ID from header badge display)
        const detailsList = [
            { label: 'Genre', value: movie.genre },
            { label: 'Director', value: movie.director },
            { label: 'Starring Cast', value: movie.cast, fullWidth: true },
            { label: 'Writer', value: movie.writer },
            { label: 'Producer', value: movie.producer },
            { label: 'Studio', value: movie.studio },
            { label: 'Country', value: movie.country },
            { label: 'Budget', value: movie.budget },
            { label: 'Rating', value: isValidValue(movie.rating) ? `${movie.rating} / 10` : null }
        ];

        let gridItemsHTML = detailsList
            .filter(item => isValidValue(item.value))
            .map(item => `
                <div ${item.fullWidth ? 'class="full-width"' : ''}>
                    <strong>${item.label}:</strong>
                    <p>${item.value}</p>
                </div>
            `).join('');

        // Build meta header (Year, Runtime, Language)
        const metaList = [movie.release_year, movie.runtime, movie.language].filter(isValidValue);

        const modalBody = document.getElementById("modalBody");
        modalBody.innerHTML = `
            <div class="modal-layout">
                <img src="${movie.poster}" alt="${movie.title}" class="modal-poster">
                <div class="modal-details">
                    <div class="modal-header">
                        <div class="modal-tags">
                            <span class="movie-category-tag ${categoryClass}">${movie.category || 'Movie'}</span>
                        </div>
                        ${isValidValue(movie.rating) ? `<span class="modal-rating">★ ${movie.rating} / 10</span>` : ''}
                    </div>
                    <h2 class="modal-title">${movie.title}</h2>
                    ${metaList.length > 0 ? `<p class="modal-meta">${metaList.join(' &bull; ')}</p>` : ''}

                    ${isValidValue(movie.description) ? `
                        <div class="modal-section">
                            <h4>Synopsis</h4>
                            <p class="modal-description">${movie.description}</p>
                        </div>
                    ` : ''}

                    ${gridItemsHTML ? `<div class="modal-details-grid">${gridItemsHTML}</div>` : ''}
                </div>
            </div>
        `;

        document.getElementById("movieModal").classList.add("show");
    } catch (error) {
        console.error(error);
        alert("Unable to retrieve details.");
    }
}

function closeModal() {
    document.getElementById("movieModal").classList.remove("show");
}

function closeModalOnOverlay(event) {
    if (event.target.id === "movieModal") closeModal();
}

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
});

// REAL-TIME SEARCH EVENT LISTENER
document.getElementById("searchInput")?.addEventListener("input", handleRealtimeSearch);

loadMovies();