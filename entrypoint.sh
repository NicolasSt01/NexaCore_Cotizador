#!/bin/sh
set -e

PRISMA="/app/node_modules/.bin/prisma"
TSX="/app/node_modules/.bin/tsx"

# Segunda red de seguridad además del healthcheck del compose: en el primer
# despliegue MariaDB puede tardar en aceptar conexiones aunque ya esté "healthy".
echo "Esperando a la base de datos..."
INTENTOS=60
i=1
while [ "$i" -le "$INTENTOS" ]; do
  if echo "SELECT 1;" | "$PRISMA" db execute --stdin --config prisma.config.ts >/dev/null 2>&1; then
    echo "Base de datos lista."
    break
  fi
  if [ "$i" -eq "$INTENTOS" ]; then
    echo "La base de datos no respondió tras 120s. Revisa DATABASE_URL." >&2
    exit 1
  fi
  echo "  intento $i/$INTENTOS..."
  sleep 2
  i=$((i + 1))
done

echo "Aplicando migraciones..."
"$PRISMA" migrate deploy --config prisma.config.ts

echo "Ejecutando seed..."
"$TSX" prisma/seed.ts

echo "Iniciando Next.js..."
exec node server.js
