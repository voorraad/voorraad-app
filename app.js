const { useState, useEffect, useRef, useMemo, useCallback } = React;

// --- 1. FIREBASE CONFIGURATIE ---
const firebaseConfig = typeof __firebase_config !== 'undefined' 
    ? JSON.parse(__firebase_config) 
    : {
        apiKey: "AIzaSyCgsIQ-tGKor53WqsLoobZgI31xcCkdu48", 
        authDomain: "voorraad-7a7b2.firebaseapp.com",
        projectId: "voorraad-7a7b2",
        storageBucket: "vriezer-app.firebasestorage.app",
        messagingSenderId: "902712789943",
        appId: "1:902712789943:web:ef270b84968319052cf632"
    };

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

// --- 2. CONFIGURATIE DATA & CONSTANTEN ---
const APP_VERSION = '8.6.0'; 

// Versie Geschiedenis Data
const VERSION_HISTORY = [
    { 
        version: '8.6.0', 
        type: 'feature', 
        changes: [
            'Tech: Code herstructurering naar Custom Hooks en Componenten voor betere prestaties.',
            'Fix: Gemini AI model naam gecorrigeerd naar stabiele versie.',
            'Update: Swipe-acties verwijderd, knoppen zijn terug op mobiel.',
            'Nieuw: AI functies (Camera & Recepten) nu via Google Gemini (gratis API).'
        ] 
    },
    { 
        version: '8.5.0', 
        type: 'feature', 
        changes: [
            'Update: Overgeschakeld naar Google Gemini AI.',
            'Fix: Layout verbeteringen.'
        ] 
    },
    { 
        version: '8.4.0', 
        type: 'feature', 
        changes: [
            'Nieuw: AI Camera Scanner.',
            'Nieuw: AI Chef in "Wat eten we vandaag?".'
        ] 
    },
    { 
        version: '8.3.5', 
        type: 'feature', 
        changes: [
            'Nieuw: Aantal aanpassen bij toevoegen aan boodschappenlijst.',
            'Update: Steppers voor aantallen.'
        ] 
    }
];

// Kleuren definities
const BADGE_COLORS = {
    gray: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600",
    red: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-200 dark:border-red-800",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-200 dark:border-yellow-800",
    green: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-200 dark:border-green-800",
    blue: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-800",
    indigo: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-200 dark:border-indigo-800",
    purple: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/50 dark:text-purple-200 dark:border-purple-800",
    pink: "bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/50 dark:text-pink-200 dark:border-pink-800",
    orange: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/50 dark:text-orange-200 dark:border-orange-800"
};

const GRADIENTS = {
    blue: "from-blue-600 to-cyan-500",
    purple: "from-purple-600 to-indigo-500",
    pink: "from-pink-500 to-rose-500",
    orange: "from-orange-500 to-yellow-500",
    green: "from-emerald-600 to-teal-500",
    red: "from-red-600 to-orange-600",
    gray: "from-gray-700 to-gray-500",
    teal: "from-teal-600 to-emerald-400",
    indigo: "from-indigo-600 to-blue-500"
};

// Data lijsten
const WINKELS = [
    { name: "AH", color: "blue" }, { name: "Colruyt", color: "orange" }, { name: "Delhaize", color: "gray" },
    { name: "Aldi", color: "blue" }, { name: "Lidl", color: "yellow" }, { name: "Jumbo", color: "yellow" },
    { name: "Carrefour", color: "blue" }, { name: "Kruidvat", color: "red" }, { name: "Action", color: "blue" },
    { name: "Overig", color: "gray" }
];

const CATEGORIEEN_VRIES = [
    { name: "Vlees", color: "red" }, { name: "Vis", color: "blue" }, { name: "Groenten", color: "green" },
    { name: "Fruit", color: "yellow" }, { name: "Brood", color: "yellow" }, { name: "IJs", color: "pink" },
    { name: "Restjes", color: "gray" }, { name: "Saus", color: "red" }, { name: "Friet", color: "yellow" },
    { name: "Pizza", color: "orange" }, { name: "Soep", color: "orange" }, { name: "Ander", color: "gray" }
];
const EENHEDEN_VRIES = ["stuks", "zak", "portie", "doos", "gram", "kilo", "bakje", "pak"];

const CATEGORIEEN_FRIG = [
    { name: "Vlees", color: "red" }, { name: "Vis", color: "blue" }, { name: "Groenten", color: "green" },
    { name: "Fruit", color: "yellow" }, { name: "Zuivel", color: "blue" }, { name: "Kaas", color: "yellow" },
    { name: "Beleg", color: "pink" }, { name: "Drank", color: "blue" }, { name: "Saus", color: "red" },
    { name: "Restjes", color: "gray" }, { name: "Soep", color: "orange" }, { name: "Ander", color: "gray" }
];
const EENHEDEN_FRIG = ["stuks", "zak", "portie", "doos", "gram", "kilo", "bakje", "pak", "fles", "pot"];

const CATEGORIEEN_VOORRAAD = [
    { name: "Pasta", color: "yellow" }, { name: "Rijst", color: "gray" }, { name: "Conserven", color: "red" },
    { name: "Saus", color: "red" }, { name: "Kruiden", color: "green" }, { name: "Bakproducten", color: "yellow" },
    { name: "Snacks", color: "orange" }, { name: "Drank", color: "blue" }, { name: "Huishoud", color: "gray" },
    { name: "Ander", color: "gray" }
];
const EENHEDEN_VOORRAAD = ["stuks", "pak", "fles", "blik", "pot", "liter", "kilo", "gram", "zak", "doos"];

const EMOJI_CATEGORIES = {
    "Fruit.": ["🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍎", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🥑", "🫒", "🍋‍🟩"],
    "Groenten.": ["🍆", "🥔", "🥕", "🌽", "🌶️", "🫑", "🥒", "🥬", "🥦", "🧄", "🧅", "🍄", "🥜", "🫘", "🌰", "🍠", "🫛", "🫚", "🍄‍🟫"],
    "Vlees.": ["🥩", "🍗", "🍖", "🥓", "🍔", "🌭", "🍳", "🥚", "🧀"],
    "Vis.": ["🐟", "🐠", "🐡", "🦈", "🐙", "🦀", "🦞", "🦐", "🦑", "🦪", "🍣", "🍤", "🎏"],
    "Deegwaren.": ["🍞", "🥐", "🥖", "🫓", "🥨", "🥯", "🥞", "🧇", "🥟", "🥠", "🥡", "🍜", "🍝", "🍕", "🍔"],
    "Fastfood.": ["🍟", "🥪", "🌮", "🌯", "🫔", "🥙", "🧆", "🥘", "🍲", "🫕", "🥣", "🥗", "🍿", "バター", "🧂", "🥫", "🍱", "🍘", "🍙", "🍚", "🍛", "🍢", "🍥", "🍡"],
    "Dessert.": ["🍦", "🍧", "🍨", "🍩", "🍪", "🎂", "🍰", "🧁", "🥧", "🍫", "🍬", "🍭", "🍮", "🍯"],
    "Drinken.": ["🍼", "🥛", "☕", "🫖", "🍵", "🍶", "🍾", "🍷", "🍸", "🍹", "🍺", "🍻", "🥂", "🥃", "🥤", "🧃", "🧉"],
     "Dieren.": ["🐄", "🐂", "🐃", "🐖", "🐏", "🐑", "🐐", "🐓", "🦃", "🦆", "🕊️", "🦢", "🪿", "🦤", "🐤", "🦬", "🐫", "🦘", "🐇", "🐷", "🐮", "🐔", "🐗", "🐴", "🫎", "🦏", "🐊"],
    "Voorraad basis.": ["🍝", "🍚", "🥫", "🫙", "🥡", "🧂", "🍾", "🥤", "🧃", "☕", "🍪", "🍫", "🥖", "🥞"],
    "Overig.": ["❄️", "🧊", "🏷️", "📦", "🛒", "🛍️", "🍽️", "🔪", "🥄", "👩🏼‍🍳", "👨🏼‍🍳", "👍🏼", "👎🏼", "🎆", "🎉", "🎊", "🎃", "🎄", "🎁", "👑"]
};

// --- 3. ICON COMPONENT & DEFINITIES ---
const Icon = ({ path, size = 20, className = "" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        {path}
    </svg>
);

const Icons = {
    Plus: <path d="M5 12h14M12 5v14"/>,
    Search: <path d="m21 21-4.3-4.3M11 17a6 6 0 1 0 0-12 6 6 0 0 0 0 12z"/>,
    Snowflake: <path d="M2 12h20M12 2v20m-8.5-6L12 12 8.5 8.5m7 7L12 12l3.5-3.5"/>,
    Box: <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.3 7 12 12l8.7-5M12 12v10"/>,
    Trash2: <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/>,
    Edit2: <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>,
    X: <path d="M18 6 6 18M6 6l12 12"/>,
    Info: <path d="M12 16v-4M12 8h.01M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z"/>,
    LogOut: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>,
    Users: <g><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></g>,
    Check: <path d="M20 6 9 17l-5-5"/>,
    Alert: <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3zM12 9v4M12 17h.01"/>,
    Settings: <g><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></g>,
    ChevronDown: <path d="m6 9 6 6 6-6"/>,
    ChevronRight: <path d="m9 18 6-6-6-6"/>,
    User: <g><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></g>,
    Printer: <g><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></g>,
    Share: <g><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></g>,
    Sun: <g><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></g>,
    Moon: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>,
    LogBook: <g><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></g>,
    Lock: <g><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></g>,
    Fridge: <path d="M5 2h14a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 6h14m-7-6v20"/>,
    Star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,
    Zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>, 
    Wrench: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>,
    ShoppingCart: <g><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></g>,
    PieChart: <g><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></g>,
    UtensilsCrossed: <g><path d="m3 2 14.5 14.5"/><path d="m3 16.5 14.5-14.5"/><path d="M12.5 11.5 21 20"/><path d="M20 21 11.5 12.5"/><path d="m20 3-8.5 8.5"/><path d="M3 20 11.5 11.5"/></g>,
    Utensils: <g><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></g>,
    Camera: <g><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></g>,
    Sparkles: <g><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M9 5H5"/><path d="M5 5H1"/><path d="M5 9V5"/></g>,
    Cloud: <path d="M17.5 19c0-1.7-1.3-3-3-3h-1.1c-.1-2.6-2.2-4.7-4.8-4.7-2.3 0-4.2 1.7-4.7 4-2.5.3-4.3 2.5-4 5 .3 2.5 2.5 4.3 5 4h9.6c1.7 0 3-1.3 3-3z"/>
};

// --- 4. HULPFUNCTIES ---
const getDagenOud = (timestamp) => {
    if (!timestamp) return 0;
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const getDagenTotTHT = (timestamp) => {
    if (!timestamp) return 999;
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    now.setHours(0,0,0,0);
    date.setHours(0,0,0,0);
    const diff = date - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24)); 
};

const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('nl-BE');
};

const formatDateTime = (timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('nl-BE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const toInputDate = (timestamp) => {
    if (!timestamp) return ''; 
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset*60*1000));
    return localDate.toISOString().split('T')[0];
};

const getEmojiForCategory = (cat) => {
    const emojis = { 
        "Vlees": "🥩", "Vis": "🐟", "Groenten": "🥦", "Fruit": "🍎", "Brood": "🍞", "IJs": "🍦", 
        "Restjes": "🥡", "Saus": "🥫", "Friet": "🍟", "Pizza": "🍕", "Pasta": "🍝", "Rijst": "🍚", 
        "Conserven": "🥫", "Kruiden": "🌿", "Bakproducten": "🥖", "Snacks": "🍿", "Drank": "🥤", 
        "Soep": "🍲", "Huishoud": "🧻", "Ander": "📦", "Geen": "🔳",
        "Zuivel": "🥛", "Kaas": "🧀", "Beleg": "🥪"
    };
    return emojis[cat] || "📦";
};

const getStatusColor = (dagenOud, type = 'vriezer', dagenTotTHT = 999) => {
    if (type === 'voorraad' || type === 'frig') {
        if (dagenTotTHT === 999) return 'border-l-4 border-green-400 dark:border-green-600'; 
        if (dagenTotTHT < 0) return 'border-l-4 border-red-500 bg-red-50 dark:bg-red-900/10 dark:border-red-600'; 
        if (dagenTotTHT <= 30) return 'border-l-4 border-yellow-400 dark:border-yellow-600'; 
        return 'border-l-4 border-green-400 dark:border-green-600'; 
    } else {
        if (dagenOud > 180) return 'border-l-4 border-red-500 dark:border-red-600'; 
        if (dagenOud > 90) return 'border-l-4 border-yellow-400 dark:border-yellow-600';
        return 'border-l-4 border-green-400 dark:border-green-600';
    }
};

const getDateTextColor = (dagenOud, type = 'vriezer', dagenTotTHT = 999) => {
    if (type === 'voorraad' || type === 'frig') {
        if (dagenTotTHT < 0) return 'text-red-600 dark:text-red-400 font-bold'; 
        if (dagenTotTHT <= 30) return 'text-orange-500 dark:text-orange-400 font-bold';
        return 'text-green-600 dark:text-green-400 font-medium';
    } else {
        if (dagenOud > 180) return 'text-red-600 dark:text-red-400 font-bold'; 
        if (dagenOud > 90) return 'text-orange-500 dark:text-orange-400 font-bold';
        return 'text-green-600 dark:text-green-400 font-medium';
    }
};

const formatAantal = (aantal) => {
  const num = parseFloat(aantal);
  if (num === 0.25) return '1/4';
  if (num === 0.5) return '1/2';
  if (num === 0.75) return '3/4';
  return aantal;
};

// --- API Functie ---
const callGemini = async (apiKey, prompt, imageBase64 = null) => {
    if (!apiKey) throw new Error("Geen Google Gemini API Key ingesteld");
    
    // GEBRUIK VAN GEMINI-1.5-FLASH
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const parts = [{ text: prompt }];
    
    if (imageBase64) {
        const cleanBase64 = imageBase64.split(',')[1];
        parts.push({
            inlineData: {
                mimeType: "image/jpeg",
                data: cleanBase64
            }
        });
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: parts }] })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.candidates[0].content.parts[0].text;
};

// --- 5. CUSTOM HOOKS ---

// Auth Hook
const useAuth = () => {
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (u) => {
            if (u) {
                setUser(u);
                try {
                    await db.collection('users').doc(u.uid).set({
                        laatstGezien: firebase.firestore.FieldValue.serverTimestamp(),
                        email: u.email
                    }, { merge: true });
                    const adminDoc = await db.collection('admins').doc(u.uid).get();
                    setIsAdmin(adminDoc.exists);
                } catch(e) { console.error(e); }
            } else {
                setUser(null);
                setIsAdmin(false);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const login = async () => {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            await auth.signInWithPopup(provider);
        } catch(e) { alert("Login Fout: " + e.message); }
    };

    const logout = () => auth.signOut();

    return { user, isAdmin, loading, login, logout };
};

// User Data Hook
const useUserData = (userId) => {
    const [data, setData] = useState({
        customUnitsVries: [], customUnitsFrig: [], customUnitsVoorraad: [],
        customCategories: CATEGORIEEN_VRIES, hiddenTabs: [],
        darkMode: false, openLades: [], stats: { wasted: 0, consumed: 0 },
        geminiAPIKey: ''
    });

    useEffect(() => {
        if (!userId) return;
        const unsub = db.collection('users').doc(userId).onSnapshot(doc => {
            if(doc.exists) {
                const d = doc.data();
                setData({
                    customUnitsVries: d.customUnitsVries || d.customUnits || [],
                    customUnitsFrig: d.customUnitsFrig || [],
                    customUnitsVoorraad: d.customUnitsVoorraad || [],
                    customCategories: (d.customCategories && d.customCategories.length > 0) ? d.customCategories : CATEGORIEEN_VRIES,
                    hiddenTabs: d.hiddenTabs || [],
                    darkMode: d.darkMode || false,
                    openLades: Array.isArray(d.openLades) ? d.openLades : [],
                    stats: d.stats || { wasted: 0, consumed: 0 },
                    geminiAPIKey: d.geminiAPIKey || d.openAIKey || ''
                });
            } else {
                db.collection('users').doc(userId).set({
                    customCategories: CATEGORIEEN_VRIES,
                    hiddenTabs: [], darkMode: false, openLades: [], stats: { wasted: 0, consumed: 0 }
                });
            }
        });
        return () => unsub();
    }, [userId]);

    return data;
};

// Inventory Hook
const useInventoryData = (userId) => {
    const [items, setItems] = useState([]);
    const [vriezers, setVriezers] = useState([]);
    const [lades, setLades] = useState([]);
    const [shoppingList, setShoppingList] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;
        const unsubV = db.collection('vriezers').where('userId', '==', userId).onSnapshot(s => setVriezers(s.docs.map(d => ({id: d.id, ...d.data(), type: d.data().type||'vriezer'}))));
        const unsubL = db.collection('lades').where('userId', '==', userId).onSnapshot(s => setLades(s.docs.map(d => ({id: d.id, ...d.data()}))));
        const unsubI = db.collection('items').where('userId', '==', userId).onSnapshot(s => setItems(s.docs.map(d => ({id: d.id, ...d.data()}))));
        const unsubS = db.collection('shoppingList').where('userId', '==', userId).onSnapshot(s => {
            setShoppingList(s.docs.map(d => ({id: d.id, ...d.data()})));
            setLoading(false);
        });

        return () => { unsubV(); unsubL(); unsubI(); unsubS(); };
    }, [userId]);

    return { items, vriezers, lades, shoppingList, loading };
};

// --- 6. UI COMPONENTEN ---

const Toast = ({ message, type = "success", onClose }) => {
    useEffect(() => { const timer = setTimeout(onClose, 3000); return () => clearTimeout(timer); }, []);
    const isSuccess = type === 'success';
    return (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-white ${isSuccess ? 'bg-green-600' : 'bg-red-600'} animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto`}>
            <div className="p-1 bg-white/20 rounded-full"><Icon path={isSuccess ? Icons.Check : Icons.Alert} size={20} className="text-white" /></div>
            <span className="font-bold text-sm tracking-wide">{message}</span>
        </div>
    );
};

const Modal = ({ isOpen, onClose, title, children, color = "blue" }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:hidden" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto modal-animate flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
                    <h3 className={`text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r ${GRADIENTS[color] || GRADIENTS.blue}`}>{title}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"><Icon path={Icons.X} className="text-gray-500 dark:text-gray-400" /></button>
                </div>
                <div className="p-4 space-y-4 flex-grow overflow-y-auto text-gray-800 dark:text-gray-200">{children}</div>
            </div>
        </div>
    );
};

// Item Component (Geoptimaliseerd met memo)
const ItemRow = React.memo(({ item, vriezerType, actieveCategorieen, onEdit, onDelete }) => {
    const daysOld = getDagenOud(item.ingevrorenOp);
    const daysTHT = getDagenTotTHT(item.houdbaarheidsDatum);
    const isStockItem = vriezerType === 'voorraad' || vriezerType === 'frig';
    
    const colorClass = getStatusColor(daysOld, vriezerType, daysTHT);
    const dateColorClass = getDateTextColor(daysOld, vriezerType, daysTHT);
    const catObj = actieveCategorieen.find(c => (c.name || c) === item.categorie);
    const catColor = catObj ? (catObj.color || 'gray') : 'gray';

    return (
        <li className={`flex items-center justify-between p-3 bg-white dark:bg-gray-800 ${colorClass} last:border-b-0`}>
            <div className="flex items-center gap-3 overflow-hidden min-w-0">
                <span className="text-2xl flex-shrink-0">{item.emoji||'📦'}</span>
                <div className="min-w-0 flex-grow">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{item.naam}</p>
                        {item.categorie && item.categorie !== "Geen" && <Badge type={catColor} text={item.categorie} />}
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 flex flex-wrap items-center gap-x-2">
                        <span className="font-bold">{formatAantal(item.aantal)} {item.eenheid}</span>
                        {!isStockItem && <span className={`text-xs ${dateColorClass}`}> • {formatDate(item.ingevrorenOp)}</span>}
                        {item.houdbaarheidsDatum && <span className={`text-xs ${isStockItem ? dateColorClass : 'text-gray-500 dark:text-gray-400'}`}> • THT: {formatDate(item.houdbaarheidsDatum)}</span>}
                    </div>
                </div>
            </div>
            {/* KNOPPEN ZIJN TERUG, GEEN SWIPE */}
            <div className="flex items-center gap-1 flex-shrink-0 print:hidden ml-2">
                <button onClick={() => onEdit(item)} className="p-2 text-blue-500 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50"><Icon path={Icons.Edit2} size={16}/></button>
                <button onClick={() => onDelete(item)} className="p-2 text-red-500 bg-red-50 dark:bg-red-900/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50"><Icon path={Icons.Trash2} size={16}/></button>
            </div>
        </li>
    );
});

const LocationCard = ({ vriezer, lades, items, collapsedLades, onToggleLade, actieveCategorieen, onEditItem, onDeleteItem, search }) => {
    const gradientKeys = Object.keys(GRADIENTS);
    let hash = 0;
    for (let i = 0; i < vriezer.id.length; i++) hash = (hash << 5) - hash + vriezer.id.charCodeAt(i);
    const colorKey = vriezer.color || gradientKeys[Math.abs(hash) % gradientKeys.length];
    const gradientClass = GRADIENTS[colorKey] || GRADIENTS.blue;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 page-break-inside-avoid">
            <h2 className={`text-lg font-bold mb-3 flex items-center gap-2 bg-clip-text text-transparent bg-gradient-to-r ${gradientClass}`}>{vriezer.naam}</h2>
            <div className="space-y-4">
                {lades.filter(l => l.vriezerId === vriezer.id).sort((a,b)=>a.naam.localeCompare(b.naam)).map(lade => {
                    const ladeItems = items.filter(i => i.ladeId === lade.id && i.naam.toLowerCase().includes(search.toLowerCase()));
                    if (ladeItems.length === 0 && search) return null;
                    const isCollapsed = collapsedLades.has(lade.id) && !search;
                    
                    return (
                        <div key={lade.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden page-break-inside-avoid transition-colors">
                            <div className="bg-gray-50/50 dark:bg-gray-700/50 px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 print:bg-white" onClick={() => onToggleLade(lade.id)}>
                                <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm flex items-center gap-2">
                                    {isCollapsed ? <Icon path={Icons.ChevronRight} className="print:hidden"/> : <Icon path={Icons.ChevronDown} className="print:hidden"/>} 
                                    {lade.naam} <span className="text-xs font-normal text-gray-400">({ladeItems.length})</span>
                                </h3>
                            </div>
                            {!isCollapsed && (
                                <ul className="block"> 
                                    {ladeItems.length === 0 ? <li className="p-4 text-center text-gray-400 text-sm italic">Leeg</li> : 
                                    ladeItems.map(item => (
                                        <ItemRow 
                                            key={item.id} 
                                            item={item} 
                                            vriezerType={vriezer.type} 
                                            actieveCategorieen={actieveCategorieen}
                                            onEdit={onEditItem}
                                            onDelete={onDeleteItem}
                                        />
                                    ))}
                                </ul>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// --- 7. MAIN APP ---
function App() {
    // Hooks init
    const { user, isAdmin, login, logout, loading: authLoading } = useAuth();
    const [beheerdeUserId, setBeheerdeUserId] = useState(null);
    
    // Data Hooks
    const userData = useUserData(beheerdeUserId);
    const { items, vriezers, lades, shoppingList, loading: dataLoading } = useInventoryData(beheerdeUserId);

    // Local UI State
    const [activeTab, setActiveTab] = useState('vriezer');
    const [search, setSearch] = useState('');
    const [collapsedLades, setCollapsedLades] = useState(new Set()); 
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [notification, setNotification] = useState(null);
    
    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showSuggestionModal, setShowSuggestionModal] = useState(false);
    const [showShoppingModal, setShowShoppingModal] = useState(false); 
    const [showBeheerModal, setShowBeheerModal] = useState(false);
    const [showWhatsNew, setShowWhatsNew] = useState(false);
    const [showVersionHistory, setShowVersionHistory] = useState(false);
    const [showSwitchAccount, setShowSwitchAccount] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showUserAdminModal, setShowUserAdminModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showLogModal, setShowLogModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    
    // Shopping delete flow
    const [showShopifyModal, setShowShopifyModal] = useState(false);
    const [itemToShopify, setItemToShopify] = useState(null);
    const [shopForDeletedItem, setShopForDeletedItem] = useState('');
    const [aantalForShopifyItem, setAantalForShopifyItem] = useState(1);
    const [showStatsModal, setShowStatsModal] = useState(false);

    // Form State
    const [editingItem, setEditingItem] = useState(null);
    const [modalType, setModalType] = useState('vriezer');
    const [itemToDelete, setItemToDelete] = useState(null);
    const [formData, setFormData] = useState({ naam: '', aantal: 1, eenheid: 'stuks', vriezerId: '', ladeId: '', categorie: 'Vlees', ingevrorenOp: new Date().toISOString().split('T')[0], houdbaarheidsDatum: '', emoji: '' });
    const [shoppingFormData, setShoppingFormData] = useState({ naam: '', aantal: 1, eenheid: 'stuks', winkel: '' });
    const [rememberLocation, setRememberLocation] = useState(false);
    const [beheerTab, setBeheerTab] = useState('locaties');
    
    // Beheer Form States
    const [newLocatieNaam, setNewLocatieNaam] = useState('');
    const [newLocatieColor, setNewLocatieColor] = useState('blue');
    const [selectedLocatieForBeheer, setSelectedLocatieForBeheer] = useState(null);
    const [newLadeNaam, setNewLadeNaam] = useState('');
    const [shareEmail, setShareEmail] = useState('');
    const [eenheidFilter, setEenheidFilter] = useState('vries');
    const [newUnitNaam, setNewUnitNaam] = useState('');
    const [newCatName, setNewCatName] = useState('');
    const [newCatColor, setNewCatColor] = useState('gray');
    const [editingUnitName, setEditingUnitName] = useState(null); 
    const [editUnitInput, setEditUnitInput] = useState('');
    const [editingLadeId, setEditingLadeId] = useState(null);
    const [editingLadeName, setEditingLadeName] = useState('');
    const [editingCatName, setEditingCatName] = useState(null);
    const [editCatInputName, setEditCatInputName] = useState('');
    const [editCatInputColor, setEditCatInputColor] = useState('gray');
    
    // AI State
    const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
    const [aiRecipes, setAiRecipes] = useState(null);
    const [isLoadingRecipes, setIsLoadingRecipes] = useState(false);
    const fileInputRef = useRef(null);
    const hasCheckedAlerts = useRef(false);

    const [usersList, setUsersList] = useState([]);
    const [logs, setLogs] = useState([]);

    // --- EFFECTS ---
    useEffect(() => {
        if (userData.darkMode) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    }, [userData.darkMode]);

    useEffect(() => {
        if (user) {
            setBeheerdeUserId(user.uid);
            checkShares(user);
        }
    }, [user]);

    const checkShares = async (u) => {
        const vCheck = await db.collection('vriezers').where('userId', '==', u.uid).limit(1).get();
        if (vCheck.empty) {
            const adminDoc = await db.collection('admins').doc(u.uid).get();
            if (!adminDoc.exists) {
                const shares = await db.collection('shares').where("sharedWithEmail", "==", u.email).where("status", "==", "accepted").limit(1).get();
                if (!shares.empty) setBeheerdeUserId(shares.docs[0].data().ownerId);
            }
        }
    };

    // Load saved open lades
    useEffect(() => {
        if (!dataLoading && lades.length > 0 && userData.openLades !== undefined && !isDataLoaded) {
            const initialCollapsed = new Set(lades.map(l => l.id));
            if (userData.openLades && userData.openLades.length > 0) {
                userData.openLades.forEach(id => initialCollapsed.delete(id));
            }
            setCollapsedLades(initialCollapsed);
            setIsDataLoaded(true);
        }
    }, [dataLoading, lades, userData.openLades, isDataLoaded]);

    // Admin lists
    useEffect(() => {
        if (isAdmin) {
            return db.collection('users').orderBy('email').onSnapshot(snap => setUsersList(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        }
    }, [isAdmin]);

    // Logs
    useEffect(() => {
        if (!user || !showLogModal) return;
        let query = isAdmin ? db.collection('logs') : db.collection('logs').where('targetUserId', '==', beheerdeUserId);
        return query.orderBy('timestamp', 'desc').limit(50).onSnapshot(snap => setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    }, [user, showLogModal, beheerdeUserId, isAdmin]);

    // --- MEMOIZED HELPERS ---
    const showNotification = (msg, type = 'success') => setNotification({ msg, type, id: Date.now() });

    const filteredLocaties = useMemo(() => vriezers.filter(l => l.type === activeTab), [vriezers, activeTab]);
    
    const actieveCategorieen = useMemo(() => {
        let base = modalType === 'voorraad' ? CATEGORIEEN_VOORRAAD : modalType === 'frig' ? CATEGORIEEN_FRIG : CATEGORIEEN_VRIES;
        return [...base, ...userData.customCategories.filter(cc => !base.some(c => c.name === cc.name))];
    }, [modalType, userData.customCategories]);

    const modalLocaties = useMemo(() => vriezers.filter(l => l.type === modalType), [vriezers, modalType]);
    const formLades = useMemo(() => formData.vriezerId ? lades.filter(l => l.vriezerId === formData.vriezerId).sort((a,b) => a.naam.localeCompare(b.naam)) : [], [formData.vriezerId, lades]);

    const alerts = useMemo(() => items.filter(i => {
        const loc = vriezers.find(v => v.id === i.vriezerId);
        const type = loc ? (loc.type || 'vriezer') : 'vriezer';
        return (type === 'voorraad' || type === 'frig') ? getDagenTotTHT(i.houdbaarheidsDatum) < 0 : getDagenOud(i.ingevrorenOp) > 180;
    }), [items, vriezers]);

    const logAction = async (action, itemNaam, details, actorUser, targetUserId) => {
        if (!actorUser) return;
        try {
            await db.collection('logs').add({
                action: action, 
                item: itemNaam,
                details: details,
                actorId: actorUser.uid,
                actorName: actorUser.displayName || actorUser.email,
                targetUserId: targetUserId, 
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) {
            console.error("Kon log niet opslaan", e);
        }
    };

    // Version Check
    useEffect(() => {
        if (isDataLoaded && !hasCheckedAlerts.current) {
            const lastVersion = localStorage.getItem('app_version');
            if (lastVersion !== APP_VERSION || alerts.length > 0) {
                setShowWhatsNew(true);
                if (lastVersion !== APP_VERSION) localStorage.setItem('app_version', APP_VERSION);
            }
            hasCheckedAlerts.current = true;
        }
    }, [isDataLoaded, alerts.length]);

    // --- HANDLERS ---
    const handleToggleLade = useCallback((id) => {
        setCollapsedLades(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
            if (user) {
                const openLadesArray = lades.filter(l => !newSet.has(l.id)).map(l => l.id);
                db.collection('users').doc(user.uid).set({ openLades: openLadesArray }, { merge: true }).catch(console.error);
            }
            return newSet;
        });
    }, [lades, user]);

    const handleOpenAdd = () => {
        setEditingItem(null); setModalType(activeTab);
        const typeLocs = vriezers.filter(l => l.type === activeTab);
        const defLoc = typeLocs.length > 0 ? typeLocs[0].id : '';
        const defCat = activeTab === 'voorraad' ? 'Pasta' : 'Vlees';
        
        if (!rememberLocation) {
            setFormData({ naam: '', aantal: 1, eenheid: 'stuks', vriezerId: defLoc, ladeId: '', categorie: defCat, ingevrorenOp: new Date().toISOString().split('T')[0], houdbaarheidsDatum: '', emoji: '' });
        } else {
            setFormData(p => ({ ...p, vriezerId: defLoc, naam: '', aantal: 1, categorie: defCat, ingevrorenOp: new Date().toISOString().split('T')[0], houdbaarheidsDatum: '', emoji: '' }));
        }
        setShowAddModal(true);
    };

    const handleSaveItem = async (e) => {
        e.preventDefault();
        const lade = lades.find(l => l.id === formData.ladeId);
        const data = { ...formData, aantal: parseFloat(formData.aantal), ladeNaam: lade ? lade.naam : '', ingevrorenOp: new Date(formData.ingevrorenOp), houdbaarheidsDatum: formData.houdbaarheidsDatum ? new Date(formData.houdbaarheidsDatum) : null, userId: beheerdeUserId, emoji: formData.emoji || getEmojiForCategory(formData.categorie) };
        
        try {
            if (editingItem) {
                await db.collection('items').doc(editingItem.id).update(data);
                await logAction('Bewerkt', data.naam, `${data.aantal} ${data.eenheid}`, user, beheerdeUserId);
                showNotification(`${data.naam} bijgewerkt!`);
            } else {
                await db.collection('items').add(data);
                await logAction('Toevoegen', data.naam, `${data.aantal} ${data.eenheid}`, user, beheerdeUserId);
                showNotification(`${data.naam} toegevoegd!`);
                if(!rememberLocation) setFormData(p => ({...p, naam: '', aantal: 1, emoji: ''}));
            }
            if(!rememberLocation) setShowAddModal(false);
        } catch(e) { showNotification("Fout: " + e.message, 'error'); }
    };

    const handleEditItem = useCallback((item) => {
        setEditingItem(item);
        const loc = vriezers.find(v => v.id === item.vriezerId);
        setModalType(loc ? loc.type : 'vriezer');
        setFormData({
            naam: item.naam, aantal: item.aantal, eenheid: item.eenheid, vriezerId: item.vriezerId, ladeId: item.ladeId, categorie: item.categorie,
            ingevrorenOp: toInputDate(item.ingevrorenOp), houdbaarheidsDatum: toInputDate(item.houdbaarheidsDatum), emoji: item.emoji
        });
        setShowAddModal(true);
    }, [vriezers]);

    const handleDeleteItem = useCallback((item) => { setItemToDelete(item); setShowDeleteModal(true); }, []);

    const confirmDelete = async (reason) => {
        if (!itemToDelete) return;
        try {
            await db.collection('items').doc(itemToDelete.id).delete();
            let detail = 'Verwijderd';
            if (reason === 'consumed') { detail = 'Opgegeten'; await db.collection('users').doc(beheerdeUserId).update({ 'stats.consumed': firebase.firestore.FieldValue.increment(1) }); }
            else if (reason === 'wasted') { detail = 'Weggegooid'; await db.collection('users').doc(beheerdeUserId).update({ 'stats.wasted': firebase.firestore.FieldValue.increment(1) }); }
            await logAction('Verwijderd', itemToDelete.naam, detail, user, beheerdeUserId);
            showNotification(`${itemToDelete.naam} verwijderd.`);
            setItemToShopify(itemToDelete); setAantalForShopifyItem(itemToDelete.aantal||1);
            setShowDeleteModal(false); setShowShopifyModal(true); setItemToDelete(null);
        } catch(e) { showNotification("Kon niet verwijderen", 'error'); }
    };

    // AI Handlers
    const handleCameraClick = () => fileInputRef.current.click();
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!userData.geminiAPIKey) return alert("Stel eerst je Google Gemini API Key in!");
        setIsAnalyzingImage(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
            try {
                const prompt = "Kijk naar deze verpakking. Geef me een JSON object met: naam (korte productnaam NL), categorie (Kies uit: Vlees, Vis, Groenten, Fruit, Brood, IJs, Restjes, Saus, Friet, Pizza, Soep, Ander), hoeveelheid (getal), eenheid (stuks, gram, kilo, liter, zak, pak, doos). Alleen JSON.";
                const res = await callGemini(userData.geminiAPIKey, prompt, reader.result);
                const parsed = JSON.parse(res.replace(/```json/g, '').replace(/```/g, '').trim());
                setFormData(p => ({ ...p, naam: parsed.naam||p.naam, categorie: parsed.categorie||p.categorie, aantal: parsed.hoeveelheid||p.aantal, eenheid: parsed.eenheid||p.eenheid, emoji: getEmojiForCategory(parsed.categorie) }));
                showNotification("Product herkend!");
            } catch(e) { showNotification("Kon foto niet lezen.", "error"); } finally { setIsAnalyzingImage(false); }
        };
        reader.readAsDataURL(file);
    };

    const handleGetRecipes = async () => {
        if (!userData.geminiAPIKey) return alert("Geen API Key!");
        setIsLoadingRecipes(true);
        try {
            const list = items.map(i => `${i.aantal} ${i.eenheid} ${i.naam}`).join(', ');
            const res = await callGemini(userData.geminiAPIKey, `Ik heb dit: ${list}. Bedenk 3 simpele gerechten. Geef titel, korte beschrijving en gebruikte ingrediënten. Gebruik emoji's.`);
            setAiRecipes(res);
        } catch(e) { showNotification("Kon recepten niet laden", "error"); } finally { setIsLoadingRecipes(false); }
    };

    const handleModalTypeChange = (newType) => {
        setModalType(newType);
        const newLocs = vriezers.filter(l => l.type === newType);
        const defaultLoc = newLocs.length > 0 ? newLocs[0].id : '';
        const defaultCat = newType === 'voorraad' ? 'Pasta' : 'Vlees';
        setFormData(prev => ({ ...prev, vriezerId: defaultLoc, ladeId: '', categorie: defaultCat }));
    };

    // --- RENDER ---
    if (authLoading) return <div className="flex h-screen items-center justify-center text-gray-500">Laden...</div>;
    if (!user) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-sm w-full text-center">
                <h1 className="text-2xl font-bold text-blue-600 mb-4">Voorraad.</h1>
                <p className="text-gray-500 mb-6">Log in om te beginnen.</p>
                <button onClick={login} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 py-3 rounded-xl font-semibold flex items-center justify-center gap-2">Inloggen met Google</button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 font-sans text-gray-800 dark:text-gray-100 transition-colors duration-300">
            {notification && <Toast message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
            
            <header className="bg-white dark:bg-gray-800 sticky top-0 z-30 shadow-sm border-b border-gray-200 dark:border-gray-700 print:hidden">
                <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400">Voorraad.</h1>
                    <div className="flex gap-2 relative">
                        <button onClick={() => { setSelectedLocatieForBeheer(null); setShowBeheerModal(true); }} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700"><Icon path={Icons.Settings}/></button>
                        <button onClick={() => setShowShoppingModal(true)} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 dark:bg-gray-700 border text-blue-600 relative">
                            <Icon path={Icons.ShoppingCart}/>
                            {shoppingList.length > 0 && <span className="absolute -top-1 -right-1 px-1 bg-red-500 rounded-full text-[10px] text-white font-bold">{shoppingList.length}</span>}
                        </button>
                        {isAdmin && <button onClick={() => setShowSwitchAccount(true)} className="w-10 h-10 flex items-center justify-center rounded-full bg-orange-100 text-orange-600"><Icon path={Icons.Users}/></button>}
                        <button onClick={() => setShowWhatsNew(true)} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 dark:bg-gray-700 relative"><Icon path={Icons.Info}/>{alerts.length > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full"></span>}</button>
                        <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200">{user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover"/> : <div className="w-full h-full bg-gray-200"/>}</button>
                        
                        {showProfileMenu && (
                            <div className="absolute right-0 mt-12 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border dark:border-gray-700 py-1 z-50">
                                <div className="px-4 py-3 border-b dark:border-gray-700"><p className="text-sm font-bold">{user.displayName}</p><p className="text-xs text-gray-500">{user.email}</p></div>
                                <button onClick={() => db.collection('users').doc(user.uid).set({ darkMode: !userData.darkMode }, { merge: true })} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex gap-2"><Icon path={userData.darkMode ? Icons.Sun : Icons.Moon} size={16}/> {userData.darkMode ? 'Licht' : 'Donker'}</button>
                                <button onClick={() => setShowStatsModal(true)} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex gap-2"><Icon path={Icons.PieChart} size={16}/> Statistieken</button>
                                <button onClick={() => setShowLogModal(true)} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex gap-2"><Icon path={Icons.LogBook} size={16}/> Logboek</button>
                                <button onClick={() => setShowShareModal(true)} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex gap-2"><Icon path={Icons.Share} size={16}/> Delen</button>
                                <button onClick={handlePrint} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex gap-2"><Icon path={Icons.Printer} size={16}/> Print</button>
                                <button onClick={logout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex gap-2 border-t dark:border-gray-700"><Icon path={Icons.LogOut} size={16}/> Uitloggen</button>
                            </div>
                        )}
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-4 flex space-x-6 border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
                    {['vriezer', 'frig', 'voorraad'].map(t => (
                        (!userData.hiddenTabs.includes(t) || isAdmin) && 
                        <button key={t} onClick={() => setActiveTab(t)} className={`pb-3 flex items-center gap-2 text-sm font-medium border-b-2 capitalize transition-colors ${activeTab===t ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>
                            <Icon path={t==='vriezer'?Icons.Snowflake:t==='frig'?Icons.Fridge:Icons.Box}/> {t}
                        </button>
                    ))}
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 space-y-6 flex-grow w-full pb-32">
                <div className="flex flex-col gap-4 print:hidden">
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        <div className="flex-shrink-0 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg border dark:border-gray-700 shadow-sm text-sm font-bold">{items.filter(i => filteredLocaties.some(l=>l.id===i.vriezerId)).length} items</div>
                        {filteredLocaties.map(l => <div key={l.id} className="flex-shrink-0 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg border dark:border-gray-700 shadow-sm text-sm">{items.filter(i=>i.vriezerId===l.id).length} {l.naam}</div>)}
                    </div>
                    <div className="flex gap-3">
                        <div className="relative flex-grow"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Icon path={Icons.Search} className="text-gray-400"/></div><input type="text" className="block w-full pl-10 pr-3 py-3 border dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Zoek..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
                        <button onClick={() => setShowSuggestionModal(true)} className="w-12 bg-yellow-100 text-yellow-600 rounded-xl flex items-center justify-center"><Icon path={Icons.Utensils}/></button>
                        <button onClick={() => setCollapsedLades(collapsedLades.size>0 ? new Set() : new Set(lades.map(l=>l.id)))} className="bg-white dark:bg-gray-800 border dark:border-gray-700 px-4 rounded-xl text-sm font-medium">{collapsedLades.size>0 ? "Open" : "Dicht"}</button>
                    </div>
                </div>

                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {filteredLocaties.map(vriezer => (
                        <LocationCard 
                            key={vriezer.id} 
                            vriezer={vriezer} 
                            lades={lades} 
                            items={items} 
                            collapsedLades={collapsedLades} 
                            onToggleLade={handleToggleLade} 
                            actieveCategorieen={actieveCategorieen}
                            onEditItem={handleEditItem}
                            onDeleteItem={handleDeleteItem}
                            search={search}
                        />
                    ))}
                </div>
            </main>

            <button onClick={handleOpenAdd} className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center z-40 hover:scale-105 transition-transform"><Icon path={Icons.Plus} size={28}/></button>

            {/* ADD / EDIT MODAL */}
            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={editingItem ? "Bewerken." : "Toevoegen."} color="blue">
                <form onSubmit={handleSaveItem} className="space-y-4">
                    {!editingItem && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-center border border-blue-100 dark:border-blue-800">
                            <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                            <button type="button" onClick={handleCameraClick} disabled={isAnalyzingImage} className="flex flex-col items-center justify-center w-full gap-2 text-blue-600 dark:text-blue-300">
                                {isAnalyzingImage ? <Icon path={Icons.Zap} className="animate-spin" size={32}/> : <Icon path={Icons.Camera} size={32}/>}
                                <span className="font-bold text-sm">{isAnalyzingImage ? "Analyseren..." : "Scan verpakking (AI)"}</span>
                            </button>
                        </div>
                    )}
                    <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg mb-4">
                        {['vriezer', 'frig', 'voorraad'].map(type => (
                            (!userData.hiddenTabs.includes(type) || isAdmin) &&
                            <button type="button" key={type} onClick={() => handleModalTypeChange(type)} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all capitalize ${modalType === type ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'}`}>{type}</button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setShowEmojiPicker(true)} className="w-12 h-12 flex-shrink-0 border rounded-lg flex items-center justify-center text-2xl bg-gray-50 dark:bg-gray-700">{formData.emoji || '🏷️'}</button>
                        <input type="text" placeholder="Productnaam" className="flex-grow h-12 px-4 border rounded-lg bg-white dark:bg-gray-700" value={formData.naam} onChange={e => setFormData({...formData, naam: e.target.value})} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <select className="w-full p-3 border rounded-lg bg-white dark:bg-gray-700" value={formData.vriezerId} onChange={e => setFormData({...formData, vriezerId: e.target.value})} required>
                            <option value="" disabled>Locatie...</option>
                            {modalLocaties.map(l => <option key={l.id} value={l.id}>{l.naam}</option>)}
                        </select>
                        <select className="w-full p-3 border rounded-lg bg-white dark:bg-gray-700" value={formData.ladeId} onChange={e => setFormData({...formData, ladeId: e.target.value})} required>
                            <option value="" disabled>Lade...</option>
                            {formLades.map(l => <option key={l.id} value={l.id}>{l.naam}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-4">
                        <input type="number" step="0.25" className="w-24 text-center h-12 border rounded-lg bg-white dark:bg-gray-700" value={formData.aantal} onChange={e => setFormData({...formData, aantal: e.target.value})} />
                        <select value={formData.eenheid} onChange={e => setFormData({...formData, eenheid: e.target.value})} className="flex-1 p-3 border rounded-lg bg-white dark:bg-gray-700">
                            {[...new Set([...(modalType==='voorraad'?EENHEDEN_VOORRAAD:modalType==='frig'?EENHEDEN_FRIG:EENHEDEN_VRIES), ...(modalType==='voorraad'?userData.customUnitsVoorraad:modalType==='frig'?userData.customUnitsFrig:userData.customUnitsVries)])].sort().map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <input type="date" className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700" value={formData.ingevrorenOp} onChange={e => setFormData({...formData, ingevrorenOp: e.target.value})} required={modalType==='vriezer'} />
                        <input type="date" className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700" value={formData.houdbaarheidsDatum} onChange={e => setFormData({...formData, houdbaarheidsDatum: e.target.value})} placeholder="THT" />
                    </div>
                    <select className="w-full p-3 border rounded-lg bg-white dark:bg-gray-700" value={formData.categorie} onChange={e => setFormData({...formData, categorie: e.target.value})}>
                        {actieveCategorieen.map(c => <option key={c.name||c} value={c.name||c}>{c.name||c}</option>)}
                    </select>
                    {!editingItem && (
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="rememberLocation" checked={rememberLocation} onChange={e => setRememberLocation(e.target.checked)} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300 dark:border-gray-600" />
                            <label htmlFor="rememberLocation" className="text-sm text-gray-700 dark:text-gray-300">Onthoud locatie en lade</label>
                        </div>
                    )}
                    <button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md">Opslaan</button>
                </form>
            </Modal>

            {/* OVERIGE MODALS */}
            <Modal isOpen={showEmojiPicker} onClose={() => setShowEmojiPicker(false)} title="Kies Emoji"><EmojiGrid onSelect={emoji => { setFormData(p=>({...p, emoji})); setShowEmojiPicker(false); }}/></Modal>
            
            <Modal isOpen={showShoppingModal} onClose={() => setShowShoppingModal(false)} title="Boodschappen">
                <form onSubmit={e => { e.preventDefault(); db.collection('shoppingList').add({ ...shoppingFormData, aantal: parseFloat(shoppingFormData.aantal), checked: false, userId: beheerdeUserId }); setShoppingFormData({ naam: '', aantal: 1, eenheid: 'stuks', winkel: '' }); }} className="flex gap-2 mb-4">
                    <input className="flex-grow p-2 border rounded bg-white dark:bg-gray-700" placeholder="Wat?" value={shoppingFormData.naam} onChange={e=>setShoppingFormData({...shoppingFormData, naam: e.target.value})} required/>
                    <button className="bg-blue-600 text-white px-4 rounded">+</button>
                </form>
                <div className="max-h-96 overflow-y-auto space-y-2">
                    {shoppingList.sort((a,b)=>a.checked-b.checked).map(i => (
                        <div key={i.id} className={`flex justify-between p-2 rounded border ${i.checked ? 'bg-gray-100 dark:bg-gray-800 opacity-50' : 'bg-white dark:bg-gray-700'}`}>
                            <span onClick={() => db.collection('shoppingList').doc(i.id).update({checked: !i.checked})} className={`cursor-pointer ${i.checked ? 'line-through' : ''}`}>{i.aantal} {i.eenheid} {i.naam}</span>
                            <div className="flex gap-2">
                                <button onClick={() => moveShoppingToStock(i)} className="text-green-500"><Icon path={Icons.Box}/></button>
                                <button onClick={() => db.collection('shoppingList').doc(i.id).delete()} className="text-red-500"><Icon path={Icons.Trash2}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </Modal>

            <Modal isOpen={showSuggestionModal} onClose={() => setShowSuggestionModal(false)} title="Recepten & Tips" color="yellow">
                <div className="mb-4 bg-purple-100 dark:bg-purple-900/30 p-4 rounded-xl">
                    <h4 className="font-bold flex gap-2 items-center text-purple-700 dark:text-purple-300"><Icon path={Icons.Sparkles}/> Chef AI</h4>
                    <button onClick={handleGetRecipes} disabled={isLoadingRecipes} className="mt-2 w-full py-2 bg-purple-600 text-white rounded-lg font-bold">{isLoadingRecipes ? "Aan het denken..." : "Verzin recepten"}</button>
                    {aiRecipes && <div className="mt-4 text-sm whitespace-pre-line bg-white dark:bg-gray-800 p-3 rounded">{aiRecipes}</div>}
                </div>
                <h4 className="font-bold mb-2">Eerst opmaken:</h4>
                {items.filter(i => (i.houdbaarheidsDatum && getDagenTotTHT(i.houdbaarheidsDatum) < 7) || getDagenOud(i.ingevrorenOp) > 90).slice(0,5).map(i => (
                    <div key={i.id} className="flex justify-between p-2 border-b dark:border-gray-700"><span>{i.naam}</span><span className="text-red-500 text-xs">Let op!</span></div>
                ))}
            </Modal>

            <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Weg?" color="red">
                <p className="mb-4">Waarom verwijder je <b>{itemToDelete?.naam}</b>?</p>
                <div className="grid gap-2">
                    <button onClick={() => confirmDelete('consumed')} className="p-3 bg-green-100 text-green-800 rounded font-bold">Opgegeten</button>
                    <button onClick={() => confirmDelete('wasted')} className="p-3 bg-red-100 text-red-800 rounded font-bold">Weggegooid</button>
                    <button onClick={() => confirmDelete('other')} className="p-3 bg-gray-100 text-gray-800 rounded font-bold">Andere</button>
                </div>
            </Modal>

            <Modal isOpen={showShopifyModal} onClose={() => setShowShopifyModal(false)} title="Op lijst?" color="blue">
                <p className="mb-4">Wil je <b>{itemToShopify?.naam}</b> kopen?</p>
                <div className="flex gap-2 mb-4">
                    <input type="number" className="w-20 border rounded p-2 text-center" value={aantalForShopifyItem} onChange={e => setAantalForShopifyItem(e.target.value)}/>
                    <select className="flex-grow border rounded p-2" value={shopForDeletedItem} onChange={e=>setShopForDeletedItem(e.target.value)}>
                        <option value="">Kies winkel...</option>{WINKELS.map(w => <option key={w.name} value={w.name}>{w.name}</option>)}
                    </select>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowShopifyModal(false)} className="flex-1 p-3 bg-gray-200 rounded">Nee</button>
                    <button onClick={() => { db.collection('shoppingList').add({ naam: itemToShopify.naam, aantal: parseFloat(aantalForShopifyItem), eenheid: itemToShopify.eenheid, winkel: shopForDeletedItem, checked: false, userId: beheerdeUserId }); setShowShopifyModal(false); showNotification("Toegevoegd!"); }} className="flex-1 p-3 bg-blue-600 text-white rounded font-bold">Ja</button>
                </div>
            </Modal>

            <Modal isOpen={showBeheerModal} onClose={() => setShowBeheerModal(false)} title="Instellingen" color="purple">
                <div className="flex border-b mb-4 overflow-x-auto">
                    {['locaties','categorieen','eenheden','cloud'].map(t => <button key={t} onClick={()=>setBeheerTab(t)} className={`flex-1 py-2 capitalize ${beheerTab===t?'border-b-2 border-purple-600 text-purple-600':''}`}>{t}</button>)}
                </div>
                {beheerTab === 'cloud' && (
                    <div className="space-y-4">
                        <p className="text-sm">API Key voor AI functies (Google Gemini):</p>
                        <input type="password" className="w-full p-2 border rounded" placeholder="AIza..." value={userData.geminiAPIKey} onChange={e => db.collection('users').doc(beheerdeUserId).set({ geminiAPIKey: e.target.value }, { merge: true })}/>
                    </div>
                )}
                {beheerTab === 'locaties' && (
                    <div>
                        <ul className="mb-4 space-y-2">{filteredLocaties.map(l => (
                            <li key={l.id} className="flex justify-between bg-gray-50 p-2 rounded">
                                <span>{l.naam}</span>
                                <button onClick={() => db.collection('vriezers').doc(l.id).delete()} className="text-red-500"><Icon path={Icons.Trash2}/></button>
                            </li>
                        ))}</ul>
                        <form onSubmit={e => { e.preventDefault(); db.collection('vriezers').add({ naam: newLocatieNaam, type: activeTab, color: newLocatieColor, userId: beheerdeUserId }); setNewLocatieNaam(''); }} className="flex gap-2">
                            <input className="flex-grow border p-2 rounded" placeholder="Nieuwe locatie" value={newLocatieNaam} onChange={e=>setNewLocatieNaam(e.target.value)} required/>
                            <button className="bg-purple-600 text-white px-4 rounded">+</button>
                        </form>
                    </div>
                )}
                {beheerTab === 'categorieen' && (
                    <div>
                        <ul className="mb-4 space-y-2">{actieveCategorieen.map(cat => (
                            <li key={cat.name} className="flex justify-between bg-gray-50 p-2 rounded">
                                <span className={`text-${cat.color}-600`}>{cat.name}</span>
                                <button onClick={() => {
                                    const updated = userData.customCategories.filter(c => c.name !== cat.name);
                                    db.collection('users').doc(beheerdeUserId).set({ customCategories: updated }, { merge: true });
                                }} className="text-red-500"><Icon path={Icons.Trash2}/></button>
                            </li>
                        ))}</ul>
                        <form onSubmit={e => { e.preventDefault(); if(newCatName.trim()){ db.collection('users').doc(beheerdeUserId).set({ customCategories: [...userData.customCategories, {name: newCatName, color: newCatColor}] }, { merge: true }); setNewCatName(''); } }} className="flex gap-2">
                            <input className="flex-grow border p-2 rounded" placeholder="Nieuwe categorie" value={newCatName} onChange={e=>setNewCatName(e.target.value)} required/>
                            <button className="bg-purple-600 text-white px-4 rounded">+</button>
                        </form>
                    </div>
                )}
                {beheerTab === 'eenheden' && (
                    <div>
                        <div className="flex mb-2"><button onClick={()=>setEenheidFilter('vries')} className={`flex-1 p-1 ${eenheidFilter==='vries'?'font-bold':''}`}>Vries</button><button onClick={()=>setEenheidFilter('frig')} className={`flex-1 p-1 ${eenheidFilter==='frig'?'font-bold':''}`}>Frig</button><button onClick={()=>setEenheidFilter('voorraad')} className={`flex-1 p-1 ${eenheidFilter==='voorraad'?'font-bold':''}`}>Stock</button></div>
                        <ul className="mb-4 space-y-2">{(eenheidFilter==='voorraad'?userData.customUnitsVoorraad:eenheidFilter==='frig'?userData.customUnitsFrig:userData.customUnitsVries).map(u => (
                            <li key={u} className="flex justify-between bg-gray-50 p-2 rounded"><span>{u}</span><button onClick={()=>{
                                let field = eenheidFilter==='voorraad'?'customUnitsVoorraad':eenheidFilter==='frig'?'customUnitsFrig':'customUnitsVries';
                                let current = eenheidFilter==='voorraad'?userData.customUnitsVoorraad:eenheidFilter==='frig'?userData.customUnitsFrig:userData.customUnitsVries;
                                db.collection('users').doc(beheerdeUserId).set({ [field]: current.filter(c => c !== u) }, { merge: true });
                            }} className="text-red-500"><Icon path={Icons.Trash2}/></button></li>
                        ))}</ul>
                        <form onSubmit={e => { e.preventDefault(); if(newUnitNaam.trim()){
                            let field = eenheidFilter==='voorraad'?'customUnitsVoorraad':eenheidFilter==='frig'?'customUnitsFrig':'customUnitsVries';
                            let current = eenheidFilter==='voorraad'?userData.customUnitsVoorraad:eenheidFilter==='frig'?userData.customUnitsFrig:userData.customUnitsVries;
                            db.collection('users').doc(beheerdeUserId).set({ [field]: [...current, newUnitNaam] }, { merge: true }); setNewUnitNaam('');
                        } }} className="flex gap-2">
                            <input className="flex-grow border p-2 rounded" placeholder="Nieuwe eenheid" value={newUnitNaam} onChange={e=>setNewUnitNaam(e.target.value)} required/>
                            <button className="bg-purple-600 text-white px-4 rounded">+</button>
                        </form>
                    </div>
                )}
            </Modal>

            <Modal isOpen={showStatsModal} onClose={() => setShowStatsModal(false)} title="Statistieken" color="purple">
                <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-green-100 p-4 rounded-xl"><div className="text-2xl font-bold text-green-700">{stats.consumed}</div><div className="text-xs uppercase text-green-800">Gegeten</div></div>
                    <div className="bg-red-100 p-4 rounded-xl"><div className="text-2xl font-bold text-red-700">{stats.wasted}</div><div className="text-xs uppercase text-red-800">Weggegooid</div></div>
                </div>
            </Modal>

            <Modal isOpen={showLogModal} onClose={() => setShowLogModal(false)} title="Logboek" color="teal">
                <ul className="space-y-2 text-sm">{logs.map(l => <li key={l.id} className="p-2 border-b"><b>{l.action}:</b> {l.item} <span className="text-gray-500 text-xs">({formatDateTime(l.timestamp)})</span></li>)}</ul>
            </Modal>

            <Modal isOpen={showShareModal} onClose={() => setShowShareModal(false)} title="Delen" color="green">
                <form onSubmit={e => { e.preventDefault(); db.collection('shares').add({ ownerId: user.uid, ownerEmail: user.email, sharedWithEmail: shareEmail, role: 'editor', status: 'pending' }); alert("Verzonden!"); setShareEmail(''); setShowShareModal(false); }} className="space-y-4">
                    <input type="email" className="w-full p-2 border rounded" placeholder="Email" value={shareEmail} onChange={e=>setShareEmail(e.target.value)} required/>
                    <button className="w-full py-2 bg-green-600 text-white rounded">Nodig uit</button>
                </form>
            </Modal>
            
            <Modal isOpen={showUserAdminModal} onClose={() => setShowUserAdminModal(false)} title="Gebruikers" color="pink">
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                    {usersList.map(u => (
                        <li key={u.id} className="p-3 flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                                <div><p className="font-bold dark:text-white">{u.email || u.displayName}</p><p className="text-xs text-gray-500">{u.id}</p></div>
                                <button onClick={() => db.collection('users').doc(u.id).update({ disabled: !u.disabled })} className={`px-3 py-1 rounded text-xs font-bold ${u.disabled ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{u.disabled ? 'Geblokkeerd' : 'Actief'}</button>
                            </div>
                        </li>
                    ))}
                </ul>
            </Modal>
            
            <Modal isOpen={showWhatsNew} onClose={() => setShowWhatsNew(false)} title="Nieuws" color="blue">
                <div className="space-y-4">
                    {VERSION_HISTORY.map((v, i) => (
                        <div key={i}>
                            <h4 className="font-bold">v{v.version}</h4>
                            <ul className="list-disc pl-5 text-sm">{v.changes.map((c, j) => <li key={j}>{c}</li>)}</ul>
                        </div>
                    ))}
                </div>
            </Modal>
            
            <Modal isOpen={showVersionHistory} onClose={() => setShowVersionHistory(false)} title="Versies" color="gray">
                 {/* Zelfde content als WhatsNew voor nu */}
                 <div className="space-y-4">
                    {VERSION_HISTORY.map((v, i) => (
                        <div key={i}>
                            <h4 className="font-bold">v{v.version}</h4>
                            <ul className="list-disc pl-5 text-sm">{v.changes.map((c, j) => <li key={j}>{c}</li>)}</ul>
                        </div>
                    ))}
                </div>
            </Modal>
            
            <Modal isOpen={showSwitchAccount} onClose={() => setShowSwitchAccount(false)} title="Wissel" color="gray">
                <ul className="divide-y">
                    {usersList.map(u => (
                        <li key={u.id} className="p-3 cursor-pointer hover:bg-gray-100" onClick={() => { setBeheerdeUserId(u.id); setShowSwitchAccount(false); }}>
                            {u.email || u.displayName}
                        </li>
                    ))}
                </ul>
            </Modal>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
