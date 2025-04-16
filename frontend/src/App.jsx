import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import { Routes, Route } from "react-router-dom";
import FindWorker from "./Components/FindWorker";
import FindWork from "./Components/FindWork";
import AdsPage from "./Components/AdsPage";
import WorkerPortfolio from "./Components/WorkerPortfolio";
import JobDetail from "./Components/JobDetail";
import Header from "./Components/Header";
import "./App.css";

function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<FindWorker />} />
        <Route path="/find-work" element={<FindWork />} />
        <Route path="/job/:id" element={<JobDetail />} />
        <Route path="/find-workers" element={<FindWorker />} />
        <Route path="/ads" element={<AdsPage />} />
        <Route path="/worker/:id" element={<WorkerPortfolio />} />
      </Routes>
    </>
  );
}

export default App;
