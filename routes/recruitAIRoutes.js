// routes/recruitAIRoutes.js
// Sistema de análise de currículos com IA
//
// OTIMIZAÇÕES DE CUSTO:
// - Limita texto do PDF a 2000 caracteres antes de enviar para IA
// - Usa modelo gpt-4o-mini por padrão (mais barato que gpt-4)
// - Limita max_tokens a 300 na resposta
// - Processa no máximo 50 PDFs por requisição (configurável via MAX_PDFS_PER_REQUEST)
//
const express = require("express");
const router = express.Router();
const fs = require("fs").promises;
const path = require("path");
// pdf-parse - usando versão 1.1.1 que tem API mais simples (função direta)
const pdfParse = require("pdf-parse");

// Configuração da pasta de candidatos
// Tenta primeiro C:\candidatos, depois uploads/candidatos na raiz do projeto
const CANDIDATOS_FOLDER =
  process.env.CANDIDATOS_FOLDER ||
  (process.platform === "win32"
    ? "C:\\candidatos"
    : path.join(__dirname, "../uploads/candidatos"));

// Configuração do cache
const DATA_FOLDER = path.join(__dirname, "../data");
const CACHE_FILE_RANKING = path.join(
  DATA_FOLDER,
  "processed_candidates_ranking.json"
);
const CACHE_FILE_TALENTOS = path.join(
  DATA_FOLDER,
  "processed_candidates_talentos.json"
);

// Função auxiliar para garantir que a pasta data existe
async function ensureDataFolder() {
  try {
    await fs.access(DATA_FOLDER);
  } catch {
    await fs.mkdir(DATA_FOLDER, { recursive: true });
  }
}

// Função para carregar o cache de ranking
async function loadRankingCache() {
  try {
    await ensureDataFolder();
    const data = await fs.readFile(CACHE_FILE_RANKING, "utf-8");
    const cache = JSON.parse(data);
    console.log(`📦 Cache de ranking carregado: ${cache.length} candidatos`);
    return cache;
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log("📦 Cache de ranking não encontrado. Criando novo cache.");
      return [];
    }
    console.error("❌ Erro ao carregar cache de ranking:", error);
    return [];
  }
}

// Função para salvar o cache de ranking
async function saveRankingCache(cache) {
  try {
    await ensureDataFolder();
    // Usa writeFileSync temporariamente para evitar problemas com nodemon
    // ou escreve de forma assíncrona sem causar restart
    await fs.writeFile(
      CACHE_FILE_RANKING,
      JSON.stringify(cache, null, 2),
      "utf-8"
    );
    // Log apenas se realmente salvou algo novo (evita spam)
    if (cache.length > 0) {
      console.log(`💾 Cache de ranking salvo: ${cache.length} candidatos`);
    }
  } catch (error) {
    console.error("❌ Erro ao salvar cache de ranking:", error);
  }
}

// Função para carregar o cache de banco de talentos
async function loadTalentosCache() {
  try {
    await ensureDataFolder();
    const data = await fs.readFile(CACHE_FILE_TALENTOS, "utf-8");
    const cache = JSON.parse(data);
    console.log(`📦 Cache de talentos carregado: ${cache.length} candidatos`);
    return cache;
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log("📦 Cache de talentos não encontrado. Criando novo cache.");
      return [];
    }
    console.error("❌ Erro ao carregar cache de talentos:", error);
    return [];
  }
}

// Função para salvar o cache de banco de talentos
async function saveTalentosCache(cache) {
  try {
    await ensureDataFolder();
    await fs.writeFile(
      CACHE_FILE_TALENTOS,
      JSON.stringify(cache, null, 2),
      "utf-8"
    );
    // Log apenas se realmente salvou algo novo (evita spam)
    if (cache.length > 0) {
      console.log(`💾 Cache de talentos salvo: ${cache.length} candidatos`);
    }
  } catch (error) {
    console.error("❌ Erro ao salvar cache de talentos:", error);
  }
}

// Função para extrair informações estruturadas do texto do PDF
function extractCandidateInfo(texto) {
  const info = {
    nome: "",
    email: "",
    telefone: "",
    endereco: "",
    experiencia: "",
    formacao: "",
    cursos: [],
    habilidades: [],
    resumo: "",
  };

  // Extrai nome - procura por padrões comuns de currículo
  // Geralmente vem após "Dados Pessoais", "Nome:", ou é a primeira linha em MAIÚSCULAS
  const linhas = texto
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Procura por "Dados Pessoais" ou "Nome:" e pega a próxima linha
  let nomeEncontrado = false;
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    const linhaLower = linha.toLowerCase();

    // Se encontrar "Dados Pessoais" ou "Nome:", a próxima linha geralmente é o nome
    if (
      (linhaLower.includes("dados pessoais") || linhaLower.includes("nome:")) &&
      i + 1 < linhas.length
    ) {
      const proximaLinha = linhas[i + 1];
      // Verifica se parece um nome (não é email, telefone, endereço)
      if (
        proximaLinha &&
        !proximaLinha.includes("@") &&
        !proximaLinha.match(/\(\d{2}\)/) &&
        proximaLinha.length >= 3 &&
        proximaLinha.length <= 80
      ) {
        info.nome = proximaLinha;
        nomeEncontrado = true;
        break;
      }
    }

    // Se a linha está toda em MAIÚSCULAS e parece um nome (sem números, sem @, sem telefone)
    if (
      !nomeEncontrado &&
      linha === linha.toUpperCase() &&
      linha.length >= 3 &&
      linha.length <= 80 &&
      !linha.match(/^\d/) &&
      !linha.includes("@") &&
      !linha.match(/\(\d{2}\)/) &&
      !linha.toLowerCase().includes("rua") &&
      !linha.toLowerCase().includes("avenida") &&
      !linha.toLowerCase().includes("endereço") &&
      !linha.toLowerCase().includes("telefone")
    ) {
      // Verifica se tem pelo menos uma palavra com mais de 2 letras
      const palavras = linha.split(/\s+/).filter((p) => p.length > 2);
      if (palavras.length >= 2) {
        info.nome = linha;
        nomeEncontrado = true;
        break;
      }
    }
  }

  // Se não encontrou, tenta a primeira linha que parece um nome
  if (!nomeEncontrado && linhas.length > 0) {
    for (const linha of linhas.slice(0, 10)) {
      // Ignora linhas que são claramente endereços, emails, telefones
      if (
        linha.length >= 3 &&
        linha.length <= 80 &&
        !linha.includes("@") &&
        !linha.match(/\(\d{2}\)/) &&
        !linha.toLowerCase().includes("rua") &&
        !linha.toLowerCase().includes("avenida") &&
        !linha.toLowerCase().includes("endereço") &&
        !linha.toLowerCase().includes("telefone") &&
        !linha.toLowerCase().includes("objetivo") &&
        !linha.toLowerCase().includes("experiência")
      ) {
        // Verifica se tem pelo menos 2 palavras
        const palavras = linha.split(/\s+/).filter((p) => p.length > 1);
        if (palavras.length >= 2) {
          info.nome = linha;
          break;
        }
      }
    }
  }

  // Extrai email
  const emailRegex = /[\w\.-]+@[\w\.-]+\.\w+/gi;
  const emailMatch = texto.match(emailRegex);
  if (emailMatch && emailMatch.length > 0) {
    info.email = emailMatch[0];
  }

  // Extrai telefone (formato brasileiro)
  const telefoneRegex = /(\(?\d{2}\)?\s?)?(\d{4,5}[-.\s]?\d{4})/g;
  const telefoneMatch = texto.match(telefoneRegex);
  if (telefoneMatch && telefoneMatch.length > 0) {
    info.telefone = telefoneMatch[0].trim();
  }

  // Extrai experiência (procura por palavras-chave)
  const expRegex =
    /(experi[êe]ncia|trabalho|emprego|atua[çc][ãa]o).*?(\d+)\s*(ano|anos|meses?|m[êe]s)/gi;
  const expMatch = texto.match(expRegex);
  if (expMatch && expMatch.length > 0) {
    info.experiencia = expMatch[0];
  }

  // Extrai formação (procura por palavras-chave educacionais)
  const formacaoRegex =
    /(gradua[çc][ãa]o|ensino|superior|t[ée]cnico|faculdade|universidade|formado|formada|bacharel|licenciatura).*?([^\n]{10,200})/gi;
  const formacaoMatch = texto.match(formacaoRegex);
  if (formacaoMatch && formacaoMatch.length > 0) {
    info.formacao = formacaoMatch.slice(0, 3).join("; ");
  }

  // Extrai cursos adicionais (procura por seção de cursos)
  info.cursos = [];
  const linhasCursos = texto.split("\n");
  let emSecaoCursos = false;
  for (let i = 0; i < linhasCursos.length; i++) {
    const linha = linhasCursos[i].trim();
    const linhaLower = linha.toLowerCase();

    // Detecta início da seção de cursos
    if (
      linhaLower.includes("curso") &&
      (linhaLower.includes("adicional") ||
        linhaLower.includes("complementar") ||
        linhaLower.includes(":"))
    ) {
      emSecaoCursos = true;
      continue;
    }

    // Para quando encontrar próxima seção
    if (
      emSecaoCursos &&
      (linhaLower.includes("experiência") ||
        linhaLower.includes("formação") ||
        linhaLower.includes("habilidades") ||
        linhaLower.includes("idiomas") ||
        linhaLower.includes("objetivo") ||
        linhaLower.includes("dados pessoais"))
    ) {
      break;
    }

    // Se está na seção de cursos e a linha parece um curso
    if (emSecaoCursos && linha.length > 5) {
      // Verifica se tem ano (4 dígitos) ou nome de curso/instituição
      if (linha.match(/\d{4}/) || linha.match(/[a-záàâãéêíóôõúç]{3,}/i)) {
        // Limpa a linha (remove caracteres estranhos no início)
        const cursoLimpo = linha.replace(/^[-•\d\s]+/, "").trim();
        if (cursoLimpo.length > 5 && !info.cursos.includes(cursoLimpo)) {
          info.cursos.push(cursoLimpo);
        }
      }
    }
  }

  // Extrai endereço (procura por padrões de endereço)
  const enderecoRegex =
    /(rua|avenida|av\.|estrada|rodovia|bairro|cep|residencial|apartamento|ap\.|casa).*?([^\n]{10,150})/gi;
  const enderecoMatch = texto.match(enderecoRegex);
  if (enderecoMatch && enderecoMatch.length > 0) {
    // Pega o primeiro match que não seja muito longo
    const endereco = enderecoMatch[0].trim();
    if (endereco.length <= 150) {
      info.endereco = endereco;
    }
  }

  // Extrai habilidades (palavras-chave comuns)
  const habilidadesKeywords = [
    "javascript",
    "python",
    "java",
    "react",
    "node",
    "sql",
    "excel",
    "vendas",
    "atendimento",
    "comunicação",
    "liderança",
    "gestão",
    "marketing",
    "inglês",
    "espanhol",
  ];
  habilidadesKeywords.forEach((keyword) => {
    if (texto.toLowerCase().includes(keyword)) {
      info.habilidades.push(keyword.charAt(0).toUpperCase() + keyword.slice(1));
    }
  });

  // Extrai resumo/objetivo (primeiro parágrafo significativo)
  const paragrafos = texto.split(/\n\s*\n/).filter((p) => p.trim().length > 50);
  if (paragrafos.length > 0) {
    info.resumo = paragrafos[0].substring(0, 300);
  }

  return info;
}

// Função para estruturar dados do candidato com IA
async function structureCandidateWithAI(curriculoTexto) {
  try {
    const axios = require("axios");

    // Limita o texto do currículo a 2000 caracteres para economizar tokens
    const curriculoLimitado = curriculoTexto.substring(0, 2000);

    const prompt = `Você é um especialista em recrutamento. Analise o seguinte currículo e extraia as informações estruturadas.

CURRÍCULO (primeiros 2000 caracteres):
${curriculoLimitado}

Retorne APENAS um JSON válido com a seguinte estrutura (sem markdown, sem texto adicional):
{
  "nome": "Nome completo do candidato",
  "cargo_atual": "Cargo atual ou último cargo (ex: 'Vendedor', 'Analista de Sistemas')",
  "email": "Email do candidato",
  "anos_experiencia": 5,
  "resumo": "Resumo curto de até 150 caracteres sobre o perfil profissional",
  "skills": ["Habilidade 1", "Habilidade 2", "Habilidade 3"]
}

IMPORTANTE:
- nome: String com nome completo
- cargo_atual: String com o cargo atual ou último cargo ocupado
- email: String com email válido (ou string vazia se não encontrar)
- anos_experiencia: Número inteiro (0 se não conseguir determinar)
- resumo: String de até 150 caracteres
- skills: Array de strings com as principais habilidades/competências`;

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: model,
        messages: [
          {
            role: "system",
            content:
              "Você é um especialista em recrutamento. Sempre retorne apenas JSON válido, sem markdown.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 200, // Limita tokens para economizar
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const content = response.data.choices[0].message.content.trim();

    // Remove markdown code blocks se existirem
    const jsonContent = content
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const resultado = JSON.parse(jsonContent);

    return {
      nome: resultado.nome || "Candidato",
      cargo_atual: resultado.cargo_atual || "Não informado",
      email: resultado.email || "",
      anos_experiencia: parseInt(resultado.anos_experiencia) || 0,
      resumo: (resultado.resumo || "").substring(0, 150),
      skills: Array.isArray(resultado.skills) ? resultado.skills : [],
    };
  } catch (error) {
    console.error("Erro ao estruturar candidato com IA:", error);
    // Fallback: usa extração básica
    const info = extractCandidateInfo(curriculoTexto);
    return {
      nome: info.nome || "Candidato",
      cargo_atual: "Não informado",
      email: info.email || "",
      anos_experiencia:
        parseInt(info.experiencia?.match(/\d+/)?.[0] || "0") || 0,
      resumo: (info.resumo || "").substring(0, 150),
      skills: info.habilidades || [],
    };
  }
}

// Função para extrair texto e informações de um PDF
async function extractTextFromPDF(filePath) {
  try {
    const dataBuffer = await fs.readFile(filePath);

    // pdf-parse v1.1.1 exporta uma função diretamente
    const data = await pdfParse(dataBuffer);

    const texto = data.text || "";

    // Extrai informações estruturadas do texto
    const info = extractCandidateInfo(texto);

    return {
      texto: texto,
      informacoes: info,
    };
  } catch (error) {
    console.error(`Erro ao extrair texto do PDF ${filePath}:`, error);
    // Retorna objeto vazio em vez de null
    return {
      texto: "",
      informacoes: {},
    };
  }
}

// Função para analisar candidato com IA
async function analyzeCandidateWithAI(curriculoTexto, descricaoVaga) {
  try {
    // Tenta usar OpenAI se disponível
    if (process.env.OPENAI_API_KEY) {
      return await analyzeWithOpenAI(curriculoTexto, descricaoVaga);
    }

    // Fallback: análise simples baseada em palavras-chave
    return analyzeCandidateBasic(curriculoTexto, descricaoVaga);
  } catch (error) {
    console.error("Erro ao analisar candidato:", error);
    return {
      nome_candidato: "Candidato",
      match_score: 0,
      justificativa: "Erro ao processar análise.",
      pontos_fortes: [],
      pontos_atencao: ["Erro ao processar análise do candidato"],
    };
  }
}

// Função de análise básica (fallback)
function analyzeCandidateBasic(curriculoTexto, descricaoVaga) {
  try {
    const descricaoLower = descricaoVaga.toLowerCase();
    const curriculoLower = curriculoTexto.toLowerCase();

    // Extrai palavras-chave da descrição
    const palavrasChave = descricaoLower
      .split(/\s+/)
      .filter((p) => p.length > 4)
      .slice(0, 10);

    // Conta quantas palavras-chave aparecem no currículo
    let matches = 0;
    palavrasChave.forEach((palavra) => {
      if (curriculoLower.includes(palavra)) {
        matches++;
      }
    });

    // Calcula score baseado em matches e tamanho do currículo
    const matchScore = Math.min(
      100,
      Math.round(
        (matches / palavrasChave.length) * 100 +
          (curriculoTexto.length > 1000 ? 20 : 0)
      )
    );

    // Tenta extrair nome do currículo (primeira linha ou padrão comum)
    let nomeCandidato = "Candidato";
    const linhas = curriculoTexto.split("\n").slice(0, 5);
    for (const linha of linhas) {
      const linhaLimpa = linha.trim();
      if (
        linhaLimpa.length > 5 &&
        linhaLimpa.length < 50 &&
        !linhaLimpa.match(/^\d/)
      ) {
        nomeCandidato = linhaLimpa;
        break;
      }
    }

    // Gera justificativa baseada no score
    let justificativa = "";
    if (matchScore >= 90) {
      justificativa = `Excelente match! O candidato possui ${matches} das ${palavrasChave.length} competências-chave procuradas. Perfil altamente alinhado com a vaga.`;
    } else if (matchScore >= 70) {
      justificativa = `Bom match. O candidato possui ${matches} das ${palavrasChave.length} competências-chave. Pode ser considerado com algumas ressalvas.`;
    } else if (matchScore >= 50) {
      justificativa = `Match moderado. O candidato possui ${matches} das ${palavrasChave.length} competências-chave. Necessita avaliação mais detalhada.`;
    } else {
      justificativa = `Match baixo. O candidato possui apenas ${matches} das ${palavrasChave.length} competências-chave. Perfil não muito alinhado com a vaga.`;
    }

    return {
      nome_candidato: nomeCandidato,
      match_score: matchScore,
      justificativa: justificativa,
      pontos_fortes: pontosFortes,
      pontos_atencao: pontosAtencao,
    };
  } catch (error) {
    console.error("Erro ao analisar candidato com IA:", error);
    return {
      nome_candidato: "Candidato",
      match_score: 0,
      justificativa: "Erro ao processar análise.",
    };
  }
}

// Função para analisar com OpenAI (quando disponível)
// IMPORTANTE: Limita o texto a 2000 caracteres para reduzir custos de tokens
async function analyzeWithOpenAI(curriculoTexto, descricaoVaga) {
  try {
    const axios = require("axios");

    // Limita o texto do currículo a 2000 caracteres para economizar tokens
    const curriculoLimitado = curriculoTexto.substring(0, 2000);
    const descricaoLimitada = descricaoVaga.substring(0, 1000); // Limita descrição também

    const prompt = `Você é um especialista em recrutamento. Analise o seguinte currículo e compare com a descrição da vaga.

DESCRIÇÃO DA VAGA:
${descricaoLimitada}

CURRÍCULO (primeiros 2000 caracteres):
${curriculoLimitado}

Retorne APENAS um JSON válido com a seguinte estrutura (sem markdown, sem texto adicional):
{
  "nome_candidato": "Nome completo do candidato extraído do currículo",
  "match_score": 85,
  "justificativa": "Resumo de 2-3 frases explicando o match geral",
  "pontos_fortes": ["Ponto forte 1", "Ponto forte 2", "Ponto forte 3"],
  "pontos_atencao": ["Ponto de atenção 1", "Ponto de atenção 2"]
}

O match_score deve ser um número de 0 a 100.
pontos_fortes: Array com 2-4 pontos fortes do candidato em relação à vaga.
pontos_atencao: Array com 2-4 pontos de atenção/riscos específicos sobre o candidato para esta vaga.`;

    // Usa modelo mais barato por padrão (gpt-4o-mini ou gpt-3.5-turbo)
    // gpt-4o-mini é mais barato e suficiente para análise de texto simples
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: model,
        messages: [
          {
            role: "system",
            content:
              "Você é um especialista em recrutamento. Sempre retorne apenas JSON válido, sem markdown.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 300, // Reduzido de 500 para 300 para economizar tokens
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const content = response.data.choices[0].message.content.trim();

    // Remove markdown code blocks se existirem
    const jsonContent = content
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const resultado = JSON.parse(jsonContent);

    return {
      nome_candidato: resultado.nome_candidato || "Candidato",
      match_score: Math.max(0, Math.min(100, resultado.match_score || 0)),
      justificativa: resultado.justificativa || "Análise realizada pela IA.",
      pontos_fortes: Array.isArray(resultado.pontos_fortes)
        ? resultado.pontos_fortes
        : [],
      pontos_atencao: Array.isArray(resultado.pontos_atencao)
        ? resultado.pontos_atencao
        : [],
    };
  } catch (error) {
    console.error("Erro ao analisar com OpenAI:", error);
    // Fallback para análise simples (chama a função de análise básica)
    return analyzeCandidateBasic(curriculoTexto, descricaoVaga);
  }
}

// Rota POST /api/rank-candidates
// IMPORTANTE: Processa PDFs em lotes para evitar custos excessivos com IA
router.post("/rank-candidates", async (req, res) => {
  console.log(
    "⚠️ [Rota Genérica] POST /api/rh/rank-candidates chamada via router - Esta rota NÃO deveria ser chamada se a rota específica estiver funcionando"
  );
  try {
    const { descricao_vaga } = req.body;

    if (!descricao_vaga || !descricao_vaga.trim()) {
      return res.status(400).json({
        error: "A descrição da vaga é obrigatória.",
      });
    }

    // Limite de processamento por requisição (evita custos excessivos)
    const MAX_PDFS_PER_REQUEST = parseInt(
      process.env.MAX_PDFS_PER_REQUEST || "50"
    );

    // Verifica se a pasta existe
    let candidatosFolder = CANDIDATOS_FOLDER;
    try {
      await fs.access(candidatosFolder);
    } catch {
      // Se C:\candidatos não existir, tenta uploads/candidatos
      candidatosFolder = path.join(__dirname, "../uploads/candidatos");
      try {
        await fs.access(candidatosFolder);
      } catch {
        // Cria a pasta se não existir
        await fs.mkdir(candidatosFolder, { recursive: true });
        return res.status(404).json({
          error: `Pasta de candidatos não encontrada. Criada pasta em: ${candidatosFolder}. Por favor, adicione arquivos PDF nesta pasta e tente novamente.`,
        });
      }
    }

    // Passo 1: Lista todos os arquivos PDF da pasta
    const files = await fs.readdir(candidatosFolder);
    const pdfFiles = files.filter(
      (file) => path.extname(file).toLowerCase() === ".pdf"
    );

    if (pdfFiles.length === 0) {
      return res.status(404).json({
        error: `Nenhum arquivo PDF encontrado na pasta: ${candidatosFolder}. Por favor, adicione arquivos PDF nesta pasta.`,
      });
    }

    // Passo 2: Carrega o cache
    const cache = await loadRankingCache();

    // Cria um mapa do cache usando o nome do arquivo como chave
    const cacheMap = new Map();
    cache.forEach((item) => {
      if (item.arquivo) {
        cacheMap.set(item.arquivo, item);
      }
    });

    // Passo 3: Identifica arquivos novos (não estão no cache)
    const novosArquivos = pdfFiles.filter((file) => !cacheMap.has(file));
    const arquivosEmCache = pdfFiles.filter((file) => cacheMap.has(file));

    console.log(
      `📄 Encontrados ${pdfFiles.length} arquivos PDF em ${candidatosFolder}`
    );
    console.log(
      `📦 ${arquivosEmCache.length} arquivos em cache, ${novosArquivos.length} arquivos novos`
    );

    // Passo 4: Processa apenas os arquivos novos (limitado)
    const novosParaProcessar = novosArquivos.slice(0, MAX_PDFS_PER_REQUEST);
    const novosResultados = [];

    if (novosParaProcessar.length > 0) {
      console.log(
        `📊 Processando ${novosParaProcessar.length} arquivos novos (limite: ${MAX_PDFS_PER_REQUEST})`
      );

      for (const pdfFile of novosParaProcessar) {
        const filePath = path.join(candidatosFolder, pdfFile);
        console.log(
          `🔍 Processando: ${pdfFile} (${novosResultados.length + 1}/${
            novosParaProcessar.length
          })`
        );

        try {
          // Extrai texto e informações do PDF
          const dadosPDF = await extractTextFromPDF(filePath);
          if (
            !dadosPDF ||
            !dadosPDF.texto ||
            dadosPDF.texto.trim().length === 0
          ) {
            console.warn(`⚠️  PDF vazio ou inválido: ${pdfFile}`);
            continue;
          }

          // Limita o texto a 2000 caracteres para reduzir custos de tokens na IA
          const texto = dadosPDF.texto.substring(0, 2000);
          if (dadosPDF.texto.length > 2000) {
            console.log(
              `   ℹ️  Texto limitado a 2000 caracteres (original: ${dadosPDF.texto.length} caracteres)`
            );
          }

          // Limita a descrição da vaga também
          const descricaoLimitada = descricao_vaga.substring(0, 1000);

          // Analisa com IA
          const analise = await analyzeCandidateWithAI(
            texto,
            descricaoLimitada
          );

          // Usa o nome extraído do PDF se disponível, senão usa o da IA
          const nomeFinal =
            dadosPDF.informacoes?.nome || analise.nome_candidato || "Candidato";

          novosResultados.push({
            arquivo: pdfFile,
            nome_candidato: nomeFinal,
            match_score: analise.match_score,
            justificativa: analise.justificativa,
            pontos_fortes: analise.pontos_fortes || [],
            pontos_atencao: analise.pontos_atencao || [],
            informacoes_completas: dadosPDF.informacoes,
            texto_completo: dadosPDF.texto.substring(0, 5000),
          });
        } catch (error) {
          console.error(`❌ Erro ao processar ${pdfFile}:`, error.message);
          continue;
        }
      }

      console.log(
        `✅ Processamento concluído: ${novosResultados.length} novos candidatos processados`
      );
    } else {
      console.log(
        `✅ Nenhum arquivo novo para processar. Usando apenas cache.`
      );
    }

    // Passo 5: Atualiza o cache com os novos resultados
    // Remove do cache arquivos que não existem mais na pasta
    const cacheAtualizado = cache.filter((item) =>
      pdfFiles.includes(item.arquivo)
    );

    // Adiciona os novos resultados ao cache
    cacheAtualizado.push(...novosResultados);

    // Salva o cache apenas se houver mudanças (novos resultados ou arquivos removidos)
    const houveMudancas =
      novosResultados.length > 0 || cacheAtualizado.length !== cache.length;
    if (houveMudancas) {
      await saveRankingCache(cacheAtualizado);
    } else {
      console.log(`💾 Cache não precisa ser atualizado (sem mudanças)`);
    }

    // Passo 6: Combina cache e novos resultados, mas filtra apenas arquivos que existem na pasta
    const resultadosCompletos = cacheAtualizado.filter((item) =>
      pdfFiles.includes(item.arquivo)
    );

    // Ordena por match_score (maior primeiro)
    resultadosCompletos.sort((a, b) => b.match_score - a.match_score);

    console.log(
      `📊 Total de candidatos retornados: ${resultadosCompletos.length} (${arquivosEmCache.length} do cache + ${novosResultados.length} novos)`
    );

    // Aviso se houver mais PDFs novos não processados
    const aviso =
      novosArquivos.length > MAX_PDFS_PER_REQUEST
        ? ` (${
            novosArquivos.length - MAX_PDFS_PER_REQUEST
          } PDFs novos restantes não processados - limite de ${MAX_PDFS_PER_REQUEST} por requisição)`
        : "";

    res.json({
      success: true,
      total_candidatos: resultadosCompletos.length,
      total_pdfs_encontrados: pdfFiles.length,
      candidatos: resultadosCompletos,
      cache_info: {
        do_cache: arquivosEmCache.length,
        novos_processados: novosResultados.length,
        novos_pendentes: Math.max(
          0,
          novosArquivos.length - novosParaProcessar.length
        ),
      },
      aviso: aviso || undefined,
    });
  } catch (error) {
    console.error("❌ Erro ao processar candidatos:", error);
    res.status(500).json({
      error: "Erro interno ao processar candidatos.",
      details: error.message,
    });
  }
});

// Rota GET para servir PDFs dos candidatos
router.get("/candidato-pdf/:filename", async (req, res) => {
  try {
    const { filename } = req.params;

    // Sanitiza o nome do arquivo para evitar path traversal
    const safeFilename = path.basename(filename);

    // Verifica se a pasta existe
    let candidatosFolder = CANDIDATOS_FOLDER;
    try {
      await fs.access(candidatosFolder);
    } catch {
      candidatosFolder = path.join(__dirname, "../uploads/candidatos");
      try {
        await fs.access(candidatosFolder);
      } catch {
        return res
          .status(404)
          .json({ error: "Pasta de candidatos não encontrada." });
      }
    }

    const filePath = path.join(candidatosFolder, safeFilename);

    // Verifica se o arquivo existe
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: "Arquivo PDF não encontrado." });
    }

    // Verifica se é um arquivo PDF
    if (path.extname(safeFilename).toLowerCase() !== ".pdf") {
      return res
        .status(400)
        .json({ error: "Arquivo inválido. Apenas PDFs são permitidos." });
    }

    // Envia o arquivo PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${safeFilename}"`);
    const fileBuffer = await fs.readFile(filePath);
    res.send(fileBuffer);
  } catch (error) {
    console.error("Erro ao servir PDF:", error);
    res.status(500).json({ error: "Erro ao servir arquivo PDF." });
  }
});

// Rota GET /api/rh/candidates - Lista todos os candidatos do banco de talentos
router.get("/candidates", async (req, res) => {
  try {
    // Verifica se a pasta existe
    let candidatosFolder = CANDIDATOS_FOLDER;
    try {
      await fs.access(candidatosFolder);
    } catch {
      candidatosFolder = path.join(__dirname, "../uploads/candidatos");
      try {
        await fs.access(candidatosFolder);
      } catch {
        await fs.mkdir(candidatosFolder, { recursive: true });
        return res.json({
          success: true,
          candidatos: [],
          total: 0,
          message: `Pasta de candidatos não encontrada. Criada pasta em: ${candidatosFolder}. Por favor, adicione arquivos PDF nesta pasta.`,
        });
      }
    }

    // Passo 1: Lista todos os arquivos PDF da pasta
    const files = await fs.readdir(candidatosFolder);
    const pdfFiles = files.filter(
      (file) => path.extname(file).toLowerCase() === ".pdf"
    );

    if (pdfFiles.length === 0) {
      return res.json({
        success: true,
        candidatos: [],
        total: 0,
        message: `Nenhum arquivo PDF encontrado na pasta: ${candidatosFolder}`,
      });
    }

    // Passo 2: Carrega o cache
    const cache = await loadTalentosCache();

    // Cria um mapa do cache usando o nome do arquivo como chave
    const cacheMap = new Map();
    cache.forEach((item) => {
      if (item.arquivo) {
        cacheMap.set(item.arquivo, item);
      }
    });

    // Passo 3: Identifica arquivos novos (não estão no cache)
    const novosArquivos = pdfFiles.filter((file) => !cacheMap.has(file));
    const arquivosEmCache = pdfFiles.filter((file) => cacheMap.has(file));

    console.log(
      `📄 Encontrados ${pdfFiles.length} arquivos PDF em ${candidatosFolder}`
    );
    console.log(
      `📦 ${arquivosEmCache.length} arquivos em cache, ${novosArquivos.length} arquivos novos`
    );

    // Passo 4: Processa apenas os arquivos novos
    const novosResultados = [];

    if (novosArquivos.length > 0) {
      console.log(`📊 Processando ${novosArquivos.length} arquivos novos`);

      for (let i = 0; i < novosArquivos.length; i++) {
        const pdfFile = novosArquivos[i];
        const filePath = path.join(candidatosFolder, pdfFile);

        try {
          console.log(
            `🔍 Processando: ${pdfFile} (${i + 1}/${novosArquivos.length})`
          );

          // Extrai texto do PDF
          const dadosPDF = await extractTextFromPDF(filePath);
          if (
            !dadosPDF ||
            !dadosPDF.texto ||
            dadosPDF.texto.trim().length === 0
          ) {
            console.warn(`⚠️  PDF vazio ou inválido: ${pdfFile}`);
            continue;
          }

          // Estrutura dados com IA
          const dadosEstruturados = await structureCandidateWithAI(
            dadosPDF.texto
          );

          novosResultados.push({
            id: pdfFile, // Usar nome do arquivo como ID
            arquivo: pdfFile,
            ...dadosEstruturados,
            texto_completo: dadosPDF.texto.substring(0, 5000), // Para o modal de detalhes
          });
        } catch (error) {
          console.error(`❌ Erro ao processar ${pdfFile}:`, error.message);
          continue;
        }
      }

      console.log(
        `✅ Processamento concluído: ${novosResultados.length} novos candidatos estruturados`
      );
    } else {
      console.log(
        `✅ Nenhum arquivo novo para processar. Usando apenas cache.`
      );
    }

    // Passo 5: Atualiza o cache com os novos resultados
    // Remove do cache arquivos que não existem mais na pasta
    const cacheAtualizado = cache.filter((item) =>
      pdfFiles.includes(item.arquivo)
    );

    // Adiciona os novos resultados ao cache
    cacheAtualizado.push(...novosResultados);

    // Salva o cache apenas se houver mudanças (novos resultados ou arquivos removidos)
    const houveMudancas =
      novosResultados.length > 0 || cacheAtualizado.length !== cache.length;
    if (houveMudancas) {
      await saveTalentosCache(cacheAtualizado);
    } else {
      console.log(`💾 Cache não precisa ser atualizado (sem mudanças)`);
    }

    // Passo 6: Combina cache e novos resultados, mas filtra apenas arquivos que existem na pasta
    const candidatosCompletos = cacheAtualizado.filter((item) =>
      pdfFiles.includes(item.arquivo)
    );

    console.log(
      `📊 Total de candidatos retornados: ${candidatosCompletos.length} (${arquivosEmCache.length} do cache + ${novosResultados.length} novos)`
    );

    res.json({
      success: true,
      candidatos: candidatosCompletos,
      total: candidatosCompletos.length,
      cache_info: {
        do_cache: arquivosEmCache.length,
        novos_processados: novosResultados.length,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao processar candidatos:", error);
    res.status(500).json({
      success: false,
      error: "Erro interno ao processar candidatos.",
      details: error.message,
    });
  }
});

// Exporta funções para uso em outras rotas
module.exports = router;
module.exports.extractTextFromPDF = extractTextFromPDF;
module.exports.structureCandidateWithAI = structureCandidateWithAI;
module.exports.analyzeCandidateWithAI = analyzeCandidateWithAI;
module.exports.loadRankingCache = loadRankingCache;
module.exports.saveRankingCache = saveRankingCache;
module.exports.loadTalentosCache = loadTalentosCache;
module.exports.saveTalentosCache = saveTalentosCache;
