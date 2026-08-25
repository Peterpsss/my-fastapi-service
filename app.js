const API_URL = "https://my-fastapi-service-sigma.vercel.app";
let allMoviesData = [];
let currentFilteredMovies = [];

// GET ALL MOVIES
async function loadMovies() {
    try {
        const response = await fetch(`${API_URL}/movies`);
        const data = await response.json();
        allMoviesData = data.movies;
        currentFilteredMovies = [...allMoviesData];
        sortAndDisplayMovies();
        updateCategoryButtons("All");
    } catch (error) {
        console.error(error);
        document.getElementById("movieList").innerHTML = "<p class='error-msg'>Unable to connect to the API.</p>";
    }
}

// FILTER BY CATEGORY
function filterCategory(categoryName) {
    document.getElementById("searchInput").value = "";
    updateCategoryButtons(categoryName);

    if (categoryName === "All") {
        currentFilteredMovies = [...allMoviesData];
    } else {
        currentFilteredMovies = allMoviesData.filter(movie => 
            movie.category.toLowerCase() === categoryName.toLowerCase() ||
            movie.genre.toLowerCase().includes(categoryName.toLowerCase())
        );
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

// UPDATE ACTIVE BUTTONS
function updateCategoryButtons(activeCategory) {
    const buttons = document.querySelectorAll(".chip-btn");
    buttons.forEach(btn => {
        btn.classList.toggle("active", btn.textContent.trim().toLowerCase() === activeCategory.toLowerCase());
    });
}

// DISPLAY MOVIES
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
        
        card.innerHTML = `
            <div class="poster-container">
                <img src="${movie.poster}" alt="${movie.title}" class="movie-poster" loading="lazy">
                <span class="movie-category-tag ${movie.category.toLowerCase().replace(/\s+/g, '-')}">${movie.category}</span>
            </div>
            <div class="card-body">
                <div class="card-header">
                    <span class="movie-year">${movie.release_year}</span>
                    <span class="movie-rating">★ ${movie.rating}</span>
                </div>
                <h3>${movie.title}</h3>
                <p class="movie-genre"><strong>Genre:</strong> ${movie.genre}</p>
                <p><strong>Director:</strong> ${movie.director}</p>
                <p class="movie-desc">${movie.description}</p>
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

// OPEN MODAL WITHOUT ID IN TITLE & WITH FALLBACK FOR UNDEFINED FIELDS
async function viewMovie(id) {
    try {
        const response = await fetch(`${API_URL}/movies/${id}`);
        const movie = await response.json();

        const modalBody = document.getElementById("modalBody");
        modalBody.innerHTML = `
            <div class="modal-layout">
                <img src="${movie.poster}" alt="${movie.title}" class="modal-poster">
                <div class="modal-details">
                    <div class="modal-header">
                        <span class="movie-category-tag ${movie.category.toLowerCase().replace(/\s+/g, '-')}">${movie.category}</span>
                        <span class="modal-rating">★ ${movie.rating} / 10</span>
                    </div>
                    <h2 class="modal-title">${movie.title}</h2>
                    <p class="modal-meta">
                        <span>${movie.release_year}</span> &bull; 
                        <span>${movie.runtime || 'N/A'}</span> &bull; 
                        <span>${movie.language || 'N/A'}</span>
                    </p>

                    <div class="modal-section">
                        <h4>Synopsis</h4>
                        <p class="modal-description">${movie.description}</p>
                    </div>

                    <div class="modal-details-grid">
                        <div><strong>Genre:</strong><p>${movie.genre || 'N/A'}</p></div>
                        <div><strong>Director:</strong><p>${movie.director || 'N/A'}</p></div>
                        <div><strong>Writer:</strong><p>${movie.writer || 'N/A'}</p></div>
                        <div><strong>Producer:</strong><p>${movie.producer || 'N/A'}</p></div>
                        <div><strong>Studio:</strong><p>${movie.studio || 'N/A'}</p></div>
                        <div><strong>Country:</strong><p>${movie.country || 'N/A'}</p></div>
                        <div><strong>Budget:</strong><p>${movie.budget || 'N/A'}</p></div>
                        <div><strong>Rating:</strong><p>${movie.rating} / 10</p></div>
                        <div class="full-width"><strong>Starring Cast:</strong><p>${movie.cast || 'N/A'}</p></div>
                    </div>
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

// SEARCH BAR LISTENER
async function searchMovies() {
    const query = document.getElementById("searchInput").value.trim();
    if (!query) {
        loadMovies();
        return;
    }
    try {
        const response = await fetch(`${API_URL}/movies/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        currentFilteredMovies = data.results;
        sortAndDisplayMovies();
        updateCategoryButtons("");
    } catch (error) {
        console.error(error);
        alert("Search query failed.");
    }
}

document.getElementById("searchInput")?.addEventListener("keyup", (event) => {
    if (event.key === "Enter") searchMovies();
});

loadMovies();