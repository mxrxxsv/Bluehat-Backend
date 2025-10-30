import {useState, useEffect} from "react";
import { Navigate } from  "react-router-dom";
import { getProfile } from "../api/profile";

export default function ProtectedRoute({ children }) {
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);

    useEffect(() => {
        getProfile()
            .then(res => {
                if (res.data.success) setAuthenticated(true);
                else setAuthenticated(false);
            })
            .catch(() => setAuthenticated(false))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div>Loading...</div>


    return authenticated ? children : <Navigate to="/login"></Navigate>

}