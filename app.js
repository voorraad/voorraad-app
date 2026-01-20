const { useState, useEffect, useMemo } = React;

// --- 1. FIREBASE CONFIGURATIE ---
const firebaseConfig = typeof __firebase_config !== 'undefined' 
    ? JSON.parse(__firebase_config) 
    : {
        apiKey: "AIzaSyB9KRUbVBknnDDkkWF2Z5nRskmY-9CkD24", // API Key hersteld
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
const APP_VERSION = '2.0';
const CATEGORIEEN = ["Geen", "Vlees", "Vis", "Groenten", "Fruit", "Brood", "IJs", "Restjes", "Saus", "Friet", "Pizza", "Ander"];
const EENHEDEN = ["stuks", "zak", "portie", "doos", "gram", "kilo", "bakje", "ijsdoos", "pak", "fles", "blik", "pot", "liter"];

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
    Users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    Check: <path d="M20 6 9 17l-5-5"/>,
    Alert: <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3zM12 9v4M12 17h.01"/>
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

const getStatusColor = (dagen) => {
    if (dagen > 180) return 'border-l-4 border-red-500 bg-red-50';
    if (dagen > 90) return 'border-l-4 border-yellow-400 bg-yellow-50';
    return 'border-l-4 border-green-400 bg-white';
};

// --- 5. UI COMPONENTEN ---
const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto modal-animate" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800">{title}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <Icon path={Icons.X} className="text-gray-500" />
                    </button>
                </div>
                <div className="p-4 space-y-4">
                    {children}
                </div>
            </div>
        </div>
    );
};

const Badge = ({ type, text }) => {
    const colors = {
        minor: "bg-blue-100 text-blue-700",
        patch: "bg-green-100 text-green-700",
        major: "bg-purple-100 text-purple-700",
        alert: "bg-red-100 text-red-700"
    };
    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${colors[type] || colors.minor}`}>
            {text}
        </span>
    );
};

// --- 6. HOOFD APPLICATIE ---
function App() {
    // User State
    const [user, setUser] = useState(null);
    const [beheerdeUserId, setBeheerdeUserId] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [usersList, setUsersList] = useState([]); // Voor admin switch

    // Data State
    const [activeTab, setActiveTab] = useState('vriezer');
    const [items, setItems] = useState([]);
    const [vriezers, setVriezers] = useState([]);
    const [lades, setLades] = useState([]);
    
    // UI State
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showWhatsNew, setShowWhatsNew] = useState(false);
    const [showSwitchAccount, setShowSwitchAccount] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        naam: '', aantal: 1, eenheid: 'stuks', vriezerId: '', ladeId: '', categorie: 'Vlees', 
        ingevrorenOp: new Date().toISOString().split('T')[0], houdbaarheidsDatum: ''
    });

    // --- AUTH & DATA FETCHING ---
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (u) => {
            if (u) {
                setUser(u);
                setBeheerdeUserId(u.uid); // Standaard eigen account
                
                // Check Admin
                const adminDoc = await db.collection('admins').doc(u.uid).get();
                setIsAdmin(adminDoc.exists);

                // Check of we direct moeten switchen (geen eigen vriezers)
                const vriezersCheck = await db.collection('vriezers').where('userId', '==', u.uid).limit(1).get();
                if (vriezersCheck.empty && !adminDoc.exists) {
                    const shares = await db.collection('shares').where("sharedWithEmail", "==", u.email).where("status", "==", "accepted").limit(1).get();
                    if (!shares.empty) {
                        setBeheerdeUserId(shares.docs[0].data().ownerId);
                    }
                }
            } else {
                setUser(null);
                setItems([]);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Data Listeners
    useEffect(() => {
        if (!beheerdeUserId) return;

        const unsubVriezers = db.collection('vriezers').where('userId', '==', beheerdeUserId).onSnapshot(snap => {
            setVriezers(snap.docs.map(d => ({ id: d.id, ...d.data(), type: d.data().type || 'vriezer' })));
        });

        const unsubLades = db.collection('lades').where('userId', '==', beheerdeUserId).onSnapshot(snap => {
            setLades(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const unsubItems = db.collection('items').where('userId', '==', beheerdeUserId).onSnapshot(snap => {
            setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => { unsubVriezers(); unsubLades(); unsubItems(); };
    }, [beheerdeUserId]);

    // Admin User List Listener
    useEffect(() => {
        if (isAdmin) {
            return db.collection('users').orderBy('email').onSnapshot(snap => {
                setUsersList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            });
        }
    }, [isAdmin]);

    // Check Updates & Alerts bij start
    useEffect(() => {
        if (items.length > 0) {
            const lastVersion = localStorage.getItem('app_version');
            const hasAlerts = items.some(i => getDagenOud(i.ingevrorenOp) > 180);
            
            if (lastVersion !== APP_VERSION || (hasAlerts && !sessionStorage.getItem('seen_alerts'))) {
                setShowWhatsNew(true);
                localStorage.setItem('app_version', APP_VERSION);
                sessionStorage.setItem('seen_alerts', 'true');
            }
        }
    }, [items]);

    // --- FILTERS ---
    const filteredLocaties = vriezers.filter(l => l.type === activeTab);
    const alerts = items.filter(i => getDagenOud(i.ingevrorenOp) > 180);

    // --- HANDLERS ---
    const handleLogin = async () => {
        // In een echte app: Google Auth Provider. Hier anoniem voor demo/gemak als fallback
        try {
            await auth.signInAnonymously();
        } catch (e) {
            alert("Login fout: " + e.message);
        }
    };

    const handleAddItem = async (e) => {
        e.preventDefault();
        const lade = lades.find(l => l.id === formData.ladeId);
        
        try {
            await db.collection('items').add({
                ...formData,
                aantal: parseFloat(formData.aantal),
                ladeNaam: lade ? lade.naam : '',
                ingevrorenOp: new Date(formData.ingevrorenOp),
                houdbaarheidsDatum: formData.houdbaarheidsDatum ? new Date(formData.houdbaarheidsDatum) : null,
                userId: beheerdeUserId,
                emoji: '📦' // Simpel houden voor nu
            });
            setShowAddModal(false);
            setFormData({ ...formData, naam: '', aantal: 1 });
        } catch (err) {
            alert("Fout: " + err.message);
        }
    };

    const handleDelete = async (id, naam) => {
        if (confirm(`Verwijder '${naam}'?`)) {
            await db.collection('items').doc(id).delete();
        }
    };

    const openEdit = (item) => {
        setEditingItem(item);
        setFormData({
            naam: item.naam,
            aantal: item.aantal,
            eenheid: item.eenheid,
            vriezerId: item.vriezerId,
            ladeId: item.ladeId,
            categorie: item.categorie,
            ingevrorenOp: toInputDate(item.ingevrorenOp),
            houdbaarheidsDatum: toInputDate(item.houdbaarheidsDatum)
        });
        setShowAddModal(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        const lade = lades.find(l => l.id === formData.ladeId);
        try {
            await db.collection('items').doc(editingItem.id).update({
                ...formData,
                aantal: parseFloat(formData.aantal),
                ladeNaam: lade ? lade.naam : '',
                ingevrorenOp: new Date(formData.ingevrorenOp), // Correcte datum, geen offset bug
                houdbaarheidsDatum: formData.houdbaarheidsDatum ? new Date(formData.houdbaarheidsDatum) : null
            });
            setShowAddModal(false);
            setEditingItem(null);
        } catch (err) {
            alert("Update fout: " + err.message);
        }
    };

    // Render Login
    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center">
                    <h1 className="text-2xl font-bold text-blue-600 mb-4">Mijn Voorraad</h1>
                    <p className="text-gray-500 mb-6">Log in om je vriezer te beheren.</p>
                    <button onClick={handleLogin} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition">
                        Start (Anoniem/Auto)
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24 font-sans text-gray-800">
            {/* HEADER */}
            <header className="bg-white sticky top-0 z-30 shadow-sm border-b border-gray-200">
                <div className="max-w-3xl mx-auto px-4 py-3 flex justify-between items-center">
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400">
                        Mijn Voorraad
                    </h1>
                    <div className="flex gap-2">
                        {isAdmin && (
                            <button onClick={() => setShowSwitchAccount(true)} className="w-10 h-10 flex items-center justify-center rounded-full bg-orange-100 text-orange-600 hover:bg-orange-200">
                                <Icon path={Icons.Users} size={20} />
                            </button>
                        )}
                        <button 
                            onClick={() => setShowWhatsNew(true)}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 border border-gray-200 text-gray-600 hover:bg-blue-50 relative"
                        >
                            <Icon path={Icons.Info} size={20} />
                            {alerts.length > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
                        </button>
                        <button onClick={() => auth.signOut()} className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100">
                            <Icon path={Icons.LogOut} size={18} />
                        </button>
                    </div>
                </div>
                
                {/* TABS */}
                <div className="max-w-3xl mx-auto px-4 pb-0 flex space-x-6 border-b border-gray-100">
                    <button onClick={() => setActiveTab('vriezer')} className={`pb-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'vriezer' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>
                        <Icon path={Icons.Snowflake} size={18} /> Vriezer
                    </button>
                    <button onClick={() => setActiveTab('voorraad')} className={`pb-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'voorraad' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500'}`}>
                        <Icon path={Icons.Box} size={18} /> Voorraad
                    </button>
                </div>
            </header>

            <main className="max-w-3xl mx-auto p-4 space-y-6">
                {/* DASHBOARD */}
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    <div className="flex-shrink-0 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm text-sm">
                        <span className="font-bold text-gray-800">{items.filter(i => {
                            const v = vriezers.find(v => v.id === i.vriezerId);
                            return v && v.type === activeTab;
                        }).length}</span> totaal
                    </div>
                    {filteredLocaties.map(loc => (
                        <div key={loc.id} className="flex-shrink-0 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm text-sm">
                            <span className="font-bold text-gray-800">{items.filter(i => i.vriezerId === loc.id).length}</span> {loc.naam}
                        </div>
                    ))}
                </div>

                {/* SEARCH */}
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Icon path={Icons.Search} className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm transition-all"
                        placeholder="Zoek een product..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* LIST */}
                <div className="space-y-8">
                    {filteredLocaties.map(vriezer => (
                        <div key={vriezer.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                                {vriezer.naam}
                            </h2>
                            <div className="space-y-4">
                                {lades.filter(l => l.vriezerId === vriezer.id).sort((a,b) => a.naam.localeCompare(b.naam)).map(lade => {
                                    const ladeItems = items.filter(i => i.ladeId === lade.id && i.naam.toLowerCase().includes(search.toLowerCase()));
                                    if (ladeItems.length === 0 && search) return null;

                                    return (
                                        <div key={lade.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                            <div className="bg-gray-50/50 px-4 py-2 border-b border-gray-100">
                                                <h3 className="font-semibold text-gray-700 text-sm">{lade.naam}</h3>
                                            </div>
                                            <ul className="divide-y divide-gray-50">
                                                {ladeItems.length === 0 ? <li className="p-4 text-center text-gray-400 text-sm italic">Leeg</li> : 
                                                ladeItems.map(item => {
                                                    const dagen = getDagenOud(item.ingevrorenOp);
                                                    return (
                                                        <li key={item.id} className={`group flex items-center justify-between p-3 hover:bg-gray-50 transition-colors ${getStatusColor(dagen)}`}>
                                                            <div className="flex items-center gap-3 overflow-hidden">
                                                                <span className="text-2xl">{item.emoji || '📦'}</span>
                                                                <div className="min-w-0">
                                                                    <p className="font-medium text-gray-900 truncate">{item.naam}</p>
                                                                    <p className="text-xs text-gray-500 flex items-center gap-1 flex-wrap">
                                                                        <span className="font-semibold text-blue-600 bg-blue-50 px-1.5 rounded">{item.aantal} {item.eenheid}</span>
                                                                        <span>• {item.categorie}</span>
                                                                        <span>• {formatDate(item.ingevrorenOp)}</span>
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <button onClick={() => openEdit(item)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg"><Icon path={Icons.Edit2} size={16}/></button>
                                                                <button onClick={() => handleDelete(item.id, item.naam)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Icon path={Icons.Trash2} size={16}/></button>
                                                            </div>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* FAB */}
            <button 
                onClick={() => { setEditingItem(null); setFormData({...formData, naam: '', aantal: 1}); setShowAddModal(true); }}
                className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-600/30 flex items-center justify-center hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all z-40"
            >
                <Icon path={Icons.Plus} size={28} />
            </button>

            {/* ADD/EDIT MODAL */}
            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={editingItem ? "Bewerken" : "Toevoegen"}>
                <form onSubmit={editingItem ? handleUpdate : handleAddItem} className="space-y-4">
                    <input 
                        type="text" placeholder="Productnaam" className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={formData.naam} onChange={e => setFormData({...formData, naam: e.target.value})} required
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <select className="w-full p-3 bg-white border border-gray-300 rounded-lg" value={formData.vriezerId} onChange={e => setFormData({...formData, vriezerId: e.target.value})} required>
                            <option value="" disabled>Locatie...</option>
                            {filteredLocaties.map(l => <option key={l.id} value={l.id}>{l.naam}</option>)}
                        </select>
                        <select className="w-full p-3 bg-white border border-gray-300 rounded-lg" value={formData.ladeId} onChange={e => setFormData({...formData, ladeId: e.target.value})} required>
                            <option value="" disabled>Lade...</option>
                            {lades.filter(l => l.vriezerId === formData.vriezerId).map(l => <option key={l.id} value={l.id}>{l.naam}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-4">
                        <input type="number" className="w-24 text-center p-3 border border-gray-300 rounded-lg" value={formData.aantal} onChange={e => setFormData({...formData, aantal: e.target.value})} />
                        <select className="flex-grow p-3 bg-white border border-gray-300 rounded-lg" value={formData.eenheid} onChange={e => setFormData({...formData, eenheid: e.target.value})}>
                            {EENHEDEN.map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <select className="w-full p-3 bg-white border border-gray-300 rounded-lg" value={formData.categorie} onChange={e => setFormData({...formData, categorie: e.target.value})}>
                            {CATEGORIEEN.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input type="date" className="w-full p-3 bg-white border border-gray-300 rounded-lg" value={formData.ingevrorenOp} onChange={e => setFormData({...formData, ingevrorenOp: e.target.value})} required />
                    </div>
                    <button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md">{editingItem ? "Opslaan" : "Toevoegen"}</button>
                </form>
            </Modal>

            {/* UPDATES & ALERTS MODAL */}
            <Modal isOpen={showWhatsNew} onClose={() => setShowWhatsNew(false)} title="Meldingen">
                {alerts.length > 0 && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg mb-6">
                        <h4 className="text-red-800 font-bold flex items-center gap-2"><Icon path={Icons.Alert} size={18}/> Let op!</h4>
                        <ul className="mt-2 text-sm text-red-700 space-y-1">
                            {alerts.slice(0,5).map(item => (
                                <li key={item.id} className="flex justify-between"><span>{item.naam}</span><span className="font-bold">{getDagenOud(item.ingevrorenOp)}d oud</span></li>
                            ))}
                        </ul>
                    </div>
                )}
                <h4 className="text-blue-600 font-bold border-b border-gray-100 pb-2 mb-3">Versie 2.0</h4>
                <ul className="space-y-3">
                    <li className="flex gap-3"><Badge type="major" text="Nieuw" /><span className="text-sm">Compleet nieuw React design.</span></li>
                    <li className="flex gap-3"><Badge type="patch" text="Fix" /><span className="text-sm">Datum bug opgelost.</span></li>
                </ul>
            </Modal>

            {/* ADMIN SWITCH MODAL */}
            <Modal isOpen={showSwitchAccount} onClose={() => setShowSwitchAccount(false)} title="Wissel Account">
                <ul className="divide-y divide-gray-100">
                    {usersList.map(u => (
                        <li key={u.id} className="p-3 hover:bg-gray-50 cursor-pointer flex justify-between" onClick={() => { setBeheerdeUserId(u.id); setShowSwitchAccount(false); }}>
                            <span className="font-medium">{u.email}</span>
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
