import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function Calendar() {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/calendar/events");
      if (res.status === 401) {
        setConnected(false);
        setEvents([]);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setConnected(true);
        setEvents(data);
      } else {
        setEvents([]);
      }
    } catch {
      setError("Failed to fetch events");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // On mount (or after OAuth redirect), try loading events
  useEffect(() => {
    if (searchParams.get("auth") === "success") {
      // Clean up the query param
      setSearchParams({}, { replace: true });
    }
    fetchEvents();
  }, [fetchEvents, searchParams, setSearchParams]);

  const handleConnect = () => {
    window.location.href = "/api/calendar/auth";
  };

  const handleLogout = async () => {
    await fetch("/api/calendar/logout", { method: "POST" });
    setConnected(false);
    setEvents([]);
  };

  return (
    <div>
      <h1>Today's Meetings</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {!connected ? (
        <button className="btn-primary" onClick={handleConnect}>
          Connect Outlook
        </button>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button className="btn-primary" onClick={fetchEvents}>
              Refresh
            </button>
            <button className="btn-primary" onClick={handleLogout}>
              Disconnect
            </button>
          </div>
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
