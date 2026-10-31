# Voorraad.

Web-app om bij te houden wat er in je vriezer, frigo en voorraadkast zit — met houdbaarheid, boodschappenlijst, weekmenu en recepten. Werkt als app op je gsm (PWA), ook offline, en je kan je voorraad delen met huisgenoten.

## Wat is er nieuw in versie 11

**Nieuwe indeling**
- **Overzicht**: startscherm met *Eerst opmaken* (verlopen, binnen 3 dagen, deze week en lang ingevroren — over al je locaties heen), tellers per type, wat er vandaag op het menu staat en wat bijna op is.
- **Voorraad**: Vriezer, Frigo en Stock in één scherm met een schakelaar. Zoeken, filteren, sorteren, weergave *per lade* of *op datum*, snel toevoegen en meerdere producten selecteren.
- **Boodschappen**: een eigen pagina in plaats van een pop-up, met *bijna op*-suggesties en "in voorraad zetten".
- **Menu**: weekmenu en recepten samen.
- **Meer**: alle instellingen netjes gegroepeerd (beheer, delen, gegevens, hulp, admin).
- Tik op een product voor alle details en acties. Met de min-knop gebruik je snel één stuk, en dat kan je ongedaan maken.
- Verwijderen vraagt in één keer de reden (opgegeten / weggegooid / foutje) en of het op je lijstje moet.
- Recepten tonen welke ingrediënten je in huis hebt en zetten de rest met één tik op je lijstje.
- Weekmenu werkt met tikken (slepen werkte niet op gsm) en je kan recepten inplannen.
- Bij toevoegen: nieuwe locatie/lade meteen aanmaken, productnamen worden voorgesteld, en categorie, emoji en eenheid worden overgenomen van eerdere producten met dezelfde naam.
- Iedereen kan nu wisselen tussen de eigen voorraad en gedeelde voorraden (vroeger enkel admins).

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

## Gegevens blijven compatibel

Het datamodel in Firestore is **ongewijzigd**: dezelfde collecties (`users`, `vriezers`, `lades`, `items`, `shoppingList`, `recepten`, `shares`, `logs`, `settings`, `admins`) en dezelfde velden. Bestaande voorraden, gedeelde accounts, tour-instellingen en back-ups blijven werken. Je hoeft de Firestore-regels niet aan te passen.

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
  pages/            Overzicht, Voorraad, Boodschappen, Menu, Meer (+ meer/…)
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
