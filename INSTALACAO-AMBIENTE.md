# 📦 Instalação - Sistema de Ambiente

## ✅ **CHECKLIST DE CONFIGURAÇÃO**

### **1. Configurar `.env`:**

Adicione esta linha no seu arquivo `.env`:

```env
# === IDENTIFICAÇÃO DO AMBIENTE ===
ENVIRONMENT=development  # ou 'production'
```

---

### **2. Valores Possíveis:**

```env
# Para DESENVOLVIMENTO (local, testes):
ENVIRONMENT=development

# Para PRODUÇÃO (servidor real, dados reais):
ENVIRONMENT=production
```

---

### **3. Reiniciar Servidor:**

Após configurar o `.env`, reinicie o backend:

```bash
cd "C:\Sistema\sistemaff 2.0 dev"
node server.js
```

**Você deve ver:**

```
============================================================
🚀 Servidor rodando na porta 3001
📍 Ambiente: 🔵 DESENVOLVIMENTO  (ou 🔴 PRODUÇÃO)
============================================================
```

---

### **4. Verificar Frontend:**

1. Recarregue a página do sistema (F5)
2. Você deve ver:
   - **Se DEV:** Badge azul no canto inferior direito
   - **Se PROD:** Banner vermelho piscando no topo + badge vermelho

---

## 🔍 **VERIFICAÇÃO**

### **Como saber se está funcionando?**

1. **Backend:** Ao iniciar, mostra o ambiente no console
2. **Frontend:** Badge ou banner aparece na tela
3. **Confirmações:** Operações críticas pedem confirmação extra em produção

---

## 🚨 **IMPORTANTE**

### **Antes de mudar para PRODUÇÃO:**

✅ **SEMPRE verifique:**
1. [ ] `.env` → `ENVIRONMENT=production`
2. [ ] Credenciais de banco de produção estão corretas
3. [ ] IP/Host está apontando para produção
4. [ ] Backup dos dados foi feito
5. [ ] Testes foram executados

❌ **NUNCA:**
- Trabalhe em produção sem o banner vermelho aparecendo
- Execute operações críticas sem confirmar
- Esqueça de voltar para desenvolvimento após terminar

---

## 🛠️ **TROUBLESHOOTING**

### **Banner não aparece?**

```bash
# 1. Verificar se .env tem a variável
cat .env | grep ENVIRONMENT

# 2. Reiniciar backend
node server.js

# 3. Limpar cache do frontend
# No navegador: Ctrl+Shift+R
```

### **Erro ao iniciar:**

Se der erro "ENVIRONMENT is not defined":
1. Adicione `ENVIRONMENT=development` no `.env`
2. Reinicie o backend
3. Se persistir, verifique se o arquivo `.env` existe na raiz do projeto

---

## 📝 **EXEMPLO DE `.env` COMPLETO**

```env
# === IDENTIFICAÇÃO DO AMBIENTE ===
ENVIRONMENT=development  # IMPORTANTE: mudar para 'production' quando for subir

# === BANCOS DE DADOS ===
# ... suas outras configurações ...
```

---

## ✅ **VALIDAÇÃO**

Execute este comando para verificar:

```bash
# No terminal do backend:
node -e "console.log('Ambiente:', process.env.ENVIRONMENT || 'NÃO CONFIGURADO')"
```

**Resultado esperado:**
```
Ambiente: development
```
(ou `production` se estiver configurado para produção)

---

**🎯 Pronto! Agora você tem proteção contra erros em produção!**

