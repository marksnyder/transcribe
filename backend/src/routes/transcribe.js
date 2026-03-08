const express = require("express");
const multer = require("multer");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { getSetting } = require("../db");

const router = express.Router();
const upload = multer({ dest: path.join(__dirname, "..", "..", "tmp") });

const TRANSCRIPTS_DIR = path.join(__dirname, "..", "..", "..", "transcripts");

router.post("/", upload.single("audio"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No audio file provided" });
  }

  const apiKey = getSetting("openai_api_key") || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ error: "OpenAI API key not configured" });
  }

  const eventName = req.body.eventName || "untitled";
  const safeEventName = eventName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${safeEventName}_${timestamp}.md`;

  try {
    const FormData = (await import("form-data")).default;
    const form = new FormData();
    form.append("file", fs.createReadStream(req.file.path), {
      filename: req.file.originalname || "audio.webm",
    });
    form.append("model", "whisper-1");
    form.append("response_format", "text");

    const { data: transcript } = await axios.post(
      "https://api.openai.com/v1/audio/transcriptions",
      form,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          ...form.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    const mdContent = `# ${eventName}\n\n**Date:** ${new Date().toLocaleString()}\n\n## Transcript\n\n${transcript}\n`;

    fs.mkdirSync(TRANSCRIPTS_DIR, { recursive: true });
    const filepath = path.join(TRANSCRIPTS_DIR, filename);
    fs.writeFileSync(filepath, mdContent);

    res.json({ filename, transcript: mdContent });
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  } finally {
    // Clean up temp file
    if (req.file?.path) {
      fs.unlink(req.file.path, () => {});
    }
  }
});

module.exports = router;
