"""Roles, permissions and the tiered creator view (pure Python - no web framework, easy to test).

Roles
  guest    no account, or the "Continue as guest" token  -> sees a preview (the top GUEST_LIMIT creators), basic card data only, no links
  user     registered + email-confirmed account          -> every creator, full profiles, YouTube links, follow / compare
  admin    owner                                         -> everything, plus users, delete, catalog sync and the audit log

"Top" means ranked by subscribers (largest first). The limits are environment variables:
  GUEST_LIMIT (default 30)   USER_LIMIT (default 1000 = everything)
The same rules are mirrored client-side in yt-auth.js (used only for the offline snapshot).
"""
import os
from typing import Any, Dict, List, Tuple

ROLES = ("guest", "user", "admin")
ASSIGNABLE_ROLES = ("user", "admin")

_BASE = dict(browse=True, search=True, profile=False, links=False, follow=False, compare=False, similar=False,
             topVideo=False, crossSites=False, export=False, edit=False, verify=False,
             manageUsers=False, deleteCreators=False, syncCatalog=False, audit=False)

PERMISSIONS: Dict[str, Dict[str, Any]] = {
    "guest": dict(_BASE, label="Guest"),
    "user": dict(_BASE, label="Member", profile=True, links=True, follow=True, compare=True, similar=True, topVideo=True, crossSites=True),
    "admin": dict(_BASE, label="Admin", profile=True, links=True, follow=True, compare=True, similar=True, topVideo=True,
                  crossSites=True, export=True, edit=True, verify=True, manageUsers=True, deleteCreators=True,
                  syncCatalog=True, audit=True),
}

# guests get a teaser: no channel id / channel link / video data (those are member features)
BASIC_FIELDS = ("id", "name", "handle", "niche", "categories", "country", "subscribers", "rawSubs", "avatar", "banner", "verified")


def _int_env(name: str, default: int) -> int:
    try:
        return max(0, int(os.getenv(name, default)))
    except (TypeError, ValueError):
        return default


def limits() -> Dict[str, int]:
    return {"guest": _int_env("GUEST_LIMIT", 30), "user": _int_env("USER_LIMIT", 1000)}


def normalize_role(role: Any) -> str:
    return role if role in ROLES else "guest"


def permissions_for(role: str) -> Dict[str, Any]:
    return dict(PERMISSIONS[normalize_role(role)])


def access_level(role: str, rank: int, lim: Dict[str, int]) -> str:
    """'full' | 'basic' | 'locked' for the creator at subscriber-rank `rank` (1 = biggest)."""
    role = normalize_role(role)
    if role == "admin":
        return "full"
    if role == "user":
        return "full" if rank <= lim["user"] else "locked"
    return "basic" if rank <= lim["guest"] else "locked"


def tier_view(creators: List[Dict[str, Any]], role: str, lim: Dict[str, int] = None) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """Trim a full creator list down to what `role` may see. Locked creators are reduced to an anonymous stub,
    so hidden names/stats never leave the server."""
    lim = lim or limits()
    role = normalize_role(role)
    ranked = sorted(creators, key=lambda c: (-int(c.get("rawSubs") or 0), str(c.get("id"))))
    rank_of = {c["id"]: i + 1 for i, c in enumerate(ranked)}
    out: List[Dict[str, Any]] = []
    unlocked = 0
    for c in creators:
        rank = rank_of[c["id"]]
        level = access_level(role, rank, lim)
        if level == "full":
            item = dict(c)
            unlocked += 1
        elif level == "basic":
            item = {k: c.get(k) for k in BASIC_FIELDS}
            unlocked += 1
        else:
            item = {"id": c["id"], "name": "Locked creator", "handle": "@locked-" + str(c["id"]), "niche": c.get("niche"),
                    "rawSubs": 0, "unlock": "login" if role == "guest" else "admin"}
        item["access"] = level
        item["rank"] = rank
        out.append(item)
    meta = {
        "role": role, "total": len(creators), "unlocked": unlocked,
        "totalSubs": sum(int(c.get("rawSubs") or 0) for c in creators),
        "limits": lim, "permissions": permissions_for(role),
    }
    return out, meta
