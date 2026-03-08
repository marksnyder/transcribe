import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const SCOPES = "https://www.googleapis.com/auth/calendar.readonly";

export default function Calendar() {
  const [accessToken, setAccessToken] = useState(
    () => sessionStorage.getItem("google_access_token") || ""
  );
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => {
        if (s.google_client_id) setClientId(s.google_client_id);
      })
      .catch(() => {});
  }, []);

  const handleLogin = () => {
    if (!clientId) {
      alert("Google Client ID not configured. Go to Settings first.");
      return;
    }
    const redirectUri = window.location.origin + "/";
    const url =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=token` +
      `&scope=${encodeURIComponent(SCOPES)}`;
    window.location.href = url;
  };

  // Handle OAuth redirect (implicit flow — token in hash)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("access_token")) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get("access_token");
      if (token) {
        setAccessToken(token);
        sessionStorage.setItem("google_access_token", token);
        window.history.replaceState(null, "", "/");
      }
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/calendar/events?access_token=${encodeURIComponent(accessToken)}`);
      const data = await res.json();
      if (Array.isArray(data)) setEvents(data);
      else setEvents([]);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) fetchEvents();
  }, [accessToken, fetchEvents]);

  return (
    <div>
      <h1>Today's Meetings</h1>
      {!accessToken ? (
        <button className="btn-primary" onClick={handleLogin}>
          Sign in with Google
        </button>
      ) : (
        <>
          <button className="btn-primary" onClick={fetchEvents} style={{ marginBottom: 16 }}>
            Refresh
          </button>
          {loading && <p>Loading events...</p>}
          {events.length === 0 && !loading && <p>No events today.</p>}
          {events.map((event) => (
            <div
              key={event.id}
              className="card"
              style={{ cursor: "pointer" }}
              onClick={() => navigate(`/record/${event.id}`)}
            >
              <strong>{event.summary || "(No title)"}</strong>
              <p style={{ color: "#666", fontSize: 13, marginTop: 4 }}>
                {event.start?.dateTime
                  ? new Date(event.start.dateTime).toLocaleTimeString()
                  : "All day"}{" "}
                —{" "}
                {event.end?.dateTime
                  ? new Date(event.end.dateTime).toLocaleTimeString()
                  : ""}
              </p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
