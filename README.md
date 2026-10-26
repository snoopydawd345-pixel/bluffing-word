# Word Bluff - React project

A room-code party game built with React and Vite. This is the frontend project; the standalone multiplayer API is in `../word-bluff-backend`.

## Run in development mode

Requires Node.js 18 or newer.

1. Open a terminal in this folder.
2. Run `npm install` once to install React and Vite.
3. Run `npm run dev`.
4. Open `http://localhost:5173`.

The development command starts the React interface and the local game API together. Open another browser window or device on the same Wi-Fi to join with the room code.

## Build and run the production version

Run `npm install`, then `npm run build`. To deploy the frontend separately, set `VITE_API_URL` to your deployed backend base URL (for example `https://your-service.onrender.com`, with no `/api` suffix), then build and deploy this project as a static Vite site.

Deploy the backend separately using the instructions in `../word-bluff-backend/README.md`.

Active rooms are stored in server memory. Rooms end if the server restarts. The game does not require accounts or third-party game services.

## Rules

- A room needs at least 3 players and supports up to 12.
- One player is Reader. They privately see the mystery word and its real definition, then read the clue aloud.
- Other players submit one fake definition each.
- The game mixes the real definition with the fakes. Players vote; self-voting is allowed.
- Correct votes earn 1,000 points. A fake author earns 500 for each other player who votes for their bluff. The Reader earns 500 for each vote for the real answer.
- The host chooses 3 rounds, 5 rounds, or one round per player so everyone gets to read.
- The highest total score wins. Ties are shared.
- Refreshing reconnects a browser to its room. The host can continue without players who disconnect mid-round.

## Project files

- `src/App.jsx` - React game screens and room flow
- `src/main.jsx` - React app entry point
- `src/styles.css` - responsive visual design
- `server.js` - local development API server
- `vite.config.js`, `dev.js` - local React development setup
- `cover.png` - upload-ready project cover image
- `submission.md` - contest title and description draft
