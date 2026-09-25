Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$asTaskOp = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
function AwaitOp($op, [type]$t) { $task = $asTaskOp.MakeGenericMethod($t).Invoke($null, @($op)); $task.Wait(-1) | Out-Null; $task.Result }
Get-ChildItem "C:\Users\Admin\OneDrive\2. IELTS\2. LISTENING\_web" -Filter "*-p?.m4a" | Sort-Object Name | ForEach-Object {
  $f = AwaitOp ([Windows.Storage.StorageFile]::GetFileFromPathAsync($_.FullName)) ([Windows.Storage.StorageFile])
  $p = AwaitOp ($f.Properties.GetMusicPropertiesAsync()) ([Windows.Storage.FileProperties.MusicProperties])
  "{0} {1:N0}" -f $_.BaseName, $p.Duration.TotalSeconds
}
