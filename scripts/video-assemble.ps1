[CmdletBinding()]
param(
    [ValidateSet('1080x2400', '720x1600')][string]$Resolution = '1080x2400',
    [ValidateSet('es', 'en')][string]$Lang = 'es',
    [string]$ClipsDir = (Join-Path $env:USERPROFILE 'RadiCodex-video\clips'),
    [string]$Output,
    [string]$Version = '1.1.0',
    [int]$TitleSeconds = 4,
    [string]$Plan,
    [string]$Logo
)

$ErrorActionPreference = 'Stop'

# Works from scripts\ and from scripts\video\
$repo = $PSScriptRoot
while ($repo -and -not (Test-Path (Join-Path $repo 'docs\VIDEO-RADICODEX-1.1.md'))) { $repo = Split-Path $repo -Parent }
if (-not $repo) { throw 'No se encuentra docs\VIDEO-RADICODEX-1.1.md.' }
if (-not $Plan) { $Plan = Join-Path $repo 'docs\VIDEO-RADICODEX-1.1.md' }
if (-not $Logo) { $Logo = Join-Path $repo 'bricohams-logo.png' }

foreach ($tool in 'ffmpeg', 'ffprobe') {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { throw "$tool no esta en el PATH." }
}

$clips = [System.IO.Path]::GetFullPath($ClipsDir)
if ($clips.StartsWith($repo, [System.StringComparison]::OrdinalIgnoreCase)) { throw "La carpeta de clips debe estar fuera del repo: $clips" }
if (-not (Test-Path $Logo)) { throw "No se encuentra el logo: $Logo" }
if (-not $Output) { $Output = Join-Path $clips "RadiCodex-$Version-demo.mp4" }

$w, $h = $Resolution.Split('x')
$work = Join-Path $clips 'work'
New-Item -ItemType Directory -Force -Path $work | Out-Null

function Format-Srt([double]$t) {
    $ts = [TimeSpan]::FromSeconds($t)
    '{0:00}:{1:00}:{2:00},{3:000}' -f [int][Math]::Floor($ts.TotalHours), $ts.Minutes, $ts.Seconds, $ts.Milliseconds
}

# FFmpeg filter paths: forward slashes and escaped drive colon
function Format-FilterPath([string]$p) { ($p -replace '\\', '/') -replace ':', '\:' }

$scenes = foreach ($line in Get-Content -Encoding UTF8 $Plan) {
    if ($line -match '^\|\s*(V\d{2})\s*\|') {
        $c = $line.Trim().Trim('|').Split('|') | ForEach-Object { $_.Trim() }
        [pscustomobject]@{ Id = $c[0]; Es = $c[4]; En = $c[5]; Duration = [int]$c[6] }
    }
}
if (-not $scenes) { throw "No se encontraron escenas en $Plan" }

$style = 'FontName=Arial,FontSize=14,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00272B23,BorderStyle=3,BackColour=&H99272B23,Outline=2,Alignment=2,MarginV=90'
$parts = @()

# Title card: graphite #23272B background, logo, orange #F26B1D text
$title = Join-Path $work 'title.mp4'
$logoWidth = [int]([int]$w * 0.5)
$fontSize = [int]([int]$w / 9)
$base = "[1:v]scale=${logoWidth}:-1[logo];[0:v][logo]overlay=(W-w)/2:(H-h)/2-120"
$withText = "$base,drawtext=text='RadiCodex ${Version}':fontcolor=0xF26B1D:fontsize=${fontSize}:x=(w-text_w)/2:y=(h/2)+160[out]"
$inArgs = @('-y', '-loglevel', 'error', '-f', 'lavfi', '-i', "color=c=0x23272B:s=${w}x${h}:r=30:d=$TitleSeconds", '-loop', '1', '-t', $TitleSeconds, '-i', $Logo, '-f', 'lavfi', '-t', $TitleSeconds, '-i', 'anullsrc=r=48000:cl=stereo')
$encode = @('-map', '[out]', '-map', '2:a', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', $title)
& ffmpeg @inArgs -filter_complex $withText @encode 2>$null
if ($LASTEXITCODE -ne 0) {
    # Fallback for ffmpeg builds without drawtext
    & ffmpeg @inArgs -filter_complex "$base[out]" @encode
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear la tarjeta de titulo.' }
}
$parts += $title

foreach ($s in $scenes) {
    $src = Join-Path $clips "$($s.Id).mp4"
    if (-not (Test-Path $src)) { Write-Warning "Falta el clip $($s.Id); se omite."; continue }

    $probe = & ffprobe -v error -show_entries format=duration -of csv=p=0 $src
    $dur = [double]::Parse($probe.Trim(), [Globalization.CultureInfo]::InvariantCulture)
    $text = if ($Lang -eq 'en') { $s.En } else { $s.Es }
    $srt = Join-Path $work "$($s.Id).$Lang.srt"
    $srtBody = "1`r`n$(Format-Srt 0.3) --> $(Format-Srt ([Math]::Max(0.5, $dur - 0.3)))`r`n$text`r`n"
    [System.IO.File]::WriteAllText($srt, $srtBody, (New-Object System.Text.UTF8Encoding($false)))

    $out = Join-Path $work "$($s.Id).norm.mp4"
    $srtFilter = Format-FilterPath $srt
    $vf = "scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=0x23272B,setsar=1,fps=30,subtitles='${srtFilter}':force_style='${style}'"
    & ffmpeg -y -loglevel error -i $src -f lavfi -i 'anullsrc=r=48000:cl=stereo' -vf $vf -map 0:v:0 -map 1:a -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p -c:a aac -shortest $out
    if ($LASTEXITCODE -ne 0) { throw "ffmpeg fallo en $($s.Id)" }
    $parts += $out
}

if ($parts.Count -lt 2) { throw 'No hay clips que montar.' }

$list = Join-Path $work 'concat.txt'
$lines = $parts | ForEach-Object { "file '" + ($_ -replace '\\', '/') + "'" }
[System.IO.File]::WriteAllLines($list, $lines, (New-Object System.Text.UTF8Encoding($false)))

& ffmpeg -y -loglevel error -f concat -safe 0 -i $list -c copy $Output
if ($LASTEXITCODE -ne 0) { throw 'La concatenacion fallo.' }
Write-Host "Video listo: $Output" -ForegroundColor Green
