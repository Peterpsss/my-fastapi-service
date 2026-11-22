"""Reads api/creator_overrides.py (the file YOU edit) and applies your corrections on top of the built-in catalog.

Design rules:
  * A mistake in your file must never take the site down: bad JSON, bad links or unknown names are skipped and reported
    in /health (creator_overrides -> warnings); everything else keeps working.
  * Only https image links and real YouTube video links are accepted.
  * Editing the file changes the catalog version automatically, so the next deploy copies your changes into the database.
"""
import hashlib
import json
import re
from typing import Any, Dict, List, Tuple
from urllib.parse import urlparse, parse_qs

CATEGORIES = ("Education", "Entertainment", "Music", "Gaming", "Comedy", "Lifestyle & Vlog", "Tech & Gadgets",
              "Challenges & Stunts", "News & Commentary", "Family", "Sports & Fitness", "Food", "Beauty & Fashion",
              "Stories & Mystery")
ALLOWED_FIELDS = ("avatar", "banner", "bio", "country", "categories", "popularVideo")
ALLOWED_VIDEO_FIELDS = ("url", "videoId", "title", "views", "channelTitle")
VIDEO_ID_RE = re.compile(r"^[\w-]{11}$")
IMAGE_URL_RE = re.compile(r"^https://[^\s\"'<>\\]{4,580}$")
YT_HOSTS = {"youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com",
            "www.youtube-nocookie.com", "youtu.be", "www.youtu.be"}


def _norm(text: Any) -> str:
    return re.sub(r"[^a-z0-9]", "", str(text or "").lower())


def video_id_from(text: Any) -> str:
    """Accepts a full YouTube link (watch, youtu.be, shorts, embed, live) or a bare 11-character video id."""
    t = str(text or "").strip()
    if not t:
        return ""
    if VIDEO_ID_RE.match(t):
        return t
    try:
        u = urlparse(t)
    except ValueError:
        return ""
    if u.scheme not in ("http", "https") or (u.hostname or "").lower() not in YT_HOSTS:
        return ""
    host = (u.hostname or "").lower()
    cand = ""
    if host.endswith("youtu.be"):
        cand = u.path.strip("/").split("/")[0]
    elif u.path.rstrip("/") == "/watch":
        cand = (parse_qs(u.query).get("v") or [""])[0]
    else:
        parts = [p for p in u.path.split("/") if p]
        if len(parts) >= 2 and parts[0] in ("shorts", "embed", "live", "v"):
            cand = parts[1]
    return cand if VIDEO_ID_RE.match(cand) else ""


def parse(text: str) -> Tuple[Dict[str, Any], List[str]]:
    """JSON text -> ({creator key: changes}, warnings). Never raises."""
    if not (text or "").strip():
        return {}, []
    try:
        data = json.loads(text)
    except ValueError as e:
        return {}, [f"creator_overrides.py: the text between the ''' marks is not valid JSON, so ALL your edits are ignored "
                    f"for now ({e}). Check for a missing comma or quote."]
    if not isinstance(data, dict):
        return {}, ["creator_overrides.py: the text must start with { and end with }, so your edits are ignored."]
    return {k: v for k, v in data.items() if not str(k).startswith("_")}, []


def _clean_entry(label: str, ov: Dict[str, Any], base: Dict[str, Any], warnings: List[str]) -> Dict[str, Any]:
    """Validates one creator's entry. Blank values are ignored silently (so the empty template does nothing)."""
    out: Dict[str, Any] = {}
    for field, value in ov.items():
        if field not in ALLOWED_FIELDS:
            warnings.append(f"{label}: unknown field '{field}' ignored (allowed: {', '.join(ALLOWED_FIELDS)}).")
            continue
        if field in ("avatar", "banner"):
            v = str(value or "").strip()
            if not v:
                continue
            if IMAGE_URL_RE.match(v):
                out[field] = v
            else:
                warnings.append(f"{label}: {field} must be a full link starting with https:// (no spaces) - ignored.")
        elif field in ("bio", "country"):
            v = " ".join(str(value or "").split())
            if v:
                out[field] = v[:400 if field == "bio" else 60]
        elif field == "categories":
            if not isinstance(value, list):
                warnings.append(f"{label}: categories must be a list like [\"Gaming\", \"Comedy\"] - ignored.")
                continue
            by_lower = {c.lower(): c for c in CATEGORIES}
            cats: List[str] = []
            for item in value:
                key = str(item or "").strip().lower()
                if not key:
                    continue
                if key in by_lower:
                    if by_lower[key] not in cats:
                        cats.append(by_lower[key])
                else:
                    warnings.append(f"{label}: '{item}' is not a known category - skipped.")
            if cats:
                out["categories"] = cats[:4]
        elif field == "popularVideo":
            if not isinstance(value, dict):
                warnings.append(f"{label}: popularVideo must be {{ \"url\": ..., \"title\": ..., \"views\": ... }} - ignored.")
                continue
            pv_in = {k: v for k, v in value.items()}
            for k in list(pv_in):
                if k not in ALLOWED_VIDEO_FIELDS:
                    warnings.append(f"{label}: popularVideo has an unknown field '{k}' - ignored.")
                    pv_in.pop(k)
            raw_link = str(pv_in.get("videoId") or "").strip() or str(pv_in.get("url") or "").strip()
            if not raw_link:
                continue
            vid = video_id_from(raw_link)
            if not vid:
                warnings.append(f"{label}: popularVideo.url is not a YouTube video link (use the address of the video) - ignored.")
                continue
            same = (base.get("popularVideo") or {}).get("videoId") == vid
            old = base.get("popularVideo") or {}
            title = " ".join(str(pv_in.get("title") or "").split())[:200] or (old.get("title") if same else "") or "Most viewed video"
            views = " ".join(str(pv_in.get("views") or "").split())[:40] or (old.get("views") if same else "") or ""
            chan = " ".join(str(pv_in.get("channelTitle") or "").split())[:80] or (old.get("channelTitle") if same else "") or base.get("name", "")
            out["popularVideo"] = {"videoId": vid, "title": title, "views": views, "channelTitle": chan}
    return out


def apply(seed: List[Dict[str, Any]], overrides: Dict[str, Any]) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """-> (new catalog, info). info = {"applied": n, "warnings": [...], "suffix": "+abc123" or ""}"""
    warnings: List[str] = []
    by_name, by_handle, by_channel = {}, {}, {}
    for c in seed:
        by_name[_norm(c["name"])] = c["id"]
        by_handle[_norm(c.get("handle", "").lstrip("@"))] = c["id"]
        if c.get("channelId"):
            by_channel[str(c["channelId"]).lower()] = c["id"]
    changes: Dict[str, Dict[str, Any]] = {}
    for key, ov in overrides.items():
        cid = by_name.get(_norm(key)) or by_handle.get(_norm(str(key).lstrip("@"))) or by_channel.get(str(key).strip().lower())
        if cid is None:
            warnings.append(f"'{key}': no creator with that name, @handle or channel id - ignored.")
            continue
        if not isinstance(ov, dict):
            warnings.append(f"'{key}': the entry must be {{ ... }} with fields inside - ignored.")
            continue
        base = next(c for c in seed if c["id"] == cid)
        clean = _clean_entry(str(key), ov, base, warnings)
        if clean:
            changes.setdefault(cid, {}).update(clean)
    result: List[Dict[str, Any]] = []
    for c in seed:
        ch = changes.get(c["id"])
        if not ch:
            result.append(c)
            continue
        n = dict(c)
        for field in ("avatar", "banner", "bio", "country"):
            if field in ch:
                n[field] = ch[field]
        if "categories" in ch:
            n["categories"] = ch["categories"]
            n["niche"] = ch["categories"][0]
        if "popularVideo" in ch:
            pv = dict(c.get("popularVideo") or {})
            new = ch["popularVideo"]
            vid = new["videoId"]
            if pv.get("videoId") != vid:
                for stale in ("rawViews", "published"):
                    pv.pop(stale, None)
            pv.update({"title": new["title"], "views": new["views"], "videoId": vid,
                       "url": f"https://www.youtube.com/watch?v={vid}", "thumb": f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg",
                       "status": "verified", "channelTitle": new["channelTitle"], "onChannel": True})
            n["popularVideo"] = pv
        result.append(n)
    digest = hashlib.sha1(json.dumps(changes, sort_keys=True, ensure_ascii=True).encode("utf-8")).hexdigest()[:8] if changes else ""
    return result, {"applied": len(changes), "warnings": warnings, "suffix": ("+" + digest) if digest else ""}


def load_text() -> Tuple[str, List[str]]:
    """The text you edit in creator_overrides.py. A broken file is reported, never raised."""
    try:
        try:
            import creator_overrides  # type: ignore
        except ImportError:
            from . import creator_overrides  # type: ignore
        return str(getattr(creator_overrides, "OVERRIDES_TEXT", "") or ""), []
    except Exception as e:  # SyntaxError etc.: a typo in the file must not break the API
        return "", [f"creator_overrides.py could not be read, so your edits are ignored ({type(e).__name__}: {e})."]


def apply_file(seed: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    text, problems = load_text()
    overrides, parse_warnings = parse(text)
    new_seed, info = apply(seed, overrides)
    info["warnings"] = problems + parse_warnings + info["warnings"]
    return new_seed, info
