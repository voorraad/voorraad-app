// Stap 1: Initialiseer Firebase
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
// NIEUWE COLLECTIES VOOR ADMIN
const usersCollectie = db.collection('users');
const adminsCollectie = db.collection('admins');


// ---
// GLOBALE VARIABELEN
// ---
let alleVriezers = [];
let alleLades = [];
let alleItems = []; 
let currentUser = null; 
// --- NIEUWE ADMIN VARIABELEN ---
let isBeheerder = false; // Standaard geen admin
let beheerdeUserId = null; // De UID van de gebruiker die momenteel beheerd wordt
// --- EINDE NIEUW ---
let geselecteerdeVriezerId = null;
let geselecteerdeVriezerNaam = null;
let ladesBeheerListener = null; 
let itemsListener = null; 

// ---
// Snelkoppelingen naar elementen
// ---
const form = document.getElementById('add-item-form');
const vriezerSelect = document.getElementById('item-vriezer'); 
const schuifSelect = document.getElementById('item-schuif'); 
const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-item-form');
const editId = document.getElementById('edit-item-id');
const editNaam = document.getElementById('edit-item-naam');
const editAantal = document.getElementById('edit-item-aantal');
const editEenheid = document.getElementById('edit-item-eenheid');
const editVriezer = document.getElementById('edit-item-vriezer');
const editSchuif = document.getElementById('edit-item-schuif');
const editDatum = document.getElementById('edit-item-datum');
const btnCancel = document.getElementById('btn-cancel');
const logoutBtn = document.getElementById('logout-btn');
const searchBar = document.getElementById('search-bar');
const printBtn = document.getElementById('print-btn');
const dashboard = document.getElementById('dashboard'); 
const feedbackMessage = document.getElementById('feedback-message');
const scanBtn = document.getElementById('scan-btn');
const scanModal = document.getElementById('scan-modal');
const stopScanBtn = document.getElementById('btn-stop-scan');
const scannerContainerId = "barcode-scanner-container";
const manualEanBtn = document.getElementById('manual-ean-btn');
let html5QrCode;
const vriezerLijstenContainer = document.getElementById('vriezer-lijsten-container');
const vriezerBeheerModal = document.getElementById('vriezer-beheer-modal');
const vriezerBeheerKnop = document.getElementById('vriezer-beheer-knop');
const sluitBeheerKnop = document.getElementById('btn-sluit-beheer');
const addVriezerForm = document.getElementById('add-vriezer-form');
const vriezerBeheerLijst = document.getElementById('vriezer-beheer-lijst');
const ladesBeheerTitel = document.getElementById('lades-beheer-titel');
const addLadeForm = document.getElementById('add-lade-form');
const ladesBeheerHr = document.getElementById('lades-beheer-hr');
const ladeBeheerLijst = document.getElementById('lade-beheer-lijst');
const btnToggleAlles = document.getElementById('btn-toggle-alles');

// --- NIEUWE ELEMENTEN VOOR ADMIN ---
const adminBeheerKnop = document.getElementById('admin-beheer-knop');
const adminBeheerModal = document.getElementById('admin-beheer-modal');
const sluitAdminBeheerKnop = document.getElementById('btn-sluit-admin-beheer');
const adminUserLijst = document.getElementById('admin-user-lijst');
const adminBeheertTitel = document.getElementById('admin-beheert-titel');
const adminTerugKnop = document.getElementById('admin-terug-knop');


// ---
// HELPER FUNCTIES (blijven hetzelfde)
// ---
function showFeedback(message, type = 'success') {
    feedbackMessage.textContent = message;
    feedbackMessage.className = 'feedback';
    feedbackMessage.classList.add(type);
    feedbackMessage.classList.add('show');
    setTimeout(() => {
        feedbackMessage.classList.remove('show');
    }, 3000);
}
function formatAantal(aantal, eenheid) {
    if (!eenheid || eenheid === 'stuks') return `${aantal}x`;
    if (eenheid === 'zak') {
        if (aantal === 1) return "1 zak";
        if (aantal === 0.75) return "3/4 zak";
        if (aantal === 0.5) return "1/2 zak";
        if (aantal === 0.25) return "1/4 zak";
        if (aantal > 1 && (aantal % 1 === 0)) return `${aantal} zakken`;
        return `${aantal} zakken`;
    }
    return `${aantal} ${eenheid}`;
}
function formatDatum(timestamp) {
    if (!timestamp) return 'Onbekende datum';
    return timestamp.toDate().toLocaleDateString('nl-BE');
}
function startScanner() { /* ... (je bestaande code) ... */ }
function sluitScanner() { /* ... (je bestaande code) ... */ }
function onScanSuccess(decodedText, decodedResult) { /* ... (je bestaande code) ... */ }
function onScanFailure(error) { /* ... */ }
async function fetchProductFromOFF(ean) { /* ... (je bestaande code uit Stap 2) ... */ }

// ---
// STAP 2: APP INITIALISATIE (AANGEPAST VOOR ADMIN)
// ---
async function laadStamdata() {
    // Gebruikt nu de globale 'beheerdeUserId'
    if (!beheerdeUserId) return;
    try {
        const vriezersSnapshot = await vriezersCollectie.where('userId', '==', beheerdeUserId).orderBy('naam').get();
        alleVriezers = vriezersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const ladesSnapshot = await ladesCollectie.where('userId', '==', beheerdeUserId).orderBy('naam').get();
        alleLades = ladesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        console.log("Stamdata geladen voor:", beheerdeUserId, alleVriezers.length, "vriezers,", alleLades.length, "lades");
        
        vulToevoegVriezerDropdown();
        
        // Items listener wordt apart gestart (zoals voorheen)
        startItemsListener(); 

    } catch (err) {
        console.error("Fout bij laden stamdata:", err);
        showFeedback(err.message, "error");
    }
}

function vulToevoegVriezerDropdown() {
    vriezerSelect.innerHTML = '<option value="" disabled selected>Kies een vriezer...</option>';
    alleVriezers.forEach(vriezer => {
        const option = document.createElement('option');
        option.value = vriezer.id; 
        option.textContent = vriezer.naam; 
        vriezerSelect.appendChild(option);
    });
}

vriezerSelect.addEventListener('change', () => {
    const geselecteerdeVriezerId = vriezerSelect.value;
    schuifSelect.innerHTML = '<option value="" disabled selected>Kies een schuif...</option>';
    const gefilterdeLades = alleLades.filter(lade => lade.vriezerId === geselecteerdeVriezerId);
    gefilterdeLades.forEach(lade => {
        const option = document.createElement('option');
        option.value = lade.id; 
        option.textContent = lade.naam; 
        schuifSelect.appendChild(option);
    });
});


// ---
// STAP 3: Items Opslaan (Create) - (AANGEPAST VOOR ADMIN)
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
        userId: beheerdeUserId, // Gebruikt nu de globale 'beheerdeUserId'
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
// STAP 3 & 4: DYNAMISCH RENDEREN, FILTERS, DRAG-DROP (AANGEPAST VOOR ADMIN)
// ---
function startItemsListener() {
    if (itemsListener) itemsListener(); // Stop de vorige listener
    
    // Gebruikt nu de globale 'beheerdeUserId'
    itemsListener = itemsCollectie.where("userId", "==", beheerdeUserId)
        .onSnapshot((snapshot) => {
            alleItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log("Items bijgewerkt voor:", beheerdeUserId, alleItems.length);
            renderDynamischeLijsten();
        }, (error) => {
            console.error("Fout bij ophalen items: ", error);
            showFeedback(error.message, "error");
        });
}

// RenderDynamischeLijsten, updateDashboard, initDragAndDrop, etc.
// zijn ONGEWIJZIGD, omdat zij afhankelijk zijn van de globale
// variabelen (alleVriezers, alleLades, alleItems) die al
// correct gefilterd zijn in laadStamdata() en startItemsListener().
// Hieronder plak ik ze voor de volledigheid.

function renderDynamischeLijsten() {
    vriezerLijstenContainer.innerHTML = ''; 
    
    alleVriezers.sort((a, b) => a.naam.localeCompare(b.naam));

    alleVriezers.forEach(vriezer => {
        const kolomDiv = document.createElement('div');
        kolomDiv.className = 'vriezer-kolom';
        kolomDiv.innerHTML = `<h2>${vriezer.naam}</h2>`;

        const vriezerLades = alleLades
            .filter(lade => lade.vriezerId === vriezer.id)
            .sort((a, b) => a.naam.localeCompare(b.naam));

        if (vriezerLades.length > 0) {
            const filterContainer = document.createElement('div');
            filterContainer.className = 'lade-filter-container';
            
            const filterLabel = document.createElement('label');
            filterLabel.htmlFor = `filter-${vriezer.id}`;
            filterLabel.textContent = 'Toon:';
            
            const filterSelect = document.createElement('select');
            filterSelect.id = `filter-${vriezer.id}`;
            filterSelect.className = 'lade-filter-select';
            
            const allOption = document.createElement('option');
            allOption.value = 'all';
            allOption.textContent = 'Alle schuiven';
            filterSelect.appendChild(allOption);

            vriezerLades.forEach(lade => {
                const ladeOption = document.createElement('option');
                ladeOption.value = lade.id;
                ladeOption.textContent = lade.naam;
                filterSelect.appendChild(ladeOption);
            });

            filterSelect.addEventListener('change', updateItemVisibility); 
            
            filterContainer.appendChild(filterLabel);
            filterContainer.appendChild(filterSelect);
            kolomDiv.appendChild(filterContainer);
        }
        
        const vriezerItems = alleItems.filter(item => item.vriezerId === vriezer.id);
        
        vriezerLades.forEach(lade => {
            const ladeGroup = document.createElement('div');
            ladeGroup.className = 'lade-group collapsed'; 
            ladeGroup.dataset.ladeId = lade.id; 

            const ladeHeader = document.createElement('button');
            ladeHeader.className = 'lade-header';
            ladeHeader.dataset.ladeId = lade.id;
            ladeHeader.dataset.ladeNaam = lade.naam;
            ladeHeader.innerHTML = `<h3>${lade.naam}</h3> <i class="fas fa-chevron-down chevron"></i>`;

            const ladeContent = document.createElement('div');
            ladeContent.className = 'lade-content';

            const ladeUl = document.createElement('ul');
            ladeUl.dataset.vriezerId = vriezer.id; 
            
            const ladeItems = vriezerItems
                .filter(item => item.ladeId === lade.id)
                .sort((a, b) => a.naam.localeCompare(b.naam));
                
            ladeItems.forEach(item => {
                const li = document.createElement('li');
                li.dataset.id = item.id;
                li.dataset.ladeId = item.ladeId; 
                li.dataset.vriezerId = item.vriezerId;
                
                if (item.ingevrorenOp) {
                    const diffDagen = Math.ceil(Math.abs(new Date() - item.ingevrorenOp.toDate()) / (1000 * 60 * 60 * 24));
                    if (diffDagen > 180) { li.classList.add('item-old'); }
                    else if (diffDagen > 90) { li.classList.add('item-medium'); }
                    else { li.classList.add('item-fresh'); }
                }

                li.innerHTML = `
                    <div class="item-text">
                        <strong>${item.naam} (${formatAantal(item.aantal, item.eenheid)})</strong>
                        <small style="display: block; color: #555;">Ingevroren op: ${formatDatum(item.ingevrorenOp)}</small>
                    </div>
                    <div class="item-buttons">
                        <button class="edit-btn" title="Bewerken"><i class="fas fa-pencil-alt"></i></button>
                        <button class="delete-btn" title="Verwijder"><i class="fas fa-trash-alt"></i></button>
                    </div>
                `;
                ladeUl.appendChild(li);
            });
            
            ladeContent.appendChild(ladeUl);
            ladeGroup.appendChild(ladeHeader);
            ladeGroup.appendChild(ladeContent);
            
            kolomDiv.appendChild(ladeGroup);
        });
        
        vriezerLijstenContainer.appendChild(kolomDiv);
    });
    
    initDragAndDrop();
    updateItemVisibility(); 
    updateDashboard(); 
}


function updateDashboard() {
    dashboard.innerHTML = '';
    let totaal = alleItems.length;
    let totaalSpan = document.createElement('strong');
    totaalSpan.textContent = `Totaal: ${totaal}`;
    dashboard.appendChild(totaalSpan);

    alleVriezers.forEach(vriezer => {
        const vriezerItems = alleItems.filter(item => item.vriezerId === vriezer.id);
        let vriezerSpan = document.createElement('span');
        vriezerSpan.textContent = `${vriezer.naam}: ${vriezerItems.length}`;
        dashboard.appendChild(vriezerSpan);
    });
}

function initDragAndDrop() {
    const lijsten = document.querySelectorAll('.lade-content ul');
    
    const onDragEnd = (event) => {
        const itemEl = event.item; 
        const itemId = itemEl.dataset.id;
        const oldLadeId = itemEl.dataset.ladeId;
        
        const newUL = event.to;
        const newVriezerId = newUL.dataset.vriezerId; 

        const ladeContentDiv = newUL.parentElement;
        const ladeHeaderBtn = ladeContentDiv.previousElementSibling;
        
        const newLadeId = ladeHeaderBtn.dataset.ladeId;
        const newLadeNaam = ladeHeaderBtn.dataset.ladeNaam;

        if (oldLadeId === newLadeId) return; 
        
        itemsCollectie.doc(itemId).update({
            vriezerId: newVriezerId,
            ladeId: newLadeId,
            ladeNaam: newLadeNaam
        })
        .then(() => showFeedback('Item verplaatst!', 'success'))
        .catch((err) => showFeedback(`Fout bij verplaatsen: ${err.message}`, 'error'));
    };
    
    lijsten.forEach(lijst => {
        new Sortable(lijst, {
            animation: 150,
            group: 'vriezer-items', 
            handle: '.item-text',   
            ghostClass: 'sortable-ghost', 
            chosenClass: 'sortable-chosen', 
            onEnd: onDragEnd
        });
    });
}

vriezerLijstenContainer.addEventListener('click', (e) => {
    
    const ladeHeader = e.target.closest('.lade-header');
    if (ladeHeader) {
        const ladeGroup = ladeHeader.parentElement;
        ladeGroup.classList.toggle('collapsed');
        return; 
    }

    const editButton = e.target.closest('.edit-btn');
    const deleteButton = e.target.closest('.delete-btn');
    const li = e.target.closest('li');

    if (!li) return; 

    if (deleteButton) {
        const id = li.dataset.id;
        // Gebruik geen confirm() omdat dit in een iframe kan draaien.
        // We gaan uit van een directe actie, of je moet een custom modal bouwen.
        // Voor nu: directe verwijdering met feedback.
        itemsCollectie.doc(id).delete()
            .then(() => showFeedback('Item verwijderd.', 'success'))
            .catch((err) => showFeedback(`Fout bij verwijderen: ${err.message}`, 'error'));
    }
    
    if (editButton) {
        const id = li.dataset.id;
        const item = alleItems.find(i => i.id === id);
        if (!item) return;
        editId.value = id;
        editNaam.value = item.naam;
        editAantal.value = item.aantal;
        editEenheid.value = item.eenheid || 'stuks';
        editVriezer.innerHTML = '';
        alleVriezers.forEach(vriezer => {
            const option = document.createElement('option');
            option.value = vriezer.id;
            option.textContent = vriezer.naam;
            if (vriezer.id === item.vriezerId) option.selected = true;
            editVriezer.appendChild(option);
        });
        vulEditLadeDropdown(item.vriezerId, item.ladeId);
        
        const jsDate = item.ingevrorenOp ? item.ingevrorenOp.toDate() : new Date();
        const year = jsDate.getFullYear();
        const month = (jsDate.getMonth() + 1).toString().padStart(2, '0');
        const day = jsDate.getDate().toString().padStart(2, '0');
        
        editDatum.value = `${year}-${month}-${day}`;
        editModal.style.display = 'flex';
    }
});

editVriezer.addEventListener('change', () => {
    vulEditLadeDropdown(editVriezer.value); 
});
function vulEditLadeDropdown(vriezerId, selecteerLadeId = null) {
    editSchuif.innerHTML = '';
    const gefilterdeLades = alleLades.filter(lade => lade.vriezerId === vriezerId);
    gefilterdeLades.forEach(lade => {
        const option = document.createElement('option');
        option.value = lade.id;
        option.textContent = lade.naam;
        if (lade.id === selecteerLadeId) option.selected = true;
        editSchuif.appendChild(option);
    });
}
editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = editId.value;
    const geselecteerdeVriezerId = editVriezer.value;
    const geselecteerdeLadeId = editSchuif.value;
    const geselecteerdeLadeNaam = editSchuif.options[editSchuif.selectedIndex].text;
    const nieuweDatum = new Date(editDatum.value + "T00:00:00");
    
    // De update-logica hoeft niet aangepast te worden,
    // want het werkt op basis van 'id', niet 'userId'.
    itemsCollectie.doc(id).update({
        naam: editNaam.value,
        aantal: parseFloat(editAantal.value),
        eenheid: editEenheid.value,
        vriezerId: geselecteerdeVriezerId,
        ladeId: geselecteerdeLadeId,
        ladeNaam: geselecteerdeLadeNaam,
        ingevrorenOp: new Date (nieuweDatum)
    })
    .then(() => {
        sluitItemModal();
        showFeedback('Item bijgewerkt!', 'success');
    })
    .catch((err) => showFeedback(`Fout bij bijwerken: ${err.message}`, 'error'));
});
function sluitItemModal() { editModal.style.display = 'none'; }
btnCancel.addEventListener('click', sluitItemModal);


// ---
// STAP 6: VRIEZER BEHEER LOGICA (AANGEPAST VOOR ADMIN)
// ---
vriezerBeheerKnop.addEventListener('click', () => {
    vriezerBeheerModal.style.display = 'flex';
    laadVriezersBeheer(); 
});
sluitBeheerKnop.addEventListener('click', () => {
    vriezerBeheerModal.style.display = 'none';
    if (ladesBeheerListener) ladesBeheerListener(); 
    ladesBeheerListener = null;
    ladeBeheerLijst.innerHTML = '';
    ladesBeheerTitel.textContent = 'Selecteer een vriezer...';
    addLadeForm.style.display = 'none';
    ladesBeheerHr.style.display = 'none';
    geselecteerdeVriezerId = null;
    geselecteerdeVriezerNaam = null;
});
addVriezerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const naam = document.getElementById('vriezer-naam').value;
    // Gebruikt nu 'beheerdeUserId'
    vriezersCollectie.add({ naam: naam, userId: beheerdeUserId })
    .then(() => {
        showFeedback("Vriezer toegevoegd!", "success");
        addVriezerForm.reset();
        laadStamdata(); // Herlaad stamdata
    })
    .catch(err => showFeedback(err.message, "error"));
});
function laadVriezersBeheer() {
    // Gebruikt nu 'beheerdeUserId'
    vriezersCollectie.where("userId", "==", beheerdeUserId).orderBy("naam")
        .onSnapshot(snapshot => {
            vriezerBeheerLijst.innerHTML = '';
            snapshot.docs.forEach(doc => {
                const vriezer = { id: doc.id, ...doc.data() };
                const li = document.createElement('li');
                li.dataset.id = vriezer.id;
                li.dataset.naam = vriezer.naam;
                if (vriezer.id === geselecteerdeVriezerId) li.classList.add('selected');
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
addLadeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const naam = document.getElementById('lade-naam').value;
    if (!geselecteerdeVriezerId) return showFeedback("Selecteer eerst een vriezer", "error");
    ladesCollectie.add({
        naam: naam,
        vriezerId: geselecteerdeVriezerId, 
        userId: beheerdeUserId // Gebruikt nu 'beheerdeUserId'
    })
    .then(() => {
        showFeedback("Lade toegevoegd!", "success");
        addLadeForm.reset();
        laadStamdata(); // Herlaad stamdata
    })
    .catch(err => showFeedback(err.message, "error"));
});
function laadLadesBeheer(vriezerId) {
    if (ladesBeheerListener) ladesBeheerListener();
    ladeBeheerLijst.innerHTML = '<i>Lades laden...</i>';
    // Query hoeft niet aangepast, filtert al op vriezerId
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
// Event listeners voor vriezerBeheerLijst en ladeBeheerLijst
// en de functies handleHernoem, handleVerwijderVriezer, handleVerwijderLade
// blijven ONGEWIJZIGD, omdat ze op ID's werken en geen 'userId' nodig hebben
// voor hun queries.
vriezerBeheerLijst.addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    const vriezerId = li.dataset.id;
    const vriezerNaam = li.dataset.naam;
    const deleteBtn = e.target.closest('.delete-btn');
    const editBtn = e.target.closest('.edit-btn');
    if (deleteBtn) handleVerwijderVriezer(vriezerId, vriezerNaam);
    else if (editBtn) handleHernoem(li, vriezersCollectie);
    else {
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
ladeBeheerLijst.addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    const ladeId = li.dataset.id;
    const ladeNaam = li.dataset.naam;
    const deleteBtn = e.target.closest('.delete-btn');
    const editBtn = e.target.closest('.edit-btn');
    if (deleteBtn) handleVerwijderLade(ladeId, ladeNaam);
    else if (editBtn) handleHernoem(li, ladesCollectie);
});
function handleHernoem(liElement, collectie) {
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
                laadStamdata(); 
            })
            .catch(err => showFeedback(err.message, "error"));
    } else {
        liElement.classList.add('edit-mode');
        input.focus();
        saveBtn.innerHTML = '<i class="fas fa-save"></i>';
    }
}
async function handleVerwijderVriezer(id, naam) {
    const ladesCheck = await ladesCollectie.where("vriezerId", "==", id).limit(1).get();
    if (!ladesCheck.empty) {
        showFeedback("Kan vriezer niet verwijderen: maak eerst alle lades leeg.", "error");
        return;
    }
    // Geen confirm()
    vriezersCollectie.doc(id).delete()
        .then(() => {
            showFeedback(`Vriezer "${naam}" verwijderd.`, "success");
            laadStamdata(); 
        })
        .catch(err => showFeedback(err.message, "error"));
}
async function handleVerwijderLade(id, naam) {
    const itemsCheck = await itemsCollectie.where("ladeId", "==", id).limit(1).get();
    if (!itemsCheck.empty) {
        showFeedback("Kan lade niet verwijderen: verplaats eerst alle items.", "error");
        return;
    }
    // Geen confirm()
    ladesCollectie.doc(id).delete()
        .then(() => {
            showFeedback(`Lade "${naam}" verwijderd.`, "success");
            laadStamdata(); 
        })
        .catch(err => showFeedback(err.message, "error"));
}

// ---
// STAP 7: UITLOGGEN LOGICA (blijft hetzelfde)
// ---
logoutBtn.addEventListener('click', () => {
    // Geen confirm()
    auth.signOut().catch((error) => showFeedback(`Fout bij uitloggen: ${error.message}`, 'error'));
});

// ---
// STAP 8: ZOEKBALK LOGICA (ongewijzigd)
// ---
searchBar.addEventListener('input', updateItemVisibility);
function updateItemVisibility() {
    const searchTerm = searchBar.value.toLowerCase();
    const isSearching = searchTerm.length > 0; 

    document.querySelectorAll('.vriezer-kolom').forEach(kolom => {
        
        const ladeFilter = kolom.querySelector('.lade-filter-select');
        const geselecteerdeLadeId = ladeFilter ? ladeFilter.value : 'all';

        const ladeHeeftZichtbareItems = {}; 

        kolom.querySelectorAll('li').forEach(item => {
            const itemLadeId = item.dataset.ladeId;
            const matchesLade = (geselecteerdeLadeId === 'all' || geselecteerdeLadeId === itemLadeId);
            
            const itemText = item.querySelector('.item-text strong').textContent.toLowerCase();
            const matchesSearch = itemText.includes(searchTerm); 

            if (matchesLade && matchesSearch) {
                item.style.display = 'flex';
                ladeHeeftZichtbareItems[itemLadeId] = true; 
            } else {
                item.style.display = 'none';
            }
        });

        kolom.querySelectorAll('.lade-group').forEach(group => {
            const groupLadeId = group.dataset.ladeId;
            const heeftItems = ladeHeeftZichtbareItems[groupLadeId] === true;

            let toonGroup = false;

            if (geselecteerdeLadeId === 'all') {
                if (heeftItems) {
                    toonGroup = true;
                }
            } else {
                if (geselecteerdeLadeId === groupLadeId && heeftItems) {
                    toonGroup = true;
                } else if (geselecteerdeLadeId === groupLadeId && !isSearching) {
                    toonGroup = true;
                }
            }

            group.style.display = toonGroup ? 'block' : 'none';

            if (isSearching && toonGroup) { 
                group.classList.remove('collapsed'); 
            }
        });
    });
}
// checkLadesInLijst was al overbodig geworden door de nieuwe lade-group logica
// function checkLadesInLijst(lijstElement) { ... } 

// ---
// STAP 9: PRINT LOGICA (blijft hetzelfde)
// ---
printBtn.addEventListener('click', () => window.print());

// --- Scanner Listeners (blijft hetzelfde) ---
scanBtn.addEventListener('click', startScanner);
stopScanBtn.addEventListener('click', sluitScanner);
manualEanBtn.addEventListener('click', () => {
    const ean = prompt("Voer het EAN-nummer (barcode) handmatig in:", "");
    if (ean && ean.trim() !== "") fetchProductFromOFF(ean.trim());
});
// ---
// STAP 10: ALLES OPENEN / SLUITEN LOGICA (blijft hetzelfde)
// ---
btnToggleAlles.addEventListener('click', () => {
    const alleLades = vriezerLijstenContainer.querySelectorAll('.lade-group');
    if (alleLades.length === 0) return; 

    const minstensEénGesloten = vriezerLijstenContainer.querySelector('.lade-group.collapsed');

    if (minstensEénGesloten) {
        alleLades.forEach(lade => lade.classList.remove('collapsed'));
        btnToggleAlles.innerHTML = '<i class="fas fa-minus-square"></i> Alles Sluiten';
    } else {
        alleLades.forEach(lade => lade.classList.add('collapsed'));
        btnToggleAlles.innerHTML = '<i class="fas fa-plus-square"></i> Alles Openen';
    }
});

// ---
// NIEUWE ADMIN MODAL FUNCTIES
// ---
adminBeheerKnop.addEventListener('click', openAdminModal);
sluitAdminBeheerKnop.addEventListener('click', sluitAdminModal);
adminTerugKnop.addEventListener('click', gaTerugNaarEigenAccount);
adminUserLijst.addEventListener('click', selecteerGebruikerVoorBeheer);

function sluitAdminModal() {
    adminBeheerModal.style.display = 'none';
}

async function openAdminModal() {
    adminBeheerModal.style.display = 'flex';
    adminUserLijst.innerHTML = '<li><i>Gebruikers laden...</i></li>';

    try {
        const usersSnapshot = await usersCollectie.get();
        adminUserLijst.innerHTML = '';
        
        if (usersSnapshot.empty) {
            adminUserLijst.innerHTML = '<li><i>Geen andere gebruikers gevonden.</i></li>';
            return;
        }

        usersSnapshot.docs.forEach(doc => {
            const user = doc.data();
            // Toon niet de admin zelf in de lijst
            if (user.uid === currentUser.uid) return; 

            const li = document.createElement('li');
            li.dataset.uid = user.uid;
            li.dataset.email = user.email || 'Onbekend';
            li.innerHTML = `
                <span>${user.email || 'Onbekend'}</span>
                <small>${user.uid}</small>
            `;
            adminUserLijst.appendChild(li);
        });

    } catch (err) {
        console.error("Fout bij laden gebruikers:", err);
        showFeedback(err.message, "error");
        adminUserLijst.innerHTML = `<li><i>Fout: ${err.message}</i></li>`;
    }
}

function selecteerGebruikerVoorBeheer(e) {
    const li = e.target.closest('li');
    if (!li || !li.dataset.uid) return; // Klik was niet op een geldig item

    const uid = li.dataset.uid;
    const email = li.dataset.email;

    // Stop alle actieve listeners voor de huidige gebruiker
    if (itemsListener) itemsListener();
    if (ladesBeheerListener) ladesBeheerListener();

    // Zet de app in "beheer" modus voor de geselecteerde gebruiker
    beheerdeUserId = uid;
    adminBeheertTitel.textContent = `Beheer van: ${email}`;
    adminTerugKnop.style.display = 'block';

    // Herstart de data-laad functies
    laadStamdata();
    
    sluitAdminModal();
    showFeedback(`Je beheert nu de vriezers van ${email}`, 'success');
}

function gaTerugNaarEigenAccount() {
    // Stop alle actieve listeners
    if (itemsListener) itemsListener();
    if (ladesBeheerListener) ladesBeheerListener();

    // Zet de app terug naar de ingelogde gebruiker
    beheerdeUserId = currentUser.uid;
    adminBeheertTitel.textContent = ``;
    adminTerugKnop.style.display = 'none';

    // Herstart de data-laad functies
    laadStamdata();
    
    sluitAdminModal();
    showFeedback(`Je beheert nu je eigen vriezers`, 'success');
}


// ---
// ALLES STARTEN (AANGEPAST VOOR ADMIN CHECK)
// ---
auth.onAuthStateChanged(async (user) => {
    if (user) {
        console.log("Ingelogd als:", user.displayName || user.email || user.uid);
        currentUser = user; 
        
        // 1. Check of de gebruiker een admin is
        try {
            const adminCheck = await adminsCollectie.doc(user.uid).get();
            if (adminCheck.exists) {
                isBeheerder = true;
                console.log("Gebruiker is admin!");
            } else {
                isBeheerder = false;
            }
        } catch (err) {
            console.error("Fout bij checken admin status:", err);
            isBeheerder = false;
        }
        
        // 2. Sla gebruiker op in 'users' collectie (voor de admin lijst)
        try {
            await usersCollectie.doc(user.uid).set({
                email: user.email || 'Onbekend',
                uid: user.uid
            }, { merge: true });
        } catch (err) {
            console.error("Fout bij opslaan gebruiker:", err);
        }

        // 3. Toon admin UI indien van toepassing
        adminBeheerKnop.style.display = isBeheerder ? 'inline-block' : 'none';
        
        // 4. Start de app standaard voor de EIGEN gebruiker
        beheerdeUserId = user.uid;
        laadStamdata(); 
        
    } else {
        currentUser = null;
        beheerdeUserId = null;
        isBeheerder = false;
        adminBeheerKnop.style.display = 'none'; // Verberg knop bij uitloggen
        if (itemsListener) itemsListener(); // Stop de listener bij uitloggen
        console.log("Niet ingelogd, terug naar index.html");
        window.location.replace('index.html');
    }
});
