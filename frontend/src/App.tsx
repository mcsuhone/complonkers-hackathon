import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { SlidesPage } from "./pages/SlidesPage";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/slides/:presentationId" element={<SlidesPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
