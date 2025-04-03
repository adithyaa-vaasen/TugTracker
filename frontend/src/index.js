import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LivePage from "./pages/LivePage";
import HistoricalPage from "./pages/HistoricalPage";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<LivePage />} />
      <Route path="/historical" element={<HistoricalPage />} />
    </Routes>
  </BrowserRouter>
);