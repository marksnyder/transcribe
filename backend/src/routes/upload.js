const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { getSetting } = require("../db");

const router = express.Router();

const TRANSCRIPTS_DIR = path.join(__dirname, "..", "..", "..", "transcripts");

router.post("/", async (req, res) => {
  const { filename } = req.body;
  if (!filename) {
    return res.status(400).json({ error: "Missing filename" });
  }

  const uploadUrl = getSetting("upload_endpoint");
  const bearerToken = getSetting("upload_bearer_token");

  if (!uploadUrl) {
    return res.status(400).json({ error: "Upload endpoint not configured" });
  }

  const filepath = path.join(TRANSCRIPTS_DIR, path.basename(filename));
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: "Transcript file not found" });
  }

  try {
    const content = fs.readFileSync(filepath, "utf-8");

    const headers = { "Content-Type": "text/markdown" };
    if (bearerToken) {
      headers["Authorization"] = `Bearer ${bearerToken}`;
    }

    const { data } = await axios.post(uploadUrl, content, { headers });

    res.json({ ok: true, response: data });
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

module.exports = router;
