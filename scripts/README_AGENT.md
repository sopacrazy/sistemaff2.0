# Agente Unificado (Sync + Print)

Este script substitui o antigo agente de impressão e o script de sincronização. Ele faz tudo:
1. **Monitora** a pasta `C:\Relato` e sobe arquivos para o Supabase.
2. **Recebe** ordens de impressão do site e manda para a impressora local.

## Instalação

1. Instale as dependências na pasta `scripts/` (ou na raiz):
   ```bash
   npm install express cors body-parser chokidar @supabase/supabase-js dotenv
   ```

2. Configure o `.env` (na mesma pasta ou pai):
   ```env
   SUPABASE_URL=...
   SUPABASE_KEY=...
   RELATO_WATCH_DIR=C:/Relato
   # Caminho do executável do SumatraPDF na SUA máquina
   SUMATRA_PATH_LOCAL="C:\\Users\\SeuUsuario\\AppData\\Local\\SumatraPDF\\SumatraPDF.exe"
   ```
   *(Se não definir SUMATRA_PATH_LOCAL, ele tenta C:\Program Files...)*

## Como Rodar

Pare qualquer outro agente que esteja rodando na porta 3005.

```bash
node unifiedAgent.js
```

## Teste

1. O script deve mostrar:
   - `[Watcher] Monitorando pasta...`
   - `[Printer] Servidor ouvindo na porta 3005`
2. Tente imprimir pelo site. O site mandará para `localhost:3005` e este script vai receber e imprimir.
