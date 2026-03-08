const express = require("express");
const axios = require("axios");
const { getSetting } = require("../db");

const router = express.Router();

// Exchange authorization code for tokens
router.post("/auth", async (req, res) => {
  const { code, redirect_uri } = req.body;
  const clientId = getSetting("google_client_id") || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = getSetting("google_client_secret") || process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(400).json({ error: "Google OAuth credentials not configured" });
  }

  try {
    const { data } = await axios.post("https://oauth2.googleapis.com/token", {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri,
      grant_type: "authorization_code",
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// List calendar events for today
router.get("/events", async (req, res) => {
  const { access_token } = req.query;
  if (!access_token) {
    return res.status(401).json({ error: "Missing access_token" });
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  try {
    const { data } = await axios.get(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        params: {
          timeMin: startOfDay,
          timeMax: endOfDay,
          singleEvents: true,
          orderBy: "startTime",
        },
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );
    res.json(data.items || []);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// Get single event
router.get("/events/:eventId", async (req, res) => {
  const { access_token } = req.query;
  if (!access_token) {
    return res.status(401).json({ error: "Missing access_token" });
  }

  try {
    const { data } = await axios.get(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${req.params.eventId}`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

module.exports = router;
