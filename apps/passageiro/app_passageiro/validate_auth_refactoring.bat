@echo off
REM 🔍 Validation Script - Auth Refactoring (Windows)
REM Checks if all new files exist and core files were updated

echo.
echo ==========================================
echo 🔍 VALIDATING AUTH REFACTORING
echo ==========================================
echo.

setlocal enabledelayedexpansion
set SUCCESS=0
set FAIL=0

REM === NEW FILES ===
echo 📁 Checking new files...

for %%F in (
  "lib\features\auth\register_page.dart"
  "lib\widgets\auth_text_field.dart"
  "lib\widgets\primary_button.dart"
  "lib\core\http\auth_interceptor.dart"
  "AUTH_REFACTORING_COMPLETE.md"
) do (
  if exist %%F (
    echo ✅ %%F
    set /a SUCCESS+=1
  ) else (
    echo ❌ %%F — MISSING
    set /a FAIL+=1
  )
)

REM === MODIFIED FILES ===
echo.
echo ✏️  Checking modified files...

for %%F in (
  "lib\services\auth_service.dart"
  "lib\controllers\auth_controller.dart"
  "lib\features\auth\login_page.dart"
  "lib\core\navigation\app_routes.dart"
) do (
  if exist %%F (
    echo ✅ %%F
    set /a SUCCESS+=1
  ) else (
    echo ❌ %%F — MISSING or NOT MODIFIED
    set /a FAIL+=1
  )
)

REM === SUMMARY ===
echo.
echo ==========================================
echo 📊 SUMMARY
echo ==========================================
echo ✅ Passed: %SUCCESS%
echo ❌ Failed: %FAIL%
echo ==========================================
echo.

if %FAIL% equ 0 (
  echo 🎉 ALL FILE CHECKS PASSED!
  echo.
  echo 📝 Next steps:
  echo    1. flutter clean
  echo    2. flutter pub get
  echo    3. flutter analyze
  echo    4. flutter run
else
  echo ⚠️  Some checks failed. Review the output above.
)

echo.
