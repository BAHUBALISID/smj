class Customers {
    constructor() {
        this.auth = auth;
        this.app = app;
        this.currentPage = 1;
        this.pageSize = 20;
        this.searchTerm = '';
        this.init();
    }
    
    async init() {
        await this.loadCustomers();
        this.setupEventListeners();
        this.setupSearch();
    }
    
    setupEventListeners() {
        document.getElementById('addCustomerBtn').addEventListener('click', () => this.showAddCustomerModal());
        document.getElementById('refreshCustomersBtn').addEventListener('click', () => this.loadCustomers());
        document.getElementById('exportCustomersBtn').addEventListener('click', () => this.exportCustomers());
        
        document.getElementById('saveCustomerBtn').addEventListener('click', () => this.saveCustomer());
        document.getElementById('closeCustomerModal').addEventListener('click', () => app.hideModal('customerModal'));
        
        document.getElementById('prevPageBtn').addEventListener('click', () => this.changePage(-1));
        document.getElementById('nextPageBtn').addEventListener('click', () => this.changePage(1));
        
        document.getElementById('customerSearch').addEventListener('input', (e) => {
            this.searchTerm = e.target.value.trim();
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => this.loadCustomers(), 300);
        });
    }
    
    setupSearch() {
        const searchInput = document.getElementById('customerSearch');
        if (!searchInput) return;
        
        searchInput.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.trim();
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => this.loadCustomers(), 300);
        });
    }
    
    async loadCustomers() {
        try {
            const url = `/customers/search?search=${encodeURIComponent(this.searchTerm)}&limit=${this.pageSize}`;
            const customers = await this.auth.request(url);
            this.displayCustomers(customers);
            this.updatePagination();
        } catch (error) {
            console.error('Error loading customers:', error);
            app.showToast('Failed to load customers', 'error');
        }
    }
    
    displayCustomers(customers) {
        const container = document.getElementById('customersTable');
        if (!container) return;
        
        if (!customers || customers.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center">
                        <i class="fas fa-users fa-2x" style="color: #ccc; margin: 20px 0;"></i>
                        <p>No customers found</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        customers.forEach(customer => {
            html += `
                <tr>
                    <td>${customer.name}</td>
                    <td>${customer.phone}</td>
                    <td>${customer.phone_alt || '-'}</td>
                    <td>${customer.date_of_birth || '-'}</td>
                    <td>₹${customer.total_purchases ? customer.total_purchases.toFixed(2) : '0.00'}</td>
                    <td>${customer.last_purchase_date || 'Never'}</td>
                    <td>${customer.gst_number || '-'}</td>
                    <td>${app.formatDate(customer.created_at)}</td>
                    <td>
                        <button class="btn btn-secondary btn-small" onclick="customers.viewCustomer(${customer.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-primary btn-small" onclick="customers.editCustomer(${customer.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-small" onclick="customers.deleteCustomer(${customer.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        container.innerHTML = html;
    }
    
    updatePagination() {
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        const pageInfo = document.getElementById('pageInfo');
        
        prevBtn.disabled = this.currentPage <= 1;
        
        if (pageInfo) {
            pageInfo.textContent = `Page ${this.currentPage}`;
        }
    }
    
    changePage(direction) {
        this.currentPage += direction;
        if (this.currentPage < 1) this.currentPage = 1;
        this.loadCustomers();
    }
    
    showAddCustomerModal() {
        document.getElementById('customerModalTitle').textContent = 'Add New Customer';
        document.getElementById('customerId').value = '';
        document.getElementById('modalCustomerName').value = '';
        document.getElementById('modalCustomerPhone').value = '';
        document.getElementById('modalCustomerPhoneAlt').value = '';
        document.getElementById('modalCustomerAadhaar').value = '';
        document.getElementById('modalCustomerPAN').value = '';
        document.getElementById('modalCustomerGST').value = '';
        document.getElementById('modalCustomerAddress').value = '';
        document.getElementById('modalCustomerDOB').value = '';
        document.getElementById('modalCustomerNotes').value = '';
        
        app.showModal('customerModal');
    }
    
    async viewCustomer(customerId) {
        try {
            const customer = await this.auth.request(`/customers/${customerId}`);
            const history = await this.auth.request(`/customers/${customerId}/history`);
            
            this.showCustomerDetails(customer, history);
        } catch (error) {
            app.showToast('Failed to load customer details', 'error');
        }
    }
    
    showCustomerDetails(customer, history) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 900px;">
                <div class="modal-header">
                    <h3 class="modal-title">Customer Details: ${customer.name}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="customer-info-grid">
                        <div class="info-section">
                            <h4><i class="fas fa-user"></i> Personal Information</h4>
                            <div class="info-item"><strong>Phone:</strong> ${customer.phone}</div>
                            <div class="info-item"><strong>Alt Phone:</strong> ${customer.phone_alt || '-'}</div>
                            <div class="info-item"><strong>Date of Birth:</strong> ${customer.date_of_birth || '-'}</div>
                            <div class="info-item"><strong>Total Purchases:</strong> ₹${customer.total_purchases ? customer.total_purchases.toFixed(2) : '0.00'}</div>
                            <div class="info-item"><strong>Last Purchase:</strong> ${customer.last_purchase_date || 'Never'}</div>
                        </div>
                        
                        <div class="info-section">
                            <h4><i class="fas fa-id-card"></i> Identification</h4>
                            <div class="info-item"><strong>Aadhaar:</strong> ${customer.aadhaar || '-'}</div>
                            <div class="info-item"><strong>PAN:</strong> ${customer.pan || '-'}</div>
                            <div class="info-item"><strong>GST:</strong> ${customer.gst_number || '-'}</div>
                            <div class="info-item"><strong>Address:</strong> ${customer.address || '-'}</div>
                            <div class="info-item"><strong>Notes:</strong> ${customer.notes || '-'}</div>
                        </div>
                    </div>
                    
                    <div class="customer-history">
                        <h4><i class="fas fa-history"></i> Purchase History</h4>
                        ${this.renderPurchaseHistory(history)}
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                        <button class="btn btn-primary" onclick="customers.editCustomer(${customer.id}); this.closest('.modal').classList.remove('active')">
                            <i class="fas fa-edit"></i> Edit Customer
                        </button>
                        <button class="btn btn-secondary" onclick="this.closest('.modal').classList.remove('active')">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('.modal-close').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }
    
    renderPurchaseHistory(history) {
        if (!history.bills || history.bills.length === 0) {
            return '<p class="text-center">No purchase history found</p>';
        }
        
        let html = '<div class="table-container"><table class="table"><thead><tr><th>Bill No</th><th>Date</th><th>Type</th><th>Status</th><th>Amount</th><th>Items</th><th>Action</th></tr></thead><tbody>';
        
        history.bills.forEach(bill => {
            html += `
                <tr>
                    <td>${bill.bill_number}</td>
                    <td>${bill.created_at}</td>
                    <td><span class="badge ${bill.bill_type === 'normal' ? 'badge-info' : 'badge-warning'}">${bill.bill_type}</span></td>
                    <td><span class="badge ${bill.bill_status === 'paid' ? 'badge-success' : bill.bill_status === 'partial' ? 'badge-warning' : 'badge-danger'}">${bill.bill_status}</span></td>
                    <td>₹${bill.total_amount.toFixed(2)}</td>
                    <td>${bill.items || '-'}</td>
                    <td>
                        <button class="btn btn-secondary btn-small" onclick="window.open('view-bill.html?billId=${bill.id}', '_blank')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table></div>';
        
        if (history.exchanges && history.exchanges.length > 0) {
            html += '<h5 style="margin-top: 30px;"><i class="fas fa-exchange-alt"></i> Exchange History</h5>';
            html += '<div class="table-container"><table class="table"><thead><tr><th>Exchange No</th><th>Date</th><th>Type</th><th>Old Value</th><th>New Value</th><th>Difference</th><th>Action</th></tr></thead><tbody>';
            
            history.exchanges.forEach(exchange => {
                html += `
                    <tr>
                        <td>${exchange.exchange_number}</td>
                        <td>${exchange.created_at}</td>
                        <td><span class="badge badge-info">${exchange.settlement_type}</span></td>
                        <td>₹${exchange.total_old_value.toFixed(2)}</td>
                        <td>₹${exchange.total_new_value.toFixed(2)}</td>
                        <td>₹${exchange.difference_amount.toFixed(2)}</td>
                        <td>
                            <button class="btn btn-secondary btn-small" onclick="window.open('view-exchange.html?exchangeId=${exchange.id}', '_blank')">
                                <i class="fas fa-eye"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            html += '</tbody></table></div>';
        }
        
        return html;
    }
    
    async editCustomer(customerId) {
        try {
            const customer = await this.auth.request(`/customers/${customerId}`);
            
            document.getElementById('customerModalTitle').textContent = 'Edit Customer';
            document.getElementById('customerId').value = customer.id;
            document.getElementById('modalCustomerName').value = customer.name;
            document.getElementById('modalCustomerPhone').value = customer.phone;
            document.getElementById('modalCustomerPhoneAlt').value = customer.phone_alt || '';
            document.getElementById('modalCustomerAadhaar').value = customer.aadhaar || '';
            document.getElementById('modalCustomerPAN').value = customer.pan || '';
            document.getElementById('modalCustomerGST').value = customer.gst_number || '';
            document.getElementById('modalCustomerAddress').value = customer.address || '';
            document.getElementById('modalCustomerDOB').value = customer.date_of_birth || '';
            document.getElementById('modalCustomerNotes').value = customer.notes || '';
            
            app.showModal('customerModal');
        } catch (error) {
            app.showToast('Failed to load customer data', 'error');
        }
    }
    
    async saveCustomer() {
        const customerId = document.getElementById('customerId').value;
        const customerData = {
            name: document.getElementById('modalCustomerName').value.trim(),
            phone: document.getElementById('modalCustomerPhone').value.trim(),
            phone_alt: document.getElementById('modalCustomerPhoneAlt').value.trim(),
            aadhaar: document.getElementById('modalCustomerAadhaar').value.trim(),
            pan: document.getElementById('modalCustomerPAN').value.trim(),
            gst_number: document.getElementById('modalCustomerGST').value.trim(),
            address: document.getElementById('modalCustomerAddress').value.trim(),
            date_of_birth: document.getElementById('modalCustomerDOB').value,
            notes: document.getElementById('modalCustomerNotes').value.trim()
        };
        
        if (!customerData.name || !customerData.phone) {
            app.showToast('Name and phone are required', 'error');
            return;
        }
        
        const restore = app.showLoading(document.getElementById('saveCustomerBtn'));
        
        try {
            if (customerId) {
                await this.auth.request(`/customers/${customerId}`, {
                    method: 'PUT',
                    body: JSON.stringify(customerData)
                });
                app.showToast('Customer updated successfully', 'success');
            } else {
                await this.auth.request('/customers/create', {
                    method: 'POST',
                    body: JSON.stringify(customerData)
                });
                app.showToast('Customer created successfully', 'success');
            }
            
            app.hideModal('customerModal');
            this.loadCustomers();
            
        } catch (error) {
            app.showToast(`Failed to save customer: ${error.message}`, 'error');
        } finally {
            restore();
        }
    }
    
    async deleteCustomer(customerId) {
        const confirmed = await app.confirmDialog('Are you sure you want to delete this customer? This action cannot be undone.');
        if (!confirmed) return;
        
        try {
            await this.auth.request(`/customers/${customerId}`, {
                method: 'DELETE'
            });
            
            app.showToast('Customer deleted successfully', 'success');
            this.loadCustomers();
        } catch (error) {
            app.showToast('Failed to delete customer', 'error');
        }
    }
    
    async exportCustomers() {
        try {
            const csvData = await this.auth.request('/reports/export?reportType=customers');
            
            const blob = new Blob([csvData], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `customers_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            app.showToast('Customers exported successfully', 'success');
        } catch (error) {
            app.showToast('Failed to export customers', 'error');
        }
    }
}

const customers = new Customers();
