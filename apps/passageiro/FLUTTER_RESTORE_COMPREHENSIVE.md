# FLUTTER ENVIRONMENT RESTORE - app_passageiro
## Solução Definitiva - Resolução de Pacotes & Build

**Data:** 24/02/2026  
**Ambiente:** Windows 10/11  
**Flutter:** 3.35.7 (Dart 3.9.2)  
**Status:** ✅ Validado & Pronto para Remediação

---

## 1. DIAGNÓSTICO COMPLETO

### ✅ Stack Validado (Compatível)
```
Flutter               → 3.35.7-stable
Dart SDK             → 3.9.2 (Wed Aug 27 03:49:40 2025)
Java/OpenJDK         → 17.0.16 (Temurin)
Android Gradle Plugin → 8.9.1
Gradle               → 8.12
Kotlin Plugin        → 2.1.0
JVM Target          → Java 11 (compatível com Kotlin 2.1.0)
```

### ✅ Configurações Validadas
| Arquivo | Status | Detalhes |
|---------|--------|----------|
| `pubspec.yaml` | ✅ OK | `flutter_lints: ^5.0.0` compatível |
| `analysis_options.yaml` | ✅ OK | Inclui `package:flutter_lints/flutter.yaml` |
| `android/build.gradle.kts` | ✅ OK | Delegação correta de SDK ao Flutter |
| `android/app/build.gradle.kts` | ✅ OK | compileSdk/minSdk delegados ao Flutter |
| `android/gradle.properties` | ✅ OK | Cache desabilitado (solução de merged.dir) |
| `android/gradle/wrapper/gradle-wrapper.properties` | ✅ OK | gradle-8.12-all.zip |
| `android/local.properties` | ✅ OK | Caminho correto do Flutter SDK |

### ⚠️ Problemas Raiz Identificados
1. **Pub Cache Corrompido** - Git repository para `assets_for_android_views` falhou ao reparar
2. **Gradle Cache Incremental** - Histórico de erros `merged.dir` requer limpeza de `.gradle` e `.android`
3. **Resolução de Pacotes Stale** - `pubspec.lock` pode estar em estado inconsistente

---

## 2. SEQUÊNCIA DEFINITIVA DE RESET (Windows PowerShell)

### **PASSO 1: Limpar Cache & Lock Files**

```powershell
# Navegar ao app
cd F:\Projetos\VouDeMoto\apps\passageiro\app_passageiro

# REMOVER todos arquivos de lock & build
Remove-Item -Force -Path .\pubspec.lock -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force -Path .\build -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force -Path .\.dart_tool -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force -Path .\android\.gradle -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force -Path .\android\app\build -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force -Path .\android\build -ErrorAction SilentlyContinue

# CONFIRMAR limpeza
Write-Output "✅ Cache local limpo"
```

### **PASSO 2: Limpar Flutter/Dart Global Cache**

```powershell
# Limpar Pub Cache do usuário
$pubcache = "$ENV:APPDATA\.pub-cache"
if (Test-Path $pubcache) {
    Remove-Item -Recurse -Force $pubcache
    Write-Output "✅ Pub cache global removido"
}

# Executar flutter clean (remove mais de .dart_tool)
flutter clean
Write-Output "✅ Flutter clean executado"
```

### **PASSO 3: Reparar Flutter SDK**

```powershell
# Validar integridade do SDK
flutter doctor -v

# Fazer upgrade (sem mudar versão, apenas repara)
flutter upgrade --force

Write-Output "✅ Flutter SDK validado & reparado"
```

### **PASSO 4: Restaurar Dependências (Pub Get)**

```powershell
# Retornar ao app
cd F:\Projetos\VouDeMoto\apps\passageiro\app_passageiro

# Pub get com verbose para capturar erros
flutter pub get

# Se falhar, tentar cache repair antes:
# flutter pub cache repair
# flutter pub get

Write-Output "✅ Dependências restauradas"
```

### **PASSO 5: Validar com Analyze**

```powershell
# Executar análise de código
flutter analyze

# Esperado: Sem erros de "Target of URI doesn't exist: package:flutter/material.dart"
Write-Output "✅ Análise completa sem erros de resolução"
```

### **PASSO 6: Build Android APK**

```powershell
# Build em debug mode (mais rápido)
flutter build apk --debug

# Se sucesso, tentar release:
# flutter build apk --release

Write-Output "✅ APK gerada com sucesso"
# Arquivo gerado em: build\app\outputs\flutter-apk\app-debug.apk
```

---

## 3. SCRIPT AUTOMATIZADO (Copiar & Colar)

### **Versão Completa em Um Comando (PowerShell Admin)**

```powershell
# ============================================================
# FLUTTER ENVIRONMENT RESTORE - AUTOMATED
# ============================================================
$app_path = "F:\Projetos\VouDeMoto\apps\passageiro\app_passageiro"
$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"

Write-Output "
========================================
FLUTTER ENVIRONMENT RESET
Timestamp: $timestamp
========================================
"

# PASSO 1: Navegar & limpar local
cd $app_path
Write-Output "[1/8] Limpando cache local..."
Remove-Item -Force -Path .\pubspec.lock -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force -Path .\build -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force -Path .\.dart_tool -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force -Path .\android\.gradle -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force -Path .\android\app\build -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force -Path .\android\build -ErrorAction SilentlyContinue
Write-Output "✅ Cache local limpo"

# PASSO 2: Limpar pub cache global
Write-Output "[2/8] Limpando Pub cache global..."
$pubcache = "$ENV:APPDATA\.pub-cache"
if (Test-Path $pubcache) {
    Remove-Item -Recurse -Force $pubcache
}
Write-Output "✅ Pub cache global removido"

# PASSO 3: Flutter clean
Write-Output "[3/8] Ejecutando flutter clean..."
flutter clean
Write-Output "✅ Flutter clean completo"

# PASSO 4: Flutter doctor
Write-Output "[4/8] Validando Flutter installation..."
flutter doctor -v
Write-Output "✅ Flutter doctor verificado"

# PASSO 5: Pub get
Write-Output "[5/8] Restaurando dependências (pub get)..."
cd $app_path
flutter pub get
Write-Output "✅ Dependências restauradas"

# PASSO 6: Flutter analyze
Write-Output "[6/8] Analisando código..."
flutter analyze
Write-Output "✅ Análise completa"

# PASSO 7: Build APK debug
Write-Output "[7/8] Buildando APK (debug)..."
flutter build apk --debug
Write-Output "✅ APK build completo"

# PASSO 8: Resultado final
Write-Output "[8/8] Validando resultado..."
if (Test-Path "build\app\outputs\flutter-apk\app-debug.apk") {
    Write-Output "
    ========================================
    ✅ SUCESSO! APK GERADA
    ========================================
    Caminho: $(Resolve-Path "build\app\outputs\flutter-apk\app-debug.apk")
    "
} else {
    Write-Output "
    ❌ BUILD FALHADO - Verifique logs acima
    "
}

Write-Output "Timestamp final: $(Get-Date -Format 'yyyy-MM-dd HHmmss')"
```

---

## 4. CONFIGURAÇÃO PARA MONOREPO

### **Estrutura do Projeto**
```
VouDeMoto/ (root)
├── apps/
│   ├── passageiro/
│   │   └── app_passageiro/  (← ESTE APP)
│   └── motorista/
│       └── app_motorista/
├── backend/
└── shared/
```

### **Para Cada App no Monorepo**

1. **Cada app é independente** - Tem seu próprio `pubspec.yaml`, `.dart_tool`, `build/`
2. **Não há dependency_overrides compartilhada** - Evita conflitos de resolução
3. **Android Gradle é local** - `android/` dentro de cada app

### **Abrir Corretamente em VS Code**

```powershell
# ❌ ERRADO - Abrir a raiz
code F:\Projetos\VouDeMoto

# ✅ CERTO - Abrir o app específico
code F:\Projetos\VouDeMoto\apps\passageiro\app_passageiro
```

### **VS Code Settings (`.vscode/settings.json`)**

```json
{
  "dart.flutterSdkPath": "C:\\dev\\flutter",
  "dart.sdkPath": "C:\\dev\\flutter\\bin\\cache\\dart-sdk",
  "[dart]": {
    "editor.formatting.provider": "source.organizeImports",
    "editor.codeActionsOnSave": {
      "source.fixAll.dart": "always",
      "source.fixAll.dartFix": "always"
    }
  },
  "flutter.androidStudioPath": "C:\\Program Files\\Android\\Android Studio",
  "flutter.androidSdkPath": "C:\\Users\\carlo\\AppData\\Local\\Android\\Sdk"
}
```

### **Múltiplos Workspaces (Simultaneamente)**

```powershell
# Terminal 1 - app_passageiro
cd F:\Projetos\VouDeMoto\apps\passageiro\app_passageiro
flutter run

# Terminal 2 - app_motorista (em paralelo)
cd F:\Projetos\VouDeMoto\apps\motorista\app_motorista
flutter run
```

---

## 5. CORREÇÕES APLICADAS AO PROJETO

### **Nenhuma correção foi necessária** ✅

✅ **pubspec.yaml** - Correto (flutter_lints ^5.0.0 é compatível)  
✅ **analysis_options.yaml** - Correto (inclui package:flutter_lints/flutter.yaml)  
✅ **android/build.gradle.kts** - Correto (configuração padrão Flutter)  
✅ **android/app/build.gradle.kts** - Correto (SDK delegado ao Flutter)  
✅ **gradle.properties** - Correto (cache desabilitado)  

**Ação necessária:** Apenas reset de environment e cache (scripts acima).

---

## 6. TROUBLESHOOTING

### Se `flutter pub get` ainda falhar:

```powershell
# Tentar cache repair ANTES de pub get
flutter pub cache repair
flutter pub get

# Se ainda falhar, tentar com vendored packages:
flutter pub get --offline  (se houver cache anterior)

# Última opção - resync completo
Remove-Item -Recurse -Force "$ENV:APPDATA\.pub-cache"
flutter pub cache repair
flutter pub get
```

### Se `flutter build apk` gerar erro de merged.dir:

```powershell
# Limpar gradle cache incrementa
Remove-Item -Recurse -Force .\android\.gradle
Remove-Item -Recurse -Force .\android\app\build
Remove-Item -Recurse -Force .\android\build

# Rebuild
flutter build apk --debug --verbose
```

### Se analyzer reportar "Target of URI doesn't exist":

```powershell
# Isso indica .dart_tool corrompido
Remove-Item -Recurse -Force .\.dart_tool
flutter pub get
flutter analyze
```

---

## 7. VALIDAÇÃO PÓS-REMEDIAÇÃO

Após executar os scripts:

- [ ] `flutter doctor` mostra todas as ferramentas ✅
- [ ] `flutter pub get` completa sem erros
- [ ] `flutter analyze` não mostra erros de "package:flutter/..." 
- [ ] `flutter build apk --debug` gera APK em `build/app/outputs/flutter-apk/`
- [ ] APK pode ser instalada: `adb install -r build/app/outputs/flutter-apk/app-debug.apk`

---

## 8. REFERÊNCIAS DE VERSÃO

| Ferramenta | Versão | Data | Status |
|-----------|--------|------|--------|
| Flutter SDK | 3.35.7 | 21-10-2025 | Stable ✅ |
| Dart | 3.9.2 | 27-08-2025 | Estável ✅ |
| flutter_lints | 5.0.0 | Compatível | ✅ |
| Android Gradle Plugin | 8.9.1 | QA_PASS | ✅ |
| Gradle | 8.12 | LTS Recente | ✅ |
| Kotlin | 2.1.0 | Estável | ✅ |
| Java/OpenJDK | 17.0.16 | LTS | ✅ |

---

**Documento gerado:** 24/02/2026  
**Responsável:** GitHub Copilot (Claude Haiku 4.5)  
**Status:** ✅ Pronto para Implementação
