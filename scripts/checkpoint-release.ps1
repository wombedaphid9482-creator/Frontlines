param([string]$Sprint='sprint9')
$ErrorActionPreference='Stop'
$checkpointWorkspace=(Resolve-Path -LiteralPath (Split-Path -Parent $PSScriptRoot)).Path
$checkpointPackage=Get-Content -LiteralPath (Join-Path $checkpointWorkspace 'package.json') -Raw | ConvertFrom-Json
$checkpointVersion=$checkpointPackage.version
if($Sprint -notmatch '^sprint[0-9]+$') {throw 'Use a numbered sprint name.'}
$checkpointTarget=Join-Path $checkpointWorkspace ('docs/checkpoints/'+$Sprint+'-v'+$checkpointVersion+'.zip')
if(Test-Path -LiteralPath $checkpointTarget) {throw 'Checkpoint exists; preserve it and choose a new version.'}
$checkpointFiles=[System.Collections.Generic.List[string]]::new()
foreach($checkpointItem in Get-ChildItem -LiteralPath $checkpointWorkspace -File) {
  if($checkpointItem.Extension -in @('.js','.html','.css','.json','.cmd','.md') -or $checkpointItem.Name -eq '.gitignore') {$checkpointFiles.Add($checkpointItem.FullName)}
}
foreach($checkpointDirectory in @('assets','balance','scripts','tests')) {
  foreach($checkpointItem in Get-ChildItem -LiteralPath (Join-Path $checkpointWorkspace $checkpointDirectory) -File -Recurse) {$checkpointFiles.Add($checkpointItem.FullName)}
}
foreach($checkpointItem in Get-ChildItem -LiteralPath (Join-Path $checkpointWorkspace 'docs') -File -Recurse) {
  $checkpointRelative=[System.IO.Path]::GetRelativePath($checkpointWorkspace,$checkpointItem.FullName).Replace('\','/')
  if($checkpointRelative.StartsWith('docs/checkpoints/') -or $checkpointRelative.StartsWith('docs/balance/sprint5-experiments/')) {continue}
  if($checkpointRelative -eq ('docs/release-'+$checkpointVersion+'-manifest.json')) {continue}
  if($checkpointRelative.StartsWith('docs/balance/') -and -not ($checkpointRelative.StartsWith('docs/balance/sprint-3-baseline/') -or $checkpointRelative.StartsWith('docs/balance/sprint5-baseline-source/')) -and $checkpointItem.Length -gt 2097152) {continue}
  $checkpointFiles.Add($checkpointItem.FullName)
}
foreach($checkpointItem in Get-ChildItem -LiteralPath (Join-Path $checkpointWorkspace 'test-results') -File) {
  if($checkpointItem.Name -eq ($Sprint+'-checkpoint.log')) {continue}
  $checkpointSprint10Evidence=$Sprint -eq 'sprint10' -and $checkpointVersion -eq '1.0.3' -and $checkpointItem.Name -in @('viewport-hotfix-browser.json','viewport-hotfix-1366x768-dpr1.png','v102-browser-presentation.json','browser-tutorial-sprint9.json')
  if($checkpointSprint10Evidence -or $checkpointItem.Name -match ('^'+$Sprint+'-|^browser-tutorial-'+$Sprint+'\.|^release-'+[regex]::Escape($checkpointVersion)+'-verification\.json$|^hotfix-'+[regex]::Escape($checkpointVersion)+'-|^v'+$checkpointVersion.Replace('.','')+'-')) {$checkpointFiles.Add($checkpointItem.FullName)}
}
Add-Type -AssemblyName System.IO.Compression.FileSystem
$checkpointArchive=[System.IO.Compression.ZipFile]::Open($checkpointTarget,[System.IO.Compression.ZipArchiveMode]::Create)
try {
  foreach($checkpointFile in ($checkpointFiles | Sort-Object -Unique)) {
    $checkpointResolved=(Resolve-Path -LiteralPath $checkpointFile).Path
    if(-not $checkpointResolved.StartsWith($checkpointWorkspace+[System.IO.Path]::DirectorySeparatorChar,[System.StringComparison]::OrdinalIgnoreCase)) {throw 'Source escaped the workspace.'}
    $checkpointEntry=[System.IO.Path]::GetRelativePath($checkpointWorkspace,$checkpointResolved).Replace('\','/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($checkpointArchive,$checkpointResolved,$checkpointEntry,[System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
} finally {$checkpointArchive.Dispose()}
# Reopen the archive and compare every runtime entry with the packaged verifier.
$checkpointVerification=Get-Content -LiteralPath (Join-Path $checkpointWorkspace ('test-results/release-'+$checkpointVersion+'-verification.json')) -Raw | ConvertFrom-Json
$checkpointArchive=[System.IO.Compression.ZipFile]::OpenRead($checkpointTarget)
try {
  foreach($checkpointProperty in $checkpointVerification.sourceHashes.PSObject.Properties) {
    $checkpointEntry=$checkpointArchive.GetEntry($checkpointProperty.Name)
    if($null -eq $checkpointEntry) {throw ('Missing checkpoint runtime: '+$checkpointProperty.Name)}
    $checkpointStream=$checkpointEntry.Open()
    $checkpointHasher=[System.Security.Cryptography.SHA256]::Create()
    try {$checkpointActual=[System.BitConverter]::ToString($checkpointHasher.ComputeHash($checkpointStream)).Replace('-','').ToLowerInvariant()} finally {$checkpointStream.Dispose();$checkpointHasher.Dispose()}
    if($checkpointActual -ne $checkpointProperty.Value) {throw ('Checkpoint runtime mismatch: '+$checkpointProperty.Name)}
  }
  $checkpointCount=$checkpointArchive.Entries.Count
} finally {$checkpointArchive.Dispose()}
$checkpointReport=[ordered]@{file=[System.IO.Path]::GetRelativePath($checkpointWorkspace,$checkpointTarget).Replace('\','/');bytes=(Get-Item -LiteralPath $checkpointTarget).Length;sha256=(Get-FileHash -LiteralPath $checkpointTarget -Algorithm SHA256).Hash.ToLowerInvariant();files=$checkpointCount;runtimeFiles=$checkpointVerification.verifiedRuntimeFiles;manifestOutsideArchive=$true;runtimeHashesMatchPackage=$true;excluded=@('dependencies','release binaries','owner saves','large historical simulation outputs','earlier checkpoint archives');externalArtifactTestDependencies=@('docs/checkpoints/sprint7-v0.8.0.zip','release/0.8.0/Frontlines-Setup-0.8.0.exe','docs/checkpoints/sprint8-v0.9.0.zip','release/0.9.0/Frontlines-Setup-0.9.0.exe')}
$checkpointJson=$checkpointReport | ConvertTo-Json -Depth 5
Set-Content -LiteralPath (Join-Path $checkpointWorkspace ('test-results/source-'+$checkpointVersion+'-checkpoint.json')) -Value $checkpointJson -Encoding utf8
$checkpointJson
