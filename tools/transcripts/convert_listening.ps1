# Tạo file cho web trong "2. LISTENING\_web": đề Word -> PDF, audio WMA/WAV -> M4A
$root = "C:\Users\Admin\OneDrive\2. IELTS\2. LISTENING"
$fc = Join-Path $root "FORECAST"
$out = Join-Path $root "_web"
New-Item -ItemType Directory -Force $out | Out-Null
$sp = Split-Path -Parent $MyInvocation.MyCommand.Path

function Find1($dir, $pattern) {
  $f = Get-ChildItem -LiteralPath $dir -File | Where-Object { $_.Name -like $pattern } | Select-Object -First 1
  if (-not $f) { throw "Not found: $dir\$pattern" }
  return $f.FullName
}

# ---- Word -> PDF ----
$docs = @(
  @{ src = (Find1 "$fc\TEST 2" "*formatted*.docx"); name = "forecast-02-paper.pdf" },
  @{ src = (Find1 "$fc\TEST 4" "*formatted*.docx"); name = "forecast-04-paper.pdf" },
  @{ src = (Find1 "$fc\TEST 11" "*.docx"); name = "forecast-11-paper.pdf" },
  @{ src = (Find1 "$fc\TEST 12" "*.docx"); name = "forecast-12-paper.pdf" },
  @{ src = (Find1 "$fc\TEST 16" "*.docx"); name = "forecast-16-paper.pdf" },
  @{ src = (Find1 "$fc\TEST 19" "*.docx"); name = "forecast-19-paper.pdf" }
)
# Chép ra thư mục tạm trước (mở thẳng file đang đồng bộ OneDrive làm Word bị treo)
$tmp = Join-Path $sp "docx"
New-Item -ItemType Directory -Force $tmp | Out-Null
foreach ($d in $docs) {
  $local = Join-Path $tmp ($d.name -replace '\.pdf$', '.docx')
  $localPdf = Join-Path $tmp $d.name
  Copy-Item -LiteralPath $d.src $local -Force
  $job = Start-Job -ScriptBlock { param($in, $o)
    $w = New-Object -ComObject Word.Application; $w.Visible = $false; $w.DisplayAlerts = 0
    try { $doc = $w.Documents.Open($in, $false, $true, $false); $doc.ExportAsFixedFormat($o, 17); $doc.Close($false) } finally { $w.Quit() }
  } -ArgumentList $local, $localPdf
  if (-not (Wait-Job $job -Timeout 120)) { Stop-Job $job; Get-Process WINWORD -ErrorAction SilentlyContinue | Stop-Process -Force; "TIMEOUT $($d.name)"; continue }
  Receive-Job $job | Out-Null
  Copy-Item $localPdf (Join-Path $out $d.name) -Force
  "PDF  $($d.name)  $([math]::Round((Get-Item $localPdf).Length/1KB)) KB"
}

# ---- Audio -> M4A ----
$aud = @(
  @{ src = (Find1 "$fc\TEST 8" "*.wma"); name = "forecast-08-p1.m4a" },
  @{ src = (Find1 "$fc\TEST 15" "*.wav"); name = "forecast-15-full.m4a" },
  @{ src = (Find1 "$fc\TEST 17" "04*.wma"); name = "forecast-17-p4.m4a" },
  @{ src = (Find1 "$fc\TEST 19" "*task2.wma"); name = "forecast-19-p2.m4a" },
  @{ src = (Find1 "$fc\TEST 19" "*task3.wma"); name = "forecast-19-p3.m4a" },
  @{ src = (Find1 "$fc\TEST 19" "*task4.wma"); name = "forecast-19-p4.m4a" }
)
foreach ($a in $aud) {
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $sp "transcode.ps1") -Src $a.src -OutDir $out -OutName $a.name
}
