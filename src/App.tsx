import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Analysis from "@/pages/Analysis";
import Report from "@/pages/Report";
import Chat from "@/pages/Chat";
import Preview from "@/pages/Preview";
import AppLayout from "@/layout/AppLayout";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Full-bleed pages without sidebar */}
        <Route path="/analysis" element={<Analysis />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/report" element={<Report />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/preview" element={<Preview />} />
        </Route>
      </Routes>
    </Router>
  );
}
