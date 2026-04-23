import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const useIdleLogout = (timeout = 30 * 60 * 1000) => {
  const navigate = useNavigate();

  useEffect(() => {
    let timer;

    const logout = () => {
      // 🟢 Reseta a data de trabalho ao sair por inatividade
      const hoje = new Date().toISOString().split("T")[0];
      localStorage.setItem("data_trabalho", hoje);

      // 🔒 Remove demais dados
      localStorage.removeItem("token");
      localStorage.removeItem("username");
      localStorage.removeItem("permissoes");

      navigate("/login");
    };

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(logout, timeout);
    };

    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
    ];
    events.forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [navigate, timeout]);
};

export default useIdleLogout;
