# Voorraad.-server installeren op Proxmox

Deze kleine server doet twee dingen:

1. **Pushmeldingen** — elke ochtend een melding op je gsm als er iets dringend op moet, en meteen een melding bij een bericht van de beheerder. Werkt ook als de app dicht is.
2. **Foto-opslag** (optioneel) — foto's worden als bestand op je server bewaard; de app bewaart enkel de link. Zo blijft de app snel.

Je hebt **geen Docker** nodig: de server draait als gewone dienst in een Debian-container. (Gebruik je toch Docker? Zie helemaal onderaan.)

Voor de meldingen hoeft je server **niet** van buitenaf bereikbaar te zijn (hij stuurt enkel naar buiten). Voor de foto-opslag wel (stap 7).

Je hebt het gratis Firebase-abonnement (Spark) nodig, niets meer.

---

## 1. Een container maken in Proxmox

1. Klik in Proxmox rechtsboven op **Create CT**.
2. **General:** hostname `voorraad`, kies een wachtwoord.
3. **Template:** `debian-12-standard` (staat er die niet tussen: klik bij je opslag *local* → **CT Templates → Templates** en download hem eerst).
4. **Disks:** 4 GB · **CPU:** 1 core · **Memory:** 512 MB.
5. **Network:** IPv4 **DHCP**. Klik **Finish**, selecteer de container en klik **Start**.
6. Open **Console** en log in als `root` met je wachtwoord.

## 2. De servicesleutel van Firebase downloaden

1. Ga naar <https://console.firebase.google.com/project/voorraad-7a7b2/settings/serviceaccounts/adminsdk>
2. Klik **Nieuwe privésleutel genereren** → **Sleutel genereren**. Er wordt een `.json`-bestand gedownload.
3. ⚠️ Dit bestand geeft volledige toegang tot je database. Deel het met niemand en zet het nergens online.

## 3. De server installeren

In de console van je container:

```bash
apt update && apt install -y git nano
git clone https://github.com/voorraad/voorraad-app.git
cd voorraad-app
bash server/installeer.sh
```

Het script installeert Node.js, zet de server in `/opt/voorraad-server` en maakt er een **dienst** van die automatisch start (ook na een herstart van Proxmox).

Zet nu de sleutel van stap 2 op zijn plaats:

```bash
nano /opt/voorraad-server/data/service-account.json
```

Open het gedownloade bestand op je computer, kopieer **alles**, plak het in nano (rechtermuisklik of `Ctrl+Shift+V` in de Proxmox-console) en bewaar met `Ctrl+O`, `Enter`, `Ctrl+X`.

## 4. Instellingen

```bash
nano /opt/voorraad-server/.env
```

- `MELDING_UUR` — hoe laat de dagelijkse melding vertrekt, bv. `08:00`
- `CONTACT` — jouw e-mailadres in de vorm `mailto:jij@voorbeeld.be`
- Laat `PUBLIC_URL` voorlopig leeg (dat is voor de foto's, stap 7).

## 5. Starten

```bash
chown voorraad:voorraad /opt/voorraad-server/data/service-account.json
chmod 600 /opt/voorraad-server/data/service-account.json
systemctl restart voorraad
journalctl -u voorraad -f
```

Je ziet o.a. `Voorraad.-server 1.0.0 luistert op poort 8080`. Stop het meekijken met `Ctrl+C` (de server blijft draaien).

Controleer in de app: **Beheerpagina → Instellingen → Server & meldingen** moet **Server online** tonen.

Handige commando's: `systemctl status voorraad` (draait hij?), `systemctl restart voorraad` (herstarten, bv. na een wijziging in `.env`), `journalctl -u voorraad -n 50` (laatste logregels).

## 6. Meldingen aanzetten op je gsm

- **iPhone/iPad:** open de app via het icoon op je **beginscherm** (niet in Safari). Zet je de app er nog niet op: Safari → Deel → *Zet op beginscherm*. Werkt vanaf iOS 16.4.
- Ga naar **Instellingen → Meldingen op dit toestel → Aanzetten** en sta meldingen toe.
- Tik **Testmelding**. Binnen enkele seconden komt er een melding binnen.

Elke gebruiker doet dit zelf, op elk toestel waarop hij meldingen wil. Op de beheerpagina zie je wie ze aan heeft.

> **Strengere Firestore-regels al gepubliceerd?** Plak dan opnieuw het volledige `firestore.rules` uit de repo (er staan regels voor `pushAbonnementen` en `pushTest` bij).

## 7. (Optioneel) Foto-opslag

De app moet je server via **https** kunnen bereiken. De eenvoudigste veilige manier, zonder poorten open te zetten in je router, is een **Cloudflare Tunnel**. Daarvoor heb je een eigen domeinnaam nodig die bij Cloudflare beheerd wordt (bv. `jouwnaam.be`, een paar euro per jaar).

1. Ga in Cloudflare naar **Zero Trust → Networks → Tunnels → Create a tunnel** → kies **Cloudflared**, geef een naam (bv. `voorraad`).
2. Kies als omgeving **Debian, 64-bit** en voer de commando's die Cloudflare toont uit in de console van je container (ze installeren `cloudflared` en starten de tunnel als dienst).
3. Bij **Public hostname**: subdomein `fotos`, domein `jouwnaam.be`, service **HTTP** → `localhost:8080`.
4. Pas `/opt/voorraad-server/.env` aan:
   ```
   PUBLIC_URL=https://fotos.jouwnaam.be
   ```
5. Herstart: `systemctl restart voorraad`
6. In de app: **Beheerpagina → Instellingen → Server & meldingen** toont nu je foto-adres. Klik daar op **Foto's verhuizen** om de bestaande foto's naar je server te zetten.

Heb je al een reverse proxy (bv. Nginx Proxy Manager of Traefik) met https? Laat die dan doorsturen naar poort 8080 van deze container (het IP-adres zie je met `hostname -I`) en zet dat adres in `PUBLIC_URL`; de tunnel heb je dan niet nodig.

## Bijwerken naar een nieuwe versie

```bash
cd voorraad-app && git pull && bash server/installeer.sh
```

Je instellingen (`.env`), de sleutels en de foto's blijven staan.

## Problemen

| Wat je ziet | Oplossing |
|---|---|
| `Servicesleutel niet gevonden` in de logs | `/opt/voorraad-server/data/service-account.json` ontbreekt (stap 3). |
| Beheerpagina zegt **Server offline** | `systemctl status voorraad` en `journalctl -u voorraad -n 50`. Klopt de datum/tijd (`date`)? |
| Testmelding komt niet aan op iPhone | App geopend vanaf het beginscherm? Meldingen voor "Voorraad" toegestaan in Instellingen → Meldingen? |
| Testmelding komt niet aan | Zet meldingen in de app uit en terug aan (dan wordt het toestel opnieuw ingeschreven). |
| Foto's uploaden lukt niet | Klopt `PUBLIC_URL` (met https, zonder `/` op het einde)? Opent `https://fotos.jouwnaam.be/gezond` in je browser? Staat `https://voorraad.github.io` in `ALLOWED_ORIGINS`? |

De sleutels voor de meldingen (`vapid.json`) en de foto's (`fotos/`) staan in `/opt/voorraad-server/data`. Neem die map mee in je Proxmox-back-up. Verlies je `vapid.json`, dan moet iedereen de meldingen één keer opnieuw aanzetten.

---

## Liever met Docker?

In deze map staan ook een `Dockerfile` en `docker-compose.yml`. Kopieer `.env.voorbeeld` naar `.env`, zet de sleutel in `data/service-account.json` en start met `docker compose up -d --build`. Voor de tunnel: zet `TUNNEL_TOKEN` in `.env` en haal de `#` weg bij `tunnel:` in `docker-compose.yml`; de service in Cloudflare is dan `http://voorraad:8080`.
