const { useState, useEffect, useRef } = React;

// --- 1. FIREBASE CONFIGURATIE ---
const firebaseConfig = typeof __firebase_config !== 'undefined' 
    ? JSON.parse(__firebase_config) 
    : {
        apiKey: "AIzaSyB9KRUbVBknnDDkkWF2Z5nRskmY-9CkD24", 
        authDomain: "vriezer-app.firebaseapp.com",
        projectId: "vriezer-app",
        storageBucket: "vriezer-app.firebasestorage.app",
        messagingSenderId: "788492326775",
        appId: "1:788492326775:web:c2cd85deac708b44f27372"
    };

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

// --- 2. CONFIGURATIE DATA ---
const APP_VERSION = '2.3';
const STANDAARD_CATEGORIEEN = ["Geen", "Vlees", "Vis", "Groenten", "Fruit", "Brood", "IJs", "Restjes", "Saus", "Friet", "Pizza", "Ander"];
const STANDAARD_EENHEDEN = ["stuks", "zak", "portie", "doos", "gram", "kilo", "bakje", "ijsdoos", "pak", "fles", "blik", "pot", "liter"];

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
    ChevronRight: <path d="m9 18 6-6-6-6"/>
};

// --- 4. HULPFUNCTIES ---
const getDagenOud = (timestamp) => {
    if (!timestamp) return 0;
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diff = new Date() - date;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
};
const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('nl-BE');
};
const toInputDate = (timestamp) => {
    if (!timestamp) return new Date().toISOString().split('T')[0];
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset*60*1000));
    return localDate.toISOString().split('T')[0];
};
const getEmojiForCategory = (cat) => {
    const emojis = { "Vlees": "🥩", "Vis": "🐟", "Groenten": "🥦", "Fruit": "🍎", "Brood": "🍞", "IJs": "🍦", "Restjes": "🥡", "Saus": "🥫", "Friet": "🍟", "Pizza": "🍕", "Pasta": "🍝", "Rijst": "🍚", "Conserven": "🥫", "Kruiden": "🌿", "Bakproducten": "🥖", "Snacks": "🍿", "Drank": "🥤", "Huishoud": "🧻", "Ander": "📦", "Geen": "🔳" };
    return emojis[cat] || "📦";
};
const getStatusColor = (dagen) => {
    if (dagen > 180) return 'border-l-4 border-red-500 bg-red-50';
    if (dagen > 90) return 'border-l-4 border-yellow-400 bg-yellow-50';
    return 'border-l-4 border-green-400 bg-white';
};

// --- 5. COMPONENTEN ---
const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto modal-animate flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                    <h3 className="text-lg font-bold text-gray-800">{title}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><Icon path={Icons.X} className="text-gray-500" /></button>
                </div>
                <div className="p-4 space-y-4 flex-grow overflow-y-auto">{children}</div>
            </div>
        </div>
    );
};

// Emoji Picker Component
const EmojiPicker = ({ onSelect }) => {
    const ref = useRef(null);
    useEffect(() => {
        const el = ref.current;
        if(el) {
            const handleEmoji = (e) => onSelect(e.detail.unicode);
            el.addEventListener('emoji-click', handleEmoji);
            return () => el.removeEventListener('emoji-click', handleEmoji);
        }
    }, [onSelect]);
    return <emoji-picker ref={ref} class="light"></emoji-picker>;
};

// --- 6. APP ---
function App() {
    const [user, setUser] = useState(null);
    const [beheerdeUserId, setBeheerdeUserId] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [usersList, setUsersList] = useState([]);
    
    // Data
    const [activeTab, setActiveTab] = useState('vriezer');
    const [items, setItems] = useState([]);
    const [vriezers, setVriezers] = useState([]);
    const [lades, setLades] = useState([]);
    const [customUnits, setCustomUnits] = useState([]);

    // UI
    const [search, setSearch] = useState('');
    const [collapsedLades, setCollapsedLades] = useState(new Set()); // Start leeg, wordt gevuld bij laden
    const [editingItem, setEditingItem] = useState(null);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    
    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showWhatsNew, setShowWhatsNew] = useState(false);
    const [showSwitchAccount, setShowSwitchAccount] = useState(false);
    const [showBeheerModal, setShowBeheerModal] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // Form
    const [formData, setFormData] = useState({
        naam: '', aantal: 1, eenheid: 'stuks', vriezerId: '', ladeId: '', categorie: 'Vlees', 
        ingevrorenOp: new Date().toISOString().split('T')[0], houdbaarheidsDatum: '', emoji: ''
    });
    
    // Beheer Form
    const [newLocatieNaam, setNewLocatieNaam] = useState('');
    const [selectedLocatieForBeheer, setSelectedLocatieForBeheer] = useState(null);
    const [newLadeNaam, setNewLadeNaam] = useState('');

    // --- AUTH & SETUP ---
    useEffect(() => {
        auth.onAuthStateChanged(async (u) => {
            if (u) {
                setUser(u);
                setBeheerdeUserId(u.uid);
                
                db.collection('users').doc(u.uid).onSnapshot(doc => {
                    if(doc.exists) setCustomUnits(doc.data().customUnits || []);
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
    }, []);

    // Data Listeners & Initiele Collapse
    useEffect(() => {
        if (!beheerdeUserId) return;
        const unsubV = db.collection('vriezers').where('userId', '==', beheerdeUserId).onSnapshot(s => setVriezers(s.docs.map(d => ({id: d.id, ...d.data(), type: d.data().type||'vriezer'}))));
        const unsubL = db.collection('lades').where('userId', '==', beheerdeUserId).onSnapshot(s => {
            const loadedLades = s.docs.map(d => ({id: d.id, ...d.data()}));
            setLades(loadedLades);
            // Standaard alles dicht (alle IDs toevoegen aan collapsed set)
            if (!isDataLoaded && loadedLades.length > 0) {
                setCollapsedLades(new Set(loadedLades.map(l => l.id)));
                setIsDataLoaded(true);
            }
        });
        const unsubI = db.collection('items').where('userId', '==', beheerdeUserId).onSnapshot(s => setItems(s.docs.map(d => ({id: d.id, ...d.data()}))));
        return () => { unsubV(); unsubL(); unsubI(); };
    }, [beheerdeUserId, isDataLoaded]);

    // Derived
    const alleEenheden = [...STANDAARD_EENHEDEN, ...customUnits];
    const filteredLocaties = vriezers.filter(l => l.type === activeTab);
    const alerts = items.filter(i => getDagenOud(i.ingevrorenOp) > 180);

    // Filter lades voor huidig formulier (alleen tonen als vriezerId is geselecteerd)
    const formLades = formData.vriezerId 
        ? lades.filter(l => l.vriezerId === formData.vriezerId).sort((a,b) => a.naam.localeCompare(b.naam))
        : [];

    // --- HANDLERS ---
    const handleLogin = async () => { try { await auth.signInAnonymously(); } catch(e){ alert(e.message); } };
    
    // Bij openen add modal, reset of set defaults
    const handleOpenAdd = () => {
        setEditingItem(null);
        // Probeer eerste locatie van huidige tab te pakken als default
        const defaultLoc = filteredLocaties.length > 0 ? filteredLocaties[0].id : '';
        setFormData({
            naam: '', aantal: 1, eenheid: 'stuks', 
            vriezerId: defaultLoc, 
            ladeId: '', 
            categorie: 'Vlees', 
            ingevrorenOp: new Date().toISOString().split('T')[0], houdbaarheidsDatum: '', emoji: ''
        });
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

        if(formData.eenheid && !alleEenheden.includes(formData.eenheid)) {
            const newUnits = [...customUnits, formData.eenheid];
            await db.collection('users').doc(beheerdeUserId).set({customUnits: newUnits}, {merge: true});
        }

        try {
            if(editingItem) {
                await db.collection('items').doc(editingItem.id).update(data);
                setEditingItem(null);
            } else {
                await db.collection('items').add(data);
                setFormData(prev => ({...prev, naam: '', aantal: 1, emoji: ''})); // Reset deels
            }
            setShowAddModal(false);
        } catch(err) { alert(err.message); }
    };

    const handleDelete = async (id, naam) => { if(confirm(`Verwijder '${naam}'?`)) await db.collection('items').doc(id).delete(); };

    const openEdit = (item) => {
        setEditingItem(item);
        setFormData({
            naam: item.naam, aantal: item.aantal, eenheid: item.eenheid, vriezerId: item.vriezerId, ladeId: item.ladeId, categorie: item.categorie,
            ingevrorenOp: toInputDate(item.ingevrorenOp), houdbaarheidsDatum: toInputDate(item.houdbaarheidsDatum), emoji: item.emoji
        });
        setShowAddModal(true);
    };

    // Beheer Handlers
    const handleAddLocatie = async (e) => {
        e.preventDefault();
        await db.collection('vriezers').add({ naam: newLocatieNaam, type: activeTab, userId: beheerdeUserId });
        setNewLocatieNaam('');
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

    const toggleLade = (id) => {
        const newSet = new Set(collapsedLades);
        if(newSet.has(id)) newSet.delete(id); else newSet.add(id);
        setCollapsedLades(newSet);
    };
    const toggleAll = () => setCollapsedLades(collapsedLades.size > 0 ? new Set() : new Set(lades.map(l => l.id)));

    // --- RENDER ---
    if (!user) return <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4"><div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center"><h1 className="text-2xl font-bold text-blue-600 mb-4">Mijn Voorraad</h1><button onClick={handleLogin} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold">Start</button></div></div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-24 font-sans text-gray-800">
            {/* Header */}
            <header className="bg-white sticky top-0 z-30 shadow-sm border-b border-gray-200">
                <div className="max-w-3xl mx-auto px-4 py-3 flex justify-between items-center">
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400">Mijn Voorraad</h1>
                    <div className="flex gap-2">
                        <button onClick={() => { setSelectedLocatieForBeheer(null); setShowBeheerModal(true); }} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100"><Icon path={Icons.Settings}/></button>
                        {isAdmin && <button onClick={() => setShowSwitchAccount(true)} className="w-10 h-10 flex items-center justify-center rounded-full bg-orange-100 text-orange-600"><Icon path={Icons.Users}/></button>}
                        <button onClick={() => setShowWhatsNew(true)} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 border relative"><Icon path={Icons.Info}/>{alerts.length > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}</button>
                    </div>
                </div>
                <div className="max-w-3xl mx-auto px-4 flex space-x-6 border-b border-gray-100">
                    <button onClick={() => setActiveTab('vriezer')} className={`pb-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors ${activeTab==='vriezer' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}><Icon path={Icons.Snowflake}/> Vriezer</button>
                    <button onClick={() => setActiveTab('voorraad')} className={`pb-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors ${activeTab==='voorraad' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500'}`}><Icon path={Icons.Box}/> Voorraad</button>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-3xl mx-auto p-4 space-y-6">
                {/* Tools */}
                <div className="flex flex-col gap-4">
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        <div className="flex-shrink-0 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm text-sm font-bold">{items.length} items</div>
                        {filteredLocaties.map(l => <div key={l.id} className="flex-shrink-0 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm text-sm">{items.filter(i=>i.vriezerId===l.id).length} {l.naam}</div>)}
                    </div>
                    <div className="flex gap-2">
                        <div className="relative group flex-grow">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Icon path={Icons.Search} className="text-gray-400"/></div>
                            <input type="text" className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Zoek..." value={search} onChange={e=>setSearch(e.target.value)}/>
                        </div>
                        <button onClick={toggleAll} className="bg-white border border-gray-200 px-4 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 whitespace-nowrap">{collapsedLades.size>0 ? "Alles Open" : "Alles Dicht"}</button>
                    </div>
                </div>

                {/* Lijsten */}
                <div className="space-y-8">
                    {filteredLocaties.map(vriezer => (
                        <div key={vriezer.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">{vriezer.naam}</h2>
                            <div className="space-y-4">
                                {lades.filter(l => l.vriezerId === vriezer.id).sort((a,b)=>a.naam.localeCompare(b.naam)).map(lade => {
                                    const ladeItems = items.filter(i => i.ladeId === lade.id && i.naam.toLowerCase().includes(search.toLowerCase()));
                                    if (ladeItems.length === 0 && search) return null;
                                    const isCollapsed = collapsedLades.has(lade.id) && !search;
                                    
                                    return (
                                        <div key={lade.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                            <div className="bg-gray-50/50 px-4 py-3 border-b border-gray-100 flex justify-between items-center cursor-pointer hover:bg-gray-100" onClick={() => toggleLade(lade.id)}>
                                                <h3 className="font-semibold text-gray-700 text-sm flex items-center gap-2">
                                                    {isCollapsed ? <Icon path={Icons.ChevronRight}/> : <Icon path={Icons.ChevronDown}/>} {lade.naam} <span className="text-xs font-normal text-gray-400">({ladeItems.length})</span>
                                                </h3>
                                            </div>
                                            {!isCollapsed && (
                                                <ul className="divide-y divide-gray-50">
                                                    {ladeItems.length === 0 ? <li className="p-4 text-center text-gray-400 text-sm italic">Leeg</li> : 
                                                    ladeItems.map(item => {
                                                        const dagen = getDagenOud(item.ingevrorenOp);
                                                        return (
                                                            <li key={item.id} className={`flex items-center justify-between p-3 ${getStatusColor(dagen)}`}>
                                                                <div className="flex items-center gap-3 overflow-hidden">
                                                                    <span className="text-2xl">{item.emoji||'📦'}</span>
                                                                    <div>
                                                                        <p className="font-medium text-gray-900">{item.naam}</p>
                                                                        <p className="text-xs text-gray-500">{item.aantal} {item.eenheid} • {formatDate(item.ingevrorenOp)} {item.houdbaarheidsDatum ? `• THT: ${formatDate(item.houdbaarheidsDatum)}` : ''}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <button onClick={()=>openEdit(item)} className="p-2 text-blue-500 bg-blue-50 rounded-lg"><Icon path={Icons.Edit2} size={16}/></button>
                                                                    <button onClick={()=>handleDelete(item.id, item.naam)} className="p-2 text-red-500 bg-red-50 rounded-lg"><Icon path={Icons.Trash2} size={16}/></button>
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
                    ))}
                </div>
            </main>

            {/* FAB */}
            <button onClick={handleOpenAdd} className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center z-40"><Icon path={Icons.Plus} size={28}/></button>

            {/* Add/Edit Modal */}
            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={editingItem ? "Bewerken" : "Toevoegen"}>
                <form onSubmit={handleSaveItem} className="space-y-4">
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setShowEmojiPicker(true)} className="w-12 h-12 flex-shrink-0 border rounded-lg flex items-center justify-center text-2xl bg-gray-50">{formData.emoji || '🏷️'}</button>
                        <div className="relative flex-grow">
                            <input type="text" placeholder="Productnaam" className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.naam} onChange={e => setFormData({...formData, naam: e.target.value})} required />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Locatie</label>
                        <select className="w-full p-3 bg-white border border-gray-300 rounded-lg" value={formData.vriezerId} onChange={e => setFormData({...formData, vriezerId: e.target.value})} required>
                            <option value="" disabled>Kies...</option>
                            {filteredLocaties.map(l => <option key={l.id} value={l.id}>{l.naam}</option>)}
                        </select></div>
                        <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Lade</label>
                        <select className="w-full p-3 bg-white border border-gray-300 rounded-lg" value={formData.ladeId} onChange={e => setFormData({...formData, ladeId: e.target.value})} required>
                            <option value="" disabled>Kies...</option>
                            {formLades.map(l => <option key={l.id} value={l.id}>{l.naam}</option>)}
                        </select></div>
                    </div>
                    <div className="flex gap-4 items-end">
                        <input type="number" step="0.25" className="w-24 text-center h-12 border border-gray-300 rounded-lg" value={formData.aantal} onChange={e => setFormData({...formData, aantal: e.target.value})} />
                        <div className="flex-grow relative">
                            <input list="eenheden" className="w-full h-12 px-3 border border-gray-300 rounded-lg" value={formData.eenheid} onChange={e => setFormData({...formData, eenheid: e.target.value})} placeholder="Eenheid" />
                            <datalist id="eenheden">{alleEenheden.map(e => <option key={e} value={e}/>)}</datalist>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Invriesdatum</label>
                        <input type="date" className="w-full p-3 bg-white border border-gray-300 rounded-lg" value={formData.ingevrorenOp} onChange={e => setFormData({...formData, ingevrorenOp: e.target.value})} required /></div>
                        <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">THT (Optioneel)</label>
                        <input type="date" className="w-full p-3 bg-white border border-gray-300 rounded-lg" value={formData.houdbaarheidsDatum} onChange={e => setFormData({...formData, houdbaarheidsDatum: e.target.value})} /></div>
                    </div>
                    <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Categorie</label>
                    <select className="w-full p-3 bg-white border border-gray-300 rounded-lg" value={formData.categorie} onChange={e => setFormData({...formData, categorie: e.target.value})}>
                        {STANDAARD_CATEGORIEEN.map(c => <option key={c} value={c}>{c}</option>)}
                    </select></div>
                    <button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md">Opslaan</button>
                </form>
            </Modal>

            {/* Emoji Modal */}
            <Modal isOpen={showEmojiPicker} onClose={() => setShowEmojiPicker(false)} title="Kies Emoji">
                <EmojiPicker onSelect={(emoji) => { setFormData(p => ({...p, emoji})); setShowEmojiPicker(false); }} />
            </Modal>

            {/* Beheer Modal */}
            <Modal isOpen={showBeheerModal} onClose={() => setShowBeheerModal(false)} title="Beheer Locaties">
                <div className="space-y-6">
                    <div>
                        <h4 className="font-bold text-gray-700 mb-2">Locaties</h4>
                        <ul className="space-y-2 mb-3">{filteredLocaties.map(l => (
                            <li key={l.id} className="flex justify-between p-2 bg-gray-50 rounded items-center">
                                <span onClick={() => setSelectedLocatieForBeheer(l.id)} className={`cursor-pointer ${selectedLocatieForBeheer===l.id?'text-blue-600 font-bold':''}`}>{l.naam}</span>
                                <button onClick={() => handleDeleteLocatie(l.id)} className="text-red-500"><Icon path={Icons.Trash2}/></button>
                            </li>
                        ))}</ul>
                        <form onSubmit={handleAddLocatie} className="flex gap-2"><input className="flex-grow border p-2 rounded" placeholder="Nieuwe locatie" value={newLocatieNaam} onChange={e=>setNewLocatieNaam(e.target.value)} required /><button className="bg-blue-600 text-white px-3 rounded">+</button></form>
                    </div>
                    {selectedLocatieForBeheer && (
                        <div className="pt-4 border-t">
                            <h4 className="font-bold text-gray-700 mb-2">Lades</h4>
                            <ul className="space-y-2 mb-3">{lades.filter(l => l.vriezerId === selectedLocatieForBeheer).sort((a,b)=>a.naam.localeCompare(b.naam)).map(l => (
                                <li key={l.id} className="flex justify-between p-2 bg-gray-50 rounded items-center"><span>{l.naam}</span><button onClick={() => handleDeleteLade(l.id)} className="text-red-500"><Icon path={Icons.Trash2}/></button></li>
                            ))}</ul>
                            <form onSubmit={handleAddLade} className="flex gap-2"><input className="flex-grow border p-2 rounded" placeholder="Nieuwe lade" value={newLadeNaam} onChange={e=>setNewLadeNaam(e.target.value)} required /><button className="bg-green-600 text-white px-3 rounded">+</button></form>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Updates Modal */}
            <Modal isOpen={showWhatsNew} onClose={() => setShowWhatsNew(false)} title="Meldingen">
                {alerts.length > 0 && <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4"><h4 className="font-bold text-red-800">Let op!</h4><ul>{alerts.map(i => <li key={i.id}>{i.naam} ({getDagenOud(i.ingevrorenOp)}d)</li>)}</ul></div>}
                <h4 className="font-bold text-blue-600 mb-2">Versie 2.3</h4>
                <ul className="list-disc pl-5"><li>Alle functies hersteld!</li><li>Emoji kiezer werkt weer.</li><li>Alles start ingeklapt.</li><li>Lades in beheer gesorteerd.</li></ul>
            </Modal>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
