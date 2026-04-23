# Script para configurar o Firewall do Windows para permitir acesso à rede
# Execute como Administrador: PowerShell -ExecutionPolicy Bypass -File configurar-firewall.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Configuração do Firewall do Windows" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verifica se está rodando como Administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERRO: Este script precisa ser executado como Administrador!" -ForegroundColor Red
    Write-Host "Clique com botão direito no PowerShell e selecione 'Executar como Administrador'" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "Configurando regras do firewall para as portas 3000 e 3001..." -ForegroundColor Yellow

# Porta 3000 (Frontend)
$rule3000 = Get-NetFirewallRule -DisplayName "SistemaFF - Frontend (3000)" -ErrorAction SilentlyContinue
if (-not $rule3000) {
    New-NetFirewallRule -DisplayName "SistemaFF - Frontend (3000)" `
        -Direction Inbound `
        -LocalPort 3000 `
        -Protocol TCP `
        -Action Allow `
        -Description "Permite acesso ao frontend do SistemaFF na porta 3000" | Out-Null
    Write-Host "✓ Regra criada para porta 3000 (Frontend)" -ForegroundColor Green
} else {
    Write-Host "✓ Regra já existe para porta 3000 (Frontend)" -ForegroundColor Green
}

# Porta 3001 (Backend)
$rule3001 = Get-NetFirewallRule -DisplayName "SistemaFF - Backend (3001)" -ErrorAction SilentlyContinue
if (-not $rule3001) {
    New-NetFirewallRule -DisplayName "SistemaFF - Backend (3001)" `
        -Direction Inbound `
        -LocalPort 3001 `
        -Protocol TCP `
        -Action Allow `
        -Description "Permite acesso ao backend do SistemaFF na porta 3001" | Out-Null
    Write-Host "✓ Regra criada para porta 3001 (Backend)" -ForegroundColor Green
} else {
    Write-Host "✓ Regra já existe para porta 3001 (Backend)" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Configuração concluída!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "As portas 3000 e 3001 estão agora acessíveis na rede." -ForegroundColor Yellow
Write-Host ""
pause

