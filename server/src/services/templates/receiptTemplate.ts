export interface ReceiptTemplateData {
  receiptNumber: string;
  paymentDate: string;
  tenantName: string;
  tenantPhone: string;
  propertyName: string;
  propertyAddress: string;
  unitIdentifier: string;
  landlordName: string;
  billType: string;
  billingPeriod: string;
  // Amounts
  rentAmount: number;
  utilityAmount: number;
  penaltyAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  // Payment details
  paymentAmount: number;
  paymentMethod: string;
  referenceNumber?: string;
  recordedBy: string;
  notes?: string;
  // Utility breakdown (optional)
  utilityBreakdown?: {
    electricity?: { consumption?: number; rate?: number; amount: number };
    water?: { consumption?: number; rate?: number; amount: number };
    internet?: { amount: number };
    others?: { description?: string; amount: number };
  };
}

const formatCurrency = (amount: number): string => {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const capitalizeFirst = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
};

export const generateReceiptHTML = (data: ReceiptTemplateData): string => {
  const utilityRows = data.utilityBreakdown
    ? [
        data.utilityBreakdown.electricity && data.utilityBreakdown.electricity.amount > 0
          ? `<tr>
              <td style="padding-left: 30px;">Electricity${data.utilityBreakdown.electricity.consumption ? ` (${data.utilityBreakdown.electricity.consumption} kWh)` : ''}</td>
              <td class="amount">${formatCurrency(data.utilityBreakdown.electricity.amount)}</td>
            </tr>`
          : '',
        data.utilityBreakdown.water && data.utilityBreakdown.water.amount > 0
          ? `<tr>
              <td style="padding-left: 30px;">Water${data.utilityBreakdown.water.consumption ? ` (${data.utilityBreakdown.water.consumption} cu.m)` : ''}</td>
              <td class="amount">${formatCurrency(data.utilityBreakdown.water.amount)}</td>
            </tr>`
          : '',
        data.utilityBreakdown.internet && data.utilityBreakdown.internet.amount > 0
          ? `<tr>
              <td style="padding-left: 30px;">Internet</td>
              <td class="amount">${formatCurrency(data.utilityBreakdown.internet.amount)}</td>
            </tr>`
          : '',
        data.utilityBreakdown.others && data.utilityBreakdown.others.amount > 0
          ? `<tr>
              <td style="padding-left: 30px;">${data.utilityBreakdown.others.description || 'Other charges'}</td>
              <td class="amount">${formatCurrency(data.utilityBreakdown.others.amount)}</td>
            </tr>`
          : ''
      ]
        .filter(Boolean)
        .join('\n')
    : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt - ${data.receiptNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #1a1a1a;
      padding: 30px 40px;
      max-width: 210mm;
      margin: 0 auto;
      background: #fff;
    }

    .receipt-header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 3px solid #2563eb;
      margin-bottom: 25px;
    }

    .receipt-header h1 {
      font-size: 22pt;
      font-weight: 700;
      color: #2563eb;
      margin-bottom: 4px;
      letter-spacing: 1px;
    }

    .receipt-header .subtitle {
      font-size: 10pt;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 2px;
    }

    .receipt-meta {
      display: flex;
      justify-content: space-between;
      margin-bottom: 25px;
      padding: 15px 20px;
      background: #f8fafc;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }

    .receipt-meta .meta-item {
      text-align: left;
    }

    .receipt-meta .meta-item:last-child {
      text-align: right;
    }

    .meta-label {
      font-size: 9pt;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 2px;
    }

    .meta-value {
      font-size: 12pt;
      font-weight: 600;
      color: #1e293b;
    }

    .parties {
      display: flex;
      justify-content: space-between;
      margin-bottom: 25px;
      gap: 20px;
    }

    .party-block {
      flex: 1;
      padding: 12px 16px;
      border-left: 3px solid #2563eb;
      background: #f8fafc;
    }

    .party-label {
      font-size: 9pt;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 5px;
    }

    .party-name {
      font-weight: 600;
      font-size: 12pt;
      margin-bottom: 3px;
    }

    .party-detail {
      font-size: 10pt;
      color: #475569;
    }

    .billing-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }

    .billing-table th {
      background: #1e293b;
      color: #fff;
      padding: 10px 15px;
      text-align: left;
      font-size: 10pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .billing-table th:last-child {
      text-align: right;
    }

    .billing-table td {
      padding: 10px 15px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 11pt;
    }

    .billing-table td.amount {
      text-align: right;
      font-family: 'Courier New', monospace;
      font-weight: 500;
    }

    .billing-table tr.subtotal {
      background: #f1f5f9;
    }

    .billing-table tr.subtotal td {
      font-weight: 600;
      border-top: 2px solid #cbd5e1;
    }

    .billing-table tr.total {
      background: #1e293b;
      color: #fff;
    }

    .billing-table tr.total td {
      font-weight: 700;
      font-size: 12pt;
      border: none;
    }

    .billing-table tr.paid {
      background: #f0fdf4;
    }

    .billing-table tr.paid td {
      color: #15803d;
      font-weight: 600;
    }

    .billing-table tr.balance td {
      font-weight: 700;
      color: ${data.balanceAmount > 0 ? '#dc2626' : '#15803d'};
      font-size: 12pt;
    }

    .payment-details {
      margin-bottom: 25px;
      padding: 15px 20px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 6px;
    }

    .payment-details h3 {
      font-size: 11pt;
      color: #15803d;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 10px;
    }

    .payment-details .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 11pt;
    }

    .payment-details .detail-label {
      color: #475569;
    }

    .payment-details .detail-value {
      font-weight: 600;
      color: #1e293b;
    }

    .footer {
      margin-top: 40px;
      padding-top: 15px;
      border-top: 2px solid #e2e8f0;
      text-align: center;
      font-size: 9pt;
      color: #94a3b8;
    }

    .footer p {
      margin-bottom: 3px;
    }

    .stamp {
      display: inline-block;
      padding: 8px 25px;
      border: 3px solid #15803d;
      color: #15803d;
      font-weight: 700;
      font-size: 14pt;
      text-transform: uppercase;
      letter-spacing: 3px;
      transform: rotate(-5deg);
      margin: 20px auto;
      opacity: 0.7;
    }

    @media print {
      body { padding: 15px; }
    }
  </style>
</head>
<body>
  <div class="receipt-header">
    <h1>RentDito</h1>
    <div class="subtitle">Official Payment Receipt</div>
  </div>

  <div class="receipt-meta">
    <div class="meta-item">
      <div class="meta-label">Receipt No.</div>
      <div class="meta-value">${data.receiptNumber}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Billing Period</div>
      <div class="meta-value">${data.billingPeriod}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Payment Date</div>
      <div class="meta-value">${data.paymentDate}</div>
    </div>
  </div>

  <div class="parties">
    <div class="party-block">
      <div class="party-label">Billed To</div>
      <div class="party-name">${data.tenantName}</div>
      <div class="party-detail">${data.tenantPhone}</div>
      <div class="party-detail">${data.unitIdentifier} — ${data.propertyName}</div>
    </div>
    <div class="party-block">
      <div class="party-label">Property Owner</div>
      <div class="party-name">${data.landlordName}</div>
      <div class="party-detail">${data.propertyAddress}</div>
    </div>
  </div>

  <table class="billing-table">
    <thead>
      <tr>
        <th>Description</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      ${data.rentAmount > 0 ? `
      <tr>
        <td>Monthly Rent</td>
        <td class="amount">${formatCurrency(data.rentAmount)}</td>
      </tr>` : ''}

      ${data.utilityAmount > 0 ? `
      <tr>
        <td><strong>Utilities</strong></td>
        <td class="amount">${formatCurrency(data.utilityAmount)}</td>
      </tr>
      ${utilityRows}` : ''}

      ${data.penaltyAmount > 0 ? `
      <tr>
        <td>Late Fee / Penalty</td>
        <td class="amount">${formatCurrency(data.penaltyAmount)}</td>
      </tr>` : ''}

      <tr class="total">
        <td>TOTAL</td>
        <td class="amount">${formatCurrency(data.totalAmount)}</td>
      </tr>
      <tr class="paid">
        <td>Total Paid</td>
        <td class="amount">${formatCurrency(data.paidAmount)}</td>
      </tr>
      <tr class="balance">
        <td>Balance Due</td>
        <td class="amount">${formatCurrency(data.balanceAmount)}</td>
      </tr>
    </tbody>
  </table>

  <div class="payment-details">
    <h3>Payment Information</h3>
    <div class="detail-row">
      <span class="detail-label">Amount Received</span>
      <span class="detail-value">${formatCurrency(data.paymentAmount)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Payment Method</span>
      <span class="detail-value">${capitalizeFirst(data.paymentMethod)}</span>
    </div>
    ${data.referenceNumber ? `
    <div class="detail-row">
      <span class="detail-label">Reference No.</span>
      <span class="detail-value">${data.referenceNumber}</span>
    </div>` : ''}
    <div class="detail-row">
      <span class="detail-label">Recorded By</span>
      <span class="detail-value">${data.recordedBy}</span>
    </div>
    ${data.notes ? `
    <div class="detail-row">
      <span class="detail-label">Notes</span>
      <span class="detail-value">${data.notes}</span>
    </div>` : ''}
  </div>

  ${data.balanceAmount === 0 ? `
  <div style="text-align: center;">
    <div class="stamp">PAID IN FULL</div>
  </div>` : ''}

  <div class="footer">
    <p>This is a system-generated receipt from RentDito Property Management.</p>
    <p>For questions or disputes, contact your property landlord or administrator.</p>
    <p>Generated on ${new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
  </div>
</body>
</html>
  `.trim();
};
