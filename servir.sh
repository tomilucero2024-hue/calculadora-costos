#!/usr/bin/env bash
# Sirve la calculadora en http://localhost:8080
# Necesario solo para instalarla como app (PWA). Para usarla, alcanza con abrir index.html.
cd "$(dirname "$0")" || exit 1
echo "Calculadora disponible en: http://localhost:8080"
echo "Para instalarla como app, abrila en el navegador y usá 'Instalar app'."
echo "Ctrl+C para detener."
python3 -m http.server 8080
