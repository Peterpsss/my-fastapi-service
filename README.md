# YouTube project - one API, three websites

| Site | Folder | What it is |
|---|---|---|
| **YouTuber Archive** (Web 1) | `website1/` | Login / sign-up page, then search, filter, sort, compare and follow 100 creators. Admin panel at `/admin.html`. |
| **YouTube Games** (Web 2) | `website2/` | Higher or Lower, Daily YouTuber and Mystery Channel. |
| **YouTuber Taste Matcher** (Web 3) | `website3/` | Six simple questions (pick as many interests as you like) that return YouTubers made for you, each with a plain-English reason. |
| **API** | `api/` | FastAPI + Neon Postgres. All three sites read from it. |

The three sites share one client (`yt-core.js`), one stylesheet (`yt-core.css`, which also holds the animated "alive" layer) and one offline roster (`creators-snapshot.json`). These three files must stay identical in `website1/`, `website2/` and `website3/`: if you edit one, copy it to the other two.

---

## 1. Put it online (GitHub -> Vercel)

In PowerShell, inside this folder:

```powershell
git add .
git commit -m "New design, 100 creators, email-confirmed sign-up"
git push origin main
```

Vercel redeploys by itself. Then open `https://<your-api>/health` - you want `"status":"ok"`.

**Neon needs nothing typed by hand.** The first API request creates the tables, adds the 100 creators (with channel IDs, subscribers, views, top-video info) and creates your admin account from the environment variables. It runs again by itself only when the bundled catalog version changes, so your own edits are not overwritten every deploy.

## 2. Environment variables (Vercel -> Settings -> Environment Variables)

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Neon connection string (`postgresql://...`) |
| `JWT_SECRET` | yes | Signs login tokens. Use a long random value (32+ characters). |
| `WRITE_API_KEY` | yes | Private key for POST / PUT / DELETE on `/creators`. **Never put it in frontend code.** |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | yes | The admin account. Changing `ADMIN_PASSWORD` and redeploying resets the admin password. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | **yes, for sign-up** | The mail account that sends the confirmation emails (section 3). Port `587` (default) or `465`. |
| `SMTP_FROM` | optional | The "from" address. Defaults to `SMTP_USER`. |
| `MAIL_FROM_NAME` | optional | Sender name. Default `YouTuber Archive`. |
| `SITE_URL` | recommended | Your public address, e.g. `https://my-fastapi-service-sigma.vercel.app` (no trailing slash). The confirmation link points here. |
| `GUEST_LIMIT` | optional (default **30**) | Creators a guest can see (basic details, no YouTube links) |
| `USER_LIMIT` | optional (default **1000** = all) | Creators a confirmed member can open |
| `EMAIL_CONFIRM` | optional | Set to `off` **only for testing**: accounts then work without confirming. Leave it unset in production. |
| `READ_API_KEY` | optional | Key for the old `/api/v1/*` read routes. |
| `YOUTUBE_API_KEY` | optional (recommended) | Free YouTube Data API key that switches on the **real channel banners** (section 5b). |

## 3. Confirmation emails (needed so people can create accounts)

Creating an account requires a real email address. The API emails a link; the account only works after the link is opened, then the person lands signed in with full access. Unconfirmed sign-ups are forgotten after 24 hours, and a new email can be requested once a minute.

Easiest options (both free):

**Gmail** - turn on 2-Step Verification, then create an *App password* (Google Account -> Security -> App passwords). Set `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER=you@gmail.com`, `SMTP_PASSWORD=<the 16-character app password>`.

**Brevo (Sendinblue)** - create a free account, open *SMTP & API*, and copy the SMTP host (`smtp-relay.brevo.com`), port `587`, login and SMTP key into the same four variables. Set `SMTP_FROM` to a sender address you verified in Brevo.

Redeploy after saving the variables. `/health` shows `"email_confirmation": {"required": true, "smtp_configured": true}` when it is ready. If it says `false`, sign-up answers with a clear "not switched on yet" message instead of silently failing, and if a mail cannot be sent the half-created account is removed so the person can try again.

## 4. Who sees what

| | Guest | Member (email confirmed) | Admin |
|---|---|---|---|
| Creators visible | top **30** by subscribers | **all** | all |
| Details | name, categories, country, subscribers, avatar and banner | full bio, stats, rankings | everything |
| YouTube channel link, most-viewed video link | locked | yes | yes |
| Follow, compare, similar creators, games / matcher links | locked | yes | yes |
| Add / edit YouTubers, users (roles), audit log, overview numbers, CSV export | - | - | yes |

Everything is enforced **by the API** (`GET /portal/creators`): hidden creators are sent as anonymous stubs, and guests never receive channel IDs or video links at all - they are not in the page, not just hidden. Anyone who signs up is a Member; promote people to Admin in **Admin -> Users** (which also shows each email and whether it is confirmed).

Games and Taste Matcher read the open `/creators` list, so they are not gated. The Taste Matcher only links to the Archive profile (never straight to YouTube), so the member-only links stay member-only.

**Admin panel:** four tabs - Overview, **Add / edit**, Users and Audit log - plus CSV export. The old Creators / Verification queue / Catalog sync tabs are gone: the 100 creators come from the bundled, vidIQ-checked catalog, which syncs itself when you deploy a new version. The **Add / edit** tab (section 5b-1) is where you type in a picture, banner, top video or info yourself, or add a brand-new YouTuber.

## 5. Data accuracy (please read)

- All 100 channel IDs and the subscriber, view and video counts were cross-checked with vidIQ. Channel links use the permanent `youtube.com/channel/UC...` form, which survives renames.
- **Most-viewed video**, per creator:
  - `verified` - **16** creators: taken from the channel's popular-sorted list.
  - `checked` - **46** creators: a top video of that channel, the highest view count we could confirm; the exact #1 may differ slightly. The profile says so.
  - `unverified` - **38** creators: no single video confirmed. Members still get a working **"All their most-viewed videos"** link that opens that channel's *Most popular* list on YouTube - never a guessed video.
  - 10 artists' top videos live on their label's official channel (VEVO etc.); the profile names that channel.
- Subscriber counts move constantly, so the footer says figures are snapshot estimates.

## 5b. Avatars, banners and categories

- **Avatars:** every one of the 100 creators has its real channel picture (from vidIQ). If a picture ever fails to load, the site falls back to a look-up by handle and then to a coloured initial, so no avatar is ever blank.
- **Banners:** vidIQ does not provide channel banners, so they are fetched from the official **YouTube Data API**. To switch them on: Google Cloud Console -> create a project -> *APIs & Services* -> enable **YouTube Data API v3** -> *Credentials* -> *Create credentials -> API key*. Add it in Vercel as `YOUTUBE_API_KEY` and redeploy. The API then downloads the banner address of all 100 channels in 2 requests, stores them in Neon, and retries by itself every 6 hours for any that are missing. Check `/health`: `"images": {"avatars": 100, "real_banners": 100, "youtube_key_configured": true}`. Until the key is set (or for any channel without a banner) the sites show the designed banner: a colour gradient in the creator's own colour with their avatar in a ring. Nothing breaks either way.
- **Categories:** every creator has one *main* category plus extra ones that describe the channel (for example PewDiePie: Gaming + Lifestyle & Vlog + Comedy). Cards, profiles, filters, the games and the Taste Matcher all use them. 14 categories: Education, Entertainment, Music, Gaming, Comedy, Lifestyle & Vlog, Tech & Gadgets, Challenges & Stunts, News & Commentary, Family, Sports & Fitness, Food, Beauty & Fashion, Stories & Mystery.

## 5b-1. The Add / edit tab (type it in, no code)

Open **Admin panel -> Add / edit**. On the left is every YouTuber with a search box and filters (**No banner**, **No top video**, **Edited by you**) and small badges that show what is missing. Click a name and the form opens on the right:

- **Pictures:** paste a link for the round *profile picture* and the wide *banner*. You see a live preview and a message saying whether the picture really loads. Leave a box empty to use the automatic picture / the coloured design. (On YouTube: right-click the picture -> **Copy image address**. The link must start with `https://`.)
- **Most-viewed video:** paste any YouTube video address (a normal link, a `youtu.be` link, a Shorts link or just the 11-character id). The thumbnail is found for you; type the title and the views text (for example `1.2B views`). **Remove this video** clears it.
- **About:** bio, country and up to 4 categories (pick the *main* category from the little menu).
- **Numbers & identity** (folded away): name, @handle, channel ID, subscribers, total views, number of videos, joined year. If you type only the exact number, the short text (`1.3M`) is worked out for you.
- **+ Add a new YouTuber** opens the same form empty; boxes marked * are required.

Press **Save changes**. Only the boxes you changed are sent, errors are shown in plain words (for example "Another creator already uses that handle"), and if you click another name with unsaved changes it warns you first. Every save is written to the **Audit log**.

**Your typing is protected.** Each field you type is remembered by the API (the `locked_fields` column), so the automatic catalog update on the next deploy never overwrites it; everything you did not touch keeps updating. Typing an empty profile picture or banner hands that one back to the automatic data. Order of priority: **typed in the admin tab > `api/creator_overrides.py` > built-in catalog**. The offline snapshot inside the websites (used only when the API is down) is not changed by the admin tab.

## 5b-2. The same thing through a file (optional)

The Add / edit tab above is the easy way. If you prefer to edit text and push it, you can fix any creator in **one file** instead: `api/creator_overrides.py`. It already lists the 38 creators with no confirmed top video, with empty `""` boxes to fill.

1. Open `api/creator_overrides.py` in VS Code. Only edit the text between the two `'''` marks (it is JSON: keep every comma, quote and bracket).
2. Find the creator (Ctrl+F the name) and fill the boxes:
   - `"banner"`: on their YouTube channel page, right-click the banner, **Copy image address**, paste it. It must start with `https://`.
   - `"avatar"`: same idea for the round picture (add the line `"avatar": "https://..."` to any creator).
   - `"popularVideo"` -> `"url"`: open their most-viewed video, copy the address from the browser bar and paste it. The thumbnail is found automatically. `"title"` and `"views"` (for example `"1.2B views"`) are optional text.
   - Also possible: `"bio"`, `"country"` and `"categories"` (a list such as `["Gaming", "Comedy"]`; the first is the main category).
3. Someone who is not listed? Copy the `_example` block, rename it to their name or `@handle`, and edit it.
4. Save, then `git add -A`, `git commit -m "my edits"`, `git push`. Vercel redeploys and the API copies your edits into the database by itself (no SQL).
5. Check `/health`: `"creator_overrides": {"applied": 3, "warnings": []}`. `applied` is how many creators you changed. Anything it could not use (a link without `https://`, a mistyped name, a bad video link) is listed under `warnings` and skipped, so a typo never breaks the site. If the whole text is not valid JSON, `warnings` says so and all edits are ignored until you fix it.

Your edits override the built-in data and the automatic banners. The offline snapshot inside the websites (used only when the API is down) is not changed by this file.

## 5c. Games and Taste Matcher

- **Daily YouTuber:** 8 guesses, and **three free hints are shown before your first guess** (categories, audience size, country); a new hint appears after each guess.
- **Mystery Channel:** each round starts with two clues already open, and the first rounds use well-known channels.
- **Taste Matcher:** (1) pick any number of interests, (2) pick a mood (optional), (3) big stars or hidden gems, (4) old favourites or fresh faces, (5) how much to binge, (6) YouTubers you already love (optional, up to 5 - they are left out and used to find similar ones). The score is explainable: interests count most, then favourites, mood, fame, era and library size. "Surprise me" shows channels outside your picks.

## 6. When the API is down

The sites fall back in this order: cache (5 min) -> live API -> legacy `/api/v1/creators` -> bundled snapshot. The status pill in the header shows which one you are looking at. "Continue as guest" still works offline.

## 7. Design notes

The look is YouTube-dark with colour: a drifting gradient glow behind the page, a red load bar, scroll-in animations, card glow in each creator's colour, button ripples and counting numbers. All motion switches off automatically for visitors who set "reduce motion" in their operating system.

## 8. Notes

- Follows, player stats and quiz answers are stored in the visitor's browser only (`localStorage`).
- The browser never talks to the YouTube Data API; only the server does, and only when you set `YOUTUBE_API_KEY`. Not affiliated with or endorsed by YouTube.
