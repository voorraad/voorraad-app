import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase.js';

// Kleine documenten enkel voor beheerders (collectie beheer): groepen, sjablonen, dagrapport.
export function useBeheerDoc(naam) {
    const [doc, setDoc] = useState(null);
    useEffect(() => db.collection('beheer').doc(naam).onSnapshot(d => setDoc(d.exists ? d.data() : {}), () => setDoc({})), [naam]);
    return doc;
}
export const saveBeheerDoc = (naam, patch) => db.collection('beheer').doc(naam).set(patch, { merge: true });
export const nieuwId = () => Math.random().toString(36).slice(2, 10);
