#!/bin/bash

# 🗺️ Script de Validação - Map Rendering Fix
# Testa as correções aplicadas para ImageReader buffer overflow

echo "================================================"
echo "🗺️  VALIDAÇÃO DO FIX - MAP RENDERING"
echo "================================================"
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para validar arquivo
validate_file() {
    local file=$1
    local search_term=$2
    local description=$3
    
    echo "🔍 Verificando: $description"
    if grep -q "$search_term" "$file"; then
        echo -e "${GREEN}✅ ENCONTRADO${NC}: $search_term"
        echo ""
    else
        echo -e "${RED}❌ NÃO ENCONTRADO${NC}: $search_term"
        echo "   Arquivo: $file"
        echo ""
    fi
}

# ==============================================================================
# 1️⃣ VERIFICAR BUILD.GRADLE.KTS
# ==============================================================================

echo -e "${YELLOW}1️⃣  VERIFICANDO BUILD.GRADLE.KTS${NC}"
echo "---"

validate_file "android/app/build.gradle.kts" \
    "renderscriptTargetApi = 21" \
    "RenderScript API Target 21"

validate_file "android/app/build.gradle.kts" \
    "aaptOptions" \
    "AAPT Options Configuration"

# ==============================================================================
# 2️⃣ VERIFICAR HOME_PAGE.DART
# ==============================================================================

echo -e "${YELLOW}2️⃣  VERIFICANDO HOME_PAGE.DART${NC}"
echo "---"

validate_file "lib/features/home/home_page.dart" \
    "@override" \
    "Override dispose() method"

validate_file "lib/features/home/home_page.dart" \
    "_mapController?.dispose()" \
    "GoogleMapController dispose call"

validate_file "lib/features/home/home_page.dart" \
    "myLocationEnabled: false" \
    "MyLocation disabled"

validate_file "lib/features/home/home_page.dart" \
    "tiltGesturesEnabled: false" \
    "Tilt gestures disabled"

validate_file "lib/features/home/home_page.dart" \
    "liteModeEnabled: false" \
    "Lite mode configuration"

# ==============================================================================
# 3️⃣ VERIFICAR DEPENDÊNCIAS
# ==============================================================================

echo -e "${YELLOW}3️⃣  VERIFICANDO DEPENDÊNCIAS${NC}"
echo "---"

if [ -f "pubspec.lock" ]; then
    echo "✅ pubspec.lock existe"
    
    if grep -q "google_maps_flutter" "pubspec.lock"; then
        echo "✅ google_maps_flutter está instalado"
    else
        echo "❌ google_maps_flutter NÃO encontrado"
    fi
else
    echo "⚠️  pubspec.lock não encontrado (executar: flutter pub get)"
fi
echo ""

# ==============================================================================
# 4️⃣ PRÓXIMOS PASSOS
# ==============================================================================

echo -e "${YELLOW}4️⃣  PRÓXIMOS PASSOS${NC}"
echo "---"
echo ""
echo "Execute na sequência:"
echo ""
echo "  1️⃣  Limpeza completa:"
echo "     $ flutter clean"
echo "     $ flutter pub get"
echo ""
echo "  2️⃣  Se modificou Gradle:"
echo "     $ cd android && ./gradlew clean && cd .."
echo ""
echo "  3️⃣  Rebuild com verbose:"
echo "     $ flutter run -v"
echo ""
echo "  4️⃣  Em outro terminal, monitore logs:"
echo "     $ adb logcat | grep -E 'ImageReader|FrameEvents|Maps|google_maps'"
echo ""
echo "  5️⃣  Procure por:"
echo "     ✅ Mapa renderiza normalmente"
echo "     ✅ Sem 'Unable to acquire a buffer item'"
echo "     ✅ Gestos funcionam suavemente"
echo "     ✅ Sem crashes de permissões"
echo ""

# ==============================================================================
# 5️⃣ LIMPEZA RÁPIDA
# ==============================================================================

echo -e "${YELLOW}5️⃣  EXECUTAR LIMPEZA? (s/n)${NC}"
read -p "Deseja executar 'flutter clean' agora? " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo "🧹 Executando flutter clean..."
    flutter clean
    echo "📦 Executando flutter pub get..."
    flutter pub get
    echo ""
    echo -e "${GREEN}✅ LIMPEZA CONCLUÍDA${NC}"
else
    echo "⏭️  Pule para: flutter clean"
fi

echo ""
echo "================================================"
echo "🎉 VALIDAÇÃO COMPLETA"
echo "================================================"

