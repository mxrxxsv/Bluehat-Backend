import { Routes, Route, useLocation } from "react-router-dom";
import Sidebar from './Components/Sidebar';
import Login from './Pages/Login';
import Dashboard from './Pages/Dashboard';
import Content from "./Pages/Content";
import Advertisement from "./Pages/Advertisment";
import ProtectedRoute from './Components/ProtectedRoute';
import JobPending from "./Pages/JobPending";
import ClientManagement from "./Pages/ClientManagement";

function App() {
  const location = useLocation();
  const hideSidebar = location.pathname === "/";

  return (
    <div className="flex">
      {!hideSidebar && <Sidebar />}
      <div className="flex-1">
        <Routes>
          {/* Public Route */}
          <Route path="/" element={<Login />} />

          {/* Protected/Admin Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/advertisement"
            element={
              <ProtectedRoute>
                <Advertisement />
              </ProtectedRoute>
            }
          />

          <Route
          path="/content"
          element={
            <ProtectedRoute>
              <Content />
            </ProtectedRoute>
          }
        />

        <Route
          path="/job-pending"
          element={
            <ProtectedRoute>
              <JobPending />
            </ProtectedRoute>
          }
        />

        <Route
          path="/client-management"
          element={
            <ProtectedRoute>
              <ClientManagement />
            </ProtectedRoute>
          }
        />

      </Routes>

        
      


      </div>
    </div>
  );
}

export default App;
