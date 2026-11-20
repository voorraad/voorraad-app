// Welke pushmeldingen wil iemand krijgen? Bewaard in users/{uid}.meldingen.
// Zelfde standaarden als op de server (server/index.js → STANDAARD).
export const MELDING_STANDAARD = { tijd: '', verlopen: true, bijna: true, lang: true, menu: true, lijst: false, lijstDag: 6, week: false, uitnodiging: true, bericht: true, wijziging: false, locaties: [] };

export const MELDING_SOORTEN = [
    { id: 'verlopen', groep: 'Elke dag', icon: 'Alert', tone: 'text-red-600', label: 'Verlopen producten', uitleg: 'Wat over de datum is. Tik op de melding voor de volledige lijst.' },
    { id: 'bijna', groep: 'Elke dag', icon: 'Clock', tone: 'text-orange-600', label: 'Vervalt binnenkort', uitleg: 'Wat binnen 3 dagen vervalt.' },
    { id: 'lang', groep: 'Elke dag', icon: 'Snowflake', tone: 'text-sky-600', label: 'Lang ingevroren', uitleg: 'Wat al meer dan 6 maanden in de vriezer ligt.' },
    { id: 'menu', groep: 'Elke dag', icon: 'Utensils', tone: 'text-teal-600', label: 'Weekmenu', uitleg: 'Wat er vandaag op het menu staat, en wat je moet ontdooien voor morgen.' },
    { id: 'lijst', groep: 'Elke week', icon: 'Cart', tone: 'text-violet-600', label: 'Boodschappenlijst', uitleg: 'Wat er op je lijstje staat, op de dag dat je winkelt.' },
    { id: 'week', groep: 'Elke week', icon: 'Chart', tone: 'text-emerald-600', label: 'Weekoverzicht', uitleg: 'Elke zondag: hoeveel je toevoegde, opat en weggooide.' },
    { id: 'wijziging', groep: 'Meteen', icon: 'Edit', tone: 'text-stone-600', label: 'Wijzigingen in een locatie', uitleg: 'Als iemand anders iets toevoegt, opmaakt, aanpast of verwijdert in de locaties die je kiest.' },
    { id: 'uitnodiging', groep: 'Meteen', icon: 'Users', tone: 'text-indigo-600', label: 'Uitnodigingen', uitleg: 'Als iemand je uitnodigt om samen een voorraad te beheren.' },
    { id: 'bericht', groep: 'Meteen', icon: 'Message', tone: 'text-amber-600', label: 'Berichten', uitleg: 'Berichten en belangrijke mededelingen van Voorraad.' }
];

export const DAGEN = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];

export function meldingPrefs(me) {
    const p = { ...MELDING_STANDAARD, ...((me && me.meldingen) || {}) };
    // Oude schakelaar 'Dagelijkse melding' uit = de dagelijkse meldingen uit.
    if (me && me.notificationsEnabled === false && !me.meldingen) p.verlopen = p.bijna = p.lang = p.menu = false;
    return p;
}

// Deze meldingen kan enkel een beheerder uitzetten.
export const VERGRENDELD = ['bericht', 'uitnodiging'];
