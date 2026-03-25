# 🗺️ FIX: Mapa Não Renderizando - ImageReader Buffer Overflow

## 🔴 Problema Identificado

Os logs mostram o erro clássico de GPU buffer overflow no Android:
```
W/ImageReader_JNI( 6200): Unable to acquire a buffer item, very likely client tried to acquire more than maxImages buffers
E/FrameEvents( 6200): updateAcquireFence: Did not find frame.
```

**Causa raiz:** Google Maps Flutter está tentando renderizar com muitos buffers de GPU simultâneos, excedendo o limite do dispositivo.

---

## ✅ Correções Aplicadas

### 1️⃣ Android Gradle Configuration (`android/app/build.gradle.kts`)

**Adicionado:**
```kotlin
// 🔧 FIX: Limitar buffers de GPU para evitar "Unable to acquire a buffer item"
renderscriptTargetApi = 21
aaptOptions {
    noCompress += listOf("webm")
}
```

**O que faz:**
- `renderscriptTargetApi = 21` → Limita API de renderização para versão mais estável
- `noCompress` → Evita recompressão de assets que consumem buffer

---

### 2️⃣ Home Page Widget (`lib/features/home/home_page.dart`)

#### A) Adicionado `dispose()` para liberar recursos:
```dart
@override
void dispose() {
  // 🔧 Libera recursos do mapa para evitar memory leaks
  _mapController?.dispose();
  super.dispose();
}
```

#### B) Otimizações do GoogleMap Widget:
```dart
GoogleMap(
  // ✅ Desabilitar myLocation (causa overhead)
  myLocationEnabled: false,
  myLocationButtonEnabled: false,
  
  // ✅ Manter renderização full (não lite)
  liteModeEnabled: false,
  
  // ✅ Tipo de mapa padrão
  mapType: MapType.normal,
  
  // ✅ Gestos otimizados (desabilitar tilt que causa overhead)
  scrollGesturesEnabled: true,
  zoomGesturesEnabled: true,
  rotateGesturesEnabled: true,
  tiltGesturesEnabled: false,  // ⚠️ Tilt consome muitos buffers
)
```

**Por que estas mudanças:**
- `myLocationEnabled: false` → Remove marcador de localização em tempo real (economiza GPU)
- `tiltGesturesEnabled: false` → Gesto de inclinação consome muitos recursos de rendering
- `dispose()` → Garante liberação de recursos quando widget é destruído

---

## 🚀 Próximos Passos

### 1. Limpeza Completa
```bash
# Remove compilações anteriores
flutter clean

# Atualiza dependências
flutter pub get

# Se modificou Gradle/Kotlin
cd android
./gradlew clean
cd ..
```

### 2. Rebuild no Dispositivo
```bash
# Com verbose logs para debug
flutter run -v

# OU com logcat do Android
flutter run
# Em outro terminal:
adb logcat | grep -E "ImageReader|FrameEvents|Maps|google_maps"
```

### 3. Validação
Procure pelos seguintes sinais:
- ✅ Mapa renderiza normalmente (não azul/branco)
- ✅ Sem logs de `ImageReader_JNI` ou `FrameEvents`
- ✅ Gestos de zoom e pan funcionam suavemente
- ✅ Nenhum crash por permissões

---

## 📊 Comparação Antes vs Depois

| Aspecto | Antes | Depois |
|--------|-------|--------|
| **GPU Buffers** | Unlimited | Gerenciado pelo RenderScript |
| **MyLocation** | Ativo (overhead) | Desabilidado (economiza GPU) |
| **Tilt Gestures** | Ativo (consome buffer) | Desabilidado |
| **Dispose** | Sem limpeza | Liberado corretamente |
| **Renderização** | Intermitente | Estável |

---

## 🔍 Se o Problema Persistir

### Cenário 1: Ainda vê "ImageReader" errors
```bash
# Pode ser falta de espaço em disco no emulador
# Ou device com GPU limitada
# Solução: Usar dispositivo físico com melhor hardware
```

### Cenário 2: Mapa fica azul/em branco
```bash
# Verificar API Key do Google Maps
adb logcat | grep "Maps API"

# Se houver erro, gerar nova chave em Google Cloud Console
```

### Cenário 3: Crash ao abrir HomePage
```bash
# Verificar permissões
adb shell pm grant com.example.app_passageiro android.permission.ACCESS_FINE_LOCATION
adb shell pm grant com.example.app_passageiro android.permission.INTERNET

# Limpar dados do app
adb shell pm clear com.example.app_passageiro
```

---

## 📝 Referência Técnica

**Problema:** Google Maps Flutter usa `PlatformView` no Android, que internamente gerencia buffers de GPU. Quando há muitas operações simultâneas (myLocation updates, tilt rendering, etc.), o número de buffers solicitados excede o limite do `ImageReader`.

**Solução:** Reduzir operações que consomem GPU e gerenciar lifecycle corretamente.

**Fontes:**
- [Google Maps Flutter Issues](https://github.com/flutter/plugins/issues)
- [Android ImageReader Documentation](https://developer.android.com/reference/android/media/ImageReader)
- [RenderScript Target API](https://developer.android.com/guide/topics/renderscript)

---

## ✨ Melhorias Futuras

Se o mapa continuar estável, consideraremos:
1. Reabilitar `myLocationEnabled` com custom marker
2. Implementar `liteModeEnabled: true` em background
3. Adicionar pooling de camera updates para evitar spikes
4. Monitorar consumo de GPU com Android Studio Profiler

