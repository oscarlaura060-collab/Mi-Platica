$env:JAVA_HOME = 'C:\dev\FinZen\tools\jdk17'
$env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:PATH"
Set-Location C:\dev\FinZen\android
& .\gradlew.bat assembleRelease 2>&1 | Tee-Object -FilePath C:\dev\FinZen\build.log
Write-Host "exit=$LASTEXITCODE  log=C:\dev\FinZen\build.log"
