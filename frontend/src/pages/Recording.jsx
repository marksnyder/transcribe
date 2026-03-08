import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import RecordButton from "../components/RecordButton";

export default function Recording() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [transcriptFilename, setTranscriptFilename] = useState("");
  const [status, setStatus] = useState("idle"); // idle | transcribing | done | uploading | uploaded
  const audioBlob = useRef(null);

  const accessToken = sessionStorage.getItem("google_access_token") || "";

  useEffect(() => {
    if (!accessToken || !eventId) return;
    fetch(`/api/calendar/events/${eventId}?access_token=${encodeURIComponent(accessToken)}`)
      .then((r) => r.json())
      .then(setEvent)
      .catch(() => {});
  }, [eventId, accessToken]);

  const handleRecordingComplete = async (blob) => {
    audioBlob.current = blob;
    setStatus("transcribing");

    const formData = new FormData();
    formData.append("audio", blob, "recording.webm");
    formData.append("eventName", event?.summary || "untitled");

    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.error) {
        setStatus("idle");
        alert("Transcription error: " + JSON.stringify(data.error));
        return;
      }
      setTranscript(data.transcript);
      setTranscriptFilename(data.filename);
      setStatus("done");
    } catch (err) {
      setStatus("idle");
      alert("Transcription failed: " + err.message);
    }
  };

  const handleUpload = async () => {
    if (!transcriptFilename) return;
    setStatus("uploading");
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: transcriptFilename }),
      });
      const data = await res.json();
      if (data.error) {
        setStatus("done");
        alert("Upload error: " + JSON.stringify(data.error));
        return;
      }
      setStatus("uploaded");
    } catch (err) {
      setStatus("done");
      alert("Upload failed: " + err.message);
    }
  };

  return (
    <div>
      <h1>Record Meeting</h1>
      {event && (
        <div className="card">
          <strong>{event.summary || "(No title)"}</strong>
          {event.description && (
            <p style={{ marginTop: 8, fontSize: 13, color: "#666" }}>{event.description}</p>
          )}
          <p style={{ marginTop: 8, fontSize: 13, color: "#666" }}>
            {event.start?.dateTime
              ? new Date(event.start.dateTime).toLocaleString()
              : "All day"}
          </p>
        </div>
      )}

      <RecordButton
        onRecordingComplete={handleRecordingComplete}
        disabled={status === "transcribing"}
      />

      {status === "transcribing" && <p style={{ marginTop: 16 }}>Transcribing audio...</p>}

      {transcript && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Transcript Preview</h3>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 13, marginTop: 8 }}>{transcript}</pre>
        </div>
      )}

      {status === "done" && (
        <button className="btn-success" style={{ marginTop: 12 }} onClick={handleUpload}>
          Upload Transcript
        </button>
      )}
      {status === "uploading" && <p style={{ marginTop: 16 }}>Uploading...</p>}
      {status === "uploaded" && <p style={{ marginTop: 16, color: "green" }}>Uploaded successfully!</p>}
    </div>
  );
}
