@echo off
setlocal enabledelayedexpansion

:: =============================================
:: CONFIGURACAO - ajuste conforme necessario
:: =============================================
set PASTA_PROJETO=C:\sistemaff2.0
set NOME_APP_PM2=server

:: =============================================
echo.
echo =============================================
echo  ATUALIZACAO DO SISTEMA - via GitHub
echo =============================================
echo.

cd /d "%PASTA_PROJETO%"

:: Verifica se e um repositorio git
if not exist ".git" (
    echo [ERRO] Esta pasta nao e um repositorio git!
    echo Execute primeiro: git clone https://github.com/sopacrazy/sistemaff2.0.git .
    pause
    exit /b 1
)

:: Busca atualizacoes sem aplicar ainda
echo Verificando atualizacoes no GitHub...
git fetch origin master 2>&1

:: Verifica se tem algo novo
git diff --quiet HEAD origin/master
if %ERRORLEVEL% == 0 (
    echo.
    echo [OK] O sistema ja esta atualizado! Nenhuma mudanca encontrada.
    echo.
    pause
    exit /b 0
)

:: Mostra o que vai mudar
echo.
echo Mudancas encontradas:
git log HEAD..origin/master --oneline 2>&1
echo.

:: Aplica as atualizacoes
echo Baixando atualizacoes...
git pull origin master 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Falha ao baixar atualizacoes. Verifique a conexao com o GitHub.
    pause
    exit /b 1
)

:: Verifica se package.json mudou para instalar dependencias
git diff HEAD~1 --name-only 2>nul | findstr "package.json" >nul
if %ERRORLEVEL% == 0 (
    echo.
    echo Dependencias alteradas, instalando...
    npm install --omit=dev 2>&1
)

:: Reinicia o PM2
echo.
echo Reiniciando o servico PM2...
pm2 restart %NOME_APP_PM2% 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [AVISO] PM2 nao encontrou o app "%NOME_APP_PM2%". Tentando iniciar...
    pm2 start server.js --name %NOME_APP_PM2% 2>&1
)

echo.
echo =============================================
echo  Atualizacao concluida com sucesso!
echo =============================================
echo.
pm2 status
echo.
pause
