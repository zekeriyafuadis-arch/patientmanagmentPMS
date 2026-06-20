# Register a daily backup via Windows Task Scheduler (run once as Administrator)
# Adjust paths and time (20:00 = 8 PM clinic close) as needed.

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $Node) { Write-Error "Node.js not found in PATH"; exit 1 }

$Action = New-ScheduledTaskAction -Execute $Node -Argument "`"$ProjectRoot\scripts\backup-database.js`"" -WorkingDirectory $ProjectRoot
$Trigger = New-ScheduledTaskTrigger -Daily -At "20:00"
$Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName "PMS Daily Backup" -Action $Action -Trigger $Trigger -Settings $Settings -Description "Daily SQLite backup for Patient Management System"

Write-Host "Scheduled task 'PMS Daily Backup' registered for 20:00 daily."
