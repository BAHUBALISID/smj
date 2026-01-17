class Settings {
    constructor() {
        this.auth = auth;
        this.app = app;
        this.rates = [];
        this.init();
    }
    
    async init() {
        await this.loadRates();
        await this.loadSettings();
        this.setupEventListeners();
        this.setupRateTable();
    }
    
    setupEventListeners() {
        document.getElementById('saveRatesBtn').addEventListener('click', () => this.saveRates());
        document.getElementById('addCustomMetalBtn').addEventListener('click', () => this.showAddCustomMetalModal());
        document.getElementById('refreshRatesBtn').addEventListener('click', () => this.loadRates());
        document.getElementById('saveSettingsBtn').addEventListener('click', () => this.saveSettings());
        document.getElementById('changePasswordBtn').addEventListener('click', () this.showChangePasswordModal());
        
        document.getElementById('saveCustomMetalBtn').addEventListener('click', () => this.saveCustomMetal());
        document.getElementById('closeCustomMetalModal').addEventListener('click', () => app.hideModal('customMetalModal'));
        
        document.getElementById('savePasswordBtn').addEventListener('click', () => this.changePassword());
        document.getElementById('closePasswordModal').addEventListener('click', () => app.hideModal('changePasswordModal'));
        
        document.getElementById('gstType').addEventListener('change', (e) => this.onGstTypeChange(e));
        document.getElementById('autoCalculateGold').addEventListener('change', (e) => this.onAutoCalculateChange(e, 'GOLD'));
        document.getElementById('autoCalculateSilver').addEventListener('change', (e) => this.onAutoCalculateChange(e, 'SILVER'));
    }
    
    async loadRates() {
        try {
            this.rates = await this.auth.request('/rates/all');
            this.displayRates();
        } catch (error) {
            console.error('Error loading rates:', error);
            app.showToast('Failed to load rates', 'error');
        }
    }
    
    displayRates() {
        const container = document.getElementById('ratesTable');
        if (!container) return;
        
        if (!this.rates || this.rates.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <p>No rates found</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        this.rates.forEach(rate => {
            html += `
                <tr>
                    <td>${rate.metal_type}</td>
                    <td>${rate.purity}</td>
                    <td>
                        <input type="number" class="rate-input" data-metal="${rate.metal_type}" data-purity="${rate.purity}" 
                               value="${rate.rate_per_gm}" step="0.01" min="0" style="width: 120px;">
                    </td>
                    <td>${rate.auto_calculate ? 'Yes' : 'No'}</td>
                    <td>${rate.updated_by_name || '-'}</td>
                    <td>${app.formatDateTime(rate.effective_from)}</td>
                </tr>
            `;
        });
        
        container.innerHTML = html;
        
        this.attachRateEventListeners();
    }
    
    attachRateEventListeners() {
        document.querySelectorAll('.rate-input').forEach(input => {
            input.addEventListener('change', (e) => this.onRateChange(e));
        });
    }
    
    onRateChange(e) {
        const input = e.target;
        const metalType = input.getAttribute('data-metal');
        const purity = input.getAttribute('data-purity');
        const newRate = parseFloat(input.value);
        
        const row = input.closest('tr');
        row.classList.add('rate-changed');
        
        this.updateAutoRates(metalType, purity, newRate);
    }
    
    updateAutoRates(baseMetal, basePurity, newRate) {
        if (baseMetal === 'GOLD' && basePurity === '24K') {
            const purities = ['22K', '18K', '14K', '10K', '8K'];
            purities.forEach(purity => {
                const calculatedRate = newRate * (parseInt(purity) / 24);
                const input = document.querySelector(`.rate-input[data-metal="GOLD"][data-purity="${purity}"]`);
                if (input) {
                    input.value = calculatedRate.toFixed(2);
                    const row = input.closest('tr');
                    row.classList.add('rate-changed');
                }
            });
        } else if (baseMetal === 'SILVER' && basePurity === '999') {
            const purities = ['925', '900', '800'];
            purities.forEach(purity => {
                const calculatedRate = newRate * (parseInt(purity) / 999);
                const input = document.querySelector(`.rate-input[data-metal="SILVER"][data-purity="${purity}"]`);
                if (input) {
                    input.value = calculatedRate.toFixed(2);
                    const row = input.closest('tr');
                    row.classList.add('rate-changed');
                }
            });
        }
    }
    
    async saveRates() {
        const changedRates = [];
        
        document.querySelectorAll('.rate-changed').forEach(row => {
            const inputs = row.querySelectorAll('.rate-input');
            inputs.forEach(input => {
                const metalType = input.getAttribute('data-metal');
                const purity = input.getAttribute('data-purity');
                const rate = parseFloat(input.value);
                
                changedRates.push({ metalType, purity, rate });
            });
        });
        
        if (changedRates.length === 0) {
            app.showToast('No changes to save', 'info');
            return;
        }
        
        const restore = app.showLoading(document.getElementById('saveRatesBtn'));
        
        try {
            for (const rate of changedRates) {
                await this.auth.request('/rates/update', {
                    method: 'POST',
                    body: JSON.stringify(rate)
                });
            }
            
            document.querySelectorAll('.rate-changed').forEach(row => {
                row.classList.remove('rate-changed');
            });
            
            app.showToast('Rates updated successfully', 'success');
            this.loadRates();
            
        } catch (error) {
            app.showToast(`Failed to save rates: ${error.message}`, 'error');
        } finally {
            restore();
        }
    }
    
    setupRateTable() {
        const table = document.getElementById('ratesTable');
        if (!table) return;
        
        table.addEventListener('input', (e) => {
            if (e.target.classList.contains('rate-input')) {
                const row = e.target.closest('tr');
                row.classList.add('rate-changed');
            }
        });
    }
    
    showAddCustomMetalModal() {
        document.getElementById('customMetalModalTitle').textContent = 'Add Custom Metal';
        document.getElementById('customMetalName').value = '';
        document.getElementById('customMetalPurity').value = '';
        document.getElementById('customMetalRate').value = '';
        
        app.showModal('customMetalModal');
    }
    
    async saveCustomMetal() {
        const metalName = document.getElementById('customMetalName').value.trim().toUpperCase();
        const purity = document.getElementById('customMetalPurity').value.trim();
        const rate = parseFloat(document.getElementById('customMetalRate').value);
        
        if (!metalName || !purity || isNaN(rate)) {
            app.showToast('All fields are required and rate must be a number', 'error');
            return;
        }
        
        const restore = app.showLoading(document.getElementById('saveCustomMetalBtn'));
        
        try {
            await this.auth.request('/rates/custom', {
                method: 'POST',
                body: JSON.stringify({
                    metalName,
                    purity,
                    rate
                })
            });
            
            app.showToast('Custom metal added successfully', 'success');
            app.hideModal('customMetalModal');
            this.loadRates();
            
        } catch (error) {
            app.showToast(`Failed to add custom metal: ${error.message}`, 'error');
        } finally {
            restore();
        }
    }
    
    async loadSettings() {
        try {
            const settings = await this.auth.request('/settings/all');
            this.populateSettings(settings);
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }
    
    populateSettings(settings) {
        settings.forEach(setting => {
            const element = document.getElementById(setting.setting_key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = setting.setting_value === 'true';
                } else {
                    element.value = setting.setting_value || '';
                }
            }
        });
    }
    
    async saveSettings() {
        const settings = {
            business_name: document.getElementById('businessName').value.trim(),
            business_address: document.getElementById('businessAddress').value.trim(),
            business_phone: document.getElementById('businessPhone').value.trim(),
            business_email: document.getElementById('businessEmail').value.trim(),
            gst_number: document.getElementById('gstNumber').value.trim(),
            gst_type: document.getElementById('gstType').value,
            auto_calculate_gold: document.getElementById('autoCalculateGold').checked,
            auto_calculate_silver: document.getElementById('autoCalculateSilver').checked,
            enable_whatsapp: document.getElementById('enableWhatsApp').checked,
            enable_sms: document.getElementById('enableSMS').checked,
            reminder_days: document.getElementById('reminderDays').value,
            advance_lock_days: document.getElementById('advanceLockDays').value
        };
        
        const restore = app.showLoading(document.getElementById('saveSettingsBtn'));
        
        try {
            await this.auth.request('/settings/save', {
                method: 'POST',
                body: JSON.stringify(settings)
            });
            
            app.showToast('Settings saved successfully', 'success');
            
        } catch (error) {
            app.showToast(`Failed to save settings: ${error.message}`, 'error');
        } finally {
            restore();
        }
    }
    
    onGstTypeChange(e) {
        const gstType = e.target.value;
        const gstNumberInput = document.getElementById('gstNumber');
        
        if (gstType === 'none') {
            gstNumberInput.disabled = true;
            gstNumberInput.value = '';
        } else {
            gstNumberInput.disabled = false;
        }
    }
    
    onAutoCalculateChange(e, metalType) {
        const enabled = e.target.checked;
        const rates = this.rates.filter(rate => rate.metal_type === metalType && rate.purity !== (metalType === 'GOLD' ? '24K' : '999'));
        
        rates.forEach(rate => {
            const input = document.querySelector(`.rate-input[data-metal="${metalType}"][data-purity="${rate.purity}"]`);
            if (input) {
                input.disabled = enabled;
            }
        });
    }
    
    showChangePasswordModal() {
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
        
        app.showModal('changePasswordModal');
    }
    
    async changePassword() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (!currentPassword || !newPassword || !confirmPassword) {
            app.showToast('All password fields are required', 'error');
            return;
        }
        
        if (newPassword.length < 6) {
            app.showToast('New password must be at least 6 characters', 'error');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            app.showToast('New password and confirmation do not match', 'error');
            return;
        }
        
        const restore = app.showLoading(document.getElementById('savePasswordBtn'));
        
        try {
            await this.auth.request('/auth/change-password', {
                method: 'POST',
                body: JSON.stringify({
                    oldPassword: currentPassword,
                    newPassword: newPassword
                })
            });
            
            app.showToast('Password changed successfully', 'success');
            app.hideModal('changePasswordModal');
            
        } catch (error) {
            app.showToast(`Failed to change password: ${error.message}`, 'error');
        } finally {
            restore();
        }
    }
}

const settings = new Settings();
