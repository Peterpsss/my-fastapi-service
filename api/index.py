import os
import re
import hashlib
import hmac
import secrets
import threading
import csv
import io
import json
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Literal, Optional
from datetime import datetime, timezone, timedelta

from fastapi import FastAPI, HTTPException, Query, Depends, Header, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field

import psycopg2
import psycopg2.errors  # must be imported explicitly: `except psycopg2.errors.UniqueViolation` fails without it
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# PyJWT is only needed for accounts/admin login. If it is missing the creator
# endpoints keep working and the auth endpoints answer 503 instead of crashing
# the whole service at import time.
try:
    import jwt  # PyJWT
except ImportError:  # pragma: no cover
    jwt = None

try:
    from creators_seed import SEED_CREATORS
    import access
    import mailer
    import overrides_engine
except ImportError:  # pragma: no cover - when run as a package
    from .creators_seed import SEED_CREATORS
    from . import access
    from . import mailer
    from . import overrides_engine

# Your own corrections (api/creator_overrides.py: banners, avatars, top videos...) are applied on top of the built-in catalog.
# A mistake in that file is reported by /health and never stops the API.
SEED_CREATORS, OVERRIDES_INFO = overrides_engine.apply_file(SEED_CREATORS)
for _w in OVERRIDES_INFO["warnings"]:
    print("creator_overrides:", _w)

# Load environment variables from .env file
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

app = FastAPI(
    title="YouTuber Archive API",
    description="A searchable directory of YouTube creators and channel metrics backed by Neon PostgreSQL.",
    version="6.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------------------------
# READ key: only unlocks the /api/v1 *read* routes. It is not a secret (the public
# /creators routes return the same data) so it is safe for the front-ends to carry it.
READ_API_KEY = os.getenv("READ_API_KEY") or os.getenv("API_KEY") or "supersecret123"
# WRITE key: optional. Never put it in browser code. If unset, only a logged-in
# admin (Bearer token) can create / update / delete creators.
WRITE_API_KEY = os.getenv("WRITE_API_KEY")

CACHE_PUBLIC = "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
CACHE_PRIVATE = "private, max-age=60"


def _safe_eq(a: Optional[str], b: Optional[str]) -> bool:
    if not a or not b:
        return False
    return hmac.compare_digest(a.encode("utf-8"), b.encode("utf-8"))


# ---------------------------------------------------------------------------
# DATABASE CONNECTION UTILITY (lazy initialisation = faster, safer cold starts)
# ---------------------------------------------------------------------------
_db_ready = False
_db_lock = threading.Lock()


def _connect():
    if not DATABASE_URL:
        raise HTTPException(status_code=500, detail="Database connection string is missing in environment variables.")
    try:
        return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor, connect_timeout=10)
    except Exception as e:
        print(f"Database connection failed: {e}")  # details stay in the server log
        raise HTTPException(status_code=503, detail="Database temporarily unavailable. Please try again.")


def get_db_connection():
    ensure_db_ready()
    return _connect()


def ensure_db_ready() -> None:
    """Create tables / seed / bootstrap accounts once per process, on first use."""
    global _db_ready
    if _db_ready:
        return
    with _db_lock:
        if _db_ready:
            return
        if init_db():
            bootstrap_default_accounts()
            auto_sync_catalog()
            auto_refresh_banners()
            _db_ready = True


_last_init_error: Optional[str] = None

# Bump this string whenever creators_seed.py changes: the next API start then pushes the whole catalog into the database
# automatically (inserts missing creators, corrects old rows) - nobody has to type creator data or run SQL.
CATALOG_VERSION = "2026-11-23.1" + OVERRIDES_INFO["suffix"]   # the suffix changes when you edit creator_overrides.py


def _describe_error(e: Exception) -> str:
    """Short, secret-free description of a database error (class name + first line of the message)."""
    if isinstance(e, psycopg2.OperationalError):
        return "OperationalError (could not connect or the connection was lost)"
    first = (str(e).strip().splitlines() or [""])[0][:200]
    return f"{type(e).__name__}: {first}"


USERS_SQL = """
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        password_hash TEXT,
        role VARCHAR(10) NOT NULL DEFAULT 'user',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- An older "users" table may already exist in the database: make it compatible instead of failing.
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(10) NOT NULL DEFAULT 'user';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    CREATE UNIQUE INDEX IF NOT EXISTS users_username_key ON users (username);

    -- email confirmation (existing accounts stay confirmed; new sign-ups start unconfirmed)
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(254);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT TRUE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_token_hash TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_expires TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_sent_at TIMESTAMPTZ;
    CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (LOWER(email)) WHERE email IS NOT NULL;

    DO $$
    DECLARE r RECORD;
    BEGIN
        -- extra columns from an older schema must not block new accounts
        FOR r IN SELECT column_name FROM information_schema.columns
                 WHERE table_schema = current_schema() AND table_name = 'users' AND is_nullable = 'NO'
                   AND column_default IS NULL AND column_name NOT IN ('id', 'username', 'role', 'created_at', 'email_verified')
        LOOP
            EXECUTE format('ALTER TABLE users ALTER COLUMN %I DROP NOT NULL', r.column_name);
        END LOOP;
        -- replace any old role rule with: guest accounts do not exist in the table, only member (user) and admin
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'users'::regclass AND conname = 'users_role_v3') THEN
            FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'users'::regclass AND contype = 'c'
            LOOP
                EXECUTE format('ALTER TABLE users DROP CONSTRAINT %I', r.conname);
            END LOOP;
            UPDATE users SET role = 'user' WHERE role NOT IN ('user', 'admin');
            ALTER TABLE users ADD CONSTRAINT users_role_v3 CHECK (role IN ('user', 'admin'));
        END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        actor VARCHAR(60) NOT NULL,
        action VARCHAR(40) NOT NULL,
        target TEXT NOT NULL DEFAULT ''
    );
"""

CREATORS_SQL = """
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

            ALTER TABLE popular_videos ADD COLUMN IF NOT EXISTS url TEXT;
            ALTER TABLE popular_videos ADD COLUMN IF NOT EXISTS video_id VARCHAR(20);
            ALTER TABLE popular_videos ADD COLUMN IF NOT EXISTS status VARCHAR(12) NOT NULL DEFAULT 'unverified';
            ALTER TABLE youtubers ADD COLUMN IF NOT EXISTS channel_id VARCHAR(40);
            ALTER TABLE popular_videos ADD COLUMN IF NOT EXISTS channel_title TEXT;
            ALTER TABLE popular_videos ADD COLUMN IF NOT EXISTS on_channel BOOLEAN NOT NULL DEFAULT TRUE;
            CREATE TABLE IF NOT EXISTS site_meta (key VARCHAR(40) PRIMARY KEY, value TEXT NOT NULL);
            ALTER TABLE youtubers ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT FALSE;
            ALTER TABLE youtubers ADD COLUMN IF NOT EXISTS verified_at DATE;
            ALTER TABLE youtubers ADD COLUMN IF NOT EXISTS categories TEXT NOT NULL DEFAULT '';
            ALTER TABLE youtubers ADD COLUMN IF NOT EXISTS locked_fields TEXT NOT NULL DEFAULT '';
            CREATE UNIQUE INDEX IF NOT EXISTS youtubers_channel_id_key ON youtubers (channel_id) WHERE channel_id IS NOT NULL;
"""


def init_db() -> bool:
    """Creates tables, seeds the catalog, in independent steps so one problem cannot hide the others."""
    global _last_init_error
    conn = _connect()
    cursor = conn.cursor()
    ok = True
    errors: List[str] = []
    try:
        for label, sql in (("catalog tables", CREATORS_SQL), ("accounts tables", USERS_SQL)):
            try:
                cursor.execute(sql)
                conn.commit()
            except Exception as e:
                conn.rollback()
                ok = False
                errors.append(f"{label}: {_describe_error(e)}")
                print(f"Error initializing {label}: {e}")
        try:
            cursor.execute("SELECT COUNT(*) AS count FROM youtubers;")
            if cursor.fetchone()["count"] == 0:
                seed_database(cursor)
                conn.commit()
                print(f"Database successfully seeded with {len(SEED_CREATORS)} creators!")
        except Exception as e:
            conn.rollback()
            ok = False
            errors.append(f"seeding: {_describe_error(e)}")
            print(f"Error seeding database: {e}")
        _last_init_error = "; ".join(errors) or None
        return ok
    finally:
        cursor.close()
        conn.close()


def _slug(handle: str) -> str:
    return handle.lstrip("@").replace(" ", "")


def _default_avatar(handle: str) -> str:
    slug = _slug(handle)
    return f"https://unavatar.io/youtube/{slug}?fallback=https://ui-avatars.com/api/?background=272727&color=fff&size=128&name={slug}"


def _video_fields(video: Dict[str, Any]):
    """-> (title, views, thumb, url, video_id, status). A real video id always wins over a pasted URL."""
    vid = video.get("videoId") or None
    url = video.get("url") or None
    if vid:
        url = f"https://www.youtube.com/watch?v={vid}"
    thumb = video.get("thumb") or (f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg" if vid else "")
    status = video.get("status") or ("checked" if vid else "unverified")
    return (video.get("title") or "Not verified yet", video.get("views") or "", thumb, url, vid, status)


def _video_extra(video: Dict[str, Any]):
    """-> (channel_title, on_channel): which channel hosts the video (artists often use a separate VEVO channel)."""
    return (video.get("channelTitle") or None, video.get("onChannel") is not False)


def _join_categories(c: Dict[str, Any]) -> str:
    """Categories are stored as one text column joined with '|' (first = primary = niche)."""
    cats = [x for x in (c.get("categories") or []) if x] or [c["niche"]]
    return "|".join(cats)


def _insert_creator(cursor, c: Dict[str, Any]) -> int:
    video = c.get("popularVideo") or {}
    cursor.execute("""
        INSERT INTO youtubers (name, handle, niche, country, subscribers, raw_subs, total_views, raw_views, video_count, avatar, banner, bio, joined_year, channel_id, verified, verified_at, categories)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id;
    """, (
        c["name"], c["handle"], c["niche"], c["country"], c["subscribers"], c["rawSubs"],
        c["totalViews"], c["rawViews"], c["videoCount"], c.get("avatar") or _default_avatar(c["handle"]),
        c.get("banner") or "", c["bio"], c["joinedYear"], c.get("channelId") or None,
        bool(c.get("verified")), c.get("verifiedAt") or None, _join_categories(c),
    ))
    new_id = cursor.fetchone()["id"]
    cursor.execute("""
        INSERT INTO popular_videos (youtuber_id, title, views, thumb, url, video_id, status, channel_title, on_channel)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
    """, (new_id,) + _video_fields(video) + _video_extra(video))
    return new_id


# Fields an admin typed in by hand are remembered (youtubers.locked_fields) so the automatic catalog sync never overwrites them.
LOCK_GROUPS = ("identity", "stats", "avatar", "banner", "bio", "country", "categories", "video")


def _lock_set(value: Any) -> set:
    return {x for x in str(value or "").split(",") if x in LOCK_GROUPS}


def _update_from_seed(cursor, row_id: int, c: Dict[str, Any], full: bool = False, locked=frozenset()) -> None:
    """Refresh the VERIFIED facts of an existing row (handle, channel id, counts, top video).
    full=True also replaces name / niche / country / bio / avatar (used by the automatic catalog sync).
    `locked` = field groups an admin edited by hand: those are left exactly as the admin set them."""
    video = c.get("popularVideo") or {}
    sets, params = [], []
    if "identity" not in locked:
        sets += ["handle = %s", "channel_id = %s"]
        params += [c["handle"], c.get("channelId") or None]
    if "stats" not in locked:
        sets += ["subscribers = %s", "raw_subs = %s", "total_views = %s", "raw_views = %s", "video_count = %s", "joined_year = %s"]
        params += [c["subscribers"], c["rawSubs"], c["totalViews"], c["rawViews"], c["videoCount"], c["joinedYear"]]
    sets += ["verified = %s", "verified_at = %s"]
    params += [bool(c.get("verified")), c.get("verifiedAt") or None]
    cursor.execute("UPDATE youtubers SET " + ", ".join(sets) + " WHERE id = %s;", tuple(params + [row_id]))
    if full:
        sets, params = [], []
        if "identity" not in locked:
            sets.append("name = %s"); params.append(c["name"])
        if "categories" not in locked:
            sets += ["niche = %s", "categories = %s"]; params += [c["niche"], _join_categories(c)]
        if "country" not in locked:
            sets.append("country = %s"); params.append(c["country"])
        if "bio" not in locked:
            sets.append("bio = %s"); params.append(c["bio"])
        if "avatar" not in locked:
            sets.append("avatar = %s"); params.append(c.get("avatar") or _default_avatar(c["handle"]))
        if "banner" not in locked:
            sets.append("banner = CASE WHEN %s <> '' THEN %s ELSE COALESCE(banner, '') END"); params += [c.get("banner") or "", c.get("banner") or ""]
        if sets:
            cursor.execute("UPDATE youtubers SET " + ", ".join(sets) + " WHERE id = %s;", tuple(params + [row_id]))
    if "video" in locked:
        return
    extra = _video_extra(video)
    title, views, thumb, url, vid, status = _video_fields(video)
    if status == "unverified":
        # never replace an existing, better top video with "not verified yet"
        cursor.execute("""
            INSERT INTO popular_videos (youtuber_id, title, views, thumb, url, video_id, status, channel_title, on_channel)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (youtuber_id) DO UPDATE SET video_id = NULL, status = 'unverified', url = NULL, thumb = '', title = 'Not verified yet', views = ''
            WHERE popular_videos.status = 'unverified' OR popular_videos.video_id IS NULL;
        """, (row_id, title, views, thumb, url, vid, status) + extra)
    else:
        cursor.execute("""
            INSERT INTO popular_videos (youtuber_id, title, views, thumb, url, video_id, status, channel_title, on_channel)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (youtuber_id) DO UPDATE SET title = EXCLUDED.title, views = EXCLUDED.views, thumb = EXCLUDED.thumb,
                   url = EXCLUDED.url, video_id = EXCLUDED.video_id, status = EXCLUDED.status,
                   channel_title = EXCLUDED.channel_title, on_channel = EXCLUDED.on_channel;
        """, (row_id, title, views, thumb, url, vid, status) + extra)


def _norm_name(text: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (text or "").lower())


def sync_catalog(cursor, update: bool = False, full: bool = False) -> Dict[str, int]:
    """Make the database contain every catalog creator. Matches an existing row by channel id, then handle, then name,
    so rows created from the OLD starter data (wrong handles) are corrected instead of duplicated.
    update=False -> only inserts missing creators.  update=True -> also refreshes verified facts of matched rows."""
    cursor.execute("SELECT id, name, handle, channel_id, locked_fields FROM youtubers;")
    rows = cursor.fetchall()
    locks = {r["id"]: _lock_set(r.get("locked_fields")) for r in rows}
    by_channel = {r["channel_id"]: r["id"] for r in rows if r.get("channel_id")}
    by_handle = {r["handle"].lower(): r["id"] for r in rows}
    by_name = {_norm_name(r["name"]): r["id"] for r in rows}
    added = updated = 0
    for c in SEED_CREATORS:
        rid = by_channel.get(c.get("channelId")) or by_handle.get(c["handle"].lower()) or by_name.get(_norm_name(c["name"]))
        if rid is None:
            new_id = _insert_creator(cursor, c)
            by_channel[c.get("channelId")] = by_handle[c["handle"].lower()] = by_name[_norm_name(c["name"])] = new_id
            added += 1
        elif update:
            _update_from_seed(cursor, rid, c, full=full, locked=locks.get(rid, frozenset()))
            updated += 1
    return {"added": added, "updated": updated}


# --- Real channel banners -------------------------------------------------------------------------------------------
# vidIQ does not expose banners, so the API fetches them itself from the official YouTube Data API when the owner sets a
# free key in the YOUTUBE_API_KEY environment variable (2 requests cover all 100 channels). Without a key the sites show
# a designed banner built from the creator's real avatar instead. Failures never break the site.
BANNER_SUFFIX = "=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj"
BANNER_RETRY_HOURS = 6


def _youtube_key() -> str:
    return (os.getenv("YOUTUBE_API_KEY") or "").strip()


def _fetch_banner_urls(channel_ids: List[str]) -> Dict[str, str]:
    key = _youtube_key()
    found: Dict[str, str] = {}
    if not key:
        return found
    for i in range(0, len(channel_ids), 50):
        chunk = channel_ids[i:i + 50]
        url = "https://www.googleapis.com/youtube/v3/channels?" + urllib.parse.urlencode(
            {"part": "brandingSettings", "id": ",".join(chunk), "maxResults": 50, "key": key})
        try:
            with urllib.request.urlopen(url, timeout=8) as resp:  # nosec - fixed https host
                data = json.loads(resp.read().decode("utf-8"))
        except Exception as e:  # never log the URL: it contains the key
            print(f"Banner request failed: {type(e).__name__} {getattr(e, 'code', '')}")
            continue
        for item in data.get("items", []):
            base = (((item.get("brandingSettings") or {}).get("image") or {}).get("bannerExternalUrl") or "")
            if base.startswith("https://") and item.get("id"):
                found[item["id"]] = base + BANNER_SUFFIX
    return found


def refresh_banners(cursor, only_missing: bool = True) -> Dict[str, int]:
    """Stores the real banner URL for creators that have none yet (or all, with only_missing=False)."""
    cursor.execute("SELECT id, channel_id, banner FROM youtubers WHERE channel_id IS NOT NULL;")
    rows = [r for r in cursor.fetchall() if (not only_missing) or not (r["banner"] or "").strip()]
    urls = _fetch_banner_urls([r["channel_id"] for r in rows])
    saved = 0
    for r in rows:
        u = urls.get(r["channel_id"])
        if u:
            cursor.execute("UPDATE youtubers SET banner = %s WHERE id = %s;", (u, r["id"]))
            saved += 1
    return {"checked": len(rows), "saved": saved}


def auto_refresh_banners() -> None:
    """Runs at start-up when a YouTube key is configured and some creators still have no banner (retried at most every
    BANNER_RETRY_HOURS hours)."""
    if not _youtube_key():
        return
    conn = None
    try:
        conn = _connect()
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) AS n FROM youtubers WHERE channel_id IS NOT NULL AND COALESCE(banner, '') = '';")
        if cur.fetchone()["n"] == 0:
            return
        cur.execute("SELECT value FROM site_meta WHERE key = 'banner_attempt';")
        row = cur.fetchone()
        if row:
            try:
                last = datetime.fromisoformat(row["value"])
                if datetime.now(timezone.utc) - last < timedelta(hours=BANNER_RETRY_HOURS):
                    return
            except ValueError:
                pass
        result = refresh_banners(cur)
        cur.execute("INSERT INTO site_meta (key, value) VALUES ('banner_attempt', %s) "
                    "ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;", (datetime.now(timezone.utc).isoformat(),))
        conn.commit()
        print(f"Banner refresh: {result}")
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Banner refresh failed: {_describe_error(e)}")
    finally:
        if conn:
            conn.close()


def auto_sync_catalog() -> None:
    """Runs once per CATALOG_VERSION: copies the built-in 100-creator catalog into the database (add missing, correct old
    rows). Failure is non-fatal and is reported by /health."""
    global _last_init_error
    conn = None
    try:
        conn = _connect()
        cur = conn.cursor()
        cur.execute("SELECT value FROM site_meta WHERE key = 'catalog_version';")
        row = cur.fetchone()
        if row and row["value"] == CATALOG_VERSION:
            return
        result = sync_catalog(cur, update=True, full=True)
        cur.execute("INSERT INTO site_meta (key, value) VALUES ('catalog_version', %s) "
                    "ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;", (CATALOG_VERSION,))
        conn.commit()
        print(f"Catalog {CATALOG_VERSION} synced: {result}")
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Automatic catalog sync failed: {e}")
        _last_init_error = ((_last_init_error + "; ") if _last_init_error else "") + f"catalog sync: {_describe_error(e)}"
    finally:
        if conn:
            conn.close()


def seed_database(cursor) -> int:
    for c in SEED_CREATORS:
        _insert_creator(cursor, c)
    return len(SEED_CREATORS)


def seed_missing(cursor) -> int:
    """Backwards-compatible helper: insert creators that are not in the database yet. Never overwrites."""
    return sync_catalog(cursor, update=False)["added"]


def audit(actor: str, action: str, target: str = "") -> None:
    """Best-effort audit trail; a logging failure must never break the request."""
    try:
        conn = _connect()
        cur = conn.cursor()
        try:
            cur.execute("INSERT INTO audit_log (actor, action, target) VALUES (%s, %s, %s);", (actor[:60], action[:40], target[:500]))
            conn.commit()
        finally:
            cur.close()
            conn.close()
    except Exception as e:  # pragma: no cover
        print(f"audit failed: {e}")


# ---------------------------------------------------------------------------
# PYDANTIC SCHEMAS FOR VALIDATION
# ---------------------------------------------------------------------------
NICHES = Literal[
    "Gaming", "Entertainment", "Education", "Tech & Gadgets",
    "Lifestyle & Vlog", "Family", "Comedy", "Music",
    "News & Commentary", "Food", "Beauty & Fashion", "Sports & Fitness",
    "Challenges & Stunts", "Stories & Mystery"
]


class PopularVideo(BaseModel):
    title: str
    views: str
    thumb: str
    url: Optional[str] = None


class Youtuber(BaseModel):
    id: int
    name: str
    handle: str
    niche: NICHES
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
# USERS & ADMINS (AUTHENTICATION)
# ---------------------------------------------------------------------------
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 12
GUEST_EXPIRE_HOURS = 4
PBKDF2_ITERATIONS = 200_000
USERNAME_RE = re.compile(r"^[A-Za-z0-9_.-]{3,50}$")

bearer_scheme = HTTPBearer(auto_error=False)


EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}$")
VERIFY_HOURS = 24
RESEND_SECONDS = 60


class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., min_length=5, max_length=254)
    password: str = Field(..., min_length=8, max_length=128)


class VerifyPayload(BaseModel):
    token: str = Field(..., min_length=10, max_length=200)


class ResendPayload(BaseModel):
    email: str = Field(..., min_length=3, max_length=254)


class UserLogin(BaseModel):
    username: str
    password: str


class RoleUpdate(BaseModel):
    role: Literal["user", "admin"]


def _require_jwt() -> None:
    if jwt is None:
        raise HTTPException(status_code=503, detail="Account features are unavailable: PyJWT is not installed.")
    if not JWT_SECRET:
        raise HTTPException(status_code=500, detail="JWT_SECRET is missing in environment variables.")


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), PBKDF2_ITERATIONS).hex()
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _algo, iterations, salt, digest = stored.split("$")
        check = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), int(iterations)).hex()
        return hmac.compare_digest(check, digest)
    except Exception:
        return False


def create_access_token(user: Dict[str, Any]) -> str:
    _require_jwt()
    payload = {
        "sub": str(user["id"]),
        "username": user["username"],
        "role": user["role"],
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> Dict[str, Any]:
    _require_jwt()
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")


def fetch_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, username, role, created_at, email FROM users WHERE id = %s;", (user_id,))
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        cursor.close()
        conn.close()


GUEST_USER = {"id": 0, "username": "guest", "role": "guest", "created_at": None}


def create_guest_token() -> str:
    _require_jwt()
    payload = {"sub": "guest", "username": "guest", "role": "guest",
               "exp": datetime.now(timezone.utc) + timedelta(hours=GUEST_EXPIRE_HOURS)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)) -> Dict[str, Any]:
    """No token -> guest. A valid guest/user/admin token -> that account. A bad or expired token -> 401 (client falls back to guest)."""
    if not credentials:
        return dict(GUEST_USER)
    return get_current_user(credentials)


def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)) -> Dict[str, Any]:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    payload = decode_access_token(credentials.credentials)
    if payload.get("sub") == "guest":
        return dict(GUEST_USER)
    try:
        user_id = int(payload.get("sub"))
    except (TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token.")
    # Role is re-read from the database, so promoting/demoting a user takes effect immediately
    user = fetch_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User no longer exists.")
    return user


def require_admin(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    return user


def public_user(user: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": user["id"],
        "username": user["username"],
        "role": user["role"],
        "createdAt": user["created_at"].isoformat() if user.get("created_at") else None,
        "email": user.get("email"),
        "emailVerified": user.get("email_verified", True),
        "permissions": access.permissions_for(user["role"]),
    }


def ensure_user(username: str, password: str, role: str, sync: bool = False) -> None:
    """Create an account if it does not exist yet (used to bootstrap the first admin/user).
    With sync=True (the admin account) the password and role in the environment variables always win,
    so changing ADMIN_PASSWORD in Vercel and redeploying resets the admin login."""
    global _last_init_error
    name = username.strip().lower()
    conn = _connect()  # direct connection: this runs during initialisation
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, password_hash, role FROM users WHERE username = %s;", (name,))
        row = cursor.fetchone()
        if row is None:
            cursor.execute(
                "INSERT INTO users (username, password_hash, role) VALUES (%s, %s, %s);",
                (name, hash_password(password), role),
            )
        elif sync and (row["role"] != role or not verify_password(password, row["password_hash"] or "")):
            cursor.execute("UPDATE users SET password_hash = %s, role = %s WHERE id = %s;", (hash_password(password), role, row["id"]))
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"Could not create {role} account '{name}': {e}")
        _last_init_error = ((_last_init_error + "; ") if _last_init_error else "") + f"{role} account: {_describe_error(e)}"
    finally:
        cursor.close()
        conn.close()


def bootstrap_default_accounts():
    """Reads ADMIN_/USER_ USERNAME + PASSWORD pairs from the environment and creates those accounts once."""
    try:
        admin_u, admin_p = os.getenv("ADMIN_USERNAME"), os.getenv("ADMIN_PASSWORD")
        if admin_u and admin_p:
            ensure_user(admin_u, admin_p, "admin", sync=True)
        user_u, user_p = os.getenv("USER_USERNAME"), os.getenv("USER_PASSWORD")
        if user_u and user_p:
            ensure_user(user_u, user_p, "user")
    except Exception as e:
        print(f"Error bootstrapping default accounts: {e}")


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _mask_email(email: str) -> str:
    name, _, domain = email.partition("@")
    return (name[:1] + "***" if len(name) > 1 else name) + "@" + domain


def _site_url(request: Request) -> str:
    """Where the confirmation link points: SITE_URL if set, otherwise the address this request came in on."""
    configured = (os.getenv("SITE_URL") or "").strip().rstrip("/")
    return configured or str(request.base_url).rstrip("/")


def _email_confirmation_required() -> bool:
    return (os.getenv("EMAIL_CONFIRM", "on").strip().lower() not in ("off", "false", "0", "no"))


def _send_confirmation(request: Request, username: str, email: str, token: str) -> None:
    link = f"{_site_url(request)}/login.html?verify={token}"
    subject, text, html = mailer.confirmation_email(username, link)
    mailer.send_mail(email, subject, text, html)


def _new_verify_token(cursor, user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    cursor.execute(
        "UPDATE users SET verify_token_hash = %s, verify_expires = NOW() + (%s || ' hours')::interval, verify_sent_at = NOW() WHERE id = %s;",
        (_hash_token(token), str(VERIFY_HOURS), user_id),
    )
    return token


@app.post("/auth/register", status_code=201)
def register(payload: UserRegister, request: Request) -> Dict[str, Any]:
    """Public sign-up. New accounts are ALWAYS role 'user' (shown as Member) - admins are promoted by another admin.
    The account only works after the emailed confirmation link is opened (set EMAIL_CONFIRM=off to skip that while testing)."""
    _require_jwt()
    username = payload.username.strip().lower()
    email = payload.email.strip().lower()
    if not USERNAME_RE.match(username):
        raise HTTPException(status_code=400, detail="Username must be 3-50 characters: letters, numbers, _ . -")
    if not EMAIL_RE.match(email) or ".." in email or len(email) > 254:
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")
    confirm = _email_confirmation_required()
    if confirm and not mailer.configured():
        raise HTTPException(status_code=503, detail="Sign-up by email is not switched on yet: the site owner must add the SMTP_HOST, SMTP_USER and SMTP_PASSWORD settings.")
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # forget sign-ups that were never confirmed within 24 hours so the name / email can be used again
        cursor.execute("DELETE FROM users WHERE email_verified = FALSE AND verify_expires IS NOT NULL AND verify_expires < NOW();")
        # a sign-up still waiting for confirmation (typo in the email, say) must not lock its username / address:
        # once its last email is older than the resend delay, the same person can simply register again
        cursor.execute(
            "DELETE FROM users WHERE email_verified = FALSE AND (username = %s OR LOWER(email) = %s) "
            "AND (verify_sent_at IS NULL OR verify_sent_at < NOW() - (%s || ' seconds')::interval);",
            (username, email, str(RESEND_SECONDS)),
        )
        try:
            cursor.execute(
                "INSERT INTO users (username, password_hash, role, email, email_verified) VALUES (%s, %s, 'user', %s, %s) "
                "RETURNING id, username, role, created_at, email;",
                (username, hash_password(payload.password), email, not confirm),
            )
        except psycopg2.errors.UniqueViolation:
            conn.rollback()
            cursor.execute("SELECT username, email, email_verified FROM users WHERE username = %s OR LOWER(email) = %s;", (username, email))
            rows = cursor.fetchall()
            if any((r["email"] or "").lower() == email for r in rows):
                pending = any(not r["email_verified"] for r in rows if (r["email"] or "").lower() == email)
                raise HTTPException(status_code=409, detail=("A confirmation email was already sent to this address - check your inbox (and spam), or press Resend."
                                                              if pending else "That email is already registered - try signing in."))
            raise HTTPException(status_code=409, detail="That username is already taken.")
        user = dict(cursor.fetchone())
        if not confirm:
            user["email_verified"] = True
            conn.commit()
            return {"message": "Account created", "pending": False, "user": public_user(user),
                    "access_token": create_access_token(user), "token_type": "bearer"}
        token = _new_verify_token(cursor, user["id"])
        conn.commit()
        try:
            _send_confirmation(request, username, email, token)
        except Exception as e:
            # no working email = no usable account: undo the sign-up so the person can try again
            print(f"Confirmation email failed: {type(e).__name__}: {e}")
            cursor.execute("DELETE FROM users WHERE id = %s;", (user["id"],))
            conn.commit()
            raise HTTPException(status_code=502, detail="We could not send the confirmation email. Check the address and try again in a minute.")
        return {"message": "Account created - check your email", "pending": True, "email": _mask_email(email),
                "resendAfterSeconds": RESEND_SECONDS}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        print(f"Register failed: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=f"Could not create the account ({_describe_error(e)}).")
    finally:
        cursor.close()
        conn.close()


@app.post("/auth/verify")
def verify_email(payload: VerifyPayload) -> Dict[str, Any]:
    """The confirmation link lands on login.html?verify=TOKEN, which calls this. Success signs the person in."""
    _require_jwt()
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT id, username, role, created_at, email FROM users WHERE verify_token_hash = %s AND verify_expires > NOW();",
            (_hash_token(payload.token.strip()),),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=400, detail="This confirmation link is invalid or has expired. Sign in to request a new one.")
        cursor.execute("UPDATE users SET email_verified = TRUE, verify_token_hash = NULL, verify_expires = NULL WHERE id = %s;", (row["id"],))
        conn.commit()
        user = dict(row)
        return {"message": "Email confirmed", "access_token": create_access_token(user), "token_type": "bearer", "user": public_user(user)}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        print(f"Verify failed: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail="Could not confirm the email right now. Please try again.")
    finally:
        cursor.close()
        conn.close()


@app.post("/auth/resend")
def resend_confirmation(payload: ResendPayload, request: Request) -> Dict[str, Any]:
    """Send a fresh confirmation email. The answer is always the same so nobody can probe which emails are registered."""
    _require_jwt()
    generic = {"message": "If that address is waiting for confirmation, a new email is on its way.", "resendAfterSeconds": RESEND_SECONDS}
    ident = payload.email.strip().lower()
    if not mailer.configured():
        raise HTTPException(status_code=503, detail="Email sending is not set up on the server yet.")
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT id, username, email, verify_sent_at FROM users WHERE email_verified = FALSE AND email IS NOT NULL "
            "AND (LOWER(email) = %s OR username = %s);", (ident, ident))
        row = cursor.fetchone()
        if not row:
            return generic
        sent = row.get("verify_sent_at")
        if sent and (datetime.now(timezone.utc) - sent).total_seconds() < RESEND_SECONDS:
            raise HTTPException(status_code=429, detail=f"Please wait a minute before asking for another email.")
        token = _new_verify_token(cursor, row["id"])
        conn.commit()
        try:
            _send_confirmation(request, row["username"], row["email"], token)
        except Exception as e:
            print(f"Resend failed: {type(e).__name__}: {e}")
            raise HTTPException(status_code=502, detail="We could not send the email. Please try again in a minute.")
        return generic
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"Resend failed: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail="Could not resend the email right now.")
    finally:
        cursor.close()
        conn.close()


@app.post("/auth/login")
def login(payload: UserLogin):
    _require_jwt()
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        ident = payload.username.strip().lower()
        cursor.execute(
            "SELECT id, username, role, created_at, password_hash, email, email_verified FROM users "
            "WHERE username = %s OR LOWER(email) = %s ORDER BY (username = %s) DESC LIMIT 1;",
            (ident, ident, ident),
        )
        row = cursor.fetchone()
    finally:
        cursor.close()
        conn.close()
    if not row or not verify_password(payload.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect username or password.")
    if row.get("email_verified") is False:
        return JSONResponse(status_code=403, content={
            "detail": "Please confirm your email first - open the link we sent you (check spam), or press Resend.",
            "code": "email_not_verified", "email": _mask_email(row["email"] or "")})
    user = dict(row)
    return {"access_token": create_access_token(user), "token_type": "bearer", "user": public_user(user)}


@app.post("/auth/guest")
def guest_login() -> Dict[str, Any]:
    """'Continue as guest': a short-lived token with the guest role. No account is created."""
    return {"access_token": create_guest_token(), "token_type": "bearer", "user": public_user(dict(GUEST_USER)),
            "expires_in_hours": GUEST_EXPIRE_HOURS}


@app.get("/auth/me")
def me(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    return public_user(user)


@app.get("/auth/roles")
def roles_overview() -> Dict[str, Any]:
    """What each role can do (used by the login page's comparison table)."""
    lim = access.limits()
    return {"limits": lim, "roles": {r: access.permissions_for(r) for r in access.ROLES}}


@app.get("/admin/users")
def admin_list_users(admin: Dict[str, Any] = Depends(require_admin)) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, username, role, created_at, email, email_verified FROM users ORDER BY id;")
        users = [public_user(dict(r)) for r in cursor.fetchall()]
        return {"count": len(users), "users": users}
    finally:
        cursor.close()
        conn.close()


@app.put("/admin/users/{user_id}/role")
def admin_set_role(user_id: int, payload: RoleUpdate, admin: Dict[str, Any] = Depends(require_admin)) -> Dict[str, Any]:
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="You cannot change your own role.")
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE users SET role = %s WHERE id = %s RETURNING id, username, role, created_at;",
            (payload.role, user_id),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found.")
        conn.commit()
        audit(f"admin:{admin['username']}", "set-role", f"{row['username']} -> {payload.role}")
        return {"message": "Role updated", "user": public_user(dict(row))}
    finally:
        cursor.close()
        conn.close()


@app.delete("/admin/users/{user_id}")
def admin_delete_user(user_id: int, admin: Dict[str, Any] = Depends(require_admin)) -> Dict[str, Any]:
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="You cannot delete your own account.")
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM users WHERE id = %s RETURNING id;", (user_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="User not found.")
        conn.commit()
        audit(f"admin:{admin['username']}", "delete-user", str(user_id))
        return {"message": f"User {user_id} deleted."}
    finally:
        cursor.close()
        conn.close()


# ---------------------------------------------------------------------------
# API KEY DEPENDENCIES
# ---------------------------------------------------------------------------
def verify_read_key(
    x_api_key: str = Header(default=None),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
):
    """Guards the /api/v1 READ routes. Accepts the read key, the write key, or an admin login."""
    if _safe_eq(x_api_key, READ_API_KEY) or _safe_eq(x_api_key, WRITE_API_KEY):
        return "key"
    if credentials:
        user = get_current_user(credentials)
        if user["role"] == "admin":
            return f"admin:{user['username']}"
        raise HTTPException(status_code=403, detail="Admin access required.")
    raise HTTPException(status_code=401, detail="Unauthorized: missing or invalid API key.")


def verify_write(
    x_api_key: str = Header(default=None),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
):
    """Guards every WRITE route. Needs the private WRITE_API_KEY or an admin login - never the public read key."""
    if _safe_eq(x_api_key, WRITE_API_KEY):
        return "write-key"
    if credentials:
        user = get_current_user(credentials)
        if user["role"] == "admin":
            return f"admin:{user['username']}"
        raise HTTPException(status_code=403, detail="Admin access required.")
    raise HTTPException(status_code=401, detail="Unauthorized: write access needs an admin login or the write key.")


def verify_editor(
    x_api_key: str = Header(default=None),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
):
    """Guards create/update. Needs the private WRITE_API_KEY or an admin login. Returns the actor label."""
    if _safe_eq(x_api_key, WRITE_API_KEY):
        return "write-key"
    if credentials:
        user = get_current_user(credentials)
        if user["role"] == "admin":
            return f"admin:{user['username']}"
        raise HTTPException(status_code=403, detail="Admin access required.")
    raise HTTPException(status_code=401, detail="Unauthorized: editing needs an admin login or the write key.")


# Helper function to format database rows into the structure expected by frontend
CREATOR_SELECT = """
    SELECT y.*, v.title, v.views, v.thumb, v.url, v.video_id, v.status AS video_status
    FROM youtubers y
    LEFT JOIN popular_videos v ON y.id = v.youtuber_id
"""
CREATOR_SELECT = CREATOR_SELECT.replace("v.status AS video_status", "v.status AS video_status, v.channel_title, v.on_channel")


def format_creator_record(row) -> Dict[str, Any]:
    channel_id = row.get("channel_id") or ""
    video_id = row.get("video_id") or ""
    handle = row["handle"]
    # Real channel link: the permanent channel id when we have it, otherwise the handle.
    channel_url = (f"https://www.youtube.com/channel/{channel_id}" if channel_id
                   else "https://www.youtube.com/@" + handle.lstrip("@"))
    status = row.get("video_status") or ("checked" if video_id else "unverified")
    popular_url = (f"https://www.youtube.com/channel/{channel_id}/videos?view=0&sort=p&flow=grid" if channel_id else channel_url + "/videos")
    video_url = f"https://www.youtube.com/watch?v={video_id}" if video_id else (row.get("url") or "")
    return {
        "id": f"yt{row['id']}",
        "name": row['name'],
        "handle": handle,
        "channelId": channel_id,
        "channelUrl": channel_url,
        "niche": row['niche'],
        "categories": [x for x in (row.get('categories') or '').split('|') if x] or [row['niche']],
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
        "verified": bool(row.get("verified")),
        "editedFields": sorted(_lock_set(row.get("locked_fields"))),
        "verifiedAt": row["verified_at"].isoformat() if row.get("verified_at") else None,
        "popularVideo": {
            "title": row.get('title') or "Not verified yet",
            "views": row.get('views') or "",
            "thumb": row.get('thumb') or (f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg" if video_id else ""),
            "url": video_url,
            "videoId": video_id,
            "status": status,
            "channelTitle": row.get("channel_title") or "",
            "onChannel": row.get("on_channel") is not False,
            "popularUrl": popular_url,
        }
    }


def _check_http_url(value: str, field: str) -> None:
    """Only allow web links in fields the front-ends turn into <img src> / <a href>."""
    if value and not re.match(r"^https?://", value.strip(), re.IGNORECASE):
        raise HTTPException(status_code=400, detail=f"{field} must be an http(s) URL.")


# ---------------------------------------------------------------------------
# STATIC FILES (the Archive site is served by this API project)
# ---------------------------------------------------------------------------
def _project_file(name: str) -> str:
    """Find a site file at the repo root, or inside website1/ (the folder name
    used by some repos). The first location that exists wins."""
    base = os.path.join(os.path.dirname(__file__), "..")
    for folder in ("", "website1"):
        candidate = os.path.join(base, folder, name)
        if os.path.exists(candidate):
            return candidate
    return os.path.join(base, name)


@app.get("/", response_class=HTMLResponse)
def home():
    file_path = _project_file("index.html")
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            return HTMLResponse(f.read(), headers={"Cache-Control": "public, max-age=60"})
    return "<h1>Welcome to the YouTuber Archive API</h1><p>index.html not found.</p>"


STATIC_FILES = {
    "/style.css": ("style.css", "text/css"),
    "/app.js": ("app.js", "application/javascript"),
    "/yt-core.css": ("yt-core.css", "text/css"),
    "/yt-core.js": ("yt-core.js", "application/javascript"),
    "/creators-snapshot.json": ("creators-snapshot.json", "application/json"),
    "/yt-auth.js": ("yt-auth.js", "application/javascript"),
    "/auth.css": ("auth.css", "text/css"),
    "/login.js": ("login.js", "application/javascript"),
    "/admin.js": ("admin.js", "application/javascript"),
    "/admin-editor.js": ("admin-editor.js", "application/javascript"),
    "/index.html": ("index.html", "text/html"),
    "/login.html": ("login.html", "text/html"),
    "/admin.html": ("admin.html", "text/html"),
    "/login": ("login.html", "text/html"),
    "/admin": ("admin.html", "text/html"),
}


def _register_static(route: str, filename: str, media_type: str) -> None:
    def handler():
        file_path = _project_file(filename)
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"{filename} not found.")
        return FileResponse(file_path, media_type=media_type, headers={"Cache-Control": "public, max-age=60"})
    handler.__name__ = "static_" + re.sub(r"\W", "_", filename)
    app.get(route, include_in_schema=False)(handler)


for _route, (_file, _type) in STATIC_FILES.items():
    _register_static(_route, _file, _type)


# ---------------------------------------------------------------------------
# PUBLIC READ ENDPOINTS (CONNECTED TO NEON POSTGRESQL)
# ---------------------------------------------------------------------------
@app.get("/creators")
@app.get("/youtubers")
def get_creators(response: Response) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(CREATOR_SELECT + " ORDER BY y.id;")
        rows = cursor.fetchall()
        creators_list = [format_creator_record(row) for row in rows]
        response.headers["Cache-Control"] = CACHE_PUBLIC
        return {"count": len(creators_list), "creators": creators_list}
    finally:
        cursor.close()
        conn.close()


@app.get("/creators/search")
@app.get("/youtubers/search")
def search_creators(response: Response, q: str = Query(..., min_length=1)) -> Dict[str, Any]:
    query_str = f"%{q.strip().lower()}%"
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(CREATOR_SELECT + """
            WHERE LOWER(y.name) LIKE %s
               OR LOWER(y.handle) LIKE %s
               OR LOWER(y.niche) LIKE %s
               OR LOWER(y.categories) LIKE %s
               OR LOWER(y.country) LIKE %s
            ORDER BY y.id;
        """, (query_str, query_str, query_str, query_str, query_str))
        rows = cursor.fetchall()
        results = [format_creator_record(row) for row in rows]
        response.headers["Cache-Control"] = CACHE_PUBLIC
        return {"query": q.strip(), "count": len(results), "results": results}
    finally:
        cursor.close()
        conn.close()


@app.get("/creators/{creator_id}")
@app.get("/youtubers/{creator_id}")
def get_creator(creator_id: str, response: Response) -> Dict[str, Any]:
    # Extract integer ID whether client requests 'yt1' or '1'
    numeric_id_str = creator_id.replace("yt", "")
    if not numeric_id_str.isdigit():
        raise HTTPException(status_code=400, detail="Invalid creator ID format.")

    cid = int(numeric_id_str)
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(CREATOR_SELECT + " WHERE y.id = %s;", (cid,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Creator not found.")
        response.headers["Cache-Control"] = CACHE_PUBLIC
        return format_creator_record(row)
    finally:
        cursor.close()
        conn.close()


@app.get("/health")
def health_check():
    db: Dict[str, Any] = {"connected": False}
    try:
        ensure_db_ready()
        conn = _connect()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT COUNT(*) AS n FROM youtubers;")
            db["creators_in_database"] = cursor.fetchone()["n"]
            cursor.execute("SELECT COUNT(*) FILTER (WHERE COALESCE(avatar, '') <> '') AS a, "
                           "COUNT(*) FILTER (WHERE COALESCE(banner, '') <> '') AS b FROM youtubers;")
            img = cursor.fetchone()
            db["images"] = {"avatars": img["a"], "real_banners": img["b"], "youtube_key_configured": bool(_youtube_key())}
            cursor.execute("SELECT COUNT(*) AS n, COUNT(*) FILTER (WHERE role = 'admin') AS admins FROM users;")
            row = cursor.fetchone()
            db["users"], db["admin_accounts"] = row["n"], row["admins"]
            db["connected"] = True
        finally:
            cursor.close()
            conn.close()
    except HTTPException as e:
        db["error"] = f"{e.status_code}: {e.detail}"
    except Exception as e:
        db["error"] = _describe_error(e)
    if _last_init_error:
        db["setup_problem"] = _last_init_error
    return {
        "status": "ok" if db["connected"] and not _last_init_error else "degraded",
        "service": "YouTuber Archive API",
        "version": app.version,
        "database": db,
        "accounts_enabled": bool(jwt and JWT_SECRET),
        "write_key_configured": bool(WRITE_API_KEY),
        "admin_env_set": bool(os.getenv("ADMIN_USERNAME") and os.getenv("ADMIN_PASSWORD")),
        "email_confirmation": {"required": _email_confirmation_required(), "smtp_configured": mailer.configured(),
                               "site_url": (os.getenv("SITE_URL") or "").strip() or "(taken from each request)"},
        "access_limits": access.limits(),
        "catalog_size": len(SEED_CREATORS),
        "creator_overrides": {"applied": OVERRIDES_INFO["applied"], "warnings": OVERRIDES_INFO["warnings"][:20]},
        "timestamp_utc": datetime.now(timezone.utc).isoformat()
    }


# ---------------------------------------------------------------------------
# SCHEMA FOR CREATION/UPDATE VALIDATION
# ---------------------------------------------------------------------------
CHANNEL_ID_RE = re.compile(r"^UC[\w-]{22}$")
VIDEO_ID_RE = re.compile(r"^[\w-]{11}$")


class YoutuberCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    handle: str = Field(..., min_length=2, max_length=50)
    niche: NICHES
    country: str = Field(..., min_length=2, max_length=50)
    subscribers: str
    rawSubs: int = Field(..., ge=0)
    totalViews: str
    rawViews: int = Field(..., ge=0)
    videoCount: int = Field(..., ge=0)
    bio: str
    joinedYear: int = Field(..., ge=2005, le=2026)
    channelId: str = ""                       # permanent YouTube channel id (UC...), gives an always-correct channel link
    popularVideoId: str = ""                  # 11-character video id; the watch link and thumbnail are derived from it
    popularVideoStatus: Literal["verified", "checked", "unverified"] = "checked"
    popularVideoTitle: str = "Not verified yet"
    popularVideoViews: str = ""
    popularVideoThumb: str = ""
    popularVideoUrl: str = ""
    categories: List[str] = []                # optional extra categories; the first one becomes the main category
    avatar: str = ""                          # optional https link to the round profile picture
    banner: str = ""                          # optional https link to the channel banner


def _clean_categories(values: Any, field: str = "categories") -> List[str]:
    """Known categories only (any letter case), no duplicates, 4 at most. Raises a 400 with a plain message otherwise."""
    by_lower = {c.lower(): c for c in overrides_engine.CATEGORIES}
    out: List[str] = []
    for item in (values or []):
        key = str(item or "").strip().lower()
        if not key:
            continue
        if key not in by_lower:
            raise HTTPException(status_code=400, detail=f"'{item}' is not a known category.")
        if by_lower[key] not in out:
            out.append(by_lower[key])
    if len(out) > 4:
        raise HTTPException(status_code=400, detail="Pick at most 4 categories.")
    return out


def _clean_image_link(value: Any, field: str) -> str:
    v = str(value or "").strip()
    if v and not overrides_engine.IMAGE_URL_RE.match(v):
        raise HTTPException(status_code=400, detail=f"{field} must be a full link that starts with https:// (no spaces).")
    return v


def _validate_payload(payload: "YoutuberCreate") -> None:
    _check_http_url(payload.popularVideoThumb, "popularVideoThumb")
    _check_http_url(payload.popularVideoUrl, "popularVideoUrl")
    if payload.channelId and not CHANNEL_ID_RE.match(payload.channelId):
        raise HTTPException(status_code=400, detail="channelId must look like UCxxxxxxxxxxxxxxxxxxxxxx (24 characters).")
    if payload.popularVideoId and not VIDEO_ID_RE.match(payload.popularVideoId):
        raise HTTPException(status_code=400, detail="popularVideoId must be the 11-character YouTube video id.")


def _payload_video(payload: "YoutuberCreate") -> Dict[str, Any]:
    has_video = bool(payload.popularVideoId or payload.popularVideoUrl)
    return {
        "title": payload.popularVideoTitle if has_video else "Not verified yet",
        "views": payload.popularVideoViews if has_video else "",
        "thumb": payload.popularVideoThumb, "url": payload.popularVideoUrl, "videoId": payload.popularVideoId,
        "status": payload.popularVideoStatus if payload.popularVideoId else "unverified",
    }


def _is_admin_actor(actor: str) -> bool:
    return actor == "write-key" or actor.startswith("admin:")


# ---------------------------------------------------------------------------
# WRITE ENDPOINTS
#   create / update  -> creator login, admin login or WRITE_API_KEY   (a creator's edit is marked "unverified" for admin review)
#   delete / sync / verify / users -> admin login or WRITE_API_KEY only
# ---------------------------------------------------------------------------
@app.post("/creators", status_code=201)
@app.post("/youtubers", status_code=201)
def create_creator(payload: YoutuberCreate, actor: str = Depends(verify_editor)) -> Dict[str, Any]:
    """Create a new YouTuber record in Neon PostgreSQL."""
    _validate_payload(payload)
    cats = _clean_categories(payload.categories)
    avatar = _clean_image_link(payload.avatar, "avatar")
    banner = _clean_image_link(payload.banner, "banner")
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        admin_made = _is_admin_actor(actor)
        new_id = _insert_creator(cursor, {
            "categories": cats or [payload.niche], "avatar": avatar,
            "name": payload.name, "handle": payload.handle, "niche": cats[0] if cats else payload.niche, "country": payload.country,
            "subscribers": payload.subscribers, "rawSubs": payload.rawSubs, "totalViews": payload.totalViews,
            "rawViews": payload.rawViews, "videoCount": payload.videoCount, "bio": payload.bio,
            "joinedYear": payload.joinedYear, "channelId": payload.channelId or None, "banner": banner,
            "verified": admin_made, "verifiedAt": datetime.now(timezone.utc).date().isoformat() if admin_made else None,
            "popularVideo": _payload_video(payload),
        })
        conn.commit()
        cursor.execute(CREATOR_SELECT + " WHERE y.id = %s;", (new_id,))
        row = cursor.fetchone()
        audit(actor, "create-creator", payload.handle)
        return {"message": "Creator successfully created", "creator": format_creator_record(row)}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"Create creator failed: {e}")
        raise HTTPException(status_code=400, detail="Failed to create creator (is the handle or channelId already in use?).")
    finally:
        cursor.close()
        conn.close()


@app.put("/creators/{creator_id}")
@app.put("/youtubers/{creator_id}")
def update_creator(creator_id: str, payload: YoutuberCreate, actor: str = Depends(verify_editor)) -> Dict[str, Any]:
    """Update an existing YouTuber record by ID."""
    numeric_id_str = creator_id.replace("yt", "")
    if not numeric_id_str.isdigit():
        raise HTTPException(status_code=400, detail="Invalid creator ID format.")
    cid = int(numeric_id_str)
    _validate_payload(payload)

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
                video_count = %s, bio = %s, joined_year = %s, channel_id = %s,
                verified = (verified AND %s)
            WHERE id = %s;
        """, (
            payload.name, payload.handle, payload.niche, payload.country,
            payload.subscribers, payload.rawSubs, payload.totalViews, payload.rawViews,
            payload.videoCount, payload.bio, payload.joinedYear, payload.channelId or None,
            _is_admin_actor(actor), cid
        ))
        title, views, thumb, url, vid, status = _video_fields(_payload_video(payload))
        cursor.execute("""
            INSERT INTO popular_videos (youtuber_id, title, views, thumb, url, video_id, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (youtuber_id) DO UPDATE SET title = EXCLUDED.title, views = EXCLUDED.views, thumb = EXCLUDED.thumb,
                   url = EXCLUDED.url, video_id = EXCLUDED.video_id, status = EXCLUDED.status;
        """, (cid, title, views, thumb, url, vid, status))
        conn.commit()

        cursor.execute(CREATOR_SELECT + " WHERE y.id = %s;", (cid,))
        row = cursor.fetchone()
        audit(actor, "update-creator", f"yt{cid} {payload.handle}")
        return {"message": "Creator successfully updated", "creator": format_creator_record(row)}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"Update creator failed: {e}")
        raise HTTPException(status_code=400, detail="Failed to update creator.")
    finally:
        cursor.close()
        conn.close()


class CreatorEdit(BaseModel):
    """Everything is optional: only the fields you send are changed. Used by the admin panel's Add / edit tab."""
    name: Optional[str] = Field(None, max_length=100)
    handle: Optional[str] = Field(None, max_length=50)
    channelId: Optional[str] = Field(None, max_length=40)
    categories: Optional[List[str]] = None
    country: Optional[str] = Field(None, max_length=50)
    subscribers: Optional[str] = Field(None, max_length=20)
    rawSubs: Optional[int] = Field(None, ge=0)
    totalViews: Optional[str] = Field(None, max_length=20)
    rawViews: Optional[int] = Field(None, ge=0)
    videoCount: Optional[int] = Field(None, ge=0)
    joinedYear: Optional[int] = Field(None, ge=2005, le=2026)
    bio: Optional[str] = Field(None, max_length=1000)
    avatar: Optional[str] = Field(None, max_length=600)             # "" = go back to the automatic picture
    banner: Optional[str] = Field(None, max_length=600)             # "" = go back to the automatic banner
    popularVideoUrl: Optional[str] = Field(None, max_length=300)    # any YouTube video link (or the 11-character id); "" removes it
    popularVideoTitle: Optional[str] = Field(None, max_length=200)
    popularVideoViews: Optional[str] = Field(None, max_length=40)


def _compact_number(n: int) -> str:
    for limit, suffix in ((10 ** 9, "B"), (10 ** 6, "M"), (10 ** 3, "K")):
        if n >= limit:
            v = n / limit
            return (str(round(v)) if v >= 100 else f"{v:.1f}".rstrip("0").rstrip(".")) + suffix
    return str(n)


def _one_line(value: Any) -> str:
    return " ".join(str(value or "").split())


@app.put("/admin/creators/{creator_id}")
def edit_creator(creator_id: str, payload: CreatorEdit, actor: str = Depends(verify_write)) -> Dict[str, Any]:
    """Partial update of one creator from the admin panel. Fields typed here are remembered so the automatic catalog sync
    never overwrites them (send an empty avatar / banner to hand that field back to the automatic data)."""
    num = creator_id.replace("yt", "")
    if not num.isdigit():
        raise HTTPException(status_code=400, detail="Invalid creator ID format.")
    cid = int(num)
    p = payload
    sets: List[str] = []
    params: List[Any] = []
    touched: set = set()
    unlock: set = set()

    if p.name is not None:
        v = _one_line(p.name)
        if not v:
            raise HTTPException(status_code=400, detail="The name cannot be empty.")
        sets.append("name = %s"); params.append(v[:100]); touched.add("identity")
    handle_value = None
    if p.handle is not None:
        v = _one_line(p.handle)
        if not re.match(r"^@?[\w.\-]{2,50}$", v):
            raise HTTPException(status_code=400, detail="The handle looks like @name (letters, numbers, dots, dashes, underscores).")
        handle_value = v if v.startswith("@") else "@" + v
        sets.append("handle = %s"); params.append(handle_value); touched.add("identity")
    if p.channelId is not None:
        v = p.channelId.strip()
        if v and not CHANNEL_ID_RE.match(v):
            raise HTTPException(status_code=400, detail="channelId must look like UCxxxxxxxxxxxxxxxxxxxxxx (24 characters).")
        sets.append("channel_id = %s"); params.append(v or None); touched.add("identity")
    if p.categories is not None:
        cats = _clean_categories(p.categories)
        if not cats:
            raise HTTPException(status_code=400, detail="Pick at least one category.")
        sets += ["niche = %s", "categories = %s"]; params += [cats[0], "|".join(cats)]; touched.add("categories")
    for attr, col, group, limit in (("country", "country", "country", 50), ("bio", "bio", "bio", 1000)):
        v = getattr(p, attr)
        if v is not None and _one_line(v):
            sets.append(f"{col} = %s"); params.append(_one_line(v)[:limit]); touched.add(group)
    for text_attr, num_attr, text_col, num_col in (("subscribers", "rawSubs", "subscribers", "raw_subs"), ("totalViews", "rawViews", "total_views", "raw_views")):
        txt, number = getattr(p, text_attr), getattr(p, num_attr)
        if number is not None:
            sets.append(f"{num_col} = %s"); params.append(int(number)); touched.add("stats")
            if txt is None or not _one_line(txt):
                sets.append(f"{text_col} = %s"); params.append(_compact_number(int(number)))
        if txt is not None and _one_line(txt):
            sets.append(f"{text_col} = %s"); params.append(_one_line(txt)[:20]); touched.add("stats")
    for attr, col in (("videoCount", "video_count"), ("joinedYear", "joined_year")):
        v = getattr(p, attr)
        if v is not None:
            sets.append(f"{col} = %s"); params.append(int(v)); touched.add("stats")
    avatar_clear = banner_clear = False
    if p.avatar is not None:
        v = _clean_image_link(p.avatar, "avatar")
        if v:
            sets.append("avatar = %s"); params.append(v); touched.add("avatar")
        else:
            avatar_clear = True; unlock.add("avatar")
    if p.banner is not None:
        v = _clean_image_link(p.banner, "banner")
        sets.append("banner = %s"); params.append(v)
        (touched if v else unlock).add("banner")

    video_link = None if p.popularVideoUrl is None else p.popularVideoUrl.strip()
    video_vid = ""
    if video_link:
        video_vid = overrides_engine.video_id_from(video_link)
        if not video_vid:
            raise HTTPException(status_code=400, detail="That is not a YouTube video link. Open the video and copy the address from the browser bar.")
    wants_video = any(x is not None for x in (p.popularVideoUrl, p.popularVideoTitle, p.popularVideoViews))

    if not sets and not wants_video and not avatar_clear:
        raise HTTPException(status_code=400, detail="Nothing to change: fill in at least one box.")

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT y.id, y.name, y.handle, y.locked_fields, v.video_id, v.title, v.views
            FROM youtubers y LEFT JOIN popular_videos v ON v.youtuber_id = y.id WHERE y.id = %s;
        """, (cid,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Creator not found.")
        if avatar_clear:
            sets.append("avatar = %s"); params.append(_default_avatar(handle_value or row["handle"]))

        video_args = None
        if wants_video:
            old_vid = row.get("video_id") or ""
            if video_link == "":                                                     # remove the video
                video_args = (cid, "Not verified yet", "", "", None, None, "unverified", None, True)
            else:
                vid = video_vid or old_vid
                if not vid:
                    raise HTTPException(status_code=400, detail="Add the video link first, then its title and views.")
                same = vid == old_vid
                title = _one_line(p.popularVideoTitle)[:200] if p.popularVideoTitle is not None and _one_line(p.popularVideoTitle) else ((row.get("title") if same else "") or "Most viewed video")
                views = _one_line(p.popularVideoViews)[:40] if p.popularVideoViews is not None else ((row.get("views") if same else "") or "")
                chan = _one_line(p.name) if p.name is not None and _one_line(p.name) else row["name"]
                video_args = (cid, title, views, f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg", f"https://www.youtube.com/watch?v={vid}", vid, "verified", chan, True)
            touched.add("video")

        locked = (_lock_set(row.get("locked_fields")) | touched) - unlock
        sets.append("locked_fields = %s"); params.append(",".join(g for g in LOCK_GROUPS if g in locked))
        cursor.execute("UPDATE youtubers SET " + ", ".join(sets) + " WHERE id = %s;", tuple(params + [cid]))
        if video_args:
            cursor.execute("""
                INSERT INTO popular_videos (youtuber_id, title, views, thumb, url, video_id, status, channel_title, on_channel)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (youtuber_id) DO UPDATE SET title = EXCLUDED.title, views = EXCLUDED.views, thumb = EXCLUDED.thumb,
                       url = EXCLUDED.url, video_id = EXCLUDED.video_id, status = EXCLUDED.status,
                       channel_title = EXCLUDED.channel_title, on_channel = EXCLUDED.on_channel;
            """, video_args)
        conn.commit()
        cursor.execute(CREATOR_SELECT + " WHERE y.id = %s;", (cid,))
        out = cursor.fetchone()
        audit(actor, "edit-creator", f"yt{cid} " + ",".join(sorted(touched | unlock)))
        return {"message": "Saved", "creator": format_creator_record(out)}
    except HTTPException:
        conn.rollback()
        raise
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=409, detail="Another creator already uses that handle or channel id.")
    except Exception as e:
        conn.rollback()
        print(f"Edit creator failed: {type(e).__name__}: {e}")
        raise HTTPException(status_code=400, detail="Could not save the changes.")
    finally:
        cursor.close()
        conn.close()


@app.delete("/creators/{creator_id}")
@app.delete("/youtubers/{creator_id}")
def delete_creator(creator_id: str, actor: str = Depends(verify_write)) -> Dict[str, Any]:
    """Delete an existing YouTuber record by ID (admin / write key only)."""
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

        # Deleting from youtubers cascades to popular_videos via foreign key setup
        cursor.execute("DELETE FROM youtubers WHERE id = %s;", (cid,))
        conn.commit()
        audit(actor, "delete-creator", f"yt{cid}")
        return {"message": f"Creator with ID {creator_id} successfully deleted."}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"Delete creator failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete creator.")
    finally:
        cursor.close()
        conn.close()


def _run_sync(actor: str, update: bool) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        result = sync_catalog(cursor, update=update)
        conn.commit()
        cursor.execute("SELECT COUNT(*) AS count FROM youtubers;")
        total = cursor.fetchone()["count"]
        audit(actor, "sync-catalog", f"update={update} added={result['added']} updated={result['updated']}")
        return {**result, "total": total, "catalogSize": len(SEED_CREATORS)}
    except Exception as e:
        conn.rollback()
        print(f"Catalog sync failed: {e}")
        raise HTTPException(status_code=500, detail="Catalog sync failed.")
    finally:
        cursor.close()
        conn.close()


@app.post("/admin/sync-catalog")
def admin_sync_catalog(update: bool = Query(False), actor: str = Depends(verify_write)) -> Dict[str, Any]:
    """Load the built-in verified catalog (100 creators) into Neon. update=true also corrects handles, channel ids,
    counts and top videos of creators that are already stored (matched by channel id, handle, then name)."""
    out = _run_sync(actor, update)
    if _youtube_key():
        conn = get_db_connection()
        cur = conn.cursor()
        try:
            out["banners"] = refresh_banners(cur)
            conn.commit()
        except Exception as e:
            conn.rollback()
            out["banners"] = {"error": _describe_error(e)}
        finally:
            cur.close()
            conn.close()
    return out


@app.post("/admin/seed-missing")
def admin_seed_missing(actor: str = Depends(verify_write)) -> Dict[str, Any]:
    """Insert catalog creators that are not in the database yet. Never overwrites."""
    out = _run_sync(actor, False)
    return {"added": out["added"], "total": out["total"]}


@app.post("/admin/creators/{creator_id}/verify")
def admin_verify_creator(creator_id: str, verified: bool = Query(True), actor: str = Depends(verify_write)) -> Dict[str, Any]:
    numeric_id_str = creator_id.replace("yt", "")
    if not numeric_id_str.isdigit():
        raise HTTPException(status_code=400, detail="Invalid creator ID format.")
    cid = int(numeric_id_str)
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE youtubers SET verified = %s, verified_at = %s WHERE id = %s RETURNING id;",
                       (verified, datetime.now(timezone.utc).date() if verified else None, cid))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Creator not found.")
        conn.commit()
        audit(actor, "verify-creator" if verified else "unverify-creator", f"yt{cid}")
        return {"message": "Verified" if verified else "Marked as unverified", "id": f"yt{cid}", "verified": verified}
    finally:
        cursor.close()
        conn.close()


# ---------------------------------------------------------------------------
# PORTAL (Website 1): the creator list trimmed to the caller's role
# ---------------------------------------------------------------------------
def _all_creators() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(CREATOR_SELECT + " ORDER BY y.id;")
        return [format_creator_record(row) for row in cursor.fetchall()]
    finally:
        cursor.close()
        conn.close()


@app.get("/portal/creators")
def portal_creators(response: Response, user: Dict[str, Any] = Depends(get_optional_user)) -> Dict[str, Any]:
    """Guests get a preview (basic card data for the top GUEST_LIMIT creators), members get full profiles for the top
    USER_LIMIT, creators and admins get everything. Hidden creators are sent as anonymous 'locked' stubs only."""
    creators, meta = access.tier_view(_all_creators(), user["role"])
    response.headers["Cache-Control"] = "private, no-store"
    response.headers["Vary"] = "Authorization"
    return {"count": len(creators), "creators": creators, "meta": meta}


@app.get("/portal/export")
def portal_export(user: Dict[str, Any] = Depends(require_admin)):
    """CSV of the full catalog (creator / admin only)."""
    buf = io.StringIO()
    cols = ["id", "name", "handle", "channelId", "channelUrl", "niche", "categories", "country", "subscribers", "rawSubs", "totalViews",
            "rawViews", "videoCount", "joinedYear", "verified", "verifiedAt", "topVideoTitle", "topVideoViews", "topVideoUrl", "topVideoStatus"]
    writer = csv.writer(buf)
    writer.writerow(cols)
    for c in _all_creators():
        pv = c["popularVideo"]
        writer.writerow([c["id"], c["name"], c["handle"], c["channelId"], c["channelUrl"], c["niche"], " | ".join(c["categories"]), c["country"], c["subscribers"],
                         c["rawSubs"], c["totalViews"], c["rawViews"], c["videoCount"], c["joinedYear"], c["verified"], c["verifiedAt"] or "",
                         pv["title"], pv["views"], pv["url"], pv["status"]])
    return Response(content="﻿" + buf.getvalue(), media_type="text/csv",
                    headers={"Content-Disposition": 'attachment; filename="youtuber-archive.csv"', "Cache-Control": "private, no-store"})


# ---------------------------------------------------------------------------
# STAFF DASHBOARD DATA
# ---------------------------------------------------------------------------
@app.get("/admin/overview")
def admin_overview(user: Dict[str, Any] = Depends(require_admin)) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN verified THEN 1 ELSE 0 END), 0) AS verified FROM youtubers;")
        a = cursor.fetchone()
        cursor.execute("SELECT COALESCE(status, 'unverified') AS status, COUNT(*) AS n FROM popular_videos GROUP BY 1;")
        videos = {r["status"]: r["n"] for r in cursor.fetchall()}
        out: Dict[str, Any] = {"creators": a["total"], "verifiedCreators": int(a["verified"]), "topVideos": videos,
                               "catalogSize": len(SEED_CREATORS), "limits": access.limits()}
        if user["role"] == "admin":
            cursor.execute("SELECT role, COUNT(*) AS n FROM users GROUP BY role;")
            out["users"] = {r["role"]: r["n"] for r in cursor.fetchall()}
        return out
    finally:
        cursor.close()
        conn.close()


@app.get("/admin/queue")
def admin_queue(user: Dict[str, Any] = Depends(require_admin)) -> Dict[str, Any]:
    """Creators that still need work: not verified, or without a confirmed most-viewed video."""
    items = []
    for c in _all_creators():
        reasons = []
        if not c["verified"]:
            reasons.append("profile not verified")
        status = c["popularVideo"]["status"]
        if status == "unverified":
            reasons.append("top video missing")
        elif status == "checked":
            reasons.append("top video ranking unconfirmed")
        if not c["channelId"]:
            reasons.append("no channel id")
        if reasons:
            items.append({"id": c["id"], "name": c["name"], "handle": c["handle"], "channelUrl": c["channelUrl"],
                          "videoUrl": c["popularVideo"]["url"], "reasons": reasons})
    return {"count": len(items), "items": items}


@app.get("/admin/audit")
def admin_audit(admin: Dict[str, Any] = Depends(require_admin)) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, at, actor, action, target FROM audit_log ORDER BY id DESC LIMIT 100;")
        rows = [{"id": r["id"], "at": r["at"].isoformat(), "actor": r["actor"], "action": r["action"], "target": r["target"]} for r in cursor.fetchall()]
        return {"count": len(rows), "entries": rows}
    finally:
        cursor.close()
        conn.close()


# ---------------------------------------------------------------------------
# VERSIONED READ ROUTES (read key, kept for compatibility with the original project)
# ---------------------------------------------------------------------------
@app.get("/api/v1/creators", dependencies=[Depends(verify_read_key)])
def get_creators_v1(response: Response) -> Dict[str, Any]:
    data = get_creators(response)
    response.headers["Cache-Control"] = CACHE_PRIVATE
    return data


@app.get("/api/v1/creators/search", dependencies=[Depends(verify_read_key)])
def search_creators_v1(response: Response, q: str = Query(..., min_length=1)) -> Dict[str, Any]:
    data = search_creators(response, q=q)
    response.headers["Cache-Control"] = CACHE_PRIVATE
    return data


@app.get("/api/v1/creators/{creator_id}", dependencies=[Depends(verify_read_key)])
def get_creator_v1(creator_id: str, response: Response) -> Dict[str, Any]:
    data = get_creator(creator_id=creator_id, response=response)
    response.headers["Cache-Control"] = CACHE_PRIVATE
    return data
