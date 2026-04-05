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

async function saveDB() {
    if (currentFbUser && currentUser) {
        try {
            await set(ref(db, 'users/' + currentFbUser.uid), currentUser);
        } catch (e) {
            console.error("Error saving to Realtime Database:", e);
        }
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
            if (error.code.includes('user-not-found') || error.code.includes('invalid-credential')) {
                try {
                    await createUserWithEmailAndPassword(auth, email, pass);
                } catch (err2) {
                    authError.textContent = 'Error: ' + err2.message;
                    authError.style.display = 'block';
                    loginBtn.textContent = 'Entrar / Registrarse';
                }
            } else {
                authError.textContent = 'Error: ' + error.message;
                authError.style.display = 'block';
                loginBtn.textContent = 'Entrar / Registrarse';
            }
        }
    });
    
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            location.reload();
        });
    });

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentFbUser = user;
            try {
                const snapshot = await get(child(ref(db), `users/${user.uid}`));
                if (snapshot.exists()) {
                    currentUser = snapshot.val();
                    const isAdmin = user.email.toLowerCase() === 'admin' || user.email.toLowerCase() === 'admin@admin.com';
                    if (isAdmin && !currentUser.isContractPro) {
                         currentUser.isContractPro = true;
                         currentUser.isManagerPro = true;
                         currentUser.isBundle = true;
                         saveDB();
                    }
                } else {
                    const isAdmin = user.email.toLowerCase() === 'admin' || user.email.toLowerCase() === 'admin@admin.com';
                    currentUser = {
                        email: user.email,
                        isContractPro: isAdmin,
                        isManagerPro: isAdmin,
                        isBundle: isAdmin,
                        documents: [],
                        agendaTasks: [],
                        financeRecords: []
                    };
                    saveDB();
                }
                showApp();
            } catch(e) {
                authError.textContent = 'Error base de datos: ' + e.message;
                authError.style.display = 'block';
                loginBtn.textContent = 'Entrar / Registrarse';
            }
        } else {
            currentUser = null;
            currentFbUser = null;
            appView.style.display = 'none';
            authView.style.display = 'flex';
            loginBtn.textContent = 'Entrar / Registrarse';
        }
    });

    function showApp() {
        authView.style.display = 'none';
        appView.style.display = 'flex';
        document.getElementById('userEmailDisplay').textContent = currentUser.email;
        document.getElementById('userAvatar').textContent = currentUser.email.charAt(0).toUpperCase();
        
        if (currentUser.isContractPro || currentUser.isBundle) {
            unlockPremiumUI();
        } else {
            lockPremiumUI();
        }

        // Auto create 1st document if empty
        if (!currentUser.documents) currentUser.documents = [];
        if (currentUser.documents.length === 0) {
            currentUser.documents.push({ id: Date.now() });
            saveDB();
        }

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
        
        currentUser.documents.push({ id: Date.now() });
        saveDB();
        updateDocumentCount();
        form.reset();
        updateDocument();
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
                return actions.order.capture().then(function(details) {
                    modal.classList.remove('active');
                    
                    if (selectedPlan === 'bundle') {
                        currentUser.isBundle = true;
                        currentUser.isContractPro = true;
                        currentUser.isManagerPro = true;
                    } else {
                        currentUser.isContractPro = true;
                    }
                    
                    unlockPremiumUI();
                });
            },
            onError: function(err) {
                console.error('Error procesando el pago con PayPal:', err);
                alert('Ocurrió un error al procesar el pago. Por favor intenta de nuevo.');
            }
        }).render('#paypal-button-container');
    }

    function unlockPremiumUI() {
        if(currentUser) { saveDB(); }
        
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
