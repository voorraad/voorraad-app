# Voorraad.-server installeren op Proxmox

Deze kleine server doet twee dingen:

1. **Pushmeldingen** — elke ochtend een melding op je gsm als er iets dringend op moet, en meteen een melding bij een bericht van de beheerder. Werkt ook als de app dicht is.
2. **Foto-opslag** (optioneel) — foto's worden als bestand op je server bewaard; de app bewaart enkel de link. Zo blijft de app snel.

Voor de meldingen hoeft je server **niet** van buitenaf bereikbaar te zijn (hij stuurt enkel naar buiten). Voor de foto-opslag wel (stap 7).

Je hebt het gratis Firebase-abonnement (Spark) nodig, niets meer.

---

## 1. Een container met Docker maken

Kies één van de twee:

**A. Met het community-script (makkelijkst).** Open in Proxmox de **Shell** van je node en plak:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/ct/docker.sh)"
```

Kies de standaardinstellingen. Je krijgt een LXC-container met Docker. 1 CPU, 512 MB RAM en 4 GB schijf is ruim genoeg.

**B. Zelf.** Maak een Debian 12-LXC (of VM), open de console en voer uit:

```bash
apt update && apt install -y curl git
curl -fsSL https://get.docker.com | sh
```

## 2. De servicesleutel van Firebase downloaden

1. Ga naar <https://console.firebase.google.com/project/voorraad-7a7b2/settings/serviceaccounts/adminsdk>
2. Klik **Nieuwe privésleutel genereren** → **Sleutel genereren**. Er wordt een `.json`-bestand gedownload.
3. ⚠️ Dit bestand geeft volledige toegang tot je database. Deel het met niemand en zet het nergens online.

## 3. De server ophalen

In de console van je container:

```bash
apt install -y git
git clone https://github.com/voorraad/voorraad-app.git
cd voorraad-app/server
mkdir -p data
cp .env.voorbeeld .env
```

Zet nu de sleutel van stap 2 in `data/service-account.json`. Het makkelijkst:

```bash
nano data/service-account.json
```

Open het gedownloade bestand op je computer, kopieer **alles**, plak het in nano en bewaar met `Ctrl+O`, `Enter`, `Ctrl+X`.

## 4. Instellingen

```bash
nano .env
```

- `MELDING_UUR` — hoe laat de dagelijkse melding vertrekt, bv. `08:00`
- `CONTACT` — jouw e-mailadres in de vorm `mailto:jij@voorbeeld.be`
- Laat `PUBLIC_URL` voorlopig leeg (dat is voor de foto's, stap 7).

## 5. Starten

```bash
docker compose up -d --build
docker compose logs -f
```

Je ziet o.a. `Voorraad.-server 1.0.0 luistert op poort 8080`. Stop het meekijken met `Ctrl+C` (de server blijft draaien, ook na een herstart van Proxmox).

Controleer in de app: **Beheerpagina → Instellingen → Server & meldingen** moet **Server online** tonen.

## 6. Meldingen aanzetten op je gsm

- **iPhone/iPad:** open de app via het icoon op je **beginscherm** (niet in Safari). Zet je de app er nog niet op: Safari → Deel → *Zet op beginscherm*. Werkt vanaf iOS 16.4.
- Ga naar **Instellingen → Meldingen op dit toestel → Aanzetten** en sta meldingen toe.
- Tik **Testmelding**. Binnen enkele seconden komt er een melding binnen.

Elke gebruiker doet dit zelf, op elk toestel waarop hij meldingen wil. Op de beheerpagina zie je wie ze aan heeft.

> **Strengere Firestore-regels al gepubliceerd?** Plak dan opnieuw het volledige `firestore.rules` uit de repo (er staan regels voor `pushAbonnementen` en `pushTest` bij).

## 7. (Optioneel) Foto-opslag

De app moet je server via **https** kunnen bereiken. De eenvoudigste veilige manier, zonder poorten open te zetten in je router, is een **Cloudflare Tunnel**. Daarvoor heb je een eigen domeinnaam nodig die bij Cloudflare beheerd wordt (bv. `jouwnaam.be`, een paar euro per jaar).

1. Ga in Cloudflare naar **Zero Trust → Networks → Tunnels → Create a tunnel** → kies **Cloudflared**, geef een naam (bv. `voorraad`).
2. Kopieer het **token** (de lange tekst na `--token` in het voorbeeldcommando).
3. Bij **Public hostname**: subdomein `fotos`, domein `jouwnaam.be`, service **HTTP** → `voorraad:8080`.
4. Pas `.env` aan:
   ```
   PUBLIC_URL=https://fotos.jouwnaam.be
   TUNNEL_TOKEN=het-token-van-stap-2
   ```
5. In `docker-compose.yml`: haal de `#` weg voor de regels van `tunnel:` (en de regels eronder).
6. Herstart: `docker compose up -d --build`
7. In de app: **Beheerpagina → Instellingen → Server & meldingen** toont nu je foto-adres. Klik daar op **Foto's verhuizen** om de bestaande foto's naar je server te zetten.

Heb je al een reverse proxy (bv. Nginx Proxy Manager of Traefik) met https? Laat die dan doorsturen naar poort 8080 van de container en zet dat adres in `PUBLIC_URL`; de tunnel heb je dan niet nodig.

## Bijwerken naar een nieuwe versie

```bash
cd voorraad-app && git pull && cd server && docker compose up -d --build
```

## Problemen

| Wat je ziet | Oplossing |
|---|---|
| `Servicesleutel niet gevonden` in de logs | `data/service-account.json` ontbreekt of staat op een andere plek (stap 3). |
| Beheerpagina zegt **Server offline** | `docker compose ps` en `docker compose logs --tail 50`. Klopt de tijd/datum van de container? |
| Testmelding komt niet aan op iPhone | App geopend vanaf het beginscherm? Meldingen voor "Voorraad" toegestaan in Instellingen → Meldingen? |
| Testmelding komt niet aan | Zet meldingen in de app uit en terug aan (dan wordt het toestel opnieuw ingeschreven). |
| Foto's uploaden lukt niet | Klopt `PUBLIC_URL` (met https, zonder `/` op het einde)? Opent `https://fotos.jouwnaam.be/gezond` in je browser? Staat `https://voorraad.github.io` in `ALLOWED_ORIGINS`? |

De sleutels voor de meldingen (`data/vapid.json`) en de foto's (`data/fotos/`) staan in de map `data`. Neem die map mee in je Proxmox-back-up. Verlies je `vapid.json`, dan moet iedereen de meldingen één keer opnieuw aanzetten.
