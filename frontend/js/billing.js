class Billing {
    constructor() {
        this.auth = auth;
        this.app = app;
        this.currentItemIndex = 0;
        this.items = [this.createEmptyItem()];
        this.itemPhotos = [[]];
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
            loss_reason: 'NONE',
            loss_note: '',
            making_type: '',
            making_charges: 0,
            discount_percent: 0,
            stone_charge: 0,
            huid_charge: 0,
            huid_number: '',
            diamond_certificate: '',
            gst_percent: 0,
            making_gst_percent: 0,
            notes: ''
        };
    }
    
    async init() {
        await this.loadRates();
        await this.loadInventory();
        this.setupEventListeners();
        this.renderItems();
        this.updateCalculations();
        this.loadDraft();
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
        document.getElementById('gstType').addEventListener('change', (e) => this.onGstTypeChange(e));
        document.getElementById('gstNumber').addEventListener('input', (e) => this.onGstNumberChange(e));
        document.getElementById('billType').addEventListener('change', (e) => this.onBillTypeChange(e));
        document.getElementById('saveBillBtn').addEventListener('click', () => this.saveBill());
        document.getElementById('printBillBtn').addEventListener('click', () => this.printBill());
        document.getElementById('clearBillBtn').addEventListener('click', () => this.clearBill());
        
        document.getElementById('customerSearchInput').addEventListener('input', (e) => this.handleCustomerSearch(e));
        document.getElementById('inventorySearch').addEventListener('input', (e) => this.handleInventorySearch(e));
        
        document.getElementById('customerSearchModal').addEventListener('submit', (e) => {
            e.preventDefault();
            this.searchCustomer();
        });
        
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges()) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
        
        setInterval(() => this.saveDraft(), 30000);
    }
    
    addItem() {
        this.items.push(this.createEmptyItem());
        this.itemPhotos.push([]);
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
            this.itemPhotos.splice(index, 1);
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
                <div class="item-number">Item ${index + 1}</div>
                <div class="item-actions">
                    <button type="button" class="btn btn-secondary btn-small" onclick="billing.toggleItem(${index})">
                        <i class="fas fa-${index === this.currentItemIndex ? 'minus' : 'plus'}"></i>
                    </button>
                    <button type="button" class="btn btn-danger btn-small" onclick="billing.removeItem(${index})" ${this.items.length <= 1 ? 'disabled' : ''}>
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
                
                <div class="input-group" id="lossReasonContainer${index}" style="display: ${item.less_weight > 0 ? 'block' : 'none'};">
                    <label for="lossReason${index}"><i class="fas fa-exclamation-triangle"></i> Loss Reason</label>
                    <select id="lossReason${index}" class="loss-reason" data-index="${index}">
                        <option value="NONE" ${item.loss_reason === 'NONE' ? 'selected' : ''}>None</option>
                        <option value="DIAMOND" ${item.loss_reason === 'DIAMOND' ? 'selected' : ''}>Diamond</option>
                        <option value="STONE" ${item.loss_reason === 'STONE' ? 'selected' : ''}>Stone</option>
                        <option value="POLISH" ${item.loss_reason === 'POLISH' ? 'selected' : ''}>Polish</option>
                        <option value="DUST" ${item.loss_reason === 'DUST' ? 'selected' : ''}>Dust</option>
                        <option value="REFINING" ${item.loss_reason === 'REFINING' ? 'selected' : ''}>Refining</option>
                        <option value="OTHER" ${item.loss_reason === 'OTHER' ? 'selected' : ''}>Other</option>
                    </select>
                </div>
                
                <div class="input-group" id="lossNoteContainer${index}" style="display: ${item.loss_reason === 'OTHER' ? 'block' : 'none'};">
                    <label for="lossNote${index}"><i class="fas fa-sticky-note"></i> Loss Note</label>
                    <input type="text" id="lossNote${index}" class="loss-note" 
                           value="${item.loss_note}" data-index="${index}" 
                           placeholder="Specify loss reason">
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
                    <label for="gstPercent${index}"><i class="fas fa-receipt"></i> GST % on Item</label>
                    <select id="gstPercent${index}" class="gst-percent" data-index="${index}">
                        <option value="0" ${item.gst_percent === 0 ? 'selected' : ''}>0%</option>
                        <option value="3" ${item.gst_percent === 3 ? 'selected' : ''}>3%</option>
                        <option value="5" ${item.gst_percent === 5 ? 'selected' : ''}>5%</option>
                        <option value="12" ${item.gst_percent === 12 ? 'selected' : ''}>12%</option>
                        <option value="18" ${item.gst_percent === 18 ? 'selected' : ''}>18%</option>
                        <option value="28" ${item.gst_percent === 28 ? 'selected' : ''}>28%</option>
                        <option value="custom">Custom</option>
                    </select>
                </div>
                
                <div class="input-group">
                    <label for="makingGstPercent${index}"><i class="fas fa-receipt"></i> GST % on Making</label>
                    <select id="makingGstPercent${index}" class="making-gst-percent" data-index="${index}">
                        <option value="0" ${item.making_gst_percent === 0 ? 'selected' : ''}>0%</option>
                        <option value="3" ${item.making_gst_percent === 3 ? 'selected' : ''}>3%</option>
                        <option value="5" ${item.making_gst_percent === 5 ? 'selected' : ''}>5%</option>
                        <option value="12" ${item.making_gst_percent === 12 ? 'selected' : ''}>12%</option>
                        <option value="18" ${item.making_gst_percent === 18 ? 'selected' : ''}>18%</option>
                        <option value="28" ${item.making_gst_percent === 28 ? 'selected' : ''}>28%</option>
                        <option value="custom">Custom</option>
                    </select>
                </div>
                
                <div class="input-group">
                    <label for="notes${index}"><i class="fas fa-sticky-note"></i> Notes (Printable)</label>
                    <textarea id="notes${index}" class="item-notes" data-index="${index}" 
                              rows="2" placeholder="Item notes (will be printed)">${item.notes}</textarea>
                </div>
                
                <div class="input-group">
                    <label><i class="fas fa-camera"></i> Photos</label>
                    <div class="photo-upload" onclick="billing.openPhotoUpload(${index})">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <p>Click to upload photos for this item</p>
                        <p class="text-small">Maximum 5 photos per item</p>
                    </div>
                    <div class="photo-preview" id="photoPreview${index}">
                        ${this.renderPhotoPreview(index)}
                    </div>
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
    
    renderPhotoPreview(index) {
        const photos = this.itemPhotos[index] || [];
        if (photos.length === 0) return '';
        
        return photos.map((photo, photoIndex) => `
            <div class="photo-item">
                <img src="${photo.preview}" alt="Item photo">
                <button type="button" class="photo-remove" onclick="billing.removePhoto(${index}, ${photoIndex})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }
    
    attachItemEventListeners() {
        document.querySelectorAll('.description-input').forEach(input => {
            input.addEventListener('input', (e) => this.onItemFieldChange(e));
            input.addEventListener('blur', (e) => this.onDescriptionBlur(e));
        });
        
        document.querySelectorAll('.metal-type').forEach(select => {
            select.addEventListener('change', (e) => this.onMetalTypeChange(e));
        });
        
        document.querySelectorAll('.weight-input').forEach(input => {
            input.addEventListener('input', (e) => this.onWeightChange(e));
        });
        
        document.querySelectorAll('.loss-reason').forEach(select => {
            select.addEventListener('change', (e) => this.onLossReasonChange(e));
        });
        
        document.querySelectorAll('.gst-percent, .making-gst-percent').forEach(select => {
            select.addEventListener('change', (e) => this.onGstPercentChange(e));
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
        } else if (field === 'loss-note') {
            this.items[index].loss_note = value;
        } else if (field === 'item-notes') {
            this.items[index].notes = value;
        }
        
        this.updateCalculations();
    }
    
    onDescriptionBlur(e) {
        const index = parseInt(e.target.getAttribute('data-index'));
        const description = e.target.value.trim();
        
        if (description && !this.inventory.includes(description)) {
            this.addToInventory(description);
        }
    }
    
    async addToInventory(description) {
        try {
            await this.auth.request('/inventory/add', {
                method: 'POST',
                body: JSON.stringify({ name: description })
            });
            this.inventory.push(description);
            app.showToast('Added to inventory suggestions', 'success');
        } catch (error) {
            console.error('Error adding to inventory:', error);
        }
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
        
        const lossReasonContainer = document.getElementById(`lossReasonContainer${index}`);
        if (lossReasonContainer) {
            lossReasonContainer.style.display = this.items[index].less_weight > 0 ? 'block' : 'none';
        }
        
        this.updateCalculations();
    }
    
    onLossReasonChange(e) {
        const index = parseInt(e.target.getAttribute('data-index'));
        const lossReason = e.target.value;
        
        this.items[index].loss_reason = lossReason;
        
        const lossNoteContainer = document.getElementById(`lossNoteContainer${index}`);
        if (lossNoteContainer) {
            lossNoteContainer.style.display = lossReason === 'OTHER' ? 'block' : 'none';
        }
    }
    
    onGstPercentChange(e) {
        const index = parseInt(e.target.getAttribute('data-index'));
        const isMaking = e.target.classList.contains('making-gst-percent');
        let value = e.target.value;
        
        if (value === 'custom') {
            const customValue = prompt('Enter custom GST percentage:');
            if (customValue !== null && !isNaN(customValue) && customValue >= 0 && customValue <= 100) {
                value = parseFloat(customValue);
                e.target.value = value;
                e.target.innerHTML = `<option value="${value}" selected>${value}%</option>`;
            } else {
                e.target.value = '0';
                value = 0;
            }
        }
        
        if (isMaking) {
            this.items[index].making_gst_percent = parseFloat(value) || 0;
        } else {
            this.items[index].gst_percent = parseFloat(value) || 0;
        }
        
        this.updateCalculations();
    }
    
    onGstTypeChange(e) {
        const gstType = e.target.value;
        const gstNumberInput = document.getElementById('gstNumber');
        const businessFields = document.getElementById('businessFields');
        
        businessFields.style.display = gstNumberInput.value.trim() ? 'block' : 'none';
        this.updateCalculations();
    }
    
    onGstNumberChange(e) {
        const gstNumber = e.target.value.trim();
        const businessFields = document.getElementById('businessFields');
        
        businessFields.style.display = gstNumber ? 'block' : 'none';
    }
    
    onBillTypeChange(e) {
        const billType = e.target.value;
        const advanceFields = document.getElementById('advanceFields');
        
        if (billType === 'advance') {
            advanceFields.style.display = 'block';
            const lockDate = new Date();
            lockDate.setDate(lockDate.getDate() + 15);
            document.getElementById('advanceLockDate').value = lockDate.toISOString().split('T')[0];
        } else {
            advanceFields.style.display = 'none';
        }
    }
    
    toggleItem(index) {
        if (this.currentItemIndex === index) {
            this.currentItemIndex = -1;
        } else {
            this.currentItemIndex = index;
        }
        this.renderItems();
    }
    
    openPhotoUpload(index) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.capture = 'environment';
        
        input.onchange = (e) => {
            const files = Array.from(e.target.files);
            if (files.length > 5) {
                app.showToast('Maximum 5 photos per item allowed', 'error');
                return;
            }
            
            files.forEach(file => {
                if (file.size > 5 * 1024 * 1024) {
                    app.showToast('File size must be less than 5MB', 'error');
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.itemPhotos[index].push({
                        file: file,
                        preview: e.target.result
                    });
                    this.updatePhotoPreview(index);
                };
                reader.readAsDataURL(file);
            });
        };
        
        input.click();
    }
    
    removePhoto(itemIndex, photoIndex) {
        this.itemPhotos[itemIndex].splice(photoIndex, 1);
        this.updatePhotoPreview(itemIndex);
    }
    
    updatePhotoPreview(index) {
        const previewContainer = document.getElementById(`photoPreview${index}`);
        if (previewContainer) {
            previewContainer.innerHTML = this.renderPhotoPreview(index);
        }
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
        document.getElementById('customerDOB').value = customer.date_of_birth || '';
        document.getElementById('customerNotes').value = customer.notes || '';
        
        document.getElementById('gstNumber').value = customer.gst_number || '';
        if (customer.gst_number) {
            document.getElementById('businessFields').style.display = 'block';
        }
        
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
        document.getElementById('customerDOB').value = '';
        document.getElementById('customerNotes').value = '';
        
        app.showToast('Customer cleared', 'success');
    }
    
    handleCustomerSearch(e) {
        const searchTerm = e.target.value.trim();
        if (searchTerm.length >= 2) {
            this.searchCustomer();
        }
    }
    
    handleInventorySearch(e) {
        const searchTerm = e.target.value.toLowerCase();
        const filtered = this.inventory.filter(item => 
            item.toLowerCase().includes(searchTerm)
        );
        
        const resultsContainer = document.getElementById('inventoryResults');
        resultsContainer.innerHTML = filtered.slice(0, 20).map(item => `
            <div class="inventory-item" onclick="billing.selectInventoryItem('${item}')">
                ${item}
            </div>
        `).join('');
    }
    
    selectInventoryItem(item) {
        if (this.currentItemIndex >= 0) {
            const input = document.getElementById(`description${this.currentItemIndex}`);
            if (input) {
                input.value = item;
                this.items[this.currentItemIndex].description = item;
            }
        }
        app.hideModal('inventoryModal');
    }
    
    updateCalculations() {
        let totalGrossWeight = 0;
        let totalNetWeight = 0;
        let totalMetalValue = 0;
        let totalMakingCharges = 0;
        let totalDiscount = 0;
        let totalStoneCharge = 0;
        let totalHuidCharge = 0;
        let totalTaxableValue = 0;
        let totalCgst = 0;
        let totalSgst = 0;
        let totalIgst = 0;
        let totalAmount = 0;
        
        this.items.forEach((item, index) => {
            const rateKey = `${item.metal_type}_${item.purity}`;
            const metalRate = this.rates[rateKey] || 0;
            
            const netWeight = item.net_weight || 0;
            const metalValue = netWeight * metalRate;
            
            const makingDiscount = item.making_charges * (item.discount_percent / 100);
            const netMakingCharges = item.making_charges - makingDiscount;
            
            const taxableValue = metalValue + netMakingCharges + item.stone_charge + item.huid_charge;
            
            const gstType = document.getElementById('gstType').value;
            let cgst = 0, sgst = 0, igst = 0;
            
            if (gstType === 'intra_state') {
                cgst = taxableValue * (item.gst_percent / 200);
                sgst = taxableValue * (item.gst_percent / 200);
            } else if (gstType === 'inter_state') {
                igst = taxableValue * (item.gst_percent / 100);
            }
            
            const itemTotal = metalValue + netMakingCharges + item.stone_charge + item.huid_charge + cgst + sgst + igst;
            
            totalGrossWeight += item.gross_weight || 0;
            totalNetWeight += netWeight;
            totalMetalValue += metalValue;
            totalMakingCharges += netMakingCharges;
            totalDiscount += makingDiscount;
            totalStoneCharge += item.stone_charge || 0;
            totalHuidCharge += item.huid_charge || 0;
            totalTaxableValue += taxableValue;
            totalCgst += cgst;
            totalSgst += sgst;
            totalIgst += igst;
            totalAmount += itemTotal;
        });
        
        this.updateSummaryDisplay({
            totalGrossWeight,
            totalNetWeight,
            totalMetalValue,
            totalMakingCharges,
            totalDiscount,
            totalStoneCharge,
            totalHuidCharge,
            totalTaxableValue,
            totalCgst,
            totalSgst,
            totalIgst,
            totalAmount
        });
    }
    
    updateSummaryDisplay(summary) {
        document.getElementById('summaryGrossWeight').textContent = summary.totalGrossWeight.toFixed(3);
        document.getElementById('summaryNetWeight').textContent = summary.totalNetWeight.toFixed(3);
        document.getElementById('summaryMetalValue').textContent = summary.totalMetalValue.toFixed(2);
        document.getElementById('summaryMakingCharges').textContent = summary.totalMakingCharges.toFixed(2);
        document.getElementById('summaryDiscount').textContent = summary.totalDiscount.toFixed(2);
        document.getElementById('summaryStoneCharge').textContent = summary.totalStoneCharge.toFixed(2);
        document.getElementById('summaryHuidCharge').textContent = summary.totalHuidCharge.toFixed(2);
        document.getElementById('summaryTaxableValue').textContent = summary.totalTaxableValue.toFixed(2);
        document.getElementById('summaryCGST').textContent = summary.totalCgst.toFixed(2);
        document.getElementById('summarySGST').textContent = summary.totalSgst.toFixed(2);
        document.getElementById('summaryIGST').textContent = summary.totalIgst.toFixed(2);
        document.getElementById('summaryTotalAmount').textContent = summary.totalAmount.toFixed(2);
        
        document.getElementById('totalAmount').value = summary.totalAmount.toFixed(2);
        
        const billType = document.getElementById('billType').value;
        if (billType === 'advance') {
            const paidAmount = parseFloat(document.getElementById('paidAmount').value) || 0;
            const remainingAmount = summary.totalAmount - paidAmount;
            document.getElementById('remainingAmount').value = remainingAmount.toFixed(2);
        }
    }
    
    async saveBill() {
        const customerName = document.getElementById('customerName').value.trim();
        const customerPhone = document.getElementById('customerPhone').value.trim();
        
        if (!customerName || !customerPhone) {
            app.showToast('Customer name and phone are required', 'error');
            return;
        }
        
        if (this.items.length === 0) {
            app.showToast('At least one item is required', 'error');
            return;
        }
        
        const isValid = this.items.every(item => item.description && item.metal_type && item.purity);
        if (!isValid) {
            app.showToast('Please fill all required item fields', 'error');
            return;
        }
        
        const billData = {
            customer_name: customerName,
            customer_phone: customerPhone,
            customer_aadhaar: document.getElementById('customerAadhaar').value.trim(),
            customer_pan: document.getElementById('customerPAN').value.trim(),
            customer_gst: document.getElementById('customerGST').value.trim(),
            customer_address: document.getElementById('customerAddress').value.trim(),
            bill_type: document.getElementById('billType').value,
            bill_status: document.getElementById('billType').value === 'advance' ? 'pending' : 'paid',
            gst_type: document.getElementById('gstType').value,
            gst_number: document.getElementById('gstNumber').value.trim(),
            business_name: document.getElementById('businessName').value.trim(),
            business_address: document.getElementById('businessAddress').value.trim(),
            total_gross_weight: parseFloat(document.getElementById('summaryGrossWeight').textContent) || 0,
            total_net_weight: parseFloat(document.getElementById('summaryNetWeight').textContent) || 0,
            total_metal_value: parseFloat(document.getElementById('summaryMetalValue').textContent) || 0,
            total_making_charges: parseFloat(document.getElementById('summaryMakingCharges').textContent) || 0,
            total_discount: parseFloat(document.getElementById('summaryDiscount').textContent) || 0,
            total_stone_charge: parseFloat(document.getElementById('summaryStoneCharge').textContent) || 0,
            total_huid_charge: parseFloat(document.getElementById('summaryHuidCharge').textContent) || 0,
            total_taxable_value: parseFloat(document.getElementById('summaryTaxableValue').textContent) || 0,
            total_cgst: parseFloat(document.getElementById('summaryCGST').textContent) || 0,
            total_sgst: parseFloat(document.getElementById('summarySGST').textContent) || 0,
            total_igst: parseFloat(document.getElementById('summaryIGST').textContent) || 0,
            total_amount: parseFloat(document.getElementById('totalAmount').value) || 0,
            paid_amount: parseFloat(document.getElementById('paidAmount').value) || 0,
            remaining_amount: parseFloat(document.getElementById('remainingAmount').value) || 0,
            advance_lock_date: document.getElementById('advanceLockDate').value,
            notes: document.getElementById('billNotes').value.trim(),
            payment_mode: document.getElementById('paymentMode').value
        };
        
        const formData = new FormData();
        formData.append('billData', JSON.stringify(billData));
        formData.append('items', JSON.stringify(this.items));
        formData.append('photos', JSON.stringify(this.itemPhotos.map(photos => 
            photos.map(photo => ({ preview: photo.preview }))
        )));
        
        this.itemPhotos.forEach((photos, itemIndex) => {
            photos.forEach((photo, photoIndex) => {
                if (photo.file) {
                    formData.append(`photos-${itemIndex}`, photo.file);
                }
            });
        });
        
        const restore = app.showLoading(document.getElementById('saveBillBtn'));
        
        try {
            const result = await this.auth.requestWithFiles('/bills/create', formData);
            
            app.showToast(`Bill ${result.billNumber} created successfully`, 'success');
            
            setTimeout(() => {
                window.open(`view-bill.html?token=${result.qrToken}`, '_blank');
            }, 1000);
            
            this.clearDraft();
            this.clearBill();
            
        } catch (error) {
            app.showToast(`Failed to save bill: ${error.message}`, 'error');
        } finally {
            restore();
        }
    }
    
    printBill() {
        window.print();
    }
    
    clearBill() {
        if (confirm('Are you sure you want to clear all bill data?')) {
            this.items = [this.createEmptyItem()];
            this.itemPhotos = [[]];
            this.currentItemIndex = 0;
            this.customer = null;
            
            document.getElementById('customerName').value = '';
            document.getElementById('customerPhone').value = '';
            document.getElementById('customerPhoneAlt').value = '';
            document.getElementById('customerAadhaar').value = '';
            document.getElementById('customerPAN').value = '';
            document.getElementById('customerGST').value = '';
            document.getElementById('customerAddress').value = '';
            document.getElementById('customerDOB').value = '';
            document.getElementById('customerNotes').value = '';
            
            document.getElementById('gstType').value = 'none';
            document.getElementById('gstNumber').value = '';
            document.getElementById('businessFields').style.display = 'none';
            document.getElementById('businessName').value = '';
            document.getElementById('businessAddress').value = '';
            
            document.getElementById('billType').value = 'normal';
            document.getElementById('advanceFields').style.display = 'none';
            document.getElementById('paidAmount').value = '';
            document.getElementById('remainingAmount').value = '';
            document.getElementById('advanceLockDate').value = '';
            
            document.getElementById('paymentMode').value = 'cash';
            document.getElementById('billNotes').value = '';
            
            this.renderItems();
            this.updateCalculations();
            
            app.showToast('Bill cleared', 'success');
        }
    }
    
    saveDraft() {
        const draft = {
            items: this.items,
            customer: this.customer,
            customerFields: {
                name: document.getElementById('customerName').value,
                phone: document.getElementById('customerPhone').value,
                phoneAlt: document.getElementById('customerPhoneAlt').value,
                aadhaar: document.getElementById('customerAadhaar').value,
                pan: document.getElementById('customerPAN').value,
                gst: document.getElementById('customerGST').value,
                address: document.getElementById('customerAddress').value,
                dob: document.getElementById('customerDOB').value,
                notes: document.getElementById('customerNotes').value
            },
            billFields: {
                gstType: document.getElementById('gstType').value,
                gstNumber: document.getElementById('gstNumber').value,
                businessName: document.getElementById('businessName').value,
                businessAddress: document.getElementById('businessAddress').value,
                billType: document.getElementById('billType').value,
                paidAmount: document.getElementById('paidAmount').value,
                advanceLockDate: document.getElementById('advanceLockDate').value,
                paymentMode: document.getElementById('paymentMode').value,
                billNotes: document.getElementById('billNotes').value
            },
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('billDraft', JSON.stringify(draft));
    }
    
    loadDraft() {
        const draft = localStorage.getItem('billDraft');
        if (!draft) return;
        
        try {
            const data = JSON.parse(draft);
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            const draftTime = new Date(data.timestamp);
            
            if (draftTime < oneHourAgo) {
                localStorage.removeItem('billDraft');
                return;
            }
            
            if (confirm('A saved draft was found. Do you want to load it?')) {
                this.items = data.items || [this.createEmptyItem()];
                this.customer = data.customer;
                
                Object.keys(data.customerFields || {}).forEach(key => {
                    const element = document.getElementById(`customer${key.charAt(0).toUpperCase() + key.slice(1)}`);
                    if (element) element.value = data.customerFields[key];
                });
                
                Object.keys(data.billFields || {}).forEach(key => {
                    const element = document.getElementById(key);
                    if (element) element.value = data.billFields[key];
                });
                
                this.onBillTypeChange({ target: document.getElementById('billType') });
                this.onGstTypeChange({ target: document.getElementById('gstType') });
                this.onGstNumberChange({ target: document.getElementById('gstNumber') });
                
                this.renderItems();
                this.updateCalculations();
                
                app.showToast('Draft loaded successfully', 'success');
            }
        } catch (error) {
            console.error('Error loading draft:', error);
            localStorage.removeItem('billDraft');
        }
    }
    
    clearDraft() {
        localStorage.removeItem('billDraft');
    }
    
    hasUnsavedChanges() {
        const hasItems = this.items.some(item => 
            item.description || item.metal_type !== 'GOLD' || item.gross_weight > 0
        );
        
        const hasCustomer = document.getElementById('customerName').value.trim() || 
                           document.getElementById('customerPhone').value.trim();
        
        return hasItems || hasCustomer;
    }
}

const billing = new Billing();
