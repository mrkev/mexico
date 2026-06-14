import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { Guadalajara } from "./routes/Guadalajara";
import { Historia } from "./routes/Historia";

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/guadalajara" replace />} />
        <Route path="/guadalajara" element={<Guadalajara />} />
        <Route path="/historia" element={<Historia />} />
      </Routes>
    </HashRouter>
  );
}
