#!/bin/bash
# Script de validação rápida - Google Maps Fix

echo "🔍 VALIDANDO CORREÇÕES DO GOOGLE MAPS"
echo "========================================"
echo ""

# Verificação 1: INTERNET permission
echo "1️⃣ Verificando permissão INTERNET..."
if grep -q 'android.permission.INTERNET' android/app/src/main/AndroidManifest.xml; then
    echo "   ✅ INTERNET permission encontrada"
else
    echo "   ❌ FALTA: INTERNET permission"
fi
echo ""

# Verificação 2: API Key
echo "2️⃣ Verificando API Key..."
API_KEY=$(grep 'com.google.android.geo.API_KEY' android/app/src/main/AndroidManifest.xml | grep -oP '(?<=android:value=")[^"]*')
if [ -n "$API_KEY" ] && [ "$API_KEY" != "SUA_API_KEY_AQUI" ]; then
    echo "   ✅ API Key configurada: ${API_KEY:0:20}..."
else
    echo "   ❌ FALTA: API Key válida"
fi
echo ""

# Verificação 3: Kotlin Version
echo "3️⃣ Verificando versão do Kotlin..."
KOTLIN_VER=$(grep 'org.jetbrains.kotlin.android' android/settings.gradle.kts | grep -oP '(?<=version ")[^"]*')
if [ "$KOTLIN_VER" = "1.9.24" ]; then
    echo "   ✅ Kotlin 1.9.24 (estável)"
elif [ "$KOTLIN_VER" = "2.1.0" ]; then
    echo "   ⚠️ AVISO: Kotlin 2.1.0 (experimental)"
else
    echo "   ℹ️ Kotlin: $KOTLIN_VER"
fi
echo ""

# Verificação 4: myLocationEnabled
echo "4️⃣ Verificando myLocationEnabled..."
if grep -q 'myLocationEnabled: false' lib/features/home/home_page.dart; then
    echo "   ✅ myLocationEnabled: false (seguro)"
elif grep -q 'myLocationEnabled: true' lib/features/home/home_page.dart; then
    echo "   ⚠️ AVISO: myLocationEnabled: true (pode causar problemas)"
fi
echo ""

# Verificação 5: ProGuard
echo "5️⃣ Verificando ProGuard rules..."
if grep -q 'com.google.android.gms' android/app/proguard-rules.pro; then
    echo "   ✅ Google Maps keep rules configuradas"
else
    echo "   ⚠️ AVISO: Keep rules podem estar incompletas"
fi
echo ""

# Verificação 6: Impeller
echo "6️⃣ Verificando Impeller..."
if grep -q 'EnableImpeller.*false' android/app/src/main/AndroidManifest.xml; then
    echo "   ✅ Impeller desabilitado (Motorola compatível)"
else
    echo "   ⚠️ AVISO: Impeller pode estar ativo"
fi
echo ""

echo "========================================"
echo "✅ Validação concluída!"
echo ""
echo "Próximo passo:"
echo "  flutter clean"
echo "  flutter pub get"
echo "  flutter run"
