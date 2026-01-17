class PendingBills {
    constructor() {
        this.auth = auth;
        this.app = app;
        this.currentPage = 1;
        this.pageSize = 20;
        this.init();
    }
    
    async init() {
        await this.loadPendingBills();
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        document.getElementById('refreshBillsBtn').addEventListener('click', () => this.loadPendingBills());
        document.getElementById('sendRemindersBtn').addEventListener('click', () => this.sendReminders());
        document.getElementById('exportBillsBtn').addEventListener('click', () => this.exportPendingBills());
        
        document.getElementById('prevPageBtn').addEventListener('click', () => this.changePage(-1));
        document.getElementById('nextPageBtn').addEventListener('click', () => this.changePage(1));
        
        document.getElementById('savePaymentBtn').addEventListener('click', () => this.savePayment());
        document.getElementById('closePaymentModal').addEventListener('click', () => app.hideModal('paymentModal'));
    }
    
    async loadPendingBills() {
        try {
            const data = await this.auth.request(`/bills/pending?page=${this.currentPage}&limit=${this.pageSize}`);
            this.displayPendingBills(data.bills);
            this.updatePagination(data.total, data.page, data.limit);
        } catch (error) {
            console.error('Error loading pending bills:', error);
            app.showToast('Failed to load pending bills', 'error');
        }
    }
    
    displayPendingBills(bills) {
        const container = document.getElementById('pendingBillsTable');
        if (!container) return;
        
        if (!bills || bills.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center">
                        <i class="fas fa-check-circle fa-2x" style="color: #ccc; margin: 20px 0;"></i>
                        <p>No pending bills found</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        bills.forEach(bill => {
            html += `
                <tr>
                    <td>${bill.bill_number}</td>
                    <td>${bill.customer_name}</td>
                    <td>${bill.customer_phone}</td>
                    <td>${app.formatDate(bill.created_at)}</td>
                    <td><span class="badge ${bill.bill_type === 'normal' ? 'badge-info' : 'badge-warning'}">${bill.bill_type}</span></td>
                    <td><span class="badge ${bill.bill_status === 'paid' ? 'badge-success' : bill.bill_status === 'partial' ? 'badge-warning' : 'badge-danger'}">${bill.bill_status}</span></td>
                    <td>₹${bill.total_amount.toFixed(2)}</td>
                    <td>₹${bill.paid_amount.toFixed(2)}</td>
                    <td>₹${bill.remaining_amount.toFixed(2)}</td>
                    <td>
                        <button class="btn btn-primary btn-small" onclick="pendingBills.addPayment('${bill.bill_number}', ${bill.id})">
                            <i class="fas fa-money-bill-wave"></i>
                        </button>
                        <button class="btn btn-secondary btn-small" onclick="window.open('view-bill.html?billId=${bill.id}', '_blank')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-warning btn-small" onclick="pendingBills.sendReminder(${bill.id})">
                            <i class="fas fa-bell"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        container.innerHTML = html;
    }
    
    updatePagination(total, page, limit) {
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        const pageInfo = document.getElementById('pageInfo');
        
        const totalPages = Math.ceil(total / limit);
        
        prevBtn.disabled = page <= 1;
        nextBtn.disabled = page >= totalPages;
        
        if (pageInfo) {
            pageInfo.textContent = `Page ${page} of ${totalPages} (${total} bills)`;
        }
    }
    
    changePage(direction) {
        this.currentPage += direction;
        if (this.currentPage < 1) this.currentPage = 1;
        this.loadPendingBills();
    }
    
    addPayment(billNumber, billId) {
        this.currentBillId = billId;
        
        document.getElementById('paymentModalTitle').textContent = `Add Payment - ${billNumber}`;
        document.getElementById('paymentAmount').value = '';
        document.getElementById('paymentMode').value = 'cash';
        document.getElementById('transactionId').value = '';
        document.getElementById('chequeNumber').value = '';
        document.getElementById('bankName').value = '';
        document.getElementById('paymentNotes').value = '';
        
        app.showModal('paymentModal');
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
            await this.auth.request(`/bills/${this.currentBillId}/payment`, {
                method: 'POST',
                body: JSON.stringify(paymentData)
            });
            
            app.showToast('Payment added successfully', 'success');
            app.hideModal('paymentModal');
            this.loadPendingBills();
            
        } catch (error) {
            app.showToast(`Failed to add payment: ${error.message}`, 'error');
        } finally {
            restore();
        }
    }
    
    async sendReminder(billId) {
        try {
            await this.auth.request(`/admin/reminder/${billId}`, {
                method: 'POST',
                body: JSON.stringify({ reminderType: 'weekly' })
            });
            
            app.showToast('Reminder sent successfully', 'success');
        } catch (error) {
            app.showToast('Failed to send reminder', 'error');
        }
    }
    
    async sendReminders() {
        const confirmed = await app.confirmDialog('Send reminders to all customers with pending payments?');
        if (!confirmed) return;
        
        try {
            const data = await this.auth.request('/bills/pending?limit=1000');
            
            let successCount = 0;
            let failCount = 0;
            
            for (const bill of data.bills) {
                try {
                    await this.auth.request(`/admin/reminder/${bill.id}`, {
                        method: 'POST',
                        body: JSON.stringify({ reminderType: 'weekly' })
                    });
                    successCount++;
                    
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    failCount++;
                }
            }
            
            app.showToast(`Reminders sent: ${successCount} successful, ${failCount} failed`, 'info');
            
        } catch (error) {
            app.showToast('Failed to send reminders', 'error');
        }
    }
    
    async exportPendingBills() {
        try {
            const data = await this.auth.request('/bills/pending?limit=1000');
            
            let csvContent = 'Bill Number,Customer Name,Phone,Date,Type,Status,Total Amount,Paid Amount,Remaining Amount\n';
            
            data.bills.forEach(bill => {
                csvContent += `"${bill.bill_number}","${bill.customer_name}","${bill.customer_phone}","${bill.created_at}","${bill.bill_type}","${bill.bill_status}",${bill.total_amount},${bill.paid_amount},${bill.remaining_amount}\n`;
            });
            
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pending_bills_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            app.showToast('Pending bills exported successfully', 'success');
        } catch (error) {
            app.showToast('Failed to export pending bills', 'error');
        }
    }
}

const pendingBills = new PendingBills();
