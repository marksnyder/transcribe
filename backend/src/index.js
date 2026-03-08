require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const calendarRoutes = require("./routes/calendar");
const transcribeRoutes = require("./routes/transcribe");
const uploadRoutes = require("./routes/upload");
const { getAllSettings, setSetting } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Settings API
app.get("/api/settings", (req, res) => {
  const settings = getAllSettings();
  // Never return sensitive keys in full
  const safe = { ...settings };
  for (const key of ["openai_api_key", "google_client_secret", "upload_bearer_token"]) {
    if (safe[key]) {
      safe[key] = safe[key].slice(0, 4) + "****";
    }
  }
  res.json(safe);
});

app.post("/api/settings", (req, res) => {
  const entries = req.body;
  if (typeof entries !== "object" || Array.isArray(entries)) {
    return res.status(400).json({ error: "Expected an object of key/value pairs" });
  }
  for (const [key, value] of Object.entries(entries)) {
    setSetting(key, value);
  }
  res.json({ ok: true });
});

// Routes
app.use("/api/calendar", calendarRoutes);
app.use("/api/transcribe", transcribeRoutes);
app.use("/api/upload", uploadRoutes);

// Serve transcripts
app.use("/api/transcripts", express.static(path.join(__dirname, "..", "..", "transcripts")));

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
