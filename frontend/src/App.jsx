import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import { Routes, Route } from "react-router-dom";
import FindWorker from "./Pages/FindWorker";
import FindWork from "./Pages/FindWork";
import AdsPage from "./Pages/AdsPage";
import WorkerPortfolio from "./Pages/WorkerPortfolio";
import JobDetail from "./Pages/JobDetail";
import Header from "./Pages/Header";
import ChatPage from "./Pages/ChatPage";
import "./App.css";
import HomePage from "./Pages/HomePage";
import Signup from "./Pages/Signup";
import Login from "./Pages/Login";

function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/find-work" element={<FindWork />} />
        <Route path="/job/:id" element={<JobDetail />} />
        <Route path="/find-workers" element={<FindWorker />} />
        <Route path="/ads" element={<AdsPage />} />
        <Route path="/worker/:id" element={<WorkerPortfolio />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
      </Routes>

    </>
  );
}

export default App;
