# Backup remoto de PostgreSQL para Caminos Rurales SDE.
#
# Corre el script de backup en el servidor y se trae el .sql.gz a esta PC.
# Pensado para ejecutarse desde el Programador de tareas de Windows.
#
# Uso:
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\backup-remoto.ps1
#
# Parámetros opcionales:
#   -Servidor        Nombre mDNS o IP del servidor (por defecto ServerDebian.local)
#   -Usuario         Usuario SSH (por defecto marco)
#   -Destino         Carpeta local de destino (por defecto D:\Proyectos de python\BACKUPS\CaminosRurales)
#   -RetencionDias   Días a conservar en esta PC (por defecto 60)

[CmdletBinding()]
param(
    [string]$Servidor = 'ServerDebian.local',
    [string]$Usuario = 'marco',
    [string]$Destino = 'D:\Proyectos de python\BACKUPS\CaminosRurales',
    [int]$RetencionDias = 60
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$log = Join-Path $Destino 'backup.log'
$sshOpts = @('-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15')

function Escribir-Log {
    param([string]$Mensaje)
    $linea = '{0} {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Mensaje
    Write-Host $linea
    Add-Content -Path $log -Value $linea -Encoding UTF8
}

function Test-GzipValido {
    param([string]$Ruta)
    try {
        $entrada = [System.IO.File]::OpenRead($Ruta)
        try {
            $gz = New-Object System.IO.Compression.GZipStream($entrada, [System.IO.Compression.CompressionMode]::Decompress)
            try {
                $buffer = New-Object byte[] 81920
                while (($gz.Read($buffer, 0, $buffer.Length)) -gt 0) { }
            }
            finally { $gz.Dispose() }
        }
        finally { $entrada.Dispose() }
        return $true
    }
    catch {
        return $false
    }
}

try {
    if (-not (Test-Path $Destino)) {
        New-Item -ItemType Directory -Path $Destino -Force | Out-Null
    }

    Escribir-Log "Inicio del backup desde $Usuario@$Servidor"

    # 1. Ejecutar el backup en el servidor (con su propia retención de 30 días).
    #    stderr se captura como texto, no como error de PowerShell.
    $ErrorActionPreference = 'Continue'
    $salida = & ssh @sshOpts "$Usuario@$Servidor" 'cd "$HOME/CaminosSDE" && ./scripts/backup-postgres.sh' 2>&1
    $codigo = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    if ($codigo -ne 0) {
        throw "El backup en el servidor falló (código $codigo): $($salida -join ' | ')"
    }

    $rutaRemota = $null
    foreach ($linea in @($salida)) {
        if ($linea -match '^Backup listo:\s+(.+?)\s+\(') {
            $rutaRemota = $Matches[1]
        }
    }
    if (-not $rutaRemota) {
        throw "No se pudo interpretar la salida del servidor: $($salida -join ' | ')"
    }

    # 2. Traer el archivo a esta PC.
    $nombre = Split-Path -Leaf $rutaRemota
    $rutaLocal = Join-Path $Destino $nombre
    $parcial = "$rutaLocal.parcial"
    $ErrorActionPreference = 'Continue'
    & scp @sshOpts "${Usuario}@${Servidor}:$rutaRemota" $parcial 2>&1 | Out-Null
    $codigoScp = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    if ($codigoScp -ne 0) {
        throw "Falló scp al traer $rutaRemota (código $codigoScp)"
    }

    # 3. Verificar que el gzip esté completo antes de aceptarlo.
    if (-not (Test-GzipValido $parcial)) {
        Remove-Item $parcial -Force -ErrorAction SilentlyContinue
        throw "El archivo descargado no es un gzip válido. Se descarta."
    }
    Move-Item -Path $parcial -Destination $rutaLocal -Force

    $tamano = [math]::Round((Get-Item $rutaLocal).Length / 1KB, 1)
    Escribir-Log "Backup OK: $rutaLocal ($tamano KB)"

    # 4. Retención local.
    $limite = (Get-Date).AddDays(-$RetencionDias)
    $viejos = Get-ChildItem -Path $Destino -Filter 'caminos-*.sql.gz' |
        Where-Object { $_.LastWriteTime -lt $limite }
    foreach ($viejo in $viejos) {
        Remove-Item $viejo.FullName -Force
        Escribir-Log "Eliminado por retención: $($viejo.Name)"
    }
    Escribir-Log "Fin del backup. Retención local: $RetencionDias días."

    exit 0
}
catch {
    Escribir-Log "ERROR: $($_.Exception.Message)"
    exit 1
}
