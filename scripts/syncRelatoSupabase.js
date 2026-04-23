require('dotenv').config({ path: '../.env' }); // Adjust path if running from scripts folder
const chokidar = require('chokidar');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// --- CONFIGURAÇÃO ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY; // Service Role Key recomendada para backend
const WATCH_DIR = process.env.RELATO_WATCH_DIR || 'C:/relato';
const BUCKET_NAME = 'relato';

// Validação
if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ ERRO: SUPABASE_URL e SUPABASE_KEY não definidos no .env");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log(`========================================`);
console.log(`📡 Agente de Sincronização RELATO -> SUPABASE`);
console.log(`📁 Monitorando pasta: ${WATCH_DIR}`);
console.log(`☁️  Bucket destino: ${BUCKET_NAME}`);
console.log(`========================================`);

if (!fs.existsSync(WATCH_DIR)) {
    console.log(`⚠️  Pasta ${WATCH_DIR} não existe. Criando...`);
    fs.mkdirSync(WATCH_DIR, { recursive: true });
}

// Inicializa o Watcher
const watcher = chokidar.watch(WATCH_DIR, {
    persistent: true,
    ignoreInitial: false, // Upload de arquivos já existentes ao iniciar
    awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
    },
    ignored: /(^|[\/\\])\../, // ignora arquivos ocultos
    depth: 0 // não entra em subpastas recursivamente (opcional)
});

watcher
    .on('add', async (filePath) => {
        const fileName = path.basename(filePath);

        // Filtra apenas PDFs (ajuste conforme necessidade)
        if (!fileName.toLowerCase().endsWith('.pdf')) return;

        console.log(`📄 Detectado: ${fileName}`);
        await uploadToSupabase(filePath, fileName);
    })
    .on('change', async (filePath) => {
        const fileName = path.basename(filePath);
        if (!fileName.toLowerCase().endsWith('.pdf')) return;
        console.log(`📝 Modificado: ${fileName}`);
        await uploadToSupabase(filePath, fileName);
    })
    .on('ready', () => console.log('✅ Monitoramento iniciado. Aguardando arquivos...'));

async function uploadToSupabase(filePath, fileName) {
    try {
        const fileBuffer = fs.readFileSync(filePath);

        // Caminho no bucket: arquivos/NOME_DO_ARQUIVO.pdf
        const storagePath = `arquivos/${fileName}`;

        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(storagePath, fileBuffer, {
                upsert: true,
                contentType: 'application/pdf'
            });

        if (error) throw error;
        console.log(`☁️  Upload Sucesso: ${fileName}`);

    } catch (err) {
        console.error(`❌ Erro upload ${fileName}:`, err.message);
    }
}
