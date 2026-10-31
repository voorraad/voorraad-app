// Firebase wordt (compat-versie) via de CDN-scripts in index.html geladen en is hier
// beschikbaar als window.firebase. Zo blijft de app een simpele statische site.
const firebase = window.firebase;
if (!firebase) {
    // CDN-scripts konden niet laden (meestal: geen internet bij de allereerste keer openen).
    const el = document.getElementById('root');
    if (el) el.innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;font-family:system-ui,sans-serif;color:#57534e"><div><p style="font-size:20px;font-weight:700;color:#1c1917">Geen verbinding</p><p>Voorraad kon niet laden. Controleer je internet en probeer opnieuw.</p><button onclick="location.reload()" style="margin-top:12px;padding:10px 18px;border-radius:12px;border:0;background:#0d9488;color:#fff;font-weight:600">Opnieuw proberen</button></div></div>';
    throw new Error('Firebase niet geladen');
}

const firebaseConfig = {
    apiKey: 'AIzaSyCgsIQ-tGKor53WqsLoobZgI31xcCkdu48',
    authDomain: 'voorraad-7a7b2.firebaseapp.com',
    projectId: 'voorraad-7a7b2',
    storageBucket: 'vriezer-app.firebasestorage.app',
    messagingSenderId: '902712789943',
    appId: '1:902712789943:web:ef270b84968319052cf632'
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

export const db = firebase.firestore();
export const auth = firebase.auth();
export const FieldValue = firebase.firestore.FieldValue;
export const GoogleAuthProvider = firebase.auth.GoogleAuthProvider;

// Offline: Firestore houdt een lokale kopie bij (IndexedDB) en synct zodra je weer online bent.
try {
    db.enablePersistence({ synchronizeTabs: true }).catch(() => { /* niet ondersteund of meerdere tabs: geen probleem */ });
} catch (e) { /* al gestart */ }

export const serverTimestamp = () => FieldValue.serverTimestamp();
export const increment = (n) => FieldValue.increment(n);

// Firestore-batches mogen max. 500 operaties bevatten. Deze helper splitst automatisch.
export const runBatched = async (ops) => {
    for (let i = 0; i < ops.length; i += 450) {
        const batch = db.batch();
        ops.slice(i, i + 450).forEach(fn => fn(batch));
        await batch.commit();
    }
};

export default firebase;
