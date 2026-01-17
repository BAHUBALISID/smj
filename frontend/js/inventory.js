class Inventory {
    constructor() {
        this.auth = auth;
        this.app = app;
        this.currentPage = 1;
        this.pageSize = 50;
        this.searchTerm = '';
        this.init();
    }
    
    async init() {
        await this.loadInventory();
        this.setupEventListeners();
        this.setupSearch();
    }
    
    setupEventListeners() {
        document.getElementById('addItemBtn').addEventListener('click', () => this.showAddItemModal());
        document.getElementById('refreshInventoryBtn').addEventListener('click', () => this.loadInventory());
        document.getElementById('exportInventoryBtn').addEventListener('click', () => this.exportInventory());
        
        document.getElementById('saveItemBtn').addEventListener('click', () => this.saveItem());
        document.getElementById('closeItemModal').addEventListener('click', () => app.hideModal('itemModal'));
        
        document.getElementById('prevPageBtn').addEventListener('click', () => this.changePage(-1));
        document.getElementById('nextPageBtn').addEventListener('click', () => this.changePage(1));
        
        document.getElementById('inventorySearch').addEventListener('input', (e) => {
            this.searchTerm = e.target.value.trim();
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => this.loadInventory(), 300);
        });
    }
    
    setupSearch() {
        const searchInput = document.getElementById('inventorySearch');
        if (!searchInput) return;
        
        searchInput.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.trim();
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => this.loadInventory(), 300);
        });
    }
    
    async loadInventory() {
        try {
            const url = `/inventory/all?page=${this.currentPage}&limit=${this.pageSize}&search=${encodeURIComponent(this.searchTerm)}`;
            const data = await this.auth.request(url);
            this.displayInventory(data.items);
            this.updatePagination(data.total, data.page, data.limit);
        } catch (error) {
            console.error('Error loading inventory:', error);
            app.showToast('Failed to load inventory', 'error');
        }
    }
    
    displayInventory(items) {
        const container = document.getElementById('inventoryTable');
        if (!container) return;
        
        if (!items || items.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">
                        <i class="fas fa-boxes fa-2x" style="color: #ccc; margin: 20px 0;"></i>
                        <p>No inventory items found</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        items.forEach(item => {
            html += `
                <tr>
                    <td>${item.name}</td>
                    <td>${item.category || '-'}</td>
                    <td>${item.created_by_name || '-'}</td>
                    <td>${app.formatDateTime(item.created_at)}</td>
                    <td>
                        <button class="btn btn-primary btn-small" onclick="inventory.editItem(${item.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-small" onclick="inventory.deleteItem(${item.id})">
                            <i class="fas fa-trash"></i>
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
            pageInfo.textContent = `Page ${page} of ${totalPages} (${total} items)`;
        }
    }
    
    changePage(direction) {
        this.currentPage += direction;
        if (this.currentPage < 1) this.currentPage = 1;
        this.loadInventory();
    }
    
    showAddItemModal() {
        document.getElementById('itemModalTitle').textContent = 'Add New Item';
        document.getElementById('itemId').value = '';
        document.getElementById('modalItemName').value = '';
        document.getElementById('modalItemCategory').value = '';
        
        app.showModal('itemModal');
    }
    
    async editItem(itemId) {
        try {
            const items = await this.auth.request('/inventory/all?limit=1000');
            const item = items.find(i => i.id === itemId);
            
            if (!item) {
                throw new Error('Item not found');
            }
            
            document.getElementById('itemModalTitle').textContent = 'Edit Item';
            document.getElementById('itemId').value = item.id;
            document.getElementById('modalItemName').value = item.name;
            document.getElementById('modalItemCategory').value = item.category || '';
            
            app.showModal('itemModal');
        } catch (error) {
            app.showToast('Failed to load item data', 'error');
        }
    }
    
    async saveItem() {
        const itemId = document.getElementById('itemId').value;
        const itemData = {
            name: document.getElementById('modalItemName').value.trim(),
            category: document.getElementById('modalItemCategory').value.trim()
        };
        
        if (!itemData.name) {
            app.showToast('Item name is required', 'error');
            return;
        }
        
        const restore = app.showLoading(document.getElementById('saveItemBtn'));
        
        try {
            if (itemId) {
                await this.auth.request(`/inventory/${itemId}`, {
                    method: 'PUT',
                    body: JSON.stringify(itemData)
                });
                app.showToast('Item updated successfully', 'success');
            } else {
                await this.auth.request('/inventory/add', {
                    method: 'POST',
                    body: JSON.stringify(itemData)
                });
                app.showToast('Item added successfully', 'success');
            }
            
            app.hideModal('itemModal');
            this.loadInventory();
            
        } catch (error) {
            app.showToast(`Failed to save item: ${error.message}`, 'error');
        } finally {
            restore();
        }
    }
    
    async deleteItem(itemId) {
        const confirmed = await app.confirmDialog('Are you sure you want to delete this item? This action cannot be undone.');
        if (!confirmed) return;
        
        try {
            await this.auth.request(`/inventory/${itemId}`, {
                method: 'DELETE'
            });
            
            app.showToast('Item deleted successfully', 'success');
            this.loadInventory();
        } catch (error) {
            app.showToast('Failed to delete item', 'error');
        }
    }
    
    async exportInventory() {
        try {
            const csvData = await this.auth.request('/reports/export?reportType=products');
            
            const blob = new Blob([csvData], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `inventory_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            app.showToast('Inventory exported successfully', 'success');
        } catch (error) {
            app.showToast('Failed to export inventory', 'error');
        }
    }
}

const inventory = new Inventory();
