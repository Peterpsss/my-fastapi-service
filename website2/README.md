# YouTube Games

## Description
YouTube Games is Website 2 of the project. It uses the existing YouTuber Archive FastAPI data for interactive gameplay instead of only displaying creator information.

## Game Modes
- **Higher or Lower** — compare two creators using subscribers, total views, or video count.
- **Daily YouTuber** — a Wordle-style daily challenge with six guesses and creator clues.

## API Approach
`API → creator data → game logic → player interaction`

The game first requests creator data from the API. JavaScript then uses that data to create random comparisons, a deterministic daily creator, clue rows, scores, streaks, and autocomplete suggestions.

## Files
- `index.html` — website structure and all game screens
- `style.css` — responsive design, animations, game states, and mobile layout
- `app.js` — API connection, Higher or Lower logic, Daily YouTuber logic, localStorage, and UI behavior
- `README.md` — project notes

## API Configuration
At the top of `app.js`:

```js
const API_BASE_URL = "";
const API_KEY = "supersecret123";
```

### If Web 2 and the FastAPI `api/` folder are deployed together
Leave `API_BASE_URL` as an empty string. The browser will request the API from the same domain.

### If the API is deployed on a different domain
Put only the domain in `API_BASE_URL`, for example:

```js
const API_BASE_URL = "https://your-api-project.vercel.app";
```

The game first requests:

```text
GET /api/v1/creators
Header: x-api-key: supersecret123
```

Your original API also contains the public `/creators` route. Web 2 uses it only as a fallback during local/deployment testing if the protected route returns 401, 403, or 404.

## Fixes in this version
- Removed the broken Archive/Recommendations JavaScript references that could stop the script before the API request started.
- Added a request timeout so the loading screen cannot spin forever.
- Added clearer API errors and API status in the header.
- Added protected-route → public-route fallback using the routes already available in the original FastAPI file.
- Fixed Daily YouTuber stats so a completed daily challenge cannot accidentally be counted twice.
- Kept completed Daily YouTuber games saved in `localStorage` after refresh.
- Added safer ID comparisons for API numeric IDs.
- Added more responsive behavior and accessibility.
- Added card motion, score animations, result reveals, better transitions, and win confetti.

## How to Run
1. Keep `index.html`, `style.css`, and `app.js` inside the same `web2` folder.
2. Set `API_BASE_URL` in `app.js` if the API is hosted on another domain.
3. Run with VS Code Live Server or deploy the website.
4. Open the browser console if the API status says **Offline**; the error message will also explain the connection issue.

## Production Note
This is an educational project. In a real production system, a private API key should not be stored in frontend JavaScript. A server-side proxy or environment-protected backend should hold the secret.
