$ErrorActionPreference = "Stop"
$installRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$node = Join-Path $installRoot "runtime\node.exe"
$server = Join-Path $installRoot "app\server.cjs"
$url = "http://127.0.0.1:8787"

$client = New-Object System.Net.Sockets.TcpClient
$serverRunning = $false
try {
  $client.Connect("127.0.0.1", 8787)
  $serverRunning = $true
} catch {
  Start-Process -FilePath $node -ArgumentList ('"{0}"' -f $server) -WorkingDirectory (Join-Path $installRoot "app") -WindowStyle Hidden
} finally {
  $client.Dispose()
}

if (-not $serverRunning) {
  for ($attempt = 0; $attempt -lt 20; $attempt++) {
    Start-Sleep -Milliseconds 250
    $client = New-Object System.Net.Sockets.TcpClient
    try {
      $client.Connect("127.0.0.1", 8787)
      $serverRunning = $true
      break
    } catch {
      if ($attempt -eq 19) {
        throw "No se pudo iniciar el servidor local en el puerto 8787."
      }
    } finally {
      $client.Dispose()
    }
  }
}

Start-Process $url
