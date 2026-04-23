// src/components/AnnouncementCenter.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Typography,
} from "@mui/material";
import { getWsBase } from "../utils/wsBase";

const SEEN_KEY = "announcements_seen_ids";

export default function AnnouncementCenter() {
  const [announce, setAnnounce] = useState(null);

  // Tenta pegar o username do storage
  const [username, setUsername] = useState(() => sessionStorage.getItem("username") || localStorage.getItem("username") || "sistema");
  const local = sessionStorage.getItem("local") || localStorage.getItem("local") || "01";
  const WS_BASE = getWsBase();

  // Polling para detectar login (já que sessionStorage não dispara eventos de storage no mesmo tab)
  useEffect(() => {
    const interval = setInterval(() => {
      const currentUsername = sessionStorage.getItem("username") || localStorage.getItem("username") || "sistema";
      if (currentUsername !== username) {
        console.log(`👤 Usuário alterado no storage: ${username} -> ${currentUsername}. Reconectando WS...`);
        setUsername(currentUsername);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [username]);

  useEffect(() => {
    if (!username || username === "sistema") return; // Não conecta se não houver username válido

    let ws = null;
    let reconnectTimer = null;
    let isIntentionalClose = false;

    const connect = () => {
      if (ws && ws.readyState === WebSocket.OPEN) return;

      try {
        ws = new WebSocket(
          `${WS_BASE}?username=${encodeURIComponent(
            username
          )}&local=${encodeURIComponent(local)}`
        );

        ws.onopen = () => {
          console.log(`✅ WebSocket conectado: ${username} (${local})`);
          window.dispatchEvent(new CustomEvent('ws_status', { detail: { connected: true } }));
        };

        ws.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data?.tipo !== "announcement") {
              // Dispara evento para outros tipos (como notificações de chamados)
              window.dispatchEvent(new CustomEvent('ws_message', { detail: data }));
              return;
            }

            // TTL opcional
            if (data.ttlSec && data.createdAt) {
              const age = (Date.now() - new Date(data.createdAt).getTime()) / 1000;
              if (age > data.ttlSec) return;
            }

            // evita repetir o mesmo id
            const seen = new Set(
              JSON.parse(localStorage.getItem(SEEN_KEY) || "[]")
            );
            if (data.id && seen.has(data.id)) return;

            setAnnounce({
              id: data.id || String(Date.now()),
              title: data.title || "Aviso",
              body: data.body || "",
              level: data.level || "info",
              requireAck: data.requireAck !== false,
            });
          } catch (err) {
            console.error("WS parse error:", err);
          }
        };

        ws.onclose = () => {
          window.dispatchEvent(new CustomEvent('ws_status', { detail: { connected: false } }));
          if (!isIntentionalClose) {
            // Reconecta após 3 segundos
            reconnectTimer = setTimeout(() => {
              console.log(`🔄 Tentando reconectar WebSocket para ${username}...`);
              connect();
            }, 3000);
          }
        };

        ws.onerror = (error) => {
          console.error("❌ Erro no WebSocket:", error);
          // Adicional para debug: verificar estado da conexão
          if (ws) console.log("Estado atual do WS:", ws.readyState);
        };
      } catch (err) {
        console.error("Erro ao criar WebSocket:", err);
      }
    };

    connect();

    return () => {
      isIntentionalClose = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [WS_BASE, username, local]);

  const closeAnnouncement = () => {
    if (announce?.id) {
      const seen = new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"));
      seen.add(announce.id);
      localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
    }
    setAnnounce(null);
  };

  if (!announce) return null;

  return (
    <Dialog open fullWidth maxWidth="sm" onClose={closeAnnouncement}>
      <DialogTitle>{announce.title || "Aviso"}</DialogTitle>
      <DialogContent dividers>
        <Alert severity={announce.level || "info"} sx={{ mb: 2 }}>
          {(announce.level || "info").toUpperCase()}
        </Alert>
        <Typography whiteSpace="pre-line">{announce.body}</Typography>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={closeAnnouncement} autoFocus>
          {announce.requireAck ? "Entendi" : "Fechar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
