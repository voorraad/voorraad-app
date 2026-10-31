// Nagemaakte (in-memory) Firebase compat-API om de app lokaal te testen zonder echte database.
// Alleen gebruikt door dev.html — wordt NIET geladen in de echte app.
(function () {
    const params = new URLSearchParams(location.search);
    const scenario = params.get('demo') || 'default';
    const DAY = 864e5;
    const now = Date.now();
    const d = (days) => new Date(now + days * DAY);
    const key = (days) => { const x = d(days); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };

    class Ts { constructor(date) { this._ms = +date; this.seconds = Math.floor(this._ms / 1000); this.nanoseconds = 0; } toDate() { return new Date(this._ms); } }
    const SV_TS = { __sv: 'ts' };
    const clone = (v) => {
        if (v instanceof Date) return new Ts(v);
        if (v instanceof Ts) return v;
        if (Array.isArray(v)) return v.map(clone);
        if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clone(x)]));
        return v;
    };
    let idc = 1000;
    const newId = () => 'id' + (idc++).toString(36) + Math.random().toString(36).slice(2, 6);

    const db = {}; // naam -> Map(id -> data)
    const coll = (n) => (db[n] = db[n] || new Map());

    // ---------- Seed ----------
    const U = 'u1', U2 = 'u2';
    const seed = () => {
        const add = (c, data, id = newId()) => { coll(c).set(id, data); return id; };
        coll('users').set(U, {
            email: 'jaiderjannis@gmail.com', displayName: 'Jaider Jannis', darkMode: params.get('dark') === '1', hasSeenTutorial: scenario !== 'tour',
            showBalans: true, notificationsEnabled: true, openLades: [], hiddenTabs: [],
            customCategories: [{ name: 'Vlees', color: 'red' }, { name: 'Vis', color: 'blue' }, { name: 'Groenten', color: 'green' }, { name: 'Fruit', color: 'yellow' }, { name: 'Brood', color: 'yellow' }, { name: 'IJs', color: 'pink' }, { name: 'Restjes', color: 'gray' }, { name: 'Saus', color: 'red' }, { name: 'Friet', color: 'yellow' }, { name: 'Pizza', color: 'orange' }, { name: 'Soep', color: 'orange' }, { name: 'Ander', color: 'gray' }],
            stats: { consumed: 42, wasted: 6, consumedValue: 118.4, wastedValue: 14.2 }
        });
        coll('users').set(U2, { email: 'marie@voorbeeld.be', displayName: 'Marie', hiddenTabs: ['recepten'] });
        coll('users').set('u3', { email: 'oma@voorbeeld.be', displayName: 'Oma', disabled: false });
        if (scenario === 'admin' || scenario === 'default') coll('admins').set(U, { yes: true });
        coll('settings').set('onboarding', { isActive: true });
        if (params.get('deel')) Object.assign(coll('users').get(U), { publicShareToken: params.get('deel'), publicShareEnabled: true });
        if (scenario === 'new') { coll('users').delete(U); return; }

        const vk = add('vriezers', { naam: 'Diepvries keuken', type: 'vriezer', userId: U, color: 'blue', order: 0, locatieGroep: 'Thuis' });
        const vg = add('vriezers', { naam: 'Diepvries garage', type: 'vriezer', userId: U, color: 'purple', order: 1, locatieGroep: 'Thuis' });
        const fr = add('vriezers', { naam: 'Frigo', type: 'frig', userId: U, color: 'green', order: 0 });
        const ks = add('vriezers', { naam: 'Voorraadkast', type: 'voorraad', userId: U, color: 'orange', order: 0 });
        const l1 = add('lades', { naam: 'Lade 1 · vlees', vriezerId: vk, userId: U, laatstGecontroleerd: d(-20) });
        const l2 = add('lades', { naam: 'Lade 2 · groenten', vriezerId: vk, userId: U, laatstGewijzigd: d(-2) });
        const l3 = add('lades', { naam: 'Lade 3 · varia', vriezerId: vk, userId: U });
        const g1 = add('lades', { naam: 'Bovenste lade', vriezerId: vg, userId: U });
        const f1 = add('lades', { naam: 'Bovenste plank', vriezerId: fr, userId: U });
        const f2 = add('lades', { naam: 'Groentelade', vriezerId: fr, userId: U });
        const k1 = add('lades', { naam: 'Plank 1', vriezerId: ks, userId: U });
        const k2 = add('lades', { naam: 'Plank 2', vriezerId: ks, userId: U });
        coll('users').get(U).openLades = [l1, l2, f1, k1];
        const it = (naam, loc, lade, ladeNaam, extra) => add('items', { naam, aantal: 1, eenheid: 'stuks', vriezerId: loc, ladeId: lade, ladeNaam, categorie: 'Ander', emoji: '', ingevrorenOp: d(-10), houdbaarheidsDatum: null, notitie: '', tags: [], altijdGoed: false, userId: U, minimumVoorraad: null, prijs: null, ...extra });
        it('Gehakt', vk, l1, 'Lade 1', { aantal: 3, eenheid: 'pak', categorie: 'Vlees', emoji: '🥩', ingevrorenOp: d(-200), prijs: 9 });
        it('Kippenfilet', vk, l1, 'Lade 1', { aantal: 2, eenheid: 'pak', categorie: 'Vlees', emoji: '🍗', ingevrorenOp: d(-120) });
        it('Hamburgers', vk, l1, 'Lade 1', { aantal: 4, categorie: 'Vlees', emoji: '🍔', ingevrorenOp: d(-30) });
        it('Erwtjes', vk, l2, 'Lade 2', { aantal: 1, eenheid: 'zak', categorie: 'Groenten', emoji: '🫛', ingevrorenOp: d(-60) });
        it('Spinazie', vk, l2, 'Lade 2', { aantal: 0.5, eenheid: 'zak', categorie: 'Groenten', emoji: '🥬', ingevrorenOp: d(-15) });
        it('Vanille-ijs', vk, l3, 'Lade 3', { aantal: 1, eenheid: 'doos', categorie: 'IJs', emoji: '🍦', ingevrorenOp: d(-40) });
        it('Soep (tomaat)', vk, l3, 'Lade 3', { aantal: 4, eenheid: 'portie', categorie: 'Soep', emoji: '🍲', ingevrorenOp: d(-7), notitie: 'Van zondag' });
        it('Pizza margherita', vg, g1, 'Bovenste lade', { aantal: 2, categorie: 'Pizza', emoji: '🍕', ingevrorenOp: d(-95) });
        it('Friet', vg, '', '', { aantal: 1, eenheid: 'zak', categorie: 'Friet', emoji: '🍟', ingevrorenOp: d(-5) });
        it('Melk', fr, f1, 'Bovenste plank', { aantal: 2, eenheid: 'fles', categorie: 'Zuivel', emoji: '🥛', houdbaarheidsDatum: d(2), minimumVoorraad: 2 });
        it('Yoghurt', fr, f1, 'Bovenste plank', { aantal: 4, eenheid: 'pot', categorie: 'Zuivel', emoji: '🥣', houdbaarheidsDatum: d(-1) });
        it('Gouda', fr, f1, 'Bovenste plank', { aantal: 1, categorie: 'Kaas', emoji: '🧀', houdbaarheidsDatum: d(12) });
        it('Kipfilet beleg', fr, f1, 'Bovenste plank', { aantal: 1, eenheid: 'pak', categorie: 'Beleg', emoji: '🥪', houdbaarheidsDatum: d(0) });
        it('Wortelen', fr, f2, 'Groentelade', { aantal: 1, eenheid: 'zak', categorie: 'Groenten', emoji: '🥕', houdbaarheidsDatum: d(6) });
        it('Sla', fr, f2, 'Groentelade', { aantal: 1, categorie: 'Groenten', emoji: '🥬', houdbaarheidsDatum: d(-4) });
        it('Spaghetti', ks, k1, 'Plank 1', { aantal: 3, eenheid: 'pak', categorie: 'Pasta', emoji: '🍝', houdbaarheidsDatum: d(300), minimumVoorraad: 2, prijs: 3.6 });
        it('Tomatensaus', ks, k1, 'Plank 1', { aantal: 1, eenheid: 'pot', categorie: 'Saus', emoji: '🥫', houdbaarheidsDatum: d(25), minimumVoorraad: 2 });
        it('Rijst', ks, k2, 'Plank 2', { aantal: 1, eenheid: 'kilo', categorie: 'Rijst', emoji: '🍚', houdbaarheidsDatum: d(400) });
        it('Zout', ks, k2, 'Plank 2', { aantal: 1, eenheid: 'pak', categorie: 'Kruiden', emoji: '🧂', altijdGoed: true });
        it('Verloren ding', ks, 'oude-lade-die-niet-meer-bestaat', 'Weg', { aantal: 1, categorie: 'Ander', emoji: '📦' });
        add('items', { naam: 'Lasagne bij oma', aantal: 1, eenheid: 'stuks', vriezerId: 'custom_menu', ladeId: '', categorie: 'Menu', emoji: '🍽️', geplandeDatum: key(1), ingevrorenOp: key(0), userId: U });
        add('shoppingList', { naam: 'Brood', aantal: 1, eenheid: 'stuks', winkel: 'Delhaize', checked: false, userId: U });
        add('shoppingList', { naam: 'Appels', aantal: 6, eenheid: 'stuks', winkel: 'Colruyt', checked: false, userId: U });
        add('shoppingList', { naam: 'Koffie', aantal: 1, eenheid: 'pak', winkel: '', checked: false, userId: U });
        add('shoppingList', { naam: 'Eieren', aantal: 12, eenheid: 'stuks', winkel: 'Colruyt', checked: true, userId: U });
        const rid = add('recepten', { naam: 'Spaghetti bolognese', personen: 4, categorie: 'Hoofdgerecht', fotoUrl: '', userId: U,
            ingredienten: [{ naam: 'Spaghetti', aantal: 400, eenheid: 'gram' }, { naam: 'Gehakt', aantal: 500, eenheid: 'gram' }, { naam: 'Tomatensaus', aantal: 1, eenheid: 'blikje' }, { naam: 'Ajuin', aantal: 1, eenheid: 'stuks' }, { naam: 'Parmezaan', aantal: 50, eenheid: 'gram' }],
            stappen: ['Bak de ajuin glazig.', 'Voeg het gehakt toe en bak rul.', 'Tomatensaus erbij, 20 min laten pruttelen.', 'Kook de spaghetti en serveer.'] });
        add('recepten', { naam: 'Groentesoep', personen: 6, categorie: 'Soep', fotoUrl: '', userId: U, ingredienten: [{ naam: 'Wortelen', aantal: 3, eenheid: 'stuks' }, { naam: 'Prei', aantal: 1, eenheid: 'stuks' }], stappen: ['Alles snijden en koken.'] });
        add('shares', { ownerId: U2, ownerEmail: 'marie@voorbeeld.be', sharedWithEmail: 'jaiderjannis@gmail.com', status: 'pending', role: 'editor' });
        add('shares', { ownerId: U, ownerEmail: 'jaiderjannis@gmail.com', sharedWithEmail: 'partner@voorbeeld.be', status: 'accepted', role: 'editor' });
        add('vriezers', { naam: 'Vriezer Marie', type: 'vriezer', userId: U2, color: 'pink', order: 0 });
        add('logs', { action: 'Toevoegen', item: 'Gehakt', details: '3 pak in Diepvries keuken', actorId: U, actorName: 'Jaider Jannis', targetUserId: U, timestamp: d(-1) });
        add('logs', { action: 'Verwijderd', item: 'Kaas', details: 'Weggegooid (verspild)', actorId: 'p', actorName: 'Partner', targetUserId: U, timestamp: d(-0.5) });
    };
    seed();

    // ---------- Schrijven ----------
    const applySentinels = (oldV, newV) => {
        if (newV === SV_TS) return new Date();
        if (newV && newV.__inc !== undefined) return (typeof oldV === 'number' ? oldV : 0) + newV.__inc;
        return newV;
    };
    const deepMerge = (target, src) => {
        const out = { ...(target || {}) };
        for (const [k, v] of Object.entries(src)) {
            if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) && !(v instanceof Ts) && v !== SV_TS && v.__inc === undefined) out[k] = deepMerge(out[k], v);
            else out[k] = applySentinels(out[k], v);
        }
        return out;
    };
    const resolveAll = (obj) => deepMerge({}, obj);
    const unTs = (v) => v instanceof Ts ? new Date(v._ms) : Array.isArray(v) ? v.map(unTs) : v && typeof v === 'object' && v !== SV_TS && v.__inc === undefined && !(v instanceof Date) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, unTs(x)])) : v;

    let pending = false;
    const listeners = new Set();
    const changed = () => { if (pending) return; pending = true; setTimeout(() => { pending = false; listeners.forEach(l => l.fire()); }, 15); };
    const failRate = () => (window.__mockFail ? Promise.reject(new Error('Mock-fout')) : null);

    const write = {
        set(c, id, data, opts) {
            const cur = coll(c).get(id);
            coll(c).set(id, opts && opts.merge ? deepMerge(cur, unTs(data)) : resolveAll(unTs(data)));
            changed();
        },
        update(c, id, patch) {
            const cur = coll(c).get(id);
            if (!cur) throw new Error('Document bestaat niet: ' + c + '/' + id);
            let next = { ...cur };
            for (const [k, v] of Object.entries(unTs(patch))) {
                const parts = k.split('.');
                if (parts.length === 1) next[k] = applySentinels(next[k], v);
                else { let o = next; parts.slice(0, -1).forEach(p => { o[p] = { ...(o[p] || {}) }; o = o[p]; }); const last = parts[parts.length - 1]; o[last] = applySentinels(o[last], v); }
            }
            coll(c).set(id, next); changed();
        },
        del(c, id) { coll(c).delete(id); changed(); }
    };

    // ---------- Lezen ----------
    class DocSnap { constructor(c, id) { const v = coll(c).get(id); this.id = id; this.exists = v !== undefined; this._v = v; this.ref = new DocRef(c, id); } data() { return this._v === undefined ? undefined : clone(this._v); } }
    class QuerySnap { constructor(docs) { this.docs = docs; this.empty = !docs.length; this.size = docs.length; } forEach(f) { this.docs.forEach(f); } }
    class Query {
        constructor(c, filters = [], order = null, lim = null) { this.c = c; this.f = filters; this.o = order; this.l = lim; }
        where(f, op, v) { return new Query(this.c, [...this.f, [f, op, v]], this.o, this.l); }
        orderBy(f, dir = 'asc') { return new Query(this.c, this.f, [f, dir], this.l); }
        limit(n) { return new Query(this.c, this.f, this.o, n); }
        _run() {
            let ids = [...coll(this.c).keys()].filter(id => this.f.every(([f, op, v]) => { const x = coll(this.c).get(id)[f]; return op === '==' ? x === v : true; }));
            if (this.o) { const [f, dir] = this.o; ids.sort((a, b) => { const x = coll(this.c).get(a)[f], y = coll(this.c).get(b)[f]; const r = (x > y) - (x < y); return dir === 'desc' ? -r : r; }); }
            if (this.l) ids = ids.slice(0, this.l);
            return new QuerySnap(ids.map(id => new DocSnap(this.c, id)));
        }
        get() { return failRate() || new Promise(r => setTimeout(() => r(this._run()), 20)); }
        onSnapshot(cb, err) {
            const l = { fire: () => { try { cb(this._run()); } catch (e) { console.error(e); } } };
            listeners.add(l); setTimeout(l.fire, 30);
            return () => listeners.delete(l);
        }
    }
    class DocRef {
        constructor(c, id) { this.c = c; this.id = id; }
        get() { return new Promise(r => setTimeout(() => r(new DocSnap(this.c, this.id)), 15)); }
        set(data, opts) { return failRate() || Promise.resolve(write.set(this.c, this.id, data, opts)); }
        update(p) { try { return failRate() || Promise.resolve(write.update(this.c, this.id, p)); } catch (e) { return Promise.reject(e); } }
        delete() { return Promise.resolve(write.del(this.c, this.id)); }
        onSnapshot(cb) { const l = { fire: () => cb(new DocSnap(this.c, this.id)) }; listeners.add(l); setTimeout(l.fire, 25); return () => listeners.delete(l); }
    }
    class CollRef extends Query {
        add(data) { const id = newId(); write.set(this.c, id, data); return Promise.resolve(new DocRef(this.c, id)); }
        doc(id) { return new DocRef(this.c, id || newId()); }
    }
    const firestoreInstance = {
        collection: (c) => new CollRef(c),
        batch() {
            const ops = [];
            return {
                set: (ref, data, opts) => ops.push(() => write.set(ref.c, ref.id, data, opts)),
                update: (ref, p) => ops.push(() => write.update(ref.c, ref.id, p)),
                delete: (ref) => ops.push(() => write.del(ref.c, ref.id)),
                commit: () => { ops.forEach(f => f()); return Promise.resolve(); }
            };
        },
        enablePersistence: () => Promise.resolve()
    };

    // ---------- Auth ----------
    const fakeUser = { uid: U, email: 'jaiderjannis@gmail.com', displayName: 'Jaider Jannis', photoURL: null };
    let current = params.get('loggedout') ? null : fakeUser;
    const authCbs = new Set();
    const authInstance = {
        get currentUser() { return current; },
        onAuthStateChanged(cb) { authCbs.add(cb); setTimeout(() => cb(current), 10); return () => authCbs.delete(cb); },
        signInWithPopup() { current = fakeUser; authCbs.forEach(cb => cb(current)); return Promise.resolve({ user: current }); },
        signOut() { current = null; authCbs.forEach(cb => cb(null)); return Promise.resolve(); }
    };

    const firestore = () => firestoreInstance;
    firestore.FieldValue = { serverTimestamp: () => SV_TS, increment: (n) => ({ __inc: n }) };
    const auth = () => authInstance;
    auth.GoogleAuthProvider = function () { };
    window.firebase = { apps: [], initializeApp() { this.apps.push({}); }, firestore, auth };
    window.__mockDb = db;
})();
