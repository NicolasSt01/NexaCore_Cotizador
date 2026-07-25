# Guía: Script de Despliegue Rápido (`deploy.py`)

Esta guía documenta el script de Python que creamos para agilizar el proceso de hacer `git add`, `git commit` y `git push` con un solo comando. Puedes usar esta guía para replicar esta herramienta en cualquier otro proyecto.

## 1. El Código del Script

En la raíz de tu nuevo proyecto, crea un archivo llamado `deploy.py` y copia el siguiente código:

```python
#!/usr/bin/env python3
"""
deploy.py — Script de despliegue rápido
Uso: python3 deploy.py
"""

import subprocess
import sys

def run(cmd, capture=False):
    result = subprocess.run(
        cmd, shell=True, text=True,
        capture_output=capture
    )
    return result

def main():
    print("\n🚀  Commit & Push rápido")
    print("─" * 40)

    # Mostrar archivos modificados
    status = run("git status --short", capture=True)
    if not status.stdout.strip():
        print("✅  Sin cambios pendientes. Nada que hacer.")
        sys.exit(0)

    print("📂  Archivos con cambios:")
    print(status.stdout)

    # Pedir mensaje de commit
    msg = input("✏️   Mensaje del commit: ").strip()
    if not msg:
        print("❌  Mensaje vacío. Abortando.")
        sys.exit(1)

    print("\n⏳  Ejecutando git add ...")
    run("git add -A")

    print("⏳  Haciendo commit ...")
    result = run(f'git commit -m "{msg}"', capture=True)
    print(result.stdout or result.stderr)

    if result.returncode != 0:
        print("❌  Error en el commit. Revisa los mensajes anteriores.")
        sys.exit(1)

    print("⏳  Haciendo push ...")
    result = run("git push", capture=True)
    print(result.stdout or result.stderr)

    if result.returncode != 0:
        print("❌  Error en el push.")
        sys.exit(1)

    print("✅  ¡Listo! Cambios subidos a GitHub correctamente.\n")

if __name__ == "__main__":
    main()
```

## 2. Ignorar el Script en Git

Es una buena práctica que este tipo de scripts locales **no** se suban al repositorio. Para ello, abre tu archivo `.gitignore` (o créalo si no existe) y añade las siguientes líneas al final:

```gitignore
# Scripts de despliegue local (no subir al repo)
deploy.py
commit_msg*.txt
```

*(La línea `commit_msg*.txt` es útil por si alguna vez usas archivos de texto temporales para redactar commits largos, como lo hicimos nosotros en pasos anteriores).*

## 3. Dar Permisos de Ejecución (Opcional pero recomendado)

Para poder ejecutar el script más fácilmente en sistemas basados en Unix (Mac/Linux), puedes darle permisos de ejecución ejecutando este comando en la terminal:

```bash
chmod +x deploy.py
```

## 4. Cómo Usarlo

Una vez implementado, cuando tengas cambios listos para subir, simplemente ejecuta en tu terminal:

```bash
python3 deploy.py
```

El flujo será el siguiente:
1. El script detectará los archivos modificados.
2. Te pedirá que escribas el mensaje del commit directamente en la consola.
3. Automáticamente hará el `git add -A` (agregando todo).
4. Ejecutará el `git commit` con tu mensaje.
5. Hará el `git push` hacia tu repositorio remoto.
6. Te mostrará un mensaje de éxito.
