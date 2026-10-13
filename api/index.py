import os
from typing import Any, Dict, List, Literal
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Query, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel, Field


app = FastAPI(
    title="YouTuber Archive API",
    description="A searchable directory of YouTube creators and channel metrics.",
    version="4.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# PYDANTIC SCHEMA: every creator dict must match this shape. Literal[...]
# only allows these exact niche values, and Field(...) adds runtime rules
# like "subscriber count must be zero or greater".
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
# API KEY DEPENDENCY: protected routes require this header:
#   x-api-key: supersecret123
# ---------------------------------------------------------------------------
API_KEY = "supersecret123"


def verify_api_key(x_api_key: str = Header(default=None)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized: missing or invalid API key.")
    return x_api_key


def creator(
    creator_id: int,
    name: str,
    handle: str,
    niche: str,
    country: str,
    subscribers: str,
    raw_subscribers: int,
    total_views: str,
    raw_views: int,
    video_count: int,
    joined_year: int,
    bio: str,
) -> Dict[str, Any]:
    slug = handle.lstrip("@").replace(" ", "")
    return {
        "id": creator_id,
        "name": name,
        "handle": handle,
        "niche": niche,
        "country": country,
        "subscribers": subscribers,
        "rawSubs": raw_subscribers,
        "totalViews": total_views,
        "rawViews": raw_views,
        "videoCount": video_count,
        "avatar": (
            f"https://unavatar.io/youtube/{slug}"
            f"?fallback=https://ui-avatars.com/api/?background=272727&color=fff"
            f"&size=128&name={slug}"
        ),
        "banner": (
            "https://images.unsplash.com/photo-1511512578047-dfb367046420"
            "?auto=format&fit=crop&w=1700&q=80"
        ),
        "bio": bio,
        "joinedYear": joined_year,
        "popularVideo": {
            "title": f"Latest popular upload from {name}",
            "views": "Popular upload",
            "thumb": (
                "https://images.unsplash.com/photo-1485846234645-a62644f84728"
                "?auto=format&fit=crop&w=640&q=80"
            ),
        },
    }


# Snapshot data for the API. Counts change over time; raw values are included so
# clients can sort without parsing display strings.
creators: List[Dict[str, Any]] = [
    creator(1, "PewDiePie", "@pewdiepie", "Gaming", "Sweden", "110M", 110000000, "29.5B", 29500000000, 4750, 2010, "Swedish creator known for gaming playthroughs, meme reviews, and vlogs."),
    creator(2, "Markiplier", "@markiplier", "Gaming", "United States", "38.8M", 38800000, "23.8B", 23800000000, 5900, 2012, "Let's Plays, indie horror games, comedy sketches, and interactive original series."),
    creator(3, "Jacksepticeye", "@jacksepticeye", "Gaming", "Ireland", "31.2M", 31200000, "17.7B", 17700000000, 5330, 2007, "High-energy gaming, funny reactions, and indie game play-throughs."),
    creator(4, "MrBeast", "@mrbeast", "Entertainment", "United States", "508M", 508000000, "133.7B", 133700000000, 992, 2012, "Massive challenges, philanthropy, and record-breaking video spectacles."),
    creator(5, "Dude Perfect", "@dudeperfect", "Entertainment", "United States", "62.3M", 62300000, "20.9B", 20900000000, 577, 2009, "Trick shots, sports comedy, and absurd physical challenges."),
    creator(6, "Veritasium", "@veritasium", "Education", "Australia", "20.8M", 20800000, "4.3B", 4300000000, 507, 2010, "Deep science videos, physics experiments, and counterintuitive math."),
    creator(7, "Mark Rober", "@markrober", "Education", "United States", "81M", 81000000, "18B", 18000000000, 265, 2011, "Engineering builds, science experiments, and playful education."),
    creator(8, "Marques Brownlee", "@mkbhd", "Tech & Gadgets", "United States", "21M", 21000000, "5.4B", 5400000000, 1821, 2008, "Smartphone reviews, EV breakdowns, and polished technology videos."),
    creator(9, "Linus Tech Tips", "@linustechtips", "Tech & Gadgets", "Canada", "16.9M", 16900000, "9.7B", 9700000000, 7882, 2008, "PC building, server hardware, and consumer technology tests."),
    creator(10, "Casey Neistat", "@caseyneistat", "Lifestyle & Vlog", "United States", "12.7M", 12700000, "3.26B", 3260000000, 1143, 2010, "Filmmaking, travel, daily vlogging, and creative gear tests."),
]

additional_creator_specs = [
    ("T-Series", "@tseries", "Entertainment", "India", "285M", 285000000, "275B", 275000000000, 21000, 2006),
    ("Cocomelon", "@cocomelon", "Family", "United States", "195M", 195000000, "190B", 190000000000, 1200, 2006),
    ("SET India", "@setindia", "Entertainment", "India", "184M", 184000000, "170B", 170000000000, 80000, 2006),
    ("Vlad and Niki", "@VladandNiki", "Family", "United States", "135M", 135000000, "105B", 105000000000, 900, 2018),
    ("Like Nastya", "@LikeNastyaofficial", "Family", "United States", "125M", 125000000, "105B", 105000000000, 900, 2016),
    ("Kids Diana Show", "@KidsDianaShow", "Family", "Ukraine", "130M", 130000000, "110B", 110000000000, 1200, 2015),
    ("Alan Chikin Chow", "@alanchikinchow", "Comedy", "United States", "60M", 60000000, "55B", 55000000000, 1800, 2020),
    ("Zee Music Company", "@zeemusiccompany", "Music", "India", "115M", 115000000, "65B", 65000000000, 9000, 2014),
    ("Justin Bieber", "@justinbieber", "Music", "Canada", "75M", 75000000, "32B", 32000000000, 250, 2007),
    ("Taylor Swift", "@TaylorSwift", "Music", "United States", "60M", 60000000, "32B", 32000000000, 300, 2006),
    ("Billie Eilish", "@BillieEilish", "Music", "United States", "55M", 55000000, "18B", 18000000000, 150, 2013),
    ("EminemMusic", "@eminemmusic", "Music", "United States", "64M", 64000000, "32B", 32000000000, 200, 2007),
    ("Beyonce", "@Beyonce", "Music", "United States", "28M", 28000000, "14B", 14000000000, 180, 2008),
    ("Ariana Grande", "@ArianaGrande", "Music", "United States", "55M", 55000000, "25B", 25000000000, 180, 2007),
    ("Ed Sheeran", "@EdSheeran", "Music", "United Kingdom", "57M", 57000000, "32B", 32000000000, 260, 2006),
    ("MrBeast Gaming", "@MrBeastGaming", "Gaming", "United States", "46M", 46000000, "9B", 9000000000, 180, 2020),
    ("Dream", "@dream", "Gaming", "United States", "34M", 34000000, "3B", 3000000000, 140, 2014),
    ("Sssniperwolf", "@sssniperwolf", "Gaming", "United States", "35M", 35000000, "10B", 10000000000, 3000, 2013),
    ("Preston", "@PrestonPlayz", "Gaming", "United States", "31M", 31000000, "23B", 23000000000, 7000, 2010),
    ("FGTeeV", "@FGTeeV", "Gaming", "United States", "24M", 24000000, "24B", 24000000000, 2000, 2013),
    ("KSI", "@KSI", "Entertainment", "United Kingdom", "25M", 25000000, "7B", 7000000000, 900, 2009),
    ("Logan Paul", "@loganpaulvlogs", "Entertainment", "United States", "24M", 24000000, "6B", 6000000000, 800, 2015),
    ("Sidemen", "@Sidemen", "Entertainment", "United Kingdom", "21M", 21000000, "7B", 7000000000, 500, 2015),
    ("The Try Guys", "@tryguys", "Entertainment", "United States", "8M", 8000000, "3B", 3000000000, 700, 2014),
    ("How Ridiculous", "@howridiculous", "Entertainment", "Australia", "23M", 23000000, "7B", 7000000000, 500, 2009),
    ("Jenna Marbles", "@JennaMarbles", "Comedy", "United States", "20M", 20000000, "2B", 2000000000, 250, 2010),
    ("Philip DeFranco", "@PhilipDeFranco", "News & Commentary", "United States", "6M", 6000000, "2B", 2000000000, 3000, 2006),
    ("Smosh", "@smosh", "Comedy", "United States", "26M", 26000000, "11B", 11000000000, 2000, 2005),
    ("Good Mythical Morning", "@GoodMythicalMorning", "Entertainment", "United States", "19M", 19000000, "9B", 9000000000, 3000, 2008),
    ("Gordon Ramsay", "@GordonRamsay", "Food", "United Kingdom", "20M", 20000000, "5B", 5000000000, 800, 2006),
    ("Joshua Weissman", "@JoshuaWeissman", "Food", "United States", "10M", 10000000, "2B", 2000000000, 500, 2014),
    ("Binging with Babish", "@BabishCulinaryUniverse", "Food", "United States", "10M", 10000000, "3B", 3000000000, 700, 2006),
    ("NikkieTutorials", "@NikkieTutorials", "Beauty & Fashion", "Netherlands", "14M", 14000000, "1.5B", 1500000000, 700, 2008),
    ("James Charles", "@JamesCharles", "Beauty & Fashion", "United States", "24M", 24000000, "4B", 4000000000, 500, 2015),
    ("Jeffree Star", "@jeffreestar", "Beauty & Fashion", "United States", "16M", 16000000, "2B", 2000000000, 500, 2006),
    ("Lilly Singh", "@IISuperwomanII", "Comedy", "Canada", "15M", 15000000, "3B", 3000000000, 900, 2010),
    ("Sadhguru", "@Sadhguru", "Education", "India", "13M", 13000000, "2B", 2000000000, 7000, 2007),
    ("Ali-A", "@AliA", "Gaming", "United Kingdom", "18M", 18000000, "6B", 6000000000, 4000, 2006),
    ("VanossGaming", "@VanossGaming", "Gaming", "Canada", "25M", 25000000, "16B", 16000000000, 1600, 2011),
    ("TheRadBrad", "@TheRadBrad", "Gaming", "United States", "13M", 13000000, "6B", 6000000000, 6000, 2010),
    ("FBE", "@FBE", "Entertainment", "United States", "9M", 9000000, "4B", 4000000000, 3000, 2007),
    ("Dhar Mann", "@DharMann", "Entertainment", "United States", "24M", 24000000, "13B", 13000000000, 1600, 2018),
    ("NPR Music", "@nprmusic", "Music", "United States", "5M", 5000000, "2B", 2000000000, 3000, 2008),
    ("The Slow Mo Guys", "@theslowmoguys", "Education", "United Kingdom", "15M", 15000000, "2B", 2000000000, 250, 2010),
    ("Peter Santenello", "@PeterSantenello", "Lifestyle & Vlog", "United States", "4M", 4000000, "600M", 600000000, 300, 2013),
    ("Yes Theory", "@YesTheory", "Lifestyle & Vlog", "Canada", "9M", 9000000, "1B", 1000000000, 500, 2015),
    ("Nas Daily", "@NasDaily", "Lifestyle & Vlog", "Singapore", "13M", 13000000, "6B", 6000000000, 3000, 2016),
    ("The Infographics Show", "@TheInfographicsShow", "Education", "United States", "14M", 14000000, "5B", 5000000000, 2500, 2011),
    ("Kurzgesagt", "@kurzgesagt", "Education", "Germany", "25M", 25000000, "4B", 4000000000, 200, 2013),
    ("Dude Perfect Gaming", "@DudePerfect", "Sports", "United States", "4M", 4000000, "500M", 500000000, 200, 2019),
    ("F1", "@Formula1", "Sports", "United Kingdom", "10M", 10000000, "3B", 3000000000, 5000, 2005),
    ("NBA", "@nba", "Sports", "United States", "22M", 22000000, "8B", 8000000000, 20000, 2005),
]

for index, spec in enumerate(additional_creator_specs, start=11):
    name, handle, niche, country, subscribers, raw_subs, total_views, raw_views, video_count, joined_year = spec
    creators.append(creator(index, name, handle, niche, country, subscribers, raw_subs, total_views, raw_views, video_count, joined_year, f"Official videos, stories, and updates from {name}."))


# ---------------------------------------------------------------------------
# ON-BOOT VALIDATION: runs once when the server starts. Every dict in
# `creators` gets passed through the Youtuber model; if any record has the
# wrong type, the server crashes here immediately instead of failing later
# on a real user's request.
# ---------------------------------------------------------------------------
validated_creators: List[Dict[str, Any]] = [Youtuber(**c).model_dump() for c in creators]


@app.get("/", response_class=HTMLResponse)
def home():
    file_path = os.path.join(os.path.dirname(__file__), "../index.html")
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    return "<h1>Welcome to the YouTuber Archive API</h1><p>index.html not found.</p>"


# --- STATIC FILES: index.html only asks the browser to load these by name,
# so the API needs its own routes for them, or they silently 404 and the
# page renders unstyled with no interactivity (no CSS, no app.js running).
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
    return {"count": len(creators), "creators": creators}


@app.get("/creators/search")
@app.get("/youtubers/search")
def search_creators(q: str = Query(..., min_length=1)) -> Dict[str, Any]:
    query = q.strip().lower()
    results = [
        item for item in creators
        if query in " ".join(str(value) for value in item.values()).lower()
    ]
    return {"query": query, "count": len(results), "results": results}


@app.get("/creators/{creator_id}")
@app.get("/youtubers/{creator_id}")
def get_creator(creator_id: int) -> Dict[str, Any]:
    match = next((item for item in creators if item["id"] == creator_id), None)
    if match is None:
        raise HTTPException(status_code=404, detail="Creator not found.")
    return match


# ---------------------------------------------------------------------------
# HEALTH ENDPOINT: public, no API key needed. Cloud platforms (Vercel, AWS,
# Docker) ping this on a schedule to confirm the service is alive.
# ---------------------------------------------------------------------------
@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "YouTuber Archive API",
        "timestamp_utc": datetime.now(timezone.utc).isoformat()
    }


# ---------------------------------------------------------------------------
# VERSIONED + PROTECTED ROUTES: everything under /api/v1/ requires the
# x-api-key header, enforced by dependencies=[Depends(verify_api_key)].
# ---------------------------------------------------------------------------
@app.get("/api/v1/creators", dependencies=[Depends(verify_api_key)])
def get_creators_v1() -> Dict[str, Any]:
    return {"count": len(validated_creators), "creators": validated_creators}


@app.get("/api/v1/creators/search", dependencies=[Depends(verify_api_key)])
def search_creators_v1(q: str = Query(..., min_length=1)) -> Dict[str, Any]:
    query = q.strip().lower()
    results = [
        item for item in validated_creators
        if query in " ".join(str(value) for value in item.values()).lower()
    ]
    return {"query": query, "count": len(results), "results": results}


@app.get("/api/v1/creators/{creator_id}", dependencies=[Depends(verify_api_key)])
def get_creator_v1(creator_id: int) -> Dict[str, Any]:
    match = next((item for item in validated_creators if item["id"] == creator_id), None)
    if match is None:
        raise HTTPException(status_code=404, detail="Creator not found.")
    return match