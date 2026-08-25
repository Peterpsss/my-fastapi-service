from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Movie Finder API",
    description="A REST API containing 20 movies across multiple genres with 15 features each.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 20 MOVIES WITH 15 FEATURES PER ID
movies = [
    {
        "id": 1,
        "title": "Inception",
        "category": "Science Fiction",
        "genre": "Science Fiction / Action / Thriller",
        "director": "Christopher Nolan",
        "cast": "Leonardo DiCaprio, Joseph Gordon-Levitt, Elliot Page",
        "runtime": "2h 28m",
        "language": "English",
        "release_year": 2010,
        "rating": 8.8,
        "poster": "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80",
        "description": "A thief who enters the dreams of others to steal secrets is given the inverse task of planting an idea into a CEO's mind.",
        "writer": "Christopher Nolan",
        "producer": "Emma Thomas",
        "studio": "Warner Bros.",
        "country": "United States",
        "budget": "$160 Million"
    },
    {
        "id": 2,
        "title": "The Dark Knight",
        "category": "Action",
        "genre": "Action / Drama / Thriller",
        "director": "Christopher Nolan",
        "cast": "Christian Bale, Heath Ledger, Aaron Eckhart",
        "runtime": "2h 32m",
        "language": "English",
        "release_year": 2008,
        "rating": 9.0,
        "poster": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
        "description": "When the Joker emerges to wreak chaos on Gotham City, Batman must undergo one of the greatest psychological tests of his life.",
        "writer": "Jonathan Nolan, Christopher Nolan",
        "producer": "Charles Roven",
        "studio": "Warner Bros.",
        "country": "United States",
        "budget": "$185 Million"
    },
    {
        "id": 3,
        "title": "Spirited Away",
        "category": "Animation",
        "genre": "Animation / Fantasy / Adventure",
        "director": "Hayao Miyazaki",
        "cast": "Rumi Hiiragi, Miyu Irano, Mari Natsuki",
        "runtime": "2h 5m",
        "language": "Japanese",
        "release_year": 2001,
        "rating": 8.6,
        "poster": "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80",
        "description": "A young girl wanders into a world ruled by gods, witches, and spirits, where humans are changed into beasts.",
        "writer": "Hayao Miyazaki",
        "producer": "Toshio Suzuki",
        "studio": "Studio Ghibli",
        "country": "Japan",
        "budget": "$19 Million"
    },
    {
        "id": 4,
        "title": "The Conjuring",
        "category": "Horror",
        "genre": "Horror / Thriller / Mystery",
        "director": "James Wan",
        "cast": "Vera Farmiga, Patrick Wilson, Lili Taylor",
        "runtime": "1h 52m",
        "language": "English",
        "release_year": 2013,
        "rating": 7.5,
        "poster": "https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=600&auto=format&fit=crop&q=80",
        "description": "Paranormal investigators Ed and Lorraine Warren work to help a family terrorized by a dark presence in their farmhouse.",
        "writer": "Chad Hayes, Carey W. Hayes",
        "producer": "Peter Safran",
        "studio": "New Line Cinema",
        "country": "United States",
        "budget": "$20 Million"
    },
    {
        "id": 5,
        "title": "Interstellar",
        "category": "Science Fiction",
        "genre": "Science Fiction / Drama / Adventure",
        "director": "Christopher Nolan",
        "cast": "Matthew McConaughey, Anne Hathaway, Jessica Chastain",
        "runtime": "2h 49m",
        "language": "English",
        "release_year": 2014,
        "rating": 8.7,
        "poster": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80",
        "description": "When Earth becomes uninhabitable, a team of ex-NASA pilots undertakes a perilous mission through a wormhole to find a new home.",
        "writer": "Jonathan Nolan, Christopher Nolan",
        "producer": "Lynda Obst",
        "studio": "Paramount Pictures",
        "country": "United States",
        "budget": "$165 Million"
    },
    {
        "id": 6,
        "title": "Superbad",
        "category": "Comedy",
        "genre": "Comedy / Romance",
        "director": "Greg Mottola",
        "cast": "Jonah Hill, Michael Cera, Christopher Mintz-Plasse",
        "runtime": "1h 53m",
        "language": "English",
        "release_year": 2007,
        "rating": 7.6,
        "poster": "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&auto=format&fit=crop&q=80",
        "description": "Two high school best friends try to score alcohol for a house party, leading to a hilarious series of wild misadventures.",
        "writer": "Seth Rogen, Evan Goldberg",
        "producer": "Judd Apatow",
        "studio": "Columbia Pictures",
        "country": "United States",
        "budget": "$20 Million"
    },
    {
        "id": 7,
        "title": "The Lord of the Rings: The Fellowship of the Ring",
        "category": "Fantasy",
        "genre": "Fantasy / Adventure / Action",
        "director": "Peter Jackson",
        "cast": "Elijah Wood, Ian McKellen, Viggo Mortensen",
        "runtime": "2h 58m",
        "language": "English",
        "release_year": 2001,
        "rating": 8.8,
        "poster": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
        "description": "A meek Hobbits from the Shire sets out on an epic journey across Middle-earth to destroy a powerful, corrupting ring.",
        "writer": "Fran Walsh, Philippa Boyens, Peter Jackson",
        "producer": "Barrie M. Osborne",
        "studio": "New Line Cinema",
        "country": "New Zealand",
        "budget": "$93 Million"
    },
    {
        "id": 8,
        "title": "La La Land",
        "category": "Romance",
        "genre": "Romance / Drama / Comedy",
        "director": "Damien Chazelle",
        "cast": "Ryan Gosling, Emma Stone, John Legend",
        "runtime": "2h 8m",
        "language": "English",
        "release_year": 2016,
        "rating": 8.0,
        "poster": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
        "description": "While navigating their careers in Los Angeles, a jazz pianist and an aspiring actress fall in love while chasing their dreams.",
        "writer": "Damien Chazelle",
        "producer": "Fred Berger, Jordan Horowitz",
        "studio": "Lionsgate",
        "country": "United States",
        "budget": "$30 Million"
    },
    {
        "id": 9,
        "title": "Parasite",
        "category": "Thriller",
        "genre": "Thriller / Drama / Comedy",
        "director": "Bong Joon Ho",
        "cast": "Song Kang-ho, Lee Sun-kyun, Cho Yeo-jeong",
        "runtime": "2h 12m",
        "language": "Korean",
        "release_year": 2019,
        "rating": 8.5,
        "poster": "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&auto=format&fit=crop&q=80",
        "description": "Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.",
        "writer": "Bong Joon Ho, Han Jin-won",
        "producer": "Kwak Sin-ae",
        "studio": "CJ Entertainment",
        "country": "South Korea",
        "budget": "$11.4 Million"
    },
    {
        "id": 10,
        "title": "Spider-Man: Into the Spider-Verse",
        "category": "Animation",
        "genre": "Animation / Action / Adventure",
        "director": "Bob Persichetti, Peter Ramsey, Rodney Rothman",
        "cast": "Shameik Moore, Jake Johnson, Hailee Steinfeld",
        "runtime": "1h 57m",
        "language": "English",
        "release_year": 2018,
        "rating": 8.4,
        "poster": "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80",
        "description": "Teenager Miles Morales becomes the new Spider-Man and joins forces with alternate-universe heroes to stop a threat to all reality.",
        "writer": "Phil Lord, Rodney Rothman",
        "producer": "Avi Arad, Phil Lord, Christopher Miller",
        "studio": "Sony Pictures Animation",
        "country": "United States",
        "budget": "$90 Million"
    },
    {
        "id": 11,
        "title": "Get Out",
        "category": "Horror",
        "genre": "Horror / Thriller / Mystery",
        "director": "Jordan Peele",
        "cast": "Daniel Kaluuya, Allison Williams, Bradley Whitford",
        "runtime": "1h 44m",
        "language": "English",
        "release_year": 2017,
        "rating": 7.8,
        "poster": "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=600&auto=format&fit=crop&q=80",
        "description": "A young African-American man visits his white girlfriend's parents for the weekend, uncovering a disturbing secret in their estate.",
        "writer": "Jordan Peele",
        "producer": "Jason Blum, Jordan Peele",
        "studio": "Blumhouse Productions",
        "country": "United States",
        "budget": "$4.5 Million"
    },
    {
        "id": 12,
        "title": "Gladiator",
        "category": "Action",
        "genre": "Action / Drama / Adventure",
        "director": "Ridley Scott",
        "cast": "Russell Crowe, Joaquin Phoenix, Connie Nielsen",
        "runtime": "2h 35m",
        "language": "English",
        "release_year": 2000,
        "rating": 8.5,
        "poster": "https://images.unsplash.com/photo-1568892417382-841bcf027429?w=600&auto=format&fit=crop&q=80",
        "description": "A former Roman General sets out to exact vengeance against the corrupt emperor who murdered his family and sent him into slavery.",
        "writer": "David Franzoni, John Logan",
        "producer": "Douglas Wick",
        "studio": "DreamWorks Pictures",
        "country": "United Kingdom",
        "budget": "$103 Million"
    },
    {
        "id": 13,
        "title": "The Shawshank Redemption",
        "category": "Drama",
        "genre": "Drama / Crime",
        "director": "Frank Darabont",
        "cast": "Tim Robbins, Morgan Freeman, Bob Gunton",
        "runtime": "2h 22m",
        "language": "English",
        "release_year": 1994,
        "rating": 9.3,
        "poster": "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
        "description": "Over two decades, a banker convicted of a crime he didn't commit bonds with a fellow inmate while finding solace and redemption.",
        "writer": "Stephen King, Frank Darabont",
        "producer": "Niki Marvin",
        "studio": "Castle Rock Entertainment",
        "country": "United States",
        "budget": "$25 Million"
    },
    {
        "id": 14,
        "title": "Pan's Labyrinth",
        "category": "Fantasy",
        "genre": "Fantasy / Drama / Horror",
        "director": "Guillermo del Toro",
        "cast": "Ivana Baquero, Sergi López, Maribel Verdú",
        "runtime": "1h 58m",
        "language": "Spanish",
        "release_year": 2006,
        "rating": 8.2,
        "poster": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
        "description": "In post-civil war Spain, a young girl escapes into a dark fantasy realm guided by a mysterious faun.",
        "writer": "Guillermo del Toro",
        "producer": "Bertha Navarro",
        "studio": "Esperanto Filmoj",
        "country": "Spain",
        "budget": "$19 Million"
    },
    {
        "id": 15,
        "title": "Jurassic Park",
        "category": "Adventure",
        "genre": "Adventure / Science Fiction / Thriller",
        "director": "Steven Spielberg",
        "cast": "Sam Neill, Laura Dern, Jeff Goldblum",
        "runtime": "2h 7m",
        "language": "English",
        "release_year": 1993,
        "rating": 8.2,
        "poster": "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=600&auto=format&fit=crop&q=80",
        "description": "A pragmatic paleontologist visiting an island theme park filled with cloned dinosaurs must protect two kids when security systems fail.",
        "writer": "Michael Crichton, David Koepp",
        "producer": "Kathleen Kennedy, Gerald R. Molen",
        "studio": "Universal Pictures",
        "country": "United States",
        "budget": "$63 Million"
    },
    {
        "id": 16,
        "title": "The Grand Budapest Hotel",
        "category": "Comedy",
        "genre": "Comedy / Drama / Adventure",
        "director": "Wes Anderson",
        "cast": "Ralph Fiennes, F. Murray Abraham, Mathieu Amalric",
        "runtime": "1h 39m",
        "language": "English",
        "release_year": 2014,
        "rating": 8.1,
        "poster": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80",
        "description": "A popular concierge and his lobby boy become involved in the theft of a priceless Renaissance painting and a battle for a family fortune.",
        "writer": "Wes Anderson, Hugo Guinness",
        "producer": "Wes Anderson, Scott Rudin",
        "studio": "Fox Searchlight Pictures",
        "country": "Germany / United States",
        "budget": "$25 Million"
    },
    {
        "id": 17,
        "title": "Your Name",
        "category": "Animation",
        "genre": "Animation / Romance / Drama",
        "director": "Makoto Shinkai",
        "cast": "Ryunosuke Kamiki, Mone Kamishibaiashi, Ryo Narita",
        "runtime": "1h 46m",
        "language": "Japanese",
        "release_year": 2016,
        "rating": 8.4,
        "poster": "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
        "description": "Two high school strangers suddenly find themselves swapping bodies across time and space, forming a deep bond.",
        "writer": "Makoto Shinkai",
        "producer": "Genki Kawamura",
        "studio": "CoMix Wave Films",
        "country": "Japan",
        "budget": "$3 Million"
    },
    {
        "id": 18,
        "title": "Mad Max: Fury Road",
        "category": "Action",
        "genre": "Action / Adventure / Science Fiction",
        "director": "George Miller",
        "cast": "Tom Hardy, Charlize Theron, Nicholas Hoult",
        "runtime": "2h 0m",
        "language": "English",
        "release_year": 2015,
        "rating": 8.1,
        "poster": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
        "description": "In a post-apocalyptic wasteland, a woman rebels against a tyrannical ruler in search for her homeland with the help of a drifter.",
        "writer": "George Miller, Lanthouri, Brendan McCarthy",
        "producer": "Doug Mitchell, George Miller",
        "studio": "Warner Bros.",
        "country": "Australia",
        "budget": "$150 Million"
    },
    {
        "id": 19,
        "title": "About Time",
        "category": "Romance",
        "genre": "Romance / Drama / Fantasy",
        "director": "Richard Curtis",
        "cast": "Domhnall Gleeson, Rachel McAdams, Bill Nighy",
        "runtime": "2h 3m",
        "language": "English",
        "release_year": 2013,
        "rating": 7.8,
        "poster": "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=600&auto=format&fit=crop&q=80",
        "description": "At age 21, Tim discovers he can travel through time and decides to make his world better by pursuing love.",
        "writer": "Richard Curtis",
        "producer": "Tim Bevan, Eric Fellner",
        "studio": "Working Title Films",
        "country": "United Kingdom",
        "budget": "$12 Million"
    },
    {
        "id": 20,
        "title": "A Quiet Place",
        "category": "Horror",
        "genre": "Horror / Science Fiction / Drama",
        "director": "John Krasinski",
        "cast": "Emily Blunt, John Krasinski, Millicent Simmonds",
        "runtime": "1h 30m",
        "language": "English",
        "release_year": 2018,
        "rating": 7.5,
        "poster": "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=600&auto=format&fit=crop&q=80",
        "description": "A family struggles to survive in a post-apocalyptic world inhabited by blind alien monsters with ultra-sensitive hearing.",
        "writer": "Bryan Woods, Scott Beck, John Krasinski",
        "producer": "Michael Bay, Andrew Form",
        "studio": "Paramount Pictures",
        "country": "United States",
        "budget": "$17 Million"
    }
]

# HOME
@app.get("/")
def home():
    return {
        "message": "Welcome to the Expanded Movie Finder API!",
        "endpoints": ["/movies", "/movies/{id}", "/movies/search"]
    }

# GET ALL MOVIES
@app.get("/movies")
def get_movies():
    return {"count": len(movies), "movies": movies}

# DEEP UNIVERSAL SEARCH (SCANS ALL 15 FEATURES)
@app.get("/movies/search")
def search_movies(q: str = Query(..., min_length=1)):
    q = q.lower().strip()
    results = []
    
    for movie in movies:
        # Combine all 15 features into a single searchable string
        searchable_text = (
            f"{movie['id']} {movie['title']} {movie['category']} {movie['genre']} "
            f"{movie['director']} {movie['cast']} {movie['runtime']} {movie['language']} "
            f"{movie['release_year']} {movie['rating']} {movie['poster']} "
            f"{movie['description']} {movie['writer']} {movie['producer']} "
            f"{movie['studio']} {movie['country']} {movie['budget']}"
        ).lower()

        if q in searchable_text:
            results.append(movie)

    return {
        "query": q,
        "count": len(results),
        "results": results
    }

# GET ONE MOVIE
@app.get("/movies/{movie_id}")
def get_movie(movie_id: int):
    for movie in movies:
        if movie["id"] == movie_id:
            return movie
    raise HTTPException(status_code=404, detail="Movie not found.")