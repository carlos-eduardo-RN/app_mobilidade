# FLUTTER ENVIRONMENT RESTORE - SIMPLE VERSION
# Windows PowerShell
# Copy-paste friendly

Write-Output "`n========================================`n  FLUTTER ENVIRONMENT RESTORE`n========================================`n"

$app_path = "F:\Projetos\VouDeMoto\apps\passageiro\app_passageiro"
$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"

# STEP 1: LOCAL CACHE
Write-Output "[1/6] Limpando cache local..."
cd $app_path
Remove-Item -Force -Path "pubspec.lock" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force -Path "build" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force -Path ".dart_tool" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force -Path "android\.gradle" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force -Path "android\app\build" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force -Path "android\build" -ErrorAction SilentlyContinue
Write-Output "  OK - Cache local removido`n"

# STEP 2: PUB CACHE
Write-Output "[2/6] Limpando Pub cache global..."
$pubcache = "$ENV:APPDATA\.pub-cache"
if (Test-Path $pubcache) {
    Remove-Item -Recurse -Force $pubcache
    Write-Output "  OK - Pub cache removido`n"
} else {
    Write-Output "  OK - Pub cache nao existe`n"
}

# STEP 3: FLUTTER CLEAN
Write-Output "[3/6] Executando flutter clean..."
flutter clean
Write-Output "  OK`n"

# STEP 4: FLUTTER DOCTOR
Write-Output "[4/6] Validando Flutter installation..."
flutter doctor -v
Write-Output "  OK`n"

# STEP 5: PUB GET
Write-Output "[5/6] Restaurando dependencias (pub get)..."
cd $app_path
flutter pub get
if ($LASTEXITCODE -ne 0) {
    Write-Output "  Tentando cache repair..."
    flutter pub cache repair
    flutter pub get
}
Write-Output "  OK`n"

# STEP 6: FLUTTER ANALYZE
Write-Output "[6/6] Analisando codigo (flutter analyze)..."
flutter analyze
Write-Output "  OK`n"

Write-Output "`n========================================`n  Proximos passos:`n========================================`n"
Write-Output "1. flutter run    (para testar em device)`n"
Write-Output "2. flutter build apk --debug    (para gerar APK)`n"
Write-Output "3. adb install -r build/app/outputs/flutter-apk/app-debug.apk`n"
Write-Output "`n SUCESSO! Ambiente restaurado.`n`n"
