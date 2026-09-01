$ErrorActionPreference = "Stop"
$releaseRoot = "https://github.com/B-Divyesh/sf-local-data-workbench/releases/latest/download"
$workDir = Join-Path $env:TEMP ("local-data-workbench-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $workDir | Out-Null

try {
  $manifestPath = Join-Path $workDir "latest.json"
  Invoke-WebRequest -UseBasicParsing "$releaseRoot/latest.json" -OutFile $manifestPath
  $manifest = Get-Content -Raw $manifestPath | ConvertFrom-Json
  $asset = $manifest.platforms.windows
  if ($null -eq $asset) { throw "No Windows installer is published. Nothing was downloaded or installed." }
  if (-not $manifest.signing.windows) {
    Write-Warning "This Windows installer is unsigned. Its SHA-256 is checked below, but no Authenticode signature is claimed."
  }
  $name = [System.IO.Path]::GetFileName(([uri]$asset.url).LocalPath)
  $installer = Join-Path $workDir $name
  Invoke-WebRequest -UseBasicParsing $asset.url -OutFile $installer
  $actual = (Get-FileHash -Algorithm SHA256 $installer).Hash.ToLowerInvariant()
  if ($actual -ne $asset.sha256.ToLowerInvariant()) { throw "Checksum mismatch; refusing to install." }
  Write-Host "Verified SHA-256 for $name"
  if ($name.EndsWith(".msi")) {
    Start-Process msiexec.exe -Wait -ArgumentList @("/i", "`"$installer`"")
  } else {
    Start-Process -Wait $installer
  }
  Write-Host "Local Data Workbench installer completed."
} finally {
  if (Test-Path $workDir) { Remove-Item -Recurse -Force $workDir }
}
