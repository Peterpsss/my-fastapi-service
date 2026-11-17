import os
from typing import Any, Dict, List, Literal
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Query, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel, Field

import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

app = FastAPI(
    title="YouTuber Archive API",
    description="A searchable directory of YouTube creators and channel metrics backed by Neon PostgreSQL.",
    version="4.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# DATABASE CONNECTION UTILITY
# ---------------------------------------------------------------------------
def get_db_connection():
    if not DATABASE_URL:
        raise HTTPException(status_code=500, detail="Database connection string is missing in environment variables.")
    try:
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
        return conn
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {e}")


# ---------------------------------------------------------------------------
# DATABASE INITIALIZATION (TABLE CREATION ONLY)
# ---------------------------------------------------------------------------
def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Create tables matching our relational design
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS youtubers (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                handle VARCHAR(50) UNIQUE NOT NULL,
                niche VARCHAR(50) NOT NULL,
                country VARCHAR(50) NOT NULL,
                subscribers VARCHAR(20) NOT NULL,
                raw_subs BIGINT NOT NULL CHECK (raw_subs >= 0),
                total_views VARCHAR(20) NOT NULL,
                raw_views BIGINT NOT NULL CHECK (raw_views >= 0),
                video_count INTEGER NOT NULL CHECK (video_count >= 0),
                avatar TEXT NOT NULL,
                banner TEXT NOT NULL,
                bio TEXT NOT NULL,
                joined_year INTEGER NOT NULL CHECK (joined_year BETWEEN 2005 AND 2026)
            );

            CREATE TABLE IF NOT EXISTS popular_videos (
                id SERIAL PRIMARY KEY,
                youtuber_id INTEGER UNIQUE NOT NULL REFERENCES youtubers(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                views VARCHAR(50) NOT NULL,
                thumb TEXT NOT NULL
            );
        """)
        conn.commit()
        print("Database tables initialized successfully.")
    except Exception as e:
        conn.rollback()
        print(f"Error initializing database: {e}")
    finally:
        cursor.close()
        conn.close()


# Run initialization on startup
init_db()


# ---------------------------------------------------------------------------
# PYDANTIC SCHEMAS FOR VALIDATION
# ---------------------------------------------------------------------------
class PopularVideo(BaseModel):
    title: str
    views: str
    thumb: str


class Youtuber(BaseModel):
    id: int
    name: str
    handle: str
    niche: Literal[
        "Gaming", "Entertainment", "Education", "Tech & Gadgets",
        "Lifestyle & Vlog", "Family", "Comedy", "Music",
        "News & Commentary", "Food", "Beauty & Fashion", "Sports"
    ]
    country: str
    subscribers: str
    rawSubs: int = Field(..., ge=0, description="Subscriber count as a real integer")
    totalViews: str
    rawViews: int = Field(..., ge=0)
    videoCount: int = Field(..., ge=0)
    avatar: str
    banner: str
    bio: str
    joinedYear: int = Field(..., ge=2005, le=2026)
    popularVideo: PopularVideo


# ---------------------------------------------------------------------------
# API KEY DEPENDENCY
# ---------------------------------------------------------------------------
API_KEY = "supersecret123"

def verify_api_key(x_api_key: str = Header(default=None)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized: missing or invalid API key.")
    return x_api_key


# Helper function to format database rows into the structure expected by frontend
def format_creator_record(row) -> Dict[str, Any]:
    return {
        "id": f"yt{row['id']}",
        "name": row['name'],
        "handle": row['handle'],
        "niche": row['niche'],
        "country": row['country'],
        "subscribers": row['subscribers'],
        "rawSubs": row['raw_subs'],
        "totalViews": row['total_views'],
        "rawViews": row['raw_views'],
        "videoCount": row['video_count'],
        "avatar": row['avatar'],
        "banner": row['banner'],
        "bio": row['bio'],
        "joinedYear": row['joined_year'],
        "popularVideo": {
            "title": row.get('title') or "Popular upload",
            "views": row.get('views') or "Popular upload",
            "thumb": row.get('thumb') or "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=640&q=80"
        }
    }


# ---------------------------------------------------------------------------
# API ENDPOINTS (CONNECTED DIRECTLY TO NEON POSTGRESQL)
# ---------------------------------------------------------------------------
@app.get("/", response_class=HTMLResponse)
def home():
    file_path = os.path.join(os.path.dirname(__file__), "../index.html")
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    return "<h1>Welcome to the YouTuber Archive API</h1><p>index.html not found.</p>"


@app.get("/style.css")
def get_stylesheet():
    file_path = os.path.join(os.path.dirname(__file__), "../style.css")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="style.css not found.")
    return FileResponse(file_path, media_type="text/css")


@app.get("/app.js")
def get_script():
    file_path = os.path.join(os.path.dirname(__file__), "../app.js")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="app.js not found.")
    return FileResponse(file_path, media_type="application/javascript")


@app.get("/creators")
@app.get("/youtubers")
def get_creators() -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT y.*, v.title, v.views, v.thumb 
            FROM youtubers y
            LEFT JOIN popular_videos v ON y.id = v.youtuber_id;
        """)
        rows = cursor.fetchall()
        creators_list = [format_creator_record(row) for row in rows]
        return {"count": len(creators_list), "creators": creators_list}
    finally:
        cursor.close()
        conn.close()


@app.get("/creators/search")
@app.get("/youtubers/search")
def search_creators(q: str = Query(..., min_length=1)) -> Dict[str, Any]:
    query_str = f"%{q.strip().lower()}%"
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT y.*, v.title, v.views, v.thumb 
            FROM youtubers y
            LEFT JOIN popular_videos v ON y.id = v.youtuber_id
            WHERE LOWER(y.name) LIKE %s 
               OR LOWER(y.handle) LIKE %s 
               OR LOWER(y.niche) LIKE %s 
               OR LOWER(y.country) LIKE %s;
        """, (query_str, query_str, query_str, query_str))
        rows = cursor.fetchall()
        results = [format_creator_record(row) for row in rows]
        return {"query": q.strip(), "count": len(results), "results": results}
    finally:
        cursor.close()
        conn.close()


@app.get("/creators/{creator_id}")
@app.get("/youtubers/{creator_id}")
def get_creator(creator_id: str) -> Dict[str, Any]:
    numeric_id_str = creator_id.replace("yt", "")
    if not numeric_id_str.isdigit():
        raise HTTPException(status_code=400, detail="Invalid creator ID format.")
    
    cid = int(numeric_id_str)
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT y.*, v.title, v.views, v.thumb 
            FROM youtubers y
            LEFT JOIN popular_videos v ON y.id = v.youtuber_id
            WHERE y.id = %s;
        """, (cid,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Creator not found.")
        return format_creator_record(row)
    finally:
        cursor.close()
        conn.close()


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "YouTuber Archive API",
        "database": "Neon PostgreSQL",
        "timestamp_utc": datetime.now(timezone.utc).isoformat()
    }


# ---------------------------------------------------------------------------
# PYDANTIC SCHEMA FOR CREATION/UPDATE VALIDATION
# ---------------------------------------------------------------------------
class YoutuberCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    handle: str = Field(..., min_length=2, max_length=50)
    niche: Literal[
        "Gaming", "Entertainment", "Education", "Tech & Gadgets",
        "Lifestyle & Vlog", "Family", "Comedy", "Music",
        "News & Commentary", "Food", "Beauty & Fashion", "Sports"
    ]
    country: str = Field(..., min_length=2, max_length=50)
    subscribers: str
    rawSubs: int = Field(..., ge=0)
    totalViews: str
    rawViews: int = Field(..., ge=0)
    videoCount: int = Field(..., ge=0)
    bio: str
    joinedYear: int = Field(..., ge=2005, le=2026)
    popularVideoTitle: str = "Popular upload"
    popularVideoViews: str = "Popular upload"
    popularVideoThumb: str = "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=640&q=80"


# ---------------------------------------------------------------------------
# CRUD ENDPOINTS (CREATE, UPDATE, DELETE)
# ---------------------------------------------------------------------------

@app.post("/creators", status_code=201)
@app.post("/youtubers", status_code=201)
def create_creator(payload: YoutuberCreate, api_key: str = Depends(verify_api_key)) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        slug = payload.handle.lstrip("@").replace(" ", "")
        avatar = f"https://unavatar.io/youtube/{slug}?fallback=https://ui-avatars.com/api/?background=272727&color=fff&size=128&name={slug}"
        banner = "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1700&q=80"

        cursor.execute("""
            INSERT INTO youtubers (name, handle, niche, country, subscribers, raw_subs, total_views, raw_views, video_count, avatar, banner, bio, joined_year)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id;
        """, (
            payload.name, payload.handle, payload.niche, payload.country,
            payload.subscribers, payload.rawSubs, payload.totalViews, payload.rawViews,
            payload.videoCount, avatar, banner, payload.bio, payload.joinedYear
        ))
        new_id = cursor.fetchone()["id"]

        cursor.execute("""
            INSERT INTO popular_videos (youtuber_id, title, views, thumb)
            VALUES (%s, %s, %s, %s);
        """, (new_id, payload.popularVideoTitle, payload.popularVideoViews, payload.popularVideoThumb))

        conn.commit()

        cursor.execute("""
            SELECT y.*, v.title, v.views, v.thumb 
            FROM youtubers y
            LEFT JOIN popular_videos v ON y.id = v.youtuber_id
            WHERE y.id = %s;
        """, (new_id,))
        row = cursor.fetchone()
        return {"message": "Creator successfully created", "creator": format_creator_record(row)}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to create creator: {e}")
    finally:
        cursor.close()
        conn.close()


@app.put("/creators/{creator_id}")
@app.put("/youtubers/{creator_id}")
def update_creator(creator_id: str, payload: YoutuberCreate, api_key: str = Depends(verify_api_key)) -> Dict[str, Any]:
    numeric_id_str = creator_id.replace("yt", "")
    if not numeric_id_str.isdigit():
        raise HTTPException(status_code=400, detail="Invalid creator ID format.")
    cid = int(numeric_id_str)

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id FROM youtubers WHERE id = %s;", (cid,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Creator not found.")

        cursor.execute("""
            UPDATE youtubers 
            SET name = %s, handle = %s, niche = %s, country = %s, 
                subscribers = %s, raw_subs = %s, total_views = %s, raw_views = %s, 
                video_count = %s, bio = %s, joined_year = %s
            WHERE id = %s;
        """, (
            payload.name, payload.handle, payload.niche, payload.country,
            payload.subscribers, payload.rawSubs, payload.totalViews, payload.rawViews,
            payload.videoCount, payload.bio, payload.joinedYear, cid
        ))

        cursor.execute("""
            UPDATE popular_videos 
            SET title = %s, views = %s, thumb = %s
            WHERE youtuber_id = %s;
        """, (payload.popularVideoTitle, payload.popularVideoViews, payload.popularVideoThumb, cid))

        conn.commit()

        cursor.execute("""
            SELECT y.*, v.title, v.views, v.thumb 
            FROM youtubers y
            LEFT JOIN popular_videos v ON y.id = v.youtuber_id
            WHERE y.id = %s;
        """, (cid,))
        row = cursor.fetchone()
        return {"message": "Creator successfully updated", "creator": format_creator_record(row)}
    except HTTPException as he:
        raise he
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to update creator: {e}")
    finally:
        cursor.close()
        conn.close()


@app.delete("/creators/{creator_id}")
@app.delete("/youtubers/{creator_id}")
def delete_creator(creator_id: str, api_key: str = Depends(verify_api_key)) -> Dict[str, Any]:
    numeric_id_str = creator_id.replace("yt", "")
    if not numeric_id_str.isdigit():
        raise HTTPException(status_code=400, detail="Invalid creator ID format.")
    cid = int(numeric_id_str)

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id FROM youtubers WHERE id = %s;", (cid,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Creator not found.")

        cursor.execute("DELETE FROM youtubers WHERE id = %s;", (cid,))
        conn.commit()
        return {"message": f"Creator with ID {creator_id} successfully deleted."}
    except HTTPException as he:
        raise he
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete creator: {e}")
    finally:
        cursor.close()
        conn.close()
        
# ---------------------------------------------------------------------------
# VERSIONED + PROTECTED ROUTES
# ---------------------------------------------------------------------------
@app.get("/api/v1/creators", dependencies=[Depends(verify_api_key)])
def get_creators_v1() -> Dict[str, Any]:
    return get_creators()


@app.get("/api/v1/creators/search", dependencies=[Depends(verify_api_key)])
def search_creators_v1(q: str = Query(..., min_length=1)) -> Dict[str, Any]:
    return search_creators(q=q)


@app.get("/api/v1/creators/{creator_id}", dependencies=[Depends(verify_api_key)])
def get_creator_v1(creator_id: str) -> Dict[str, Any]:
    return get_creator(creator_id=creator_id)