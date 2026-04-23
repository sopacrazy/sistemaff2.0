# 📋 Configuração: Local vs Rede

## 🎯 **RESUMO RÁPIDO**

O sistema **detecta automaticamente** se você está acessando por `localhost` ou por IP de rede e ajusta a URL da API automaticamente.

**Você NÃO precisa alterar nada manualmente!** ✅

---

## 🔍 **ONDE ESTÁ A CONFIGURAÇÃO**

### **1. Frontend - Detecção Automática**

**Arquivo:** `src/utils/apiConfig.js`

```javascript
function getApiBaseUrl() {
  const hostname = window.location.hostname;
  const port = 3001;

  // Se acessar por localhost → usa localhost:3001
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `http://localhost:${port}`;
  }

  // Se acessar por IP de rede → usa o mesmo IP:3001
  return `http://${hostname}:${port}`;
}
```

**Como funciona:**
- Acessa `localhost:3000` → API será `localhost:3001` ✅
- Acessa `192.168.11.23:3000` → API será `192.168.11.23:3001` ✅
- **AUTOMÁTICO!** Não precisa mudar nada!

---

### **2. Backend - Porta e Host**

**Arquivo:** `server.js` (linha ~7013)

```javascript
const port = process.env.PORT || 3001;

const server = app.listen(port, "0.0.0.0", () => {
  // ...
});
```

**O que significa:**
- `port: 3001` - Porta do backend
- `"0.0.0.0"` - Aceita conexões de **qualquer IP** (local e rede)
- ✅ **Já está configurado para funcionar em rede!**

**Para mudar a porta:**
```javascript
const port = process.env.PORT || 3002; // Muda para 3002
```

---

### **3. Frontend - Porta do Vite**

**Arquivo:** `vite.config.js` (linha ~8)

```javascript
server: {
  port: 3000,
  strictPort: false,
  host: true,  // ← Permite acesso pela rede
}
```

**O que significa:**
- `port: 3000` - Porta do frontend
- `host: true` - Permite acesso pela rede (não só localhost)
- ✅ **Já está configurado para funcionar em rede!**

**Para mudar a porta:**
```javascript
port: 3005, // Muda para 3005
```

---

## 🚀 **COMO RODAR**

### **OPÇÃO 1: Local (localhost)**

```bash
# Iniciar backend
pm2 start server.js --name backend

# Iniciar frontend
npm run start-react

# Acessar
http://localhost:3000
```

**Resultado:**
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`
- ✅ Funciona automaticamente!

---

### **OPÇÃO 2: Rede (IP)**

```bash
# Mesmo processo!
pm2 start server.js --name backend
npm run start-react

# Acessar de qualquer máquina na rede
http://192.168.11.23:3000
```

**Resultado:**
- Frontend: `http://192.168.11.23:3000`
- Backend: `http://192.168.11.23:3001` (detectado automaticamente!)
- ✅ Funciona automaticamente!

---

## ⚙️ **CONFIGURAÇÕES AVANÇADAS**

### **1. Mudar Porta do Backend**

**Arquivo:** `server.js` linha ~7013

```javascript
// Opção A: Hardcoded
const port = 3002; // Muda para 3002

// Opção B: Variável de ambiente
const port = process.env.PORT || 3001;
// Depois execute: PORT=3002 pm2 start server.js
```

**E atualizar:** `src/utils/apiConfig.js` linha ~18
```javascript
const port = 3002; // Mesma porta aqui
```

---

### **2. Mudar Porta do Frontend**

**Arquivo:** `vite.config.js` linha ~8

```javascript
server: {
  port: 3005, // Muda para 3005
  strictPort: false,
  host: true,
}
```

---

### **3. Forçar URL da API Manualmente**

**Arquivo:** `src/utils/apiConfig.js`

```javascript
function getApiBaseUrl() {
  // FORÇAR URL ESPECÍFICA (descomente e ajuste)
  // return "http://192.168.11.23:3001";
  
  // OU usar variável de ambiente
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Detecção automática (padrão)
  const hostname = window.location.hostname;
  // ...
}
```

**Ou criar arquivo `.env`:**
```env
VITE_API_URL=http://192.168.11.23:3001
```

---

### **4. Desabilitar Acesso pela Rede**

**Arquivo:** `vite.config.js`

```javascript
server: {
  port: 3000,
  host: false, // ← Muda para false (só localhost)
}
```

**Arquivo:** `server.js`

```javascript
// Aceita só localhost
const server = app.listen(port, "127.0.0.1", () => {
  // ...
});

// OU aceita só um IP específico
const server = app.listen(port, "192.168.11.23", () => {
  // ...
});
```

---

## 🔥 **FIREWALL (Importante para Rede!)**

Para funcionar em rede, você **PRECISA** liberar as portas no firewall:

```bash
# Execute como Administrador:
LIBERAR-FIREWALL-ADMIN.bat
```

Ou manualmente:
```powershell
netsh advfirewall firewall add rule name="Sistema FortFruit - Frontend (3000)" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="Sistema FortFruit - Backend (3001)" dir=in action=allow protocol=TCP localport=3001
```

---

## 📊 **RESUMO DAS CONFIGURAÇÕES**

| Configuração | Arquivo | Linha | Padrão | O que faz |
|--------------|---------|-------|--------|-----------|
| **Porta Backend** | `server.js` | ~7013 | 3001 | Porta do servidor Node.js |
| **Host Backend** | `server.js` | ~7015 | `0.0.0.0` | Aceita conexões de qualquer IP |
| **Porta Frontend** | `vite.config.js` | ~8 | 3000 | Porta do servidor Vite |
| **Host Frontend** | `vite.config.js` | ~10 | `true` | Permite acesso pela rede |
| **Detecção API** | `src/utils/apiConfig.js` | ~7-24 | Automática | Detecta IP automaticamente |

---

## ✅ **CONFIGURAÇÃO ATUAL (Recomendada)**

**Tudo já está configurado para funcionar tanto local quanto em rede!**

- ✅ Backend aceita conexões de qualquer IP (`0.0.0.0`)
- ✅ Frontend permite acesso pela rede (`host: true`)
- ✅ API detecta automaticamente o IP
- ✅ Funciona local e rede sem mudar nada!

**Você só precisa:**
1. Iniciar os servidores
2. Liberar firewall (para rede)
3. Acessar por `localhost` ou pelo IP da rede

---

## 🎯 **EXEMPLO PRÁTICO**

### **Cenário 1: Desenvolvimento Local**
```
Você: Desenvolvedor na máquina servidor
Acesso: http://localhost:3000
API: http://localhost:3001 (automático)
✅ Funciona!
```

### **Cenário 2: Usuário na Rede**
```
Usuário: Outra máquina na rede
Acesso: http://192.168.11.23:3000
API: http://192.168.11.23:3001 (automático)
✅ Funciona!
```

### **Cenário 3: Múltiplos Usuários**
```
Usuário 1: http://192.168.11.23:3000
Usuário 2: http://192.168.11.23:3000
Usuário 3: http://192.168.11.23:3000
Todos usam o mesmo backend: http://192.168.11.23:3001
✅ Funciona para todos!
```

---

## 💡 **DICAS**

1. **Não precisa mudar nada** - Sistema detecta automaticamente
2. **Firewall é obrigatório** - Para funcionar em rede
3. **PM2 mantém rodando** - Backend sempre disponível
4. **Frontend recompila** - Quando você muda código

---

## 🐛 **TROUBLESHOOTING**

### **Problema: Não funciona em rede**

**Solução:**
1. Verifique firewall: `LIBERAR-FIREWALL-ADMIN.bat`
2. Verifique se `host: true` no `vite.config.js`
3. Verifique se `0.0.0.0` no `server.js`

### **Problema: API sempre usa localhost**

**Solução:**
1. Limpe cache do navegador
2. Verifique `src/utils/apiConfig.js`
3. Reinicie frontend

### **Problema: Porta já em uso**

**Solução:**
1. Mude a porta no `vite.config.js` ou `server.js`
2. Atualize `apiConfig.js` se mudar backend
3. Reinicie servidores

---

**Resumo: Tudo já está configurado! Só precisa iniciar e liberar firewall!** 🚀






