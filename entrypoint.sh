#!/bin/sh
set -e

PRISMA="/app/node_modules/.bin/prisma"
TSX="/app/node_modules/.bin/tsx"

# Segunda red de seguridad además del healthcheck del compose: en el primer
# despliegue MariaDB puede tardar en aceptar conexiones aunque ya esté "healthy".
# Muestra a qué se está conectando de verdad, con la contraseña oculta. Sirve
# para ver si la interpolación del compose funcionó: si aquí aparecen comillas
# o el host es "localhost", el problema está en las variables, no en la base.
echo "Conectando a: $(printf '%s' "$DATABASE_URL" | sed 's#://\([^:]*\):[^@]*@#://\1:***@#')"

# Comillas dentro de la URL significan que el panel guardó el valor con ellas.
# MariaDB grabaría la contraseña incluyendo las comillas y el cliente las
# mandaría distinto: mismo valor aparente, autenticación fallida.
case "$DATABASE_URL" in
  *'"'*|*"'"*)
    echo "AVISO: DATABASE_URL contiene comillas. Quita las comillas del valor" >&2
    echo "       de MYSQL_ROOT_PASSWORD en las variables de Dokploy." >&2
    ;;
esac

echo "Esperando a la base de datos..."
INTENTOS=60
ERRLOG=/tmp/db-wait.log
i=1
while [ "$i" -le "$INTENTOS" ]; do
  if echo "SELECT 1;" | "$PRISMA" db execute --stdin --config prisma.config.ts >"$ERRLOG" 2>&1; then
    echo "Base de datos lista."
    break
  fi

  # Mostrar el motivo real, no solo el número de intento: un "Access denied"
  # o un "unknown database" no se arreglan esperando, y callarlos convierte
  # un diagnóstico de cinco segundos en una hora de adivinanzas.
  if [ "$i" -eq 1 ] || [ $((i % 10)) -eq 0 ]; then
    echo "  intento $i/$INTENTOS. Último error de la base de datos:"
    sed 's/^/    /' "$ERRLOG" | tail -5
  else
    echo "  intento $i/$INTENTOS..."
  fi

  if [ "$i" -eq "$INTENTOS" ]; then
    echo "" >&2
    echo "La base de datos no aceptó la conexión tras 120s." >&2
    sed 's/^/  /' "$ERRLOG" >&2
    echo "" >&2
    echo "Si el error es 'Access denied for user root': el volumen de MariaDB" >&2
    echo "se creó con otra MYSQL_ROOT_PASSWORD. Esa variable solo se aplica al" >&2
    echo "inicializar el volumen vacío; después se ignora. Borra el volumen" >&2
    echo "db_data y vuelve a desplegar, o restaura la contraseña anterior." >&2
    exit 1
  fi

  sleep 2
  i=$((i + 1))
done

echo "Aplicando migraciones..."
"$PRISMA" migrate deploy --config prisma.config.ts

echo "Ejecutando seed..."
"$TSX" prisma/seed.ts

echo "Iniciando Next.js..."
exec node server.js
