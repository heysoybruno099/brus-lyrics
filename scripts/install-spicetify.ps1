# Scripts/install-spicetify.ps1
# Automates building and installing the Bru's Lyrics extension into Spotify via Spicetify

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RootDir = Split-Path -Parent $ScriptDir
$ExtensionDist = Join-Path $RootDir "packages\spicetify-extension\dist\brus-lyrics.js"

Write-Host "[Spicetify Installer] Step 1: Building Spicetify Extension..."
Set-Location -Path (Join-Path $RootDir "packages\spicetify-extension")
node build.js
if (-not (Test-Path $ExtensionDist)) {
    Write-Error "[Spicetify Installer] Extension bundle not found at $ExtensionDist"
    exit 1
}

Write-Host "[Spicetify Installer] Step 2: Locating Spicetify installation directories..."
$TargetDirs = @()
$RoamingExt = Join-Path $env:APPDATA "spicetify\Extensions"
$LocalExt = Join-Path $env:LOCALAPPDATA "spicetify\Extensions"

if (Test-Path (Join-Path $env:APPDATA "spicetify")) {
    $TargetDirs += $RoamingExt
}
if (Test-Path (Join-Path $env:LOCALAPPDATA "spicetify")) {
    $TargetDirs += $LocalExt
}

if ($TargetDirs.Count -eq 0) {
    Write-Error "[Spicetify Installer] No Spicetify directories detected in APPDATA or LOCALAPPDATA."
    exit 1
}

foreach ($dir in $TargetDirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    Copy-Item -Path $ExtensionDist -Destination (Join-Path $dir "brus-lyrics.js") -Force
    Write-Host "[Spicetify Installer] Copied brus-lyrics.js -> $dir"
}

Write-Host "[Spicetify Installer] Step 3: Checking Spicetify CLI..."
$SpicetifyCmd = Get-Command spicetify -ErrorAction SilentlyContinue
if (-not $SpicetifyCmd) {
    $LocalSpicetify = Join-Path $env:LOCALAPPDATA "spicetify\spicetify.exe"
    if (Test-Path $LocalSpicetify) {
        $SpicetifyCmd = $LocalSpicetify
    }
}

if ($SpicetifyCmd) {
    Write-Host "[Spicetify Installer] Step 4: Configuring extension with Spicetify CLI..."
    & $SpicetifyCmd config extensions brus-lyrics.js
    Write-Host "[Spicetify Installer] Step 5: Applying Spicetify modifications to Spotify..."
    & $SpicetifyCmd apply
    Write-Host "[Spicetify Installer] Complete: Bru's Lyrics extension successfully installed and active in Spotify Desktop."
} else {
    Write-Warning "[Spicetify Installer] Spicetify CLI executable not found in PATH or standard location. File copied to Extensions directory; please run 'spicetify apply' manually."
}
