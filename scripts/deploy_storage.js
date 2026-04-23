
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Erro: Variáveis SUPABASE_URL e SUPABASE_KEY não encontradas no .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupStorage() {
    console.log('--- Configurando Storage Supabase ---');
    
    const bucketName = 'chamado-anexos';

    // 1. Criar Bucket
    console.log(`Tentando criar bucket '${bucketName}'...`);
    const { data: bucket, error } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    });

    if (error) {
        if (error.message.includes('already exists')) {
            console.log(`✅ Bucket '${bucketName}' já existe.`);
        } else {
            console.error(`❌ Erro ao criar bucket: ${error.message}`);
            // Tenta continuar para verificar políticas manuais se necessário
        }
    } else {
        console.log(`✅ Bucket '${bucketName}' criado com sucesso!`);
    }

    // 2. Verificar ou Criar Políticas (Policies)
    // Nota: A criação de policies via client JS é limitada.
    // Geralmente requer execução de SQL no dashboard.
    console.log('\n--- ATENÇÃO: POLÍTICAS DE ACESSO ---');
    console.log('Se o upload falhar, execute o seguinte comando SQL no Editor SQL do Supabase:');
    console.log(`
-- Habilitar RLS se necessário (Storage já tem por padrão)
-- Criar política de acesso público para o bucket '${bucketName}'

-- 1. Permitir acesso público de leitura (SELECT)
CREATE POLICY "Public Access Select" ON storage.objects FOR SELECT USING ( bucket_id = '${bucketName}' );

-- 2. Permitir upload para usuários autenticados (INSERT)
-- Se quiser público (anon), use: TO public
CREATE POLICY "Public Access Insert" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = '${bucketName}' );

-- 3. Permitir atualização/deleção (UPDATE/DELETE)
CREATE POLICY "Public Access Update" ON storage.objects FOR UPDATE USING ( bucket_id = '${bucketName}' );
CREATE POLICY "Public Access Delete" ON storage.objects FOR DELETE USING ( bucket_id = '${bucketName}' );
    `);

    console.log('\nVerifique se o bucket está configurado como PUBLICO no dashboard.');
}

setupStorage();
