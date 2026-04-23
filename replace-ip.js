const fs = require("fs");
const path = require("path");

const diretorio = "./src"; // Pasta onde buscar (ajusta se quiser)
const ipAntigo = "http://192.168.10.49:3001";
const novoValor = `${process.env.REACT_APP_API_URL}";

// Função recursiva para percorrer todos os arquivos da pasta
function buscarArquivos(diretorio) {
  fs.readdir(diretorio, (err, arquivos) => {
    if (err) {
      console.error("Erro ao ler diretório:", err);
      return;
    }

    arquivos.forEach((arquivo) => {
      const caminhoCompleto = path.join(diretorio, arquivo);

      fs.stat(caminhoCompleto, (err, stats) => {
        if (err) {
          console.error("Erro ao ler arquivo:", err);
          return;
        }

        if (stats.isDirectory()) {
          buscarArquivos(caminhoCompleto); // Recursão
        } else if (
          caminhoCompleto.endsWith(".js") ||
          caminhoCompleto.endsWith(".jsx")
        ) {
          substituirIP(caminhoCompleto);
        }
      });
    });
  });
}

// Função que faz a substituição
function substituirIP(caminhoArquivo) {
  fs.readFile(caminhoArquivo, "utf8", (err, data) => {
    if (err) {
      console.error("Erro ao ler arquivo:", caminhoArquivo);
      return;
    }

    if (data.includes(ipAntigo)) {
      const resultado = data.split(ipAntigo).join(novoValor);

      fs.writeFile(caminhoArquivo, resultado, "utf8", (err) => {
        if (err) {
          console.error("Erro ao salvar arquivo:", caminhoArquivo);
        } else {
          console.log(`✔️ Alterado: ${caminhoArquivo}`);
        }
      });
    }
  });
}

// Executa
buscarArquivos(diretorio);
