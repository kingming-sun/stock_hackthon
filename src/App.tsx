import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Analysis from "@/pages/Analysis";
import Report from "@/pages/Report";
import Chat from "@/pages/Chat";
import AppLayout from "@/layout/AppLayout";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/report" element={<Report />} />
          <Route path="/chat" element={<Chat />} />
        </Route>
      </Routes>
    </Router>
  );
}
