const calculateNetWeight = (gross, less) => {
  return parseFloat((gross - less).toFixed(3));
};

const calculateMetalValue = (netWeight, rate) => {
  return parseFloat((netWeight * rate).toFixed(2));
};

const calculateMakingCharges = (makingCharges, discountPercent) => {
  const discountAmount = makingCharges * (discountPercent / 100);
  return parseFloat((makingCharges - discountAmount).toFixed(2));
};

const calculateTax = (taxableValue, taxPercent, gstType) => {
  const taxAmount = taxableValue * (taxPercent / 100);
  
  if (gstType === 'intra_state') {
    const halfTax = taxAmount / 2;
    return {
      cgst: parseFloat(halfTax.toFixed(2)),
      sgst: parseFloat(halfTax.toFixed(2)),
      igst: 0
    };
  } else if (gstType === 'inter_state') {
    return {
      cgst: 0,
      sgst: 0,
      igst: parseFloat(taxAmount.toFixed(2))
    };
  }
  
  return { cgst: 0, sgst: 0, igst: 0 };
};

const calculateItemTotal = (metalValue, makingCharges, stoneCharge, huidCharge, cgst, sgst, igst) => {
  const total = metalValue + makingCharges + stoneCharge + huidCharge + cgst + sgst + igst;
  return parseFloat(total.toFixed(2));
};

const generateBillSummary = (items, gstType) => {
  let summary = {
    totalGrossWeight: 0,
    totalNetWeight: 0,
    totalMetalValue: 0,
    totalMakingCharges: 0,
    totalDiscount: 0,
    totalStoneCharge: 0,
    totalHuidCharge: 0,
    totalTaxableValue: 0,
    totalCgst: 0,
    totalSgst: 0,
    totalIgst: 0,
    totalAmount: 0
  };
  
  items.forEach(item => {
    summary.totalGrossWeight += parseFloat(item.gross_weight || 0);
    summary.totalNetWeight += parseFloat(item.net_weight || 0);
    summary.totalMetalValue += parseFloat(item.metal_value || 0);
    summary.totalMakingCharges += parseFloat(item.making_charges || 0);
    summary.totalStoneCharge += parseFloat(item.stone_charge || 0);
    summary.totalHuidCharge += parseFloat(item.huid_charge || 0);
    summary.totalTaxableValue += parseFloat(item.taxable_value || 0);
    summary.totalCgst += parseFloat(item.cgst || 0);
    summary.totalSgst += parseFloat(item.sgst || 0);
    summary.totalIgst += parseFloat(item.igst || 0);
    summary.totalAmount += parseFloat(item.item_total || 0);
  });
  
  Object.keys(summary).forEach(key => {
    if (typeof summary[key] === 'number') {
      summary[key] = parseFloat(summary[key].toFixed(2));
    }
  });
  
  return summary;
};

module.exports = {
  calculateNetWeight,
  calculateMetalValue,
  calculateMakingCharges,
  calculateTax,
  calculateItemTotal,
  generateBillSummary
};
