class Admin {
    constructor() {
        this.auth = auth;
        this.app = app;
        this.currentPage = 1;
        this.pageSize = 20;
        this.init();
    }
    
    async init() {
        await this.loadUsers();
        await this.loadSystemStats();
        await this.loadNotificationLogs();
        this.setupEventListeners();
        this.setupCharts();
    }
    
    setupEventListeners() {
        document.getElementById('addUserBtn').addEventListener('click', () => this.showAddUserModal());
        document.getElementById('refreshUsersBtn').addEventListener('click', () => this.loadUsers());
        document.getElementById('refreshStatsBtn').addEventListener('click', () => this.refreshAll());
        
        document.getElementById('saveUserBtn').addEventListener('click', () => this.saveUser());
        document.getElementById('closeUserModal').addEventListener('click', () => app.hideModal('userModal'));
        
        document.getElementById('deleteBillsBtn').addEventListener('click', () => this.showDeleteBillsModal());
        document.getElementById('confirmDeleteBills').addEventListener('click', () => this.deleteBillsByYear());
        document.getElementById('closeDeleteModal').addEventListener('click', () => app.hideModal('deleteBillsModal'));
        
        document.getElementById('prevPageBtn').addEventListener('click', () => this.changePage(-1));
        document.getElementById('nextPageBtn').addEventListener('click', () => this.changePage(1));
        
        document.getElementById('prevLogsBtn').addEventListener('click', () => this.changeLogsPage(-1));
        document.getElementById('nextLogsBtn').addEventListener('click', () => this.changeLogsPage(1));
        
        document.getElementById('sendTestNotification').addEventListener('click', () => this.sendTestNotification());
        
        document.getElementById('yearSelectAll').addEventListener('change', (e) => this.toggleAllYears(e));
    }
    
    async loadUsers() {
        try {
            const users = await this.auth.request('/users/all');
            this.displayUsers(users);
        } catch (error) {
            console.error('Error loading users:', error);
            app.showToast('Failed to load users', 'error');
        }
    }
    
    displayUsers(users) {
        const container = document.getElementById('usersTable');
        if (!container) return;
        
        if (!users || users.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">
                        <i class="fas fa-users fa-2x" style="color: #ccc; margin: 20px 0;"></i>
                        <p>No users found</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        users.forEach(user => {
            html += `
                <tr>
                    <td>${user.name}</td>
                    <td>${user.email}</td>
                    <td><span class="badge ${user.role === 'admin' ? 'badge-danger' : user.role === 'manager' ? 'badge-warning' : 'badge-info'}">${user.role}</span></td>
                    <td>${user.phone || '-'}</td>
                    <td><span class="badge ${user.is_active ? 'badge-success' : 'badge-danger'}">${user.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>${app.formatDateTime(user.created_at)}</td>
                    <td>
                        <button class="btn btn-secondary btn-small" onclick="admin.toggleUserStatus(${user.id}, ${!user.is_active})">
                            <i class="fas fa-${user.is_active ? 'ban' : 'check'}"></i>
                        </button>
                        <button class="btn btn-danger btn-small" onclick="admin.deleteUser(${user.id})" ${user.role === 'admin' ? 'disabled' : ''}>
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        container.innerHTML = html;
    }
    
    async loadSystemStats() {
        try {
            const stats = await this.auth.request('/admin/system-stats');
            this.displaySystemStats(stats);
        } catch (error) {
            console.error('Error loading system stats:', error);
        }
    }
    
    displaySystemStats(stats) {
        document.getElementById('totalBillsStat').textContent = stats.bills.total_bills || 0;
        document.getElementById('totalSalesStat').textContent = `₹${(stats.bills.total_sales || 0).toFixed(2)}`;
        document.getElementById('pendingAmountStat').textContent = `₹${(stats.bills.total_pending || 0).toFixed(2)}`;
        document.getElementById('totalCustomersStat').textContent = stats.customers.total_customers || 0;
        document.getElementById('totalExchangesStat').textContent = stats.exchanges.total_exchanges || 0;
        document.getElementById('totalUsersStat').textContent = stats.users.total_users || 0;
        
        const pendingBills = stats.bills.pending_count || 0;
        const partialBills = stats.bills.partial_count || 0;
        document.getElementById('pendingBillsStat').textContent = pendingBills + partialBills;
        
        const lastUpdated = new Date(stats.timestamp).toLocaleString('en-IN');
        document.getElementById('lastUpdated').textContent = lastUpdated;
    }
    
    async loadNotificationLogs(page = 1) {
        try {
            const logs = await this.auth.request(`/admin/notifications?page=${page}&limit=10`);
            this.displayNotificationLogs(logs);
            this.currentLogsPage = page;
            this.updateLogsPagination(logs.total, page, logs.limit);
        } catch (error) {
            console.error('Error loading notification logs:', error);
        }
    }
    
    displayNotificationLogs(logs) {
        const container = document.getElementById('notificationLogs');
        if (!container) return;
        
        if (!logs.logs || logs.logs.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <p>No notification logs found</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        logs.logs.forEach(log => {
            html += `
                <tr>
                    <td>${log.customer_name || '-'}</td>
                    <td>${log.customer_phone || '-'}</td>
                    <td><span class="badge ${log.notification_type === 'birthday' ? 'badge-success' : 'badge-warning'}">${log.notification_type}</span></td>
                    <td><span class="badge ${log.message_type === 'whatsapp' ? 'badge-success' : 'badge-info'}">${log.message_type}</span></td>
                    <td><span class="badge ${log.status === 'sent' || log.status === 'delivered' ? 'badge-success' : 'badge-danger'}">${log.status}</span></td>
                    <td>${log.sent_at_formatted}</td>
                    <td>${log.error_message || '-'}</td>
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
            pageInfo.textContent = `Page ${page} of ${totalPages}`;
        }
    }
    
    updateLogsPagination(total, page, limit) {
        const prevBtn = document.getElementById('prevLogsBtn');
        const nextBtn = document.getElementById('nextLogsBtn');
        const pageInfo = document.getElementById('logsPageInfo');
        
        const totalPages = Math.ceil(total / limit);
        
        prevBtn.disabled = page <= 1;
        nextBtn.disabled = page >= totalPages;
        
        if (pageInfo) {
            pageInfo.textContent = `Page ${page} of ${totalPages}`;
        }
    }
    
    changePage(direction) {
        this.currentPage += direction;
        if (this.currentPage < 1) this.currentPage = 1;
        this.loadUsers();
    }
    
    changeLogsPage(direction) {
        const newPage = this.currentLogsPage + direction;
        if (newPage < 1) return;
        this.loadNotificationLogs(newPage);
    }
    
    showAddUserModal() {
        document.getElementById('userModalTitle').textContent = 'Add New User';
        document.getElementById('userId').value = '';
        document.getElementById('modalUserName').value = '';
        document.getElementById('modalUserEmail').value = '';
        document.getElementById('modalUserPassword').value = '';
        document.getElementById('modalUserRole').value = 'staff';
        document.getElementById('modalUserPhone').value = '';
        
        app.showModal('userModal');
    }
    
    async saveUser() {
        const userId = document.getElementById('userId').value;
        const userData = {
            name: document.getElementById('modalUserName').value.trim(),
            email: document.getElementById('modalUserEmail').value.trim(),
            password: document.getElementById('modalUserPassword').value,
            role: document.getElementById('modalUserRole').value,
            phone: document.getElementById('modalUserPhone').value.trim()
        };
        
        if (!userData.name || !userData.email) {
            app.showToast('Name and email are required', 'error');
            return;
        }
        
        if (!userId && !userData.password) {
            app.showToast('Password is required for new users', 'error');
            return;
        }
        
        if (userData.password && userData.password.length < 6) {
            app.showToast('Password must be at least 6 characters', 'error');
            return;
        }
        
        const restore = app.showLoading(document.getElementById('saveUserBtn'));
        
        try {
            if (userId) {
                await this.auth.request(`/users/${userId}`, {
                    method: 'PUT',
                    body: JSON.stringify(userData)
                });
                app.showToast('User updated successfully', 'success');
            } else {
                await this.auth.request('/users/create', {
                    method: 'POST',
                    body: JSON.stringify(userData)
                });
                app.showToast('User created successfully', 'success');
            }
            
            app.hideModal('userModal');
            this.loadUsers();
            
        } catch (error) {
            app.showToast(`Failed to save user: ${error.message}`, 'error');
        } finally {
            restore();
        }
    }
    
    async toggleUserStatus(userId, isActive) {
        try {
            await this.auth.request(`/users/${userId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ isActive })
            });
            
            app.showToast(`User ${isActive ? 'activated' : 'deactivated'} successfully`, 'success');
            this.loadUsers();
        } catch (error) {
            app.showToast('Failed to update user status', 'error');
        }
    }
    
    async deleteUser(userId) {
        const confirmed = await app.confirmDialog('Are you sure you want to delete this user? This action cannot be undone.');
        if (!confirmed) return;
        
        try {
            await this.auth.request(`/users/${userId}`, {
                method: 'DELETE'
            });
            
            app.showToast('User deleted successfully', 'success');
            this.loadUsers();
        } catch (error) {
            app.showToast('Failed to delete user', 'error');
        }
    }
    
    showDeleteBillsModal() {
        const currentYear = new Date().getFullYear();
        const yearSelect = document.getElementById('yearSelect');
        yearSelect.innerHTML = '';
        
        for (let year = 2020; year <= currentYear; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        }
        
        app.showModal('deleteBillsModal');
    }
    
    toggleAllYears(e) {
        const checkboxes = document.querySelectorAll('#yearSelect option');
        checkboxes.forEach(option => {
            option.selected = e.target.checked;
        });
    }
    
    async deleteBillsByYear() {
        const yearSelect = document.getElementById('yearSelect');
        const selectedYears = Array.from(yearSelect.selectedOptions).map(option => option.value);
        
        if (selectedYears.length === 0) {
            app.showToast('Please select at least one year', 'error');
            return;
        }
        
        const confirmed = await app.confirmDialog(`Are you sure you want to delete all bills from ${selectedYears.join(', ')}? This action cannot be undone.`);
        if (!confirmed) return;
        
        const restore = app.showLoading(document.getElementById('confirmDeleteBills'));
        
        try {
            await this.auth.request('/bills/delete-by-year', {
                method: 'POST',
                body: JSON.stringify({ years: selectedYears })
            });
            
            app.showToast(`Bills deleted successfully for years: ${selectedYears.join(', ')}`, 'success');
            app.hideModal('deleteBillsModal');
            this.refreshAll();
            
        } catch (error) {
            app.showToast(`Failed to delete bills: ${error.message}`, 'error');
        } finally {
            restore();
        }
    }
    
    async sendTestNotification() {
        const currentUser = this.auth.getUser();
        if (!currentUser || !currentUser.phone) {
            app.showToast('User phone number not found', 'error');
            return;
        }
        
        try {
            await this.auth.request(`/admin/birthday/${currentUser.id}`, {
                method: 'POST'
            });
            
            app.showToast('Test notification sent successfully', 'success');
        } catch (error) {
            app.showToast('Failed to send test notification', 'error');
        }
    }
    
    setupCharts() {
        this.setupActivityChart();
        this.setupUserRoleChart();
    }
    
    async setupActivityChart() {
        const canvas = document.getElementById('activityChart');
        if (!canvas) return;
        
        try {
            const today = new Date();
            const labels = [];
            const data = [];
            
            for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                labels.push(date.toLocaleDateString('en-IN', { weekday: 'short' }));
                data.push(Math.floor(Math.random() * 100) + 50);
            }
            
            new Chart(canvas.getContext('2d'), {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'System Activity',
                        data: data,
                        borderColor: '#D4AF37',
                        backgroundColor: 'rgba(212, 175, 55, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'top',
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return value;
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error setting up activity chart:', error);
        }
    }
    
    async setupUserRoleChart() {
        const canvas = document.getElementById('userRoleChart');
        if (!canvas) return;
        
        try {
            const users = await this.auth.request('/users/all');
            const roleCounts = {
                admin: 0,
                manager: 0,
                staff: 0
            };
            
            users.forEach(user => {
                if (roleCounts[user.role] !== undefined) {
                    roleCounts[user.role]++;
                }
            });
            
            new Chart(canvas.getContext('2d'), {
                type: 'pie',
                data: {
                    labels: ['Admin', 'Manager', 'Staff'],
                    datasets: [{
                        data: [roleCounts.admin, roleCounts.manager, roleCounts.staff],
                        backgroundColor: ['#D4AF37', '#17A2B8', '#28A745'],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'right',
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error setting up user role chart:', error);
        }
    }
    
    async refreshAll() {
        const restore = app.showLoading(document.getElementById('refreshStatsBtn'));
        try {
            await Promise.all([
                this.loadSystemStats(),
                this.loadUsers(),
                this.loadNotificationLogs(1)
            ]);
            app.showToast('All data refreshed successfully', 'success');
        } catch (error) {
            app.showToast('Failed to refresh data', 'error');
        } finally {
            restore();
        }
    }
}

const admin = new Admin();
