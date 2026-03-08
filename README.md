# Transcribe

A meeting transcription web app for Ubuntu. Records microphone and system audio during meetings, transcribes via OpenAI Whisper, and uploads markdown transcripts to a configurable endpoint.

## Features

- Microsoft Outlook calendar integration — view today's meetings and select one to record
- Audio capture — microphone + system audio (via `getUserMedia` / `getDisplayMedia`)
- Transcription — sends audio to OpenAI Whisper API, saves `.md` transcript
- Upload — POST transcript to a user-configured endpoint with bearer auth
- Settings — configure API keys, OAuth credentials, and upload endpoint from the UI

## Prerequisites

- Node.js 20+
- A Microsoft Azure app registration (for Outlook calendar)
- An OpenAI API key (for Whisper)

## Microsoft Graph API Setup (Outlook Calendar)

1. Go to [portal.azure.com](https://portal.azure.com) → **Azure Active Directory** → **App registrations** → **New registration**.
2. Name: **Transcribe**. Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**.
3. Redirect URI: **Web** → `http://localhost:3000/api/calendar/callback`.
4. After creation, copy the **Application (client) ID** → set as `MICROSOFT_CLIENT_ID`.
5. Go to **Certificates & secrets** → **New client secret** → copy the value → set as `MICROSOFT_CLIENT_SECRET`.
6. `MICROSOFT_TENANT_ID`: use `common` for personal + work accounts, or your specific tenant ID for org-only access.
7. Go to **API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated permissions** → add:
   - `Calendars.Read`
   - `offline_access`

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

```
MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret
MICROSOFT_TENANT_ID=common
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/calendar/callback
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
│   │       ├── calendar.js   # Microsoft Graph API (Outlook)
│   │       ├── transcribe.js # Whisper transcription
│   │       └── upload.js     # POST transcript to endpoint
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx           # Router
│   │   ├── pages/
│   │   │   ├── Calendar.jsx  # Outlook OAuth + event list
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
