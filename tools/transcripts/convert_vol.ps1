# Đề Listening VOL 8, VOL 9 (Word) -> PDF trong "2. LISTENING\_web"
$vol = "C:\Users\Admin\OneDrive\2. IELTS\VOL 1-9 2"
$out = "C:\Users\Admin\OneDrive\2. IELTS\2. LISTENING\_web"
$t = Split-Path -Parent $MyInvocation.MyCommand.Path
$tmp = Join-Path $t "docx"
New-Item -ItemType Directory -Force $out, $tmp | Out-Null
$jobs = @()
foreach ($n in 1..8) {
  $jobs += @{ src = "$vol\VOL 8 - ORIGINAL EXAMS\LISTENING\VOL 8 TEST $n LIS.docx"; name = ("vol8-{0:D2}-paper.pdf" -f $n) }
  $jobs += @{ src = "$vol\VOL 9 - ORIGINAL EXAMS\LISTENING\TEST $n-L.docx"; name = ("vol9-{0:D2}-paper.pdf" -f $n) }
}
foreach ($d in $jobs) {
  if (Test-Path (Join-Path $out $d.name)) { "skip $($d.name)"; continue }
  $local = Join-Path $tmp ($d.name -replace '\.pdf$', '.docx')
  $localPdf = Join-Path $tmp $d.name
  Copy-Item -LiteralPath $d.src $local -Force
  $job = Start-Job -ScriptBlock { param($in, $o)
    $w = New-Object -ComObject Word.Application; $w.Visible = $false; $w.DisplayAlerts = 0
    try { $doc = $w.Documents.Open($in, $false, $true, $false); $doc.ExportAsFixedFormat($o, 17); $doc.Close($false) } finally { $w.Quit() }
  } -ArgumentList $local, $localPdf
  if (-not (Wait-Job $job -Timeout 180)) { Stop-Job $job; Get-Process WINWORD -ErrorAction SilentlyContinue | Stop-Process -Force; "TIMEOUT $($d.name)"; continue }
  Receive-Job $job | Out-Null
  Copy-Item $localPdf (Join-Path $out $d.name) -Force
  "PDF  $($d.name)  $([math]::Round((Get-Item $localPdf).Length/1KB)) KB"
}
