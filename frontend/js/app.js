class App {
    constructor() {
        this.auth = auth;
        this.init();
    }
    
    init() {
        this.setupNavigation();
        this.setupSearch();
        this.setupModal();
        this.setupDatePickers();
        this.updateDateTime();
    }
    
    setupNavigation() {
        const currentPage = window.location.pathname.split('/').pop();
        const menuItems = document.querySelectorAll('.menu-item');
        
        menuItems.forEach(item => {
            const href = item.getAttribute('href');
            if (href && href.includes(currentPage.replace('.html', ''))) {
                item.classList.add('active');
            }
            
            item.addEventListener('click', (e) => {
                if (item.getAttribute('href') === '#') {
                    e.preventDefault();
                }
            });
        });
    }
    
    setupSearch() {
        const searchInput = document.querySelector('.search-input');
        const searchResults = document.querySelector('.search-results');
        
        if (!searchInput || !searchResults) return;
        
        let searchTimeout;
        
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            
            const query = e.target.value.trim();
            
            if (query.length < 2) {
                searchResults.style.display = 'none';
                return;
            }
            
            searchTimeout = setTimeout(async () => {
                try {
                    const data = await this.auth.request(`/bills/search?search=${encodeURIComponent(query)}&limit=10`);
                    this.displaySearchResults(data);
                } catch (error) {
                    console.error('Search error:', error);
                }
            }, 300);
        });
        
        searchInput.addEventListener('focus', () => {
            if (searchResults.innerHTML.trim()) {
                searchResults.style.display = 'block';
            }
        });
        
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.style.display = 'none';
            }
        });
    }
    
    displaySearchResults(results) {
        const searchResults = document.querySelector('.search-results');
        
        if (!results || results.length === 0) {
            searchResults.innerHTML = '<div class="search-result-item">No results found</div>';
            searchResults.style.display = 'block';
            return;
        }
        
        let html = '';
        
        results.forEach(result => {
            html += `
                <div class="search-result-item" data-id="${result.id}" data-type="bill">
                    <div style="font-weight: 600;">${result.bill_number}</div>
                    <div style="font-size: 0.9rem; color: #666;">${result.customer_name} • ${result.customer_phone}</div>
                    <div style="font-size: 0.9rem; margin-top: 5px;">
                        <span class="badge ${result.bill_status === 'paid' ? 'badge-success' : 'badge-warning'}">
                            ${result.bill_status}
                        </span>
                        <span style="float: right; font-weight: 600;">₹${result.total_amount.toFixed(2)}</span>
                    </div>
                </div>
            `;
        });
        
        searchResults.innerHTML = html;
        searchResults.style.display = 'block';
        
        const resultItems = searchResults.querySelectorAll('.search-result-item');
        resultItems.forEach(item => {
            item.addEventListener('click', () => {
                const id = item.getAttribute('data-id');
                const type = item.getAttribute('data-type');
                this.openSearchResult(id, type);
            });
        });
    }
    
    openSearchResult(id, type) {
        if (type === 'bill') {
            window.open(`view-bill.html?billId=${id}`, '_blank');
        }
        
        document.querySelector('.search-results').style.display = 'none';
        document.querySelector('.search-input').value = '';
    }
    
    setupModal() {
        const modals = document.querySelectorAll('.modal');
        
        modals.forEach(modal => {
            const closeBtn = modal.querySelector('.modal-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    modal.classList.remove('active');
                });
            }
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                modals.forEach(modal => {
                    modal.classList.remove('active');
                });
            }
        });
    }
    
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        }
    }
    
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }
    
    setupDatePickers() {
        const dateInputs = document.querySelectorAll('input[type="date"]');
        
        dateInputs.forEach(input => {
            if (!input.value) {
                const today = new Date().toISOString().split('T')[0];
                input.value = today;
                input.setAttribute('max', today);
            }
        });
    }
    
    updateDateTime() {
        const updateTime = () => {
            const now = new Date();
            const dateTimeElements = document.querySelectorAll('.current-datetime');
            
            dateTimeElements.forEach(element => {
                const options = { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                };
                element.textContent = now.toLocaleDateString('en-IN', options);
            });
        };
        
        updateTime();
        setInterval(updateTime, 1000);
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }
    
    formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
    
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(amount);
    }
    
    formatWeight(weight) {
        return parseFloat(weight).toFixed(3);
    }
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
            color: white;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 3000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }
    
    showLoading(element) {
        const originalHTML = element.innerHTML;
        element.innerHTML = '<span class="loading"></span>';
        element.disabled = true;
        return () => {
            element.innerHTML = originalHTML;
            element.disabled = false;
        };
    }
    
    confirmDialog(message) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 400px;">
                    <div class="modal-header">
                        <h3 class="modal-title">Confirm</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                            <button class="btn btn-secondary" id="confirmCancel">Cancel</button>
                            <button class="btn btn-primary" id="confirmOk">OK</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            modal.querySelector('.modal-close').addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(false);
            });
            
            modal.querySelector('#confirmCancel').addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(false);
            });
            
            modal.querySelector('#confirmOk').addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(true);
            });
        });
    }
    
    generateQRCode(data, elementId) {
        if (!window.QRCode) {
            console.error('QRCode library not loaded');
            return;
        }
        
        const element = document.getElementById(elementId);
        if (!element) return;
        
        QRCode.toCanvas(element, JSON.stringify(data), {
            width: 200,
            margin: 1,
            color: {
                dark: '#111111',
                light: '#FFFFFF'
            }
        }, (error) => {
            if (error) {
                console.error('QR code generation failed:', error);
            }
        });
    }
}

const app = new App();
