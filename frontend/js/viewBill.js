class ViewBill {
    constructor() {
        this.auth = auth;
        this.app = app;
        this.billToken = this.getTokenFromURL();
        this.init();
    }
    
    getTokenFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('token') || urlParams.get('billId');
    }
    
    async init() {
        if (!this.billToken) {
            this.showError('No bill token provided');
            return;
        }
        
        await this.loadBill();
        this.setupEventListeners();
        this.setupQRCode();
    }
    
    async loadBill() {
        try {
            const bill = await this.auth.request(`/bills/token/${this.billToken}`);
            this.displayBill(bill);
        } catch (error) {
            console.error('Error loading bill:', error);
            this.showError('Failed to load bill. It may not exist or you may not have permission to view it.');
        }
    }
    
    displayBill(bill) {
        document.getElementById('billNumber').textContent = bill.bill_number;
        document.getElementById('customerName').textContent = bill.customer_name;
        document.getElementById('customerPhone').textContent = bill.customer_phone;
        document.getElementById('billDate').textContent = bill.created_at_formatted;
        document.getElementById('billStatus').textContent = bill.bill_status;
        document.getElementById('billStatus').className = `badge ${bill.bill_status === 'paid' ? 'badge-success' : bill.bill_status === 'partial' ? 'badge-warning' : 'badge-danger'}`;
        
        if (bill.customer_aadhaar) {
            document.getElementById('customerAadhaar').textContent = bill.customer_aadhaar;
            document.getElementById('aadhaarRow').style.display = '';
        }
        
        if (bill.customer_pan) {
            document.getElementById('customerPAN').textContent = bill.customer_pan;
            document.getElementById('panRow').style.display = '';
        }
        
        if (bill.customer_gst) {
            document.getElementById('customerGST').textContent = bill.customer_gst;
            document.getElementById('gstRow').style.display = '';
        }
        
        if (bill.customer_address) {
            document.getElementById('customerAddress').textContent = bill.customer_address;
            document.getElementById('addressRow').style.display = '';
        }
        
        document.getElementById('totalAmount').textContent = `₹${bill.total_amount.toFixed(2)}`;
        document.getElementById('paidAmount').textContent = `₹${bill.paid_amount.toFixed(2)}`;
        document.getElementById('remainingAmount').textContent = `₹${bill.remaining_amount.toFixed(2)}`;
        
        if (bill.bill_type === 'advance') {
            document.getElementById('advanceLockDate').textContent = bill.advance_lock_date_formatted || '-';
            document.getElementById('advanceRow').style.display = '';
        }
        
        if (bill.notes) {
            document.getElementById('billNotes').textContent = bill.notes;
            document.getElementById('notesRow').style.display = '';
        }
        
        this.displayItems(bill.items);
        this.displayPhotos(bill.photos);
        this.displayPayments(bill.payments);
        this.displayCreatedBy(bill);
        
        if (bill.gst_type !== 'none') {
            this.displayGSTDetails(bill);
        }
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
                            <h6 class="card-title">Item ${parseInt(photo.item_index) + 1}</h6>
                            <img src="${window.location.origin}/uploads/${photo.photo_path}" 
                                 class="img-fluid rounded" 
                                 style="max-height: 200px; object-fit: cover;"
                                 alt="Bill item photo">
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        container.style.display = '';
    }
    
    displayPayments(payments) {
        const container = document.getElementById('paymentsTable');
        if (!container || !payments || payments.length === 0) return;
        
        let html = '';
        payments.forEach(payment => {
            html += `
                <tr>
                    <td>${payment.payment_number}</td>
                    <td>₹${payment.amount.toFixed(2)}</td>
                    <td>${payment.payment_mode}</td>
                    <td>${payment.payment_date_formatted}</td>
                    <td>${payment.transaction_id || '-'}</td>
                    <td>${payment.cheque_number || '-'}</td>
                    <td>${payment.bank_name || '-'}</td>
                </tr>
            `;
        });
        
        container.innerHTML = html;
    }
    
    displayCreatedBy(bill) {
        const container = document.getElementById('createdByInfo');
        if (!container) return;
        
        container.innerHTML = `
            <p><strong>Created by:</strong> ${bill.created_by_name || 'Unknown'}</p>
            <p><strong>Role:</strong> ${bill.created_by_role || 'Staff'}</p>
            <p><strong>Date:</strong> ${bill.created_at_formatted}</p>
        `;
    }
    
    displayGSTDetails(bill) {
        const container = document.getElementById('gstDetails');
        if (!container) return;
        
        let html = '';
        
        if (bill.gst_type === 'intra_state') {
            html = `
                <p><strong>GST Type:</strong> Intra-State (CGST + SGST)</p>
                <p><strong>Taxable Value:</strong> ₹${bill.total_taxable_value.toFixed(2)}</p>
                <p><strong>CGST (${(bill.total_cgst / bill.total_taxable_value * 100).toFixed(2)}%):</strong> ₹${bill.total_cgst.toFixed(2)}</p>
                <p><strong>SGST (${(bill.total_sgst / bill.total_taxable_value * 100).toFixed(2)}%):</strong> ₹${bill.total_sgst.toFixed(2)}</p>
            `;
        } else if (bill.gst_type === 'inter_state') {
            html = `
                <p><strong>GST Type:</strong> Inter-State (IGST)</p>
                <p><strong>Taxable Value:</strong> ₹${bill.total_taxable_value.toFixed(2)}</p>
                <p><strong>IGST (${(bill.total_igst / bill.total_taxable_value * 100).toFixed(2)}%):</strong> ₹${bill.total_igst.toFixed(2)}</p>
            `;
        }
        
        if (bill.gst_number) {
            html += `<p><strong>GST Number:</strong> ${bill.gst_number}</p>`;
        }
        
        if (bill.business_name) {
            html += `<p><strong>Business Name:</strong> ${bill.business_name}</p>`;
        }
        
        if (bill.business_address) {
            html += `<p><strong>Business Address:</strong> ${bill.business_address}</p>`;
        }
        
        container.innerHTML = html;
        container.style.display = '';
    }
    
    setupEventListeners() {
        document.getElementById('printBillBtn').addEventListener('click', () => this.printBill());
        document.getElementById('shareBillBtn').addEventListener('click', () => this.shareBill());
        document.getElementById('closeViewBtn').addEventListener('click', () => window.close());
        
        if (this.auth.getUser()) {
            document.getElementById('adminActions').style.display = 'block';
            document.getElementById('addPaymentBtn').addEventListener('click', () => this.showAddPaymentModal());
            document.getElementById('sendReminderBtn').addEventListener('click', () => this.sendReminder());
            document.getElementById('savePaymentBtn').addEventListener('click', () => this.savePayment());
            document.getElementById('closePaymentModal').addEventListener('click', () => app.hideModal('addPaymentModal'));
        }
    }
    
    setupQRCode() {
        const billData = {
            billNumber: document.getElementById('billNumber').textContent,
            customerName: document.getElementById('customerName').textContent,
            totalAmount: document.getElementById('totalAmount').textContent,
            date: document.getElementById('billDate').textContent,
            verifyUrl: window.location.href
        };
        
        this.app.generateQRCode(billData, 'billQRCode');
    }
    
    printBill() {
        window.print();
    }
    
    shareBill() {
        const billUrl = window.location.href;
        
        if (navigator.share) {
            navigator.share({
                title: `Bill ${document.getElementById('billNumber').textContent}`,
                text: `View bill details for ${document.getElementById('customerName').textContent}`,
                url: billUrl
            });
        } else {
            navigator.clipboard.writeText(billUrl).then(() => {
                app.showToast('Bill URL copied to clipboard', 'success');
            });
        }
    }
    
    showAddPaymentModal() {
        document.getElementById('paymentAmount').value = '';
        document.getElementById('paymentMode').value = 'cash';
        document.getElementById('transactionId').value = '';
        document.getElementById('chequeNumber').value = '';
        document.getElementById('bankName').value = '';
        document.getElementById('paymentNotes').value = '';
        
        app.showModal('addPaymentModal');
    }
    
    async savePayment() {
        const paymentData = {
            amount: parseFloat(document.getElementById('paymentAmount').value),
            payment_mode: document.getElementById('paymentMode').value,
            transaction_id: document.getElementById('transactionId').value.trim(),
            cheque_number: document.getElementById('chequeNumber').value.trim(),
            bank_name: document.getElementById('bankName').value.trim(),
            notes: document.getElementById('paymentNotes').value.trim()
        };
        
        if (!paymentData.amount || paymentData.amount <= 0) {
            app.showToast('Payment amount is required', 'error');
            return;
        }
        
        const restore = app.showLoading(document.getElementById('savePaymentBtn'));
        
        try {
            await this.auth.request(`/bills/${this.billToken}/payment`, {
                method: 'POST',
                body: JSON.stringify(paymentData)
            });
            
            app.showToast('Payment added successfully', 'success');
            app.hideModal('addPaymentModal');
            this.loadBill();
            
        } catch (error) {
            app.showToast(`Failed to add payment: ${error.message}`, 'error');
        } finally {
            restore();
        }
    }
    
    async sendReminder() {
        const confirmed = await app.confirmDialog('Send payment reminder to customer?');
        if (!confirmed) return;
        
        try {
            await this.auth.request(`/admin/reminder/${this.billToken}`, {
                method: 'POST',
                body: JSON.stringify({ reminderType: 'weekly' })
            });
            
            app.showToast('Reminder sent successfully', 'success');
        } catch (error) {
            app.showToast('Failed to send reminder', 'error');
        }
    }
    
    showError(message) {
        const container = document.getElementById('billContainer');
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

new ViewBill();
