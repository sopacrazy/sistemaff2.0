# 🚨 Configuração de Ambiente (Produção vs Desenvolvimento)

## ⚙️ Como Configurar

### **1. Adicione no seu arquivo `.env`:**

```env
# === IDENTIFICAÇÃO DO AMBIENTE ===
ENVIRONMENT=production  # ou 'development'
```

### **2. Valores Possíveis:**

- **`ENVIRONMENT=production`** → 🔴 **PRODUÇÃO**
  - Banner VERMELHO no topo da tela
  - Badge "🔴 PRODUÇÃO" no canto inferior direito
  - Alerta piscando constantemente

- **`ENVIRONMENT=development`** → 🔵 **DESENVOLVIMENTO**
  - Badge azul discreto no canto inferior direito
  - Sem alerta

---

## 🎯 Como Usar

### **Para Trabalhar em DESENVOLVIMENTO:**

1. Abra o arquivo `.env`
2. Altere para:
   ```env
   ENVIRONMENT=development
   
   # Bancos de Desenvolvimento (linhas 17-24)
   DB_HOST_OCORRENCIAS=localhost
   DB_USER_OCORRENCIAS=root
   # ... resto das configs de dev
   ```

3. Reinicie o backend:
   ```bash
   node server.js
   ```

4. Recarregue o frontend (F5)
5. ✅ Você verá o badge AZUL "DESENVOLVIMENTO"

---

### **Para Trabalhar em PRODUÇÃO:**

1. Abra o arquivo `.env`
2. Altere para:
   ```env
   ENVIRONMENT=production
   
   # Bancos de Produção (linhas 11-16)
   DB_HOST_OCORRENCIAS=192.168.x.x
   DB_USER_OCORRENCIAS=usuario_producao
   # ... resto das configs de produção
   ```

3. Reinicie o backend:
   ```bash
   node server.js
   ```

4. Recarregue o frontend (F5)
5. ⚠️ Você verá o **BANNER VERMELHO NO TOPO** + badge "🔴 PRODUÇÃO"

---

## 🔥 Alertas Visuais

### **Em DESENVOLVIMENTO:**
- Badge azul discreto no canto: `🔵 DESENVOLVIMENTO`

### **Em PRODUÇÃO:**
- ⚠️ **Banner vermelho piscando no topo** com: `⚠️ ATENÇÃO: AMBIENTE DE PRODUÇÃO! ⚠️`
- Badge vermelho no canto: `🔴 PRODUÇÃO`
- Impossível não perceber!

---

## 📋 Checklist Antes de Subir em Produção

- [ ] Conferir `.env` → `ENVIRONMENT=production`
- [ ] Conferir conexões de banco (linhas 11-16)
- [ ] Conferir IP/Host (linha 46-47)
- [ ] Reiniciar backend
- [ ] Verificar se apareceu **BANNER VERMELHO**
- [ ] Se não aparecer banner vermelho, **NÃO PROSSEGUIR!**

---

## 🛠️ Troubleshooting

### O banner não aparece?
1. Verifique se o backend está rodando
2. Verifique se a variável `ENVIRONMENT` existe no `.env`
3. Reinicie o backend
4. Recarregue o frontend com Ctrl+Shift+R (limpa cache)

### Banner errado aparece?
- Confira o `.env` novamente
- Reinicie o backend
- Limpe o cache do navegador

---

## 🎨 Customização

Se quiser mudar as cores ou textos, edite o arquivo:
```
src/components/EnvironmentBanner.js
```

---

## ⚡ Exemplo de Fluxo de Trabalho

```bash
# 1. Desenvolvimento
vim .env  # ENVIRONMENT=development
node server.js
# Frontend mostra: 🔵 DESENVOLVIMENTO

# 2. Testar antes de subir
# Fazer commits, testes, etc.

# 3. Preparar para Produção
vim .env  # ENVIRONMENT=production
node server.js
# Frontend mostra: 🔴⚠️ BANNER VERMELHO ⚠️

# 4. Conferir TUDO
# Se está tudo certo, fazer deploy
```

---

**🚨 IMPORTANTE:** Sempre confira o banner antes de fazer qualquer operação crítica!

