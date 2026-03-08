const express = require("express");
const axios = require("axios");
const msal = require("@azure/msal-node");
const { getSetting, setSetting } = require("../db");

const router = express.Router();

function getMsalConfig() {
  const clientId =
    getSetting("microsoft_client_id") || process.env.MICROSOFT_CLIENT_ID;
  const clientSecret =
    getSetting("microsoft_client_secret") || process.env.MICROSOFT_CLIENT_SECRET;
  const tenantId =
    getSetting("microsoft_tenant_id") || process.env.MICROSOFT_TENANT_ID || "common";
  const redirectUri =
    process.env.MICROSOFT_REDIRECT_URI || "http://localhost:3000/api/calendar/callback";

  return { clientId, clientSecret, tenantId, redirectUri };
}

function createMsalClient() {
  const { clientId, clientSecret, tenantId } = getMsalConfig();
  if (!clientId || !clientSecret) return null;

  return new msal.ConfidentialClientApplication({
    auth: {
      clientId,
      clientSecret,
      authority: `https://login.microsoftonline.com/${tenantId}`,
    },
  });
}

const SCOPES = ["Calendars.Read", "offline_access", "openid", "profile"];

// Redirect to Microsoft login
router.get("/auth", (req, res) => {
  const { clientId, redirectUri } = getMsalConfig();
  const client = createMsalClient();
  if (!client) {
    return res.status(400).json({ error: "Microsoft OAuth credentials not configured" });
  }

  client
    .getAuthCodeUrl({
      scopes: SCOPES,
      redirectUri,
      responseMode: "query",
    })
    .then((url) => res.redirect(url))
    .catch((err) => res.status(500).json({ error: err.message }));
});

// OAuth callback — exchange code for tokens
router.get("/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ error: "Missing authorization code" });
  }

  const { redirectUri } = getMsalConfig();
  const client = createMsalClient();
  if (!client) {
    return res.status(400).json({ error: "Microsoft OAuth credentials not configured" });
  }

  try {
    const result = await client.acquireTokenByCode({
      code,
      scopes: SCOPES,
      redirectUri,
    });

    setSetting("ms_access_token", result.accessToken);
    if (result.idToken) setSetting("ms_id_token", result.idToken);
    if (result.account?.homeAccountId) {
      setSetting("ms_account_id", result.account.homeAccountId);
    }
    // Store expiry so frontend can detect stale tokens
    if (result.expiresOn) {
      setSetting("ms_token_expires", result.expiresOn.toISOString());
    }

    // Redirect to frontend calendar page
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    res.redirect(`${frontendUrl}/calendar?auth=success`);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List today's calendar events
router.get("/events", async (req, res) => {
  const accessToken = getSetting("ms_access_token");
  if (!accessToken) {
    return res.status(401).json({ error: "Not authenticated with Microsoft" });
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  try {
    const { data } = await axios.get(
      "https://graph.microsoft.com/v1.0/me/calendarView",
      {
        params: {
          startDateTime: startOfDay,
          endDateTime: endOfDay,
          $orderby: "start/dateTime",
          $top: 50,
        },
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    // Normalize to a consistent shape for the frontend
    const events = (data.value || []).map((e) => ({
      id: e.id,
      summary: e.subject,
      start: { dateTime: e.start?.dateTime, timeZone: e.start?.timeZone },
      end: { dateTime: e.end?.dateTime, timeZone: e.end?.timeZone },
      location: e.location?.displayName || "",
      isAllDay: e.isAllDay,
    }));
    res.json(events);
  } catch (err) {
    if (err.response?.status === 401) {
      return res.status(401).json({ error: "Token expired. Please re-authenticate." });
    }
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// Get single event details
router.get("/events/:eventId", async (req, res) => {
  const accessToken = getSetting("ms_access_token");
  if (!accessToken) {
    return res.status(401).json({ error: "Not authenticated with Microsoft" });
  }

  try {
    const { data } = await axios.get(
      `https://graph.microsoft.com/v1.0/me/events/${req.params.eventId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    res.json({
      id: data.id,
      summary: data.subject,
      start: { dateTime: data.start?.dateTime, timeZone: data.start?.timeZone },
      end: { dateTime: data.end?.dateTime, timeZone: data.end?.timeZone },
      location: data.location?.displayName || "",
      description: data.bodyPreview || "",
      isAllDay: data.isAllDay,
    });
  } catch (err) {
    if (err.response?.status === 401) {
      return res.status(401).json({ error: "Token expired. Please re-authenticate." });
    }
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// Logout — clear stored tokens
router.post("/logout", (req, res) => {
  setSetting("ms_access_token", "");
  setSetting("ms_id_token", "");
  setSetting("ms_account_id", "");
  setSetting("ms_token_expires", "");
  res.json({ ok: true });
});

module.exports = router;
