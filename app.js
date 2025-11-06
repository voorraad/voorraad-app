// ---
// STAP 1: INITIALISEER FIREBASE
// ---
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

// Initialiseer Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const itemsCollectie = db.collection('items');
const ladesCollectie = db.collection('lades');
const vriezersCollectie = db.collection('vriezers');

// ---
// GLOBALE VARIABELEN
// ---
let alleVriezers = [];
let alleLades = [];
let currentUser = null; 

let geselecteerdeVriezerId = null;
let geselecteerdeVriezerNaam = null;
let ladesBeheerListener = null; 

// ---
// SNELKOPPELINGEN NAAR ELEMENTEN
// ---
const form = document.getElementById('add-item-form');
const vriezerLijstenContainer = document.getElementById('vriezer-lijsten-container'); // DE HOOFDCONTAINER
const vriezerSelect = document.getElementById('item-vriezer'); // Toevoeg-formulier vriezer
const schuifSelect = document.getElementById('item-schuif'); // Toevoeg-formulier lade
const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-item-form');
const editId = document.getElementById('edit-item-id');
const editNaam = document.getElementById('edit-item-naam');
const editAantal = document.getElementById('edit-item-aantal');
const editEenheid = document.getElementById('edit-item-eenheid');
const editVriezer = document.getElementById('edit-item-vriezer');
const editSchuif = document.getElementById('edit-item-schuif');
const btnCancel = document.getElementById('btn-cancel');
const logoutBtn = document.getElementById('logout-btn');
const searchBar = document.getElementById('search-bar');
const printBtn = document.getElementById('print-btn');
const dashTotaal = document.getElementById('dash-totaal');
const feedbackMessage = document.getElementById('feedback-message');
const scanBtn = document.getElementById('scan-btn');
const scanModal = document.getElementById('scan-modal');
const stopScanBtn = document.getElementById('btn-stop-scan');
const scannerContainerId = "barcode-scanner-container";
const manualEanBtn = document.getElementById('manual-ean-btn');
let html5QrCode;

// --- Selectors voor Beheer Modal ---
const vriezerBeheerModal = document.getElementById('vriezer-beheer-modal');
const vriezerBeheerKnop = document.getElementById('vriezer-beheer-knop');
const sluitBeheerKnop = document.getElementById('btn-sluit-beheer');
const addVriezerForm = document.getElementById('add-vriezer-form');
const vriezerBeheerLijst = document.getElementById('vriezer-beheer-lijst');
const ladesBeheerTitel = document.getElementById('lades-beheer-titel');
const addLadeForm = document.getElementById('add-lade-form');
const ladesBeheerHr = document.getElementById('lades-beheer-hr');
const ladeBeheerLijst = document.getElementById('lade-beheer-lijst');


// ---
// HELPER FUNCTIES
// ---
function showFeedback(message, type = 'success') {
    feedbackMessage.textContent = message;
    feedbackMessage.className = `feedback-message ${type}`;
    feedbackMessage.style.display = 'block';
    setTimeout(() => {
        feedbackMessage.style.display = 'none';
    }, 3000);
}

function formatAantal(aantal, eenheid) {
    if (aantal === 1 && eenheid === 'stuks') {
        return '1 stuk';
    }
    if (eenheid === 'stuks') {
        return `${aantal} stuks`;
    }
    return `${aantal} ${eenheid}`;
}

function formatDatum(timestamp) {
    if (!timestamp) return 'Onbekend';
    const date = timestamp.toDate();
    return date.toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}


// ---
// STAP 2: APP INITIALISATIE (Stamdata laden)
// ---
async function laadStamdata() {
    if (!currentUser) return;

    try {
        // 1. Haal alle vriezers
        const vriezersSnapshot = await vriezersCollectie.where('userId', '==', currentUser.uid).orderBy('naam').get();
        alleVriezers = vriezersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 2. Haal alle lades
        const ladesSnapshot = await ladesCollectie.where('userId', '==', currentUser.uid).orderBy('naam').get();
        alleLades = ladesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        console.log("Stamdata geladen:", alleVriezers.length, "vriezers,", alleLades.length, "lades");

        // 3. Vul het TOEVOEG-formulier
        vulToevoegVriezerDropdown();
        
        // 4. Start het laden van de items (de dynamische weergave)
        laadItems(); 

    } catch (err) {
        console.error("Fout bij laden stamdata:", err);
        showFeedback(err.message, "error");
    }
}

// Vult de 'Kies vriezer' dropdown in het TOEVOEG formulier
function vulToevoegVriezerDropdown() {
    vriezerSelect.innerHTML = '<option value="" disabled selected>Kies een vriezer...</option>';
    alleVriezers.forEach(vriezer => {
        const option = document.createElement('option');
        option.value = vriezer.id; 
        option.textContent = vriezer.naam;
        vriezerSelect.appendChild(option);
    });
}

// Listener voor het TOEVOEG formulier: vult lades bij vriezerkeuze
vriezerSelect.addEventListener('change', () => {
    const geselecteerdeVriezerId = vriezerSelect.value;
    
    schuifSelect.innerHTML = '<option value="" disabled selected>Kies een schuif...</option>';
    
    // Filter de globale 'alleLades' array
    const gefilterdeLades = alleLades.filter(lade => lade.vriezerId === geselecteerdeVriezerId);
    
    gefilterdeLades.forEach(lade => {
        const option = document.createElement('option');
        option.value = lade.id;
        option.textContent = lade.naam;
        schuifSelect.appendChild(option);
    });
});


// ---
// STAP 3: Items Opslaan (Create)
// ---
form.addEventListener('submit', (e) => {
    e.preventDefault(); 
    
    const geselecteerdeVriezerId = vriezerSelect.value;
    const geselecteerdeLadeId = schuifSelect.value;
    
    if (!geselecteerdeVriezerId || !geselecteerdeLadeId) {
        showFeedback("Selecteer a.u.b. een vriezer én een lade.", "error");
        return;
    }

    const geselecteerdeLadeNaam = schuifSelect.options[schuifSelect.selectedIndex].text;
    const itemNaam = document.getElementById('item-naam').value;

    itemsCollectie.add({
        naam: itemNaam,
        aantal: parseFloat(document.getElementById('item-aantal').value),
        eenheid: document.getElementById('item-eenheid').value,
        ingevrorenOp: firebase.firestore.FieldValue.serverTimestamp(),
        userId: currentUser.uid,
        vriezerId: geselecteerdeVriezerId,
        ladeId: geselecteerdeLadeId,
        ladeNaam: geselecteerdeLadeNaam 
    })
    .then(() => {
        showFeedback(`'${itemNaam}' toegevoegd!`, 'success');
        
        const rememberCheck = document.getElementById('remember-drawer-check');
        if (rememberCheck.checked) {
            document.getElementById('item-naam').value = '';
            document.getElementById('item-aantal').value = 1;
            document.getElementById('item-eenheid').value = "stuks";
            document.getElementById('item-naam').focus();
        } else {
            form.reset();
            document.getElementById('item-eenheid').value = "stuks";
            vriezerSelect.value = "";
            schuifSelect.innerHTML = '<option value="" disabled selected>Kies eerst een vriezer...</option>';
        }
    })
    .catch((err) => {
        console.error("Fout bij toevoegen: ", err);
        showFeedback(`Fout bij toevoegen: ${err.message}`, 'error');
    });
});

// ---
// STAP 4: Items Tonen (Read) - De Dynamische Hoofdweergave
// ---

// Helper-functie om één item-LI te bouwen
function renderItem(doc) {
    const item = doc.data();
    const li = document.createElement('li');
    li.dataset.id = doc.id;
    
    // Data-attributen voor zoeken/filteren
    li.dataset.naam = item.naam.toLowerCase();
    li.dataset.vriezer = item.vriezerId;
    li.dataset.lade = item.ladeId;
    
    // Maak het item dragable
    li.draggable = true; 

    const ingevrorenDatum = item.ingevrorenOp ? formatDatum(item.ingevrorenOp) : 'Onbekend';
    
    li.innerHTML = `
        <div class="item-info">
            <span class="item-naam">${item.naam}</span>
            <span class="item-details">
                ${formatAantal(item.aantal, item.eenheid)} | ${ingevrorenDatum}
            </span>
        </div>
        <div class="item-buttons">
            <button class="edit-btn" title="Bewerk"><i class="fas fa-pencil-alt"></i></button>
            <button class="delete-btn" title="Verwijder"><i class="fas fa-trash-alt"></i></button>
        </div>
    `;
    return li;
}

// Hoofdfunctie: laadItems()
function laadItems() { 
    if (!currentUser) return;

    // We gebruiken onSnapshot voor real-time updates!
    itemsCollectie.where('userId', '==', currentUser.uid)
        .orderBy('ladeNaam') // Sorteer op lade
        .orderBy('naam')     // Daarbinnen op naam
        .onSnapshot(snapshot => {
            
            vriezerLijstenContainer.innerHTML = '';
            
            // 1. Loop door de globale 'alleVriezers'
            alleVriezers.forEach(vriezer => {
                const vriezerDiv = document.createElement('div');
                vriezerDiv.className = 'vriezer-container';
                
                // Tel items in deze vriezer
                const itemsInVriezer = snapshot.docs.filter(doc => doc.data().vriezerId === vriezer.id);
                vriezerDiv.innerHTML = `
                    <h2>
                        <i class="fas fa-snowflake"></i> ${vriezer.naam} 
                        <span class="item-count">(${itemsInVriezer.length})</span>
                    </h2>
                `;

                // 2. Filter de globale 'alleLades' voor deze vriezer
                const ladesInVriezer = alleLades.filter(l => l.vriezerId === vriezer.id);
                
                if (ladesInVriezer.length === 0) {
                     vriezerDiv.innerHTML += `<p class="empty-lade-msg"><i>Voeg lades toe via 'Beheer Vriezers' om items te zien.</i></p>`;
                }

                // 3. Loop door de lades van deze vriezer
                ladesInVriezer.forEach(lade => {
                    const ladeDiv = document.createElement('div');
                    ladeDiv.className = 'lade-container';
                    
                    // Filter items voor deze lade
                    const itemsInLade = snapshot.docs.filter(doc => doc.data().ladeId === lade.id);

                    ladeDiv.innerHTML = `
                        <h3>
                            ${lade.naam}
                            <span class="item-count">(${itemsInLade.length})</span>
                        </h3>
                        <ul class="item-lijst" id="lijst-${lade.id}" data-lade-id="${lade.id}"></ul>
                    `;
                    const ul = ladeDiv.querySelector('.item-lijst');

                    if (itemsInLade.length === 0) {
                        ul.innerHTML = `<li class="empty-lade-msg"><i>Leeg</i></li>`;
                    } else {
                        itemsInLade.forEach(doc => {
                            ul.appendChild(renderItem(doc));
                        });
                    }
                    vriezerDiv.appendChild(ladeDiv);
                });
                
                vriezerLijstenContainer.appendChild(vriezerDiv);
            });
            
            // Update het dashboard
            dashTotaal.textContent = snapshot.size;

            // Zorg dat de filtering klopt bij het laden
            updateItemVisibility();

            // Activeer drag-and-drop nu de lijsten bestaan
            initDragAndDrop();

        }, err => {
            console.error("Fout bij laden items: ", err);
            showFeedback(err.message, "error");
        });
}

// ---
// STAP 5: Items Verwijderen & Bewerken (Update/Delete)
// ---

// Gedelegeerde listener op de hoofdcontainer
vriezerLijstenContainer.addEventListener('click', handleItemLijstClick);

async function handleItemLijstClick(e) {
    const deleteBtn = e.target.closest('.delete-btn');
    const editBtn = e.target.closest('.edit-btn');
    
    if (deleteBtn) {
        const li = e.target.closest('li');
        const id = li.dataset.id;
        const naam = li.querySelector('.item-naam').textContent;

        if (confirm(`Weet je zeker dat je '${naam}' wilt verwijderen?`)) {
            try {
                await itemsCollectie.doc(id).delete();
                showFeedback(`'${naam}' verwijderd.`, 'success');
            } catch (err) {
                showFeedback(err.message, 'error');
            }
        }
    } 
    
    else if (editBtn) {
        const li = e.target.closest('li');
        const id = li.dataset.id;
        
        try {
            const doc = await itemsCollectie.doc(id).get();
            if (!doc.exists) {
                showFeedback("Item niet gevonden", "error");
                return;
            }
            const item = doc.data();
            
            // 1. Vul simpele velden
            editId.value = doc.id;
            editNaam.value = item.naam;
            editAantal.value = item.aantal;
            editEenheid.value = item.eenheid;
            
            // 2. Vul 'Vriezer' dropdown
            editVriezer.innerHTML = ''; 
            alleVriezers.forEach(vriezer => {
                const option = document.createElement('option');
                option.value = vriezer.id;
                option.textContent = vriezer.naam;
                if (vriezer.id === item.vriezerId) {
                    option.selected = true; 
                }
                editVriezer.appendChild(option);
            });
            
            // 3. Vul 'Lade' dropdown
            vulEditLadeDropdown(item.vriezerId, item.ladeId);

            // 4. Toon modal
            editModal.style.display = 'flex';
            
        } catch (err) {
            showFeedback(err.message, 'error');
        }
    }
}

// Helper: Vult de 'lade' dropdown in de EDIT modal
function vulEditLadeDropdown(geselecteerdeVriezerId, selecteerLadeId = null) {
    editSchuif.innerHTML = '<option value="" disabled>Kies een schuif...</option>';
    
    const gefilterdeLades = alleLades.filter(lade => lade.vriezerId === geselecteerdeVriezerId);
    
    gefilterdeLades.forEach(lade => {
        const option = document.createElement('option');
        option.value = lade.id;
        option.textContent = lade.naam;
        if (lade.id === selecteerLadeId) {
            option.selected = true;
        }
        editSchuif.appendChild(option);
    });
}

// Listener: Als de VRIEZER *in de modal* verandert...
editVriezer.addEventListener('change', () => {
    vulEditLadeDropdown(editVriezer.value);
});


// Opslaan van het bewerk-formulier
editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = editId.value;
    const geselecteerdeVriezerId = editVriezer.value;
    const geselecteerdeLadeId = editSchuif.value;

    if (!geselecteerdeVriezerId || !geselecteerdeLadeId) {
        showFeedback("Selecteer a.u.b. een vriezer én een lade.", "error");
        return;
    }

    const geselecteerdeLadeNaam = editSchuif.options[editSchuif.selectedIndex].text;
    const nieuweNaam = editNaam.value;

    try {
        await itemsCollectie.doc(id).update({
            naam: nieuweNaam,
            aantal: parseFloat(editAantal.value),
            eenheid: editEenheid.value,
            vriezerId: geselecteerdeVriezerId,
            ladeId: geselecteerdeLadeId,
            ladeNaam: geselecteerdeLadeNaam
        });
        
        showFeedback(`'${nieuweNaam}' bijgewerkt!`, 'success');
        sluitItemModal();
        
    } catch (err) {
        console.error("Fout bij bijwerken: ", err);
        showFeedback(err.message, 'error');
    }
});

// Modal sluiten
function sluitItemModal() { editModal.style.display = 'none'; }
btnCancel.addEventListener('click', sluitItemModal);


// ---
// STAP 6: VRIEZER BEHEER LOGICA (2-koloms modal)
// ---
vriezerBeheerKnop.addEventListener('click', () => {
    vriezerBeheerModal.style.display = 'flex';
    laadVriezersBeheer(); 
});
sluitBeheerKnop.addEventListener('click', () => {
    vriezerBeheerModal.style.display = 'none';
    if (ladesBeheerListener) {
        ladesBeheerListener(); 
        ladesBeheerListener = null;
    }
    ladeBeheerLijst.innerHTML = '';
    ladesBeheerTitel.textContent = 'Selecteer een vriezer...';
    addLadeForm.style.display = 'none';
    ladesBeheerHr.style.display = 'none';
    geselecteerdeVriezerId = null;
    geselecteerdeVriezerNaam = null;
});

// Vriezer toevoegen
addVriezerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const naam = document.getElementById('vriezer-naam').value;
    if (!currentUser) return showFeedback("Je bent niet ingelogd", "error");

    vriezersCollectie.add({
        naam: naam,
        userId: currentUser.uid 
    })
    .then(() => {
        showFeedback("Vriezer toegevoegd!", "success");
        addVriezerForm.reset();
        laadStamdata(); // Herlaad alles (dropdowns, etc)
    })
    .catch(err => showFeedback(err.message, "error"));
});

// Laad vriezers in Kolom 1
function laadVriezersBeheer() {
    if (!currentUser) return;
    
    vriezersCollectie.where("userId", "==", currentUser.uid).orderBy("naam")
        .onSnapshot(snapshot => {
            vriezerBeheerLijst.innerHTML = '';
            snapshot.docs.forEach(doc => {
                const vriezer = { id: doc.id, ...doc.data() };
                const li = document.createElement('li');
                li.dataset.id = vriezer.id;
                li.dataset.naam = vriezer.naam;
                if (vriezer.id === geselecteerdeVriezerId) {
                    li.classList.add('selected');
                }
                li.innerHTML = `
                    <span>${vriezer.naam}</span>
                    <input type="text" value="${vriezer.naam}" class="beheer-naam-input">
                    <div class="item-buttons">
                        <button class="edit-btn" title="Hernoem"><i class="fas fa-pencil-alt"></i></button>
                        <button class="delete-btn" title="Verwijder"><i class="fas fa-trash-alt"></i></button>
                    </div>
                `;
                vriezerBeheerLijst.appendChild(li);
            });
        });
}

// Lade toevoegen
addLadeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const naam = document.getElementById('lade-naam').value;
    if (!geselecteerdeVriezerId) return showFeedback("Selecteer eerst een vriezer", "error");

    ladesCollectie.add({
        naam: naam,
        vriezerId: geselecteerdeVriezerId, 
        userId: currentUser.uid 
    })
    .then(() => {
        showFeedback("Lade toegevoegd!", "success");
        addLadeForm.reset();
        laadStamdata(); // Herlaad alles
    })
    .catch(err => showFeedback(err.message, "error"));
});

// Laad lades in Kolom 2
function laadLadesBeheer(vriezerId) {
    if (ladesBeheerListener) ladesBeheerListener();
    ladeBeheerLijst.innerHTML = '<i>Lades laden...</i>';
    ladesBeheerListener = ladesCollectie.where("vriezerId", "==", vriezerId).orderBy("naam")
        .onSnapshot(snapshot => {
            ladeBeheerLijst.innerHTML = '';
            if (snapshot.empty) ladeBeheerLijst.innerHTML = '<i>Nog geen lades in deze vriezer.</i>';
            snapshot.docs.forEach(doc => {
                const lade = { id: doc.id, ...doc.data() };
                const li = document.createElement('li');
                li.dataset.id = lade.id;
                li.dataset.naam = lade.naam;
                li.innerHTML = `
                    <span>${lade.naam}</span>
                    <input type="text" value="${lade.naam}" class="beheer-naam-input">
                    <div class="item-buttons">
                        <button class="edit-btn" title="Hernoem"><i class="fas fa-pencil-alt"></i></button>
                        <button class="delete-btn" title="Verwijder"><i class="fas fa-trash-alt"></i></button>
                    </div>
                `;
                ladeBeheerLijst.appendChild(li);
            });
        });
}

// Klik-handler voor Kolom 1 (Vriezers)
vriezerBeheerLijst.addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    const vriezerId = li.dataset.id;
    const vriezerNaam = li.dataset.naam;
    const deleteBtn = e.target.closest('.delete-btn');
    const editBtn = e.target.closest('.edit-btn');

    if (deleteBtn) {
        handleVerwijderVriezer(vriezerId, vriezerNaam);
    } else if (editBtn) {
        handleHernoem(li, vriezersCollectie, true);
    } else {
        // Selecteer vriezer
        geselecteerdeVriezerId = vriezerId;
        geselecteerdeVriezerNaam = vriezerNaam;
        ladesBeheerTitel.textContent = `Lades voor: ${vriezerNaam}`;
        addLadeForm.style.display = 'grid';
        ladesBeheerHr.style.display = 'block';
        document.querySelectorAll('#vriezer-beheer-lijst li').forEach(el => el.classList.remove('selected'));
        li.classList.add('selected');
        laadLadesBeheer(vriezerId);
    }
});

// Klik-handler voor Kolom 2 (Lades)
ladeBeheerLijst.addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    const ladeId = li.dataset.id;
    const ladeNaam = li.dataset.naam;
    const deleteBtn = e.target.closest('.delete-btn');
    const editBtn = e.target.closest('.edit-btn');

    if (deleteBtn) {
        handleVerwijderLade(ladeId, ladeNaam);
    } else if (editBtn) {
        handleHernoem(li, ladesCollectie, false);
    }
});

// Algemene hernoem-functie
function handleHernoem(liElement, collectie, isVriezer) {
    const id = liElement.dataset.id;
    const input = liElement.querySelector('.beheer-naam-input');
    const saveBtn = liElement.querySelector('.edit-btn');

    if (liElement.classList.contains('edit-mode')) {
        const nieuweNaam = input.value;
        collectie.doc(id).update({ naam: nieuweNaam })
            .then(() => {
                liElement.classList.remove('edit-mode');
                saveBtn.innerHTML = '<i class="fas fa-pencil-alt"></i>';
                showFeedback("Naam bijgewerkt!", "success");
                laadStamdata(); // Herlaad alles
            })
            .catch(err => showFeedback(err.message, "error"));
    } else {
        liElement.classList.add('edit-mode');
        input.focus();
        saveBtn.innerHTML = '<i class="fas fa-save"></i>';
    }
}

// Verwijder Vriezer (met check)
async function handleVerwijderVriezer(id, naam) {
    const ladesCheck = await ladesCollectie.where("vriezerId", "==", id).limit(1).get();
    if (!ladesCheck.empty) {
        showFeedback("Kan vriezer niet verwijderen: maak eerst alle lades leeg.", "error");
        return;
    }
    if (confirm(`Weet je zeker dat je vriezer "${naam}" wilt verwijderen?`)) {
        vriezersCollectie.doc(id).delete()
            .then(() => {
                showFeedback(`Vriezer "${naam}" verwijderd.`, "success");
                laadStamdata(); 
            })
            .catch(err => showFeedback(err.message, "error"));
    }
}

// Verwijder Lade (met check)
async function handleVerwijderLade(id, naam) {
    const itemsCheck = await itemsCollectie.where("ladeId", "==", id).limit(1).get();
    if (!itemsCheck.empty) {
        showFeedback("Kan lade niet verwijderen: verplaats eerst alle items.", "error");
        return;
    }
    if (confirm(`Weet je zeker dat je lade "${naam}" wilt verwijderen?`)) {
        ladesCollectie.doc(id).delete()
            .then(() => {
                showFeedback(`Lade "${naam}" verwijderd.`, "success");
                laadStamdata();
            })
            .catch(err => showFeedback(err.message, "error"));
    }
}

// ---
// STAP 7: UITLOGGEN
// ---
logoutBtn.addEventListener('click', () => {
    auth.signOut()
        .then(() => {
            console.log("Uitgelogd");
            // onAuthStateChanged regelt de redirect
        })
        .catch((err) => {
            showFeedback(err.message, 'error');
        });
});

// ---
// STAP 8: ZOEKBALK & FILTER LOGICA
// ---
searchBar.addEventListener('input', updateItemVisibility);

function updateItemVisibility() {
    const zoekTerm = searchBar.value.toLowerCase().trim();

    // 1. Loop door alle items (li)
    const alleItems = document.querySelectorAll('.item-lijst li');
    
    alleItems.forEach(item => {
        if (item.classList.contains('empty-lade-msg')) return; 

        const itemNaam = item.dataset.naam; 
        
        if (itemNaam.includes(zoekTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });

    // 2. Check welke lades/vriezers leeg zijn na filteren
    checkLegeContainers();
}

// Verbergt lege lades/vriezers tijdens het zoeken
function checkLegeContainers() {
    // Loop door alle lade-containers
    document.querySelectorAll('.lade-container').forEach(ladeDiv => {
        const ul = ladeDiv.querySelector('.item-lijst');
        const legeMsg = ladeDiv.querySelector('.empty-lade-msg');
        
        // Zoek naar ZICHTBARE items
        const zichtbareItems = ul.querySelectorAll('li[style*="display: flex"]');
        
        if (!legeMsg) { // Alleen als de lade niet al leeg was
            if (zichtbareItems.length === 0) {
                // Alles weggefilterd
                ladeDiv.querySelector('h3').style.display = 'none';
                ul.style.display = 'none'; 
            } else {
                // Er zijn items
                ladeDiv.querySelector('h3').style.display = 'block';
                ul.style.display = 'block';
            }
        }
    });

    // Loop door alle vriezer-containers
    document.querySelectorAll('.vriezer-container').forEach(vriezerDiv => {
        // Zoek naar ZICHTBARE lade-titels
        const zichtbareLades = vriezerDiv.querySelectorAll('h3[style*="display: block"]');
        
        if (zichtbareLades.length === 0) {
            vriezerDiv.querySelector('h2').style.display = 'none';
        } else {
            vriezerDiv.querySelector('h2').style.display = 'flex';
        }
    });
}

// ---
// STAP 9: PRINT LOGICA
// ---
printBtn.addEventListener('click', () => window.print());

// ---
// STAP 10: SCANNER LOGICA
// ---
function startScanner() {
    scanModal.style.display = 'flex';
    html5QrCode = new Html5Qrcode(scannerContainerId);
    const config = { fps: 10, qrbox: { width: 250, height: 150 } };
    html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess, onScanFailure)
        .catch(err => showFeedback("Kan camera niet starten: " + err, "error"));
}

function sluitScanner() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            console.log("Scanner gestopt.");
            html5QrCode.clear();
        }).catch(err => console.warn("Scanner kon niet netjes stoppen.", err));
    }
    scanModal.style.display = 'none';
}

async function onScanSuccess(ean, decodedResult) {
    // 1. Geef feedback
    showFeedback(`EAN ${ean} gescand. Product opzoeken...`, 'info');

    // 2. Haal productnaam op
    const productName = await fetchProductFromOFF(ean);
    
    if (!productName) {
        showFeedback(`Product niet gevonden voor EAN ${ean}.`, 'error');
        return;
    }
    
    // 3. Check selecties in HOOFD-formulier
    const geselecteerdeVriezerId = vriezerSelect.value;
    const geselecteerdeLadeId = schuifSelect.value;
    
    if (!geselecteerdeVriezerId || !geselecteerdeLadeId) {
        sluitScanner();
        showFeedback("Selecteer a.u.b. eerst een vriezer en lade in het toevoeg-formulier!", "error");
        return;
    }

    // 4. Haal ladeNaam op
    const geselecteerdeLadeNaam = schuifSelect.options[schuifSelect.selectedIndex].text;

    // 5. Sla item op
    try {
        await itemsCollectie.add({
            naam: productName,
            aantal: 1,
            eenheid: "stuks",
            ingevrorenOp: firebase.firestore.FieldValue.serverTimestamp(),
            userId: currentUser.uid,
            vriezerId: geselecteerdeVriezerId,
            ladeId: geselecteerdeLadeId,
            ladeNaam: geselecteerdeLadeNaam,
            ean: ean 
        });
        
        showFeedback(`'${productName}' toegevoegd aan '${geselecteerdeLadeNaam}'!`, 'success');
        // Scanner blijft open voor volgend item...

    } catch (err) {
        console.error("Fout bij opslaan gescand item: ", err);
        showFeedback(err.message, 'error');
    }
}

function onScanFailure(error) {
    // console.warn(`Scan error: ${error}`);
}

async function fetchProductFromOFF(ean) {
    const proxyUrl = 'https://proxy.vriezer.app/fetch-product'; 
    
    try {
        const response = await fetch(`${proxyUrl}?ean=${ean}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        
        if (data.status === 0 || !data.product) {
            console.warn("Product niet gevonden in OFF:", ean);
            return null;
        }
        
        const productName = data.product.product_name || data.product.generic_name || "Onbekend product";
        return productName.split(' - ')[0].split('(')[0].trim();

    } catch (error) {
        console.error('Fout bij ophalen OpenFoodFacts:', error);
        return null;
    }
}

// --- Scanner Listeners ---
scanBtn.addEventListener('click', startScanner);
stopScanBtn.addEventListener('click', sluitScanner);

manualEanBtn.addEventListener('click', async () => {
    const ean = prompt("Voer de EAN-code (barcode) handmatig in:", "");
    if (ean) {
        await onScanSuccess(ean.trim(), null);
    }
});

// ---
// STAP 11: DRAG-AND-DROP LOGICA
// ---

function initDragAndDrop() {
    const lijsten = document.querySelectorAll('.item-lijst');
    
    lijsten.forEach(lijst => {
        // Gebruik SortableJS (vereist de SortableJS library in je HTML)
        if (typeof Sortable === 'undefined') return;

        if (lijst.sortableInstance) {
            lijst.sortableInstance.destroy();
        }
        
        lijst.sortableInstance = new Sortable(lijst, {
            group: 'items', 
            animation: 150,
            handle: '.item-info', // Zorgt dat je knoppen nog kunt klikken
            onEnd: handleDragEnd
        });
    });
}

// Handler: Wordt aangeroepen als een item is verplaatst
async function handleDragEnd(evt) {
    // evt.from = oude lijst (ul)
    // evt.to = new lijst (ul)
    // evt.item = het item (li)

    if (evt.from === evt.to) {
        return; // Niets veranderd
    }

    try {
        const itemId = evt.item.dataset.id;
        const nieuweLadeId = evt.to.dataset.ladeId;

        // Zoek de data van de nieuwe lade (uit globale array)
        const nieuweLade = alleLades.find(l => l.id === nieuweLadeId);
        
        if (!nieuweLade) {
            throw new Error("Doellade niet gevonden!");
        }

        // Update het item in Firestore
        await itemsCollectie.doc(itemId).update({
            ladeId: nieuweLadeId,
            ladeNaam: nieuweLade.naam,
            vriezerId: nieuweLade.vriezerId // Update ook de vriezerId!
        });

        const itemNaam = evt.item.querySelector('.item-naam').textContent;
        showFeedback(`'${itemNaam}' verplaatst naar '${nieuweLade.naam}'!`, 'success');
        
        // onSnapshot doet de rest! De tellers worden automatisch bijgewerkt.

    } catch (err) {
        console.error("Fout bij drag-and-drop: ", err);
        showFeedback(err.message, 'error');
    }
}

// ---
// ALLES STARTEN (Auth)
// ---
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log("Ingelogd als:", user.displayName || user.email || user.uid);
        currentUser = user; 
        laadStamdata(); // DIT IS DE NIEUWE STARTPUNT
    } else {
        currentUser = null;
        console.log("Niet ingelogd, terug naar index.html");
        window.location.replace('index.html');
    }
});
