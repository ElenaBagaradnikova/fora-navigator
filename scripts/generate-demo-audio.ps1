param(
  [string]$Timeline = "scripts/video-timeline.json",
  [string]$OutputDirectory = "test-results/video/audio-cues",
  [string]$Voice = "Microsoft Hazel Desktop",
  [int]$CueIndex = 0
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Speech

$workspace = (Get-Location).Path
$timelinePath = [IO.Path]::GetFullPath((Join-Path $workspace $Timeline))
$outputPath = [IO.Path]::GetFullPath((Join-Path $workspace $OutputDirectory))
$workspaceRoot = [IO.Path]::GetFullPath($workspace)
if (-not $outputPath.StartsWith($workspaceRoot, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Audio output must stay inside the workspace."
}

New-Item -ItemType Directory -Path $outputPath -Force | Out-Null
$cues = Get-Content -Raw -Encoding utf8 $timelinePath | ConvertFrom-Json
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice($Voice)
$synth.Volume = 100

for ($index = 0; $index -lt $cues.Count; $index += 1) {
  if ($CueIndex -gt 0 -and ($index + 1) -ne $CueIndex) { continue }
  $cue = $cues[$index]
  $synth.Rate = [int]$cue.rate
  $cuePath = Join-Path $outputPath (("cue-{0:D2}.wav" -f ($index + 1)))
  $synth.SetOutputToWaveFile($cuePath)
  $synth.Speak([string]$cue.text)
  $synth.SetOutputToNull()
}

$synth.Dispose()
Write-Output $outputPath
