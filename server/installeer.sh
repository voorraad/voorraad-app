#!/usr/bin/env bash
# Installeert (of werkt bij) de Voorraad.-server zonder Docker, als systemd-dienst.
# Gebruik (als root, vanuit de map voorraad-app):  bash server/installeer.sh
set -euo pipefail

DOEL=/opt/voorraad-server
BRON="$(cd "$(dirname "$0")" && pwd)"

if [ "$(id -u)" -ne 0 ]; then echo "Voer dit uit als root (of met sudo)."; exit 1; fi

echo "==> Benodigde pakketten installeren"
apt-get update -qq
apt-get install -y -qq nodejs npm tzdata >/dev/null
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 18 ]; then echo "Node.js $NODE_MAJOR is te oud (minstens 18 nodig). Gebruik Debian 12 of nieuwer."; exit 1; fi

echo "==> Gebruiker en map aanmaken"
id voorraad >/dev/null 2>&1 || useradd --system --home "$DOEL" --shell /usr/sbin/nologin voorraad
mkdir -p "$DOEL/data/fotos"
install -m 644 "$BRON"/*.js "$BRON/package.json" "$DOEL/"
mkdir -p "$DOEL/data/backups"
if [ ! -f "$DOEL/.env" ]; then
    install -m 640 "$BRON/.env.voorbeeld" "$DOEL/.env"
    echo "    Nieuw instellingenbestand: $DOEL/.env (pas het aan met: nano $DOEL/.env)"
fi

echo "==> Bibliotheken installeren (kan een minuutje duren)"
cd "$DOEL"
npm install --omit=dev --no-audit --no-fund --loglevel=error

chown -R voorraad:voorraad "$DOEL"
chmod 750 "$DOEL/data"
[ -f "$DOEL/data/service-account.json" ] && chmod 600 "$DOEL/data/service-account.json"

echo "==> Dienst installeren"
install -m 644 "$BRON/voorraad.service" /etc/systemd/system/voorraad.service
systemctl daemon-reload
systemctl enable voorraad >/dev/null 2>&1

if [ -f "$DOEL/data/service-account.json" ]; then
    systemctl restart voorraad
    sleep 3
    systemctl --no-pager --lines=5 status voorraad || true
    echo
    echo "Klaar! Meekijken in de logs: journalctl -u voorraad -f"
else
    echo
    echo "Bijna klaar. Zet nu je Firebase-servicesleutel in:"
    echo "    $DOEL/data/service-account.json"
    echo "en start de dienst met:"
    echo "    chown voorraad:voorraad $DOEL/data/service-account.json && chmod 600 $DOEL/data/service-account.json && systemctl restart voorraad"
fi
