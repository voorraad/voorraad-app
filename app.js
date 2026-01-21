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
const APP_VERSION = '5.11'; 

// Standaard kleuren voor badges (Tailwind classes) - Met Dark Mode support
const BADGE_COLORS = {
    gray: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600",
    red: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-800",
    green: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800",
    blue: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800",
    indigo: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-800",
    purple: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800",
    pink: "bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/40 dark:text-pink-300 dark:border-pink-800",
    orange: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800"
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

// --- DATA SETS PER TYPE ---

// Vriezer Specifiek
const CATEGORIEEN_VRIES = [
    { name: "Vlees", color: "red" },
    { name: "Vis", color: "blue" },
    { name: "Groenten", color: "green" },
    { name: "Fruit", color: "yellow" },
    { name: "Brood", color: "yellow" },
    { name: "IJs", color: "pink" },
    { name: "Restjes", color: "gray" },
    { name: "Saus", color: "red" },
    { name: "Friet", color: "yellow" },
    { name: "Pizza", color: "orange" },
    { name: "Soep", color: "orange" },
    { name: "Ander", color: "gray" }
];
const EENHEDEN_VRIES = ["stuks", "zak", "portie", "doos", "gram", "kilo", "bakje", "ijsdoos", "pak"];

// Voorraad/Stock Specifiek
const CATEGORIEEN_VOORRAAD = [
    { name: "Pasta", color: "yellow" },
    { name: "Rijst", color: "gray" },
    { name: "Conserven", color: "red" },
    { name: "Saus", color: "red" },
    { name: "Kruiden", color: "green" },
    { name: "Bakproducten", color: "yellow" },
    { name: "Snacks", color: "orange" },
    { name: "Drank", color: "blue" },
    { name: "Huishoud", color: "gray" },
    { name: "Ander", color: "gray" }
];
const EENHEDEN_VOORRAAD = ["stuks", "pak", "fles", "blik", "pot", "liter", "kilo", "gram", "zak", "doos"];

// Uitgebreide en gecategoriseerde Emoji lijst
const EMOJI_CATEGORIES = {
    "Fruit.": [
        "🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🥑", "🫒", "🍋‍🟩"
    ],
    "Groenten.": [
        "🍆", "🥔", "🥕", "🌽", "🌶️", "🫑", "🥒", "🥬", "🥦", "🧄", "🧅", "🍄", "🥜", "🫘", "🌰", "🍠", "🫛", "🫚", "🍄‍🟫"
    ],
    "Vlees.": [
        "🥩", "🍗", "🍖", "🥓", "🍔", "🌭", "🍳", "🥚", "🧀"
    ],
    "Vis.": [
        "🐟", "🐠", "🐡", "🦈", "🐙", "🦀", "🦞", "🦐", "🦑", "🦪", "🍣", "🍤", "🎏"
    ],
    "Deegwaren.": [
        "🍞", "🥐", "🥖", "🫓", "🥨", "🥯", "🥞", "🧇", "🥟", "🥠", "🥡", "🍜", "🍝", "🍕", "🍔"
    ],
    "Fastfood.": [
        "🍟", "🥪", "🌮", "🌯", "🫔", "🥙", "🧆", "🥘", "🍲", "🫕", "🥣", "🥗", "🍿", "🧈", "🧂", "🥫", "🍱", "🍘", "🍙", "🍚", "🍛", "🍢", "🍥", "🍡"
    ],
    "Dessert.": [
        "🍦", "🍧", "🍨", "🍩", "🍪", "🎂", "🍰", "🧁", "🥧", "🍫", "🍬", "🍭", "🍮", "🍯"
    ],
    "Drinken.": [
        "🍼", "🥛", "☕", "🫖", "🍵", "🍶", "🍾", "🍷", "🍸", "🍹", "🍺", "🍻", "🥂", "🥃", "🥤", "🧃", "🧉"
    ],
     "Dieren.": [
        "🐄", "🐂", "🐃", "🐖", "🐏", "🐑", "🐐", "🐓", "🦃", "🦆", "🕊️", "🦢", "🪿", "🦤", "🐤", "🦬", "🐫", "🦘", "🐇", "🐷", "🐮", "🐔", "🐗", "🐴", "🫎", "🦏", "🐊"
    ],
    "Voorraad basis.": ["🍝", "🍚", "🥫", "🫙", "🥡", "🧂", "🍾", "🥤", "🧃", "☕", "🍪", "🍫", "🥖", "🥞"],
    "Overig.": [
        "❄️", "🧊", "🏷️", "📦", "🛒", "🛍️", "🍽️", "🔪", "🥄", "👩🏼‍🍳", "👨🏼‍🍳", "👍🏼", "👎🏼", "🎆", "🎉", "🎊", "🎃", "🎄", "🎁", "👑"
    ]
};

// --- 3. ICOON COMPONENTEN (SVG) ---
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
    Moon: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>,
    Sun: <g><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></g>
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
        "Soep": "🍲", "Huishoud": "🧻", "Ander": "📦", "Geen": "🔳" 
    };
    return emojis[cat] || "📦";
};

// Update: Accepteert nu optioneel THT dagen voor stock logica
const getStatusColor = (dagenOud, type = 'vriezer', dagenTotTHT = 999) => {
    if (type === 'voorraad') {
        if (dagenTotTHT === 999) return 'border-l-4 border-green-400 dark:border-green-600'; 
        if (dagenTotTHT < 0) return 'border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20 dark:border-red-600'; 
        if (dagenTotTHT <= 30) return 'border-l-4 border-yellow-400 dark:border-yellow-600'; 
        return 'border-l-4 border-green-400 dark:border-green-600'; 
    } else {
        if (dagenOud > 180) return 'border-l-4 border-red-500 dark:border-red-600'; 
        if (dagenOud > 90) return 'border-l-4 border-yellow-400 dark:border-yellow-600';
        return 'border-l-4 border-green-400 dark:border-green-600';
    }
};

const getDateTextColor = (dagenOud, type = 'vriezer', dagenTotTHT = 999) => {
    if (type === 'voorraad') {
        if (dagenTotTHT < 0) return 'text-red-600 font-bold dark:text-red-400'; 
        if (dagenTotTHT <= 30) return 'text-orange-500 font-bold dark:text-orange-400';
        return 'text-green-600 font-medium dark:text-green-400';
    } else {
        if (dagenOud > 180) return 'text-red-600 font-bold dark:text-red-400'; 
        if (dagenOud > 90) return 'text-orange-500 font-bold dark:text-orange-400';
        return 'text-green-600 font-medium dark:text-green-400';
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
                <div className="p-4 space-y-4 flex-grow overflow-y-auto dark:text-gray-200">{children}</div>
            </div>
        </div>
    );
};

const Badge = ({ type, text }) => {
    let colorClass = BADGE_COLORS[type];
    
    if (!colorClass) {
        if (type === 'minor') colorClass = "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800";
        else if (type === 'patch') colorClass = "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800";
        else if (type === 'major') colorClass = "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800";
        else if (type === 'alert') colorClass = "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800";
        else colorClass = "bg-gray-200 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"; 
    }

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
    const [hiddenTabs, setHiddenTabs] = useState([]);
    
    // Dark Mode (Init from localStorage with cleaner logic)
    const [darkMode, setDarkMode] = useState(() => {
        try {
            const saved = localStorage.getItem('darkMode');
            // Alleen 'true' string accepteren
            return saved === 'true';
        } catch(e) { return false; }
    });

    // Toggle Dark Mode
    useEffect(() => {
        try {
            localStorage.setItem('darkMode', darkMode);
            const root = window.document.documentElement;
            // We verwijderen/toevoegen op zowel html als body voor zekerheid
            if (darkMode) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        } catch (e) {
            console.error("Dark mode error", e);
        }
    }, [darkMode]);

    // Data
    const [activeTab, setActiveTab] = useState('vriezer');
    const [items, setItems] = useState([]);
    const [vriezers, setVriezers] = useState([]);
    const [lades, setLades] = useState([]);
    
    // Gescheiden Custom Units
    const [customUnitsVries, setCustomUnitsVries] = useState([]);
    const [customUnitsVoorraad, setCustomUnitsVoorraad] = useState([]);
    
    const [customCategories, setCustomCategories] = useState([]);

    // UI
    const [search, setSearch] = useState('');
    const [collapsedLades, setCollapsedLades] = useState(new Set()); 
    const [editingItem, setEditingItem] = useState(null);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    
    // Notifications
    const [notification, setNotification] = useState(null);
    
    // Modals & Menu
    const [showAddModal, setShowAddModal] = useState(false);
    const [showWhatsNew, setShowWhatsNew] = useState(false);
    const [showSwitchAccount, setShowSwitchAccount] = useState(false);
    const [showBeheerModal, setShowBeheerModal] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false); 
    const [showUserAdminModal, setShowUserAdminModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [beheerTab, setBeheerTab] = useState('locaties');

    // Forms
    const [formData, setFormData] = useState({
        naam: '', aantal: 1, eenheid: 'stuks', vriezerId: '', ladeId: '', categorie: 'Vlees', 
        ingevrorenOp: new Date().toISOString().split('T')[0], houdbaarheidsDatum: '', emoji: ''
    });
    const [rememberLocation, setRememberLocation] = useState(false); 
    const [newLocatieNaam, setNewLocatieNaam] = useState('');
    const [newLocatieColor, setNewLocatieColor] = useState('blue');
    const [selectedLocatieForBeheer, setSelectedLocatieForBeheer] = useState(null);
    const [newLadeNaam, setNewLadeNaam] = useState('');
    const [newUnitNaam, setNewUnitNaam] = useState('');
    const [shareEmail, setShareEmail] = useState('');
    
    // Instellingen Filter
    const [eenheidFilter, setEenheidFilter] = useState('vries'); 

    // Edit States
    const [editingLadeId, setEditingLadeId] = useState(null);
    const [editingLadeName, setEditingLadeName] = useState('');
    const [editingUnitName, setEditingUnitName] = useState(null); 
    const [editUnitInput, setEditUnitInput] = useState('');
    
    // Edit States voor Categorieën
    const [newCatName, setNewCatName] = useState('');
    const [newCatColor, setNewCatColor] = useState('gray');
    const [editingCatName, setEditingCatName] = useState(null);
    const [editCatInputName, setEditCatInputName] = useState('');
    const [editCatInputColor, setEditCatInputColor] = useState('gray');

    // --- AUTH & SETUP ---
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (u) => {
            if (u) {
                setUser(u);
                setBeheerdeUserId(u.uid);
                
                db.collection('users').doc(u.uid).onSnapshot(doc => {
                    if(doc.exists) {
                        const data = doc.data();
                        setHiddenTabs(data.hiddenTabs || []); 
                    } else {
                        db.collection('users').doc(u.uid).set({
                            customCategories: CATEGORIEEN_VRIES,
                            customUnitsVries: [],
                            customUnitsVoorraad: [],
                            hiddenTabs: []
                        });
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
                setCustomUnitsVoorraad(data.customUnitsVoorraad || []);

                setCustomCategories(data.customCategories && data.customCategories.length > 0 ? data.customCategories : CATEGORIEEN_VRIES);
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
            if (!isDataLoaded && loadedLades.length > 0) {
                setCollapsedLades(new Set(loadedLades.map(l => l.id)));
                setIsDataLoaded(true);
            }
        });
        const unsubI = db.collection('items').where('userId', '==', beheerdeUserId).onSnapshot(s => setItems(s.docs.map(d => ({id: d.id, ...d.data()}))));
        return () => { unsubV(); unsubL(); unsubI(); };
    }, [beheerdeUserId, isDataLoaded]);

    useEffect(() => {
        if (isAdmin) {
            const unsubUsers = db.collection('users').orderBy('email').onSnapshot(snap => {
                setUsersList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            });
            return () => unsubUsers();
        }
    }, [isAdmin]);

    // Alerts Logic
    const alerts = items.filter(i => {
        const loc = vriezers.find(v => v.id === i.vriezerId);
        const type = loc ? (loc.type || 'vriezer') : 'vriezer';

        if (type === 'voorraad') {
             return getDagenTotTHT(i.houdbaarheidsDatum) < 0; 
        } else {
             return getDagenOud(i.ingevrorenOp) > 180;
        }
    });

    useEffect(() => {
        if (items.length > 0) {
            const lastVersion = localStorage.getItem('app_version');
            if (alerts.length > 0 || lastVersion !== APP_VERSION) {
                setShowWhatsNew(true);
                localStorage.setItem('app_version', APP_VERSION);
            }
        }
    }, [items.length, alerts.length]); 

    // Derived
    const filteredLocaties = vriezers.filter(l => l.type === activeTab);
    const activeItems = items.filter(i => filteredLocaties.some(l => l.id === i.vriezerId));

    const formLades = formData.vriezerId 
        ? lades.filter(l => l.vriezerId === formData.vriezerId).sort((a,b) => a.naam.localeCompare(b.naam))
        : [];
    
    const formLocationType = vriezers.find(v => v.id === formData.vriezerId)?.type || activeTab;

    const contextEenheden = formLocationType === 'voorraad' ? EENHEDEN_VOORRAAD : EENHEDEN_VRIES;
    const contextCategorieen = formLocationType === 'voorraad' ? CATEGORIEEN_VOORRAAD : CATEGORIEEN_VRIES;
    const andereCategorieen = formLocationType === 'voorraad' ? CATEGORIEEN_VRIES : CATEGORIEEN_VOORRAAD;
    const activeCustomUnits = formLocationType === 'voorraad' ? customUnitsVoorraad : customUnitsVries;
    const alleEenheden = [...new Set([...contextEenheden, ...activeCustomUnits])].sort();

    const actieveCategorieen = [
        ...contextCategorieen, 
        ...customCategories.filter(cc => {
            const inHuidig = contextCategorieen.some(c => c.name === cc.name);
            const inAnder = andereCategorieen.some(c => c.name === cc.name);
            return !inHuidig && !inAnder;
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
        const defaultLoc = filteredLocaties.length > 0 ? filteredLocaties[0].id : '';
        const defaultCat = activeTab === 'voorraad' ? 'Pasta' : 'Vlees';
        
        if (!rememberLocation) {
            setFormData({
                naam: '', aantal: 1, eenheid: 'stuks', vriezerId: defaultLoc, ladeId: '', 
                categorie: defaultCat, ingevrorenOp: new Date().toISOString().split('T')[0], houdbaarheidsDatum: '', emoji: ''
            });
        } else {
             setFormData(prev => ({
                ...prev,
                naam: '', aantal: 1, categorie: defaultCat, 
                ingevrorenOp: new Date().toISOString().split('T')[0], houdbaarheidsDatum: '', emoji: ''
            }));
        }
        setShowAddModal(true);
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
                showNotification(`Product '${data.naam}' is bijgewerkt!`, 'success');
                setEditingItem(null);
                setShowAddModal(false);
            } else {
                await db.collection('items').add(data);
                showNotification(`Product '${data.naam}' is toegevoegd!`, 'success');
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

    const handleDelete = async (id, naam) => { 
        if(confirm(`Verwijder '${naam}'?`)) {
            try {
                await db.collection('items').doc(id).delete();
                showNotification(`Product '${naam}' is verwijderd.`, 'success');
            } catch(err) {
                showNotification("Kon niet verwijderen", 'error');
            }
        }
    };

    const openEdit = (item) => {
        setEditingItem(item);
        setFormData({
            naam: item.naam, aantal: item.aantal, eenheid: item.eenheid, vriezerId: item.vriezerId, ladeId: item.ladeId, categorie: item.categorie,
            ingevrorenOp: toInputDate(item.ingevrorenOp), houdbaarheidsDatum: toInputDate(item.houdbaarheidsDatum), emoji: item.emoji
        });
        setShowAddModal(true);
    };

    // --- BEHEER HANDLERS ---
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
        
        const standardList = eenheidFilter === 'voorraad' ? EENHEDEN_VOORRAAD : EENHEDEN_VRIES;
        const currentCustom = eenheidFilter === 'voorraad' ? customUnitsVoorraad : customUnitsVries;
        const dbField = eenheidFilter === 'voorraad' ? 'customUnitsVoorraad' : 'customUnitsVries';

        if(naam && !standardList.includes(naam) && !currentCustom.includes(naam)) {
            const updated = [...currentCustom, naam];
            await db.collection('users').doc(beheerdeUserId).set({[dbField]: updated}, {merge:true});
            setNewUnitNaam('');
        }
    };

    const handleDeleteUnit = async (unit) => {
        if(confirm(`Verwijder eenheid '${unit}'?`)) {
            const currentCustom = eenheidFilter === 'voorraad' ? customUnitsVoorraad : customUnitsVries;
            const dbField = eenheidFilter === 'voorraad' ? 'customUnitsVoorraad' : 'customUnitsVries';
            
            const updated = currentCustom.filter(u => u !== unit);
            await db.collection('users').doc(beheerdeUserId).set({[dbField]: updated}, {merge:true});
        }
    };
    
    const startEditUnit = (u) => { setEditingUnitName(u); setEditUnitInput(u); };
    const saveUnitName = async () => {
        if(!editUnitInput.trim()) return;
        const currentCustom = eenheidFilter === 'voorraad' ? customUnitsVoorraad : customUnitsVries;
        const dbField = eenheidFilter === 'voorraad' ? 'customUnitsVoorraad' : 'customUnitsVries';

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

    const toggleUserTabVisibility = async (userId, userHiddenTabs) => {
        const tabs = userHiddenTabs || [];
        let newTabs;
        if (tabs.includes('voorraad')) {
            newTabs = tabs.filter(t => t !== 'voorraad');
        } else {
            newTabs = [...tabs, 'voorraad'];
        }
        await db.collection('users').doc(userId).set({ hiddenTabs: newTabs }, { merge: true });
    };

    const toggleLade = (id) => {
        const newSet = new Set(collapsedLades);
        if(newSet.has(id)) newSet.delete(id); else newSet.add(id);
        setCollapsedLades(newSet);
    };
    const toggleAll = () => setCollapsedLades(collapsedLades.size > 0 ? new Set() : new Set(lades.map(l => l.id)));

    // --- RENDER ---
    if (!user) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4 transition-colors duration-300">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-sm w-full text-center">
                <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-4">Voorraad.</h1>
                <p className="text-gray-500 dark:text-gray-400 mb-6">Log in om je voorraad te beheren.</p>
                <button onClick={handleGoogleLogin} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 py-3 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-600 transition flex items-center justify-center gap-2 mb-3">
                    <svg width="20" height="20" viewBox="0 0 24 24"><g><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></g></svg>
                    Inloggen met Google
                </button>
            </div>
        </div>
    );

    return (
        <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 font-sans text-gray-800 dark:text-gray-100 transition-colors duration-300 ${darkMode ? 'dark' : ''}`}>
             {/* Render Notification if active */}
             {notification && (
                <Toast 
                    message={notification.msg} 
                    type={notification.type} 
                    key={notification.id}
                    onClose={() => setNotification(null)}
                />
            )}

            {/* Header */}
            <header className="bg-white dark:bg-gray-800 sticky top-0 z-30 shadow-sm border-b border-gray-200 dark:border-gray-700 print:hidden transition-colors">
                <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400">Voorraad.</h1>
                    <div className="flex gap-2 relative">
                        <button onClick={() => { setSelectedLocatieForBeheer(null); setBeheerdeUserId(beheerdeUserId); setShowBeheerModal(true); }} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"><Icon path={Icons.Settings} className="text-gray-700 dark:text-gray-300"/></button>
                        {isAdmin && <button onClick={() => setShowSwitchAccount(true)} className="w-10 h-10 flex items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 hover:bg-orange-200 transition-colors"><Icon path={Icons.Users}/></button>}
                        <button onClick={() => setShowWhatsNew(true)} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 relative hover:bg-gray-50 transition-colors"><Icon path={Icons.Info} className="text-gray-700 dark:text-gray-300"/>{alerts.length > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>}</button>
                        
                        <div className="relative">
                            <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-600 hover:border-blue-500 transition-colors">
                                {user.photoURL ? <img src={user.photoURL} alt="Profiel" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-500"><Icon path={Icons.User} size={20}/></div>}
                            </button>
                            {showProfileMenu && (
                                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-700">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.displayName || 'Gebruiker'}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                                    </div>
                                    {isAdmin && (
                                        <button onClick={() => { setShowUserAdminModal(true); setShowProfileMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                                            <Icon path={Icons.Users} size={16}/> Gebruikers.
                                        </button>
                                    )}
                                    <button onClick={() => { setShowShareModal(true); setShowProfileMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                                        <Icon path={Icons.Share} size={16}/> Delen.
                                    </button>
                                    
                                    {/* Dark Mode Toggle */}
                                    <button onClick={() => setDarkMode(!darkMode)} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                                        <Icon path={darkMode ? Icons.Sun : Icons.Moon} size={16}/> {darkMode ? 'Lichte modus.' : 'Donkere modus.'}
                                    </button>

                                    <button onClick={handlePrint} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                                        <Icon path={Icons.Printer} size={16}/> Print.
                                    </button>
                                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 border-t border-gray-50 dark:border-gray-700">
                                        <Icon path={Icons.LogOut} size={16}/> Uitloggen.
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-4 flex space-x-6 border-b border-gray-100 dark:border-gray-700">
                    <button onClick={() => setActiveTab('vriezer')} className={`pb-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors ${activeTab==='vriezer' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400'}`}><Icon path={Icons.Snowflake}/> Vriez.</button>
                    {!hiddenTabs.includes('voorraad') && (
                        <button onClick={() => setActiveTab('voorraad')} className={`pb-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors ${activeTab==='voorraad' ? 'border-orange-500 text-orange-600 dark:text-orange-400' : 'border-transparent text-gray-500 dark:text-gray-400'}`}><Icon path={Icons.Box}/> Stock.</button>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto p-4 space-y-6">
                {/* Tools */}
                <div className="flex flex-col gap-4 print:hidden">
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        <div className="flex-shrink-0 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm text-sm font-bold dark:text-gray-200">{activeItems.length} items</div>
                        {filteredLocaties.map(l => <div key={l.id} className="flex-shrink-0 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm text-sm dark:text-gray-200">{items.filter(i=>i.vriezerId===l.id).length} {l.naam}</div>)}
                    </div>
                    <div className="flex gap-2">
                        <div className="relative group flex-grow">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Icon path={Icons.Search} className="text-gray-400"/></div>
                            <input type="text" className="block w-full pl-10 pr-3 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Zoek..." value={search} onChange={e=>setSearch(e.target.value)}/>
                        </div>
                        <button onClick={toggleAll} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 whitespace-nowrap">{collapsedLades.size>0 ? "Alles open" : "Alles dicht"}</button>
                    </div>
                </div>

                {/* Lijsten Grid Container */}
                <div className={`grid gap-6 items-start ${gridClass}`}>
                    {filteredLocaties.map(vriezer => {
                        // GEWIJZIGDE LOGICA: Gebruik opgeslagen kleur of fallback naar hash
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
                                            <div key={lade.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden page-break-inside-avoid">
                                                <div className="bg-gray-50/50 dark:bg-gray-700/30 px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 print:bg-white" onClick={() => toggleLade(lade.id)}>
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
                                                            const isStockItem = vriezer.type === 'voorraad';
                                                            
                                                            const colorClass = getStatusColor(dagenOud, vriezer.type, dagenTotTHT);
                                                            const dateColorClass = getDateTextColor(dagenOud, vriezer.type, dagenTotTHT);
                                                            
                                                            const catObj = actieveCategorieen.find(c => (c.name || c) === item.categorie);
                                                            const catColor = catObj ? (catObj.color || 'gray') : 'gray';

                                                            return (
                                                                <li key={item.id} className={`flex items-center justify-between p-3 bg-white dark:bg-gray-800 ${colorClass} last:border-b-0 border-b border-gray-50 dark:border-gray-700`}>
                                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                                        <span className="text-2xl flex-shrink-0">{item.emoji||'📦'}</span>
                                                                        <div className="min-w-0">
                                                                            <div className="flex items-center gap-2">
                                                                                <p className="font-medium text-gray-900 dark:text-white truncate">{item.naam}</p>
                                                                                {item.categorie && item.categorie !== "Geen" && (
                                                                                    <Badge type={catColor} text={item.categorie} />
                                                                                )}
                                                                            </div>
                                                                            <p className="text-sm text-gray-700 dark:text-gray-400 mt-0.5">
                                                                                <span className="font-bold">{item.aantal} {item.eenheid}</span>
                                                                                {!isStockItem && <span className={`text-xs ml-2 ${dateColorClass}`}> • {formatDate(item.ingevrorenOp)}</span>}
                                                                                {isStockItem && item.houdbaarheidsDatum && <span className={`text-xs ml-2 ${dateColorClass}`}> • THT: {formatDate(item.houdbaarheidsDatum)}</span>}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-1 flex-shrink-0 print:hidden">
                                                                        <button onClick={()=>openEdit(item)} className="p-2 text-blue-500 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40"><Icon path={Icons.Edit2} size={16}/></button>
                                                                        <button onClick={()=>handleDelete(item.id, item.naam)} className="p-2 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40"><Icon path={Icons.Trash2} size={16}/></button>
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

            {/* FAB */}
            <button onClick={handleOpenAdd} className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center z-40 print:hidden hover:scale-105 transition-transform"><Icon path={Icons.Plus} size={28}/></button>

            {/* Add/Edit Modal */}
            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={editingItem ? "Bewerken." : "Toevoegen."} color="blue">
                <form onSubmit={handleSaveItem} className="space-y-4">
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setShowEmojiPicker(true)} className="w-12 h-12 flex-shrink-0 border dark:border-gray-600 rounded-lg flex items-center justify-center text-2xl bg-gray-50 dark:bg-gray-700">{formData.emoji || '🏷️'}</button>
                        <div className="relative flex-grow">
                            <input type="text" placeholder="Productnaam" className="w-full h-12 px-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" value={formData.naam} onChange={e => setFormData({...formData, naam: e.target.value})} required />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Locatie.</label>
                        <select className="w-full p-3 bg-white dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg" value={formData.vriezerId} onChange={e => setFormData({...formData, vriezerId: e.target.value})} required>
                            <option value="" disabled>Kies...</option>
                            {filteredLocaties.map(l => <option key={l.id} value={l.id}>{l.naam}</option>)}
                        </select></div>
                        <div className="space-y-1"><label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Lade.</label>
                        <select className="w-full p-3 bg-white dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg" value={formData.ladeId} onChange={e => setFormData({...formData, ladeId: e.target.value})} required>
                            <option value="" disabled>Kies...</option>
                            {formLades.map(l => <option key={l.id} value={l.id}>{l.naam}</option>)}
                        </select></div>
                    </div>
                    <div className="flex gap-4 items-end">
                        <input type="number" step="0.25" className="w-24 text-center h-12 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg" value={formData.aantal} onChange={e => setFormData({...formData, aantal: e.target.value})} />
                        <div className="flex-grow relative">
                            <select className="w-full h-12 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white" value={formData.eenheid} onChange={e => setFormData({...formData, eenheid: e.target.value})}>
                                {alleEenheden.map(e => <option key={e} value={e}>{e}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        {/* Conditonele Datum Velden */}
                        {formLocationType === 'vriezer' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Invriesdatum.</label>
                                <input type="date" className="w-full p-3 bg-white dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg" value={formData.ingevrorenOp} onChange={e => setFormData({...formData, ingevrorenOp: e.target.value})} required /></div>
                                <div className="space-y-1"><label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">THT (Optioneel)</label>
                                <input type="date" className="w-full p-3 bg-white dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg" value={formData.houdbaarheidsDatum} onChange={e => setFormData({...formData, houdbaarheidsDatum: e.target.value})} /></div>
                            </div>
                        )}
                        {formLocationType === 'voorraad' && (
                            <div className="space-y-1"><label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Houdbaarheidsdatum (THT) (Optioneel).</label>
                            <input type="date" className="w-full p-3 bg-white dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg" value={formData.houdbaarheidsDatum} onChange={e => setFormData({...formData, houdbaarheidsDatum: e.target.value})} /></div>
                        )}
                    </div>
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

            {/* Beheer Modal */}
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
                            <ul className="space-y-2 mb-3">{filteredLocaties.map(l => (
                                <li key={l.id} className="flex justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded items-center">
                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={() => cycleLocatieColor(l)}
                                            className={`w-6 h-6 rounded-full bg-gradient-to-br ${GRADIENTS[l.color || 'blue']} border border-gray-200 dark:border-gray-600 shadow-sm transition-transform hover:scale-110`}
                                            title="Klik om kleur te wijzigen"
                                        ></button>
                                        <span onClick={() => setSelectedLocatieForBeheer(l.id)} className={`cursor-pointer ${selectedLocatieForBeheer===l.id?'text-blue-600 font-bold':''}`}>{l.naam}</span>
                                    </div>
                                    <button onClick={() => handleDeleteLocatie(l.id)} className="text-red-500"><Icon path={Icons.Trash2}/></button>
                                </li>
                            ))}</ul>
                            <form onSubmit={handleAddLocatie} className="flex gap-2">
                                <select 
                                    value={newLocatieColor} 
                                    onChange={e => setNewLocatieColor(e.target.value)}
                                    className="border border-gray-300 dark:border-gray-600 p-2 rounded bg-white dark:bg-gray-700 dark:text-white w-24 text-sm"
                                >
                                    {Object.keys(GRADIENTS).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <input className="flex-grow border dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2 rounded" placeholder="Nieuwe locatie" value={newLocatieNaam} onChange={e=>setNewLocatieNaam(e.target.value)} required />
                                <button className="bg-blue-600 text-white px-3 rounded">+</button>
                            </form>
                        </div>
                        {selectedLocatieForBeheer && (
                            <div className="pt-4 border-t dark:border-gray-700">
                                <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-2">Lades</h4>
                                <ul className="space-y-2 mb-3">{lades.filter(l => l.vriezerId === selectedLocatieForBeheer).sort((a,b)=>a.naam.localeCompare(b.naam)).map(l => (
                                    <li key={l.id} className="flex justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded items-center">
                                        {editingLadeId === l.id ? 
                                            <div className="flex gap-2 w-full"><input className="flex-grow border p-1 rounded dark:bg-gray-700 dark:text-white dark:border-gray-600" value={editingLadeName} onChange={e=>setEditingLadeName(e.target.value)} /><button onClick={()=>saveLadeName(l.id)} className="text-green-600"><Icon path={Icons.Check}/></button></div> 
                                            : 
                                            <><span>{l.naam}</span><div className="flex gap-2"><button onClick={()=>startEditLade(l)} className="text-blue-500"><Icon path={Icons.Edit2} size={16}/></button><button onClick={() => handleDeleteLade(l.id)} className="text-red-500"><Icon path={Icons.Trash2} size={16}/></button></div></>
                                        }
                                    </li>
                                ))}</ul>
                                <form onSubmit={handleAddLade} className="flex gap-2"><input className="flex-grow border dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2 rounded" placeholder="Nieuwe lade" value={newLadeNaam} onChange={e=>setNewLadeNaam(e.target.value)} required /><button className="bg-blue-600 text-white px-3 rounded">+</button></form>
                            </div>
                        )}
                    </div>
                )}
                {beheerTab === 'categorieen' && (
                    <div>
                        <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-2">Categorieën</h4>
                        <ul className="space-y-2 mb-3">
                            {actieveCategorieen.map(cat => (
                                <li key={cat.name} className="flex justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded items-center">
                                    {editingCatName === cat.name ?
                                        <div className="flex gap-2 w-full items-center">
                                            <input className="flex-grow border p-1 rounded dark:bg-gray-700 dark:text-white dark:border-gray-600" value={editCatInputName} onChange={e=>setEditCatInputName(e.target.value)} />
                                            <select className="border p-1 rounded dark:bg-gray-700 dark:text-white dark:border-gray-600" value={editCatInputColor} onChange={e=>setEditCatInputColor(e.target.value)}>
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
                            <input className="flex-grow border p-2 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white" placeholder="Naam" value={newCatName} onChange={e=>setNewCatName(e.target.value)} required />
                            <select className="border p-2 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white" value={newCatColor} onChange={e=>setNewCatColor(e.target.value)}>
                                {Object.keys(BADGE_COLORS).map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <button className="bg-purple-600 text-white px-3 rounded">+</button>
                        </form>
                    </div>
                )}
                {beheerTab === 'eenheden' && (
                    <div>
                        <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-2">Mijn eenheden</h4>
                        
                        {/* Toggle Vries/Stock */}
                        <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg mb-4">
                            <button onClick={() => setEenheidFilter('vries')} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${eenheidFilter === 'vries' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'}`}>
                                Vriezer.
                            </button>
                            {!hiddenTabs.includes('voorraad') && (
                                <button onClick={() => setEenheidFilter('voorraad')} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${eenheidFilter === 'voorraad' ? 'bg-white dark:bg-gray-600 shadow text-orange-600 dark:text-orange-300' : 'text-gray-500 dark:text-gray-400'}`}>
                                    Stock.
                                </button>
                            )}
                        </div>

                        <ul className="space-y-2 mb-3">
                            {(eenheidFilter === 'voorraad' ? customUnitsVoorraad : customUnitsVries).length === 0 ? <li className="text-gray-400 italic">Geen eigen eenheden voor {eenheidFilter}.</li> : 
                            (eenheidFilter === 'voorraad' ? customUnitsVoorraad : customUnitsVries).map(u => (
                                <li key={u} className="flex justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded items-center">
                                    {editingUnitName === u ? 
                                        <div className="flex gap-2 w-full"><input className="flex-grow border p-1 rounded dark:bg-gray-700 dark:text-white dark:border-gray-600" value={editUnitInput} onChange={e=>setEditUnitInput(e.target.value)} /><button onClick={saveUnitName} className="text-green-600"><Icon path={Icons.Check}/></button></div>
                                        :
                                        <><span>{u}</span><div className="flex gap-2"><button onClick={()=>startEditUnit(u)} className="text-blue-500"><Icon path={Icons.Edit2} size={16}/></button><button onClick={() => handleDeleteUnit(u)} className="text-red-500"><Icon path={Icons.Trash2} size={16}/></button></div></>
                                    }
                                </li>
                            ))}
                        </ul>
                        <form onSubmit={handleAddUnit} className="flex gap-2"><input className="flex-grow border p-2 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white" placeholder="Nieuwe eenheid" value={newUnitNaam} onChange={e=>setNewUnitNaam(e.target.value)} required /><button className={`text-white px-3 rounded ${eenheidFilter === 'voorraad' ? 'bg-orange-500' : 'bg-blue-600'}`}>+</button></form>
                    </div>
                )}
            </Modal>
            
            {/* User Management Modal */}
            <Modal isOpen={showUserAdminModal} onClose={() => setShowUserAdminModal(false)} title="Gebruikers Beheer" color="pink">
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                    {usersList.map(u => (
                        <li key={u.id} className="p-3 flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-bold">{u.email || u.displayName}</p>
                                    <p className="text-xs text-gray-500">{u.id}</p>
                                </div>
                                <button onClick={() => toggleUserStatus(u.id, u.disabled)} className={`px-3 py-1 rounded text-xs font-bold ${u.disabled ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'}`}>
                                    {u.disabled ? 'Geblokkeerd' : 'Actief'}
                                </button>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <input 
                                    type="checkbox" 
                                    checked={(u.hiddenTabs || []).includes('voorraad')} 
                                    onChange={() => toggleUserTabVisibility(u.id, u.hiddenTabs)}
                                />
                                <span>Verberg 'Stock.' tabblad</span>
                            </div>
                        </li>
                    ))}
                </ul>
            </Modal>

            {/* Share Modal */}
            <Modal isOpen={showShareModal} onClose={() => setShowShareModal(false)} title="Voorraad Delen" color="green">
                <form onSubmit={handleShare} className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Nodig iemand uit om je voorraad te beheren.</p>
                    <input type="email" className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white" placeholder="Email adres" value={shareEmail} onChange={e => setShareEmail(e.target.value)} required />
                    <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold">Verstuur Uitnodiging</button>
                </form>
            </Modal>

            {/* Updates Modal */}
            <Modal isOpen={showWhatsNew} onClose={() => setShowWhatsNew(false)} title="Meldingen." color="red">
                {alerts.length > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mb-4">
                        <h4 className="font-bold text-red-800 dark:text-red-300">Let op!</h4>
                        <ul>
                            {alerts.map(i => {
                                const loc = vriezers.find(v => v.id === i.vriezerId);
                                const type = loc ? (loc.type || 'vriezer') : 'vriezer';
                                const isStock = type === 'voorraad';
                                
                                return (
                                    <li key={i.id} className="text-red-700 dark:text-red-400">
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
                    <div>
                        <h4 className="font-bold text-blue-600 dark:text-blue-400 mb-2">Versie 5.11</h4>
                        <ul className="space-y-2">
                             <li className="flex gap-2"><Badge type="patch" text="Bugfix" /><span>Probleem opgelost waarbij donkere modus bleef hangen.</span></li>
                        </ul>
                    </div>
                </div>
            </Modal>

            {/* Switch Account Modal (Admin) */}
            <Modal isOpen={showSwitchAccount} onClose={() => setShowSwitchAccount(false)} title="Wissel account." color="gray">
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                    {usersList.map(u => (
                        <li key={u.id} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex justify-between" onClick={() => { setBeheerdeUserId(u.id); setShowSwitchAccount(false); }}>
                            <span className="font-medium">{u.email || u.displayName}</span>
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