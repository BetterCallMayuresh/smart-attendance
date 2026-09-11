$mavenPath = "C:\tools\apache-maven-3.9.16\bin"
$oldPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($oldPath -notmatch [regex]::Escape($mavenPath)) {
    $newPath = $oldPath + ";" + $mavenPath
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "Maven added to User PATH"
} else {
    Write-Host "Maven already in User PATH"
}
