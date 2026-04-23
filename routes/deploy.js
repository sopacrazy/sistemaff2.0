const express = require("express");
const fs = require("fs-extra");
const { exec } = require("child_process");
const path = require("path");

const router = express.Router();

const logPath = "C:/deploy/deploy-log.txt";

// Função para log
function writeLog(msg) {
  const data = `[${new Date().toLocaleString()}] ${msg}\n`;
  fs.appendFileSync(logPath, data);
}

router.post("/deploy", async (req, res) => {
  try {
    writeLog("🔁 Requisição recebida para iniciar atualização.");

    exec("start C:\\deploy\\atualizar.bat", (err) => {
      if (err) {
        writeLog("❌ Erro ao executar o .bat: " + err.message);
        console.error("Erro ao executar .bat:", err);
        return res.status(500).send("Erro ao iniciar atualização");
      }

      writeLog("✅ Script atualizar.bat iniciado com sucesso.");
      return res.send({ status: "🚀 Script de atualização iniciado!" });
    });
  } catch (err) {
    writeLog("❌ Erro geral na rota /deploy: " + err.message);
    res.status(500).send("Erro inesperado ao iniciar atualização");
  }
});

module.exports = router;
