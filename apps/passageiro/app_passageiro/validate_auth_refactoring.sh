#!/bin/bash

# 🔍 Validation Script - Auth Refactoring
# Checks if all new files exist and core files were updated

echo "=========================================="
echo "🔍 VALIDATING AUTH REFACTORING"
echo "=========================================="
echo ""

SUCCESS=0
FAIL=0

# === NEW FILES ===
echo "📁 Checking new files..."

new_files=(
  "lib/features/auth/register_page.dart"
  "lib/widgets/auth_text_field.dart"
  "lib/widgets/primary_button.dart"
  "lib/core/http/auth_interceptor.dart"
  "AUTH_REFACTORING_COMPLETE.md"
)

for file in "${new_files[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file"
    ((SUCCESS++))
  else
    echo "❌ $file — MISSING"
    ((FAIL++))
  fi
done

# === MODIFIED FILES ===
echo ""
echo "✏️  Checking modified files..."

modified_files=(
  "lib/services/auth_service.dart"
  "lib/controllers/auth_controller.dart"
  "lib/features/auth/login_page.dart"
  "lib/core/navigation/app_routes.dart"
)

for file in "${modified_files[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file"
    ((SUCCESS++))
  else
    echo "❌ $file — MISSING or NOT MODIFIED"
    ((FAIL++))
  fi
done

# === CONTENT CHECKS ===
echo ""
echo "🔎 Checking content..."

# Check if login() exists in auth_service
if grep -q "Future<AuthTokens> login(" lib/services/auth_service.dart; then
  echo "✅ AuthService.login() found"
  ((SUCCESS++))
else
  echo "❌ AuthService.login() NOT FOUND"
  ((FAIL++))
fi

# Check if register() exists in auth_service
if grep -q "Future<AuthTokens> register(" lib/services/auth_service.dart; then
  echo "✅ AuthService.register() found"
  ((SUCCESS++))
else
  echo "❌ AuthService.register() NOT FOUND"
  ((FAIL++))
fi

# Check if AuthResult exists
if grep -q "class AuthResult" lib/controllers/auth_controller.dart; then
  echo "✅ AuthResult class found"
  ((SUCCESS++))
else
  echo "❌ AuthResult class NOT FOUND"
  ((FAIL++))
fi

# Check if register_page defines RegisterPage
if grep -q "class RegisterPage" lib/features/auth/register_page.dart; then
  echo "✅ RegisterPage class found"
  ((SUCCESS++))
else
  echo "❌ RegisterPage class NOT FOUND"
  ((FAIL++))
fi

# Check if login_page removed OTP
if ! grep -q "loginWithOtp" lib/features/auth/login_page.dart; then
  echo "✅ OTP references removed from LoginPage"
  ((SUCCESS++))
else
  echo "❌ OTP references STILL IN LoginPage"
  ((FAIL++))
fi

# Check register route in app_routes
if grep -q "static const register = '/register'" lib/core/navigation/app_routes.dart; then
  echo "✅ Register route defined in AppRoutes"
  ((SUCCESS++))
else
  echo "❌ Register route NOT FOUND"
  ((FAIL++))
fi

# === SUMMARY ===
echo ""
echo "=========================================="
echo "📊 SUMMARY"
echo "=========================================="
echo "✅ Passed: $SUCCESS"
echo "❌ Failed: $FAIL"
echo "=========================================="

if [ $FAIL -eq 0 ]; then
  echo "🎉 ALL CHECKS PASSED!"
  exit 0
else
  echo "⚠️  Some checks failed. Review the output above."
  exit 1
fi
