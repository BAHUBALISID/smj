class Dashboard {
    constructor() {
        this.auth = auth;
        this.app = app;
        this.init();
    }
    
    async init() {
        await this.loadStats();
        await this.loadRecentBills();
        await this.loadRecentCustomers();
        this.setupCharts();
        this.setupEventListeners();
    }
    
    async loadStats() {
        try {
            const [billStats, customerStats, exchangeStats] = await Promise.all([
                this.auth.request('/bills/stats'),
                this.auth.request('/customers/stats/summary'),
                this.auth.request('/exchanges/stats')
            ]);
            
            this.updateStatsDisplay(billStats, customerStats, exchangeStats);
        } catch (error) {
            console.error('Error loading stats:', error);
            app.showToast('Failed to load dashboard statistics', 'error');
        }
    }
    
    updateStatsDisplay(billStats, customerStats, exchangeStats) {
        document.getElementById('totalSales').textContent = `₹${(billStats.total_sales || 0).toFixed(2)}`;
        document.getElementById('totalBills').textContent = billStats.total_bills || 0;
        document.getElementById('pendingAmount').textContent = `₹${(billStats.total_pending || 0).toFixed(2)}`;
        document.getElementById('totalCustomers').textContent = customerStats.total_customers || 0;
        document.getElementById('advanceBills').textContent = billStats.advance_bills || 0;
        document.getElementById('exchangeCount').textContent = exchangeStats.total_exchanges || 0;
        document.getElementById('avgBillValue').textContent = `₹${(billStats.avg_bill_value || 0).toFixed(2)}`;
        document.getElementById('todaySales').textContent = `₹${(billStats.today_sales || 0).toFixed(2)}`;
    }
    
    async loadRecentBills() {
        try {
            const bills = await this.auth.request('/bills/search?limit=10');
            this.displayRecentBills(bills);
        } catch (error) {
            console.error('Error loading recent bills:', error);
        }
    }
    
    displayRecentBills(bills) {
        const container = document.getElementById('recentBills');
        if (!container) return;
        
        if (!bills || bills.length === 0) {
            container.innerHTML = '<tr><td colspan="6" class="text-center">No recent bills found</td></tr>';
            return;
        }
        
        let html = '';
        bills.forEach(bill => {
            html += `
                <tr>
                    <td>${bill.bill_number}</td>
                    <td>${bill.customer_name}</td>
                    <td>${bill.customer_phone}</td>
                    <td>${app.formatDateTime(bill.created_at)}</td>
                    <td><span class="badge ${bill.bill_status === 'paid' ? 'badge-success' : bill.bill_status === 'partial' ? 'badge-warning' : 'badge-danger'}">${bill.bill_status}</span></td>
                    <td class="text-right">₹${bill.total_amount.toFixed(2)}</td>
                </tr>
            `;
        });
        
        container.innerHTML = html;
    }
    
    async loadRecentCustomers() {
        try {
            const customers = await this.auth.request('/customers/search?limit=10');
            this.displayRecentCustomers(customers);
        } catch (error) {
            console.error('Error loading recent customers:', error);
        }
    }
    
    displayRecentCustomers(customers) {
        const container = document.getElementById('recentCustomers');
        if (!container) return;
        
        if (!customers || customers.length === 0) {
            container.innerHTML = '<tr><td colspan="5" class="text-center">No recent customers found</td></tr>';
            return;
        }
        
        let html = '';
        customers.forEach(customer => {
            html += `
                <tr>
                    <td>${customer.name}</td>
                    <td>${customer.phone}</td>
                    <td>${customer.total_purchases ? `₹${customer.total_purchases.toFixed(2)}` : '₹0.00'}</td>
                    <td>${customer.last_purchase_date || 'Never'}</td>
                    <td>${app.formatDate(customer.created_at)}</td>
                </tr>
            `;
        });
        
        container.innerHTML = html;
    }
    
    setupCharts() {
        this.setupSalesChart();
        this.setupPaymentChart();
        this.setupMetalChart();
    }
    
    async setupSalesChart() {
        const canvas = document.getElementById('salesChart');
        if (!canvas) return;
        
        try {
            const data = await this.auth.request('/reports/sales?groupBy=daily&startDate=' + 
                new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 
                '&endDate=' + new Date().toISOString().split('T')[0]);
            
            const labels = data.map(item => item.period);
            const sales = data.map(item => item.total_sales || 0);
            
            new Chart(canvas.getContext('2d'), {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Daily Sales (₹)',
                        data: sales,
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
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `Sales: ₹${context.raw.toFixed(2)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return '₹' + value;
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error loading sales chart data:', error);
        }
    }
    
    async setupPaymentChart() {
        const canvas = document.getElementById('paymentChart');
        if (!canvas) return;
        
        try {
            const data = await this.auth.request('/reports/payment-modes?startDate=' + 
                new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 
                '&endDate=' + new Date().toISOString().split('T')[0]);
            
            const labels = data.map(item => item.payment_mode);
            const amounts = data.map(item => item.total_amount);
            const backgroundColors = ['#D4AF37', '#FFC107', '#17A2B8', '#28A745', '#DC3545'];
            
            new Chart(canvas.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: amounts,
                        backgroundColor: backgroundColors,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'right',
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `${context.label}: ₹${context.raw.toFixed(2)}`;
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error loading payment chart data:', error);
        }
    }
    
    async setupMetalChart() {
        const canvas = document.getElementById('metalChart');
        if (!canvas) return;
        
        try {
            const data = await this.auth.request('/reports/products?startDate=' + 
                new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 
                '&endDate=' + new Date().toISOString().split('T')[0]);
            
            const goldData = data.filter(item => item.metal_type === 'GOLD');
            const silverData = data.filter(item => item.metal_type === 'SILVER');
            const diamondData = data.filter(item => item.metal_type === 'DIAMOND');
            
            const labels = ['Gold', 'Silver', 'Diamond'];
            const values = [
                goldData.reduce((sum, item) => sum + (item.total_metal_value || 0), 0),
                silverData.reduce((sum, item) => sum + (item.total_metal_value || 0), 0),
                diamondData.reduce((sum, item) => sum + (item.total_metal_value || 0), 0)
            ];
            
            new Chart(canvas.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Metal Sales (₹)',
                        data: values,
                        backgroundColor: ['#D4AF37', '#C0C0C0', '#B9F2FF'],
                        borderColor: ['#B8941F', '#A0A0A0', '#99D9EA'],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `Sales: ₹${context.raw.toFixed(2)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return '₹' + value;
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error loading metal chart data:', error);
        }
    }
    
    setupEventListeners() {
        const refreshBtn = document.getElementById('refreshDashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshDashboard());
        }
        
        const quickBillBtn = document.getElementById('quickBill');
        if (quickBillBtn) {
            quickBillBtn.addEventListener('click', () => {
                window.location.href = 'billing.html';
            });
        }
        
        const quickCustomerBtn = document.getElementById('quickCustomer');
        if (quickCustomerBtn) {
            quickCustomerBtn.addEventListener('click', () => {
                app.showModal('addCustomerModal');
            });
        }
        
        const exportReportBtn = document.getElementById('exportReport');
        if (exportReportBtn) {
            exportReportBtn.addEventListener('click', () => this.exportDashboardReport());
        }
    }
    
    async refreshDashboard() {
        const restore = app.showLoading(document.getElementById('refreshDashboard'));
        try {
            await Promise.all([
                this.loadStats(),
                this.loadRecentBills(),
                this.loadRecentCustomers()
            ]);
            app.showToast('Dashboard refreshed successfully', 'success');
        } catch (error) {
            app.showToast('Failed to refresh dashboard', 'error');
        } finally {
            restore();
        }
    }
    
    async exportDashboardReport() {
        try {
            const csvData = await this.auth.request('/reports/export?reportType=sales');
            
            const blob = new Blob([csvData], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `dashboard_report_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            app.showToast('Report exported successfully', 'success');
        } catch (error) {
            app.showToast('Failed to export report', 'error');
        }
    }
}

new Dashboard();
