# Transcribe

A meeting transcription web app for Ubuntu. Records microphone and system audio during meetings, transcribes via OpenAI Whisper, and uploads markdown transcripts to a configurable endpoint.

## Features

- Google Calendar integration — view today's meetings and select one to record
- Audio capture — microphone + system audio (via `getUserMedia` / `getDisplayMedia`)
- Transcription — sends audio to OpenAI Whisper API, saves `.md` transcript
- Upload — POST transcript to a user-configured endpoint with bearer auth
- Settings — configure API keys, OAuth credentials, and upload endpoint from the UI

## Prerequisites

- Node.js 20+
- A Google Cloud project with Calendar API enabled
- An OpenAI API key (for Whisper)

## Google Calendar OAuth Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (or select an existing one).
3. Navigate to **APIs & Services > Library** and enable the **Google Calendar API**.
4. Go to **APIs & Services > Credentials** and create an **OAuth 2.0 Client ID**.
   - Application type: **Web application**
   - Authorized JavaScript origins: `http://localhost:5173`
   - Authorized redirect URIs: `http://localhost:5173/`
5. Copy the **Client ID** and **Client Secret**.
6. Enter them in the app's Settings page or put them in `backend/.env`.

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

```
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
OPENAI_API_KEY=your-openai-api-key
PORT=3000
```

You can also configure these from the Settings page in the UI (stored in SQLite).

## Running Locally

### Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in your keys
npm start              # starts on port 3000
```

### Frontend

```bash
cd frontend
npm install
npm run dev            # starts on port 5173, proxies /api to :3000
```

Open http://localhost:5173 in your browser.

## Running with Docker Compose

```bash
cp backend/.env.example backend/.env  # fill in your keys
docker compose up
```

The backend runs on port 3000. You'll still need to run the frontend separately for dev (`cd frontend && npm run dev`).

## Running in Dev Container

Open this repo in VS Code with the Dev Containers extension. It will:

1. Use the `node:20-bullseye` dev container image
2. Run `npm install` in both `backend/` and `frontend/`
3. Forward ports 3000 and 5173

Then start each service in a terminal inside the container.

## Audio Capture Notes (Ubuntu PulseAudio / PipeWire)

For system audio capture to work in the browser, you need to share a browser tab or screen that has audio when prompted by `getDisplayMedia`.

### PulseAudio

System audio capture works when you select a tab or screen during the `getDisplayMedia` prompt. No extra config is needed for most setups.

### PipeWire

PipeWire (default on Ubuntu 22.04+) works the same way. If you encounter issues:

```bash
# Check your audio server
pactl info | grep "Server Name"

# Ensure PipeWire PulseAudio compatibility layer is running
systemctl --user status pipewire-pulse
```

The app merges microphone and system audio streams using the Web Audio API before recording.

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── index.js          # Express server
│   │   ├── db.js             # SQLite (settings table)
│   │   └── routes/
│   │       ├── calendar.js   # Google Calendar API proxy
│   │       ├── transcribe.js # Whisper transcription
│   │       └── upload.js     # POST transcript to endpoint
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx           # Router
│   │   ├── pages/
│   │   │   ├── Calendar.jsx  # OAuth + event list
│   │   │   ├── Recording.jsx # Record + transcribe + upload
│   │   │   └── Settings.jsx  # Config form
│   │   └── components/
│   │       └── RecordButton.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── transcripts/              # Saved .md transcripts
├── .devcontainer/
│   └── devcontainer.json
├── docker-compose.yml
└── README.md
```
