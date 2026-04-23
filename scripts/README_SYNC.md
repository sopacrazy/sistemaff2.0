# Sincronizador de Arquivos de Roteirização (Supabase)

Este script monitora a pasta `C:\Relato` e envia automaticamente novos arquivos PDF para a nuvem (Supabase), permitindo que a impressão seja centralizada (todos os arquivos juntos).

## Instalação nos Clientes

1. Certifique-se de ter o Node.js instalado na máquina.
2. Copie a pasta `scripts/` e o arquivo `package.json` (ou instale as dependências manualmente).
3. Instale as dependências:
   ```bash
   npm install chokidar @supabase/supabase-js dotenv
   ```
4. Crie um arquivo `.env` na mesma pasta do script com as chaves:
   ```env
   SUPABASE_URL=seu_url_aqui
   SUPABASE_KEY=sua_chave_aqui
   RELATO_WATCH_DIR=C:/Relato
   ```

## Como Rodar

Manual:
```bash
node syncRelatoSupabase.js
```

Para rodar sempre (pm2 ou serviço):
```bash
npm install -g pm2
pm2 start syncRelatoSupabase.js --name "SyncRelato"
pm2 save
pm2 startup
```

## Como Funciona

1. O script fica "olhando" a pasta `C:/Relato`.
2. Assim que um PDF é salvo lá (pelo sistema legado), ele é enviado para o bucket `relato` no Supabase.
3. Quando o Gestor for imprimir a rota, o sistema busca esses arquivos na nuvem, junta tudo e imprime.
