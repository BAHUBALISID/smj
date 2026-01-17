const crypto = require('crypto');
const qrcode = require('qrcode');

const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const generateQRCode = async (data) => {
  try {
    const qrData = JSON.stringify(data);
    const qrCode = await qrcode.toDataURL(qrData);
    return qrCode;
  } catch (error) {
    throw new Error('QR code generation failed');
  }
};

const generateBillQRData = (bill) => {
  return {
    type: 'bill',
    billNumber: bill.bill_number,
    customerName: bill.customer_name,
    totalAmount: bill.total_amount,
    date: bill.created_at,
    token: bill.qr_token,
    verifyUrl: `${process.env.FRONTEND_URL}/view-bill.html?token=${bill.qr_token}`
  };
};

const generateExchangeQRData = (exchange) => {
  return {
    type: 'exchange',
    exchangeNumber: exchange.exchange_number,
    customerName: exchange.customer_name,
    settlementType: exchange.settlement_type,
    date: exchange.created_at,
    token: exchange.qr_token,
    verifyUrl: `${process.env.FRONTEND_URL}/view-exchange.html?token=${exchange.qr_token}`
  };
};

module.exports = {
  generateToken,
  generateQRCode,
  generateBillQRData,
  generateExchangeQRData
};
