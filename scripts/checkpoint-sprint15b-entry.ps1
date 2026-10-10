$ErrorActionPreference='Stop'
$entryWorkspace=(Resolve-Path -LiteralPath (Split-Path -Parent $PSScriptRoot)).Path
$entryTarget=Join-Path $entryWorkspace 'docs/checkpoints/sprint15b-entry-20261009.zip'
if(Test-Path -LiteralPath $entryTarget){throw 'Entry checkpoint exists; preserve it.'}
$entryNames=@(& git -C $entryWorkspace ls-files --cached --others --exclude-standard) | Sort-Object -Unique
Add-Type -AssemblyName System.IO.Compression.FileSystem
$entryArchive=[System.IO.Compression.ZipFile]::Open($entryTarget,[System.IO.Compression.ZipArchiveMode]::Create)
$entryHashes=[ordered]@{}
try {
  foreach($entryName in $entryNames){
    $entryFile=[System.IO.Path]::GetFullPath((Join-Path $entryWorkspace $entryName))
    if(-not $entryFile.StartsWith($entryWorkspace+[System.IO.Path]::DirectorySeparatorChar,[System.StringComparison]::OrdinalIgnoreCase)){throw 'Entry path escaped workspace.'}
    if(-not(Test-Path -LiteralPath $entryFile -PathType Leaf)){continue}
    $entryHashes[$entryName]=(Get-FileHash -LiteralPath $entryFile -Algorithm SHA256).Hash.ToLowerInvariant()
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($entryArchive,$entryFile,$entryName.Replace('\','/'),[System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
} finally {$entryArchive.Dispose()}
$entryRecord=[ordered]@{file='docs/checkpoints/sprint15b-entry-20261009.zip';createdAt=[DateTime]::UtcNow.ToString('o');baseCommit=(& git -C $entryWorkspace rev-parse HEAD);branch=(& git -C $entryWorkspace branch --show-current);version='1.2.0';turnSystemStatus='PARTIALLY COMPLETE: audit/spec and conditional UI/AI/protocol drafts; canonical engine remains legacy';sha256=(Get-FileHash -LiteralPath $entryTarget -Algorithm SHA256).Hash.ToLowerInvariant();bytes=(Get-Item -LiteralPath $entryTarget).Length;files=$entryHashes.Count;sourceHashes=$entryHashes;releasedV120Preserved=$true;largeSimulationsRun=0}
$entryRecord | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $entryWorkspace 'test-results/sprint15b-entry-checkpoint.json') -Encoding utf8
[ordered]@{file=$entryRecord.file;files=$entryRecord.files;bytes=$entryRecord.bytes;sha256=$entryRecord.sha256;turnSystemStatus=$entryRecord.turnSystemStatus} | ConvertTo-Json
