const { useState, useEffect, useRef } = React;

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

// --- 2. CONFIGURATIE DATA ---
const APP_VERSION = '8.3.5'; 

// Versie Geschiedenis Data
const VERSION_HISTORY = [
    { 
        version: '8.3.5', 
        type: 'feature', 
        changes: [
            'Nieuw: Aantal aanpassen bij het toevoegen aan boodschappenlijst na verwijderen.',
            'Update: Pijltjes (steppers) toegevoegd aan alle aantal-velden voor gebruiksgemak.'
        ] 
    },
    { 
        version: '8.3.4', 
        type: 'fix', 
        changes: [
            'Fix: Syntaxfout opgelost die de app liet crashen.',
            'Update: THT-datum in vriezer is nu zwart/grijs (neutraal).',
            'Nieuw: Je kunt nu een winkel kiezen als je een product verwijdert en op de lijst zet.'
        ] 
    }
];

// Standaard kleuren voor badges
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

const WINKELS = [
    { name: "AH", color: "blue" },
    { name: "Colruyt", color: "orange" },
    { name: "Delhaize", color: "gray" },
    { name: "Aldi", color: "blue" },
    { name: "Lidl", color: "yellow" },
    { name: "Jumbo", color: "yellow" },
    { name: "Carrefour", color: "blue" },
    { name: "Kruidvat", color: "red" },
    { name: "Action", color: "blue" },
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
    Utensils: <g><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></g>
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

// --- 5. COMPONENTEN ---

const Toast = ({ message, type = "success", onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    const isSuccess = type === 'success';
    const bgColor = isSuccess ? 'bg-green-600' : 'bg-red-600';
    const icon = isSuccess ? Icons.Check : Icons.Alert;

    return (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-white ${bgColor} animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto`}>
            <div className="p-1 bg-white/20 rounded-full">
                <Icon path={icon} size={20} className="text-white" />
            </div>
            <span className="font-bold text-sm tracking-wide">{message}</span>
        </div>
    );
};

const Modal = ({ isOpen, onClose, title, children, color = "blue" }) => {
    if (!isOpen) return null;
    
    const gradientClass = GRADIENTS[color] || GRADIENTS.blue;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:hidden" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto modal-animate flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
                    <h3 className={`text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r ${gradientClass}`}>{title}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"><Icon path={Icons.X} className="text-gray-500 dark:text-gray-400" /></button>
                </div>
                <div className="p-4 space-y-4 flex-grow overflow-y-auto text-gray-800 dark:text-gray-200">{children}</div>
            </div>
        </div>
    );
};

const Badge = ({ type, text }) => {
    let colorClass = BADGE_COLORS[type];
    if (!colorClass) colorClass = "bg-gray-200 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600";
    
    return (
        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${colorClass}`}>
            {text}
        </span>
    );
};

const EmojiGrid = ({ onSelect }) => {
    return (
        <div className="p-2 max-h-96 overflow-y-auto">
            {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                <div key={category} className="mb-4">
                    <h4 className="font-bold text-sm text-gray-600 dark:text-gray-400 mb-2 border-b border-gray-100 dark:border-gray-700 pb-1">{category}</h4>
                    <div className="grid grid-cols-8 gap-2">
                        {emojis.map(emoji => (
                            <button 
                                key={emoji} 
                                onClick={() => onSelect(emoji)} 
                                className="text-2xl hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors flex items-center justify-center"
                                type="button"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

// --- 6. APP ---
function App() {
    const [user, setUser] = useState(null);
    const [beheerdeUserId, setBeheerdeUserId] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [usersList, setUsersList] = useState([]);
    
    // User Settings
    const [managedUserHiddenTabs, setManagedUserHiddenTabs] = useState([]);
    const [myHiddenTabs, setMyHiddenTabs] = useState([]);
    const [darkMode, setDarkMode] = useState(false);
    const [savedOpenLades, setSavedOpenLades] = useState(null);
    const [stats, setStats] = useState({ wasted: 0, consumed: 0 });
    
    // Data
    const [activeTab, setActiveTab] = useState('vriezer');
    const [items, setItems] = useState([]);
    const [vriezers, setVriezers] = useState([]);
    const [lades, setLades] = useState([]);
    const [logs, setLogs] = useState([]); 
    const [shoppingList, setShoppingList] = useState([]);
    
    const [customUnitsVries, setCustomUnitsVries] = useState([]);
    const [customUnitsFrig, setCustomUnitsFrig] = useState([]);
    const [customUnitsVoorraad, setCustomUnitsVoorraad] = useState([]);
    const [customCategories, setCustomCategories] = useState([]);

    // UI
    const [search, setSearch] = useState('');
    const [collapsedLades, setCollapsedLades] = useState(new Set()); 
    const [editingItem, setEditingItem] = useState(null);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [notification, setNotification] = useState(null);
    
    // Modals & Menu
    const [showAddModal, setShowAddModal] = useState(false);
    const [showWhatsNew, setShowWhatsNew] = useState(false);
    const [showVersionHistory, setShowVersionHistory] = useState(false);
    const [showSwitchAccount, setShowSwitchAccount] = useState(false);
    const [showBeheerModal, setShowBeheerModal] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false); 
    const [showUserAdminModal, setShowUserAdminModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showLogModal, setShowLogModal] = useState(false); 
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [showSuggestionModal, setShowSuggestionModal] = useState(false);
    const [showShoppingModal, setShowShoppingModal] = useState(false); 
    const [beheerTab, setBeheerTab] = useState('locaties');

    // NIEUWE STATES VOOR WINKEL MODAL BIJ VERWIJDEREN
    const [showShopifyModal, setShowShopifyModal] = useState(false);
    const [itemToShopify, setItemToShopify] = useState(null);
    const [shopForDeletedItem, setShopForDeletedItem] = useState('');
    const [aantalForShopifyItem, setAantalForShopifyItem] = useState(1);

    // Forms
    const [formData, setFormData] = useState({
        naam: '', 
        aantal: 1, 
        eenheid: 'stuks', 
        vriezerId: '', 
        ladeId: '', 
        categorie: 'Vlees', 
        ingevrorenOp: new Date().toISOString().split('T')[0], 
        houdbaarheidsDatum: '', 
        emoji: ''
    });
    
    const [shoppingFormData, setShoppingFormData] = useState({ 
        naam: '', 
        aantal: 1, 
        eenheid: 'stuks',
        winkel: '' 
    });
    
    const [rememberLocation, setRememberLocation] = useState(false); 
    const [newLocatieNaam, setNewLocatieNaam] = useState('');
    const [newLocatieColor, setNewLocatieColor] = useState('blue'); 
    const [selectedLocatieForBeheer, setSelectedLocatieForBeheer] = useState(null);
    const [newLadeNaam, setNewLadeNaam] = useState('');
    const [newUnitNaam, setNewUnitNaam] = useState('');
    const [shareEmail, setShareEmail] = useState('');
    
    const [eenheidFilter, setEenheidFilter] = useState('vries'); 

    // NIEUW: State voor het type in de "Toevoegen" modal
    const [modalType, setModalType] = useState('vriezer');

    // Edit States
    const [editingLadeId, setEditingLadeId] = useState(null);
    const [editingLadeName, setEditingLadeName] = useState('');
    const [editingUnitName, setEditingUnitName] = useState(null); 
    const [editUnitInput, setEditUnitInput] = useState('');
    const [newCatName, setNewCatName] = useState('');
    const [newCatColor, setNewCatColor] = useState('gray');
    const [editingCatName, setEditingCatName] = useState(null);
    const [editCatInputName, setEditCatInputName] = useState('');
    const [editCatInputColor, setEditCatInputColor] = useState('gray');

    const hasCheckedAlerts = useRef(false);

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [darkMode]);

    const toggleDarkMode = async () => {
        if (!user) return;
        const newStatus = !darkMode;
        setDarkMode(newStatus);
        
        try {
            await db.collection('users').doc(user.uid).set({
                darkMode: newStatus
            }, { merge: true });
        } catch (e) {
            console.error("Kon dark mode niet opslaan", e);
        }
    };

    // --- AUTH & SETUP ---
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (u) => {
            if (u) {
                setUser(u);
                setBeheerdeUserId(u.uid);
                
                try {
                    await db.collection('users').doc(u.uid).set({
                        laatstGezien: firebase.firestore.FieldValue.serverTimestamp(),
                        email: u.email
                    }, { merge: true });
                } catch(e) { console.error("Kon laatstGezien niet updaten", e); }

                db.collection('users').doc(u.uid).onSnapshot(doc => {
                    if(doc.exists) {
                        const data = doc.data();
                        if (data.darkMode !== undefined) {
                            setDarkMode(data.darkMode);
                        }
                        setMyHiddenTabs(data.hiddenTabs || []);

                        if (data.openLades && Array.isArray(data.openLades)) {
                            setSavedOpenLades(data.openLades);
                        } else {
                            setSavedOpenLades([]);
                        }
                        if (data.stats) {
                            setStats(data.stats);
                        }
                    } else {
                        db.collection('users').doc(u.uid).set({
                            customCategories: CATEGORIEEN_VRIES,
                            customUnitsVries: [],
                            customUnitsFrig: [],
                            customUnitsVoorraad: [],
                            hiddenTabs: [],
                            darkMode: false,
                            openLades: [],
                            stats: { wasted: 0, consumed: 0 }
                        });
                        setSavedOpenLades([]);
                        setMyHiddenTabs([]);
                    }
                });

                const adminDoc = await db.collection('admins').doc(u.uid).get();
                setIsAdmin(adminDoc.exists);

                const vCheck = await db.collection('vriezers').where('userId', '==', u.uid).limit(1).get();
                if (vCheck.empty && !adminDoc.exists) {
                    const shares = await db.collection('shares').where("sharedWithEmail", "==", u.email).where("status", "==", "accepted").limit(1).get();
                    if (!shares.empty) setBeheerdeUserId(shares.docs[0].data().ownerId);
                }
            } else {
                setUser(null);
            }
        });
        return () => unsubscribe();
    }, []);

    // Sync Data
    useEffect(() => {
        if(!beheerdeUserId) return;
        const unsub = db.collection('users').doc(beheerdeUserId).onSnapshot(doc => {
            if(doc.exists) {
                const data = doc.data();
                
                let vriesUnits = data.customUnitsVries;
                if (!vriesUnits && data.customUnits) {
                    vriesUnits = data.customUnits;
                }
                setCustomUnitsVries(vriesUnits || []);
                setCustomUnitsFrig(data.customUnitsFrig || []);
                setCustomUnitsVoorraad(data.customUnitsVoorraad || []);
                setManagedUserHiddenTabs(data.hiddenTabs || []); 

                setCustomCategories(data.customCategories && data.customCategories.length > 0 ? data.customCategories : CATEGORIEEN_VRIES);
                if (data.stats) {
                    setStats(data.stats);
                }
            }
        });
        return () => unsub();
    }, [beheerdeUserId]);

    // Data Listeners
    useEffect(() => {
        if (!beheerdeUserId) return;
        const unsubV = db.collection('vriezers').where('userId', '==', beheerdeUserId).onSnapshot(s => setVriezers(s.docs.map(d => ({id: d.id, ...d.data(), type: d.data().type||'vriezer'}))));
        const unsubL = db.collection('lades').where('userId', '==', beheerdeUserId).onSnapshot(s => {
            const loadedLades = s.docs.map(d => ({id: d.id, ...d.data()}));
            setLades(loadedLades);
            
            if (!isDataLoaded && loadedLades.length > 0 && savedOpenLades !== null) {
                const initialCollapsed = new Set(loadedLades.map(l => l.id));
                if (savedOpenLades && savedOpenLades.length > 0) {
                    savedOpenLades.forEach(id => {
                        if (initialCollapsed.has(id)) {
                            initialCollapsed.delete(id);
                        }
                    });
                }
                setCollapsedLades(initialCollapsed);
                setIsDataLoaded(true);
            }
        });
        const unsubI = db.collection('items').where('userId', '==', beheerdeUserId).onSnapshot(s => setItems(s.docs.map(d => ({id: d.id, ...d.data()}))));
        const unsubS = db.collection('shoppingList').where('userId', '==', beheerdeUserId).onSnapshot(s => setShoppingList(s.docs.map(d => ({id: d.id, ...d.data()})))); 

        return () => { unsubV(); unsubL(); unsubI(); unsubS(); };
    }, [beheerdeUserId, isDataLoaded, savedOpenLades]); 

    useEffect(() => {
        if (isAdmin) {
            const unsubUsers = db.collection('users').orderBy('email').onSnapshot(snap => {
                setUsersList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            });
            return () => unsubUsers();
        }
    }, [isAdmin]);

    useEffect(() => {
    if (!user || !showLogModal) return;

    let query;
    
    if (isAdmin) {
        query = db.collection('logs').orderBy('timestamp', 'desc').limit(50);
    } else {
        query = db.collection('logs').where('targetUserId', '==', beheerdeUserId).orderBy('timestamp', 'desc').limit(50);
    }

    const unsubLogs = query.onSnapshot(snap => {
        setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsubLogs();
}, [user, showLogModal, beheerdeUserId, isAdmin]); 


    // Derived
    const filteredLocaties = vriezers.filter(l => l.type === activeTab);
    const activeItems = items.filter(i => filteredLocaties.some(l => l.id === i.vriezerId));

    const modalLocaties = vriezers.filter(l => l.type === modalType);

    const formLades = formData.vriezerId 
        ? lades.filter(l => l.vriezerId === formData.vriezerId).sort((a,b) => a.naam.localeCompare(b.naam))
        : [];
    
    const formLocationType = modalType;

    let contextEenheden = EENHEDEN_VRIES;
    let contextCategorieen = CATEGORIEEN_VRIES;
    let activeCustomUnits = customUnitsVries;

    if (formLocationType === 'voorraad') {
        contextEenheden = EENHEDEN_VOORRAAD;
        contextCategorieen = CATEGORIEEN_VOORRAAD;
        activeCustomUnits = customUnitsVoorraad;
    } else if (formLocationType === 'frig') {
        contextEenheden = EENHEDEN_FRIG;
        contextCategorieen = CATEGORIEEN_FRIG;
        activeCustomUnits = customUnitsFrig;
    }
    
    const alleEenheden = [...new Set([...contextEenheden, ...activeCustomUnits])].sort();

    const actieveCategorieen = [
        ...contextCategorieen, 
        ...customCategories.filter(cc => {
            const inHuidig = contextCategorieen.some(c => c.name === cc.name);
            return !inHuidig;
        })
    ];

    const gridClass = (() => {
        const count = filteredLocaties.length;
        if (count === 1) return 'grid-cols-1';
        if (count === 2) return 'grid-cols-1 md:grid-cols-2';
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    })();

    const showNotification = (msg, type = 'success') => {
        setNotification({ msg, type, id: Date.now() });
    };

    // Alerts Logic
    const alerts = items.filter(i => {
        const loc = vriezers.find(v => v.id === i.vriezerId);
        const type = loc ? (loc.type || 'vriezer') : 'vriezer';

        if (type === 'voorraad' || type === 'frig') {
             return getDagenTotTHT(i.houdbaarheidsDatum) < 0; 
        } else {
             return getDagenOud(i.ingevrorenOp) > 180;
        }
    });

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
    const handleGoogleLogin = async () => { 
        try { 
            const provider = new firebase.auth.GoogleAuthProvider();
            await auth.signInWithPopup(provider); 
        } catch(e) { alert("Login Fout: " + e.message); } 
    };

    const handleLogout = () => { auth.signOut(); setShowProfileMenu(false); };
    const handlePrint = () => { setShowProfileMenu(false); window.print(); };
    
    // Item CRUD
    const handleOpenAdd = () => {
        setEditingItem(null);
        setModalType(activeTab); 
        
        const typeLocaties = vriezers.filter(l => l.type === activeTab);
        const defaultLoc = typeLocaties.length > 0 ? typeLocaties[0].id : '';
        const defaultCat = activeTab === 'voorraad' ? 'Pasta' : 'Vlees';
        
        if (!rememberLocation) {
            setFormData({
                naam: '', aantal: 1, eenheid: 'stuks', vriezerId: defaultLoc, ladeId: '', 
                categorie: defaultCat, ingevrorenOp: new Date().toISOString().split('T')[0], houdbaarheidsDatum: '', emoji: ''
            });
        } else {
             setFormData(prev => ({
                ...prev,
                vriezerId: defaultLoc,
                naam: '', aantal: 1, categorie: defaultCat, 
                ingevrorenOp: new Date().toISOString().split('T')[0], houdbaarheidsDatum: '', emoji: ''
            }));
        }
        setShowAddModal(true);
    };
    
    const handleModalTypeChange = (newType) => {
        setModalType(newType);
        const newLocs = vriezers.filter(l => l.type === newType);
        const defaultLoc = newLocs.length > 0 ? newLocs[0].id : '';
        const defaultCat = newType === 'voorraad' ? 'Pasta' : 'Vlees';
        
        setFormData(prev => ({
            ...prev,
            vriezerId: defaultLoc,
            ladeId: '',
            categorie: defaultCat
        }));
    };

    const handleSaveItem = async (e) => {
        e.preventDefault();
        const lade = lades.find(l => l.id === formData.ladeId);
        
        const data = {
            ...formData,
            aantal: parseFloat(formData.aantal),
            ladeNaam: lade ? lade.naam : '',
            ingevrorenOp: new Date(formData.ingevrorenOp),
            houdbaarheidsDatum: formData.houdbaarheidsDatum ? new Date(formData.houdbaarheidsDatum) : null,
            userId: beheerdeUserId,
            emoji: formData.emoji || getEmojiForCategory(formData.categorie)
        };
        try {
            if(editingItem) {
                await db.collection('items').doc(editingItem.id).update(data);
                await logAction('Bewerkt', data.naam, `${data.aantal} ${data.eenheid}`, user, beheerdeUserId);
                showNotification(`${data.naam} is bijgewerkt!`, 'success');
                setEditingItem(null);
                setShowAddModal(false);
            } else {
                await db.collection('items').add(data);
                await logAction('Toevoegen', data.naam, `${data.aantal} ${data.eenheid}`, user, beheerdeUserId);
                showNotification(`${data.naam} is toegevoegd!`, 'success');
                if (rememberLocation) {
                    setFormData(prev => ({
                        ...prev, 
                        naam: '', aantal: 1, emoji: '', 
                        ingevrorenOp: new Date().toISOString().split('T')[0],
                        houdbaarheidsDatum: ''
                    }));
                } else {
                    const defaultCat = activeTab === 'voorraad' ? 'Pasta' : 'Vlees';
                    setFormData(prev => ({...prev, naam: '', aantal: 1, emoji: '', categorie: defaultCat})); 
                }
                setShowAddModal(false);
            }
        } catch(err) { showNotification("Er ging iets mis: " + err.message, 'error'); }
    };

    const initDelete = (item) => {
        setItemToDelete(item);
        setShowDeleteModal(true);
    };

    const confirmDelete = async (reason) => {
        if (!itemToDelete) return;
        
        try {
            await db.collection('items').doc(itemToDelete.id).delete();
            
            let logDetail = 'Item verwijderd';
            if (reason === 'consumed') {
                logDetail = 'Opgegeten';
                await db.collection('users').doc(beheerdeUserId).update({ 'stats.consumed': firebase.firestore.FieldValue.increment(1) });
            } else if (reason === 'wasted') {
                logDetail = 'Weggegooid (Verspild)';
                await db.collection('users').doc(beheerdeUserId).update({ 'stats.wasted': firebase.firestore.FieldValue.increment(1) });
            }

            await logAction('Verwijderd', itemToDelete.naam, logDetail, user, beheerdeUserId);
            showNotification(`${itemToDelete.naam} is verwijderd.`, 'success');
            
            setItemToShopify(itemToDelete);
            setAantalForShopifyItem(itemToDelete.aantal || 1);
            setShowDeleteModal(false);
            setShowShopifyModal(true);
            setItemToDelete(null);

        } catch(err) {
            showNotification("Kon niet verwijderen", 'error');
            setShowDeleteModal(false);
            setItemToDelete(null);
        }
    };

    const handleAddToShoppingFromDelete = async () => {
        if (!itemToShopify) return;

        await db.collection('shoppingList').add({
            naam: itemToShopify.naam,
            aantal: parseFloat(aantalForShopifyItem),
            eenheid: itemToShopify.eenheid || 'stuks',
            winkel: shopForDeletedItem,
            checked: false,
            userId: beheerdeUserId
        });
        showNotification("Aan boodschappenlijst toegevoegd.", "success");
        
        setShopForDeletedItem('');
        setItemToShopify(null);
        setAantalForShopifyItem(1);
        setShowShopifyModal(false);
    };

    const handleAddShoppingItem = async (e) => {
        e.preventDefault();
        await db.collection('shoppingList').add({
            ...shoppingFormData,
            aantal: parseFloat(shoppingFormData.aantal),
            checked: false,
            userId: beheerdeUserId
        });
        setShoppingFormData({ naam: '', aantal: 1, eenheid: 'stuks', winkel: '' });
    };

    const toggleShoppingItem = async (item) => {
        await db.collection('shoppingList').doc(item.id).update({ checked: !item.checked });
    };

    const deleteShoppingItem = async (id) => {
        await db.collection('shoppingList').doc(id).delete();
    };
    
    const moveShoppingToStock = async (item) => {
        setEditingItem(null);
        setModalType('voorraad'); 

        const stockLocs = vriezers.filter(l => l.type === 'voorraad');
        const defaultLoc = stockLocs.length > 0 ? stockLocs[0].id : '';

        setFormData({
            naam: item.naam, aantal: item.aantal, eenheid: item.eenheid, 
            vriezerId: defaultLoc, ladeId: '', categorie: 'Overig', 
            ingevrorenOp: new Date().toISOString().split('T')[0], houdbaarheidsDatum: '', emoji: ''
        });
        
        setShowAddModal(true);
        setShowShoppingModal(false); 
        
        if(confirm("Verwijder van boodschappenlijst?")) {
            deleteShoppingItem(item.id);
        }
    };

    const getSuggestions = () => {
        const scoredItems = items.map(item => {
            let score = 0;
            const daysTHT = item.houdbaarheidsDatum ? getDagenTotTHT(item.houdbaarheidsDatum) : 999;
            const daysOld = getDagenOud(item.ingevrorenOp);
            const loc = vriezers.find(v => v.id === item.vriezerId);
            const type = loc?.type || 'vriezer';

            if (type === 'vriezer') {
                if (daysOld > 180) score += 50; 
                else if (daysOld > 90) score += 20;
            } else { 
                if (daysTHT < 0) score += 100; 
                else if (daysTHT <= 3) score += 80; 
                else if (daysTHT <= 7) score += 40;
            }
            return { ...item, score, daysTHT, daysOld, type };
        });

        return scoredItems.filter(i => i.score > 0).sort((a,b) => b.score - a.score).slice(0, 5);
    };

    const openEdit = (item) => {
        setEditingItem(item);
        const loc = vriezers.find(v => v.id === item.vriezerId);
        const itemType = loc ? loc.type : 'vriezer';
        setModalType(itemType);

        setFormData({
            naam: item.naam, aantal: item.aantal, eenheid: item.eenheid, vriezerId: item.vriezerId, ladeId: item.ladeId, categorie: item.categorie,
            ingevrorenOp: toInputDate(item.ingevrorenOp), houdbaarheidsDatum: toInputDate(item.houdbaarheidsDatum), emoji: item.emoji
        });
        setShowAddModal(true);
    };

    const handleAddLocatie = async (e) => {
        e.preventDefault();
        await db.collection('vriezers').add({ 
            naam: newLocatieNaam, 
            type: activeTab, 
            userId: beheerdeUserId,
            color: newLocatieColor 
        });
        setNewLocatieNaam('');
        setNewLocatieColor('blue');
    };

    const cycleLocatieColor = async (locatie) => {
        const keys = Object.keys(GRADIENTS);
        const currentColor = locatie.color || 'blue'; 
        const currentIndex = keys.indexOf(currentColor);
        const nextIndex = (currentIndex + 1) % keys.length;
        const nextColor = keys[nextIndex];
        
        await db.collection('vriezers').doc(locatie.id).update({ color: nextColor });
    };

    const handleDeleteLocatie = async (id) => {
        if(lades.some(l => l.vriezerId === id)) return alert("Maak locatie eerst leeg.");
        if(confirm("Verwijderen?")) await db.collection('vriezers').doc(id).delete();
    };

    const handleAddLade = async (e) => {
        e.preventDefault();
        await db.collection('lades').add({ naam: newLadeNaam, vriezerId: selectedLocatieForBeheer, userId: beheerdeUserId });
        setNewLadeNaam('');
    };
    const handleDeleteLade = async (id) => {
        if(items.some(i => i.ladeId === id)) return alert("Maak lade eerst leeg.");
        if(confirm("Verwijderen?")) await db.collection('lades').doc(id).delete();
    };
    
    const startEditLade = (l) => { setEditingLadeId(l.id); setEditingLadeName(l.naam); };
    const saveLadeName = async (id) => {
        await db.collection('lades').doc(id).update({ naam: editingLadeName });
        const batch = db.batch();
        const itemsInLade = items.filter(i => i.ladeId === id);
        itemsInLade.forEach(item => {
            batch.update(db.collection('items').doc(item.id), { ladeNaam: editingLadeName });
        });
        await batch.commit();
        setEditingLadeId(null);
    };

    const handleAddUnit = async (e) => {
        e.preventDefault();
        const naam = newUnitNaam.trim().toLowerCase();
        
        let standardList = EENHEDEN_VRIES;
        let currentCustom = customUnitsVries;
        let dbField = 'customUnitsVries';

        if (eenheidFilter === 'voorraad') {
            standardList = EENHEDEN_VOORRAAD;
            currentCustom = customUnitsVoorraad;
            dbField = 'customUnitsVoorraad';
        } else if (eenheidFilter === 'frig') {
            standardList = EENHEDEN_FRIG;
            currentCustom = customUnitsFrig;
            dbField = 'customUnitsFrig';
        }

        if(naam && !standardList.includes(naam) && !currentCustom.includes(naam)) {
            const updated = [...currentCustom, naam];
            await db.collection('users').doc(beheerdeUserId).set({[dbField]: updated}, {merge:true});
            setNewUnitNaam('');
        }
    };

    const handleDeleteUnit = async (unit) => {
        if(confirm(`Verwijder eenheid '${unit}'?`)) {
            let currentCustom = customUnitsVries;
            let dbField = 'customUnitsVries';

            if (eenheidFilter === 'voorraad') {
                currentCustom = customUnitsVoorraad;
                dbField = 'customUnitsVoorraad';
            } else if (eenheidFilter === 'frig') {
                currentCustom = customUnitsFrig;
                dbField = 'customUnitsFrig';
            }
            
            const updated = currentCustom.filter(u => u !== unit);
            await db.collection('users').doc(beheerdeUserId).set({[dbField]: updated}, {merge:true});
        }
    };
    
    const startEditUnit = (u) => { setEditingUnitName(u); setEditUnitInput(u); };
    const saveUnitName = async (id) => {
        if(!editUnitInput.trim()) return;
        
        let currentCustom = customUnitsVries;
        let dbField = 'customUnitsVries';

        if (eenheidFilter === 'voorraad') {
            currentCustom = customUnitsVoorraad;
            dbField = 'customUnitsVoorraad';
        } else if (eenheidFilter === 'frig') {
            currentCustom = customUnitsFrig;
            dbField = 'customUnitsFrig';
        }

        const updated = currentCustom.map(u => u === editingUnitName ? editUnitInput : u);
        await db.collection('users').doc(beheerdeUserId).set({[dbField]: updated}, {merge:true});
        
        const batch = db.batch();
        const itemsWithUnit = items.filter(i => i.eenheid === editingUnitName);
        itemsWithUnit.forEach(item => {
            batch.update(db.collection('items').doc(item.id), { eenheid: editUnitInput });
        });
        await batch.commit();
        setEditingUnitName(null);
    };

    const handleAddCat = async (e) => {
        e.preventDefault();
        if(newCatName.trim()) {
            const updated = [...customCategories, {name: newCatName, color: newCatColor}];
            await db.collection('users').doc(beheerdeUserId).set({customCategories: updated}, {merge:true});
            setNewCatName('');
        }
    };
    const handleDeleteCat = async (catName) => {
        if(confirm(`Verwijder categorie '${catName}'?`)) {
            const updated = customCategories.filter(c => c.name !== catName);
            await db.collection('users').doc(beheerdeUserId).set({customCategories: updated}, {merge:true});
        }
    };
    const startEditCat = (cat) => { 
        setEditingCatName(cat.name); 
        setEditCatInputName(cat.name); 
        setEditCatInputColor(cat.color || 'gray'); 
    };
    const saveCat = async () => {
        if(!editCatInputName.trim()) return;
        const updated = customCategories.map(c => c.name === editingCatName ? {name: editCatInputName, color: editCatInputColor} : c);
        await db.collection('users').doc(beheerdeUserId).set({customCategories: updated}, {merge:true});

        if(editingCatName !== editCatInputName) {
            const batch = db.batch();
            const itemsWithCat = items.filter(i => i.categorie === editingCatName);
            itemsWithCat.forEach(item => {
                batch.update(db.collection('items').doc(item.id), { categorie: editCatInputName });
            });
            await batch.commit();
        }
        setEditingCatName(null);
    };


    const handleShare = async (e) => {
        e.preventDefault();
        await db.collection('shares').add({ 
            ownerId: user.uid, ownerEmail: user.email, sharedWithEmail: shareEmail, role: 'editor', status: 'pending' 
        });
        alert("Uitnodiging verstuurd!");
        setShareEmail('');
        setShowShareModal(false);
    };

    const toggleUserStatus = async (userId, currentStatus) => {
        await db.collection('users').doc(userId).update({ disabled: !currentStatus }); 
    };

    const toggleUserTabVisibility = async (userId, userHiddenTabs, tabName) => {
        const tabs = userHiddenTabs || [];
        let newTabs;
        if (tabs.includes(tabName)) {
            newTabs = tabs.filter(t => t !== tabName);
        } else {
            newTabs = [...tabs, tabName];
        }
        await db.collection('users').doc(userId).set({ hiddenTabs: newTabs }, { merge: true });
    };

    const toggleLade = async (id) => {
        const newSet = new Set(collapsedLades);
        if(newSet.has(id)) newSet.delete(id); 
        else newSet.add(id); 
        
        setCollapsedLades(newSet);

        if(user) {
            const openLadesArray = lades
                .filter(l => !newSet.has(l.id))
                .map(l => l.id);
            try {
                await db.collection('users').doc(user.uid).set({ openLades: openLadesArray }, { merge: true });
            } catch(e) { console.error("Kon lade status niet opslaan", e); }
        }
    };

    const toggleAll = async () => {
        const expanding = collapsedLades.size > 0; 
        const newSet = expanding ? new Set() : new Set(lades.map(l => l.id));
        setCollapsedLades(newSet);

        if (user) {
            const openLadesArray = expanding ? lades.map(l => l.id) : [];
            try {
                await db.collection('users').doc(user.uid).set({ openLades: openLadesArray }, { merge: true });
            } catch(e) { console.error("Kon lade status niet opslaan", e); }
        }
    };

    // --- RENDER ---
    if (!user) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4 transition-colors duration-300">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-sm w-full text-center">
                <h1 className="text-2xl font-bold text-blue-600 mb-4">Voorraad.</h1>
                <p className="text-gray-500 dark:text-gray-400 mb-6">Log in om je voorraad te beheren.</p>
                <button onClick={handleGoogleLogin} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 py-3 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-600 transition flex items-center justify-center gap-2 mb-3">
                    <svg width="20" height="20" viewBox="0 0 24 24"><g><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></g></svg>
                    Inloggen met Google
                </button>
            </div>
        </div>
    );

    const currentVersionData = VERSION_HISTORY.find(v => v.version === APP_VERSION);

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 font-sans text-gray-800 dark:text-gray-100 transition-colors duration-300">
             {notification && (
                <Toast 
                    message={notification.msg} 
                    type={notification.type} 
                    key={notification.id}
                    onClose={() => setNotification(null)}
                />
            )}

            <header className="bg-white dark:bg-gray-800 sticky top-0 z-30 shadow-sm border-b border-gray-200 dark:border-gray-700 print:hidden transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400">Voorraad.</h1>
                    <div className="flex gap-2 relative">
                        <button onClick={() => { setSelectedLocatieForBeheer(null); setBeheerdeUserId(beheerdeUserId); setShowBeheerModal(true); }} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"><Icon path={Icons.Settings}/></button>

                        <button onClick={() => setShowShoppingModal(true)} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 relative hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-blue-600 dark:text-blue-400">
                            <Icon path={Icons.ShoppingCart}/>
                            {shoppingList.length > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center border-2 border-white dark:border-gray-800 font-bold">
                                    {shoppingList.length}
                                </span>
                            )}
                        </button>
                        
                        {isAdmin && <button onClick={() => setShowSwitchAccount(true)} className="w-10 h-10 flex items-center justify-center rounded-full bg-orange-100 text-orange-600 hover:bg-orange-200 transition-colors"><Icon path={Icons.Users}/></button>}
                        
                        <button onClick={() => setShowWhatsNew(true)} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 relative hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"><Icon path={Icons.Info}/>{alerts.length > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>}</button>
                        
                        <div className="relative">
                            <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-600 hover:border-blue-500 transition-colors">
                                {user.photoURL ? <img src={user.photoURL} alt="Profiel" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400"><Icon path={Icons.User} size={20}/></div>}
                            </button>
                            {showProfileMenu && (
                                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-700">
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user.displayName || 'Gebruiker'}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                                    </div>
                                    
                                    <button onClick={toggleDarkMode} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                                        {darkMode ? (
                                            <>
                                                <Icon path={Icons.Sun} size={16} /> Licht.
                                            </>
                                        ) : (
                                            <>
                                                <Icon path={Icons.Moon} size={16} /> Donker.
                                            </>
                                        )}
                                    </button>

                                    {isAdmin && (
                                        <button onClick={() => { setShowUserAdminModal(true); setShowProfileMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                                            <Icon path={Icons.Users} size={16}/> Gebruikers.
                                        </button>
                                    )}
                                    <button onClick={() => { setShowStatsModal(true); setShowProfileMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                                        <Icon path={Icons.PieChart} size={16}/> Statistieken.
                                    </button>
                                    <button onClick={() => { setShowLogModal(true); setShowProfileMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                                        <Icon path={Icons.LogBook} size={16}/> Logboek.
                                    </button>
                                    <button onClick={() => { setShowShareModal(true); setShowProfileMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                                        <Icon path={Icons.Share} size={16}/> Delen.
                                    </button>
                                    <button onClick={handlePrint} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                                        <Icon path={Icons.Printer} size={16}/> Print.
                                    </button>
                                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 border-t border-gray-50 dark:border-gray-700">
                                        <Icon path={Icons.LogOut} size={16}/> Uitloggen.
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-4 flex space-x-6 border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
                    <button onClick={() => setActiveTab('vriezer')} className={`pb-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors ${activeTab==='vriezer' ? 'border-purple-400 text-purple-500' : 'border-transparent text-gray-500 dark:text-gray-400'}`}><Icon path={Icons.Snowflake}/> Vriez.</button>
                    {(!myHiddenTabs.includes('frig') || isAdmin) && (
                        <button onClick={() => setActiveTab('frig')} className={`pb-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors ${activeTab==='frig' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 dark:text-gray-400'}`}>
                            <Icon path={Icons.Fridge}/> Frig.
                            {isAdmin && managedUserHiddenTabs.includes('frig') && <span title="Verborgen voor gebruiker" className="ml-1 text-gray-400"><Icon path={Icons.Lock} size={14}/></span>}
                        </button>
                    )}
                    {(!myHiddenTabs.includes('voorraad') || isAdmin) && (
                        <button onClick={() => setActiveTab('voorraad')} className={`pb-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors ${activeTab==='voorraad' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 dark:text-gray-400'}`}>
                            <Icon path={Icons.Box}/> Stock.
                            {isAdmin && managedUserHiddenTabs.includes('voorraad') && <span title="Verborgen voor gebruiker" className="ml-1 text-gray-400"><Icon path={Icons.Lock} size={14}/></span>}
                        </button>
                    )}
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 space-y-6 flex-grow w-full pb-32">
                
                <div className="flex flex-col gap-4 print:hidden">
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        <div className="flex-shrink-0 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm text-sm font-bold">{activeItems.length} items</div>
                        {filteredLocaties.map(l => <div key={l.id} className="flex-shrink-0 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm text-sm">{items.filter(i=>i.vriezerId===l.id).length} {l.naam}</div>)}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                        <div className="relative group flex-grow w-full">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Icon path={Icons.Search} className="text-gray-400"/></div>
                            <input type="text" className="block w-full pl-10 pr-3 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400" placeholder="Zoek..." value={search} onChange={e=>setSearch(e.target.value)}/>
                        </div>
                        
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button onClick={() => setShowSuggestionModal(true)} className="flex-none sm:flex-none w-10 h-10 sm:w-auto sm:h-auto bg-yellow-100 text-yellow-600 sm:p-3 rounded-xl border border-yellow-200 hover:bg-yellow-200 transition-colors flex items-center justify-center gap-2" title="Wat eten we vandaag?">
                                <Icon path={Icons.Utensils}/>
                            </button>
                            
                            <button onClick={toggleAll} className="flex-grow sm:flex-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 whitespace-nowrap text-center">
                                {collapsedLades.size > 0 ? "Alles open" : "Alles dicht"}
                            </button>
                        </div>
                    </div>
                </div>

                <div className={`grid gap-6 items-start ${gridClass}`}>
                    {filteredLocaties.map(vriezer => {
                        const gradientKeys = Object.keys(GRADIENTS);
                        let hash = 0;
                        for (let i = 0; i < vriezer.id.length; i++) hash = (hash << 5) - hash + vriezer.id.charCodeAt(i);
                        
                        const colorKey = vriezer.color || gradientKeys[Math.abs(hash) % gradientKeys.length];
                        const gradientClass = GRADIENTS[colorKey] || GRADIENTS.blue;

                        return (
                            <div key={vriezer.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500 page-break-inside-avoid">
                                <h2 className={`text-lg font-bold mb-3 flex items-center gap-2 bg-clip-text text-transparent bg-gradient-to-r ${gradientClass}`}>{vriezer.naam}</h2>
                                <div className="space-y-4">
                                    {lades.filter(l => l.vriezerId === vriezer.id).sort((a,b)=>a.naam.localeCompare(b.naam)).map(lade => {
                                        const ladeItems = items.filter(i => i.ladeId === lade.id && i.naam.toLowerCase().includes(search.toLowerCase()));
                                        if (ladeItems.length === 0 && search) return null;
                                        const isCollapsed = collapsedLades.has(lade.id) && !search;
                                        
                                        return (
                                            <div key={lade.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden page-break-inside-avoid transition-colors">
                                                <div className="bg-gray-50/50 dark:bg-gray-700/50 px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 print:bg-white" onClick={() => toggleLade(lade.id)}>
                                                    <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm flex items-center gap-2">
                                                        {isCollapsed ? <Icon path={Icons.ChevronRight} className="print:hidden"/> : <Icon path={Icons.ChevronDown} className="print:hidden"/>} 
                                                        {lade.naam} <span className="text-xs font-normal text-gray-400">({ladeItems.length})</span>
                                                    </h3>
                                                </div>
                                                {!isCollapsed && (
                                                    <ul className="block"> 
                                                        {ladeItems.length === 0 ? <li className="p-4 text-center text-gray-400 text-sm italic">Leeg</li> : 
                                                        ladeItems.map(item => {
                                                            const dagenOud = getDagenOud(item.ingevrorenOp);
                                                            const dagenTotTHT = getDagenTotTHT(item.houdbaarheidsDatum);
                                                            const isStockItem = vriezer.type === 'voorraad' || vriezer.type === 'frig';
                                                            
                                                            const colorClass = getStatusColor(dagenOud, vriezer.type, dagenTotTHT);
                                                            const dateColorClass = getDateTextColor(dagenOud, vriezer.type, dagenTotTHT);
                                                            
                                                            const catObj = actieveCategorieen.find(c => (c.name || c) === item.categorie);
                                                            const catColor = catObj ? (catObj.color || 'gray') : 'gray';

                                                            return (
                                                                <li key={item.id} className={`flex items-center justify-between p-3 bg-white dark:bg-gray-800 ${colorClass} last:border-b-0`}>
                                                                    <div className="flex items-center gap-3 overflow-hidden min-w-0">
                                                                        <span className="text-2xl flex-shrink-0">{item.emoji||'📦'}</span>
                                                                        <div className="min-w-0 flex-grow">
                                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                                <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{item.naam}</p>
                                                                                {item.categorie && item.categorie !== "Geen" && (
                                                                                    <Badge type={catColor} text={item.categorie} />
                                                                                )}
                                                                            </div>
                                                                            <div className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 flex flex-wrap items-center gap-x-2">
                                                                                <span className="font-bold">{formatAantal(item.aantal)} {item.eenheid}</span>
                                                                                {!isStockItem && <span className={`text-xs ${dateColorClass}`}> • {formatDate(item.ingevrorenOp)}</span>}
                                                                                {!isStockItem && item.houdbaarheidsDatum && <span className="text-xs text-gray-500 dark:text-gray-400"> • THT: {formatDate(item.houdbaarheidsDatum)}</span>}
                                                                                {isStockItem && item.houdbaarheidsDatum && <span className={`text-xs ${dateColorClass}`}> • THT: {formatDate(item.houdbaarheidsDatum)}</span>}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-1 flex-shrink-0 print:hidden ml-2">
                                                                        <button onClick={()=>openEdit(item)} className="p-2 text-blue-500 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50"><Icon path={Icons.Edit2} size={16}/></button>
                                                                        <button onClick={()=>initDelete(item)} className="p-2 text-red-500 bg-red-50 dark:bg-red-900/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50"><Icon path={Icons.Trash2} size={16}/></button>
                                                                    </div>
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>

            <footer className="bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 py-6 print:hidden transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                         <span className="text-sm text-gray-400 dark:text-gray-500">&copy;</span>
                         <span className="font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400">
                             Voorraad.
                         </span>
                         <button onClick={() => setShowVersionHistory(true)} className="text-[10px] text-gray-300 dark:text-gray-600 hover:text-blue-500 transition-colors cursor-pointer">
                            v{APP_VERSION}
                        </button>
                    </div>
                    <p className="text-[10px] text-gray-300 dark:text-gray-600">
                        Beheer je voorraad snel en eenvoudig.
                    </p>
                </div>
            </footer>

            <button onClick={handleOpenAdd} className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center z-40 print:hidden hover:scale-105 transition-transform"><Icon path={Icons.Plus} size={28}/></button>

            {/* Add/Edit Modal */}
            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={editingItem ? "Bewerken." : "Toevoegen."} color="blue">
                <form onSubmit={handleSaveItem} className="space-y-4">
                    <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg mb-4">
                        <button type="button" onClick={() => handleModalTypeChange('vriezer')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${modalType === 'vriezer' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'}`}>
                            Vriezer.
                        </button>
                        {(!myHiddenTabs.includes('frig') || isAdmin) && (
                            <button type="button" onClick={() => handleModalTypeChange('frig')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${modalType === 'frig' ? 'bg-white dark:bg-gray-600 shadow text-green-600 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'}`}>
                                Frig.
                            </button>
                        )}
                        {(!myHiddenTabs.includes('voorraad') || isAdmin) && (
                            <button type="button" onClick={() => handleModalTypeChange('voorraad')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${modalType === 'voorraad' ? 'bg-white dark:bg-gray-600 shadow text-orange-600 dark:text-orange-300' : 'text-gray-500 dark:text-gray-400'}`}>
                                Stock.
                            </button>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <button type="button" onClick={() => setShowEmojiPicker(true)} className="w-12 h-12 flex-shrink-0 border dark:border-gray-600 rounded-lg flex items-center justify-center text-2xl bg-gray-50 dark:bg-gray-700">{formData.emoji || '🏷️'}</button>
                        <div className="relative flex-grow">
                            <input type="text" placeholder="Productnaam" className="w-full h-12 px-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400" value={formData.naam} onChange={e => setFormData({...formData, naam: e.target.value})} required />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Locatie.</label>
                        <select className="w-full p-3 bg-white dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg" value={formData.vriezerId} onChange={e => setFormData({...formData, vriezerId: e.target.value})} required>
                            <option value="" disabled>Kies...</option>
                            {modalLocaties.map(l => <option key={l.id} value={l.id}>{l.naam}</option>)}
                        </select></div>
                        <div className="space-y-1"><label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Lade.</label>
                        <select className="w-full p-3 bg-white dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg" value={formData.ladeId} onChange={e => setFormData({...formData, ladeId: e.target.value})} required>
                            <option value="" disabled>Kies...</option>
                            {formLades.map(l => <option key={l.id} value={l.id}>{l.naam}</option>)}
                        </select></div>
                    </div>
                    <div className="flex gap-4 items-end">
                      <div className="relative w-24 flex-1">
                        <input 
                          type="number" 
                          step="0.25" 
                          min="0" 
                          max="99.75"
                          className="w-full text-center h-12 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg pr-8 pl-8 focus:ring-2 focus:ring-blue-500 outline-none appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                          value={formData.aantal} 
                          onChange={e => setFormData({...formData, aantal: e.target.value})}
                        />
                        <button 
                          type="button"
                          onClick={() => {
                            const current = parseFloat(formData.aantal) || 0;
                            const next = Math.min(current + 0.25, 99.75);
                            setFormData({...formData, aantal: next.toFixed(2)});
                          }}
                          className="absolute right-1 top-1 w-6 h-5 flex items-center justify-center text-gray-500 hover:text-blue-600 dark:text-gray-400 hover:dark:text-blue-400 transition-colors cursor-pointer"
                        >
                          <Icon path={Icons.ChevronRight} size={12} className="rotate-[-90deg]" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            const current = parseFloat(formData.aantal) || 0;
                            const next = Math.max(current - 0.25, 0);
                            setFormData({...formData, aantal: next.toFixed(2)});
                          }}
                          className="absolute right-1 bottom-1 w-6 h-5 flex items-center justify-center text-gray-500 hover:text-blue-600 dark:text-gray-400 hover:dark:text-blue-400 transition-colors cursor-pointer"
                        >
                          <Icon path={Icons.ChevronRight} size={12} className="rotate-[90deg]" />
                        </button>
                      </div>
                      
                      <select 
                        value={formData.eenheid} 
                        onChange={e => setFormData({...formData, eenheid: e.target.value})}
                        className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        {alleEenheden.map((eenheid) => (
                          <option key={eenheid} value={eenheid}>
                            {eenheid}
                          </option>
                        ))}
                      </select>
                    </div>

                    {modalType === 'vriezer' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1"><label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Invriesdatum.</label>
                            <input type="date" className="w-full p-2 bg-white dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg" value={formData.ingevrorenOp} onChange={e => setFormData({...formData, ingevrorenOp: e.target.value})} required /></div>
                            <div className="space-y-1"><label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">THT (Optioneel)</label>
                            <input type="date" className="w-full p-2 bg-white dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg" value={formData.houdbaarheidsDatum} onChange={e => setFormData({...formData, houdbaarheidsDatum: e.target.value})} /></div>
                        </div>
                    )}
                    {(modalType === 'voorraad' || modalType === 'frig') && (
                        <div className="space-y-1"><label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Houdbaarheidsdatum (THT).</label>
                        <input type="date" className="w-full p-2 bg-white dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg" value={formData.houdbaarheidsDatum} onChange={e => setFormData({...formData, houdbaarheidsDatum: e.target.value})} /></div>
                    )}

                    <div className="space-y-1"><label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Categorie.</label>
                    <select className="w-full p-3 bg-white dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg" value={formData.categorie} onChange={e => setFormData({...formData, categorie: e.target.value})}>
                        {actieveCategorieen.map(c => <option key={c.name||c} value={c.name||c}>{c.name||c}</option>)}
                    </select></div>
                    
                    {!editingItem && (
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="rememberLocation" checked={rememberLocation} onChange={e => setRememberLocation(e.target.checked)} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300 dark:border-gray-600" />
                            <label htmlFor="rememberLocation" className="text-sm text-gray-700 dark:text-gray-300">Onthoud locatie en lade</label>
                        </div>
                    )}
                    
                    <button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md">Opslaan</button>
                </form>
            </Modal>

            {/* Emoji Modal */}
            <Modal isOpen={showEmojiPicker} onClose={() => setShowEmojiPicker(false)} title="Emoji." color="orange">
                <EmojiGrid onSelect={(emoji) => { setFormData(p => ({...p, emoji})); setShowEmojiPicker(false); }} />
            </Modal>

            {/* Shopping List Modal */}
            <Modal isOpen={showShoppingModal} onClose={() => setShowShoppingModal(false)} title="Boodschappenlijst." color="blue">
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white dark:bg-gray-700/50 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 p-4 mb-4">
                        <form onSubmit={handleAddShoppingItem} className="flex flex-col gap-2">
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="Wat moet je kopen?" 
                                    className="flex-grow p-3 min-w-0 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" 
                                    value={shoppingFormData.naam} 
                                    onChange={e => setShoppingFormData({...shoppingFormData, naam: e.target.value})} 
                                    required
                                />
                                <div className="relative w-20 flex-shrink-0">
                                    <input 
                                        type="number" 
                                        step="0.25"
                                        className="w-full h-12 text-center border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800 outline-none dark:text-white pr-5 pl-1 appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                                        value={shoppingFormData.aantal} 
                                        onChange={e => setShoppingFormData({...shoppingFormData, aantal: e.target.value})} 
                                    />
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        const current = parseFloat(shoppingFormData.aantal) || 0;
                                        setShoppingFormData({...shoppingFormData, aantal: (current + 0.25).toFixed(2)});
                                      }}
                                      className="absolute right-1 top-1 w-5 h-5 flex items-center justify-center text-gray-500 hover:text-blue-600 cursor-pointer"
                                    >
                                      <Icon path={Icons.ChevronRight} size={10} className="rotate-[-90deg]" />
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        const current = parseFloat(shoppingFormData.aantal) || 0;
                                        setShoppingFormData({...shoppingFormData, aantal: Math.max(0, current - 0.25).toFixed(2)});
                                      }}
                                      className="absolute right-1 bottom-1 w-5 h-5 flex items-center justify-center text-gray-500 hover:text-blue-600 cursor-pointer"
                                    >
                                      <Icon path={Icons.ChevronRight} size={10} className="rotate-[90deg]" />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex gap-2">
                                <select 
                                    className="flex-grow p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                                    value={shoppingFormData.winkel}
                                    onChange={e => setShoppingFormData({...shoppingFormData, winkel: e.target.value})}
                                >
                                    <option value="">Kies winkel (optioneel)...</option>
                                    {WINKELS.map(w => <option key={w.name} value={w.name}>{w.name}</option>)}
                                </select>
                                <button type="submit" className="bg-blue-600 text-white px-6 rounded-xl font-bold flex-shrink-0 flex items-center justify-center"><Icon path={Icons.Plus}/></button>
                            </div>
                        </form>
                    </div>

                    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                        {shoppingList.length === 0 && <p className="text-center text-gray-400 py-8">Je boodschappenlijst is leeg.</p>}
                        {shoppingList.sort((a,b) => a.checked - b.checked).map(item => {
                            const winkelObj = WINKELS.find(w => w.name === item.winkel);
                            const winkelColor = winkelObj ? winkelObj.color : 'gray';

                            return (
                                <div key={item.id} className={`flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-xl border ${item.checked ? 'border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800' : 'border-gray-200 dark:border-gray-600'}`}>
                                    <div className="flex items-center gap-3 cursor-pointer overflow-hidden flex-grow" onClick={() => toggleShoppingItem(item)}>
                                        <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${item.checked ? 'bg-blue-500 border-blue-500' : 'border-gray-300 dark:border-gray-500'}`}>
                                            {item.checked && <Icon path={Icons.Check} size={14} className="text-white"/>}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className={`font-medium truncate ${item.checked ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-gray-200'}`}>
                                                {item.aantal > 0 && <span className="font-bold text-blue-600 mr-1">{formatAantal(item.aantal)} {item.eenheid}</span>}
                                                {item.naam}
                                            </span>
                                            {item.winkel && (
                                                <div className="flex mt-0.5">
                                                    <Badge type={winkelColor} text={item.winkel} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0 ml-2">
                                        <button onClick={() => moveShoppingToStock(item)} className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg" title="Naar voorraad"><Icon path={Icons.Box} size={18}/></button>
                                        <button onClick={() => deleteShoppingItem(item.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"><Icon path={Icons.Trash2} size={18}/></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Product verwijderen." color="red">
                <p className="text-gray-800 dark:text-gray-200 mb-6">Wat is de reden voor het verwijderen van <strong>{itemToDelete?.naam}</strong>?</p>
                <div className="grid grid-cols-1 gap-3">
                    <button onClick={() => confirmDelete('consumed')} className="flex items-center justify-center gap-2 p-3 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200 rounded-xl font-bold hover:bg-green-200 dark:hover:bg-green-900/60 transition">
                        <Icon path={Icons.Utensils} /> Opgegeten
                    </button>
                    <button onClick={() => confirmDelete('wasted')} className="flex items-center justify-center gap-2 p-3 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200 rounded-xl font-bold hover:bg-red-200 dark:hover:bg-red-900/60 transition">
                        <Icon path={Icons.Trash2} /> Weggegooid (Verspild)
                    </button>
                    <button onClick={() => confirmDelete('other')} className="flex items-center justify-center gap-2 p-3 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 transition">
                        Andere reden / Foutje
                    </button>
                </div>
            </Modal>

            {/* Shopify Modal (Choose store and quantity after delete) */}
            <Modal isOpen={showShopifyModal} onClose={() => setShowShopifyModal(false)} title="Boodschappenlijst?" color="blue">
                <p className="text-gray-800 dark:text-gray-200 mb-4">Wil je <strong>{itemToShopify?.naam}</strong> op de boodschappenlijst zetten?</p>
                
                <div className="space-y-4">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Winkel (optioneel)</label>
                            <select 
                                className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                                value={shopForDeletedItem}
                                onChange={(e) => setShopForDeletedItem(e.target.value)}
                            >
                                <option value="">Geen winkel</option>
                                {WINKELS.map(w => <option key={w.name} value={w.name}>{w.name}</option>)}
                            </select>
                        </div>
                        <div className="w-24">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Aantal</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    step="0.25"
                                    className="w-full h-12 text-center border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800 outline-none dark:text-white pr-6 pl-1 appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                                    value={aantalForShopifyItem} 
                                    onChange={(e) => setAantalForShopifyItem(e.target.value)}
                                />
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const current = parseFloat(aantalForShopifyItem) || 0;
                                    setAantalForShopifyItem((current + 0.25).toFixed(2));
                                  }}
                                  className="absolute right-1 top-1 w-5 h-5 flex items-center justify-center text-gray-500 hover:text-blue-600 cursor-pointer"
                                >
                                  <Icon path={Icons.ChevronRight} size={10} className="rotate-[-90deg]" />
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const current = parseFloat(aantalForShopifyItem) || 0;
                                    setAantalForShopifyItem(Math.max(0, current - 0.25).toFixed(2));
                                  }}
                                  className="absolute right-1 bottom-1 w-5 h-5 flex items-center justify-center text-gray-500 hover:text-blue-600 cursor-pointer"
                                >
                                  <Icon path={Icons.ChevronRight} size={10} className="rotate-[90deg]" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setShowShopifyModal(false)} className="p-3 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 transition">
                            Nee
                        </button>
                        <button onClick={handleAddToShoppingFromDelete} className="p-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-md">
                            Ja, voeg toe
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Stats Modal */}
            <Modal isOpen={showStatsModal} onClose={() => setShowStatsModal(false)} title="Statistieken." color="purple">
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl text-center border border-green-100 dark:border-green-800">
                        <span className="block text-3xl font-bold text-green-600 dark:text-green-400">{stats.consumed}</span>
                        <span className="text-xs uppercase tracking-wide text-green-800 dark:text-green-200">Producten gegeten</span>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl text-center border border-red-100 dark:border-red-800">
                        <span className="block text-3xl font-bold text-red-600 dark:text-red-400">{stats.wasted}</span>
                        <span className="text-xs uppercase tracking-wide text-red-800 dark:text-red-200">Weggegooid</span>
                    </div>
                </div>
                {stats.consumed + stats.wasted > 0 ? (
                    <div className="relative pt-1">
                        <div className="flex mb-2 items-center justify-between">
                            <span className="text-xs font-semibold inline-block text-blue-600 dark:text-blue-400">Verspillingspercentage</span>
                            <span className="text-xs font-semibold inline-block text-blue-600 dark:text-blue-400">
                                {Math.round((stats.wasted / (stats.consumed + stats.wasted)) * 100)}%
                            </span>
                        </div>
                        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-green-200 dark:bg-green-900">
                            <div style={{ width: `${Math.round((stats.wasted / (stats.consumed + stats.wasted)) * 100)}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-red-500"></div>
                        </div>
                        <p className="text-xs text-center text-gray-500 italic">Gebaseerd op handmatige invoer bij verwijderen.</p>
                    </div>
                ) : <p className="text-center text-gray-400 text-sm">Nog geen data beschikbaar.</p>}
            </Modal>
            
            <Modal isOpen={showSuggestionModal} onClose={() => setShowSuggestionModal(false)} title="Wat eten we vandaag?" color="yellow">
                <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">Deze producten hebben prioriteit op basis van houdbaarheid:</p>
                <div className="space-y-3">
                    {getSuggestions().length === 0 ? <p className="italic text-gray-400 text-center">Alles lijkt vers!</p> : getSuggestions().map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-xl border border-yellow-200 dark:border-gray-600 shadow-sm">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{item.emoji}</span>
                                <div>
                                    <p className="font-bold text-gray-800 dark:text-gray-100">{item.naam}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {item.type === 'vriezer' ? `${item.daysOld} dgn in vriezer` : `THT: ${formatDate(item.houdbaarheidsDatum)}`}
                                    </p>
                                </div>
                            </div>
                            <Badge type="yellow" text="Eet mij!" />
                        </div>
                    ))}
                </div>
            </Modal>

            <Modal isOpen={showLogModal} onClose={() => setShowLogModal(false)} title="Logboek." color="teal">
                {logs.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center italic py-4">Nog geen activiteiten.</p>
                ) : (
                    <ul className="space-y-3">
                        {logs.map(log => {
                            const isMine = log.targetUserId === user.uid;
                            const isAdded = log.action === 'Toevoegen';
                            const isDeleted = log.action === 'Verwijderd';
                            
                            return (
                                <li key={log.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border border-gray-100 dark:border-gray-600 text-sm">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-gray-700 dark:text-gray-200">{log.item}</span>
                                        <span className="text-xs text-gray-400 dark:text-gray-500">{formatDateTime(log.timestamp)}</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-2">
                                        <div className="flex gap-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isAdded ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : isDeleted ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                                                {log.action}
                                            </span>
                                            {isAdmin && (
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${isMine ? 'border-green-300 text-green-600 dark:border-green-700 dark:text-green-400' : 'border-orange-300 text-orange-600 dark:border-orange-700 dark:text-orange-400'}`}>
                                                    {isMine ? 'Eigen' : 'Ander'}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                            <Icon path={Icons.User} size={12}/> {log.actorName}
                                        </div>
                                    </div>
                                    {log.details && <p className="text-xs text-gray-400 mt-1 pl-1 border-l-2 border-gray-200 dark:border-gray-600">{log.details}</p>}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </Modal>

            <Modal isOpen={showBeheerModal} onClose={() => setShowBeheerModal(false)} title="Instellingen." color="purple">
                <div className="flex border-b dark:border-gray-700 mb-4">
                    <button onClick={() => setBeheerTab('locaties')} className={`flex-1 py-2 font-medium ${beheerTab==='locaties'?'text-blue-600 border-b-2 border-blue-600':'text-gray-500 dark:text-gray-400'}`}>Locaties.</button>
                    <button onClick={() => setBeheerTab('categorieen')} className={`flex-1 py-2 font-medium ${beheerTab==='categorieen'?'text-purple-600 border-b-2 border-purple-600':'text-gray-500 dark:text-gray-400'}`}>Categorieën.</button>
                    <button onClick={() => setBeheerTab('eenheden')} className={`flex-1 py-2 font-medium ${beheerTab==='eenheden'?'text-orange-600 border-b-2 border-orange-600':'text-gray-500 dark:text-gray-400'}`}>Eenheden.</button>
                </div>

                {beheerTab === 'locaties' && (
                    <div className="space-y-6">
                        <div>
                            <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-2">Locaties</h4>
                            <ul className="space-y-2 mb-3">
                                {filteredLocaties.map(l => (
                                    <li key={l.id} className="flex justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded items-center">
                                        <div className="flex items-center gap-3">
                                            <button 
                                                onClick={() => cycleLocatieColor(l)}
                                                className={`w-6 h-6 rounded-full bg-gradient-to-br ${GRADIENTS[l.color || 'blue']} border border-gray-200 shadow-sm transition-transform hover:scale-110`}
                                                title="Klik om kleur te wijzigen"
                                            ></button>
                                            <span onClick={() => setSelectedLocatieForBeheer(l.id)} className={`cursor-pointer ${selectedLocatieForBeheer===l.id?'text-blue-600 font-bold':''}`}>{l.naam}</span>
                                        </div>
                                        <button onClick={() => handleDeleteLocatie(l.id)} className="text-red-500"><Icon path={Icons.Trash2}/></button>
                                    </li>
                                ))}
                            </ul>
                            <form onSubmit={handleAddLocatie} className="flex gap-2">
                                <select 
                                    value={newLocatieColor} 
                                    onChange={e => setNewLocatieColor(e.target.value)}
                                    className="border border-gray-300 dark:border-gray-600 p-2 rounded bg-white dark:bg-gray-700 dark:text-white w-24 text-sm"
                                >
                                    {Object.keys(GRADIENTS).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <input className="flex-grow border border-gray-300 dark:border-gray-600 p-2 rounded dark:bg-gray-700 dark:text-white" placeholder="Nieuwe locatie" value={newLocatieNaam} onChange={e=>setNewLocatieNaam(e.target.value)} required />
                                <button className="bg-blue-600 text-white px-3 rounded">+</button>
                            </form>
                        </div>
                        {selectedLocatieForBeheer && (
                            <div className="pt-4 border-t dark:border-gray-700">
                                <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-2">Lades</h4>
                                <ul className="space-y-2 mb-3">
                                    {lades.filter(l => l.vriezerId === selectedLocatieForBeheer).sort((a,b)=>a.naam.localeCompare(b.naam)).map(l => (
                                        <li key={l.id} className="flex justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded items-center">
                                            {editingLadeId === l.id ? 
                                                <div className="flex gap-2 w-full"><input className="flex-grow border p-1 rounded dark:bg-gray-600 dark:text-white" value={editingLadeName} onChange={e=>setEditingLadeName(e.target.value)} /><button onClick={()=>saveLadeName(l.id)} className="text-green-600"><Icon path={Icons.Check}/></button></div> 
                                                : 
                                                <><span>{l.naam}</span><div className="flex gap-2"><button onClick={()=>startEditLade(l)} className="text-blue-500"><Icon path={Icons.Edit2} size={16}/></button><button onClick={() => handleDeleteLade(l.id)} className="text-red-500"><Icon path={Icons.Trash2} size={16}/></button></div></>
                                            }
                                        </li>
                                    ))}
                                </ul>
                                <form onSubmit={handleAddLade} className="flex gap-2"><input className="flex-grow border border-gray-300 dark:border-gray-600 p-2 rounded dark:bg-gray-700 dark:text-white" placeholder="Nieuwe lade" value={newLadeNaam} onChange={e=>setNewLadeNaam(e.target.value)} required /><button className="bg-blue-600 text-white px-3 rounded">+</button></form>
                            </div>
                        )}
                    </div>
                )}
                {beheerTab === 'categorieen' && (
                    <div>
                        <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-2">Categorieën</h4>
                        <ul className="space-y-2 mb-3">
                            {actieveCategorieen.map(cat => (
                                <li key={cat.name} className="flex justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded items-center">
                                    {editingCatName === cat.name ?
                                        <div className="flex gap-2 w-full items-center">
                                            <input className="flex-grow border p-1 rounded dark:bg-gray-600 dark:text-white" value={editCatInputName} onChange={e=>setEditCatInputName(e.target.value)} />
                                            <select className="border p-1 rounded dark:bg-gray-600 dark:text-white" value={editCatInputColor} onChange={e=>setEditCatInputColor(e.target.value)}>
                                                {Object.keys(BADGE_COLORS).map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                            <button onClick={saveCat} className="text-green-600"><Icon path={Icons.Check}/></button>
                                        </div>
                                        :
                                        <>
                                            <div className="flex items-center gap-2"><div className={`w-3 h-3 rounded-full bg-${cat.color}-500`}></div><span>{cat.name}</span></div>
                                            <div className="flex gap-2">
                                                <button onClick={()=>startEditCat(cat)} className="text-blue-500"><Icon path={Icons.Edit2} size={16}/></button>
                                                <button onClick={() => handleDeleteCat(cat.name)} className="text-red-500"><Icon path={Icons.Trash2} size={16}/></button>
                                            </div>
                                        </>
                                    }
                                </li>
                            ))}
                        </ul>
                        <form onSubmit={handleAddCat} className="flex gap-2 items-center">
                            <input className="flex-grow border p-2 rounded dark:bg-gray-700 dark:text-white border-gray-300 dark:border-gray-600" placeholder="Naam" value={newCatName} onChange={e=>setNewCatName(e.target.value)} required />
                            <select className="border p-2 rounded dark:bg-gray-700 dark:text-white border-gray-300 dark:border-gray-600" value={newCatColor} onChange={e=>setNewCatColor(e.target.value)}>
                                {Object.keys(BADGE_COLORS).map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <button className="bg-purple-600 text-white px-3 rounded">+</button>
                        </form>
                    </div>
                )}
                {beheerTab === 'eenheden' && (
                    <div>
                        <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-2">Mijn eenheden</h4>
                        <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg mb-4">
                            <button onClick={() => setEenheidFilter('vries')} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${eenheidFilter === 'vries' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'}`}>
                                Vriezer.
                            </button>
                            {(!myHiddenTabs.includes('frig') || isAdmin) && (
                                <button onClick={() => setEenheidFilter('frig')} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${eenheidFilter === 'frig' ? 'bg-white dark:bg-gray-600 shadow text-green-600 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'}`}>
                                    Frig.
                                </button>
                            )}
                            {(!myHiddenTabs.includes('voorraad') || isAdmin) && (
                                <button onClick={() => setEenheidFilter('voorraad')} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${eenheidFilter === 'voorraad' ? 'bg-white dark:bg-gray-600 shadow text-orange-600 dark:text-orange-300' : 'text-gray-500 dark:text-gray-400'}`}>
                                    Stock.
                                </button>
                            )}
                        </div>

                        <ul className="space-y-2 mb-3">
                            {(
                                eenheidFilter === 'voorraad' ? customUnitsVoorraad : 
                                eenheidFilter === 'frig' ? customUnitsFrig :
                                customUnitsVries
                            ).length === 0 ? <li className="text-gray-400 italic">Geen eigen eenheden voor {eenheidFilter}.</li> : 
                            (
                                eenheidFilter === 'voorraad' ? customUnitsVoorraad : 
                                eenheidFilter === 'frig' ? customUnitsFrig :
                                customUnitsVries
                            ).map(u => (
                                <li key={u} className="flex justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded items-center">
                                    {editingUnitName === u ? 
                                        <div className="flex gap-2 w-full"><input className="flex-grow border p-1 rounded dark:bg-gray-600 dark:text-white" value={editUnitInput} onChange={e=>setEditUnitInput(e.target.value)} /><button onClick={saveUnitName} className="text-green-600"><Icon path={Icons.Check}/></button></div>
                                        :
                                        <><span>{u}</span><div className="flex gap-2"><button onClick={()=>startEditUnit(u)} className="text-blue-500"><Icon path={Icons.Edit2} size={16}/></button><button onClick={() => handleDeleteUnit(u)} className="text-red-500"><Icon path={Icons.Trash2} size={16}/></button></div></>
                                    }
                                </li>
                            ))}
                        </ul>
                        <form onSubmit={handleAddUnit} className="flex gap-2"><input className="flex-grow border p-2 rounded dark:bg-gray-700 dark:text-white border-gray-300 dark:border-gray-600" placeholder="Nieuwe eenheid" value={newUnitNaam} onChange={e=>setNewUnitNaam(e.target.value)} required /><button className={`text-white px-3 rounded ${eenheidFilter === 'voorraad' ? 'bg-orange-500' : eenheidFilter === 'frig' ? 'bg-green-600' : 'bg-blue-600'}`}>+</button></form>
                    </div>
                )}
            </Modal>
            
            <Modal isOpen={showUserAdminModal} onClose={() => setShowUserAdminModal(false)} title="Gebruikers." color="pink">
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                    {usersList.map(u => (
                        <li key={u.id} className="p-3 flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-bold dark:text-white">{u.email || u.displayName}</p>
                                    <p className="text-xs text-gray-500">{u.id}</p>
                                </div>
                                <button onClick={() => toggleUserStatus(u.id, u.disabled)} className={`px-3 py-1 rounded text-xs font-bold ${u.disabled ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-200' : 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-200'}`}>
                                    {u.disabled ? 'Geblokkeerd' : 'Actief'}
                                </button>
                            </div>
                            <div className="flex flex-col gap-1 mt-1">
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                    <input 
                                        type="checkbox" 
                                        checked={(u.hiddenTabs || []).includes('frig')} 
                                        onChange={() => toggleUserTabVisibility(u.id, u.hiddenTabs, 'frig')}
                                    />
                                    <span>Verberg 'Frig.' tabblad</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                    <input 
                                        type="checkbox" 
                                        checked={(u.hiddenTabs || []).includes('voorraad')} 
                                        onChange={() => toggleUserTabVisibility(u.id, u.hiddenTabs, 'voorraad')}
                                    />
                                    <span>Verberg 'Stock.' tabblad</span>
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                                Laatst gezien: {u.laatstGezien ? formatDateTime(u.laatstGezien) : 'Nooit'}
                            </p>
                        </li>
                    ))}
                </ul>
            </Modal>

            <Modal isOpen={showShareModal} onClose={() => setShowShareModal(false)} title="Voorraad Delen" color="green">
                <form onSubmit={handleShare} className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Nodig iemand uit om je voorraad te beheren.</p>
                    <input type="email" className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white" placeholder="Email adres" value={shareEmail} onChange={e => setShareEmail(e.target.value)} required />
                    <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold">Verstuur Uitnodiging</button>
                </form>
            </Modal>

            <Modal isOpen={showWhatsNew} onClose={() => setShowWhatsNew(false)} title="Meldingen." color="red">
                {alerts.length > 0 && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 dark:bg-red-900/20">
                        <h4 className="font-bold text-red-800 dark:text-red-300">Let op!</h4>
                        <ul>
                            {alerts.map(i => {
                                const loc = vriezers.find(v => v.id === i.vriezerId);
                                const type = loc ? (loc.type || 'vriezer') : 'vriezer';
                                const isStock = type === 'voorraad' || type === 'frig';
                                
                                return (
                                    <li key={i.id} className="text-red-700 dark:text-red-300">
                                        {i.naam} 
                                        <span className="text-xs ml-1 font-semibold opacity-75">
                                            {isStock 
                                                ? `(Verlopen: ${formatDate(i.houdbaarheidsDatum)})` 
                                                : `(${getDagenOud(i.ingevrorenOp)} dagen oud)`
                                            }
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
                <div className="space-y-4">
                    {currentVersionData && (
                        <div>
                            <h4 className="font-bold text-blue-600 dark:text-blue-400 mb-4 text-lg">Versie {APP_VERSION}</h4>
                            <ul className="space-y-3">
                                {currentVersionData.changes.map((change, idx) => {
                                    const parts = change.split(': ');
                                    const type = parts[0];
                                    const text = parts.slice(1).join(': ');
                                    
                                    let IconComp = Icons.Zap;
                                    let iconColor = "text-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300";

                                    if (type.includes('Feature') || type.includes('Nieuw')) {
                                        IconComp = Icons.Star;
                                        iconColor = "text-yellow-500 bg-yellow-50 dark:bg-yellow-900/30 dark:text-yellow-300";
                                    } else if (type.includes('Fix') || type.includes('Opgelost') || type.includes('Hersteld')) {
                                        IconComp = Icons.Wrench;
                                        iconColor = "text-green-500 bg-green-50 dark:bg-green-900/30 dark:text-green-300";
                                    } else if (type.includes('Update')) {
                                         IconComp = Icons.Zap;
                                         iconColor = "text-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300";
                                    }

                                    return (
                                        <li key={idx} className="flex gap-3 text-sm text-gray-600 dark:text-gray-300 items-start">
                                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${iconColor}`}>
                                                <Icon path={IconComp} size={14} />
                                            </div>
                                             <div className="pt-1.5">
                                                <span className="font-semibold block text-gray-800 dark:text-gray-200 text-xs uppercase tracking-wide mb-0.5 opacity-75">{type}</span>
                                                <span className="leading-relaxed">{text || change}</span>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                </div>
            </Modal>

            <Modal isOpen={showVersionHistory} onClose={() => setShowVersionHistory(false)} title="Nieuws." color="blue">
                <div className="mb-8 text-center px-4">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
                        Ontdek alle updates en verbeteringen aan <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Voorraad.</span>
                    </h3>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-full border border-blue-100 dark:border-blue-800">
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-300">Huidige versie {APP_VERSION}</span>
                    </div>
                </div>

                <div className="space-y-8 relative pl-2">
                    <div className="absolute left-[19px] top-2 bottom-4 w-0.5 bg-gray-100 dark:bg-gray-700"></div>

                    {VERSION_HISTORY.map((v, i) => (
                        <div key={v.version} className="relative pl-10">
                            <div className={`absolute left-[13px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-800 z-10 ${i === 0 ? 'bg-blue-500 shadow-md shadow-blue-200' : 'bg-gray-300 dark:bg-gray-600'}`}></div>

                            <div className="mb-3">
                                <span className={`text-lg font-bold ${i === 0 ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>v{v.version}</span>
                            </div>
                            
                            <ul className="space-y-3">
                                {v.changes.map((change, idx) => {
                                    const parts = change.split(': ');
                                    const type = parts[0];
                                    const text = parts.slice(1).join(': ');
                                    
                                    let IconComp = Icons.Zap;
                                    let iconColor = "text-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300";

                                    if (type.includes('Feature') || type.includes('Nieuw')) {
                                        IconComp = Icons.Star;
                                        iconColor = "text-yellow-500 bg-yellow-50 dark:bg-yellow-900/30 dark:text-yellow-300";
                                    } else if (type.includes('Fix') || type.includes('Opgelost') || type.includes('Hersteld')) {
                                        IconComp = Icons.Wrench;
                                        iconColor = "text-green-500 bg-green-50 dark:bg-green-900/30 dark:text-green-300";
                                    } else if (type.includes('Update')) {
                                         IconComp = Icons.Zap;
                                         iconColor = "text-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300";
                                    }

                                    return (
                                        <li key={idx} className="flex gap-3 text-sm text-gray-600 dark:text-gray-300 items-start">
                                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${iconColor}`}>
                                                <Icon path={IconComp} size={14} />
                                            </div>
                                            <div className="pt-1.5">
                                                <span className="font-semibold block text-gray-800 dark:text-gray-200 text-xs uppercase tracking-wide mb-0.5 opacity-75">{type}</span>
                                                <span className="leading-relaxed">{text || change}</span>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </div>
            </Modal>

            <Modal isOpen={showSwitchAccount} onClose={() => setShowSwitchAccount(false)} title="Wissel account." color="gray">
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                    {usersList.map(u => (
                        <li key={u.id} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex justify-between" onClick={() => { setBeheerdeUserId(u.id); setShowSwitchAccount(false); }}>
                            <span className="font-medium dark:text-white">{u.email || u.displayName}</span>
                            {u.id === beheerdeUserId && <Icon path={Icons.Check} className="text-blue-500"/>}
                        </li>
                    ))}
                </ul>
            </Modal>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
