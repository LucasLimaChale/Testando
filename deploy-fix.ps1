# Deploy fix: rebuild backend with npm ci + package-lock.json
$VPS_IP = "187.127.3.19"
$VPS_USER = "root"
$VPS_PASS = "160618Sempre@"

$commands = @"
cd /root/video-approval && \
git pull && \
docker compose build --no-cache backend && \
docker compose up -d backend && \
echo '=== VERIFICANDO MODULE ===' && \
docker exec va_backend node -e "require('@aws-sdk/client-s3'); console.log('OK: @aws-sdk/client-s3 instalado!')" && \
echo '=== LOGS ===' && \
docker compose logs --tail=20 backend
"@

# Using Posh-SSH if available, otherwise use plain ssh
if (Get-Module -ListAvailable -Name Posh-SSH) {
    Import-Module Posh-SSH
    $secPass = ConvertTo-SecureString $VPS_PASS -AsPlainText -Force
    $cred = New-Object System.Management.Automation.PSCredential($VPS_USER, $secPass)
    $session = New-SSHSession -ComputerName $VPS_IP -Credential $cred -AcceptKey
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command $commands -TimeOut 300
    Write-Host $result.Output
    Remove-SSHSession -SessionId $session.SessionId
} else {
    Write-Host "Posh-SSH nao disponivel. Execute manualmente via SSH:"
    Write-Host "ssh root@$VPS_IP"
    Write-Host ""
    Write-Host "Depois cole estes comandos:"
    Write-Host $commands
}
