class Exchange {
    constructor() {
        this.auth = auth;
        this.app = app;
        this.currentItemIndex = 0;
        this.items = [this.createEmptyItem()];
        this.photos = [];
        this.customer = null;
        this.init();
    }
    
    createEmptyItem() {
        return {
            description: '',
            metal_type: 'GOLD',
            purity: '22K',
            unit: 'GM',
            quantity: 1,
            gross_weight: 0,
            less_weight: 0,
            net_weight: 0,
            making_type: '',
            making_charges: 0,
            discount_percent: 0,
            stone_charge: 0,
            huid_charge: 0,
            huid_number: '',
            diamond_certificate: '',
            notes: ''
        };
    }
    
    async init() {
        await this.loadRates();
        await this.loadInventory();
        this.setupEventListeners();
        this.renderItems();
        this.updateCalculations();
    }
    
    async loadRates() {
        try {
            const rates = await this.auth.request('/rates/all');
            this.rates = rates.reduce((acc, rate) => {
                acc[`${rate.metal_type}_${rate.purity}`] = rate.rate_per_gm;
                return acc;
            }, {});
        } catch (error) {
            console.error('Error loading rates:', error);
            this.rates = {};
        }
    }
    
    async loadInventory() {
        try {
            const inventory = await this.auth.request('/inventory/search?limit=100');
            this.inventory = inventory.map(item => item.name);
        } catch (error) {
            console.error('Error loading inventory:', error);
            this.inventory = [];
        }
    }
    
    setupEventListeners() {
        document.getElementById('addItemBtn').addEventListener('click', () => this.addItem());
        document.getElementById('searchCustomerBtn').addEventListener('click', () => this.searchCustomer());
        document.getElementById('clearCustomerBtn').addEventListener('click', () => this.clearCustomer());
        document.getElementById('settlementType').addEventListener('change', (e) => this.onSettlementTypeChange(e));
        document.getElementById('saveExchangeBtn').addEventListener('click', () => this.saveExchange());
        document.getElementById('printExchangeBtn').addEventListener('click', () => this.printExchange());
        document.getElementById('clearExchangeBtn').addEventListener('click', () => this.clearExchange());
        
        document.getElementById('customerSearchInput').addEventListener('input', (e) => this.handleCustomerSearch(e));
        
        document.getElementById('oldItemPhoto').addEventListener('change', (e) => this.handlePhotoUpload(e, 'old_item'));
        document.getElementById('newItemPhoto').addEventListener('change', (e) => this.handlePhotoUpload(e, 'new_item'));
        
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges()) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }
    
    addItem() {
        this.items.push(this.createEmptyItem());
        this.currentItemIndex = this.items.length - 1;
        this.renderItems();
        this.updateCalculations();
    }
    
    removeItem(index) {
        if (this.items.length <= 1) {
            app.showToast('At least one item is required', 'error');
            return;
        }
        
        if (confirm('Are you sure you want to remove this item?')) {
            this.items.splice(index, 1);
            this.currentItemIndex = Math.max(0, index - 1);
            this.renderItems();
            this.updateCalculations();
        }
    }
    
    renderItems() {
        const container = document.getElementById('itemsContainer');
        container.innerHTML = '';
        
        this.items.forEach((item, index) => {
            const itemElement = this.createItemElement(item, index);
            container.appendChild(itemElement);
        });
        
        this.attachItemEventListeners();
        this.updateAutocomplete();
    }
    
    createItemElement(item, index) {
        const div = document.createElement('div');
        div.className = 'item-row';
        div.innerHTML = `
            <div class="item-header">
                <div class="item-number">New Item ${index + 1}</div>
                <div class="item-actions">
                    <button type="button" class="btn btn-secondary btn-small" onclick="exchange.toggleItem(${index})">
                        <i class="fas fa-${index === this.currentItemIndex ? 'minus' : 'plus'}"></i>
                    </button>
                    <button type="button" class="btn btn-danger btn-small" onclick="exchange.removeItem(${index})" ${this.items.length <= 1 ? 'disabled' : ''}>
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="item-form" style="display: ${index === this.currentItemIndex ? 'grid' : 'none'};">
                <div class="input-group">
                    <label for="description${index}"><i class="fas fa-tag"></i> Description</label>
                    <input type="text" id="description${index}" class="description-input" 
                           value="${item.description}" data-index="${index}" 
                           placeholder="Enter item description">
                </div>
                
                <div class="input-group">
                    <label for="metalType${index}"><i class="fas fa-gem"></i> Metal Type</label>
                    <select id="metalType${index}" class="metal-type" data-index="${index}">
                        <option value="GOLD" ${item.metal_type === 'GOLD' ? 'selected' : ''}>Gold</option>
                        <option value="SILVER" ${item.metal_type === 'SILVER' ? 'selected' : ''}>Silver</option>
                        <option value="DIAMOND" ${item.metal_type === 'DIAMOND' ? 'selected' : ''}>Diamond</option>
                        <option value="PLATINUM" ${item.metal_type === 'PLATINUM' ? 'selected' : ''}>Platinum</option>
                        <option value="OTHER" ${item.metal_type === 'OTHER' ? 'selected' : ''}>Other</option>
                    </select>
                </div>
                
                <div class="input-group">
                    <label for="purity${index}"><i class="fas fa-percentage"></i> Purity</label>
                    <select id="purity${index}" class="purity-select" data-index="${index}">
                        ${this.getPurityOptions(item.metal_type, item.purity)}
                    </select>
                </div>
                
                <div class="input-group">
                    <label for="unit${index}"><i class="fas fa-balance-scale"></i> Unit</label>
                    <select id="unit${index}" class="unit-select" data-index="${index}">
                        <option value="GM" ${item.unit === 'GM' ? 'selected' : ''}>Gram (GM)</option>
                        <option value="PCS" ${item.unit === 'PCS' ? 'selected' : ''}>Piece (PCS)</option>
                    </select>
                </div>
                
                <div class="input-group">
                    <label for="quantity${index}"><i class="fas fa-hashtag"></i> Quantity</label>
                    <input type="number" id="quantity${index}" class="quantity-input" 
                           value="${item.quantity}" data-index="${index}" min="1" step="0.001">
                </div>
                
                <div class="input-group">
                    <label for="grossWeight${index}"><i class="fas fa-weight"></i> Gross Weight (GM)</label>
                    <input type="number" id="grossWeight${index}" class="weight-input" 
                           value="${item.gross_weight}" data-index="${index}" min="0" step="0.001">
                </div>
                
                <div class="input-group">
                    <label for="lessWeight${index}"><i class="fas fa-minus-circle"></i> Less Weight (GM)</label>
                    <input type="number" id="lessWeight${index}" class="weight-input" 
                           value="${item.less_weight}" data-index="${index}" min="0" step="0.001">
                </div>
                
                <div class="input-group">
                    <label for="netWeight${index}"><i class="fas fa-calculator"></i> Net Weight (GM)</label>
                    <input type="text" id="netWeight${index}" class="net-weight-display" 
                           value="${item.net_weight}" readonly>
                </div>
                
                <div class="input-group">
                    <label for="makingType${index}"><i class="fas fa-tools"></i> Making Type</label>
                    <select id="makingType${index}" class="making-type" data-index="${index}">
                        <option value="" ${!item.making_type ? 'selected' : ''}>Select Making Type</option>
                        <option value="Handmade" ${item.making_type === 'Handmade' ? 'selected' : ''}>Handmade</option>
                        <option value="Machine" ${item.making_type === 'Machine' ? 'selected' : ''}>Machine</option>
                        <option value="Casting" ${item.making_type === 'Casting' ? 'selected' : ''}>Casting</option>
                        <option value="Polished" ${item.making_type === 'Polished' ? 'selected' : ''}>Polished</option>
                    </select>
                </div>
                
                <div class="input-group">
                    <label for="makingCharges${index}"><i class="fas fa-rupee-sign"></i> Making Charges</label>
                    <input type="number" id="makingCharges${index}" class="making-charges" 
                           value="${item.making_charges}" data-index="${index}" min="0" step="0.01">
                </div>
                
                <div class="input-group">
                    <label for="discountPercent${index}"><i class="fas fa-percent"></i> Discount %</label>
                    <input type="number" id="discountPercent${index}" class="discount-percent" 
                           value="${item.discount_percent}" data-index="${index}" min="0" max="100" step="0.01">
                </div>
                
                <div class="input-group">
                    <label for="stoneCharge${index}"><i class="fas fa-gem"></i> Stone/Diamond Charge</label>
                    <input type="number" id="stoneCharge${index}" class="stone-charge" 
                           value="${item.stone_charge}" data-index="${index}" min="0" step="0.01">
                </div>
                
                <div class="input-group">
                    <label for="huidCharge${index}"><i class="fas fa-qrcode"></i> HUID Charge</label>
                    <input type="number" id="huidCharge${index}" class="huid-charge" 
                           value="${item.huid_charge}" data-index="${index}" min="0" step="0.01">
                </div>
                
                <div class="input-group">
                    <label for="huidNumber${index}"><i class="fas fa-barcode"></i> HUID Number</label>
                    <input type="text" id="huidNumber${index}" class="huid-number" 
                           value="${item.huid_number}" data-index="${index}" 
                           placeholder="Enter HUID number">
                </div>
                
                <div class="input-group" id="diamondCertificateContainer${index}" style="display: ${item.metal_type === 'DIAMOND' ? 'block' : 'none'};">
                    <label for="diamondCertificate${index}"><i class="fas fa-certificate"></i> Diamond Certificate</label>
                    <input type="text" id="diamondCertificate${index}" class="diamond-certificate" 
                           value="${item.diamond_certificate}" data-index="${index}" 
                           placeholder="Certificate number">
                </div>
                
                <div class="input-group">
                    <label for="notes${index}"><i class="fas fa-sticky-note"></i> Notes (Printable)</label>
                    <textarea id="notes${index}" class="item-notes" data-index="${index}" 
                              rows="2" placeholder="Item notes (will be printed)">${item.notes}</textarea>
                </div>
            </div>
        `;
        return div;
    }
    
    getPurityOptions(metalType, currentPurity) {
        const purityMap = {
            'GOLD': ['24K', '22K', '18K', '14K', '10K', '8K'],
            'SILVER': ['999', '925', '900', '800'],
            'DIAMOND': ['VVS', 'VS', 'SI', 'I'],
            'PLATINUM': ['950', '900'],
            'OTHER': ['CUSTOM']
        };
        
        const purities = purityMap[metalType] || ['CUSTOM'];
        return purities.map(purity => 
            `<option value="${purity}" ${purity === currentPurity ? 'selected' : ''}>${purity}</option>`
        ).join('');
    }
    
    attachItemEventListeners() {
        document.querySelectorAll('.description-input').forEach(input => {
            input.addEventListener('input', (e) => this.onItemFieldChange(e));
        });
        
        document.querySelectorAll('.metal-type').forEach(select => {
            select.addEventListener('change', (e) => this.onMetalTypeChange(e));
        });
        
        document.querySelectorAll('.weight-input').forEach(input => {
            input.addEventListener('input', (e) => this.onWeightChange(e));
        });
        
        document.querySelectorAll('.quantity-input, .making-charges, .discount-percent, .stone-charge, .huid-charge').forEach(input => {
            input.addEventListener('input', (e) => this.onItemFieldChange(e));
        });
        
        document.querySelectorAll('.item-notes').forEach(textarea => {
            textarea.addEventListener('input', (e) => this.onItemFieldChange(e));
        });
    }
    
    onItemFieldChange(e) {
        const index = parseInt(e.target.getAttribute('data-index'));
        const field = e.target.className.split(' ')[0];
        const value = e.target.value;
        
        if (field === 'description-input') {
            this.items[index].description = value;
        } else if (field === 'quantity-input') {
            this.items[index].quantity = parseFloat(value) || 0;
        } else if (field === 'making-charges') {
            this.items[index].making_charges = parseFloat(value) || 0;
        } else if (field === 'discount-percent') {
            this.items[index].discount_percent = parseFloat(value) || 0;
        } else if (field === 'stone-charge') {
            this.items[index].stone_charge = parseFloat(value) || 0;
        } else if (field === 'huid-charge') {
            this.items[index].huid_charge = parseFloat(value) || 0;
        } else if (field === 'huid-number') {
            this.items[index].huid_number = value;
        } else if (field === 'diamond-certificate') {
            this.items[index].diamond_certificate = value;
        } else if (field === 'item-notes') {
            this.items[index].notes = value;
        }
        
        this.updateCalculations();
    }
    
    onMetalTypeChange(e) {
        const index = parseInt(e.target.getAttribute('data-index'));
        const metalType = e.target.value;
        
        this.items[index].metal_type = metalType;
        this.items[index].purity = this.getDefaultPurity(metalType);
        
        this.renderItems();
        this.updateCalculations();
    }
    
    getDefaultPurity(metalType) {
        const defaults = {
            'GOLD': '22K',
            'SILVER': '925',
            'DIAMOND': 'VVS',
            'PLATINUM': '950',
            'OTHER': 'CUSTOM'
        };
        return defaults[metalType] || 'CUSTOM';
    }
    
    onWeightChange(e) {
        const index = parseInt(e.target.getAttribute('data-index'));
        const field = e.target.id.includes('gross') ? 'gross_weight' : 'less_weight';
        const value = parseFloat(e.target.value) || 0;
        
        this.items[index][field] = value;
        
        const netWeight = Math.max(0, this.items[index].gross_weight - this.items[index].less_weight);
        this.items[index].net_weight = netWeight;
        
        document.getElementById(`netWeight${index}`).value = netWeight.toFixed(3);
        
        this.updateCalculations();
    }
    
    toggleItem(index) {
        if (this.currentItemIndex === index) {
            this.currentItemIndex = -1;
        } else {
            this.currentItemIndex = index;
        }
        this.renderItems();
    }
    
    updateAutocomplete() {
        document.querySelectorAll('.description-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const value = e.target.value.toLowerCase();
                const suggestions = this.inventory.filter(item => 
                    item.toLowerCase().includes(value)
                );
                
                this.showAutocompleteSuggestions(e.target, suggestions);
            });
        });
    }
    
    showAutocompleteSuggestions(input, suggestions) {
        let dropdown = input.parentNode.querySelector('.autocomplete-dropdown');
        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.className = 'autocomplete-dropdown';
            input.parentNode.appendChild(dropdown);
        }
        
        if (suggestions.length === 0 || !input.value) {
            dropdown.style.display = 'none';
            return;
        }
        
        dropdown.innerHTML = suggestions.slice(0, 10).map(suggestion => `
            <div class="autocomplete-item">${suggestion}</div>
        `).join('');
        
        dropdown.style.display = 'block';
        dropdown.style.position = 'absolute';
        dropdown.style.top = '100%';
        dropdown.style.left = '0';
        dropdown.style.right = '0';
        dropdown.style.background = 'white';
        dropdown.style.border = '1px solid #ccc';
        dropdown.style.zIndex = '1000';
        dropdown.style.maxHeight = '200px';
        dropdown.style.overflowY = 'auto';
        
        dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => {
                input.value = item.textContent;
                dropdown.style.display = 'none';
                const index = parseInt(input.getAttribute('data-index'));
                this.items[index].description = item.textContent;
                this.onItemFieldChange({ target: input });
            });
        });
        
        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
    }
    
    async searchCustomer() {
        const searchInput = document.getElementById('customerSearchInput');
        const searchTerm = searchInput.value.trim();
        
        if (!searchTerm) {
            app.showToast('Please enter search term', 'error');
            return;
        }
        
        try {
            const customers = await this.auth.request(`/customers/search?search=${encodeURIComponent(searchTerm)}&limit=10`);
            this.displayCustomerSearchResults(customers);
        } catch (error) {
            app.showToast('Error searching customers', 'error');
        }
    }
    
    displayCustomerSearchResults(customers) {
        const resultsContainer = document.getElementById('customerSearchResults');
        resultsContainer.innerHTML = '';
        
        if (!customers || customers.length === 0) {
            resultsContainer.innerHTML = '<div class="search-result-item">No customers found</div>';
            return;
        }
        
        customers.forEach(customer => {
            const div = document.createElement('div');
            div.className = 'search-result-item';
            div.innerHTML = `
                <div style="font-weight: 600;">${customer.name}</div>
                <div style="font-size: 0.9rem; color: #666;">${customer.phone}${customer.phone_alt ? ` / ${customer.phone_alt}` : ''}</div>
                <div style="font-size: 0.9rem; margin-top: 5px;">
                    <span>Total: ₹${customer.total_purchases ? customer.total_purchases.toFixed(2) : '0.00'}</span>
                    <span style="float: right;">Last: ${customer.last_purchase_date || 'Never'}</span>
                </div>
            `;
            div.addEventListener('click', () => this.selectCustomer(customer));
            resultsContainer.appendChild(div);
        });
    }
    
    selectCustomer(customer) {
        this.customer = customer;
        
        document.getElementById('customerName').value = customer.name;
        document.getElementById('customerPhone').value = customer.phone;
        document.getElementById('customerPhoneAlt').value = customer.phone_alt || '';
        document.getElementById('customerAadhaar').value = customer.aadhaar || '';
        document.getElementById('customerPAN').value = customer.pan || '';
        document.getElementById('customerGST').value = customer.gst_number || '';
        document.getElementById('customerAddress').value = customer.address || '';
        
        app.hideModal('customerSearchModal');
        app.showToast('Customer selected successfully', 'success');
    }
    
    clearCustomer() {
        this.customer = null;
        
        document.getElementById('customerName').value = '';
        document.getElementById('customerPhone').value = '';
        document.getElementById('customerPhoneAlt').value = '';
        document.getElementById('customerAadhaar').value = '';
        document.getElementById('customerPAN').value = '';
        document.getElementById('customerGST').value = '';
        document.getElementById('customerAddress').value = '';
        
        app.showToast('Customer cleared', 'success');
    }
    
    handleCustomerSearch(e) {
        const searchTerm = e.target.value.trim();
        if (searchTerm.length >= 2) {
            this.searchCustomer();
        }
    }
    
    onSettlementTypeChange(e) {
        const settlementType = e.target.value;
        const cashFields = document.getElementById('cashFields');
        const newItemFields = document.getElementById('newItemFields');
        
        if (settlementType === 'cash') {
            cashFields.style.display = 'block';
            newItemFields.style.display = 'none';
        } else {
            cashFields.style.display = 'none';
            newItemFields.style.display = 'block';
        }
        
        this.updateCalculations();
    }
    
    handlePhotoUpload(e, type) {
        const file = e.target.files[0];
        if (!file) return;
        
        if (file.size > 5 * 1024 * 1024) {
            app.showToast('File size must be less than 5MB', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.photos.push({
                file: file,
                preview: e.target.result,
                type: type,
                description: file.name
            });
            
            this.updatePhotoPreview();
        };
        reader.readAsDataURL(file);
    }
    
    updatePhotoPreview() {
        const previewContainer = document.getElementById('photoPreview');
        if (!previewContainer) return;
        
        previewContainer.innerHTML = '';
        
        this.photos.forEach((photo, index) => {
            const div = document.createElement('div');
            div.className = 'photo-item';
            div.innerHTML = `
                <img src="${photo.preview}" alt="${photo.description}">
                <button type="button" class="photo-remove" onclick="exchange.removePhoto(${index})">
                    <i class="fas fa-times"></i>
                </button>
                <div class="photo-type">${photo.type === 'old_item' ? 'Old Item' : 'New Item'}</div>
            `;
            previewContainer.appendChild(div);
        });
    }
    
    removePhoto(index) {
        this.photos.splice(index, 1);
        this.updatePhotoPreview();
    }
    
    updateCalculations() {
        let totalNewValue = 0;
        let oldValue = parseFloat(document.getElementById('oldValue').value) || 0;
        
        this.items.forEach((item) => {
            const rateKey = `${item.metal_type}_${item.purity}`;
            const metalRate = this.rates[rateKey] || 0;
            
            const netWeight = item.net_weight || 0;
            const metalValue = netWeight * metalRate;
            
            const makingDiscount = item.making_charges * (item.discount_percent / 100);
            const netMakingCharges = item.making_charges - makingDiscount;
            
            const itemTotal = metalValue + netMakingCharges + item.stone_charge + item.huid_charge;
            totalNewValue += itemTotal;
        });
        
        const settlementType = document.getElementById('settlementType').value;
        let cashAmount = 0;
        let differenceAmount = 0;
        
        if (settlementType === 'cash') {
            cashAmount = parseFloat(document.getElementById('cashAmount').value) || 0;
            differenceAmount = cashAmount - oldValue;
        } else {
            differenceAmount = totalNewValue - oldValue;
        }
        
        document.getElementById('totalOldValue').value = oldValue.toFixed(2);
        document.getElementById('totalNewValue').value = totalNewValue.toFixed(2);
        document.getElementById('differenceAmount').value = differenceAmount.toFixed(2);
        
        const differenceDisplay = document.getElementById('differenceDisplay');
        differenceDisplay.textContent = `₹${Math.abs(differenceAmount).toFixed(2)}`;
        differenceDisplay.style.color = differenceAmount >= 0 ? '#28a745' : '#dc3545';
        differenceDisplay.innerHTML = `${differenceAmount >= 0 ? 'To Receive' : 'To Pay'}: ₹${Math.abs(differenceAmount).toFixed(2)}`;
    }
    
    async saveExchange() {
        const customerName = document.getElementById('customerName').value.trim();
        const customerPhone = document.getElementById('customerPhone').value.trim();
        const settlementType = document.getElementById('settlementType').value;
        
        if (!customerName || !customerPhone) {
            app.showToast('Customer name and phone are required', 'error');
            return;
        }
        
        if (settlementType === 'cash') {
            const cashAmount = parseFloat(document.getElementById('cashAmount').value) || 0;
            if (cashAmount <= 0) {
                app.showToast('Cash amount must be greater than 0', 'error');
                return;
            }
        } else {
            if (this.items.length === 0) {
                app.showToast('At least one new item is required', 'error');
                return;
            }
            
            const isValid = this.items.every(item => item.description && item.metal_type && item.purity);
            if (!isValid) {
                app.showToast('Please fill all required item fields', 'error');
                return;
            }
        }
        
        const exchangeData = {
            customer_name: customerName,
            customer_phone: customerPhone,
            customer_aadhaar: document.getElementById('customerAadhaar').value.trim(),
            customer_pan: document.getElementById('customerPAN').value.trim(),
            customer_gst: document.getElementById('customerGST').value.trim(),
            customer_address: document.getElementById('customerAddress').value.trim(),
            old_bill_number: document.getElementById('oldBillNumber').value.trim(),
            old_item_description: document.getElementById('oldItemDescription').value.trim(),
            settlement_type: settlementType,
            cash_amount: parseFloat(document.getElementById('cashAmount').value) || 0,
            cash_payment_mode: document.getElementById('cashPaymentMode').value,
            total_old_value: parseFloat(document.getElementById('totalOldValue').value) || 0,
            total_new_value: parseFloat(document.getElementById('totalNewValue').value) || 0,
            difference_amount: parseFloat(document.getElementById('differenceAmount').value) || 0,
            notes: document.getElementById('exchangeNotes').value.trim()
        };
        
        const formData = new FormData();
        formData.append('exchangeData', JSON.stringify(exchangeData));
        formData.append('items', JSON.stringify(this.items));
        formData.append('photos', JSON.stringify(this.photos.map(photo => ({
            type: photo.type,
            description: photo.description
        }))));
        
        this.photos.forEach((photo, index) => {
            if (photo.file) {
                formData.append(`photos-${index}`, photo.file);
            }
        });
        
        const restore = app.showLoading(document.getElementById('saveExchangeBtn'));
        
        try {
            const result = await this.auth.requestWithFiles('/exchanges/create', formData);
            
            app.showToast(`Exchange ${result.exchangeNumber} created successfully`, 'success');
            
            setTimeout(() => {
                window.open(`view-exchange.html?token=${result.qrToken}`, '_blank');
            }, 1000);
            
            this.clearExchange();
            
        } catch (error) {
            app.showToast(`Failed to save exchange: ${error.message}`, 'error');
        } finally {
            restore();
        }
    }
    
    printExchange() {
        window.print();
    }
    
    clearExchange() {
        if (confirm('Are you sure you want to clear all exchange data?')) {
            this.items = [this.createEmptyItem()];
            this.photos = [];
            this.currentItemIndex = 0;
            this.customer = null;
            
            document.getElementById('customerName').value = '';
            document.getElementById('customerPhone').value = '';
            document.getElementById('customerPhoneAlt').value = '';
            document.getElementById('customerAadhaar').value = '';
            document.getElementById('customerPAN').value = '';
            document.getElementById('customerGST').value = '';
            document.getElementById('customerAddress').value = '';
            
            document.getElementById('oldBillNumber').value = '';
            document.getElementById('oldItemDescription').value = '';
            document.getElementById('oldValue').value = '';
            
            document.getElementById('settlementType').value = 'cash';
            this.onSettlementTypeChange({ target: document.getElementById('settlementType') });
            document.getElementById('cashAmount').value = '';
            document.getElementById('cashPaymentMode').value = 'cash';
            
            document.getElementById('exchangeNotes').value = '';
            
            document.getElementById('oldItemPhoto').value = '';
            document.getElementById('newItemPhoto').value = '';
            
            this.renderItems();
            this.updateCalculations();
            this.updatePhotoPreview();
            
            app.showToast('Exchange cleared', 'success');
        }
    }
    
    hasUnsavedChanges() {
        const hasItems = this.items.some(item => 
            item.description || item.metal_type !== 'GOLD' || item.gross_weight > 0
        );
        
        const hasCustomer = document.getElementById('customerName').value.trim() || 
                           document.getElementById('customerPhone').value.trim();
        
        const hasOldItem = document.getElementById('oldItemDescription').value.trim() || 
                          document.getElementById('oldValue').value > 0;
        
        return hasItems || hasCustomer || hasOldItem || this.photos.length > 0;
    }
}

const exchange = new Exchange();
