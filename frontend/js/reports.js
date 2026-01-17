class Reports {
    constructor() {
        this.auth = auth;
        this.app = app;
        this.currentReport = 'sales';
        this.filters = {
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
            groupBy: 'daily'
        };
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        this.setupDatePickers();
        await this.loadReport();
        this.setupCharts();
    }
    
    setupEventListeners() {
        document.querySelectorAll('.report-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchReport(e));
        });
        
        document.getElementById('applyFilters').addEventListener('click', () => this.applyFilters());
        document.getElementById('resetFilters').addEventListener('click', () => this.resetFilters());
        document.getElementById('exportReport').addEventListener('click', () => this.exportReport());
        document.getElementById('refreshReport').addEventListener('click', () => this.refreshReport());
        
        document.getElementById('startDate').addEventListener('change', (e) => {
            this.filters.startDate = e.target.value;
        });
        
        document.getElementById('endDate').addEventListener('change', (e) => {
            this.filters.endDate = e.target.value;
        });
        
        document.getElementById('groupBy').addEventListener('change', (e) => {
            this.filters.groupBy = e.target.value;
        });
    }
    
    setupDatePickers() {
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        document.getElementById('startDate').value = thirtyDaysAgo.toISOString().split('T')[0];
        document.getElementById('endDate').value = today.toISOString().split('T')[0];
        document.getElementById('startDate').max = today.toISOString().split('T')[0];
        document.getElementById('endDate').max = today.toISOString().split('T')[0];
    }
    
    switchReport(e) {
        const tab = e.target.closest('.report-tab');
        if (!tab) return;
        
        const reportType = tab.getAttribute('data-report');
        this.currentReport = reportType;
        
        document.querySelectorAll('.report-tab').forEach(t => {
            t.classList.remove('active');
        });
        tab.classList.add('active');
        
        document.querySelectorAll('.report-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${reportType}Report`).classList.add('active');
        
        this.loadReport();
    }
    
    async loadReport() {
        try {
            let data;
            let chartFunction;
            
            switch (this.currentReport) {
                case 'sales':
                    data = await this.auth.request(`/reports/sales?startDate=${this.filters.startDate}&endDate=${this.filters.endDate}&groupBy=${this.filters.groupBy}`);
                    chartFunction = () => this.renderSalesChart(data);
                    this.displaySalesReport(data);
                    break;
                case 'customers':
                    data = await this.auth.request(`/reports/customers?startDate=${this.filters.startDate}&endDate=${this.filters.endDate}&limit=50`);
                    chartFunction = () => this.renderCustomerChart(data);
                    this.displayCustomerReport(data);
                    break;
                case 'gst':
                    data = await this.auth.request(`/reports/gst?startDate=${this.filters.startDate}&endDate=${this.filters.endDate}`);
                    chartFunction = () => this.renderGSTChart(data);
                    this.displayGSTReport(data);
                    break;
                case 'products':
                    data = await this.auth.request(`/reports/products?startDate=${this.filters.startDate}&endDate=${this.filters.endDate}`);
                    chartFunction = () => this.renderProductChart(data);
                    this.displayProductReport(data);
                    break;
                case 'payment':
                    data = await this.auth.request(`/reports/payment-modes?startDate=${this.filters.startDate}&endDate=${this.filters.endDate}`);
                    chartFunction = () => this.renderPaymentChart(data);
                    this.displayPaymentReport(data);
                    break;
                default:
                    return;
            }
            
            this.setupCharts(chartFunction);
            
        } catch (error) {
            console.error('Error loading report:', error);
            app.showToast('Failed to load report data', 'error');
        }
    }
    
    displaySalesReport(data) {
        const container = document.getElementById('salesReportData');
        if (!container) return;
        
        if (!data || data.length === 0) {
            container.innerHTML = '<tr><td colspan="10" class="text-center">No sales data found</td></tr>';
            return;
        }
        
        let html = '';
        data.forEach(item => {
            html += `
                <tr>
                    <td>${item.period}</td>
                    <td>${item.bill_count}</td>
                    <td>₹${item.total_sales.toFixed(2)}</td>
                    <td>₹${item.total_paid.toFixed(2)}</td>
                    <td>₹${item.total_pending.toFixed(2)}</td>
                    <td>₹${item.avg_bill_value.toFixed(2)}</td>
                    <td>${item.total_weight.toFixed(3)}</td>
                    <td>₹${item.total_making.toFixed(2)}</td>
                    <td>₹${item.total_taxable.toFixed(2)}</td>
                    <td>₹${item.total_tax.toFixed(2)}</td>
                </tr>
            `;
        });
        
        container.innerHTML = html;
    }
    
    displayCustomerReport(data) {
        const container = document.getElementById('customerReportData');
        if (!container) return;
        
        if (!data || data.length === 0) {
            container.innerHTML = '<tr><td colspan="9" class="text-center">No customer data found</td></tr>';
            return;
        }
        
        let html = '';
        data.forEach((customer, index) => {
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${customer.name}</td>
                    <td>${customer.phone}</td>
                    <td>${customer.date_of_birth || '-'}</td>
                    <td>${customer.gst_number || '-'}</td>
                    <td>${customer.purchase_count}</td>
                    <td>₹${customer.total_spent.toFixed(2)}</td>
                    <td>₹${customer.avg_purchase.toFixed(2)}</td>
                    <td>${customer.last_purchase ? app.formatDate(customer.last_purchase) : 'Never'}</td>
                </tr>
            `;
        });
        
        container.innerHTML = html;
    }
    
    displayGSTReport(data) {
        const container = document.getElementById('gstReportData');
        if (!container) return;
        
        if (!data || data.length === 0) {
            container.innerHTML = '<tr><td colspan="9" class="text-center">No GST data found</td></tr>';
            return;
        }
        
        let html = '';
        data.forEach(item => {
            html += `
                <tr>
                    <td>${item.gst_type === 'intra_state' ? 'Intra-State (CGST+SGST)' : 'Inter-State (IGST)'}</td>
                    <td>${item.month}</td>
                    <td>${item.bill_count}</td>
                    <td>₹${item.total_taxable.toFixed(2)}</td>
                    <td>₹${item.total_cgst.toFixed(2)}</td>
                    <td>₹${item.total_sgst.toFixed(2)}</td>
                    <td>₹${item.total_igst.toFixed(2)}</td>
                    <td>₹${item.total_amount.toFixed(2)}</td>
                    <td>${item.gst_customers}</td>
                </tr>
            `;
        });
        
        container.innerHTML = html;
    }
    
    displayProductReport(data) {
        const container = document.getElementById('productReportData');
        if (!container) return;
        
        if (!data || data.length === 0) {
            container.innerHTML = '<tr><td colspan="12" class="text-center">No product data found</td></tr>';
            return;
        }
        
        let html = '';
        data.forEach(item => {
            html += `
                <tr>
                    <td>${item.metal_type}</td>
                    <td>${item.purity}</td>
                    <td>${item.item_count}</td>
                    <td>${item.total_quantity.toFixed(3)}</td>
                    <td>${item.total_weight.toFixed(3)}</td>
                    <td>₹${item.total_metal_value.toFixed(2)}</td>
                    <td>₹${item.total_making.toFixed(2)}</td>
                    <td>₹${item.total_stone.toFixed(2)}</td>
                    <td>₹${item.total_huid.toFixed(2)}</td>
                    <td>₹${item.avg_rate.toFixed(2)}</td>
                    <td>₹${item.min_rate.toFixed(2)}</td>
                    <td>₹${item.max_rate.toFixed(2)}</td>
                </tr>
            `;
        });
        
        container.innerHTML = html;
    }
    
    displayPaymentReport(data) {
        const container = document.getElementById('paymentReportData');
        if (!container) return;
        
        if (!data || data.length === 0) {
            container.innerHTML = '<tr><td colspan="7" class="text-center">No payment data found</td></tr>';
            return;
        }
        
        let html = '';
        data.forEach(item => {
            html += `
                <tr>
                    <td>${item.payment_mode.charAt(0).toUpperCase() + item.payment_mode.slice(1)}</td>
                    <td>${item.payment_count}</td>
                    <td>₹${item.total_amount.toFixed(2)}</td>
                    <td>₹${item.min_amount.toFixed(2)}</td>
                    <td>₹${item.max_amount.toFixed(2)}</td>
                    <td>₹${item.avg_amount.toFixed(2)}</td>
                    <td>${((item.total_amount / data.reduce((sum, i) => sum + i.total_amount, 0)) * 100).toFixed(2)}%</td>
                </tr>
            `;
        });
        
        container.innerHTML = html;
    }
    
    setupCharts(chartFunction) {
        if (chartFunction) {
            setTimeout(() => chartFunction(), 100);
        }
    }
    
    renderSalesChart(data) {
        const canvas = document.getElementById('salesChart');
        if (!canvas || !data || data.length === 0) return;
        
        const ctx = canvas.getContext('2d');
        
        if (this.salesChart) {
            this.salesChart.destroy();
        }
        
        const labels = data.map(item => item.period);
        const sales = data.map(item => item.total_sales);
        
        this.salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Sales (₹)',
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
    }
    
    renderCustomerChart(data) {
        const canvas = document.getElementById('customerChart');
        if (!canvas || !data || data.length === 0) return;
        
        const ctx = canvas.getContext('2d');
        
        if (this.customerChart) {
            this.customerChart.destroy();
        }
        
        const labels = data.slice(0, 10).map(customer => customer.name);
        const values = data.slice(0, 10).map(customer => customer.total_spent);
        
        this.customerChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Top Customers (₹)',
                    data: values,
                    backgroundColor: '#D4AF37',
                    borderColor: '#B8941F',
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
                                return `Spent: ₹${context.raw.toFixed(2)}`;
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
    }
    
    renderGSTChart(data) {
        const canvas = document.getElementById('gstChart');
        if (!canvas || !data || data.length === 0) return;
        
        const ctx = canvas.getContext('2d');
        
        if (this.gstChart) {
            this.gstChart.destroy();
        }
        
        const months = [...new Set(data.map(item => item.month))].sort();
        const intraStateData = months.map(month => {
            const item = data.find(d => d.month === month && d.gst_type === 'intra_state');
            return item ? item.total_cgst + item.total_sgst : 0;
        });
        const interStateData = months.map(month => {
            const item = data.find(d => d.month === month && d.gst_type === 'inter_state');
            return item ? item.total_igst : 0;
        });
        
        this.gstChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    {
                        label: 'Intra-State GST',
                        data: intraStateData,
                        backgroundColor: '#D4AF37',
                        borderColor: '#B8941F',
                        borderWidth: 1
                    },
                    {
                        label: 'Inter-State GST',
                        data: interStateData,
                        backgroundColor: '#17A2B8',
                        borderColor: '#138496',
                        borderWidth: 1
                    }
                ]
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
                                return `${context.dataset.label}: ₹${context.raw.toFixed(2)}`;
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
    }
    
    renderProductChart(data) {
        const canvas = document.getElementById('productChart');
        if (!canvas || !data || data.length === 0) return;
        
        const ctx = canvas.getContext('2d');
        
        if (this.productChart) {
            this.productChart.destroy();
        }
        
        const labels = data.map(item => `${item.metal_type} ${item.purity}`);
        const values = data.map(item => item.total_metal_value);
        
        this.productChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: [
                        '#D4AF37', '#FFC107', '#17A2B8', '#28A745', '#DC3545',
                        '#6F42C1', '#E83E8C', '#20C997', '#FD7E14', '#6C757D'
                    ],
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
    }
    
    renderPaymentChart(data) {
        const canvas = document.getElementById('paymentChart');
        if (!canvas || !data || data.length === 0) return;
        
        const ctx = canvas.getContext('2d');
        
        if (this.paymentChart) {
            this.paymentChart.destroy();
        }
        
        const labels = data.map(item => item.payment_mode.charAt(0).toUpperCase() + item.payment_mode.slice(1));
        const values = data.map(item => item.total_amount);
        
        this.paymentChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: [
                        '#D4AF37', '#28A745', '#17A2B8', '#DC3545', '#6F42C1',
                        '#E83E8C', '#20C997', '#FD7E14', '#6C757D', '#343A40'
                    ],
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
                                const total = data.reduce((sum, item) => sum + item.total_amount, 0);
                                const percentage = ((context.raw / total) * 100).toFixed(2);
                                return `${context.label}: ₹${context.raw.toFixed(2)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    applyFilters() {
        this.filters.startDate = document.getElementById('startDate').value;
        this.filters.endDate = document.getElementById('endDate').value;
        this.filters.groupBy = document.getElementById('groupBy').value;
        
        this.loadReport();
        app.showToast('Filters applied successfully', 'success');
    }
    
    resetFilters() {
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        document.getElementById('startDate').value = thirtyDaysAgo.toISOString().split('T')[0];
        document.getElementById('endDate').value = today.toISOString().split('T')[0];
        document.getElementById('groupBy').value = 'daily';
        
        this.filters = {
            startDate: thirtyDaysAgo.toISOString().split('T')[0],
            endDate: today.toISOString().split('T')[0],
            groupBy: 'daily'
        };
        
        this.loadReport();
        app.showToast('Filters reset successfully', 'success');
    }
    
    async exportReport() {
        try {
            const csvData = await this.auth.request(
                `/reports/export?reportType=${this.currentReport}&startDate=${this.filters.startDate}&endDate=${this.filters.endDate}`
            );
            
            const blob = new Blob([csvData], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${this.currentReport}_report_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            app.showToast('Report exported successfully', 'success');
        } catch (error) {
            app.showToast('Failed to export report', 'error');
        }
    }
    
    async refreshReport() {
        const restore = app.showLoading(document.getElementById('refreshReport'));
        try {
            await this.loadReport();
            app.showToast('Report refreshed successfully', 'success');
        } catch (error) {
            app.showToast('Failed to refresh report', 'error');
        } finally {
            restore();
        }
    }
}

const reports = new Reports();
