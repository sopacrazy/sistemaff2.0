
Write-Host "Verificando e encerrando processos nas portas 3000 e 3001..."

$ports = @(3000, 3001)

foreach ($p in $ports) {
    try {
        $conns = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue 
        if ($conns) {
            foreach ($conn in $conns) {
                Write-Host "Encerrando processo $($conn.OwningProcess) na porta $p"
                Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
            }
        }
    } catch {
        Write-Host "Erro ao processar porta $p"
    }
}

Write-Host "Iniciando servidor..."
npm run start:dev
