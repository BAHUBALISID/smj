const pool = require('../config/database');
const { getDateRange } = require('../utils/dateTime');

const getSalesReport = async (startDate, endDate, groupBy = 'daily') => {
  let groupClause, dateFormat;
  
  switch (groupBy) {
    case 'daily':
      groupClause = 'DATE(b.created_at)';
      dateFormat = 'DATE_FORMAT(b.created_at, "%d/%m/%Y")';
      break;
    case 'weekly':
      groupClause = 'YEARWEEK(b.created_at)';
      dateFormat = 'CONCAT(YEAR(b.created_at), "-W", WEEK(b.created_at))';
      break;
    case 'monthly':
      groupClause = 'DATE_FORMAT(b.created_at, "%Y-%m")';
      dateFormat = 'DATE_FORMAT(b.created_at, "%M %Y")';
      break;
    case 'yearly':
      groupClause = 'YEAR(b.created_at)';
      dateFormat = 'YEAR(b.created_at)';
      break;
    default:
      groupClause = 'DATE(b.created_at)';
      dateFormat = 'DATE_FORMAT(b.created_at, "%d/%m/%Y")';
  }
  
  const [rows] = await pool.execute(
    `SELECT 
       ${dateFormat} as period,
       COUNT(*) as bill_count,
       SUM(b.total_amount) as total_sales,
       SUM(b.paid_amount) as total_paid,
       SUM(b.remaining_amount) as total_pending,
       AVG(b.total_amount) as avg_bill_value,
       SUM(b.total_net_weight) as total_weight,
       SUM(b.total_making_charges) as total_making,
       SUM(b.total_taxable_value) as total_taxable,
       SUM(b.total_cgst + b.total_sgst + b.total_igst) as total_tax
     FROM bills b
     WHERE b.created_at BETWEEN ? AND ?
     GROUP BY ${groupClause}
     ORDER BY MIN(b.created_at) DESC`,
    [startDate, endDate]
  );
  
  return rows;
};

const getCustomerReport = async (startDate, endDate, limit = 20) => {
  const [rows] = await pool.execute(
    `SELECT 
       c.id,
       c.name,
       c.phone,
       COUNT(b.id) as purchase_count,
       SUM(b.total_amount) as total_spent,
       MAX(b.created_at) as last_purchase,
       AVG(b.total_amount) as avg_purchase,
       SUM(b.total_net_weight) as total_weight,
       c.date_of_birth,
       c.gst_number
     FROM customers c
     LEFT JOIN bills b ON c.id = b.customer_id AND b.created_at BETWEEN ? AND ?
     WHERE c.total_purchases > 0
     GROUP BY c.id
     ORDER BY total_spent DESC
     LIMIT ?`,
    [startDate, endDate, limit]
  );
  
  return rows;
};

const getGSTReport = async (startDate, endDate) => {
  const [rows] = await pool.execute(
    `SELECT 
       b.gst_type,
       DATE_FORMAT(b.created_at, '%Y-%m') as month,
       COUNT(*) as bill_count,
       SUM(b.total_taxable_value) as total_taxable,
       SUM(b.total_cgst) as total_cgst,
       SUM(b.total_sgst) as total_sgst,
       SUM(b.total_igst) as total_igst,
       SUM(b.total_amount) as total_amount,
       COUNT(DISTINCT b.gst_number) as gst_customers
     FROM bills b
     WHERE b.created_at BETWEEN ? AND ? 
       AND b.gst_type != 'none'
     GROUP BY b.gst_type, DATE_FORMAT(b.created_at, '%Y-%m')
     ORDER BY month DESC, b.gst_type`,
    [startDate, endDate]
  );
  
  return rows;
};

const getProductReport = async (startDate, endDate) => {
  const [rows] = await pool.execute(
    `SELECT 
       bi.metal_type,
       bi.purity,
       COUNT(*) as item_count,
       SUM(bi.quantity) as total_quantity,
       SUM(bi.net_weight) as total_weight,
       SUM(bi.metal_value) as total_metal_value,
       SUM(bi.making_charges) as total_making,
       SUM(bi.stone_charge) as total_stone,
       SUM(bi.huid_charge) as total_huid,
       AVG(bi.metal_rate) as avg_rate,
       MIN(bi.metal_rate) as min_rate,
       MAX(bi.metal_rate) as max_rate
     FROM bill_items bi
     JOIN bills b ON bi.bill_id = b.id
     WHERE b.created_at BETWEEN ? AND ?
     GROUP BY bi.metal_type, bi.purity
     ORDER BY total_metal_value DESC`,
    [startDate, endDate]
  );
  
  return rows;
};

const getPaymentModeReport = async (startDate, endDate) => {
  const [rows] = await pool.execute(
    `SELECT 
       bp.payment_mode,
       COUNT(*) as payment_count,
       SUM(bp.amount) as total_amount,
       MIN(bp.amount) as min_amount,
       MAX(bp.amount) as max_amount,
       AVG(bp.amount) as avg_amount
     FROM bill_payments bp
     JOIN bills b ON bp.bill_id = b.id
     WHERE b.created_at BETWEEN ? AND ?
     GROUP BY bp.payment_mode
     ORDER BY total_amount DESC`,
    [startDate, endDate]
  );
  
  return rows;
};

const getMetalSalesReport = async (startDate, endDate) => {
  const [rows] = await pool.execute(
    `SELECT 
       bi.metal_type,
       COUNT(*) as item_count,
       SUM(bi.net_weight) as total_weight,
       SUM(bi.metal_value) as total_value,
       SUM(bi.item_total) as total_sales,
       AVG(bi.metal_rate) as avg_rate
     FROM bill_items bi
     JOIN bills b ON bi.bill_id = b.id
     WHERE b.created_at BETWEEN ? AND ?
     GROUP BY bi.metal_type
     ORDER BY total_value DESC`,
    [startDate, endDate]
  );
  
  return rows;
};

const getInventoryUsageReport = async (startDate, endDate) => {
  const [rows] = await pool.execute(
    `SELECT 
       LOWER(TRIM(SUBSTRING_INDEX(bi.description, ' ', 3))) as product_type,
       COUNT(*) as usage_count,
       SUM(bi.quantity) as total_quantity,
       SUM(bi.item_total) as total_value
     FROM bill_items bi
     JOIN bills b ON bi.bill_id = b.id
     WHERE b.created_at BETWEEN ? AND ?
     GROUP BY product_type
     HAVING usage_count > 1
     ORDER BY usage_count DESC
     LIMIT 20`,
    [startDate, endDate]
  );
  
  return rows;
};

const exportReportToCSV = async (reportType, startDate, endDate) => {
  let data, headers;
  
  switch (reportType) {
    case 'sales':
      data = await getSalesReport(startDate, endDate, 'daily');
      headers = ['Date', 'Bill Count', 'Total Sales', 'Total Paid', 'Total Pending', 'Average Bill', 'Total Weight', 'Total Making', 'Total Taxable', 'Total Tax'];
      break;
    case 'customers':
      data = await getCustomerReport(startDate, endDate, 1000);
      headers = ['Customer ID', 'Name', 'Phone', 'Purchase Count', 'Total Spent', 'Last Purchase', 'Average Purchase', 'Total Weight', 'Date of Birth', 'GST Number'];
      break;
    case 'gst':
      data = await getGSTReport(startDate, endDate);
      headers = ['GST Type', 'Month', 'Bill Count', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Total Amount', 'GST Customers'];
      break;
    case 'products':
      data = await getProductReport(startDate, endDate);
      headers = ['Metal Type', 'Purity', 'Item Count', 'Total Quantity', 'Total Weight', 'Metal Value', 'Making Charges', 'Stone Charge', 'HUID Charge', 'Avg Rate', 'Min Rate', 'Max Rate'];
      break;
    default:
      throw new Error('Invalid report type');
  }
  
  const csvRows = [];
  csvRows.push(headers.join(','));
  
  for (const row of data) {
    const values = Object.values(row).map(value => 
      typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
    );
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
};

module.exports = {
  getSalesReport,
  getCustomerReport,
  getGSTReport,
  getProductReport,
  getPaymentModeReport,
  getMetalSalesReport,
  getInventoryUsageReport,
  exportReportToCSV
};
