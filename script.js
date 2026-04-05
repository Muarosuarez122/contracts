import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyArg2GNhsnlK7-JW0w-8D4tb46V2vAgZbQ",
  authDomain: "stee-53dc1.firebaseapp.com",
  databaseURL: "https://stee-53dc1-default-rtdb.firebaseio.com",
  projectId: "stee-53dc1",
  storageBucket: "stee-53dc1.firebasestorage.app",
  messagingSenderId: "737719774829",
  appId: "1:737719774829:web:7cabfa294cae4d6d861964",
  measurementId: "G-ZV3L9Z34VE"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

let currentUser = null;
let currentFbUser = null;

async function savePremiumToFirebase() {
    if (currentFbUser && currentUser) {
        try {
            await set(ref(db, 'users/' + currentFbUser.uid), {
                isContractPro: currentUser.isContractPro,
                isManagerPro: currentUser.isManagerPro,
                isBundle: currentUser.isBundle
            });
        } catch (e) {
            console.error("Error saving Premium settings:", e);
        }
    }
}

function saveLocalData() {
    if (currentFbUser && currentUser) {
        localStorage.setItem(`contractData_${currentFbUser.uid}`, JSON.stringify({
            documents: currentUser.documents || []
        }));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    
    // --- AUTHENTICATION & STATE ---
    const authView = document.getElementById('authView');
    const appView = document.getElementById('appView');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const authError = document.getElementById('authError');
    
    loginBtn.addEventListener('click', async () => {
        const email = document.getElementById('authEmail').value.trim();
        const pass = document.getElementById('authPassword').value.trim();
        
        if (!email || !pass) {
            authError.textContent = 'Completa ambos campos.';
            authError.style.display = 'block';
            return;
        }

        loginBtn.textContent = 'Procesando...';
        authError.style.display = 'none';

        try {
            await signInWithEmailAndPassword(auth, email, pass);
        } catch (error) {
            if (error.code.includes('invalid-credential') || error.code.includes('user-not-found') || error.code.includes('wrong-password')) {
                try {
                    await createUserWithEmailAndPassword(auth, email, pass);
                } catch (err2) {
                    if (err2.code === 'auth/email-already-in-use') {
                        authError.textContent = 'Contraseña incorrecta. El usuario ya existe.';
                    } else if (err2.code === 'auth/weak-password') {
                        authError.textContent = 'La contraseña es muy débil (mínimo 6 caracteres).';
                    } else {
                        authError.textContent = 'Error: ' + err2.message;
                    }
                    authError.style.display = 'block';
                    loginBtn.textContent = 'Entrar / Registrarse';
                }
            } else {
                authError.textContent = 'Error de autenticación: ' + error.message;
                authError.style.display = 'block';
                loginBtn.textContent = 'Entrar / Registrarse';
            }
        }
    });
    
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => location.reload());
    });

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentFbUser = user;
            
            let localData = JSON.parse(localStorage.getItem(`contractData_${user.uid}`)) || { documents: [] };

            currentUser = {
                email: user.email,
                isContractPro: false,
                isManagerPro: false,
                isBundle: false,
                documents: localData.documents || []
            };

            const isAdmin = user.email.toLowerCase() === 'admin' || user.email.toLowerCase() === 'admin@admin.com';

            try {
                const snapshot = await get(child(ref(db), `users/${user.uid}`));
                if (snapshot.exists()) {
                    const dbData = snapshot.val();
                    currentUser.isContractPro = dbData.isContractPro || false;
                    currentUser.isManagerPro = dbData.isManagerPro || false;
                    currentUser.isBundle = dbData.isBundle || false;
                }
            } catch(e) {
                console.warn("Realtime DB blocked or empty for free user.");
            }

            if (isAdmin) {
                currentUser.isContractPro = true;
                currentUser.isManagerPro = true;
                currentUser.isBundle = true;
            }

            // Immediately show app without waiting for anything else to fail
            showApp();
        } else {
            currentUser = null;
            currentFbUser = null;
            appView.style.display = 'none';
            authView.style.display = 'flex';
            loginBtn.textContent = 'Entrar / Registrarse';
        }
    });

    let activeDocIndex = 0;

    function renderSavedContracts() {
        const list = document.getElementById('savedContractsList');
        if (!list) return;
        list.innerHTML = '';
        
        currentUser.documents.forEach((doc, idx) => {
            const div = document.createElement('div');
            div.className = `saved-doc-item ${idx === activeDocIndex ? 'active' : ''}`;
            
            const title = doc.data && doc.data.projectName ? doc.data.projectName : `Contrato #${idx + 1}`;
            const dateStr = new Date(doc.id || Date.now()).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            
            div.innerHTML = `<span class="doc-item-title">${title}</span><span class="doc-item-date">${dateStr}</span>`;
            
            div.addEventListener('click', () => {
                activeDocIndex = idx;
                loadDocumentToForm(doc);
                renderSavedContracts();
            });
            list.appendChild(div);
        });
    }

    function loadDocumentToForm(doc) {
        document.getElementById('contractForm').reset();
        
        if (doc && doc.data) {
            const map = {
                'contractTitle': doc.data.contractTitle,
                'freelancerName': doc.data.freelancerName,
                'clientName': doc.data.clientName,
                'projectName': doc.data.projectName,
                'projectDescription': doc.data.projectDescription,
                'price': doc.data.price,
                'currency': doc.data.currency,
                'deadline': doc.data.deadline
            };
            for (const [id, val] of Object.entries(map)) {
                if (val && document.getElementById(id)) document.getElementById(id).value = val;
            }
        }
        
        if (currentUser.isContractPro || currentUser.isBundle) {
            if (doc && doc.premiumData) {
                document.getElementById('clauseIP').checked = doc.premiumData.ip ?? true;
                if (doc.premiumData.ipText) document.getElementById('textIP').value = doc.premiumData.ipText;
                document.getElementById('customIP').style.display = doc.premiumData.ip !== false ? 'block' : 'none';

                document.getElementById('clauseNDA').checked = doc.premiumData.nda ?? true;
                if (doc.premiumData.ndaText) document.getElementById('textNDA').value = doc.premiumData.ndaText;
                document.getElementById('customNDA').style.display = doc.premiumData.nda !== false ? 'block' : 'none';

                document.getElementById('clauseLateFee').checked = doc.premiumData.lateFee ?? false;
                if (doc.premiumData.lateFeeText) document.getElementById('textLateFee').value = doc.premiumData.lateFeeText;
                document.getElementById('customLateFee').style.display = doc.premiumData.lateFee ? 'block' : 'none';
            }
        }
        
        if (typeof updateDocument === 'function') updateDocument();
    }

    function showApp() {
        authView.style.display = 'none';
        appView.style.display = 'flex';
        document.getElementById('userEmailDisplay').textContent = currentUser.email;
        document.getElementById('userAvatar').textContent = currentUser.email.charAt(0).toUpperCase();
        
        if (currentUser.isContractPro || currentUser.isBundle) {
            unlockPremiumUI();
            if (currentUser.documents && currentUser.documents.length > 0) {
                const activeDoc = currentUser.documents[currentUser.documents.length - 1];
                if (activeDoc && activeDoc.premiumData) {
                    document.getElementById('clauseIP').checked = activeDoc.premiumData.ip ?? true;
                    if (activeDoc.premiumData.ipText) document.getElementById('textIP').value = activeDoc.premiumData.ipText;
                    document.getElementById('customIP').style.display = activeDoc.premiumData.ip !== false ? 'block' : 'none';

                    document.getElementById('clauseNDA').checked = activeDoc.premiumData.nda ?? true;
                    if (activeDoc.premiumData.ndaText) document.getElementById('textNDA').value = activeDoc.premiumData.ndaText;
                    document.getElementById('customNDA').style.display = activeDoc.premiumData.nda !== false ? 'block' : 'none';

                    document.getElementById('clauseLateFee').checked = activeDoc.premiumData.lateFee ?? false;
                    if (activeDoc.premiumData.lateFeeText) document.getElementById('textLateFee').value = activeDoc.premiumData.lateFeeText;
                    document.getElementById('customLateFee').style.display = activeDoc.premiumData.lateFee ? 'block' : 'none';
                }
            }
        } else {
            lockPremiumUI();
        }

        // Auto create 1st document if empty or load existing
        if (!currentUser.documents) currentUser.documents = [];
        if (currentUser.documents.length === 0) {
            currentUser.documents.push({ id: Date.now(), data: {}, premiumData: {} });
            saveLocalData();
        }
        
        activeDocIndex = currentUser.documents.length - 1;
        loadDocumentToForm(currentUser.documents[activeDocIndex]);
        renderSavedContracts();
        
        updateDocumentCount();
    }

    // --- DOCUMENT LIMIT LOGIC & UPSELL MODALS ---
    const newContractBtn = document.getElementById('newContractBtn');
    const docCountBadge = document.getElementById('docCountBadge');
    
    function updateDocumentCount() {
        const count = currentUser.documents.length;
        docCountBadge.textContent = (currentUser.isContractPro || currentUser.isBundle) ? (count + ' / ∞') : (count + ' / 1');
    }

    const upsellModal = document.getElementById('upsellModal');
    const closeUpsell = document.getElementById('closeUpsell');
    const continueExportBtn = document.getElementById('continueExportBtn');
    const upsellUpgradeBtn = document.getElementById('upsellUpgradeBtn');
    const upsellTitle = document.getElementById('upsellTitle');
    const upsellMessage = document.getElementById('upsellMessage');
    
    newContractBtn.addEventListener('click', () => {
        if (!(currentUser.isContractPro || currentUser.isBundle) && currentUser.documents.length >= 1) {
            upsellTitle.textContent = 'Límite de Documentos';
            upsellMessage.innerHTML = 'Tu cuenta Gratuita permite un máximo de <strong>1 documento guardado</strong>. Para mantener múltiples contratos y crear uno adicional, necesitas ser PRO.';
            upsellModal.classList.add('active');
            return;
        }
        
        currentUser.documents.push({ id: Date.now(), data: {}, premiumData: {} });
        saveLocalData();
        activeDocIndex = currentUser.documents.length - 1;
        loadDocumentToForm(currentUser.documents[activeDocIndex]);
        renderSavedContracts();
        updateDocumentCount();
        alert('Nuevo documento creado. Tienes ' + currentUser.documents.length + ' en total.');
    });

    closeUpsell.addEventListener('click', () => {
        upsellModal.classList.remove('active');
    });

    continueExportBtn.addEventListener('click', () => {
        upsellModal.classList.remove('active');
        window.print();
    });

    upsellUpgradeBtn.addEventListener('click', () => {
        upsellModal.classList.remove('active');
        modal.classList.add('active');
    });

    // --- EXISTING APP & DOM ELEMENTS ---
    const form = document.getElementById('contractForm');
    const inputs = {
        contractTitle: document.getElementById('contractTitle'),
        freelancerName: document.getElementById('freelancerName'),
        clientName: document.getElementById('clientName'),
        projectName: document.getElementById('projectName'),
        projectDescription: document.getElementById('projectDescription'),
        price: document.getElementById('price'),
        currency: document.getElementById('currency'),
        deadline: document.getElementById('deadline'),
    };
    
    const premiumInputs = {
        ip: document.getElementById('clauseIP'),
        nda: document.getElementById('clauseNDA'),
        lateFee: document.getElementById('clauseLateFee'),
    };
    
    const customizers = {
        ip: { wrapper: document.getElementById('customIP'), text: document.getElementById('textIP') },
        nda: { wrapper: document.getElementById('customNDA'), text: document.getElementById('textNDA') },
        lateFee: { wrapper: document.getElementById('customLateFee'), text: document.getElementById('textLateFee') }
    };

    const outputs = {
        contractTitle: document.getElementById('docContractTitle'),
        freelancerName: document.getElementById('docFreelancerName'),
        clientName: document.getElementById('docClientName'),
        projectName: document.getElementById('docProjectName'),
        projectDescription: document.getElementById('docProjectDescription'),
        price: document.getElementById('docPrice'),
        currency: document.getElementById('docCurrency'),
        deadline: document.getElementById('docDeadline'),
        date: document.getElementById('docCurrentDate'),
        sigFreelancer: document.getElementById('sigFreelancer'),
        sigClient: document.getElementById('sigClient'),
    };

    const docArea = document.getElementById('contractDoc');
    const watermark = document.getElementById('watermark');
    const tierIndicator = document.getElementById('tierIndicator');
    const premiumClausesContainer = document.getElementById('docPremiumClauses');
    const premiumClausesList = document.getElementById('premiumClausesList');
    
    const today = new Date();
    outputs.date.textContent = today.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

    function updateDocument() {
        outputs.contractTitle.textContent = inputs.contractTitle.value || 'Contrato de Servicios Freelance';
        outputs.freelancerName.textContent = inputs.freelancerName.value || '[Tu Nombre]';
        outputs.clientName.textContent = inputs.clientName.value || '[Nombre del Cliente]';
        
        outputs.sigFreelancer.textContent = inputs.freelancerName.value || '[Tu Nombre]';
        outputs.sigClient.textContent = inputs.clientName.value || '[Nombre del Cliente]';
        
        outputs.projectName.textContent = inputs.projectName.value || '[Nombre del Proyecto]';
        outputs.projectDescription.textContent = inputs.projectDescription.value || '[Descripción del proyecto]';
        
        const priceVal = parseFloat(inputs.price.value) || 0;
        outputs.price.textContent = priceVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        outputs.currency.textContent = inputs.currency.value;
        
        if (inputs.deadline.value) {
            const dateObj = new Date(inputs.deadline.value);
            dateObj.setMinutes(dateObj.getMinutes() + dateObj.getTimezoneOffset());
            outputs.deadline.textContent = dateObj.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
        } else {
            outputs.deadline.textContent = '[Fecha]';
        }

        updatePremiumClauses();

        // Persist form payload for persistence
        if (currentUser && currentUser.documents && currentUser.documents.length > 0) {
            const activeIndex = activeDocIndex;
            currentUser.documents[activeIndex] = {
                id: currentUser.documents[activeIndex].id,
                data: {
                    contractTitle: inputs.contractTitle.value,
                    freelancerName: inputs.freelancerName.value,
                    clientName: inputs.clientName.value,
                    projectName: inputs.projectName.value,
                    projectDescription: inputs.projectDescription.value,
                    price: inputs.price.value,
                    currency: inputs.currency.value,
                    deadline: inputs.deadline.value
                },
                premiumData: {
                    ip: premiumInputs.ip.checked,
                    ipText: customizers.ip.text.value,
                    nda: premiumInputs.nda.checked,
                    ndaText: customizers.nda.text.value,
                    lateFee: premiumInputs.lateFee.checked,
                    lateFeeText: customizers.lateFee.text.value
                }
            };
            saveLocalData();
            
            // Only update titles in the sidebar without destroying the entire HTML to avoid focus loss
            const listItems = document.querySelectorAll('.saved-doc-item .doc-item-title');
            if(listItems[activeIndex]) {
                listItems[activeIndex].textContent = inputs.projectName.value || `Contrato #${activeIndex + 1}`;
            }
        }
    }

    function updatePremiumClauses() {
        if (!currentUser || !(currentUser.isContractPro || currentUser.isBundle)) {
            premiumClausesContainer.style.display = 'none';
            return;
        }

        premiumClausesList.innerHTML = '';
        let hasClauses = false;

        if (premiumInputs.ip.checked) {
            hasClauses = true;
            const li = document.createElement('li');
            li.innerHTML = `<strong>Propiedad Intelectual:</strong> ${customizers.ip.text.value}`;
            premiumClausesList.appendChild(li);
        }
        
        if (premiumInputs.nda.checked) {
            hasClauses = true;
            const li = document.createElement('li');
            li.innerHTML = `<strong>Confidencialidad:</strong> ${customizers.nda.text.value}`;
            premiumClausesList.appendChild(li);
        }

        if (premiumInputs.lateFee.checked) {
            hasClauses = true;
            const li = document.createElement('li');
            li.innerHTML = `<strong>Pagos Atrasados:</strong> ${customizers.lateFee.text.value}`;
            premiumClausesList.appendChild(li);
        }

        premiumClausesContainer.style.display = hasClauses ? 'block' : 'none';
    }

    Object.values(inputs).forEach(input => input.addEventListener('input', updateDocument));
    
    Object.keys(premiumInputs).forEach(key => {
        premiumInputs[key].addEventListener('change', (e) => {
            customizers[key].wrapper.style.display = e.target.checked ? 'block' : 'none';
            updateDocument();
        });
        customizers[key].text.addEventListener('input', updateDocument);
    });

    // --- PAYPAL CHECKOUT LOGIC WITH BUNDLE ---
    const upgradeBtn = document.getElementById('upgradeBtn');
    const modal = document.getElementById('checkoutModal');
    const closeModal = document.getElementById('closeModal');
    
    let selectedAmount = '4.00';
    let selectedPlan = 'bundle';

    if(document.getElementById('optContract')){
        document.getElementById('optContract').addEventListener('click', function() {
            this.classList.add('selected');
            document.getElementById('optBundle').classList.remove('selected');
            selectedAmount = '2.00';
            selectedPlan = 'contract';
        });
        document.getElementById('optBundle').addEventListener('click', function() {
            this.classList.add('selected');
            document.getElementById('optContract').classList.remove('selected');
            selectedAmount = '4.00';
            selectedPlan = 'bundle';
        });
    }

    upgradeBtn.addEventListener('click', () => {
        modal.classList.add('active');
    });

    closeModal.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    if (window.paypal) {
        window.paypal.Buttons({
            style: {
                layout: 'vertical',
                color:  'gold',
                shape:  'rect',
                label:  'checkout'
            },
            createOrder: function(data, actions) {
                return actions.order.create({
                    purchase_units: [{
                        amount: {
                            value: selectedAmount,
                            currency_code: 'USD'
                        },
                        description: `Licencia ${selectedPlan.toUpperCase()}`
                    }]
                });
            },
            onApprove: function(data, actions) {
                return actions.order.capture().then(async function(details) {
                    modal.classList.remove('active');
                    
                    if (selectedPlan === 'bundle') {
                        currentUser.isBundle = true;
                        currentUser.isContractPro = true;
                        currentUser.isManagerPro = true;
                    } else {
                        currentUser.isContractPro = true;
                    }
                    
                    await savePremiumToFirebase();
                    unlockPremiumUI();
                    alert('¡Pago exitoso! Cuenta mejorada.');
                });
            },
            onError: function(err) {
                console.error('Error procesando el pago con PayPal:', err);
                alert('Ocurrió un error al procesar el pago. Por favor intenta de nuevo.');
            }
        }).render('#paypal-button-container');
    }

    function unlockPremiumUI() {
        document.getElementById('userPlanDisplay').textContent = currentUser.isBundle ? "BUNDLE PRO" : "PLAN PRO";
        document.getElementById('userPlanDisplay').className = "user-plan badge-pro";
        document.getElementById('premiumBanner').style.display = 'none';
        
        const premiumSection = document.querySelector('.premium-section');
        premiumSection.classList.add('unlocked');
        Object.values(premiumInputs).forEach(input => input.disabled = false);
        
        premiumInputs.ip.checked = true;
        customizers.ip.wrapper.style.display = 'block';
        premiumInputs.nda.checked = true;
        customizers.nda.wrapper.style.display = 'block';
        
        tierIndicator.textContent = 'PRO Activado';
        tierIndicator.classList.add('pro');
        watermark.style.display = 'none';
        docArea.classList.add('premium-theme');
        
        updateDocumentCount();
        updateDocument();
    }

    function lockPremiumUI() {
        document.getElementById('userPlanDisplay').textContent = "PLAN GRATUITO";
        document.getElementById('userPlanDisplay').className = "user-plan badge-free";
        document.getElementById('premiumBanner').style.display = 'block';
        
        const premiumSection = document.querySelector('.premium-section');
        premiumSection.classList.remove('unlocked');
        Object.keys(premiumInputs).forEach(key => {
            premiumInputs[key].disabled = true;
            premiumInputs[key].checked = false;
            customizers[key].wrapper.style.display = 'none';
        });
        
        tierIndicator.textContent = 'Plan Gratuito';
        tierIndicator.classList.remove('pro');
        watermark.style.display = 'block';
        docArea.classList.remove('premium-theme');
        
        updateDocumentCount();
        updateDocument();
    }

    const printBtn = document.getElementById('printBtn');
    printBtn.addEventListener('click', () => {
        if (!(currentUser.isContractPro || currentUser.isBundle)) {
            upsellTitle.textContent = '¡Documento Listo!';
            upsellMessage.innerHTML = 'Tu contrato está en progreso. Sin embargo, recuerda que como usuario gratuito <strong>solo puedes tener 1 documento guardado</strong> y éste tiene marca de agua.';
            upsellModal.classList.add('active');
        } else {
            window.print();
        }
    });

});
