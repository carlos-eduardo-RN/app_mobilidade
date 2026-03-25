# CONFIGURAÇÃO MONOREPO - VouDeMoto
## Estrutura & Boas Práticas para Flutter Apps

---

## 1. ESTRUTURA DO MONOREPO

```
VouDeMoto/ (workspace root)
│
├── apps/                          # Flutter apps
│   ├── passageiro/                # App do passageiro
│   │   └── app_passageiro/        # ← Projeto Flutter completo
│   │       ├── android/           # Gradle Android (local)
│   │       ├── ios/               # iOS (local)
│   │       ├── lib/               # Código Dart
│   │       ├── pubspec.yaml       # Dependências do app
│   │       ├── analysis_options.yaml
│   │       └── ...
│   │
│   └── motorista/                 # App do motorista
│       └── app_motorista/         # ← Projeto Flutter completo
│           ├── android/
│           ├── ios/
│           ├── lib/
│           ├── pubspec.yaml
│           └── ...
│
├── backend/                       # Backend (Node.js/NestJS)
│   ├── src/
│   ├── package.json
│   └── ...
│
├── shared/                        # Código compartilhado (Dart/TypeScript)
│   ├── contracts/
│   └── ...
│
└── docs/                          # Documentação geral
```

---

## 2. PRINCÍPIOS DE PROJETO

### ✅ Cada App é INDEPENDENTE

```yaml
# ✅ CORRETO - Cada app tem suas próprias dependências
apps/
├── passageiro/app_passageiro/
│   ├── pubspec.yaml          # Suas dependências
│   ├── pubspec.lock          # Seu lock file
│   └── .dart_tool/           # Seu cache local
│
└── motorista/app_motorista/
    ├── pubspec.yaml          # Suas dependências
    ├── pubspec.lock          # Seu lock file
    └── .dart_tool/           # Seu cache local
```

### ❌ NÃO há dependency_overrides compartilhadas

```yaml
# ❌ EVITAR
# Não lugar em lógica de resolução compartilhada
# Cada app resolve suas próprias dependências
```

### ✅ Android Gradle é Local por App

```
each app has its own android/
├── build.gradle.kts
├── app/build.gradle.kts
├── gradle/wrapper/gradle-wrapper.properties
└── local.properties (apontará para Flutter SDK global)
```

---

## 3. ABRIR PROJETOS CORRETAMENTE

### VS Code - Abrir App Individual

```powershell
# ✅ CORRETO - Abrir o app específico
code F:\Projetos\VouDeMoto\apps\passageiro\app_passageiro

# onda você verá:
# - pubspec.yaml (dependências do app)
# - .dart_tool/ (cache do app)
# - analysis somente do app atual
```

### ❌ INCORRETO

```powershell
# ❌ NÃO fazer isso - abre a raiz
code F:\Projetos\VouDeMoto

# Problemas:
# - Dart analyzer tenta analisar TODO o workspace
# - Múltiplos pubspec.yaml confundem o Dart
# - Flutter não sabe qual app buildear
```

### VS Code Settings por App

Cada app precisa ter `.vscode/settings.json`:

```json
{
  "dart.flutterSdkPath": "C:\\dev\\flutter",
  "dart.sdkPath": "C:\\dev\\flutter\\bin\\cache\\dart-sdk",
  "[dart]": {
    "editor.formatting.provider": "source.organizeImports",
    "editor.codeActionsOnSave": {
      "source.fixAll.dart": "always"
    }
  },
  "flutter.androidStudioPath": "C:\\Program Files\\Android\\Android Studio",
  "flutter.androidSdkPath": "C:\\Users\\carlo\\AppData\\Local\\Android\\Sdk",
  "python-envs.defaultEnvManager": "ms-python.python:system",
  "python-envs.pythonProjects": []
}
```

---

## 4. EXECUTAR & DESENVOLVER EM PARALELO

### Terminal 1: Passageiro App

```powershell
cd F:\Projetos\VouDeMoto\apps\passageiro\app_passageiro
flutter run -d <device_id>  # ou flutter run (default device)
```

### Terminal 2: Motorista App

```powershell
cd F:\Projetos\VouDeMoto\apps\motorista\app_motorista
flutter run -d <another_device>
```

### Terminal 3: Backend

```powershell
cd F:\Projetos\VouDeMoto\backend
npm run dev
```

**Todos rodando em paralelo, cada um com seu próprio contexto.**

---

## 5. BUILD & DEPLOYMENT

### Build Individual de cada App

```powershell
# Passageiro
cd F:\Projetos\VouDeMoto\apps\passageiro\app_passageiro
flutter build apk --release
# Output: build/app/outputs/flutter-apk/app-release.apk

# Motorista
cd F:\Projetos\VouDeMoto\apps\motorista\app_motorista
flutter build apk --release
# Output: build/app/outputs/flutter-apk/app-release.apk
```

### Instalação Individual

```powershell
# Passageiro
adb install -r F:\Projetos\VouDeMoto\apps\passageiro\app_passageiro\build\app\outputs\flutter-apk\app-debug.apk

# Motorista
adb install -r F:\Projetos\VouDeMoto\apps\motorista\app_motorista\build\app\outputs\flutter-apk\app-debug.apk
```

---

## 6. COMPARTILHAMENTO DE CÓDIGO

### Shared Contracts (Tipo compartilhado)

Se ambos os apps precisam dos mesmos tipos de dados (Ex: GPS Location, Ride Info), use `shared/contracts/`:

```dart
// shared/contracts/location.dart
class Location {
  final double latitude;
  final double longitude;
  
  Location({required this.latitude, required this.longitude});
}
```

**Importar em ambos os apps:**

```yaml
# apps/passageiro/app_passageiro/pubspec.yaml
dependencies:
  app_passageiro:
    path: ../../

# apps/motorista/app_motorista/pubspec.yaml
dependencies:
  app_motorista:
    path: ../../
```

---

## 7. TROUBLESHOOTING MONOREPO

### Problema: "pubspec not found"

```
❌ Você está na pasta raiz
cd VouDeMoto  ← ERRADO

✅ Vá para o app específico
cd apps/passageiro/app_passageiro  ← CORRETO
```

### Problema: "Multiple pubspec.yaml found"

```
❌ VS Code está analisando todo o workspace
✅ Feche a raiz e abra apenas o app:
code apps/passageiro/app_passageiro
```

### Problema: ".dart_tool corruption"

```powershell
# Cada app tem seu próprio .dart_tool
# Se um está corrompido, limpar só aquele:
cd apps/passageiro/app_passageiro
Remove-Item -Recurse -Force .dart_tool
flutter pub get
```

### Problema: "Android/Gradle conflict"

```powershell
# Cada app tem seu próprio android/ com seu próprio local.properties
# Cada um aponta para o MESMO Flutter SDK global:
cat apps/passageiro/app_passageiro/android/local.properties
# flutter.sdk=C:\dev\flutter

cat apps/motorista/app_motorista/android/local.properties
# flutter.sdk=C:\dev\flutter (IGUAL)
```

---

## 8. GIT & CONTROL DE VERSÃO

### .gitignore - Aplicar em cada app

```
# apps/passageiro/app_passageiro/.gitignore
build/
.dart_tool/
pubspec.lock  (⚠️ Incluir no git!)
.gradle/
.android/
.idea/
*.iml
```

### Commit & Push

```bash
# Todos os apps podem ser commitados juntos
git add apps/
git commit -m "feat: update passageiro and motorista apps"
git push
```

---

## 9. CI/CD CONSIDERATIONS

### GitHub Actions / GitLab CI

Para um monorepo com múltiplos Flutter apps:

```yaml
# .github/workflows/flutter-build.yml
name: Flutter Build

on: [push, pull_request]

jobs:
  build-passageiro:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: subosito/flutter-action@v2
      - run: cd apps/passageiro/app_passageiro && flutter build apk

  build-motorista:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: subosito/flutter-action@v2
      - run: cd apps/motorista/app_motorista && flutter build apk
```

---

## 10. RESUMO DE COMANDOS ESSENCIAIS

```powershell
# ========== PASSAGEIRO ==========
cd F:\Projetos\VouDeMoto\apps\passageiro\app_passageiro

# Restaurar ambiente
powershell -ExecutionPolicy Bypass -File restore_flutter_env.ps1

# Desenvolver
flutter run

# Build APK
flutter build apk --debug
flutter build apk --release

# Análise
flutter analyze

# ========== MOTORISTA ==========
cd F:\Projetos\VouDeMoto\apps\motorista\app_motorista

# (Mesmos comandos)
flutter run
flutter build apk --debug
```

---

## 11. REFERÊNCIA RÁPIDA

| Tarefa | Comando |
|--------|---------|
| Abrir app em VS Code | `code apps/passageiro/app_passageiro` |
| Rodar app | `cd apps/passageiro/app_passageiro && flutter run` |
| Limpar cache | `cd apps/passageiro/app_passageiro && flutter clean` |
| Restaurar deps | `cd apps/passageiro/app_passageiro && flutter pub get` |
| Build APK | `cd apps/passageiro/app_passageiro && flutter build apk --debug` |
| Instalar APK | `adb install -r build/app/outputs/flutter-apk/app-debug.apk` |
| Rodar testes | `cd apps/passageiro/app_passageiro && flutter test` |

---

**Estrutura criada:** 24/02/2026  
**Compatível com:** Flutter 3.35.7 + Dart 3.9.2
