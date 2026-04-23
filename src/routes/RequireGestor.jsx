// src/routes/RequireGestor.jsx
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from '../utils/apiConfig';

export default function RequireGestor({ children }) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const username = sessionStorage.getItem("username") || localStorage.getItem("username");
        if (!username) {
          setAllowed(false);
          setLoading(false);
          return;
        }

        const res = await axios.get(
          `${API_BASE_URL}/usuarios/perfil/${username}`
        );
        const tipo = String(res.data?.tipo || "")
          .trim()
          .toLowerCase();
        setAllowed(tipo === "gestor" || tipo === "admin");
      } catch {
        setAllowed(false);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  if (loading) return null; // ou um spinner

  // se não for gestor, manda embora
  return allowed ? children : <Navigate to="/estoque" replace />;
}
