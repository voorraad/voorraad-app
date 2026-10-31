import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { db, auth, GoogleAuthProvider, serverTimestamp, increment, runBatched } from '../lib/firebase.js';
import { CATEGORIEEN_VRIES, DEFAULT_TOUR_STEPS, MENU_LOCATION_ID, UNIT_FIELD } from '../lib/constants.js';
import { isMenuEntry, num, round2, randomToken, sortLocaties, todayKey, emojiForCategory, normalize } from '../lib/utils.js';

const StoreCtx = createContext(null);
export const useStore = () => useContext(StoreCtx);

const mapDocs = (snap) => snap.docs.map(d => ({ id: d.id, ...d.data() }));

// Alleen deze velden horen bij een product (voorkomt dat formulier-hulpvelden in Firestore belanden).
const ITEM_FIELDS = ['naam', 'aantal', 'eenheid', 'vriezerId', 'ladeId', 'ladeNaam', 'categorie', 'minimumVoorraad', 'prijs',
    'ingevrorenOp', 'houdbaarheidsDatum', 'notitie', 'emoji', 'geplandeDatum', 'tags', 'altijdGoed'];
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
                        stats: { wasted: 0, consumed: 0, wastedValue: 0, consumedValue: 0 }, email: u.email || ''
                    };
                    db.collection('users').doc(u.uid).set(init, { merge: true }).catch(() => { });
                    setMe(init);
                }
            }, () => setMe(m => m || {}));
            setAuthState('in');
        });
        return () => { unsub(); if (meUnsub.current) meUnsub.current(); };
    }, []);

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

    // Users-document van de beheerde voorraad
    useEffect(() => {
        if (!ownerId) return;
        return db.collection('users').doc(ownerId).onSnapshot(doc => setOwner(doc.exists ? doc.data() : {}), () => setOwner({}));
    }, [ownerId]);

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
    }, [ownerId]);

    // Globale instellingen (tour, onderhoud)
    useEffect(() => {
        const s = db.collection('settings');
        const subs = [
            s.doc('onboarding').onSnapshot(d => setGlobalSettings(g => ({ ...g, onboardingLoaded: true, onboardingActive: d.exists ? d.data().isActive !== false : true })), () => setGlobalSettings(g => ({ ...g, onboardingLoaded: true }))),
            s.doc('tourSteps').onSnapshot(d => { if (d.exists && Array.isArray(d.data().steps) && d.data().steps.length) setGlobalSettings(g => ({ ...g, tourSteps: d.data().steps })); }, () => { }),
            s.doc('maintenance').onSnapshot(d => setGlobalSettings(g => ({ ...g, maintenance: d.exists && d.data().active === true })), () => { })
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
    const hiddenTabs = (me && me.hiddenTabs) || [];
    const canSee = (tab) => isAdmin || !hiddenTabs.includes(tab);
    const stats = { wasted: 0, consumed: 0, wastedValue: 0, consumedValue: 0, ...(owner.stats || {}) };
    const isOwnAccount = user && ownerId === user.uid;

    // ---------- Acties ----------
    const ownerDoc = () => db.collection('users').doc(ownerId);

    const log = (action, itemNaam, details) => {
        if (!user) return;
        db.collection('logs').add({
            action, item: itemNaam || '', details: details || '', actorId: user.uid,
            actorName: user.displayName || user.email || '', targetUserId: ownerId, timestamp: serverTimestamp()
        }).catch(e => console.warn('Kon log niet opslaan', e));
    };
    const bumpStats = (kind, count, value) => ownerDoc().set({
        stats: { [kind]: increment(count), [kind + 'Value']: increment(round2(value || 0)) }
    }, { merge: true }).catch(e => console.warn('Kon statistiek niet opslaan', e));

    const touchLade = (ladeId) => { if (ladeId) db.collection('lades').doc(ladeId).update({ laatstGewijzigd: new Date() }).catch(() => { }); };

    const setMine = (patch) => user && db.collection('users').doc(user.uid).set(patch, { merge: true }).catch(e => console.warn(e));

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
            const where = `${loc ? loc.naam : (values._locNaam || '?')}${data.ladeNaam ? ' › ' + data.ladeNaam : ''}`;
            if (editing) {
                const changes = [];
                if (editing.naam !== data.naam) changes.push(`Naam: ${editing.naam} ➔ ${data.naam}`);
                if (num(editing.aantal) !== data.aantal) changes.push(`Aantal: ${editing.aantal} ➔ ${data.aantal}`);
                if (editing.eenheid !== data.eenheid) changes.push(`Eenheid: ${editing.eenheid} ➔ ${data.eenheid}`);
                if (editing.categorie !== data.categorie) changes.push(`Categorie: ${editing.categorie} ➔ ${data.categorie}`);
                if ((editing.ladeId || '') !== data.ladeId || editing.vriezerId !== data.vriezerId) changes.push(`Plaats ➔ ${where}`);
                if ((editing.notitie || '') !== data.notitie) changes.push('Notitie aangepast');
                await db.collection('items').doc(editing.id).update(data);
                touchLade(data.ladeId);
                if (editing.ladeId && editing.ladeId !== data.ladeId) touchLade(editing.ladeId);
                log('Bewerkt', data.naam, (changes.join(', ') || 'Geen velden gewijzigd') + (values.viaBalans ? ' (via Controle)' : ''));
                notify(`${data.naam} bijgewerkt`);
            } else {
                const n = Math.min(50, Math.max(1, parseInt(times) || 1));
                await Promise.all(Array.from({ length: n }, () => db.collection('items').add(data)));
                touchLade(data.ladeId);
                log('Toevoegen', data.naam, `${n > 1 ? n + ' losse items' : data.aantal + ' ' + data.eenheid} in ${where}${values.viaBalans ? ' (via Controle)' : ''}`);
                notify(n > 1 ? `${n}× ${data.naam} toegevoegd` : `${data.naam} toegevoegd`);
                if (fromShoppingId) db.collection('shoppingList').doc(fromShoppingId).delete().catch(() => { });
            }
        },

        async updateItem(item, patch, logText) {
            await db.collection('items').doc(item.id).update(patch);
            touchLade(patch.ladeId || item.ladeId);
            if (logText) log('Bewerkt', item.naam, logText);
        },

        // Gebruik een deel van een product. Geeft true terug als het product daarmee op is
        // (dan moet de UI de verwijder-dialoog tonen).
        async consume(item, amount) {
            const current = num(item.aantal, 1);
            amount = Math.min(num(amount), current);
            if (amount <= 0) return false;
            if (amount >= current) return true;
            const newAantal = round2(current - amount);
            const prijs = num(item.prijs);
            const usedValue = prijs * (amount / current);
            await db.collection('items').doc(item.id).update({ aantal: newAantal, prijs: item.prijs == null ? null : round2(prijs - usedValue) });
            bumpStats('consumed', 1, usedValue);
            log('Geconsumeerd', item.naam, `- ${amount} ${item.eenheid}`);
            notify(`${amount} ${item.eenheid} ${item.naam} gebruikt`, 'success', {
                label: 'Ongedaan',
                fn: async () => {
                    await db.collection('items').doc(item.id).update({ aantal: current, prijs: item.prijs == null ? null : prijs });
                    bumpStats('consumed', -1, -usedValue);
                    log('Bewerkt', item.naam, 'Gebruik ongedaan gemaakt');
                }
            });
            actions.checkMinimum({ ...item, aantal: newAantal });
            return false;
        },

        // Product verwijderen met reden: 'consumed' | 'wasted' | 'other'
        async removeItem(item, reason, shoppingOpt) {
            const { id, ...data } = item;
            await db.collection('items').doc(id).delete();
            const value = num(item.prijs);
            if (reason === 'consumed') bumpStats('consumed', 1, value);
            if (reason === 'wasted') bumpStats('wasted', 1, value);
            touchLade(item.ladeId);
            log('Verwijderd', item.naam, reason === 'consumed' ? 'Opgegeten' : reason === 'wasted' ? 'Weggegooid (verspild)' : 'Verwijderd');
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
                    if (reason === 'consumed') bumpStats('consumed', -1, -value);
                    if (reason === 'wasted') bumpStats('wasted', -1, -value);
                    if (shopRef) shopRef.delete().catch(() => { });
                    log('Toevoegen', item.naam, 'Verwijderen ongedaan gemaakt');
                }
            });
        },

        async deleteItems(ids) {
            const list = derived.items.filter(i => ids.includes(i.id));
            await runBatched(list.map(i => b => b.delete(db.collection('items').doc(i.id))));
            list.forEach(i => log('Verwijderd', i.naam, 'Via selectie'));
            notify(`${list.length} producten verwijderd`);
        },

        async moveItems(ids, vriezerId, ladeId) {
            const lade = derived.ladeById[ladeId];
            const loc = derived.locById[vriezerId];
            await runBatched(ids.map(id => b => b.update(db.collection('items').doc(id), { vriezerId, ladeId: ladeId || '', ladeNaam: lade ? lade.naam : '' })));
            touchLade(ladeId);
            derived.items.filter(i => ids.includes(i.id)).forEach(i => log('Bewerkt', i.naam, `Verplaatst naar ${loc ? loc.naam : '?'}${lade ? ' › ' + lade.naam : ''}`));
            notify(ids.length === 1 ? 'Verplaatst' : `${ids.length} producten verplaatst`);
        },

        planItem: (item, key) => db.collection('items').doc(item.id).update({ geplandeDatum: key || null }),
        addMenuEntry: (key, naam, extra = {}) => db.collection('items').add({
            naam: naam.trim(), aantal: 1, eenheid: 'stuks', vriezerId: MENU_LOCATION_ID, ladeId: '', categorie: 'Menu',
            emoji: extra.emoji || '🍽️', geplandeDatum: key, ingevrorenOp: todayKey(), userId: ownerId, ...(extra.receptId ? { receptId: extra.receptId } : {})
        }),
        unplan: (entry) => isMenuEntry(entry)
            ? db.collection('items').doc(entry.id).delete()
            : db.collection('items').doc(entry.id).update({ geplandeDatum: null }),

        // Zet een product op de boodschappenlijst als het onder het minimum zakt.
        async checkMinimum(item) {
            const min = num(item.minimumVoorraad);
            if (!min) return;
            const totaal = derived.items.filter(i => normalize(i.naam) === normalize(item.naam) && i.id !== item.id).reduce((s, i) => s + num(i.aantal), 0) + num(item.aantal);
            if (totaal >= min) return;
            if (shopping.some(s => !s.checked && normalize(s.naam) === normalize(item.naam))) return;
            await db.collection('shoppingList').add({ naam: item.naam, aantal: round2(min - totaal) || 1, eenheid: item.eenheid || 'stuks', winkel: '', checked: false, userId: ownerId });
            notify(`${item.naam} staat op je boodschappenlijst`, 'info');
        },

        // ----- Boodschappen -----
        addShopping: (s) => db.collection('shoppingList').add({
            naam: s.naam.trim(), aantal: num(s.aantal, 1) > 0 ? round2(num(s.aantal, 1)) : 1, eenheid: s.eenheid || 'stuks',
            winkel: s.winkel || '', checked: false, userId: ownerId
        }),
        updateShopping: (s, patch) => db.collection('shoppingList').doc(s.id).update(patch),
        toggleShopping: (s) => db.collection('shoppingList').doc(s.id).update({ checked: !s.checked }),
        deleteShopping: (s) => db.collection('shoppingList').doc(s.id).delete(),
        async clearCheckedShopping() {
            const done = shopping.filter(s => s.checked);
            await runBatched(done.map(s => b => b.delete(db.collection('shoppingList').doc(s.id))));
            notify(`${done.length} afgevinkte items opgeruimd`);
        },

        // ----- Locaties & lades -----
        async addLocatie({ naam, type, color = 'blue', locatieGroep = 'Thuis' }) {
            const order = vriezers.filter(v => v.type === type).length;
            const ref = await db.collection('vriezers').add({ naam: naam.trim(), type, userId: ownerId, color, order, locatieGroep });
            return ref.id;
        },
        updateLocatie: (loc, patch) => db.collection('vriezers').doc(loc.id).update(patch),
        async deleteLocatie(loc) {
            if (lades.some(l => l.vriezerId === loc.id) || derived.items.some(i => i.vriezerId === loc.id)) {
                notify('Maak deze locatie eerst leeg (lades en producten).', 'error'); return false;
            }
            await db.collection('vriezers').doc(loc.id).delete();
            return true;
        },
        reorderLocaties: (list) => runBatched(list.map((l, i) => b => b.update(db.collection('vriezers').doc(l.id), { order: i }))),
        async addLade(vriezerId, naam) {
            const ref = await db.collection('lades').add({ naam: naam.trim(), vriezerId, userId: ownerId });
            return ref.id;
        },
        async renameLade(lade, naam) {
            naam = naam.trim(); if (!naam) return;
            await db.collection('lades').doc(lade.id).update({ naam });
            const list = derived.items.filter(i => i.ladeId === lade.id);
            await runBatched(list.map(i => b => b.update(db.collection('items').doc(i.id), { ladeNaam: naam })));
        },
        async deleteLade(lade) {
            if (derived.items.some(i => i.ladeId === lade.id)) { notify('Maak deze lade eerst leeg.', 'error'); return false; }
            await db.collection('lades').doc(lade.id).delete();
            return true;
        },

        // ----- Categorieën & eenheden (in users-document van de beheerde voorraad) -----
        setCategories: (list) => ownerDoc().set({ customCategories: list.map(c => ({ name: c.name, color: c.color || 'gray' })) }, { merge: true }),
        async renameCategory(list, oldName, newName, color) {
            const updated = list.map(c => c.name === oldName ? { name: newName, color } : c);
            await ownerDoc().set({ customCategories: updated }, { merge: true });
            if (oldName !== newName) {
                const its = derived.items.filter(i => i.categorie === oldName);
                await runBatched(its.map(i => b => b.update(db.collection('items').doc(i.id), { categorie: newName })));
            }
        },
        setUnits: (type, list) => ownerDoc().set({ [UNIT_FIELD[type]]: list }, { merge: true }),
        async renameUnit(type, list, oldName, newName) {
            await ownerDoc().set({ [UNIT_FIELD[type]]: list.map(u => u === oldName ? newName : u) }, { merge: true });
            const its = derived.items.filter(i => i.eenheid === oldName && derived.typeOf(i) === type);
            await runBatched(its.map(i => b => b.update(db.collection('items').doc(i.id), { eenheid: newName })));
        },

        // ----- Recepten -----
        async saveRecipe(data, id) {
            const clean = {
                naam: data.naam.trim(), fotoUrl: (data.fotoUrl || '').trim(), personen: Math.max(1, parseInt(data.personen) || 4),
                categorie: data.categorie || 'Hoofdgerecht',
                ingredienten: (data.ingredienten || []).filter(i => (i.naam || '').trim()).map(i => ({ naam: i.naam.trim(), aantal: i.aantal === '' ? '' : num(i.aantal, ''), eenheid: i.eenheid || 'stuks' })),
                stappen: (data.stappen || []).map(s => s.trim()).filter(Boolean)
            };
            if (id) await db.collection('recepten').doc(id).update(clean);
            else await db.collection('recepten').add({ ...clean, userId: ownerId });
            notify(id ? 'Recept bijgewerkt' : 'Recept opgeslagen');
        },
        deleteRecipe: (r) => db.collection('recepten').doc(r.id).delete(),

        // ----- Controle (balans) -----
        async finishAudit(lade, deleteIds, changes = []) {
            const list = derived.items.filter(i => deleteIds.includes(i.id));
            const upd = changes.filter(c => !deleteIds.includes(c.item.id));
            await runBatched([
                ...list.map(i => b => b.delete(db.collection('items').doc(i.id))),
                ...upd.map(c => b => b.update(db.collection('items').doc(c.item.id), { aantal: c.aantal }))
            ]);
            list.forEach(i => log('Verwijderd', i.naam, 'Ligt niet meer in lade (via Controle)'));
            upd.forEach(c => log('Bewerkt', c.item.naam, `Aantal: ${c.item.aantal} ➔ ${c.aantal} (via Controle)`));
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
            notify('Uitnodiging verstuurd');
            return true;
        },
        async acceptInvite(s) {
            await db.collection('shares').doc(s.id).update({ status: 'accepted', acceptedAt: new Date().toISOString() });
            await switchAccount(s.ownerId, true);
            notify(`Je beheert nu ook de voorraad van ${s.ownerEmail}`);
        },
        declineInvite: (s) => db.collection('shares').doc(s.id).update({ status: 'declined' }),
        async revokeShare(s) { await db.collection('shares').doc(s.id).delete(); notify('Toegang ingetrokken'); },
        async togglePublicLink() {
            const token = (me && me.publicShareToken) || randomToken();
            await setMine({ publicShareToken: token, publicShareEnabled: !(me && me.publicShareEnabled) });
        },
        async regeneratePublicLink() { await setMine({ publicShareToken: randomToken() }); notify('Nieuwe link gemaakt. De oude werkt niet meer.'); },

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
        setOwnerId(id);
        setVriezers([]); setLades([]); setAllItems([]); setShopping([]); setRecepten([]);
        await db.collection('users').doc(user.uid).set({ activeBeheerdeUserId: id }, { merge: true }).catch(() => { });
        if (!silent) notify(id === user.uid ? 'Terug naar je eigen voorraad' : 'Gewisseld van voorraad');
    }

    // Lijst met voorraden waar je naartoe kan wisselen.
    const accounts = useMemo(() => {
        if (!user) return [];
        const list = [{ id: user.uid, label: 'Mijn voorraad', email: user.email }];
        incomingShares.filter(s => s.status === 'accepted').forEach(s => {
            if (!list.some(a => a.id === s.ownerId)) list.push({ id: s.ownerId, label: s.ownerEmail, email: s.ownerEmail });
        });
        if (isAdmin && ownerId && !list.some(a => a.id === ownerId)) {
            const u = usersList.find(x => x.id === ownerId);
            list.push({ id: ownerId, label: (u && (u.email || u.displayName)) || 'Ander account', email: u && u.email, viaAdmin: true });
        }
        return list;
    }, [user, incomingShares, isAdmin, ownerId, usersList]);

    const value = {
        authState, user, me: me || {}, meLoaded: me !== null, isAdmin, ownerId, owner, isOwnAccount, accounts,
        vriezers, lades, allItems, shopping, recepten, incomingShares, outgoingShares, usersList, globalSettings,
        ...derived, dataLoaded, loaded, hiddenTabs, canSee, stats,
        toast, setToast, actions
    };
    return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}
