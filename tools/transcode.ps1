param([string]$Src, [string]$OutDir, [string]$OutName, [double]$Start = -1, [double]$Stop = -1, [string]$Format = "m4a")
# Chuyển / cắt audio bằng Windows Media Foundation — không cần cài thêm gì.
#   -Start/-Stop (giây): chỉ lấy đoạn này.  -Format m4a (AAC) | wav (PCM, để phân tích khoảng lặng)
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Storage.StorageFolder, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Media.Transcoding.MediaTranscoder, Windows.Media, ContentType = WindowsRuntime]
$null = [Windows.Media.MediaProperties.MediaEncodingProfile, Windows.Media, ContentType = WindowsRuntime]

$ext = [System.WindowsRuntimeSystemExtensions].GetMethods()
$asTaskOp = $ext | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
$asTaskActP = $ext | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncActionWithProgress`1' } | Select-Object -First 1
function AwaitOp($op, [type]$t) { $task = $asTaskOp.MakeGenericMethod($t).Invoke($null, @($op)); $task.Wait(-1) | Out-Null; $task.Result }

$in = AwaitOp ([Windows.Storage.StorageFile]::GetFileFromPathAsync($Src)) ([Windows.Storage.StorageFile])
$folder = AwaitOp ([Windows.Storage.StorageFolder]::GetFolderFromPathAsync($OutDir)) ([Windows.Storage.StorageFolder])
$out = AwaitOp ($folder.CreateFileAsync($OutName, [Windows.Storage.CreationCollisionOption]::ReplaceExisting)) ([Windows.Storage.StorageFile])
if ($Format -eq "wav") {
  $profile = [Windows.Media.MediaProperties.MediaEncodingProfile]::CreateWav([Windows.Media.MediaProperties.AudioEncodingQuality]::Low)
} else {
  $profile = [Windows.Media.MediaProperties.MediaEncodingProfile]::CreateM4a([Windows.Media.MediaProperties.AudioEncodingQuality]::Medium)
}
$tr = New-Object Windows.Media.Transcoding.MediaTranscoder
if ($Start -ge 0) { $tr.TrimStartTime = [TimeSpan]::FromSeconds($Start) }
# Thực tế TrimStopTime là thời điểm dừng tính từ đầu file (đã kiểm chứng bằng độ dài file đầu ra)
if ($Stop -gt 0) { $tr.TrimStopTime = [TimeSpan]::FromSeconds($Stop) }
$prep = AwaitOp ($tr.PrepareFileTranscodeAsync($in, $out, $profile)) ([Windows.Media.Transcoding.PrepareTranscodeResult])
if (-not $prep.CanTranscode) { throw "Cannot transcode: $($prep.FailureReason)" }
$task = $asTaskActP.MakeGenericMethod([double]).Invoke($null, @($prep.TranscodeAsync()))
$task.Wait(-1) | Out-Null
if ($task.IsFaulted) { throw $task.Exception }
$len = (Get-Item (Join-Path $OutDir $OutName)).Length
"OK $OutName $([math]::Round($len/1MB,1)) MB"
