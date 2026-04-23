# Guia: Corrigir Erro de CORS ao Acessar pela Rede

## Problema
Ao acessar o sistema pela rede (ex: `192.168.11.23:3000`), aparecem erros de CORS porque o frontend tenta fazer requisições para `localhost:3001` em vez do IP da rede.

## Solução Implementada

### 1. Detecção Automática de IP
Foi criado um sistema que detecta automaticamente o IP da rede e usa o mesmo para fazer requisições ao backend.

**Arquivo criado:** `src/utils/apiConfig.js`

Este arquivo detecta:
- Se você está em `localhost` → usa `http://localhost:3001`
- Se você está na rede (ex: `192.168.11.23`) → usa `http://192.168.11.23:3001`

### 2. Configurar Firewall do Windows

**IMPORTANTE:** Execute o script do firewall como **Administrador**:

1. Abra o PowerShell como **Administrador**:
   - Clique com botão direito no PowerShell
   - Selecione "Executar como Administrador"

2. Navegue até a pasta do projeto:
   ```powershell
   cd "C:\Sistema\sistemaff 2.0 dev"
   ```

3. Execute o script:
   ```powershell
   PowerShell -ExecutionPolicy Bypass -File configurar-firewall.ps1
   ```

4. O script criará regras no firewall para permitir acesso nas portas 3000 e 3001.

### 3. Reiniciar o Sistema

Após configurar o firewall, reinicie o sistema:
- Backend e Frontend devem estar rodando
- Acesse pela rede: `http://192.168.11.23:3000`

## Verificação

Após seguir os passos acima:

1. Acesse o sistema pela rede: `http://192.168.11.23:3000`
2. Abra o Console do navegador (F12)
3. Verifique se não há mais erros de CORS
4. Você deve ver no console: `[API Config] API URL: http://192.168.11.23:3001`

## Arquivos Modificados

- ✅ `src/utils/apiConfig.js` (novo)
- ✅ `src/Login.js`
- ✅ `src/StatusBar.js`
- ✅ `src/Estoque/Relatorios.js`
- ✅ `src/Fluxograma.js`
- ✅ `src/utils/wsBase.js`

## Nota

Os outros arquivos do sistema ainda usam `import.meta.env.VITE_API_URL`, mas isso não é um problema porque:
- Se você definir `VITE_API_URL` no `.env`, ele será usado
- Caso contrário, os arquivos principais já foram atualizados para usar a detecção automática

Para atualizar todos os arquivos de uma vez (opcional), você pode fazer uma busca e substituição global no futuro.

