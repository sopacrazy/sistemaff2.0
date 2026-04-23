import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from '../utils/apiConfig';

export default function RequirePermission({ children, permission }) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const checkPermission = async () => {
      try {
        const username = sessionStorage.getItem("username") || localStorage.getItem("username");
        if (!username) {
            setAllowed(false);
            setLoading(false);
            return;
        }

        // 1. Get User ID first
        const userResp = await axios.get(`${API_BASE_URL}/usuarios`);
        const user = userResp.data.find(u => u.username?.toLowerCase() === username?.toLowerCase());

        if (!user) {
            setAllowed(false);
            setLoading(false);
            return;
        }

        // 2. Check Permissions
        // If user is admin/gestor, maybe allow everything? 
        // Logic in home.js suggests admins might still need permissions for specific modules or permissions are managed explicitly.
        // home.js: const isAdmin = userTipo && (userTipo.toLowerCase() === "admin" || userTipo.toLowerCase() === "gestor");
        
        // Let's rely on the explicit permission table first.
        const permissoesResp = await axios.get(`${API_BASE_URL}/permissoes/usuario/${user.id}`);
        const userPermissions = permissoesResp.data;

        // Check if permission exists and is true
        // Also check normalization/casing if needed, but 'FROTA' should match 'FROTA' or 'frota' if we normalize.
        const hasPermission = userPermissions[permission] || 
                              userPermissions[permission.toUpperCase()] || 
                              false;
        
        // Admin override can be added here if desired:
        // if (user.tipo === 'admin') setAllowed(true); else ...
        // For now, adhere to proper permission check
        setAllowed(!!hasPermission);

      } catch (error) {
        console.error("Error checking permissions:", error);
        setAllowed(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, [permission]);

  if (loading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-900">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
          </div>
      );
  }

  return allowed ? children : <Navigate to="/" replace />;
}
