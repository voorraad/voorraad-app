# Voorraad.

Web-app om bij te houden wat er in je vriezer, frigo en voorraadkast zit — met houdbaarheid, boodschappenlijst, weekmenu en recepten. Werkt als app op je gsm (PWA), ook offline, en je kan je voorraad delen met huisgenoten.

## Wat is er nieuw in versie 11

**Nieuwe indeling**
- **Navigatie**: onderaan Vriezer · Frigo · ＋ · Stock · Lijst. Weekmenu, recepten, statistieken, delen en instellingen zitten in het hamburgermenu (☰) linksboven; op een groot scherm staat dat menu vast links.
- **Eerst opmaken**: een balkje bovenaan je voorraad toont wat verlopen is, binnen 3 dagen of deze week op moet en wat lang ingevroren is — over al je locaties heen. Tik erop voor de lijst.
- **Voorraad**: zoeken, filteren, sorteren, weergave *per lade* of *op datum*, snel toevoegen en meerdere producten selecteren.
- **Boodschappen**: een eigen pagina in plaats van een pop-up, met *bijna op*-suggesties en "in voorraad zetten".
- **Instellingen**: netjes gegroepeerd (beheer, delen, gegevens, hulp, admin).
- Tik op een product voor alle details en acties. Met de min-knop gebruik je snel één stuk, en dat kan je ongedaan maken.
- Verwijderen vraagt in één keer de reden (opgegeten / weggegooid / foutje) en of het op je lijstje moet.
- Recepten tonen welke ingrediënten je in huis hebt en zetten de rest met één tik op je lijstje.
- Weekmenu werkt met tikken (slepen werkte niet op gsm) en je kan recepten inplannen.
- Bij toevoegen: nieuwe locatie/lade meteen aanmaken, productnamen worden voorgesteld, en categorie, emoji en eenheid worden overgenomen van eerdere producten met dezelfde naam.
- Iedereen kan nu wisselen tussen de eigen voorraad en gedeelde voorraden (vroeger enkel admins).
- **Beheerpagina** (`#/admin`) voor admins: overzicht met cijfers over alle gebruikers; per gebruiker alles bekijken én aanpassen (voorraad, verlopen, boodschappen, weekmenu, recepten, locaties & lades, categorieën, eenheden, statistieken, logboek, rechten, delen en export); verlopen producten van iedereen; logboek van iedereen en app-instellingen (onderhoud, rondleiding). Admins komen hier automatisch terecht na het openen van de app; gewone gebruikers gaan meteen naar hun voorraad.

**Opgeloste bugs**
- De knop *Wissel* in gebruikersbeheer liet de app crashen (`user` was niet gedefinieerd).
- Gedeelde (niet-admin) gebruikers konden niet terug naar hun eigen voorraad.
- *Account blokkeren* blokkeerde niets — geblokkeerde gebruikers zien nu een melding.
- Producten zonder lade, of in een lade die verwijderd werd, waren onzichtbaar. Ze staan nu onder *Zonder lade*.
- De datum "vandaag" was tussen middernacht en 2 uur 's nachts een dag te vroeg (UTC i.p.v. lokale tijd).
- CSV-export opende in één kolom in Excel met Belgische instellingen (nu puntkomma's en decimale komma's).
- Weekmenu-gerechten telden mee als product in de export.
- Bij een gedeelde voorraad toonden de statistieken soms die van het verkeerde account.
- Alle databronnen werden opnieuw ingeladen telkens je een lade open- of dichtklapte.
- *Naar voorraad* vanuit de boodschappenlijst gebruikte de niet-bestaande categorie "Overig" en vroeg al te verwijderen vóór je opsloeg.
- Recepten bewerken en annuleren veranderde toch het getoonde recept.
- Kleinere dingen: Japanse tekst tussen de emoji's, Engels woord in de rondleiding, ontbrekend icoon in recepten, dubbele logregels bij typen in de controle.
- Een back-up bevat nu de ID's, zodat lades en producten bij herstellen weer correct gekoppeld worden.
- Offline opstarten werkte niet (React, Babel en Tailwind kwamen van een CDN en werden niet bewaard).
- De deel-link gebruikte een voorspelbaar token (`Math.random`); nu `crypto.getRandomValues`.

**Sneller**
- Geen Babel meer in de browser en geen React-ontwikkelversie: de app wordt vooraf gebouwd (≈370 kB i.p.v. meerdere MB) en start veel sneller op gsm.
- Tailwind wordt vooraf gecompileerd (geen CDN-script meer).
- De service worker bewaart alles voor offline gebruik en haalt nieuwe versies meteen op als je online bent.

## Beheerpagina

Overzicht (zoeken bij alle gebruikers, waarde), Per gebruiker (voorraad, rechten, notitie, etiketten afdrukken, locatie kopiëren/verplaatsen, opkuisen, …), Verlopen, Inzicht (activiteit, verspilling, waarde, gebruik van onderdelen, inactieve gebruikers, geweigerde pogingen), Logboek en Instellingen (algemeen, uitnodigen + rechten in bulk, back-up/terugzetten + gedeelde barcodes, rondleiding).
Extra collecties: `invites/{email}` (vooraf ingestelde rechten, toegepast bij de eerste login), `blockedAttempts`, `barcodes/{code}` (gedeelde barcodes, uit te zetten via `settings/barcodes.gedeeld`), `adminNotes/{uid}`; tellers in `users.gebruik`.

## Eigen server (pushmeldingen en foto's)

In `server/` staat een kleine Node-server (gewone dienst via `server/installeer.sh`, of Docker) voor je eigen server, bv. Proxmox: dagelijkse pushmeldingen (Web Push, VAPID) als er iets dringend op moet, meteen een melding bij een persoonlijk bericht, en optioneel foto-opslag (de app bewaart dan enkel de link). Hij leest Firestore met een servicesleutel (gratis Spark-abonnement volstaat). Installatie: zie [`server/INSTALLEREN.md`](server/INSTALLEREN.md). Collecties: `pushAbonnementen`, `pushTest`; status in `settings/push`.

## Barcode, etiketten en foto's

- **Barcode scannen** (knop naast het zoekveld en in het productformulier): gebruikt de barcode-lezer van de browser als die er is, anders ZXing (van jsDelivr/unpkg, wordt gecachet) en als vangnet een eigen EAN-13/EAN-8-lezer (`src/lib/ean.js`). Productinfo komt van Open Food Facts; zelf ingevulde producten worden onthouden in `users.barcodes`.
- **Etiketten** (in een product of via selecteren): A4 3 × 8, labelprinter 62 × 29 of 50 × 25 mm, met QR-code naar `#/p/<productId>`. De QR-generator zit in `src/lib/qr.js` (geen externe bibliotheek).
- **Foto's**: per product (`items.foto`) en per lade (`lades.foto`), verkleind tot een kleine JPEG en in Firestore bewaard.

## Gegevens blijven compatibel

Het datamodel in Firestore is **ongewijzigd**: dezelfde collecties (`users`, `vriezers`, `lades`, `items`, `shoppingList`, `recepten`, `shares`, `logs`, `settings`, `admins`) en dezelfde velden. Bestaande voorraden, gedeelde accounts, tour-instellingen en back-ups blijven werken. De Firestore-regels staan in [`firestore.rules`](firestore.rules): elke gebruiker ziet enkel zijn eigen voorraad en voorraden die met hem gedeeld zijn, beheerders (collectie `admins`) zien alles, en de bekijk-link (`publicShares/{token}`) werkt zonder account. Gedeelde voorraden gebruiken een toegangsdocument `toegang/{eigenaarId}_{gebruikerId}` (met `shareId`), dat de app zelf aanmaakt bij het aanvaarden van een uitnodiging (en voor bestaande gedeelde voorraden bij het openen). Plak de regels in de Firebase console → Firestore Database → Regels, **nadat** deze versie van de app online staat. Andere velden: `settings/mededeling`, `users.adminKleur`, `users.adminBekendeGebruikers`.

Enige nieuwe velden: `displayName` in je eigen `users`-document (voor de deel-link) en optioneel `receptId` bij een ingepland recept.

## Projectstructuur

```
index.html          De pagina (laadt Firebase via CDN + assets/app.js en assets/app.css)
sw.js               Service worker (offline + snelle updates)
assets/             GEBOUWDE bestanden — niet met de hand aanpassen
src/
  main.jsx          Startpunt
  App.jsx           Indeling, navigatie, inlog-/onderhoudsschermen
  PublicView.jsx    Alleen-lezen weergave via ?deel=TOKEN
  state/store.jsx   Alle Firestore-data en -acties
  state/ui.jsx      Welke schermen/sheets open zijn (+ #/routes)
  pages/            Voorraad, Boodschappen, Menu (week/recepten), Meer (+ meer/…)
  components/       Herbruikbare onderdelen (formulier, dialogen, …)
  lib/              Constanten, hulpfuncties, iconen, export/back-up
build.mjs           Bouwscript (esbuild + Tailwind v4)
dev.html, dev/      Testversie met nagemaakte database (zie hieronder)
```

## Aanpassen en bouwen

Je hebt [Node.js](https://nodejs.org) 18 of nieuwer nodig.

```bash
npm install
npm run build      # bouwt src/ → assets/app.js en assets/app.css
npm run dev        # bouwt opnieuw bij elke wijziging + server op http://localhost:5173/dev.html
```

Commit na `npm run build` ook de map `assets/`: GitHub Pages serveert die bestanden rechtstreeks, er is dus geen extra deploy-stap nodig.

`dev.html` gebruikt een nagemaakte Firebase met voorbeelddata (`dev/mock-firebase.js`), zodat je alles kan uitproberen zonder je echte voorraad aan te raken. Handige varianten: `dev.html?demo=new` (nieuwe gebruiker), `?demo=tour` (rondleiding), `?dark=1`, `?loggedout=1`.

## Browsers

Werkt in recente versies van Chrome, Edge, Firefox en Safari (iOS/macOS 16.4 of nieuwer).
