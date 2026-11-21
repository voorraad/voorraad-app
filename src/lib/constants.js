// Vaste configuratie van de app. Alles wat hier staat is statisch (geen Firestore).

export const APP_VERSION = '12.1';

export const VERSION_HISTORY = [
    {
        version: '12.1',
        changes: [
            'Restjes: tik in de frigo op "Restje bewaren". Het krijgt meteen een vervaldatum (standaard 3 dagen) en je krijgt een seintje voor het op moet.',
            'Wat kan ik koken? Bij je recepten en in "Eerst opmaken" zie je welke recepten de producten gebruiken die eerst op moeten.',
            'Prullenbak: per ongeluk iets verwijderd? Via Instellingen → Prullenbak zet je het binnen 30 dagen terug.',
            'Rondleiding: komen er nieuwe stappen bij, dan zie je enkel die nieuwe.'
        ]
    },
    {
        version: '12.0',
        changes: [
            'Nieuw icoon: een inox diepvriezer vol boodschappen. Op iPhone zie je het pas als je de app opnieuw op je beginscherm zet.',
            'Barcode scannen: scan een product en de app vult naam, categorie en foto in. Gekende barcodes worden voortaan meteen herkend.',
            'Etiketten: druk etiketten af met een QR-code. Scan die met de scanknop in de app en je ziet meteen het product.',
            "Foto's: geef een product, lade of schap een foto. Tik op de foto om hem groot te bekijken of te verwijderen.",
            'Vriezerkaart: zie in één oogopslag wat in welke lade ligt.',
            'Meldingen op je gsm: krijg een seintje als iets bijna vervalt of als je een bericht krijgt. Zet ze aan bij Instellingen.',
            'Gezinsleden: kies wie het toestel gebruikt, dan zie je in het logboek wie wat toevoegde.',
            'Snelkoppelingen: houd het app-icoon ingedrukt om meteen te scannen, iets toe te voegen of je lijstje te openen.',
            'Samen beheren: deel je voorraad met huisgenoten, of geef familie een bekijk-link zonder account.',
            'Rondleiding: een volledige rondleiding door de app, altijd terug te vinden via Instellingen → Hulp.',
            'Berichten: belangrijke berichten van Voorraad. verschijnen als pop-up of bovenaan de app.',
            'Opgelost: lege lijsten bij het laden, dubbele namen in gedeelde voorraden, oude logo na vernieuwen en een te brede instellingenpagina op gsm.'
        ]
    },
    {
        version: '11.0',
        changes: [
            'Nieuw: "Eerst opmaken" bovenaan je voorraad: verlopen, bijna verlopen en lang ingevroren producten, over al je locaties heen.',
            'Nieuw: Duidelijkere navigatie. Onderaan Vriezer, Frigo, Stock en je boodschappenlijst; weekmenu, recepten en instellingen zitten in het menu linksboven.',
            'Nieuw: Tik op een product voor alle details en acties. Met de min-knop gebruik je snel één stuk, en je kan dat ongedaan maken.',
            'Nieuw: Recepten tonen welke ingrediënten je al in huis hebt en zetten de rest met één tik op je lijstje.',
            'Nieuw: Weekmenu werkt nu ook op je gsm (tikken in plaats van slepen) en je kan recepten inplannen.',
            'Nieuw: Wisselen tussen je eigen en gedeelde voorraden kan nu voor iedereen.',
            'Sneller: de app start veel sneller en werkt ook offline.',
            'Opgelost: producten zonder lade waren onzichtbaar, CSV-export opende in één kolom in Excel, datum "vandaag" was fout na middernacht, geblokkeerde accounts konden toch inloggen, en de wissel-knop in gebruikersbeheer liet de app crashen.'
        ]
    },
    {
        version: '10.2',
        changes: [
            'Compact Design: De app is teruggezet naar een strakkere, compactere en subtielere weergave.',
            'Lijstweergave: De categoriekleur wordt als subtiel verticaal balkje weergegeven.',
            'Logboek: Smalle balkjes zodat je meer geschiedenis in één oogopslag ziet.'
        ]
    },
    {
        version: '10.1',
        changes: [
            'Mobiele Weergave: Productnamen worden niet meer vroegtijdig afgekapt.',
            'Slimme Actieknoppen: Tik op een product om de actieknoppen te tonen.'
        ]
    },
    {
        version: '10.0',
        changes: ['Nieuw UI Design: Glassmorphism, animaties en een strakkere dark-mode.']
    },
    {
        version: '9.0',
        changes: ['Nieuw: Snelle Invoer en Kalenderweergave.']
    }
];

// Locatietypes. De sleutels ('vriezer', 'frig', 'voorraad') zijn ook de waarden in Firestore.
export const TYPES = [
    { id: 'vriezer', label: 'Vriezer', short: 'Vriezer', icon: 'Snowflake', tone: 'sky' },
    { id: 'frig', label: 'Frigo', short: 'Frigo', icon: 'Fridge', tone: 'emerald' },
    { id: 'voorraad', label: 'Stock', short: 'Stock', icon: 'Box', tone: 'amber' }
];
export const TYPE_BY_ID = Object.fromEntries(TYPES.map(t => [t.id, t]));

export const MENU_LOCATION_ID = 'custom_menu'; // weekmenu-gerechten staan in 'items' met dit vriezerId

// Rondleiding. Optioneel per stap: recht (enkel tonen als de gebruiker dat recht heeft) en ga (pagina die achter de stap opent).
export const TOUR_VERSION = 3;
export const DEFAULT_TOUR_STEPS = [
    { title: 'Welkom bij Voorraad.', icon: 'Sparkles', colorName: 'blue', ga: 'voorraad/vriezer',
        content: 'Weet altijd wat er in je vriezer, frigo en kast ligt, en gooi minder weg.\n\nIn een paar stappen tonen we alles. Swipe of tik op Volgende.' },
    { title: 'Vriezer, frigo en stock', icon: 'Snowflake', colorName: 'blue', ga: 'voorraad/vriezer',
        content: 'Onderaan wissel je tussen je vriezer, frigo en stock (voorraadkast). Elke plek heeft eigen locaties (bv. "Diepvries garage") met lades of planken.' },
    { title: 'Product toevoegen', icon: 'Plus', colorName: 'green', recht: 'toevoegen', ga: 'voorraad/vriezer',
        content: 'Tik op de ronde + knop. Typ de naam: de app stelt zelf een emoji, categorie en houdbaarheid voor.\n\nSnel even iets bijzetten? Typ het in het gele vak "Snel toevoegen" en druk op Enter.' },
    { title: 'Barcode scannen', icon: 'Scan', colorName: 'indigo', recht: 'scan', ga: 'voorraad/voorraad',
        content: 'Tik op de streepjesknop naast het zoekveld en houd de barcode voor de camera. Bekende producten vullen zichzelf in; wat je zelf invult, onthoudt de app voor de volgende keer.' },
    { title: 'Opmaken', icon: 'Utensils', colorName: 'orange', recht: 'opmaken', ga: 'voorraad/vriezer',
        content: 'Iets opgegeten of weggegooid? Tik op de oranje vork-en-mes-knop. Kies hoeveel (ook per ¼, bv. 1,5 zak) en of het opgegeten, weggegooid of een foutje was.\n\nVergist? Tik op "Ongedaan maken" in de melding.' },
    { title: 'Bewerken en meer', icon: 'Edit', colorName: 'gray', recht: 'bewerken', ga: 'voorraad/vriezer',
        content: 'Met het potlood pas je een product aan. Tik op het product zelf voor alle acties: kopie, verplaatsen, etiket afdrukken of inplannen in je weekmenu.' },
    { title: 'Wat moet eerst op?', icon: 'Alert', colorName: 'red', ga: 'voorraad/vriezer',
        content: 'De rode balk bovenaan toont wat verlopen is of binnenkort vervalt, en wat al lang in de vriezer ligt.\n\nHet lijntje links van elk product zegt het ook: rood = moet op, oranje = binnenkort, groen = in orde.' },
    { title: 'Lades, datum of kaart', icon: 'Dashboard', colorName: 'blue', ga: 'voorraad/vriezer',
        content: 'Boven de lijst kies je hoe je kijkt: per lade, gesorteerd op datum, of als kaart van je vriezer met elke lade als vakje. Tik op een vakje om die lade te openen.' },
    { title: "Foto's", icon: 'Camera', colorName: 'pink', recht: 'fotos', ga: 'voorraad/vriezer',
        content: "Geef een product een foto (in het formulier) of een hele lade (cameraatje naast de naam van de lade). Zo zie je meteen wat er in dat zakje zit." },
    { title: 'Etiketten', icon: 'Printer', colorName: 'gray', recht: 'etiketten', ga: 'voorraad/vriezer',
        content: 'Druk etiketjes af voor je diepvrieszakjes: open een product en kies Etiket, of selecteer er meerdere.\n\nScan de QR-code later met je gsm-camera: het product opent meteen om op te maken.' },
    { title: 'Boodschappenlijst', icon: 'Cart', colorName: 'purple', recht: 'lijst', ga: 'lijst',
        content: 'Zet producten op je lijst, per winkel. Vink af in de winkel en zet ze met één tik in je voorraad.\n\nTip: geef een product een minimum voorraad, dan komt het vanzelf op je lijst als het bijna op is.' },
    { title: 'Weekmenu en recepten', icon: 'Calendar', colorName: 'yellow', recht: 'weekmenu', ga: 'menu/week',
        content: 'Via de drie streepjes linksboven vind je je weekmenu en recepten. Plan maaltijden in met wat je nog in huis hebt.' },
    { title: 'Samen beheren', icon: 'Users', colorName: 'indigo', recht: 'delen', ga: 'meer',
        content: 'Bij Instellingen → Delen nodig je iemand uit om samen dezelfde voorraad te beheren, of maak je een bekijk-link (alleen kijken, zonder account).' },
    { title: 'Gezinsleden', icon: 'User', colorName: 'green', ga: 'meer',
        content: 'Gebruiken meerdere mensen hetzelfde account? Voeg ze toe bij Instellingen → Gezinsleden. Op elk toestel kies je wie je bent; in het logboek zie je wie wat deed.' },
    { title: 'Meldingen', icon: 'Bell', colorName: 'orange', ga: 'meer',
        content: 'Zet bij Instellingen → "Meldingen op dit toestel" de meldingen aan. Je krijgt dan elke ochtend een seintje als er iets op moet.\n\niOS (iPhone/iPad): zet de app eerst op je beginscherm via Safari → Deel → Zet op beginscherm, en open ze van daaruit.\n\nAndroid: tik op Toestaan als Chrome om toestemming vraagt. Tip: installeer de app via ⋮ → App installeren.' },
    { title: 'Klaar!', icon: 'Check', colorName: 'green', ga: 'voorraad/vriezer',
        content: 'Je kan deze rondleiding altijd opnieuw bekijken via Instellingen → Hulp.\n\nVeel plezier, en minder weggooien!' }
];

export const TOUR_COLORS = ['blue', 'green', 'orange', 'yellow', 'purple', 'red', 'pink', 'indigo', 'gray'];

// Kleuren die gebruikers aan categorieën en locaties kunnen geven.
export const COLOR_KEYS = ['gray', 'red', 'orange', 'yellow', 'green', 'teal', 'blue', 'indigo', 'purple', 'pink'];

// Volledige (statische) classnames per kleur, zodat de CSS-build ze kan vinden.
export const BADGE = {
    gray: 'bg-stone-100 text-stone-700 dark:bg-stone-700/60 dark:text-stone-200',
    red: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
    orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
    green: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
    teal: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200',
    blue: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
    indigo: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200',
    pink: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-200'
};
export const DOT = {
    gray: 'bg-stone-400', red: 'bg-red-500', orange: 'bg-orange-500', yellow: 'bg-yellow-400', green: 'bg-green-500',
    teal: 'bg-teal-500', blue: 'bg-sky-500', indigo: 'bg-indigo-500', purple: 'bg-purple-500', pink: 'bg-pink-500'
};
// Locatiekleuren (oude data gebruikt ook deze sleutels).
export const LOC_TEXT = {
    blue: 'text-teal-700 dark:text-teal-300', purple: 'text-purple-700 dark:text-purple-300', pink: 'text-pink-700 dark:text-pink-300',
    orange: 'text-orange-700 dark:text-orange-300', green: 'text-emerald-700 dark:text-emerald-300', red: 'text-red-700 dark:text-red-300',
    gray: 'text-stone-700 dark:text-stone-300', teal: 'text-cyan-700 dark:text-cyan-300', indigo: 'text-indigo-700 dark:text-indigo-300',
    yellow: 'text-yellow-700 dark:text-yellow-300'
};
export const LOC_DOT = {
    blue: 'bg-teal-500', purple: 'bg-purple-500', pink: 'bg-pink-500', orange: 'bg-orange-500', green: 'bg-emerald-500',
    red: 'bg-red-500', gray: 'bg-stone-500', teal: 'bg-cyan-500', indigo: 'bg-indigo-500', yellow: 'bg-yellow-400'
};
export const LOC_COLOR_KEYS = Object.keys(LOC_DOT);

export const TOUR_TONE = {
    blue: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    pink: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
    indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    gray: 'bg-stone-100 text-stone-700 dark:bg-stone-700 dark:text-stone-200'
};

// domain: wordt gebruikt om het echte logo (favicon van de winkelsite) te tonen.
export const WINKELS = [
    { name: 'AH', color: 'blue', domain: 'ah.be' }, { name: 'Colruyt', color: 'orange', domain: 'colruyt.be' },
    { name: 'Delhaize', color: 'gray', domain: 'delhaize.be' }, { name: 'Aldi', color: 'blue', domain: 'aldi.be' },
    { name: 'Lidl', color: 'yellow', domain: 'lidl.be' }, { name: 'Jumbo', color: 'yellow', domain: 'jumbo.com' },
    { name: 'Carrefour', color: 'blue', domain: 'carrefour.be' }, { name: 'Kruidvat', color: 'red', domain: 'kruidvat.be' },
    { name: 'Action', color: 'blue', domain: 'action.com' }, { name: 'Overig', color: 'gray' }
];

export const CATEGORIEEN_VRIES = [
    { name: 'Vlees', color: 'red' }, { name: 'Vis', color: 'blue' }, { name: 'Groenten', color: 'green' },
    { name: 'Fruit', color: 'yellow' }, { name: 'Brood', color: 'yellow' }, { name: 'IJs', color: 'pink' },
    { name: 'Restjes', color: 'gray' }, { name: 'Saus', color: 'red' }, { name: 'Friet', color: 'yellow' },
    { name: 'Pizza', color: 'orange' }, { name: 'Soep', color: 'orange' }, { name: 'Ander', color: 'gray' }
];
export const CATEGORIEEN_FRIG = [
    { name: 'Vlees', color: 'red' }, { name: 'Vis', color: 'blue' }, { name: 'Groenten', color: 'green' },
    { name: 'Fruit', color: 'yellow' }, { name: 'Zuivel', color: 'blue' }, { name: 'Kaas', color: 'yellow' },
    { name: 'Beleg', color: 'pink' }, { name: 'Drank', color: 'blue' }, { name: 'Saus', color: 'red' },
    { name: 'Restjes', color: 'gray' }, { name: 'Soep', color: 'orange' }, { name: 'Ander', color: 'gray' }
];
export const CATEGORIEEN_VOORRAAD = [
    { name: 'Pasta', color: 'yellow' }, { name: 'Rijst', color: 'gray' }, { name: 'Conserven', color: 'red' },
    { name: 'Saus', color: 'red' }, { name: 'Kruiden', color: 'green' }, { name: 'Bakproducten', color: 'yellow' },
    { name: 'Snacks', color: 'orange' }, { name: 'Drank', color: 'blue' }, { name: 'Huishoud', color: 'gray' },
    { name: 'Ander', color: 'gray' }
];
export const DEFAULT_CATS = { vriezer: CATEGORIEEN_VRIES, frig: CATEGORIEEN_FRIG, voorraad: CATEGORIEEN_VOORRAAD };
export const ALL_DEFAULT_CAT_NAMES = new Set([...CATEGORIEEN_VRIES, ...CATEGORIEEN_FRIG, ...CATEGORIEEN_VOORRAAD].map(c => c.name));

export const EENHEDEN = {
    vriezer: ['stuks', 'zak', 'portie', 'doos', 'gram', 'kilo', 'bakje', 'pak'],
    frig: ['stuks', 'zak', 'portie', 'doos', 'gram', 'kilo', 'bakje', 'pak', 'fles', 'pot'],
    voorraad: ['stuks', 'pak', 'fles', 'blik', 'pot', 'liter', 'kilo', 'gram', 'zak', 'doos']
};
// Veldnaam in het users-document per type.
export const UNIT_FIELD = { vriezer: 'customUnitsVries', frig: 'customUnitsFrig', voorraad: 'customUnitsVoorraad' };

export const AVAILABLE_TAGS = ['Restje', 'Snel klaar', 'Voor bezoek', 'Glutenvrij', 'Pittig', 'Vegetarisch', 'Aanbieding'];
export const CATEGORIEEN_RECEPT = ['Hoofdgerecht', 'Voorgerecht', 'Dessert', 'Ontbijt', 'Lunch', 'Snack', 'Soep', 'Basisrecept'];
export const EENHEDEN_RECEPT = ['stuks', 'gram', 'kilo', 'ml', 'liter', 'el', 'tl', 'teentje(s)', 'blikje', 'pakje', 'snufje', 'takje(s)', 'druppel(s)', 'naar smaak'];

export const CATEGORY_EMOJI = {
    Vlees: '🥩', Vis: '🐟', Groenten: '🥦', Fruit: '🍎', Brood: '🍞', IJs: '🍦', Restjes: '🥡', Saus: '🥫',
    Friet: '🍟', Pizza: '🍕', Pasta: '🍝', Rijst: '🍚', Conserven: '🥫', Kruiden: '🌿', Bakproducten: '🥖',
    Snacks: '🍿', Drank: '🥤', Soep: '🍲', Huishoud: '🧻', Ander: '📦', Zuivel: '🥛', Kaas: '🧀', Beleg: '🥪'
};

export const EMOJI_CATEGORIES = {
    Fruit: ['🍏', '🍐', '🍊', '🍋', '🍌', '🍎', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🥑', '🫒'],
    Groenten: ['🍆', '🥔', '🥕', '🌽', '🌶️', '🫑', '🥒', '🥬', '🥦', '🧄', '🧅', '🍄', '🥜', '🫘', '🌰', '🍠', '🫛', '🍅', '🫚'],
    Vlees: ['🥩', '🍗', '🍖', '🥓', '🍔', '🌭', '🍳', '🥚', '🧀'],
    Vis: ['🐟', '🐠', '🦈', '🐙', '🦀', '🦞', '🦐', '🦑', '🦪', '🍣', '🍤'],
    Deegwaren: ['🍞', '🥐', '🥖', '🫓', '🥨', '🥯', '🥞', '🧇', '🥟', '🍜', '🍝', '🍕'],
    Maaltijden: ['🍟', '🥪', '🌮', '🌯', '🥙', '🧆', '🥘', '🍲', '🫕', '🥣', '🥗', '🍿', '🧈', '🧂', '🥫', '🍱', '🍙', '🍚', '🍛'],
    Dessert: ['🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯'],
    Drinken: ['🍼', '🥛', '☕', '🫖', '🍵', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃', '🥤', '🧃', '🧉'],
    Overig: ['❄️', '🧊', '🏷️', '📦', '🛒', '🍽️', '🧻', '🧼', '🧽', '🐈', '🐕', '🎉', '🎄', '🎁']
};

export const SEARCH_SYNONYMS = {
    patat: ['aardappel', 'aardappelen'], patatten: ['aardappel', 'aardappelen'],
    aardappel: ['patat', 'patatten'], aardappelen: ['patat', 'patatten'],
    look: ['knoflook'], knoflook: ['look'],
    ajuin: ['ui', 'uien'], ui: ['ajuin'], uien: ['ajuin'],
    frigo: ['koelkast'], koelkast: ['frigo'],
    diepvries: ['vriezer', 'diepvriezer'], vriezer: ['diepvries'],
    kip: ['kippenfilet', 'kipfilet'], kippenfilet: ['kip'], hesp: ['ham'], ham: ['hesp']
};

// Rechten die een beheerder per gebruiker aan/uit kan zetten (opgeslagen als users.hiddenTabs = lijst van uitgezette rechten).
export const RIGHTS = [
    { id: 'frig', label: 'Frigo', group: 'Onderdelen', icon: 'Fridge' },
    { id: 'voorraad', label: 'Stock', group: 'Onderdelen', icon: 'Box' },
    { id: 'lijst', label: 'Boodschappenlijst', group: 'Onderdelen', icon: 'Cart' },
    { id: 'weekmenu', label: 'Weekmenu', group: 'Onderdelen', icon: 'Calendar' },
    { id: 'recepten', label: 'Recepten', group: 'Onderdelen', icon: 'Book' },
    { id: 'stats', label: 'Statistieken', group: 'Onderdelen', icon: 'Chart' },
    { id: 'logboek', label: 'Logboek', group: 'Onderdelen', icon: 'Log' },
    { id: 'delen', label: 'Delen & bekijk-link', group: 'Onderdelen', icon: 'Users' },
    { id: 'toevoegen', label: 'Producten toevoegen', desc: 'Plus-knop, kopie, toevoegen vanuit het lijstje', group: 'Producten', icon: 'Plus' },
    { id: 'snel', label: 'Snel toevoegen', desc: 'Typen en Enter boven de lijst', group: 'Producten', icon: 'Zap' },
    { id: 'bewerken', label: 'Bewerken & verplaatsen', group: 'Producten', icon: 'Edit' },
    { id: 'opmaken', label: 'Opmaken / gebruiken', desc: 'Oranje vork-en-mes-knop', group: 'Producten', icon: 'Utensils' },
    { id: 'verwijderen', label: 'Verwijderen', group: 'Producten', icon: 'Trash' },
    { id: 'scan', label: 'Barcode scannen', group: 'Extra functies', icon: 'Scan' },
    { id: 'fotos', label: "Foto's toevoegen", group: 'Extra functies', icon: 'Camera' },
    { id: 'etiketten', label: 'Etiketten afdrukken', group: 'Extra functies', icon: 'Printer' },
    { id: 'balans', label: 'Controle-knop', group: 'Extra functies', icon: 'CheckSquare' },
    { id: 'locaties', label: 'Locaties & lades beheren', group: 'Instellingen', icon: 'Layers' },
    { id: 'categorieen', label: 'Categorieën & eenheden', group: 'Instellingen', icon: 'Tag' },
    { id: 'export', label: 'Exporteren, afdrukken & back-up', group: 'Instellingen', icon: 'Download' }
];
export const RIGHT_GROUPS = ['Onderdelen', 'Producten', 'Extra functies', 'Instellingen'];
// Snelle sjablonen in de rechten-instellingen
export const RIGHT_PRESETS = [
    { id: 'alles', label: 'Alles mag', icon: 'Check', hidden: [] },
    { id: 'eenvoudig', label: 'Eenvoudig', icon: 'Sparkles', hidden: ['weekmenu', 'recepten', 'stats', 'logboek', 'delen', 'balans', 'locaties', 'categorieen', 'export', 'etiketten'] },
    { id: 'bekijken', label: 'Enkel bekijken', icon: 'Eye', hidden: ['toevoegen', 'snel', 'bewerken', 'opmaken', 'verwijderen', 'fotos', 'scan', 'locaties', 'categorieen', 'balans'] }
];
