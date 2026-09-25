param([Parameter(Mandatory=$true)][string]$InputPptx,[Parameter(Mandatory=$true)][string]$OutputDirectory)
$ErrorActionPreference='Stop'
$source=(Resolve-Path -LiteralPath $InputPptx).Path
$out=[IO.Path]::GetFullPath($OutputDirectory)
if(Test-Path -LiteralPath $out){throw 'Use a fresh output directory'}
New-Item -ItemType Directory -Path $out | Out-Null
$app=New-Object -ComObject PowerPoint.Application
$deck=$null
try {
  $deck=$app.Presentations.Open($source,$true,$false,$false)
  for($i=1;$i -le $deck.Slides.Count;$i++){$deck.Slides.Item($i).Export((Join-Path $out ('{0:000}.png' -f $i)),'PNG',1200,675)}
  @{source=$source;renderer='Microsoft PowerPoint COM';slides=$deck.Slides.Count;slideshowPlaybackTested=$false} | ConvertTo-Json | Out-File (Join-Path $out 'render-receipt.json') -Encoding utf8
} finally {if($deck){$deck.Close()};if($app){$app.Quit()}}
