document.addEventListener('DOMContentLoaded', () => {
    // --- AUTHENTICATION & STATE ---
    let currentUser = null;
    let usersDb = JSON.parse(localStorage.getItem('procontract_users')) || {};
    
    const authView = document.getElementById('authView');
    const appView = document.getElementById('appView');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    // Check if logged in locally
    const activeSession = sessionStorage.getItem('active_user');
    if (activeSession && usersDb[activeSession]) {
        currentUser = usersDb[activeSession];
        showApp();
    }
    
    loginBtn.addEventListener('click', () => {
        const email = document.getElementById('authEmail').value.trim();
        const pass = document.getElementById('authPassword').value.trim();
        
        if (!email || !pass) {
            document.getElementById('authError').style.display = 'block';
            return;
        }
        
        if (!usersDb[email]) {
            // Register new user
            const isSpecialAdmin = email.toLowerCase() === 'admin@admin.com' || email.toLowerCase() === 'admin';
            usersDb[email] = {
                email: email,
                isPremium: isSpecialAdmin, // Automatically grant PRO to admin
                documents: []
            };
            saveDB();
        } else {
            // Force admin upgrade if user already exists
            const isSpecialAdmin = email.toLowerCase() === 'admin@admin.com' || email.toLowerCase() === 'admin';
            if (isSpecialAdmin) {
                usersDb[email].isPremium = true;
                saveDB();
            }
        }
        
        currentUser = usersDb[email];
        sessionStorage.setItem('active_user', email);
        showApp();
    });
    
    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('active_user');
        currentUser = null;
        appView.style.display = 'none';
        authView.style.display = 'flex';
        document.getElementById('authEmail').value = '';
        document.getElementById('authPassword').value = '';
    });

    function saveDB() {
        localStorage.setItem('procontract_users', JSON.stringify(usersDb));
    }
    
    function showApp() {
        authView.style.display = 'none';
        appView.style.display = 'flex';
        document.getElementById('userEmailDisplay').textContent = currentUser.email;
        document.getElementById('userAvatar').textContent = currentUser.email.charAt(0).toUpperCase();
        
        if (currentUser.isPremium) {
            unlockPremiumUI();
        } else {
            lockPremiumUI();
        }

        // Auto create 1st document if empty
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
        docCountBadge.textContent = currentUser.isPremium ? (count + ' / ∞') : (count + ' / 1');
    }

    const upsellModal = document.getElementById('upsellModal');
    const closeUpsell = document.getElementById('closeUpsell');
    const continueExportBtn = document.getElementById('continueExportBtn');
    const upsellUpgradeBtn = document.getElementById('upsellUpgradeBtn');
    const upsellTitle = document.getElementById('upsellTitle');
    const upsellMessage = document.getElementById('upsellMessage');
    
    newContractBtn.addEventListener('click', () => {
        if (!currentUser.isPremium && currentUser.documents.length >= 1) {
            upsellTitle.textContent = 'Límite de Documentos';
            upsellMessage.innerHTML = 'Tu cuenta Gratuita permite un máximo de <strong>1 documento guardado</strong>. Para mantener múltiples contratos y crear uno adicional, necesitas ser PRO.';
            upsellModal.classList.add('active');
            return;
        }
        
        // Add new blank document logic for PRO users
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
        // Actually print
        window.print();
    });

    upsellUpgradeBtn.addEventListener('click', () => {
        upsellModal.classList.remove('active');
        modal.classList.add('active'); // show paypal modal
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
    
    // Set Initial Config
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
        if (!currentUser || !currentUser.isPremium) {
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

    // --- PAYPAL CHECKOUT LOGIC ---
    const upgradeBtn = document.getElementById('upgradeBtn');
    const modal = document.getElementById('checkoutModal');
    const closeModal = document.getElementById('closeModal');

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
                            value: '2.00',
                            currency_code: 'USD'
                        },
                        description: 'Licencia Premium ProContract'
                    }]
                });
            },
            onApprove: function(data, actions) {
                return actions.order.capture().then(function(details) {
                    console.log('Pago completado por', details.payer.name.given_name);
                    modal.classList.remove('active');
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
        if(currentUser) {
            currentUser.isPremium = true;
            saveDB();
        }
        
        document.getElementById('userPlanDisplay').textContent = "PLAN PRO";
        document.getElementById('userPlanDisplay').className = "user-plan badge-pro";
        document.getElementById('premiumBanner').style.display = 'none';
        
        const premiumSection = document.querySelector('.premium-section');
        premiumSection.classList.add('unlocked');
        Object.values(premiumInputs).forEach(input => input.disabled = false);
        
        // Auto check advanced clauses
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

    // --- PRINT / EXPORT LOGIC ---
    const printBtn = document.getElementById('printBtn');
    printBtn.addEventListener('click', () => {
        if (!currentUser.isPremium) {
            upsellTitle.textContent = '¡Documento Listo!';
            upsellMessage.innerHTML = 'Tu contrato está en progreso. Sin embargo, recuerda que como usuario gratuito <strong>solo puedes tener 1 documento guardado</strong> y éste tiene marca de agua.';
            upsellModal.classList.add('active');
        } else {
            window.print();
        }
    });
});
