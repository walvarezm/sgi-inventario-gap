#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

menu() {
  clear
  echo "============================================"
  echo "  SGI Inventario GAP - Menu de Despliegue"
  echo "============================================"
  echo ""
  echo "  1. Limpiar y construir frontend"
  echo "  2. Copiar build a public/"
  echo "  3. Deploy a Firebase Hosting"
  echo "  4. Commit y push a GitHub (dev)"
  echo "  5. Pipeline completo (1 + 2 + 3 + 4)"
  echo "  0. Salir"
  echo ""
  read -rp "Selecciona una opcion: " op

  case "$op" in
    0) exit 0 ;;
    1) build ;;
    2) copiar ;;
    3) deploy ;;
    4) commit ;;
    5) pipeline ;;
    *) echo "Opcion invalida. Presiona Enter..."; read -r; menu ;;
  esac
}

build() {
  echo ""
  echo "[1/1] Limpiando y construyendo frontend..."
  cd "$SCRIPT_DIR/frontend"
  quasar clean
  quasar build
  echo -e "${GREEN}Build completado exitosamente.${NC}"
  cd "$SCRIPT_DIR"
  read -rp "Presiona Enter para continuar..."
  menu
}

copiar() {
  echo ""
  echo "[2/2] Copiando build a public/..."
  cd "$SCRIPT_DIR"
  rm -rf public/*
  cp -r frontend/dist/spa/. public/
  echo -e "${GREEN}Copia completada.${NC}"
  read -rp "Presiona Enter para continuar..."
  menu
}

deploy_fb() {
  echo ""
  echo "[3/3] Desplegando a Firebase Hosting..."
  cd "$SCRIPT_DIR/frontend"
  firebase deploy --only hosting
  echo -e "${GREEN}Deploy a Firebase completado.${NC}"
  cd "$SCRIPT_DIR"
  read -rp "Presiona Enter para continuar..."
  menu
}

commit() {
  echo ""
  TODAY=$(date +%Y-%m-%d)
  read -rp "Descripcion de la tarea: " TAREA
  MSG="feat: BE y FE funcional al $TODAY - $TAREA"
  echo ""
  echo "Commit message:"
  echo "  $MSG"
  echo ""
  read -rp "Confirmar commit? (s/n): " CONFIRM
  if [[ "$CONFIRM" != "s" && "$CONFIRM" != "S" ]]; then
    echo "Commit cancelado."
    read -rp "Presiona Enter para continuar..."
    menu
  fi
  git add .
  git commit -m "$MSG"
  git push origin dev
  echo -e "${GREEN}Commit y push completados.${NC}"
  read -rp "Presiona Enter para continuar..."
  menu
}

pipeline() {
  clear
  echo "============================================"
  echo "  Ejecutando pipeline completo..."
  echo "============================================"
  echo ""

  echo "[1/4] Limpiando y construyendo frontend..."
  cd "$SCRIPT_DIR/frontend"
  quasar clean
  quasar build
  echo -e "${GREEN}Build completado.${NC}"
  cd "$SCRIPT_DIR"

  echo ""
  echo "[2/4] Copiando build a public/..."
  rm -rf public/*
  cp -r frontend/dist/spa/. public/
  echo -e "${GREEN}Copia completada.${NC}"

  echo ""
  echo "[3/4] Desplegando a Firebase Hosting..."
  cd "$SCRIPT_DIR/frontend"
  firebase deploy --only hosting
  echo -e "${GREEN}Deploy completado.${NC}"
  cd "$SCRIPT_DIR"

  echo ""
  echo "[4/4] Commit y push a GitHub..."
  TODAY=$(date +%Y-%m-%d)
  read -rp "Descripcion de la tarea: " TAREA
  git add .
  git commit -m "feat: BE y FE funcional al $TODAY - $TAREA"
  git push origin dev

  echo ""
  echo -e "${GREEN}============================================"
  echo "  Pipeline completado exitosamente!"
  echo -e "============================================${NC}"
  read -rp "Presiona Enter para continuar..."
  menu
}

menu
