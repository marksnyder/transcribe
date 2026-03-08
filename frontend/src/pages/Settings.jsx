import { useState, useEffect } from "react";

const FIELDS = [
  { key: "openai_api_key", label: "Whisper / OpenAI API Key", type: "password" },
  { key: "google_client_id", label: "Google OAuth Client ID", type: "text" },
  { key: "google_client_secret", label: "Google OAuth Client Secret", type: "password" },
  { key: "upload_endpoint", label: "Upload Endpoint URL", type: "url" },
  { key: "upload_bearer_token", label: "Upload Bearer Token", type: "password" },
];

export default function Settings() {
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setValues)
      .catch(() => {});
  }, []);

  const handleChange = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage("Settings saved.");
      } else {
        setMessage("Error saving settings.");
      }
    } catch {
      setMessage("Error saving settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1>Settings</h1>
      <form className="card" onSubmit={handleSave}>
        {FIELDS.map((field) => (
          <div className="form-group" key={field.key}>
            <label htmlFor={field.key}>{field.label}</label>
            <input
              id={field.key}
              type={field.type}
              value={values[field.key] || ""}
              onChange={(e) => handleChange(field.key, e.target.value)}
              placeholder={field.label}
            />
          </div>
        ))}
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </button>
        {message && <p style={{ marginTop: 8, color: "green" }}>{message}</p>}
      </form>
    </div>
  );
}
