// src/utils/wsBase.js
import { API_BASE_URL } from "./apiConfig";
const API_BASE = API_BASE_URL;

export function getWsBase() {
  try {
    const u = new URL(API_BASE);
    u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
    u.pathname = "/";
    u.search = "";
    u.hash = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return API_BASE.replace(/^https:/, "wss:")
      .replace(/^http:/, "ws:")
      .replace(/\/$/, "");
  }
}
