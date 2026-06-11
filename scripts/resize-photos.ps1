# One-time photo import for /photography. Resizes to long edge 2000px, JPEG q82,
# re-encode drops EXIF. Sources stay untouched in Pictures\Film.
Add-Type -AssemblyName System.Drawing

$dest = Join-Path $PSScriptRoot "..\public\photography"
New-Item -ItemType Directory -Force $dest | Out-Null

$film = "C:\Users\Verrel\Pictures\Film"
$picks = @(
  @{ src = "016 FC2 #8\Edited Export\000137130020.jpg";  out = "braga-night.jpg" },
  @{ src = "008 KG2 #2\000038.JPG";                      out = "rooftops-water-tower.jpg" },
  @{ src = "017 FC2 #9\Edited Export\000165220003.jpg";  out = "pertamina-night.jpg" },
  @{ src = "017 FC2 #9\Edited Export\000165220016.jpg";  out = "taps-and-sneakers.jpg" },
  @{ src = "015 FC2 #7\000018.JPG";                      out = "night-wagon.jpg" },
  @{ src = "016 FC2 #8\Edited Export\000137130013.jpg";  out = "checkerboard-sky.jpg" },
  @{ src = "004 KC2 #1\instaxfilmlab66034.jpg";          out = "dusk-silhouette.jpg" },
  @{ src = "017 FC2 #9\Edited Export\000165220021.jpg";  out = "supermarket-corridor.jpg" },
  @{ src = "011 KC2 #6\000015970013.jpg";                out = "blue-car.jpg" },
  @{ src = "004 KC2 #1\instaxfilmlab66046.jpg";          out = "shell-dusk.jpg" },
  @{ src = "009 KC2 #5\000015990014.jpg";                out = "landrover-alley.jpg" },
  @{ src = "017 FC2 #9\Edited Export\000165220008.jpg";  out = "dj-decks.jpg" },
  @{ src = "006 KC2 #3\instaxfilmlab71536.jpg";          out = "dirt-road-sign.jpg" },
  @{ src = "002 FC2 #2\instaxfilmlab58633.jpg";          out = "watchtower.jpg" },
  @{ src = "017 FC2 #9\Edited Export\000165220028.jpg";  out = "converse-rack.jpg" }
)

$enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]82)

foreach ($p in $picks) {
  $srcPath = Join-Path $film $p.src
  $outPath = Join-Path $dest $p.out
  $img = [System.Drawing.Image]::FromFile($srcPath)
  try {
    $long = [Math]::Max($img.Width, $img.Height)
    $scale = if ($long -gt 2000) { 2000 / $long } else { 1 }
    $w = [int]([Math]::Round($img.Width * $scale))
    $h = [int]([Math]::Round($img.Height * $scale))
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.DrawImage($img, 0, 0, $w, $h)
    $bmp.Save($outPath, $enc, $ep)
    $g.Dispose(); $bmp.Dispose()
    "{0}  {1}x{2}  {3:N0} KB" -f $p.out, $w, $h, ((Get-Item $outPath).Length / 1KB)
  } finally {
    $img.Dispose()
  }
}
