require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const chokidar = require('chokidar');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

// --- CONFIGURAÇÃO ---
const PORT = 3007;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const WATCH_DIR = process.env.RELATO_WATCH_DIR || 'C:/Relato';
const BUCKET_NAME = 'relato';

// Caminho do SumatraPDF (Tente ajustar se necessário)
// Tenta pegar do ENV ou usa um padrão comum do Windows
const SUMATRA_PATH = process.env.SUMATRA_PATH_LOCAL || process.env.SUMATRA_PATH || '"C:\\Users\\adria\\AppData\\Local\\SumatraPDF\\SumatraPDF.exe"';

// --- INICIALIZAÇÃO ---
console.log(`========================================`);
console.log(`🚀 AGENTE UNIFICADO (Watcher + Printer)`);
console.log(`========================================`);

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ ERRO: SUPABASE_URL e SUPABASE_KEY não definidos no .env");
}
const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

if (!fs.existsSync(WATCH_DIR)) {
    console.log(`⚠️  Pasta ${WATCH_DIR} não existe. Criando...`);
    fs.mkdirSync(WATCH_DIR, { recursive: true });
}

// ==========================================
// 1. MÓDULO WATCHER (Sincronização)
// ==========================================
if (supabase) {
    console.log(`📡 [Watcher] Monitorando pasta: ${WATCH_DIR}`);
    const watcher = chokidar.watch(WATCH_DIR, {
        persistent: true,
        ignoreInitial: false,
        awaitWriteFinish: { stabilityThreshold: 2000, pollInterval: 100 },
        ignored: /(^|[\/\\])\../
    });

    watcher.on('add', (filePath) => handleFile(filePath));
    watcher.on('change', (filePath) => handleFile(filePath));
    watcher.on('ready', () => console.log('✅ [Watcher] Iniciado.'));

    async function handleFile(filePath) {
        const fileName = path.basename(filePath);
        if (!fileName.toLowerCase().endsWith('.pdf')) return;
        // Ignora arquivos temporários de impressão
        if (fileName.startsWith('TEMP_PRINT_')) return;

        console.log(`📄 [Watcher] Detectado: ${fileName}`);
        try {
            const fileBuffer = fs.readFileSync(filePath);
            const storagePath = `arquivos/${fileName}`;
            const { error } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(storagePath, fileBuffer, { upsert: false, contentType: 'application/pdf' });

            if (error) {
                // Se o erro for de duplicação, apenas ignora
                if (error.message && error.message.includes('already exists') || error.statusCode === '409') {
                    console.log(`⚠️  [Watcher] Arquivo já existe, ignorando: ${fileName}`);
                    return;
                }
                throw error;
            }
            console.log(`☁️  [Watcher] Upload Sucesso: ${fileName}`);
        } catch (err) {
            console.error(`❌ [Watcher] Erro upload ${fileName}:`, err.message);
        }
    }
} else {
    console.log(`⚠️  [Watcher] Desativado (sem credenciais Supabase).`);
}

// ==========================================
// 2. MÓDULO PRINTER (Servidor HTTP)
// ==========================================
const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Rota de Teste (Health Check)
app.get('/', (req, res) => {
    res.send('Agente Unificado Ativo! Use POST /store-and-print');
});

// Rota principal de impressão
app.post('/store-and-print', async (req, res) => {
    try {
        const { capa, printer } = req.body;
        // capa deve vir como { name: '...', base64: '...' }
        // Se vier mergedPdf pelo backend novo, ele estará aqui dentro de 'capa'

        if (!capa || !capa.base64) {
            return res.status(400).json({ ok: false, error: "no_content" });
        }

        console.log(`🖨️  [Printer] Recebida ordem de impressão para: ${printer || 'Padrão'}`);

        // Salva o PDF recebido num arquivo temporário
        const tempFileName = `TEMP_PRINT_${Date.now()}.pdf`;
        const tempFilePath = path.join(os.tmpdir(), tempFileName);

        fs.writeFileSync(tempFilePath, Buffer.from(capa.base64, 'base64'));
        console.log(`💾 [Printer] Arquivo salvo em: ${tempFilePath}`);

        // Garante que o caminho do executável tenha aspas, mas não duplicadas
        const sumatraExe = SUMATRA_PATH.replace(/^"|"$/g, '');
        const sumatraQuoted = `"${sumatraExe}"`;

        // Comando de impressão via SumatraPDF
        let cmd = `${sumatraQuoted} -silent "${tempFilePath}"`;
        if (printer) {
            cmd = `${sumatraQuoted} -print-to "${printer}" -silent "${tempFilePath}"`;
        } else {
            cmd = `${sumatraQuoted} -print-to-default -silent "${tempFilePath}"`;
        }

        console.log(`⚙️  [Printer] Executando: ${cmd}`);

        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ [Printer] Erro na execução: ${error.message}`);
                return res.json({ ok: false, error: "print_failed", details: error.message });
            }
            console.log(`✅ [Printer] Enviado para driver.`);

            // Tenta limpar arquivo temp depois de um tempo
            setTimeout(() => {
                try { fs.unlinkSync(tempFilePath); } catch (e) { }
            }, 10000);

            return res.json({ ok: true });
        });

    } catch (e) {
        console.error("❌ [Printer] Exception:", e);
        res.status(500).json({ ok: false, error: "internal_error" });
    }
});

// Nova rota: Listar impressoras instaladas
app.get('/printers', (req, res) => {
    console.log("🔍 [Printer] Listando impressoras...");
    // Comando PowerShell para pegar apenas os nomes
    const cmd = 'powershell "Get-Printer | Select-Object -ExpandProperty Name"';

    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ [Printer] Erro ao listar: ${error.message}`);
            return res.json({ ok: false, error: "list_failed" });
        }

        // Processa a saída: quebra por linha, remove vazios e espaços
        const printers = stdout.split('\r\n')
            .map(p => p.trim())
            .filter(p => p && p !== "");

        console.log(`✅ [Printer] Encontradas: ${printers.length}`);
        res.json({ ok: true, printers });
    });
});

app.listen(PORT, () => {
    console.log(`🎧 [Printer] Servidor ouvindo na porta ${PORT}`);
});
