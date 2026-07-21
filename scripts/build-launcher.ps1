$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $PSScriptRoot 'FolioLauncher.cs'
$outputPath = Join-Path $projectRoot 'Folio.exe'
$iconPath = Join-Path $projectRoot 'public\folio.ico'
$resourceEditor = Join-Path $PSScriptRoot 'set-exe-icon.mjs'
$resourceEditorModule = Join-Path $projectRoot 'node_modules\rcedit'

if (Test-Path -LiteralPath $outputPath) {
    Remove-Item -LiteralPath $outputPath
}

Add-Type `
    -Path $sourcePath `
    -OutputAssembly $outputPath `
    -OutputType WindowsApplication `
    -ReferencedAssemblies @('System.dll', 'System.Windows.Forms.dll')

if ((Test-Path -LiteralPath $iconPath) -and (Test-Path -LiteralPath $resourceEditorModule)) {
    & node $resourceEditor $outputPath $iconPath
    if ($LASTEXITCODE -ne 0) {
        throw 'No se pudo aplicar el icono de Folio al ejecutable.'
    }
}

Write-Output "Creado: $outputPath"
