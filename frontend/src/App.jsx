import "./App.css";
import { Routes, Route } from "react-router-dom";
import FindWorker from "./Pages/FindWorker";
import FindWork from "./Pages/FindWork";
import AdsPage from "./Pages/AdsPage";
import WorkerPortfolio from "./Pages/WorkerPortfolio";
import JobDetail from "./Pages/JobDetail";
import Header from "./components/Header";
import ChatPage from "./Pages/ChatPage";
import HomePage from "./Pages/HomePage";
import Signup from "./Pages/Signup";
import Login from "./Pages/Login";
import WorkerSignup from "./Pages/WorkerSignup";
import ClientSignup from "./Pages/ClientSignup";
import ForgetPass from "./Pages/ForgetPass";
import ResetPassword from "./Pages/ResetPassword";
import WorkerQuestion from "./Pages/WorkerQuestion";
import Footer from "./components/Footer";
import ProfilePage from "./Pages/ProfilePage";
import ProtectedRoute from "./components/ProtectedRoutes";
import Setup2FA from "./components/Setup2FA";
import VerifyEmail from "./components/VerifyEmail";
import ApplicationsPage from "./Pages/ApplicationPage";
import InviteWorkersPage from "./Pages/InviteWorkersPage";
import FeedbackPage from "./Pages/FeedbackPage";
import ContractManagement from "./Pages/ContractManagement";
import ClientProfile from "./Pages/ClientProfile";
import ChangePassword from "./Pages/ChangePassword";
function App() {
  return (
    <>
      <Header />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/job/:id" element={<JobDetail />} />
        <Route path="/worker/:id" element={<WorkerPortfolio />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/chat/:contactId" element={<ChatPage />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/workersignup" element={<WorkerSignup />} />
        <Route path="/clientsignup" element={<ClientSignup />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/forgetpass" element={<ForgetPass />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/workerquestion" element={<WorkerQuestion />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/applications" element={<ApplicationsPage />} />
        <Route path="/invite-workers/:jobId" element={<InviteWorkersPage />} />
        <Route path="/feedback/:contractId" element={<FeedbackPage />} />
        <Route path="/contracts" element={<ContractManagement />} />
        <Route path="/client/:id" element={<ClientProfile />} />
        <Route path="/find-workers" element={<FindWorker />} />
        <Route path="/find-work" element={<FindWork />} />
        <Route path="/ads" element={<AdsPage />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/setup-2fa" element={<Setup2FA />} />

        {/* <Route
          path="/find-workers"
          element={
            <ProtectedRoute>
              <FindWorker />
            </ProtectedRoute>
          }
        />

        <Route
          path="/find-work"
          element={
            <ProtectedRoute>
              <FindWork />
            </ProtectedRoute>
          }
        /> */}

        {/* <Route
          path="/applications"
          element={
            <ProtectedRoute>
              <ApplicationsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/invite-workers/:jobId"
          element={
            <ProtectedRoute>
              <InviteWorkersPage />
            </ProtectedRoute>
          }
        /> */}

        {/* <Route
          path="/ads"
          element={
            <ProtectedRoute>
              <AdsPage />
            </ProtectedRoute>
          }
        /> */}

      </Routes>

      <Footer />
    </>
  );
}

export default App;