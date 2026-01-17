const reportService = require('../services/reportService');

const getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, groupBy } = req.query;
    
    if (!startDate || !endDate) {
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
      startDate = thirtyDaysAgo.toISOString().split('T')[0];
      endDate = today.toISOString().split('T')[0];
    }
    
    const report = await reportService.getSalesReport(startDate, endDate, groupBy);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getCustomerReport = async (req, res) => {
  try {
    const { startDate, endDate, limit } = req.query;
    
    if (!startDate || !endDate) {
      const today = new Date();
      const ninetyDaysAgo = new Date(today.getTime() - (90 * 24 * 60 * 60 * 1000));
      startDate = ninetyDaysAgo.toISOString().split('T')[0];
      endDate = today.toISOString().split('T')[0];
    }
    
    const limitNum = parseInt(limit) || 20;
    const report = await reportService.getCustomerReport(startDate, endDate, limitNum);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getGSTReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      const today = new Date();
      const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      startDate = currentMonth.toISOString().split('T')[0];
      endDate = today.toISOString().split('T')[0];
    }
    
    const report = await reportService.getGSTReport(startDate, endDate);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getProductReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
      startDate = thirtyDaysAgo.toISOString().split('T')[0];
      endDate = today.toISOString().split('T')[0];
    }
    
    const report = await reportService.getProductReport(startDate, endDate);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getPaymentModeReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
      startDate = thirtyDaysAgo.toISOString().split('T')[0];
      endDate = today.toISOString().split('T')[0];
    }
    
    const report = await reportService.getPaymentModeReport(startDate, endDate);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const exportReport = async (req, res) => {
  try {
    const { reportType, startDate, endDate } = req.query;
    
    if (!reportType) {
      return res.status(400).json({ error: 'Report type is required' });
    }
    
    const csvData = await reportService.exportReportToCSV(reportType, startDate, endDate);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${reportType}_report_${Date.now()}.csv`);
    res.send(csvData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getSalesReport,
  getCustomerReport,
  getGSTReport,
  getProductReport,
  getPaymentModeReport,
  exportReport
};
