import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { checkAuth } from "../Api/auth"; // make sure this points to your auth.js

export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth()
      .then((res) => {
        if (res.data?.isAuthenticated) {
          setAuthenticated(true);
        } else {
          setAuthenticated(false);
        }
      })
      .catch(() => setAuthenticated(false))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;

  return authenticated ? children : <Navigate to="/" replace />;
}
