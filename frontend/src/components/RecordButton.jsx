import { useState, useRef, useCallback } from "react";

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function RecordButton({ onRecordingComplete, disabled }) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    clearInterval(timerRef.current);
    setRecording(false);
  }, []);

  const start = useCallback(async () => {
    chunksRef.current = [];
    setElapsed(0);

    const streams = [];

    // Capture microphone
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streams.push(micStream);
    } catch {
      alert("Microphone access denied.");
      return;
    }

    // Attempt system audio capture (requires user to share a tab/screen)
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      // Only keep the audio tracks from display capture
      const audioTracks = displayStream.getAudioTracks();
      if (audioTracks.length > 0) {
        streams.push(displayStream);
      }
      // Stop the video track — we only need audio
      displayStream.getVideoTracks().forEach((t) => t.stop());
    } catch {
      // System audio not available — continue with mic only
    }

    // Merge audio streams via AudioContext
    const audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();
    for (const stream of streams) {
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(destination);
    }

    const recorder = new MediaRecorder(destination.stream, {
      mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm",
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      // Stop all tracks
      for (const stream of streams) {
        stream.getTracks().forEach((t) => t.stop());
      }
      audioContext.close();
      onRecordingComplete(blob);
    };

    recorderRef.current = recorder;
    recorder.start(1000);
    setRecording(true);

    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
  }, [onRecordingComplete]);

  return (
    <div style={{ marginTop: 16 }}>
      {!recording ? (
        <button className="btn-primary" onClick={start} disabled={disabled}>
          Start Recording
        </button>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button className="btn-danger" onClick={stop}>
            Stop Recording
          </button>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 20,
              color: "#dc2626",
            }}
          >
            {formatTime(elapsed)}
          </span>
        </div>
      )}
    </div>
  );
}
