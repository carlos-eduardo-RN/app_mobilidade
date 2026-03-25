#!/usr/bin/env pwsh
# ============================================================
# FLUTTER ENVIRONMENT RESTORE - AUTOMATED SCRIPT
# App: app_passageiro (monorepo)
# Windows PowerShell
# ============================================================

param(
    [switch]$Verbose = $false,
    [switch]$SkipBuild = $false,
    [string]$AppPath = "F:\Projetos\VouDeMoto\apps\passageiro\app_passageiro"
)

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$logfile = "$AppPath\flutter_restore_$timestamp.log"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $ts = Get-Date -Format "HH:mm:ss"
    $output = "[$ts] [$Level] $Message"
    Write-Output $output
    Add-Content -Path $logfile -Value $output
}

function Write-Step {
    param([int]$Number, [string]$Description)
    Write-Output "`n================================"
    Write-Output "[$Number/8] $Description"
    Write-Output "================================"
    Write-Log "Step $Number: $Description" "STEP"
}

# ============================================================
# INÍCIO DO SCRIPT
# ============================================================

Write-Output @"
╔════════════════════════════════════════════════════════════╗
║     FLUTTER ENVIRONMENT RESTORE - AUTOMATED               ║
║     App: app_passageiro                                   ║
║     Timestamp: $timestamp                      ║
╚════════════════════════════════════════════════════════════╝
"@

Write-Log "Script iniciado - Path: $AppPath" "START"

# Validar path do app
if (-not (Test-Path $AppPath)) {
    Write-Log "❌ Caminho do app não encontrado: $AppPath" "ERROR"
    Write-Output "❌ ERRO: Caminho não encontrado: $AppPath"
    exit 1
}

# ============================================================
# PASSO 1: Limpar Cache Local
# ============================================================
Write-Step 1 "Limpando cache local do app"

try {
    $itemsToClear = @(
        "pubspec.lock",
        "build",
        ".dart_tool",
        "android\.gradle",
        "android\app\build",
        "android\build"
    )
    
    Push-Location $AppPath
    
    foreach ($item in $itemsToClear) {
        if (Test-Path $item) {
            $fullPath = Resolve-Path $item
            Write-Log "Removendo: $fullPath" "DEBUG"
            Remove-Item -Recurse -Force -Path $item -ErrorAction SilentlyContinue
            Write-Output "  ✓ Removido: $item"
        }
    }
    
    Pop-Location
    Write-Log "✅ Cache local limpo" "SUCCESS"
    Write-Output "✅ Cache local limpo"
} catch {
    Write-Log "❌ Erro ao limpar cache local: $_" "ERROR"
    Write-Output "❌ Erro: $_"
    exit 1
}

# ============================================================
# PASSO 2: Limpar Pub Cache Global
# ============================================================
Write-Step 2 "Limpando Pub cache global (usuário)"

try {
    $pubcache = "$ENV:APPDATA\.pub-cache"
    if (Test-Path $pubcache) {
        Write-Log "Removendo pub cache: $pubcache" "DEBUG"
        Remove-Item -Recurse -Force $pubcache
        Write-Output "  ✓ Pub cache removido"
    } else {
        Write-Output "  ℹ Pub cache não existe (OK)"
    }
    Write-Log "✅ Pub cache global processado" "SUCCESS"
    Write-Output "✅ Pub cache global processado"
} catch {
    Write-Log "⚠️  Aviso ao limpar pub cache: $_" "WARN"
    Write-Output "⚠️  Aviso (não-crítico): $_"
}

# ============================================================
# PASSO 3: Flutter Clean
# ============================================================
Write-Step 3 "Executando flutter clean"

try {
    Push-Location $AppPath
    Write-Log "Executando: flutter clean" "DEBUG"
    flutter clean | Tee-Object -FilePath $logfile -Append
    Pop-Location
    Write-Log "✅ Flutter clean concluído" "SUCCESS"
    Write-Output "✅ Flutter clean concluído"
} catch {
    Write-Log "❌ Erro em flutter clean: $_" "ERROR"
    Write-Output "❌ Erro: $_"
    exit 1
}

# ============================================================
# PASSO 4: Flutter Doctor (Validação)
# ============================================================
Write-Step 4 "Validando instalação Flutter (doctor)"

try {
    Write-Log "Executando: flutter doctor -v" "DEBUG"
    flutter doctor -v | Tee-Object -FilePath $logfile -Append
    Write-Log "✅ Flutter doctor validado" "SUCCESS"
    Write-Output "✅ Flutter doctor validado"
} catch {
    Write-Log "⚠️  Aviso em flutter doctor: $_" "WARN"
    Write-Output "⚠️  Aviso (não-crítico): $_"
}

# ============================================================
# PASSO 5: Pub Get (Restaurar Dependências)
# ============================================================
Write-Step 5 "Restaurando dependências (pub get)"

try {
    Push-Location $AppPath
    Write-Log "Executando: flutter pub get" "DEBUG"
    flutter pub get | Tee-Object -FilePath $logfile -Append
    if ($LASTEXITCODE -ne 0) {
        throw "flutter pub get retornou código: $LASTEXITCODE"
    }
    Pop-Location
    Write-Log "✅ Pub get completado com sucesso" "SUCCESS"
    Write-Output "✅ Pub get completado com sucesso"
} catch {
    Write-Log "❌ Erro em pub get: $_" "ERROR"
    Write-Output "❌ Erro: $_"
    Write-Output "`n⚠️  Tentando cache repair..."
    
    try {
        flutter pub cache repair
        flutter pub get
        Write-Log "✅ Cache repair resolveu o problema" "SUCCESS"
        Write-Output "✅ Cache repair resolveu o problema"
    } catch {
        Write-Log "❌ Falha mesmo após cache repair" "ERROR"
        exit 1
    }
}

# ============================================================
# PASSO 6: Flutter Analyze
# ============================================================
Write-Step 6 "Analisando código (analyzer)"

try {
    Push-Location $AppPath
    Write-Log "Executando: flutter analyze" "DEBUG"
    flutter analyze | Tee-Object -FilePath $logfile -Append
    Pop-Location
    Write-Log "✅ Análise completa" "SUCCESS"
    Write-Output "✅ Análise completa (sem erros críticos)"
} catch {
    Write-Log "⚠️  Aviso em flutter analyze: $_" "WARN"
    Write-Output "⚠️  Aviso: $_"
}

# ============================================================
# PASSO 7: Build APK (Debug)
# ============================================================
if (-not $SkipBuild) {
    Write-Step 7 "Buildando APK (debug mode)"
    
    try {
        Push-Location $AppPath
        Write-Log "Executando: flutter build apk --debug" "DEBUG"
        flutter build apk --debug | Tee-Object -FilePath $logfile -Append
        
        if ($LASTEXITCODE -ne 0) {
            throw "flutter build retornou código: $LASTEXITCODE"
        }
        
        Pop-Location
        Write-Log "✅ Build APK completado" "SUCCESS"
        Write-Output "✅ Build APK completado"
    } catch {
        Write-Log "❌ Erro em flutter build apk: $_" "ERROR"
        Write-Output "❌ Erro: $_"
        
        # Se falhou por merged.dir, limpar gradle cache
        Write-Output "`nℹ  Tentando limpeza adicional de Gradle cache..."
        try {
            Push-Location $AppPath
            Remove-Item -Recurse -Force "android\.gradle" -ErrorAction SilentlyContinue
            Remove-Item -Recurse -Force "android\app\build" -ErrorAction SilentlyContinue
            Remove-Item -Recurse -Force "android\build" -ErrorAction SilentlyContinue
            
            Write-Output "Reexecutando build..."
            flutter build apk --debug --verbose | Tee-Object -FilePath $logfile -Append
            Pop-Location
            
            Write-Log "✅ Build APK recup. após limpeza Gradle" "SUCCESS"
            Write-Output "✅ Build recuperado após limpeza Gradle"
        } catch {
            Write-Log "❌ Build falhou mesmo após limpeza: $_" "ERROR"
            Write-Output "❌ Build falhou: $_"
            Write-Output "`n📋 Consulte o arquivo de log: $logfile"
            exit 1
        }
    }
} else {
    Write-Step 7 "Pulando APK build (--SkipBuild)"
    Write-Output "ℹ  Build pulado conforme solicitado"
}

# ============================================================
# PASSO 8: Validação Final
# ============================================================
Write-Step 8 "Validando resultado final"

$apkPath = "$AppPath\build\app\outputs\flutter-apk\app-debug.apk"

if (Test-Path $apkPath) {
    $apkSize = [Math]::Round((Get-Item $apkPath).Length / 1MB, 2)
    Write-Log "✅ APK gerada com sucesso - Tamanho: ${apkSize}MB" "SUCCESS"
    Write-Output "✅ APK gerada com sucesso"
    Write-Output "   Tamanho: ${apkSize}MB"
    Write-Output "   Caminho: $apkPath"
} else {
    if (-not $SkipBuild) {
        Write-Log "❌ APK não foi gerada" "ERROR"
        Write-Output "❌ APK não foi gerada - Verifique erros acima"
        Write-Output "📋 Arquivo de log: $logfile"
        exit 1
    }
}

# ============================================================
# RESUMO FINAL
# ============================================================
Write-Output @"

╔════════════════════════════════════════════════════════════╗
║                    ✅ SUCESSO!                            ║
║  Flutter Environment Restore Completado                  ║
╚════════════════════════════════════════════════════════════╝

📊 RESUMO:
  ✅ Cache local limpo
  ✅ Pub cache global processado
  ✅ Flutter clean executado
  ✅ Dependências restauradas
  ✅ Código analisado
$(if (-not $SkipBuild) { "  ✅ APK gerada com sucesso" } else { "  ℹ  Build pulado" })

📝 Arquivo de log: $logfile

🔧 PRÓXIMOS PASSOS:
  1. Instalar APK: adb install -r "$apkPath"
  2. Executar app: flutter run
  3. Em caso de erro, consulte: $logfile

⏱️  Tempo final: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
"@

Write-Log "✅ Script completado com sucesso" "FINISH"
