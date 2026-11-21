import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { db, auth, GoogleAuthProvider, serverTimestamp, increment, runBatched } from '../lib/firebase.js';
import { forgetPhoto } from '../lib/push.js';
import { CATEGORIEEN_VRIES, DEFAULT_TOUR_STEPS, MENU_LOCATION_ID, UNIT_FIELD } from '../lib/constants.js';
import { isMenuEntry, num, round2, randomToken, sortLocaties, todayKey, emojiForCategory, normalize, formatAantal } from '../lib/utils.js';

const StoreCtx = createContext(null);
export const useStore = () => useContext(StoreCtx);

const mapDocs = (snap) => snap.docs.map(d => ({ id: d.id, ...d.data() }));

// Alleen deze velden horen bij een product (voorkomt dat formulier-hulpvelden in Firestore belanden).
const ITEM_FIELDS = ['naam', 'aantal', 'eenheid', 'vriezerId', 'ladeId', 'ladeNaam', 'categorie', 'minimumVoorraad', 'prijs',
    'ingevrorenOp', 'houdbaarheidsDatum', 'notitie', 'emoji', 'geplandeDatum', 'tags', 'altijdGoed', 'foto', 'barcode', 'toegevoegdDoor'];
export const pickItemFields = (o) => Object.fromEntries(ITEM_FIELDS.filter(k => o[k] !== undefined).map(k => [k, o[k]]));

export function StoreProvider({ children }) {
    // ---------- Auth & account ----------
    const [authState, setAuthState] = useState('loading'); // loading | out | in
    const [user, setUser] = useState(null);
    const [me, setMe] = useState(null);              // eigen users-document
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminChecked, setAdminChecked] = useState(false);
    const [ownerId, setOwnerId] = useState(null);    // wiens voorraad bekijken we (= beheerdeUserId)
    const [owner, setOwner] = useState({});          // users-document van die voorraad (categorieën, eenheden, stats)

    // ---------- Data ----------
    const [vriezers, setVriezers] = useState([]);
    const [lades, setLades] = useState([]);
    const [allItems, setAllItems] = useState([]);
    const [shopping, setShopping] = useState([]);
    const [recepten, setRecepten] = useState([]);
    const [loaded, setLoaded] = useState({});
    const [incomingShares, setIncomingShares] = useState([]);
    const [outgoingShares, setOutgoingShares] = useState([]);
    const [sharesLoaded, setSharesLoaded] = useState(false);
    const [usersList, setUsersList] = useState([]);
    const [globalSettings, setGlobalSettings] = useState({ onboardingActive: true, tourSteps: DEFAULT_TOUR_STEPS, maintenance: false });
    const fotoServer = useRef(''); fotoServer.current = (globalSettings.push && globalSettings.push.fotoUrl) || '';
    const forget = (url, wacht) => forgetPhoto(fotoServer.current, url, wacht);

    // ---------- Toast ----------
    const [toast, setToast] = useState(null);
    const notify = (msg, type = 'success', action = null) => setToast({ msg, type, action, id: Date.now() + Math.random() });

    const meUnsub = useRef(null);

    useEffect(() => {
        const unsub = auth.onAuthStateChanged(async (u) => {
            if (meUnsub.current) { meUnsub.current(); meUnsub.current = null; }
            if (!u) {
                setUser(null); setMe(null); setOwnerId(null); setOwner({}); setIsAdmin(false); setAdminChecked(false);
                setVriezers([]); setLades([]); setAllItems([]); setShopping([]); setRecepten([]);
                setAuthState('out');
                return;
            }
            setUser(u);
            let target = u.uid;
            let adminFlag = false;
            try {
                const [ownDoc, adminDoc] = await Promise.all([
                    db.collection('users').doc(u.uid).get(),
                    db.collection('admins').doc(u.uid).get().catch(() => ({ exists: false }))
                ]);
                adminFlag = !!adminDoc.exists;
                if (ownDoc.exists && ownDoc.data().activeBeheerdeUserId) target = ownDoc.data().activeBeheerdeUserId;
                else if (!adminFlag) {
                    // Nieuwe gebruiker zonder eigen locaties maar met een gedeelde voorraad: open die.
                    const own = await db.collection('vriezers').where('userId', '==', u.uid).limit(1).get();
                    if (own.empty && u.email) {
                        const sh = await db.collection('shares').where('sharedWithEmail', '==', u.email.toLowerCase()).where('status', '==', 'accepted').limit(1).get();
                        if (!sh.empty) target = sh.docs[0].data().ownerId;
                    }
                }
            } catch (e) { console.warn('Kon accountgegevens niet laden', e); }
            setIsAdmin(adminFlag);
            setAdminChecked(true);
            setOwnerId(target);

            db.collection('users').doc(u.uid).set({
                laatstGezien: serverTimestamp(), email: u.email || '', displayName: u.displayName || ''
            }, { merge: true }).catch(() => { });

            meUnsub.current = db.collection('users').doc(u.uid).onSnapshot(doc => {
                if (doc.exists) setMe(doc.data());
                else {
                    const init = {
                        customCategories: CATEGORIEEN_VRIES, customUnitsVries: [], customUnitsFrig: [], customUnitsVoorraad: [],
                        hiddenTabs: [], darkMode: false, showHelpButton: false, showBalans: false, notificationsEnabled: true,
                        tourDisabled: false, hasSeenTutorial: false, openLades: [],
                        stats: { wasted: 0, consumed: 0, wastedValue: 0, consumedValue: 0 }, email: u.email || '', aangemaaktOp: new Date()
                    };
                    db.collection('users').doc(u.uid).set(init, { merge: true }).catch(() => { });
                    setMe(init);
                    if (!initDone.current) { initDone.current = true; setupNewUser(u); }
                }
            }, () => setMe(m => m || {}));
            setAuthState('in');
        });
        return () => { unsub(); if (meUnsub.current) meUnsub.current(); };
    }, []);

    // Nieuwe gebruiker: eerst de standaardinstellingen van de beheerder (settings/standaard),
    // daarna een eventuele persoonlijke uitnodiging (invites/{email}) die voorrang krijgt.
    const initDone = useRef(false);
    async function setupNewUser(u) {
        const ref = db.collection('users').doc(u.uid);
        try {
            const st = await db.collection('settings').doc('standaard').get();
            const d = st.exists ? st.data() : null;
            if (d && d.actief) {
                const patch = {};
                ['customCategories', 'customUnitsVries', 'customUnitsFrig', 'customUnitsVoorraad'].forEach(k => { if (Array.isArray(d[k])) patch[k] = d[k]; });
                if (Array.isArray(d.hiddenTabs)) patch.hiddenTabs = d.hiddenTabs;
                if (Object.keys(patch).length) await ref.set(patch, { merge: true });
                const own = await db.collection('vriezers').where('userId', '==', u.uid).limit(1).get();
                if (own.empty && Array.isArray(d.locaties)) {
                    let order = 0;
                    for (const l of d.locaties) {
                        const v = await db.collection('vriezers').add({ naam: l.naam, type: l.type || 'vriezer', color: l.color || 'blue', locatieGroep: l.locatieGroep || 'Thuis', order: order++, userId: u.uid });
                        await Promise.all((l.lades || []).map(n => db.collection('lades').add({ naam: n, vriezerId: v.id, userId: u.uid })));
                    }
                }
            }
        } catch (e) { console.warn('Standaardinstellingen niet toegepast', e); }
        const em = (u.email || '').toLowerCase();
        if (!em) return;
        try {
            const inv = await db.collection('invites').doc(em).get();
            if (!inv.exists || inv.data().gebruiktOp) return;
            const d = inv.data();
            const preset = {};
            if (Array.isArray(d.hiddenTabs)) preset.hiddenTabs = d.hiddenTabs;
            if (d.adminKleur) preset.adminKleur = d.adminKleur;
            if (d.naam && !u.displayName) preset.displayName = d.naam;
            await ref.set(preset, { merge: true });
            await inv.ref.set({ gebruiktOp: new Date(), uid: u.uid }, { merge: true });
        } catch (e) { /* geen uitnodiging */ }
    }

    // Aanwezigheid: zolang de app zichtbaar is, elke minuut "actief" melden (beheerpagina → Nu in de app).
    useEffect(() => {
        if (!user) return;
        const beat = () => {
            if (document.visibilityState !== 'visible') return;
            const h = (location.hash || '#/voorraad').replace(/^#\/?/, '').split('/');
            const waar = h[0] === 'admin' ? 'Beheerpagina' : h[0] === 'lijst' ? 'Boodschappen' : h[0] === 'menu' ? (h[1] === 'recepten' ? 'Recepten' : 'Weekmenu') : h[0] === 'meer' ? 'Instellingen' : ({ frig: 'Frigo', voorraad: 'Stock' }[h[1]] || 'Vriezer');
            db.collection('users').doc(user.uid).set({ actiefOp: serverTimestamp(), actiefWaar: waar }, { merge: true }).catch(() => { });
        };
        beat();
        const t = setInterval(beat, 60000);
        const vis = () => document.visibilityState === 'visible' && beat();
        document.addEventListener('visibilitychange', vis);
        window.addEventListener('hashchange', beat);
        return () => { clearInterval(t); document.removeEventListener('visibilitychange', vis); window.removeEventListener('hashchange', beat); };
    }, [user && user.uid]);

    // Beheerder bekijkt de app als een andere gebruiker (met diens rechten, instellingen en voorraden).
    const [alsId, setAlsId] = useState(() => { try { return sessionStorage.getItem('voorraad_als') || ''; } catch (e) { return ''; } });
    const als = isAdmin && alsId ? usersList.find(u => u.id === alsId) || null : null;
    const effMe = als || me;
    const effUid = als ? als.id : (user && user.uid);
    const [alsShares, setAlsShares] = useState([]);
    useEffect(() => {
        if (!als || !als.email) { setAlsShares([]); return; }
        return db.collection('shares').where('sharedWithEmail', '==', (als.email || '').toLowerCase()).onSnapshot(s => setAlsShares(mapDocs(s)), () => setAlsShares([]));
    }, [als && als.id]);

    // Gezinsleden: meerdere personen die hetzelfde account op dit toestel gebruiken.
    const [gezinslidId, setGezinslidId] = useState(() => { try { return localStorage.getItem('voorraad_gezinslid') || ''; } catch (e) { return ''; } });
    const gezinsleden = (effMe && Array.isArray(effMe.gezinsleden)) ? effMe.gezinsleden : [];
    const gezinslid = gezinsleden.find(g => g.id === gezinslidId) || null;

    // Deel-uitnodigingen
    useEffect(() => {
        if (!user) { setIncomingShares([]); setOutgoingShares([]); setSharesLoaded(false); return; }
        const email = (user.email || '').toLowerCase();
        const u1 = db.collection('shares').where('sharedWithEmail', '==', email)
            .onSnapshot(s => { setIncomingShares(mapDocs(s)); setSharesLoaded(true); }, (e) => console.warn('Kon uitnodigingen niet laden', e));
        const u2 = db.collection('shares').where('ownerId', '==', user.uid)
            .onSnapshot(s => setOutgoingShares(mapDocs(s)), () => { });
        return () => { u1(); u2(); };
    }, [user]);

    // Veiligheid: als je toegang tot een gedeelde voorraad is ingetrokken, terug naar je eigen voorraad.
    useEffect(() => {
        if (!user || !ownerId || !adminChecked || !sharesLoaded || isAdmin) return;
        if (ownerId === user.uid) return;
        const ok = incomingShares.some(s => s.status === 'accepted' && s.ownerId === ownerId);
        if (!ok) switchAccount(user.uid, true);
    }, [user, ownerId, adminChecked, sharesLoaded, isAdmin, incomingShares]);

    // Toegangsbewijs voor gedeelde voorraden: toegang/{eigenaar}_{gebruiker} wijst naar het aanvaarde deel-verzoek.
    // De Firestore-regels kunnen niet zoeken, wel een document met een vaste naam opvragen.
    const [accessTick, setAccessTick] = useState(0);
    const accessDone = useRef(new Set());
    useEffect(() => {
        if (!user) return;
        const todo = incomingShares.filter(s => s.status === 'accepted' && s.ownerId && !accessDone.current.has(s.id));
        if (!todo.length) return;
        (async () => {
            let made = false;
            for (const s of todo) {
                accessDone.current.add(s.id);
                try {
                    const ref = db.collection('toegang').doc(`${s.ownerId}_${user.uid}`);
                    const cur = await ref.get().catch(() => null);
                    if (!cur || !cur.exists || cur.data().shareId !== s.id) {
                        await ref.set({ ownerId: s.ownerId, uid: user.uid, shareId: s.id, email: (user.email || '').toLowerCase() });
                        made = true;
                    }
                    if (s.acceptedUid !== user.uid) await db.collection('shares').doc(s.id).update({ acceptedUid: user.uid }).catch(() => { });
                } catch (e) { console.warn('Toegang bijwerken mislukt', e); }
            }
            if (made) setAccessTick(t => t + 1);
        })();
    }, [user, incomingShares]);

    // Users-document van de beheerde voorraad
    useEffect(() => {
        if (!ownerId) return;
        return db.collection('users').doc(ownerId).onSnapshot(doc => setOwner(doc.exists ? doc.data() : {}), () => setOwner({}));
    }, [ownerId, accessTick]);

    // Voorraaddata
    useEffect(() => {
        if (!ownerId) return;
        setLoaded({});
        const done = (k) => setLoaded(l => (l[k] ? l : { ...l, [k]: true }));
        const err = (k) => (e) => { console.warn('Kon ' + k + ' niet laden', e); done(k); };
        const q = (c) => db.collection(c).where('userId', '==', ownerId);
        const subs = [
            q('vriezers').onSnapshot(s => { setVriezers(mapDocs(s).map(v => ({ ...v, type: v.type || 'vriezer' }))); done('vriezers'); }, err('vriezers')),
            q('lades').onSnapshot(s => { setLades(mapDocs(s)); done('lades'); }, err('lades')),
            q('items').onSnapshot(s => { setAllItems(mapDocs(s)); done('items'); }, err('items')),
            q('shoppingList').onSnapshot(s => { setShopping(mapDocs(s)); done('shopping'); }, err('shopping')),
            q('recepten').onSnapshot(s => { setRecepten(mapDocs(s)); done('recepten'); }, err('recepten'))
        ];
        return () => subs.forEach(u => u());
    }, [ownerId, accessTick]);

    // Globale instellingen (tour, onderhoud)
    useEffect(() => {
        const s = db.collection('settings');
        const subs = [
            s.doc('onboarding').onSnapshot(d => setGlobalSettings(g => ({ ...g, onboardingLoaded: true, onboardingActive: d.exists ? d.data().isActive !== false : true })), () => setGlobalSettings(g => ({ ...g, onboardingLoaded: true }))),
            s.doc('tourSteps').onSnapshot(d => {
                const x = d.exists ? d.data() : {};
                setGlobalSettings(g => ({ ...g, tourLoaded: true, tourNieuweTonen: x.nieuweTonen !== false, ...(Array.isArray(x.steps) && x.steps.length ? { tourSteps: x.steps, tourVersie: x.versie || 1 } : {}) }));
            }, () => setGlobalSettings(g => ({ ...g, tourLoaded: true }))),
            s.doc('maintenance').onSnapshot(d => setGlobalSettings(g => ({ ...g, maintenance: d.exists && d.data().active === true })), () => { }),
            s.doc('barcodes').onSnapshot(d => setGlobalSettings(g => ({ ...g, barcodesDelen: !(d.exists && d.data().gedeeld === false) })), () => { }),
            s.doc('push').onSnapshot(d => setGlobalSettings(g => ({ ...g, push: d.exists ? d.data() : null })), () => { }),
            s.doc('mededeling').onSnapshot(d => setGlobalSettings(g => ({ ...g, mededeling: d.exists ? d.data() : null })), () => { })
        ];
        return () => subs.forEach(u => u());
    }, []);

    useEffect(() => {
        if (!isAdmin) { setUsersList([]); return; }
        return db.collection('users').orderBy('email').onSnapshot(s => setUsersList(mapDocs(s)), () => { });
    }, [isAdmin]);

    // ---------- Afgeleide data ----------
    const derived = useMemo(() => {
        const locById = Object.fromEntries(vriezers.map(v => [v.id, v]));
        const ladeById = Object.fromEntries(lades.map(l => [l.id, l]));
        const items = allItems.filter(i => !isMenuEntry(i));
        const menuEntries = allItems.filter(isMenuEntry);
        const typeOf = (item) => (locById[item.vriezerId] || {}).type || 'vriezer';
        return { locById, ladeById, items, menuEntries, typeOf, sortedLocs: sortLocaties(vriezers) };
    }, [vriezers, lades, allItems]);

    const dataLoaded = loaded.vriezers && loaded.lades && loaded.items;
    const hiddenTabs = (effMe && effMe.hiddenTabs) || [];
    const canSee = (tab) => (isAdmin && !als) || !hiddenTabs.includes(tab);
    const stats = { wasted: 0, consumed: 0, wastedValue: 0, consumedValue: 0, ...(owner.stats || {}) };
    const isOwnAccount = user && ownerId === effUid;

    // Bestaande bekijk-links (van vóór publicShares) automatisch omzetten.
    useEffect(() => {
        if (user && me && me.publicShareEnabled && me.publicShareToken) syncPublicShare(me.publicShareToken, null);
    }, [user && user.uid, me && me.publicShareEnabled, me && me.publicShareToken]);

    // ---------- Acties ----------
    const ownerDoc = () => db.collection('users').doc(ownerId);

    // locId: locatie waar het om gaat (voor meldingen 'wijzigingen in een locatie')
    // undo: hoe de beheerder dit vanuit het logboek ongedaan kan maken
    //   { soort: 'weg', coll, ids } | { soort: 'terug', trash } | { soort: 'zet', coll, id, voor }
    const log = (action, itemNaam, details, locId, target, undo) => {
        if (!user) return;
        db.collection('logs').add({
            action, item: itemNaam || '', details: details || '', actorId: user.uid, ...(locId ? { locId } : {}), ...(undo ? { undo } : {}),
            actorName: user.displayName || user.email || '', targetUserId: target || ownerId, timestamp: serverTimestamp(),
            ...(gezinslid ? { gezinslid: gezinslid.naam, gezinslidKleur: gezinslid.kleur || '' } : {})
        }).catch(e => console.warn('Kon log niet opslaan', e));
    };
    // Vorige waarden (voor ongedaan maken); undefined wordt null zodat Firestore het aanvaardt.
    const voorVan = (obj, keys) => Object.fromEntries(keys.map(k => [k, obj[k] === undefined ? null : obj[k]]));
    // Verwijderd document 30 dagen in de prullenbak bewaren. Geeft het id van de prullenbak terug.
    const toTrash = (coll, doc, naam, extra = {}) => {
        if (!user || !doc || !doc.id) return null;
        const { id, ...data } = doc;
        const ref = db.collection('prullenbak').doc();
        ref.set({ coll, docId: id, data, naam: naam || data.naam || '', userId: data.userId || ownerId, verwijderdOp: new Date(), door: user.uid, doorNaam: (gezinslid && gezinslid.naam) || user.displayName || user.email || '', ...extra }).catch(e => console.warn('Prullenbak', e));
        return ref.id;
    };
    const bumpStats = (kind, count, value) => ownerDoc().set({
        stats: { [kind]: increment(count), [kind + 'Value']: increment(round2(value || 0)) }
    }, { merge: true }).catch(e => console.warn('Kon statistiek niet opslaan', e));

    const touchLade = (ladeId) => { if (ladeId) db.collection('lades').doc(ladeId).update({ laatstGewijzigd: new Date() }).catch(() => { }); };

    // Bekijk-link: publicShares/{token} wijst naar de eigenaar, zodat iemand zonder account
    // de link kan openen zonder de hele users-collectie te mogen doorzoeken.
    const syncPublicShare = async (addToken, removeToken) => {
        if (!user) return;
        try {
            if (removeToken && removeToken !== addToken) await db.collection('publicShares').doc(removeToken).delete();
            if (addToken) await db.collection('publicShares').doc(addToken).set({ ownerId: user.uid, label: user.displayName || (user.email || '').split('@')[0] || '' });
        } catch (e) { console.warn('Bekijk-link bijwerken mislukt', e); }
    };
    const setMine = (patch) => user && db.collection('users').doc(effUid).set(patch, { merge: true }).catch(e => console.warn(e));

    const actions = {
        notify,
        login: async () => {
            try { await auth.signInWithPopup(new GoogleAuthProvider()); }
            catch (e) { if (e && e.code !== 'auth/popup-closed-by-user') notify('Inloggen mislukt: ' + (e.message || e), 'error'); }
        },
        logout: () => auth.signOut(),
        setMine,
        toggleDark: () => setMine({ darkMode: !(me && me.darkMode) }),

        switchAccount: (id, silent) => switchAccount(id, silent),

        // ----- Producten -----
        async saveItem(values, { editing, times = 1, fromShoppingId } = {}) {
            const lade = derived.ladeById[values.ladeId];
            const loc = derived.locById[values.vriezerId];
            const data = pickItemFields({
                ...values,
                naam: (values.naam || '').trim(),
                aantal: num(values.aantal) > 0 ? round2(num(values.aantal)) : 1,
                minimumVoorraad: values.minimumVoorraad === '' || values.minimumVoorraad == null ? null : Math.max(0, num(values.minimumVoorraad)),
                prijs: values.prijs === '' || values.prijs == null ? null : Math.max(0, round2(num(values.prijs))),
                ladeId: values.ladeId || '',
                ladeNaam: lade ? lade.naam : (values.ladeId && values._ladeNaam) || '',
                notitie: values.notitie || '',
                tags: values.tags || [],
                altijdGoed: !!values.altijdGoed,
                geplandeDatum: values.geplandeDatum || null,
                emoji: values.emoji || emojiForCategory(values.categorie)
            });
            data.userId = ownerId;
            if (!editing && gezinslid) data.toegevoegdDoor = gezinslid.naam;
            // Barcode onthouden, zodat het product de volgende keer meteen herkend wordt.
            if (data.barcode && globalSettings.barcodesDelen !== false) db.collection('barcodes').doc(data.barcode).set({ naam: data.naam, categorie: data.categorie || '', eenheid: data.eenheid || '', emoji: data.emoji || '', ...(data.foto && !data.foto.startsWith('data:') ? { foto: data.foto } : {}), door: user.uid, op: new Date() }).catch(() => { });
            if (data.barcode) ownerDoc().set({ barcodes: { [data.barcode]: { naam: data.naam, categorie: data.categorie || '', eenheid: data.eenheid || '', emoji: data.emoji || '', ...(data.foto && !data.foto.startsWith('data:') ? { foto: data.foto } : {}) } } }, { merge: true }).catch(() => { });
            const where = `${loc ? loc.naam : (values._locNaam || '?')}${data.ladeNaam ? ' › ' + data.ladeNaam : ''}`;
            if (editing) {
                const changes = [];
                if (editing.naam !== data.naam) changes.push(`Naam: ${editing.naam} ➔ ${data.naam}`);
                if (num(editing.aantal) !== data.aantal) changes.push(`Aantal: ${editing.aantal} ➔ ${data.aantal}`);
                if (editing.eenheid !== data.eenheid) changes.push(`Eenheid: ${editing.eenheid} ➔ ${data.eenheid}`);
                if (editing.categorie !== data.categorie) changes.push(`Categorie: ${editing.categorie} ➔ ${data.categorie}`);
                if ((editing.ladeId || '') !== data.ladeId || editing.vriezerId !== data.vriezerId) changes.push(`Plaats ➔ ${where}`);
                if ((editing.notitie || '') !== data.notitie) changes.push('Notitie aangepast');
                if ('foto' in data && (editing.foto || '') !== (data.foto || '')) changes.push(data.foto ? 'Foto aangepast' : 'Foto verwijderd');
                await db.collection('items').doc(editing.id).update(data);
                if (editing.foto && editing.foto !== (data.foto || '')) forget(editing.foto);
                touchLade(data.ladeId);
                if (editing.ladeId && editing.ladeId !== data.ladeId) touchLade(editing.ladeId);
                log('Bewerkt', data.naam, (changes.join(', ') || 'Geen velden gewijzigd') + (values.viaBalans ? ' (via Controle)' : ''), data.vriezerId, null,
                    { soort: 'zet', coll: 'items', id: editing.id, voor: voorVan(editing, Object.keys(data)) });
                notify(`${data.naam} bijgewerkt`);
            } else {
                const n = Math.min(50, Math.max(1, parseInt(times) || 1));
                const refs = await Promise.all(Array.from({ length: n }, () => db.collection('items').add(data)));
                touchLade(data.ladeId);
                log('Toevoegen', data.naam, `${n > 1 ? n + ' losse items' : data.aantal + ' ' + data.eenheid} in ${where}${values.viaBalans ? ' (via Controle)' : ''}`, data.vriezerId, null,
                    { soort: 'weg', coll: 'items', ids: refs.map(r => r.id) });
                notify(n > 1 ? `${n}× ${data.naam} toegevoegd` : `${data.naam} toegevoegd`);
                if (fromShoppingId) db.collection('shoppingList').doc(fromShoppingId).delete().catch(() => { });
            }
        },

        async updateItem(item, patch, logText) {
            await db.collection('items').doc(item.id).update(patch);
            if ('foto' in patch && item.foto && item.foto !== (patch.foto || '')) forget(item.foto);
            touchLade(patch.ladeId || item.ladeId);
            if (logText) log('Bewerkt', item.naam, logText, item.vriezerId, null, { soort: 'zet', coll: 'items', id: item.id, voor: voorVan(item, Object.keys(patch)) });
        },

        // Gebruik een deel van een product. Geeft true terug als het product daarmee op is
        // (dan moet de UI de verwijder-dialoog tonen).
        // reason: 'consumed' (opgegeten) | 'wasted' (weggegooid) | 'other' (foutje/anders, telt niet mee)
        async consume(item, amount, reason = 'consumed') {
            const current = num(item.aantal, 1);
            amount = Math.min(num(amount), current);
            if (amount <= 0) return false;
            if (amount >= current) return true;
            const newAantal = round2(current - amount);
            const prijs = num(item.prijs);
            const usedValue = prijs * (amount / current);
            await db.collection('items').doc(item.id).update({ aantal: newAantal, prijs: item.prijs == null ? null : round2(prijs - usedValue) });
            if (reason !== 'other') bumpStats(reason, 1, usedValue);
            const verb = reason === 'wasted' ? 'weggegooid' : reason === 'other' ? 'afgetrokken' : 'gebruikt';
            log(reason === 'consumed' ? 'Geconsumeerd' : 'Bewerkt', item.naam, `- ${amount} ${item.eenheid}${reason === 'wasted' ? ' (weggegooid)' : reason === 'other' ? ' (foutje/anders)' : ''}`, item.vriezerId, null, { soort: 'zet', coll: 'items', id: item.id, voor: voorVan(item, ['aantal', 'prijs']) });
            notify(`${formatAantal(amount)} ${item.eenheid} ${item.naam} ${verb}`, 'success', {
                label: 'Ongedaan',
                fn: async () => {
                    await db.collection('items').doc(item.id).update({ aantal: current, prijs: item.prijs == null ? null : prijs });
                    if (reason !== 'other') bumpStats(reason, -1, -usedValue);
                    log('Bewerkt', item.naam, 'Ongedaan gemaakt', item.vriezerId);
                }
            });
            actions.checkMinimum({ ...item, aantal: newAantal });
            return false;
        },

        // Product verwijderen met reden: 'consumed' | 'wasted' | 'other'
        async removeItem(item, reason, shoppingOpt) {
            const { id, ...data } = item;
            await db.collection('items').doc(id).delete();
            const trash = toTrash('items', item, item.naam, { reden: reason || 'verwijderd' });
            if (item.foto) forget(item.foto, 60000); // ruim na 'Ongedaan' nog op
            const value = num(item.prijs);
            if (reason === 'consumed') bumpStats('consumed', 1, value);
            if (reason === 'wasted') bumpStats('wasted', 1, value);
            touchLade(item.ladeId);
            log('Verwijderd', item.naam, reason === 'consumed' ? 'Opgegeten' : reason === 'wasted' ? 'Weggegooid (verspild)' : 'Verwijderd', item.vriezerId, null, trash ? { soort: 'terug', trash } : null);
            let shopRef = null;
            if (shoppingOpt) {
                shopRef = await db.collection('shoppingList').add({
                    naam: item.naam, aantal: num(shoppingOpt.aantal, 1) || 1, eenheid: item.eenheid || 'stuks',
                    winkel: shoppingOpt.winkel || '', checked: false, userId: ownerId
                });
            }
            notify(shopRef ? `${item.naam} verwijderd en op je lijstje gezet` : `${item.naam} verwijderd`, 'success', {
                label: 'Ongedaan',
                fn: async () => {
                    await db.collection('items').doc(id).set(data);
                    if (trash) db.collection('prullenbak').doc(trash).delete().catch(() => { });
                    if (reason === 'consumed') bumpStats('consumed', -1, -value);
                    if (reason === 'wasted') bumpStats('wasted', -1, -value);
                    if (shopRef) shopRef.delete().catch(() => { });
                    log('Toevoegen', item.naam, 'Verwijderen ongedaan gemaakt', item.vriezerId);
                }
            });
        },

        async deleteItems(ids) {
            const list = derived.items.filter(i => ids.includes(i.id));
            await runBatched(list.map(i => b => b.delete(db.collection('items').doc(i.id))));
            list.forEach(i => { const trash = toTrash('items', i, i.naam); log('Verwijderd', i.naam, 'Via selectie', i.vriezerId, null, trash ? { soort: 'terug', trash } : null); });
            notify(`${list.length} producten verwijderd`);
        },

        async moveItems(ids, vriezerId, ladeId) {
            const lade = derived.ladeById[ladeId];
            const loc = derived.locById[vriezerId];
            await runBatched(ids.map(id => b => b.update(db.collection('items').doc(id), { vriezerId, ladeId: ladeId || '', ladeNaam: lade ? lade.naam : '' })));
            touchLade(ladeId);
            derived.items.filter(i => ids.includes(i.id)).forEach(i => log('Bewerkt', i.naam, `Verplaatst naar ${loc ? loc.naam : '?'}${lade ? ' › ' + lade.naam : ''}`, vriezerId, null,
                { soort: 'zet', coll: 'items', id: i.id, voor: voorVan(i, ['vriezerId', 'ladeId', 'ladeNaam']) }));
            notify(ids.length === 1 ? 'Verplaatst' : `${ids.length} producten verplaatst`);
        },

        planItem: (item, key) => {
            log('Menu', item.naam, key ? `Ingepland op ${key}` : 'Van het menu gehaald', item.vriezerId);
            return db.collection('items').doc(item.id).update({ geplandeDatum: key || null });
        },
        addMenuEntry: (key, naam, extra = {}) => {
            log('Menu', naam.trim(), `Op het menu gezet voor ${key}`);
            return db.collection('items').add({
                naam: naam.trim(), aantal: 1, eenheid: 'stuks', vriezerId: MENU_LOCATION_ID, ladeId: '', categorie: 'Menu',
                emoji: extra.emoji || '🍽️', geplandeDatum: key, ingevrorenOp: todayKey(), userId: ownerId, ...(extra.receptId ? { receptId: extra.receptId } : {})
            });
        },
        unplan: (entry) => {
            log('Menu', entry.naam, `Van het menu gehaald${entry.geplandeDatum ? ' (' + entry.geplandeDatum + ')' : ''}`);
            return isMenuEntry(entry)
                ? db.collection('items').doc(entry.id).delete()
                : db.collection('items').doc(entry.id).update({ geplandeDatum: null });
        },

        // Zet een product op de boodschappenlijst als het onder het minimum zakt.
        async checkMinimum(item) {
            const min = num(item.minimumVoorraad);
            if (!min) return;
            const totaal = derived.items.filter(i => normalize(i.naam) === normalize(item.naam) && i.id !== item.id).reduce((s, i) => s + num(i.aantal), 0) + num(item.aantal);
            if (totaal >= min) return;
            if (shopping.some(s => !s.checked && normalize(s.naam) === normalize(item.naam))) return;
            await db.collection('shoppingList').add({ naam: item.naam, aantal: round2(min - totaal) || 1, eenheid: item.eenheid || 'stuks', winkel: '', checked: false, userId: ownerId });
            log('Lijst', item.naam, `Automatisch op het lijstje (onder minimum ${min})`);
            notify(`${item.naam} staat op je boodschappenlijst`, 'info');
        },

        // ----- Boodschappen -----
        addShopping: (s) => {
            const aantal = num(s.aantal, 1) > 0 ? round2(num(s.aantal, 1)) : 1;
            const ref = db.collection('shoppingList').doc();
            log('Lijst', s.naam.trim(), `Op het lijstje gezet (${formatAantal(aantal)} ${s.eenheid || 'stuks'}${s.winkel ? ', ' + s.winkel : ''})`, null, null, { soort: 'weg', coll: 'shoppingList', ids: [ref.id] });
            return ref.set({ naam: s.naam.trim(), aantal, eenheid: s.eenheid || 'stuks', winkel: s.winkel || '', checked: false, userId: ownerId }).then(() => ref);
        },
        updateShopping: (s, patch) => {
            const d = [];
            if ('naam' in patch && patch.naam !== s.naam) d.push(`naam ➔ ${patch.naam}`);
            if ('aantal' in patch && num(patch.aantal) !== num(s.aantal)) d.push(`aantal ${formatAantal(s.aantal)} ➔ ${formatAantal(patch.aantal)}`);
            if ('winkel' in patch && (patch.winkel || '') !== (s.winkel || '')) d.push(`winkel ➔ ${patch.winkel || 'geen'}`);
            if (d.length) log('Lijst', s.naam, 'Aangepast: ' + d.join(', '), null, null, { soort: 'zet', coll: 'shoppingList', id: s.id, voor: voorVan(s, Object.keys(patch)) });
            return db.collection('shoppingList').doc(s.id).update(patch);
        },
        toggleShopping: (s) => {
            log('Lijst', s.naam, s.checked ? 'Terug op het lijstje' : 'Afgevinkt (gekocht)', null, null, { soort: 'zet', coll: 'shoppingList', id: s.id, voor: { checked: !!s.checked } });
            return db.collection('shoppingList').doc(s.id).update({ checked: !s.checked });
        },
        deleteShopping: (s) => { const trash = toTrash('shoppingList', s, s.naam); log('Lijst', s.naam, 'Van het lijstje gehaald', null, null, trash ? { soort: 'terug', trash } : null); return db.collection('shoppingList').doc(s.id).delete(); },
        async clearCheckedShopping() {
            const done = shopping.filter(s => s.checked);
            await runBatched(done.map(s => b => b.delete(db.collection('shoppingList').doc(s.id))));
            if (done.length) log('Lijst', done.map(s => s.naam).join(', '), `${done.length} afgevinkte items opgeruimd`);
            notify(`${done.length} afgevinkte items opgeruimd`);
        },

        // ----- Locaties & lades -----
        async addLocatie({ naam, type, color = 'blue', locatieGroep = 'Thuis' }) {
            const order = vriezers.filter(v => v.type === type).length;
            const ref = await db.collection('vriezers').add({ naam: naam.trim(), type, userId: ownerId, color, order, locatieGroep });
            log('Locatie', naam.trim(), 'Nieuwe locatie aangemaakt', ref.id, null, { soort: 'weg', coll: 'vriezers', ids: [ref.id] });
            return ref.id;
        },
        updateLocatie: (loc, patch) => {
            const d = [];
            if ('naam' in patch && patch.naam !== loc.naam) d.push(`hernoemd naar ${patch.naam}`);
            if ('color' in patch && patch.color !== loc.color) d.push('andere kleur');
            if ('locatieGroep' in patch && patch.locatieGroep !== loc.locatieGroep) d.push(`groep ➔ ${patch.locatieGroep}`);
            if ('type' in patch && patch.type !== loc.type) d.push(`soort ➔ ${patch.type}`);
            if (d.length) log('Locatie', loc.naam, d.join(', '), loc.id, null, { soort: 'zet', coll: 'vriezers', id: loc.id, voor: voorVan(loc, Object.keys(patch)) });
            return db.collection('vriezers').doc(loc.id).update(patch);
        },
        async deleteLocatie(loc) {
            if (lades.some(l => l.vriezerId === loc.id) || derived.items.some(i => i.vriezerId === loc.id)) {
                notify('Maak deze locatie eerst leeg (lades en producten).', 'error'); return false;
            }
            await db.collection('vriezers').doc(loc.id).delete();
            const trash = toTrash('vriezers', loc, loc.naam);
            log('Locatie', loc.naam, 'Locatie verwijderd', loc.id, null, trash ? { soort: 'terug', trash } : null);
            return true;
        },
        reorderLocaties: (list) => runBatched(list.map((l, i) => b => b.update(db.collection('vriezers').doc(l.id), { order: i }))),
        async addLade(vriezerId, naam) {
            const ref = await db.collection('lades').add({ naam: naam.trim(), vriezerId, userId: ownerId });
            log('Lade', naam.trim(), `Nieuwe lade in ${(derived.locById[vriezerId] || {}).naam || '?'}`, vriezerId, null, { soort: 'weg', coll: 'lades', ids: [ref.id] });
            return ref.id;
        },
        async renameLade(lade, naam) {
            naam = naam.trim(); if (!naam) return;
            await db.collection('lades').doc(lade.id).update({ naam });
            if (naam !== lade.naam) log('Lade', naam, `Hernoemd (was ${lade.naam})`, lade.vriezerId, null, { soort: 'zet', coll: 'lades', id: lade.id, voor: { naam: lade.naam } });
            const list = derived.items.filter(i => i.ladeId === lade.id);
            await runBatched(list.map(i => b => b.update(db.collection('items').doc(i.id), { ladeNaam: naam })));
        },
        // Tellers om te zien welke onderdelen gebruikt worden (beheerpagina → Inzicht)
        setGezinslid(id) {
            setGezinslidId(id || '');
            try { id ? localStorage.setItem('voorraad_gezinslid', id) : localStorage.removeItem('voorraad_gezinslid'); } catch (e) { }
        },
        track(key) { if (user) db.collection('users').doc(user.uid).set({ gebruik: { [key]: increment(1) } }, { merge: true }).catch(() => { }); },
        // Geblokkeerde of tijdens onderhoud geweigerde poging bijhouden (één keer per sessie)
        logBlocked(reden) {
            if (!user) return;
            const k = 'voorraad_blok_' + reden;
            try { if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, '1'); } catch (e) { }
            db.collection('blockedAttempts').add({ uid: user.uid, email: user.email || '', naam: user.displayName || '', reden, op: new Date() }).catch(() => { });
        },
        async setLadeFoto(lade, foto) {
            await db.collection('lades').doc(lade.id).update({ foto: foto || '' });
            if (lade.foto && lade.foto !== (foto || '')) forget(lade.foto);
            log('Lade', lade.naam, foto ? (lade.foto ? 'Andere foto' : 'Foto toegevoegd') : 'Foto verwijderd', lade.vriezerId);
            notify(foto ? 'Foto van de lade bewaard' : 'Foto verwijderd');
        },
        async deleteLade(lade) {
            if (derived.items.some(i => i.ladeId === lade.id)) { notify('Maak deze lade eerst leeg.', 'error'); return false; }
            await db.collection('lades').doc(lade.id).delete();
            const trash = toTrash('lades', lade, lade.naam);
            log('Lade', lade.naam, 'Lade verwijderd', lade.vriezerId, null, trash ? { soort: 'terug', trash } : null);
            return true;
        },

        // ----- Categorieën & eenheden (in users-document van de beheerde voorraad) -----
        setCategories: (list) => {
            const oud = (owner.customCategories || []).map(c => c.name), nieuw = list.map(c => c.name);
            const bij = nieuw.filter(n => !oud.includes(n)), weg = oud.filter(n => !nieuw.includes(n));
            log('Instellingen', 'Categorieën', [bij.length && 'toegevoegd: ' + bij.join(', '), weg.length && 'verwijderd: ' + weg.join(', ')].filter(Boolean).join(' · ') || 'Volgorde of kleur aangepast');
            return ownerDoc().set({ customCategories: list.map(c => ({ name: c.name, color: c.color || 'gray' })) }, { merge: true });
        },
        async renameCategory(list, oldName, newName, color) {
            log('Instellingen', 'Categorie ' + oldName, oldName !== newName ? `Hernoemd naar ${newName}` : 'Andere kleur');
            const updated = list.map(c => c.name === oldName ? { name: newName, color } : c);
            await ownerDoc().set({ customCategories: updated }, { merge: true });
            if (oldName !== newName) {
                const its = derived.items.filter(i => i.categorie === oldName);
                await runBatched(its.map(i => b => b.update(db.collection('items').doc(i.id), { categorie: newName })));
            }
        },
        setUnits: (type, list) => {
            log('Instellingen', 'Eenheden', `Eenheden voor ${type}: ${list.join(', ')}`);
            return ownerDoc().set({ [UNIT_FIELD[type]]: list }, { merge: true });
        },
        async renameUnit(type, list, oldName, newName) {
            log('Instellingen', 'Eenheid ' + oldName, `Hernoemd naar ${newName}`);
            await ownerDoc().set({ [UNIT_FIELD[type]]: list.map(u => u === oldName ? newName : u) }, { merge: true });
            const its = derived.items.filter(i => i.eenheid === oldName && derived.typeOf(i) === type);
            await runBatched(its.map(i => b => b.update(db.collection('items').doc(i.id), { eenheid: newName })));
        },

        // ----- Bekijken als een gebruiker (enkel beheerders) -----
        async startAls(u) {
            if (!isAdmin || !u) return;
            try { sessionStorage.setItem('voorraad_als', u.id); } catch (e) { }
            setAlsId(u.id);
            await switchAccount(u.id, true);
            notify(`Je bekijkt de app nu als ${u.displayName || u.email}`);
        },
        async stopAls() {
            try { sessionStorage.removeItem('voorraad_als'); } catch (e) { }
            setAlsId('');
            await switchAccount(user.uid, true);
        },

        // ----- Prullenbak & ongedaan maken -----
        async restoreTrash(t) {
            if (t.coll === 'lades' && t.data && t.data.vriezerId) {
                const loc = await db.collection('vriezers').doc(t.data.vriezerId).get().catch(() => null);
                if (!loc || !loc.exists) { notify('De locatie van deze lade bestaat niet meer. Zet eerst de locatie terug.', 'error'); return false; }
            }
            await db.collection(t.coll).doc(t.docId).set(t.data);
            await db.collection('prullenbak').doc(t.id).delete();
            // De verwijder-regel in het logboek is daarmee ook 'ongedaan'
            if (isAdmin) db.collection('logs').where('undo.trash', '==', t.id).get().then(s => s.docs.forEach(d => d.ref.update({ ongedaan: { op: new Date(), door: user.uid } }))).catch(() => { });
            log(t.coll === 'items' ? 'Toevoegen' : t.coll === 'shoppingList' ? 'Lijst' : t.coll === 'recepten' ? 'Recept' : t.coll === 'lades' ? 'Lade' : 'Locatie',
                t.naam, 'Teruggezet uit de prullenbak', t.coll === 'vriezers' ? t.docId : t.data.vriezerId, t.userId);
            notify(`${t.naam || 'Item'} teruggezet`);
            return true;
        },
        deleteTrash: (t) => db.collection('prullenbak').doc(t.id).delete(),
        async undoLog(l) {
            const u = l.undo; if (!u) return false;
            try {
                if (u.soort === 'weg') {
                    // Een locatie of lade die intussen gevuld is, niet zomaar weghalen.
                    if (u.coll === 'vriezers' || u.coll === 'lades') {
                        const veld = u.coll === 'vriezers' ? 'vriezerId' : 'ladeId';
                        for (const id of u.ids || []) {
                            const vol = await db.collection('items').where(veld, '==', id).limit(1).get();
                            if (!vol.empty) { notify(`Er ${u.coll === 'vriezers' ? 'liggen nog producten in deze locatie' : 'liggen nog producten in deze lade'}. Verplaats of verwijder die eerst.`, 'error'); return false; }
                        }
                    }
                    for (const id of u.ids || []) {
                        const d = await db.collection(u.coll).doc(id).get();
                        if (d.exists) { toTrash(u.coll, { id, ...d.data() }, d.data().naam); await d.ref.delete(); }
                    }
                } else if (u.soort === 'zet') {
                    const d = await db.collection(u.coll).doc(u.id).get();
                    if (!d.exists) { notify('Dit bestaat niet meer, ongedaan maken lukt niet.', 'error'); return false; }
                    await d.ref.update(u.voor);
                } else if (u.soort === 'terug') {
                    const t = await db.collection('prullenbak').doc(u.trash).get();
                    if (!t.exists) { notify('Dit staat niet meer in de prullenbak (ouder dan 30 dagen of al teruggezet).', 'error'); return false; }
                    if (!(await actions.restoreTrash({ id: t.id, ...t.data() }))) return false;
                }
                await db.collection('logs').doc(l.id).update({ ongedaan: { op: new Date(), door: user.uid } });
                if (u.soort !== 'terug') log('Bewerkt', l.item, `Ongedaan gemaakt via logboek: ${l.details || l.action}`, l.locId, l.targetUserId);
                notify('Ongedaan gemaakt');
                return true;
            } catch (e) { notify('Ongedaan maken mislukt: ' + e.message, 'error'); return false; }
        },

        // ----- Recepten -----
        async saveRecipe(data, id) {
            const clean = {
                naam: data.naam.trim(), fotoUrl: (data.fotoUrl || '').trim(), personen: Math.max(1, parseInt(data.personen) || 4),
                categorie: data.categorie || 'Hoofdgerecht',
                ingredienten: (data.ingredienten || []).filter(i => (i.naam || '').trim()).map(i => ({ naam: i.naam.trim(), aantal: i.aantal === '' ? '' : num(i.aantal, ''), eenheid: i.eenheid || 'stuks' })),
                stappen: (data.stappen || []).map(s => s.trim()).filter(Boolean)
            };
            const oud = id ? recepten.find(r => r.id === id) : null;
            let nieuwId = id;
            if (id) await db.collection('recepten').doc(id).update(clean);
            else nieuwId = (await db.collection('recepten').add({ ...clean, userId: ownerId })).id;
            log('Recept', clean.naam, id ? 'Recept aangepast' : `Nieuw recept (${clean.ingredienten.length} ingrediënten)`, null, null,
                id ? (oud ? { soort: 'zet', coll: 'recepten', id, voor: voorVan(oud, Object.keys(clean)) } : null) : { soort: 'weg', coll: 'recepten', ids: [nieuwId] });
            notify(id ? 'Recept bijgewerkt' : 'Recept opgeslagen');
        },
        deleteRecipe: (r) => { const trash = toTrash('recepten', r, r.naam); log('Recept', r.naam, 'Recept verwijderd', null, null, trash ? { soort: 'terug', trash } : null); return db.collection('recepten').doc(r.id).delete(); },

        // ----- Controle (balans) -----
        async finishAudit(lade, deleteIds, changes = []) {
            const list = derived.items.filter(i => deleteIds.includes(i.id));
            const upd = changes.filter(c => !deleteIds.includes(c.item.id));
            await runBatched([
                ...list.map(i => b => b.delete(db.collection('items').doc(i.id))),
                ...upd.map(c => b => b.update(db.collection('items').doc(c.item.id), { aantal: c.aantal }))
            ]);
            list.forEach(i => { const trash = toTrash('items', i, i.naam); log('Verwijderd', i.naam, 'Ligt niet meer in lade (via Controle)', i.vriezerId, null, trash ? { soort: 'terug', trash } : null); });
            log('Lade', lade.naam, `Gecontroleerd${list.length || upd.length ? ` (${list.length} weg, ${upd.length} aangepast)` : ', alles klopte'}`, lade.vriezerId);
            upd.forEach(c => log('Bewerkt', c.item.naam, `Aantal: ${c.item.aantal} ➔ ${c.aantal} (via Controle)`, c.item.vriezerId, null, { soort: 'zet', coll: 'items', id: c.item.id, voor: { aantal: c.item.aantal } }));
            await db.collection('lades').doc(lade.id).update({ laatstGecontroleerd: new Date(), laatstGewijzigd: new Date() }).catch(() => { });
            notify(`${lade.naam} gecontroleerd`);
        },

        // ----- Delen -----
        async invite(emailRaw) {
            const email = emailRaw.trim().toLowerCase();
            if (!email) return;
            if (email === (user.email || '').toLowerCase()) { notify('Je kan jezelf niet uitnodigen.', 'error'); return; }
            if (outgoingShares.some(s => s.sharedWithEmail === email && s.status !== 'declined')) { notify('Deze persoon is al uitgenodigd of heeft al toegang.', 'error'); return; }
            await db.collection('shares').add({ ownerId: user.uid, ownerEmail: user.email, sharedWithEmail: email, role: 'editor', status: 'pending', createdAt: new Date().toISOString() });
            log('Delen', email, 'Uitgenodigd om samen te beheren', null, user.uid);
            notify('Uitnodiging verstuurd');
            return true;
        },
        async acceptInvite(s) {
            await db.collection('shares').doc(s.id).update({ status: 'accepted', acceptedAt: new Date().toISOString(), acceptedUid: user.uid });
            await db.collection('toegang').doc(`${s.ownerId}_${user.uid}`).set({ ownerId: s.ownerId, uid: user.uid, shareId: s.id, email: (user.email || '').toLowerCase() }).catch(e => console.warn(e));
            accessDone.current.add(s.id);
            await switchAccount(s.ownerId, true);
            log('Delen', user.email || '', `Uitnodiging aanvaard van ${s.ownerEmail}`, null, s.ownerId);
            notify(`Je beheert nu ook de voorraad van ${s.ownerEmail}`);
        },
        declineInvite: (s) => { log('Delen', user.email || '', `Uitnodiging geweigerd van ${s.ownerEmail}`, null, user.uid); return db.collection('shares').doc(s.id).update({ status: 'declined' }); },
        async revokeShare(s) {
            await db.collection('shares').doc(s.id).delete();
            if (s.acceptedUid) db.collection('toegang').doc(`${s.ownerId}_${s.acceptedUid}`).delete().catch(() => { });
            log('Delen', s.sharedWithEmail, 'Toegang ingetrokken', null, user.uid);
            notify('Toegang ingetrokken');
        },
        async togglePublicLink() {
            const token = (me && me.publicShareToken) || randomToken();
            const enabled = !(me && me.publicShareEnabled);
            await setMine({ publicShareToken: token, publicShareEnabled: enabled });
            await syncPublicShare(enabled ? token : null, enabled ? null : token);
            log('Delen', 'Bekijk-link', enabled ? 'Bekijk-link aangezet' : 'Bekijk-link uitgezet', null, user.uid);
        },
        async regeneratePublicLink() {
            const old = me && me.publicShareToken;
            const token = randomToken();
            await setMine({ publicShareToken: token });
            await syncPublicShare(me && me.publicShareEnabled ? token : null, old);
            notify('Nieuwe link gemaakt. De oude werkt niet meer.');
        },

        // ----- Admin -----
        setUserField: (uid, patch) => db.collection('users').doc(uid).set(patch, { merge: true }),
        setGlobal: (docName, patch) => db.collection('settings').doc(docName).set(patch, { merge: true }),
        async resetTourForEveryone() {
            const snap = await db.collection('users').get();
            await runBatched(snap.docs.map(d => b => b.update(d.ref, { hasSeenTutorial: false })));
            notify('Rondleiding gereset voor iedereen');
        },
        log
    };

    async function switchAccount(id, silent) {
        if (!user || !id) return;
        // Al op deze voorraad: niets leegmaken, anders blijft het scherm leeg
        // (de listeners starten dan niet opnieuw omdat ownerId niet verandert).
        if (id === ownerId) {
            if (!silent) notify(id === user.uid ? 'Je bekijkt je eigen voorraad' : 'Je bekijkt deze voorraad al');
            return;
        }
        setOwnerId(id);
        setVriezers([]); setLades([]); setAllItems([]); setShopping([]); setRecepten([]);
        await db.collection('users').doc(user.uid).set({ activeBeheerdeUserId: id }, { merge: true }).catch(() => { });
        if (!silent) notify(id === user.uid ? 'Terug naar je eigen voorraad' : 'Gewisseld van voorraad');
    }

    // Lijst met voorraden waar je naartoe kan wisselen.
    const accounts = useMemo(() => {
        if (!user) return [];
        if (als) {
            const l = [{ id: als.id, label: 'Mijn voorraad', email: als.email }];
            alsShares.filter(s => s.status === 'accepted').forEach(s => { if (!l.some(a => a.id === s.ownerId)) l.push({ id: s.ownerId, label: s.ownerEmail, email: s.ownerEmail }); });
            return l;
        }
        const list = [{ id: user.uid, label: 'Mijn voorraad', email: user.email }];
        incomingShares.filter(s => s.status === 'accepted').forEach(s => {
            if (!list.some(a => a.id === s.ownerId)) list.push({ id: s.ownerId, label: s.ownerEmail, email: s.ownerEmail });
        });
        if (isAdmin && ownerId && !list.some(a => a.id === ownerId)) {
            const u = usersList.find(x => x.id === ownerId);
            list.push({ id: ownerId, label: (u && (u.email || u.displayName)) || 'Ander account', email: u && u.email, viaAdmin: true });
        }
        return list;
    }, [user, incomingShares, isAdmin, ownerId, usersList, als && als.id, alsShares]);

    const value = {
        authState, user, me: effMe || {}, meLoaded: me !== null, isAdmin: isAdmin && !als, echteAdmin: isAdmin, als, ownerId, owner, isOwnAccount, accounts,
        vriezers, lades, allItems, shopping, recepten, incomingShares: als ? alsShares.filter(s => s.status === 'accepted') : incomingShares, outgoingShares: als ? [] : outgoingShares, usersList, globalSettings,
        ...derived, dataLoaded, loaded, hiddenTabs, canSee, stats, gezinsleden, gezinslid,
        opVakantie: !!(effMe && effMe.vakantieTot && effMe.vakantieTot >= todayKey()),
        toast, setToast, actions
    };
    return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}
