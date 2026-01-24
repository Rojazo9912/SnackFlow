# Script para diagnosticar y reconstruir la app móvil (PowerShell)

Write-Host "🔍 Diagnóstico de App Móvil SnackFlow" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar que existe el build
Write-Host "1️⃣ Verificando carpeta dist..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Write-Host "✅ Carpeta dist existe" -ForegroundColor Green
    Write-Host "   Archivos:" -ForegroundColor Gray
    Get-ChildItem dist | Select-Object Name, Length, LastWriteTime
} else {
    Write-Host "❌ Carpeta dist NO existe" -ForegroundColor Red
    Write-Host "   Ejecutando build..." -ForegroundColor Yellow
    npm run build
}

Write-Host ""

# 2. Verificar variables de entorno
Write-Host "2️⃣ Verificando variables de entorno..." -ForegroundColor Yellow
if (Test-Path ".env.production") {
    Write-Host "✅ Archivo .env.production existe" -ForegroundColor Green
    Get-Content .env.production
} else {
    Write-Host "⚠️  Archivo .env.production NO existe" -ForegroundColor Yellow
}

Write-Host ""

# 3. Rebuild completo
Write-Host "3️⃣ Reconstruyendo aplicación..." -ForegroundColor Yellow
npm run build

Write-Host ""

# 4. Sincronizar con Capacitor
Write-Host "4️⃣ Sincronizando con Capacitor..." -ForegroundColor Yellow
npx cap sync

Write-Host ""

# 5. Verificar configuración de Capacitor
Write-Host "5️⃣ Verificando capacitor.config.ts..." -ForegroundColor Yellow
if (Test-Path "capacitor.config.ts") {
    Write-Host "✅ Configuración de Capacitor existe" -ForegroundColor Green
} else {
    Write-Host "❌ Configuración de Capacitor NO existe" -ForegroundColor Red
}

Write-Host ""

# 6. Abrir Android Studio
Write-Host "6️⃣ Abriendo Android Studio..." -ForegroundColor Yellow
Write-Host "   Verifica en Logcat si hay errores de JavaScript" -ForegroundColor Gray
npx cap open android

Write-Host ""
Write-Host "✅ Diagnóstico completado" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Pasos para depurar en Android Studio:" -ForegroundColor Cyan
Write-Host "   1. Abre Logcat (View > Tool Windows > Logcat)" -ForegroundColor Gray
Write-Host "   2. Filtra por 'chromium' o 'Console'" -ForegroundColor Gray
Write-Host "   3. Busca errores en rojo" -ForegroundColor Gray
Write-Host "   4. Verifica que VITE_API_URL esté configurado correctamente" -ForegroundColor Gray
Write-Host ""
Write-Host "🔧 Si sigue en blanco, verifica:" -ForegroundColor Yellow
Write-Host "   - Que el archivo .env.production tenga VITE_API_URL correcto" -ForegroundColor Gray
Write-Host "   - Que la API esté corriendo (http://localhost:3000)" -ForegroundColor Gray
Write-Host "   - Que no haya errores en Logcat de Android Studio" -ForegroundColor Gray
