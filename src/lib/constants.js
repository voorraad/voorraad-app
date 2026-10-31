// Vaste configuratie van de app. Alles wat hier staat is statisch (geen Firestore).

export const APP_VERSION = '11.0';

export const VERSION_HISTORY = [
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

export const DEFAULT_TOUR_STEPS = [
    {
        title: 'Welkom bij Voorraad!',
        content: 'In een paar stappen tonen we hoe je de app gebruikt, zodat je minder weggooit en altijd weet wat je in huis hebt.',
        icon: 'Box',
        colorName: 'blue'
    },
    {
        title: 'Eerst opmaken',
        content: 'Bovenaan je voorraad zie je meteen wat eerst op moet: verlopen of bijna verlopen producten, en wat al lang in de vriezer ligt. Tik erop voor de volledige lijst.',
        icon: 'Alert',
        colorName: 'green'
    },
    {
        title: 'Menu',
        content: 'Via de drie streepjes linksboven vind je je weekmenu, recepten, statistieken en instellingen.',
        icon: 'Menu',
        colorName: 'indigo'
    },
    {
        title: 'Toevoegen',
        content: 'Met de ronde + knop voeg je een product toe aan je vriezer, frigo of stock. Tik op een product voor alle acties.',
        icon: 'Plus',
        colorName: 'orange'
    },
    {
        title: 'Slimme boodschappenlijst',
        content: 'Stel een minimum voorraad in. Zodra een product bijna op is, komt het vanzelf op je boodschappenlijst.',
        icon: 'ShoppingCart',
        colorName: 'purple'
    }
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

export const WINKELS = [
    { name: 'AH', color: 'blue' }, { name: 'Colruyt', color: 'orange' }, { name: 'Delhaize', color: 'gray' },
    { name: 'Aldi', color: 'blue' }, { name: 'Lidl', color: 'yellow' }, { name: 'Jumbo', color: 'yellow' },
    { name: 'Carrefour', color: 'blue' }, { name: 'Kruidvat', color: 'red' }, { name: 'Action', color: 'blue' },
    { name: 'Overig', color: 'gray' }
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
