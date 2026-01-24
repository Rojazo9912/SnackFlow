#!/bin/bash
# Script para diagnosticar y reconstruir la app móvil

echo "🔍 Diagnóstico de App Móvil SnackFlow"
echo "======================================"
echo ""

# 1. Verificar que existe el build
echo "1️⃣ Verificando carpeta dist..."
if [ -d "dist" ]; then
  echo "✅ Carpeta dist existe"
  echo "   Archivos:"
  ls -lh dist/
else
  echo "❌ Carpeta dist NO existe"
  echo "   Ejecutando build..."
  npm run build
fi

echo ""

# 2. Verificar variables de entorno
echo "2️⃣ Verificando variables de entorno..."
if [ -f ".env.production" ]; then
  echo "✅ Archivo .env.production existe"
  cat .env.production
else
  echo "⚠️  Archivo .env.production NO existe"
fi

echo ""

# 3. Sincronizar con Capacitor
echo "3️⃣ Sincronizando con Capacitor..."
npx cap sync

echo ""

# 4. Verificar configuración de Capacitor
echo "4️⃣ Verificando capacitor.config.ts..."
if [ -f "capacitor.config.ts" ]; then
  echo "✅ Configuración de Capacitor existe"
else
  echo "❌ Configuración de Capacitor NO existe"
fi

echo ""

# 5. Abrir Android Studio
echo "5️⃣ Abriendo Android Studio..."
echo "   Verifica en Logcat si hay errores de JavaScript"
npx cap open android

echo ""
echo "✅ Diagnóstico completado"
echo ""
echo "📱 Pasos para depurar en Android Studio:"
echo "   1. Abre Logcat (View > Tool Windows > Logcat)"
echo "   2. Filtra por 'chromium' o 'Console'"
echo "   3. Busca errores en rojo"
echo "   4. Verifica que VITE_API_URL esté configurado correctamente"
