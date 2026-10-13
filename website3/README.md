# YouTube Taste Matcher

## Description
YouTube Taste Matcher is a recommendation website where users answer questions about the type of YouTube content and creators they enjoy. The website compares those answers with creator data from the existing YouTuber API and shows the best matches.

## API Approach
API → Retrieve Creator Data → User Preferences → Matching Algorithm → Recommendations

The website uses the protected endpoint:

`GET /api/v1/creators`

Requests include the `x-api-key` header.

## How Matching Works
Each creator is scored using real API fields such as niche, subscribers, video count, joined year, total views, and country. The quiz answers control the matching criteria and their weights. The final percentage is calculated from earned match points divided by possible active points, so "No preference" choices are not counted against a creator.

The same answers and the same API data always produce the same ranking. Match percentages are not random.

## Files
- `index.html` – page structure
- `style.css` – responsive dark theme and animations
- `app.js` – API requests, quiz logic, scoring, recommendations, modal, and localStorage

## How to Run
1. Keep `index.html`, `style.css`, and `app.js` together inside the `web3` folder.
2. Open the folder in Visual Studio Code.
3. Run `index.html` using Live Server or another local web server.
4. If your API host changes, update `API_BASE_URL` near the top of `app.js`.
5. If your educational API key changes, update `API_KEY` in the same configuration section.

## API Key Note
This project keeps the API key in frontend JavaScript because it is an educational API-key project. In a production application, private API keys should not be exposed in browser JavaScript. A backend proxy or server-side request should normally protect the secret key.
