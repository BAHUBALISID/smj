class ViewExchange {
    constructor() {
        this.auth = auth;
        this.app = app;
        this.exchangeToken = this.getTokenFromURL();
        this.init();
    }
    
    getTokenFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('token') || urlParams.get('exchangeId');
    }
    
    async init() {
        if (!this.exchangeToken) {
            this.showError('No exchange token provided');
            return;
        }
        
        await this.loadExchange();
        this.setupEventListeners();
        this.setupQRCode();
    }
    
    async loadExchange() {
        try {
            const exchange = await this.auth.request(`/exchanges/token/${this.exchangeToken}`);
            this.displayExchange(exchange);
        } catch (error) {
            console.error('Error loading exchange:', error);
            this.showError('Failed to load exchange. It may not exist or you may not have permission to view it.');
        }
    }
    
    displayExchange(exchange) {
        document.getElementById('exchangeNumber').textContent = exchange.exchange_number;
        document.getElementById('customerName').textContent = exchange.customer_name;
        document.getElementById('customerPhone').textContent = exchange.customer_phone;
        document.getElementById('exchangeDate').textContent = exchange.created_at_formatted;
        document.getElementById('settlementType').textContent = exchange.settlement_type;
        document.getElementById('settlementType').className = `badge ${exchange.settlement_type === 'cash' ? 'badge-success' : 'badge-primary'}`;
        
        if (exchange.customer_aadhaar) {
            document.getElementById('customerAadhaar').textContent = exchange.customer_aadhaar;
            document.getElementById('aadhaarRow').style.display = '';
        }
        
        if (exchange.customer_pan) {
            document.getElementById('customerPAN').textContent = exchange.customer_pan;
            document.getElementById('panRow').style.display = '';
        }
        
        if (exchange.customer_gst) {
            document.getElementById('customerGST').textContent = exchange.customer_gst;
            document.getElementById('gstRow').style.display = '';
        }
        
        if (exchange.customer_address) {
            document.getElementById('customerAddress').textContent = exchange.customer_address;
            document.getElementById('addressRow').style.display = '';
        }
        
        if (exchange.old_bill_number) {
            document.getElementById('oldBillNumber').textContent = exchange.old_bill_number;
            document.getElementById('oldBillRow').style.display = '';
        }
        
        if (exchange.old_item_description) {
            document.getElementById('oldItemDescription').textContent = exchange.old_item_description;
            document.getElementById('oldItemRow').style.display = '';
        }
        
        document.getElementById('totalOldValue').textContent = `₹${exchange.total_old_value.toFixed(2)}`;
        document.getElementById('totalNewValue').textContent = `₹${exchange.total_new_value.toFixed(2)}`;
        document.getElementById('differenceAmount').textContent = `₹${exchange.difference_amount.toFixed(2)}`;
        
        const differenceDisplay = document.getElementById('differenceDisplay');
        differenceDisplay.textContent = exchange.difference_amount >= 0 ? 'To Receive' : 'To Pay';
        differenceDisplay.className = `badge ${exchange.difference_amount >= 0 ? 'badge-success' : 'badge-danger'}`;
        
        if (exchange.settlement_type === 'cash') {
            document.getElementById('cashAmount').textContent = `₹${exchange.cash_amount.toFixed(2)}`;
            document.getElementById('cashPaymentMode').textContent = exchange.cash_payment_mode;
            document.getElementById('cashDetails').style.display = '';
        }
        
        if (exchange.notes) {
            document.getElementById('exchangeNotes').textContent = exchange.notes;
            document.getElementById('notesRow').style.display = '';
        }
        
        this.displayItems(exchange.items);
        this.displayPhotos(exchange.photos);
        this.displayCreatedBy(exchange);
    }
    
    displayItems(items) {
        const container = document.getElementById('itemsTable');
        if (!container) return;
        
        let html = '';
        items.forEach((item, index) => {
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${item.description}</td>
                    <td>${item.metal_type}</td>
                    <td>${item.purity}</td>
                    <td>${item.quantity.toFixed(3)}</td>
                    <td>${item.gross_weight.toFixed(3)}</td>
                    <td>${item.less_weight.toFixed(3)}</td>
                    <td>${item.net_weight.toFixed(3)}</td>
                    <td>₹${item.metal_rate.toFixed(2)}</td>
                    <td>₹${item.metal_value.toFixed(2)}</td>
                    <td>₹${item.making_charges.toFixed(2)}</td>
                    <td>₹${item.stone_charge.toFixed(2)}</td>
                    <td>₹${item.huid_charge.toFixed(2)}</td>
                    <td>₹${item.item_total.toFixed(2)}</td>
                </tr>
            `;
        });
        
        container.innerHTML = html;
    }
    
    displayPhotos(photos) {
        const container = document.getElementById('photosContainer');
        if (!container || !photos || photos.length === 0) {
            if (container) container.style.display = 'none';
            return;
        }
        
        let html = '';
        photos.forEach(photo => {
            html += `
                <div class="col-md-4 mb-3">
                    <div class="card">
                        <div class="card-body">
                            <h6 class="card-title">${photo.photo_type === 'old_item' ? 'Old Item' : 'New Item'}</h6>
                            <img src="${window.location.origin}/uploads/${photo.photo_path}" 
                                 class="img-fluid rounded" 
                                 style="max-height: 200px; object-fit: cover;"
                                 alt="Exchange photo">
                            ${photo.description ? `<p class="mt-2 small">${photo.description}</p>` : ''}
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        container.style.display = '';
    }
    
    displayCreatedBy(exchange) {
        const container = document.getElementById('createdByInfo');
        if (!container) return;
        
        container.innerHTML = `
            <p><strong>Created by:</strong> ${exchange.created_by_name || 'Unknown'}</p>
            <p><strong>Role:</strong> ${exchange.created_by_role || 'Staff'}</p>
            <p><strong>Date:</strong> ${exchange.created_at_formatted}</p>
        `;
    }
    
    setupEventListeners() {
        document.getElementById('printExchangeBtn').addEventListener('click', () => this.printExchange());
        document.getElementById('shareExchangeBtn').addEventListener('click', () => this.shareExchange());
        document.getElementById('closeViewBtn').addEventListener('click', () => window.close());
    }
    
    setupQRCode() {
        const exchangeData = {
            exchangeNumber: document.getElementById('exchangeNumber').textContent,
            customerName: document.getElementById('customerName').textContent,
            settlementType: document.getElementById('settlementType').textContent,
            date: document.getElementById('exchangeDate').textContent,
            verifyUrl: window.location.href
        };
        
        this.app.generateQRCode(exchangeData, 'exchangeQRCode');
    }
    
    printExchange() {
        window.print();
    }
    
    shareExchange() {
        const exchangeUrl = window.location.href;
        
        if (navigator.share) {
            navigator.share({
                title: `Exchange ${document.getElementById('exchangeNumber').textContent}`,
                text: `View exchange details for ${document.getElementById('customerName').textContent}`,
                url: exchangeUrl
            });
        } else {
            navigator.clipboard.writeText(exchangeUrl).then(() => {
                app.showToast('Exchange URL copied to clipboard', 'success');
            });
        }
    }
    
    showError(message) {
        const container = document.getElementById('exchangeContainer');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger">
                    <h4><i class="fas fa-exclamation-triangle"></i> Error</h4>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="window.history.back()">Go Back</button>
                </div>
            `;
        }
    }
}

new ViewExchange();
