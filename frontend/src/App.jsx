import { Routes, Route, Link } from "react-router-dom";
import Calendar from "./pages/Calendar";
import Recording from "./pages/Recording";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <>
      <nav>
        <Link to="/">Calendar</Link>
        <Link to="/settings">Settings</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Calendar />} />
        <Route path="/record/:eventId" element={<Recording />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </>
  );
}
