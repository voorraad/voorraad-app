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

// ---
// GLOBALE VARIABELEN
// ---
let alleLades = [];
let ladesMap = {};

// ---
// Snelkoppelingen naar elementen
// ---
const form = document.getElementById('add-item-form');
const lijstVriezer1 = document.getElementById('lijst-vriezer-1');
const lijstVriezer2 = document.getElementById('lijst-vriezer-2');
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
const btnCancel = document.getElementById('btn-cancel');
const ladeBeheerModal = document.getElementById('lade-beheer-modal');
const beheerLadesKnop = document.getElementById('beheer-lades-knop');
const sluitLadeBeheerKnop = document.getElementById('btn-sluit-lade-beheer');
const addLadeForm = document.getElementById('add-lade-form');
const ladesLijstV1 = document.getElementById('lades-lijst-v1');
const ladesLijstV2 = document.getElementById('lades-lijst-v2');
const logoutBtn = document.getElementById('logout-btn');
const searchBar = document.getElementById('search-bar');
const printBtn = document.getElementById('print-btn');
const dashTotaal = document.getElementById('dash-totaal');
const dashV1 = document.getElementById('dash-v1');
const dashV2 = document.getElementById('dash-v2');

// --- NIEUW: Snelkoppelingen voor feedback en filters ---
const feedbackMessage = document.getElementById('feedback-message');
const filterV1 = document.getElementById('filter-v1');
const filterV2 = document.getElementById('filter-v2');
// ---------------------------------------------------


// ---
// HELPER FUNCTIES
// ---

// --- NIEUW: Functie voor visuele feedback ---
/**
 * Toont een feedbackbericht aan de gebruiker voor 3 seconden.
 * @param {string} message - Het bericht dat getoond moet worden.
 * @param {string} type - 'success' (groen) of 'error' (rood).
 */
function showFeedback(message, type = 'success') {
    feedbackMessage.textContent = message;
    feedbackMessage.className = 'feedback'; // Reset klassen
    feedbackMessage.classList.add(type);    // Voeg 'success' of 'error' toe
    
    // Toon het bericht met een animatie
    feedbackMessage.classList.add('show');
    
    // Verberg het bericht na 3 seconden
    setTimeout(() => {
        feedbackMessage.classList.remove('show');
    }, 3000);
}
// -------------------------------------------

function formatAantal(aantal, eenheid) {
    if (!eenheid || eenheid === 'stuks') {
        return `${aantal}x`;
    }
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
    const datum = timestamp.toDate();
    return datum.toLocaleDateString('nl-BE');
}

// ---
// STAP 2: LADES OPHALEN & APP INITIALISEREN
// ---
async function laadLades() {
    ladesCollectie.orderBy("vriezer").orderBy("naam").onSnapshot(snapshot => {
        alleLades = [];
        ladesMap = {};
        snapshot.docs.forEach(doc => {
            const lade = { id: doc.id, ...doc.data() };
            alleLades.push(lade);
            ladesMap[lade.id] = lade.naam;
        });
        vulLadeBeheerLijst();
        vulSchuifDropdowns();
        vulLadeFilterDropdowns(); // --- NIEUW: Vul de filter-dropdowns ---
        laadItems(); 
    });
}

function vulSchuifDropdowns() {
    const geselecteerdeVriezer = vriezerSelect.value;
    schuifSelect.innerHTML = '<option value="" disabled selected>Kies een schuif...</option>';
    const gefilterdeLades = alleLades.filter(lade => lade.vriezer === geselecteerdeVriezer);
    gefilterdeLades.forEach(lade => {
        const option = document.createElement('option');
        option.value = lade.id;
        option.textContent = lade.naam;
        schuifSelect.appendChild(option);
    });
}
vriezerSelect.addEventListener('change', vulSchuifDropdowns);

// --- NIEUW: Functie om de filter-dropdowns te vullen ---
function vulLadeFilterDropdowns() {
    // Reset de filters (behoud de 'Alle Lades' optie)
    filterV1.innerHTML = '<option value="alles">Alle Lades</option>';
    filterV2.innerHTML = '<option value="alles">Alle Lades</option>';
    
    alleLades.forEach(lade => {
        const option = document.createElement('option');
        option.value = lade.id;
        option.textContent = lade.naam;
        
        if (lade.vriezer === 'Vriezer 1') {
            filterV1.appendChild(option);
        } else if (lade.vriezer === 'Vriezer 2') {
            filterV2.appendChild(option);
        }
    });
}
// ----------------------------------------------------


// ---
// STAP 3: Items Opslaan (Create)
// ---
form.addEventListener('submit', (e) => {
    e.preventDefault(); 

    const schuifDropdown = document.getElementById('item-schuif');
    const geselecteerdeLadeId = schuifDropdown.value;
    const geselecteerdeLadeNaam = schuifDropdown.options[schuifDropdown.selectedIndex].text;
    const itemNaam = document.getElementById('item-naam').value; // Voor feedback

    itemsCollectie.add({
        naam: itemNaam,
        aantal: parseFloat(document.getElementById('item-aantal').value),
        eenheid: document.getElementById('item-eenheid').value,
        vriezer: document.getElementById('item-vriezer').value,
        ladeId: geselecteerdeLadeId,
        ladeNaam: geselecteerdeLadeNaam,
        ingevrorenOp: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        // --- AANGEPAST: Visuele feedback ---
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
            document.getElementById('item-vriezer').value = "";
            schuifSelect.innerHTML = '<option value="" disabled selected>Kies eerst een vriezer...</option>';
        }
    })
    // --- NIEUW: Foutafhandeling ---
    .catch((err) => {
        console.error("Fout bij toevoegen: ", err);
        showFeedback(`Fout bij toevoegen: ${err.message}`, 'error');
    });
});

// ---
// STAP 4: Items Tonen (Read) - AANGEPAST VOOR FILTERING
// ---
function laadItems() {
    itemsCollectie.orderBy("vriezer").orderBy("ladeNaam").onSnapshot((snapshot) => {
        lijstVriezer1.innerHTML = '';
        lijstVriezer2.innerHTML = '';
        let countV1 = 0;
        let countV2 = 0;
        let huidigeLadeIdV1 = "";
        let huidigeLadeIdV2 = "";

        snapshot.docs.forEach((doc) => {
            const item = doc.data();
            const docId = doc.id;
            const ladeNaam = ladesMap[item.ladeId] || "Onbekende Lade";
            const li = document.createElement('li');
            
            // --- NIEUW: Data-attribuut toevoegen voor filtering ---
            li.dataset.ladeId = item.ladeId;
            // ----------------------------------------------------

            const aantalText = formatAantal(item.aantal, item.eenheid);
            const datumText = formatDatum(item.ingevrorenOp);
            
            if (item.ingevrorenOp) {
                const ingevrorenDatum = item.ingevrorenOp.toDate();
                const vandaag = new Date();
                const diffTijd = Math.abs(vandaag - ingevrorenDatum);
                const diffDagen = Math.ceil(diffTijd / (1000 * 60 * 60 * 24));

                if (diffDagen > 180) { li.classList.add('item-old'); }
                else if (diffDagen > 90) { li.classList.add('item-medium'); }
                else { li.classList.add('item-fresh'); }
            }   
            
            li.innerHTML = `
                <div class="item-text">
                    <strong>${item.naam} (${aantalText})</strong>
                    <small style="display: block; color: #555;">Ingevroren op: ${datumText}</small>
                </div>
                <div class="item-buttons">
                    <button class="edit-btn" data-id="${docId}" title="Bewerken">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button class="delete-btn" data-id="${docId}" title="Verwijder">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;

            if (item.vriezer === 'Vriezer 1') {
                countV1++;
                if (item.ladeId !== huidigeLadeIdV1) {
                    huidigeLadeIdV1 = item.ladeId;
                    const titel = document.createElement('h3');
                    titel.className = 'schuif-titel';
                    titel.textContent = ladeNaam;
                    // --- NIEUW: Data-attribuut ook op titel voor filtering ---
                    titel.dataset.ladeId = item.ladeId;
                    lijstVriezer1.appendChild(titel);
                }
                lijstVriezer1.appendChild(li);
            } else if (item.vriezer === 'Vriezer 2') {
                countV2++;
                if (item.ladeId !== huidigeLadeIdV2) {
                    huidigeLadeIdV2 = item.ladeId;
                    const titel = document.createElement('h3');
                    titel.className = 'schuif-titel';
                    titel.textContent = ladeNaam;
                    // --- NIEUW: Data-attribuut ook op titel voor filtering ---
                    titel.dataset.ladeId = item.ladeId;
                    lijstVriezer2.appendChild(titel);
                }
                lijstVriezer2.appendChild(li);
            }
        });
        
        dashTotaal.textContent = `Totaal: ${countV1 + countV2}`;
        dashV1.textContent = `Vriezer 1: ${countV1}`;
        dashV2.textContent = `Vriezer 2: ${countV2}`;
        
        // --- AANGEPAST: Pas filters toe na het renderen ---
        updateItemVisibility();
        // ------------------------------------------------

    }, (error) => {
        console.error("Fout bij ophalen items: ", error);
        showFeedback(`Databasefout: ${error.message}`, 'error'); // --- NIEUW ---
        if (error.code === 'failed-precondition') {
             alert("FOUT: De database query is mislukt. Waarschijnlijk moet je een 'composite index' (voor vriezer/ladeId) aanmaken in je Firebase Console. Check de JavaScript console (F12) voor een directe link om dit te fixen.");
        }
    });
}

// ---
// STAP 5: Items Verwijderen & Bewerken (Listeners) - AANGEPAST
// ---
function handleItemLijstClick(e) {
    const editButton = e.target.closest('.edit-btn');
    const deleteButton = e.target.closest('.delete-btn');

    if (deleteButton) {
        const id = deleteButton.dataset.id;
        if (confirm("Weet je zeker dat je dit item wilt verwijderen?")) {
            itemsCollectie.doc(id).delete()
                // --- NIEUW: Feedback en foutafhandeling ---
                .then(() => {
                    showFeedback('Item verwijderd.', 'success');
                })
                .catch((err) => {
                    console.error("Fout bij verwijderen: ", err);
                    showFeedback(`Fout bij verwijderen: ${err.message}`, 'error');
                });
        }
    }
    
    if (editButton) {
        const id = editButton.dataset.id;
        itemsCollectie.doc(id).get()
            .then((doc) => {
                const item = doc.data();
                editId.value = id;
                editNaam.value = item.naam;
                editAantal.value = item.aantal;
                editEenheid.value = item.eenheid || 'stuks';
                editVriezer.value = item.vriezer;
                editSchuif.innerHTML = '';
                const gefilterdeLades = alleLades.filter(lade => lade.vriezer === item.vriezer);
                gefilterdeLades.forEach(lade => {
                    const option = document.createElement('option');
                    option.value = lade.id;
                    option.textContent = lade.naam;
                    editSchuif.appendChild(option);
                });
                editSchuif.value = item.ladeId;
                editModal.style.display = 'flex';
            })
            // --- NIEUW: Foutafhandeling ---
            .catch((err) => {
                console.error("Fout bij ophalen voor bewerken: ", err);
                showFeedback(`Fout bij ophalen: ${err.message}`, 'error');
            });
    }
}
lijstVriezer1.addEventListener('click', handleItemLijstClick);
lijstVriezer2.addEventListener('click', handleItemLijstClick);

editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = editId.value;

    const schuifDropdown = document.getElementById('edit-item-schuif');
    const geselecteerdeLadeId = schuifDropdown.value;
    const geselecteerdeLadeNaam = schuifDropdown.options[schuifDropdown.selectedIndex].text;

    itemsCollectie.doc(id).update({
        naam: editNaam.value,
        aantal: parseFloat(editAantal.value),
        eenheid: editEenheid.value,
        vriezer: editVriezer.value,
        ladeId: geselecteerdeLadeId,
        ladeNaam: geselecteerdeLadeNaam
    })
    .then(() => {
        sluitItemModal();
        // --- NIEUW: Feedback ---
        showFeedback('Item bijgewerkt!', 'success');
    })
    // --- NIEUW: Foutafhandeling ---
    .catch((err) => {
        console.error("Fout bij bijwerken: ", err);
        showFeedback(`Fout bij bijwerken: ${err.message}`, 'error');
    });
});

function sluitItemModal() { editModal.style.display = 'none'; }
btnCancel.addEventListener('click', sluitItemModal);


// ---
// STAP 6: LADE BEHEER LOGICA - AANGEPAST
// ---
beheerLadesKnop.addEventListener('click', () => {
    ladeBeheerModal.style.display = 'flex';
});
sluitLadeBeheerKnop.addEventListener('click', () => {
    ladeBeheerModal.style.display = 'none';
});

function vulLadeBeheerLijst() {
    ladesLijstV1.innerHTML = '';
    ladesLijstV2.innerHTML = '';
    alleLades.forEach(lade => {
        const li = document.createElement('li');
        const naamInput = document.createElement('input');
        naamInput.type = 'text';
        naamInput.value = lade.naam;
        naamInput.className = 'lade-naam-input';
        naamInput.dataset.id = lade.id; 
        const vriezerTekst = document.createElement('span');
        vriezerTekst.textContent = `(${lade.vriezer})`;
        
        const buttons = document.createElement('div');
        buttons.className = 'item-buttons';
        buttons.innerHTML = `
            <button class="save-btn" data-id="${lade.id}" title="Opslaan">
                <i class="fas fa-save"></i>
            </button>
            <button class="delete-btn" data-id="${lade.id}" title="Verwijder">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;
        
        li.appendChild(naamInput);
        li.appendChild(vriezerTekst);
        li.appendChild(buttons);
        if (lade.vriezer === 'Vriezer 1') {
            ladesLijstV1.appendChild(li);
        } else {
            ladesLijstV2.appendChild(li);
        }
    });
}

addLadeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const naam = document.getElementById('lade-naam').value;
    const vriezer = document.getElementById('lade-vriezer').value;
    ladesCollectie.add({
        naam: naam,
        vriezer: vriezer
    })
    .then(() => {
        addLadeForm.reset();
        // --- NIEUW: Feedback ---
        showFeedback('Nieuwe lade toegevoegd!', 'success');
    })
    // --- NIEUW: Foutafhandeling ---
    .catch((err) => {
        console.error("Fout bij toevoegen lade: ", err);
        showFeedback(`Fout: ${err.message}`, 'error');
    });
});

async function handleLadeLijstClick(e) {
    const deleteButton = e.target.closest('.delete-btn');
    const saveButton = e.target.closest('.save-btn');

    if (deleteButton) {
        const id = deleteButton.dataset.id;
        const itemsCheck = await itemsCollectie.where("ladeId", "==", id).limit(1).get();
        if (!itemsCheck.empty) {
            // --- AANGEPAST: Gebruik feedback ipv alert ---
            showFeedback('Kan lade niet verwijderen: er zitten nog items in!', 'error');
            return;
        }
        if (confirm("Weet je zeker dat je deze (lege) lade wilt verwijderen?")) {
            ladesCollectie.doc(id).delete()
                // --- NIEUW: Feedback en foutafhandeling ---
                .then(() => {
                    showFeedback('Lade verwijderd.', 'success');
                })
                .catch((err) => {
                    console.error("Fout bij verwijderen lade: ", err);
                    showFeedback(`Fout: ${err.message}`, 'error');
                });
        }
    }
    
    if (saveButton) {
        const id = saveButton.dataset.id;
        const parentLi = saveButton.closest('li');
        const inputVeld = parentLi.querySelector('.lade-naam-input');
        const nieuweNaam = inputVeld.value;
        if (nieuweNaam) {
            ladesCollectie.doc(id).update({
                naam: nieuweNaam
            })
            // --- AANGEPAST: Feedback ipv alert ---
            .then(() => {
                showFeedback('Lade hernoemd!', 'success');
            })
            // --- NIEUW: Foutafhandeling ---
            .catch((err) => {
                console.error("Fout bij hernoemen lade: ", err);
                showFeedback(`Fout: ${err.message}`, 'error');
            });
        }
    }
}
ladesLijstV1.addEventListener('click', handleLadeLijstClick);
ladesLijstV2.addEventListener('click', handleLadeLijstClick);

// ---
// STAP 7: UITLOGGEN LOGICA
// ---
logoutBtn.addEventListener('click', () => {
    if (confirm("Weet je zeker dat je wilt uitloggen?")) {
        auth.signOut()
            .then(() => {
                console.log("Gebruiker uitgelogd.");
            })
            .catch((error) => {
                console.error("Fout bij uitloggen:", error);
                showFeedback(`Fout bij uitloggen: ${error.message}`, 'error'); // --- AANGEPAST ---
            });
    }
});

// ---
// STAP 8: ZOEKBALK & FILTER LOGICA (HEVIG AANGEPAST)
// ---

// --- AANGEPAST: Listeners voor de nieuwe filters ---
searchBar.addEventListener('input', updateItemVisibility);
filterV1.addEventListener('change', updateItemVisibility);
filterV2.addEventListener('change', updateItemVisibility);


// --- AANGEPAST: Hernoemd van 'filterItems' en uitgebreid ---
function updateItemVisibility() {
    // Haal alle huidige filterwaarden op
    const searchTerm = searchBar.value.toLowerCase();
    const geselecteerdeFilterV1 = filterV1.value;
    const geselecteerdeFilterV2 = filterV2.value;
    
    // Filter lijst 1 (Vriezer 1)
    document.querySelectorAll('#lijst-vriezer-1 li').forEach(item => {
        const itemText = item.querySelector('.item-text strong').textContent.toLowerCase();
        const ladeId = item.dataset.ladeId; // Haal op uit data-attribuut
        
        // Check beide condities
        const matchesSearch = itemText.startsWith(searchTerm);
        const matchesFilter = (geselecteerdeFilterV1 === 'alles' || ladeId === geselecteerdeFilterV1);
        
        // Toon alleen als het aan BEIDE voldoet
        if (matchesSearch && matchesFilter) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
    
    // Filter lijst 2 (Vriezer 2)
    document.querySelectorAll('#lijst-vriezer-2 li').forEach(item => {
        const itemText = item.querySelector('.item-text strong').textContent.toLowerCase();
        const ladeId = item.dataset.ladeId;
        
        const matchesSearch = itemText.startsWith(searchTerm);
        const matchesFilter = (geselecteerdeFilterV2 === 'alles' || ladeId === geselecteerdeFilterV2);
        
        if (matchesSearch && matchesFilter) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
    
    // Verberg lade-titels als ze leeg zijn (deze functie is nog steeds nodig)
    checkLadesInLijst(document.getElementById('lijst-vriezer-1'));
    checkLadesInLijst(document.getElementById('lijst-vriezer-2'));
}

// Deze functie controleert of een H3-titel nog zichtbare LI-items onder zich heeft
function checkLadesInLijst(lijstElement) {
    const lades = lijstElement.querySelectorAll('.schuif-titel');
    
    lades.forEach(ladeTitel => {
        let nextElement = ladeTitel.nextElementSibling;
        let itemsInDezeLade = 0;
        let zichtbareItems = 0;

        // Blijf checken zolang het volgende element een LI is
        while (nextElement && nextElement.tagName === 'LI') {
            itemsInDezeLade++;
            // Check of het item NIET verborgen is
            if (nextElement.style.display !== 'none') {
                zichtbareItems++;
            }
            nextElement = nextElement.nextElementSibling;
        }

        // Als er items waren, maar geen zijn zichtbaar, verberg de titel
        if (itemsInDezeLade > 0 && zichtbareItems === 0) {
            ladeTitel.style.display = 'none';
        } else {
            ladeTitel.style.display = 'block';
        }
    });
}

// ---
// STAP 9: PRINT LOGICA
// ---
printBtn.addEventListener('click', () => {
    window.print();
});


// ---
// ALLES STARTEN
// ---
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log("Ingelogd als:", user.displayName || user.email || user.uid);
        laadLades(); // Dit start de hele ketting: laadLades -> laadItems -> updateItemVisibility
    } else {
        console.log("Niet ingelogd, terug naar index.html");
        window.location.replace('index.html');
    }
});
