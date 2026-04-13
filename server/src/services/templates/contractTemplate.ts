export interface ContractTemplateData {
  propertyName: string;
  propertyAddress: string;
  unitIdentifier: string;
  landlordName: string;
  landlordAddress?: string;
  tenantName: string;
  tenantAddress: string;
  tenantPhone: string;
  tenantOccupation: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  monthlyRent: number;
  securityDeposit: number;
  advancePayment: number;
  startDate: string;
  endDate: string;
  lockInPeriod: number;
  utilityIncludedInRent: boolean;
  rateType: string;
  terms?: string;
  landlordSignature?: string;
  userSignature?: string;
  signedAt?: string;
  contractId: string;
}

export const generateContractHTML = (data: ContractTemplateData): string => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lease Agreement - ${data.contractId}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #000;
      padding: 40px 60px;
      max-width: 210mm;
      margin: 0 auto;
    }
    
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 2px solid #000;
      padding-bottom: 20px;
    }
    
    .header h1 {
      font-size: 20pt;
      font-weight: bold;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    
    .header p {
      font-size: 11pt;
      color: #333;
    }
    
    .section {
      margin-bottom: 25px;
    }
    
    .section-title {
      font-size: 14pt;
      font-weight: bold;
      margin-bottom: 10px;
      text-transform: uppercase;
      border-bottom: 1px solid #333;
      padding-bottom: 5px;
    }
    
    .parties {
      margin-bottom: 20px;
    }
    
    .party {
      margin-bottom: 15px;
      padding: 10px;
      background: #f9f9f9;
      border-left: 3px solid #333;
    }
    
    .party-label {
      font-weight: bold;
      font-size: 11pt;
      margin-bottom: 5px;
    }
    
    .party-info {
      margin-left: 15px;
      font-size: 11pt;
    }
    
    .terms-list {
      margin-left: 20px;
      margin-top: 10px;
    }
    
    .terms-list li {
      margin-bottom: 10px;
      text-align: justify;
    }
    
    .financial-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    
    .financial-table th,
    .financial-table td {
      border: 1px solid #333;
      padding: 10px;
      text-align: left;
    }
    
    .financial-table th {
      background: #f0f0f0;
      font-weight: bold;
    }
    
    .financial-table td.amount {
      text-align: right;
      font-weight: bold;
    }
    
    .signatures {
      margin-top: 50px;
      display: flex;
      justify-content: space-between;
    }
    
    .signature-block {
      width: 45%;
      text-align: center;
    }
    
    .signature-image {
      border: 1px solid #333;
      height: 80px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fff;
    }
    
    .signature-image img {
      max-height: 70px;
      max-width: 100%;
    }
    
    .signature-line {
      border-top: 2px solid #000;
      margin-top: 10px;
      padding-top: 5px;
      font-weight: bold;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #000;
      text-align: center;
      font-size: 10pt;
      color: #666;
    }
    
    .highlight {
      background: #ffffcc;
      padding: 2px 4px;
      font-weight: bold;
    }
    
    @media print {
      body {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Residential Lease Agreement</h1>
    <p>Contract ID: ${data.contractId}</p>
    <p>Property: ${data.propertyName}</p>
  </div>

  <div class="section">
    <div class="section-title">Parties to the Agreement</div>
    <div class="parties">
      <div class="party">
        <div class="party-label">LESSOR (Landlord):</div>
        <div class="party-info">
          <strong>${data.landlordName}</strong><br>
          ${data.landlordAddress || 'Address on file'}
        </div>
      </div>
      
      <div class="party">
        <div class="party-label">LESSEE (Tenant):</div>
        <div class="party-info">
          <strong>${data.tenantName}</strong><br>
          Address: ${data.tenantAddress}<br>
          Phone: ${data.tenantPhone}<br>
          Occupation: ${data.tenantOccupation}<br>
          Emergency Contact: ${data.emergencyContactName} (${data.emergencyContactRelationship}) - ${data.emergencyContactPhone}
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Property Details</div>
    <p><strong>Property Address:</strong> ${data.propertyAddress}</p>
    <p><strong>Unit/Room:</strong> ${data.unitIdentifier}</p>
  </div>

  <div class="section">
    <div class="section-title">Lease Term</div>
    <p><strong>Start Date:</strong> <span class="highlight">${data.startDate}</span></p>
    <p><strong>End Date:</strong> <span class="highlight">${data.endDate}</span></p>
    <p><strong>Lock-in Period:</strong> <span class="highlight">${data.lockInPeriod} month(s)</span></p>
    <p style="margin-top: 10px; font-style: italic; font-size: 10pt;">
      The tenant agrees not to terminate this lease within the lock-in period unless mutually agreed upon by both parties.
    </p>
  </div>

  <div class="section">
    <div class="section-title">Financial Terms</div>
    <table class="financial-table">
      <tr>
        <th>Description</th>
        <th style="text-align: right;">Amount (PHP)</th>
      </tr>
      <tr>
        <td>Monthly Rent</td>
        <td class="amount">₱${data.monthlyRent.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
      </tr>
      <tr>
        <td>Security Deposit</td>
        <td class="amount">₱${data.securityDeposit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
      </tr>
      <tr>
        <td>Advance Payment</td>
        <td class="amount">₱${data.advancePayment.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
      </tr>
      <tr style="background: #f0f0f0; font-weight: bold;">
        <td>Total Initial Payment</td>
        <td class="amount">₱${(data.securityDeposit + data.advancePayment).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
      </tr>
    </table>
    
    <p><strong>Utility Arrangement:</strong> ${data.utilityIncludedInRent ? 'Included in monthly rent' : 'Separate billing'}</p>
    <p><strong>Utility Rate Type:</strong> ${data.rateType === 'fixed' ? 'Fixed Rate' : 'Submetered'}</p>
  </div>

  <div class="section">
    <div class="section-title">Terms and Conditions</div>
    <ol class="terms-list">
      <li><strong>Payment Terms:</strong> The monthly rent shall be paid on or before the due date specified by the landlord. Late payments may incur penalties as agreed upon.</li>
      
      <li><strong>Security Deposit:</strong> The security deposit shall be held by the landlord as security for the performance of the tenant's obligations. It will be returned within 30 days after the lease termination, subject to deductions for damages or unpaid obligations.</li>
      
      <li><strong>Use of Premises:</strong> The premises shall be used solely for residential purposes. The tenant shall not use the premises for any illegal or immoral purposes.</li>
      
      <li><strong>Maintenance and Repairs:</strong> The tenant shall maintain the premises in good condition and shall be responsible for any damages caused by negligence or misuse.</li>
      
      <li><strong>Utilities:</strong> ${data.utilityIncludedInRent 
        ? 'All utilities are included in the monthly rent.' 
        : `Utilities shall be billed separately based on ${data.rateType === 'fixed' ? 'a fixed rate' : 'actual consumption (submetered)'}.`
      }</li>
      
      <li><strong>Termination:</strong> Either party may terminate this agreement by providing written notice at least 30 days in advance, subject to the lock-in period. Early termination within the lock-in period may result in forfeiture of the security deposit unless mutually agreed otherwise.</li>
      
      <li><strong>House Rules:</strong> The tenant agrees to comply with all house rules and regulations established by the landlord for the property.</li>
      
      <li><strong>Subletting:</strong> The tenant shall not sublet the premises or any part thereof without the prior written consent of the landlord.</li>
      
      <li><strong>Entry and Inspection:</strong> The landlord reserves the right to enter the premises for inspection, repairs, or showing to prospective tenants, with reasonable notice to the tenant.</li>
      
      <li><strong>Governing Law:</strong> This agreement shall be governed by and construed in accordance with the laws of the Republic of the Philippines.</li>
      
      ${data.terms ? `<li><strong>Additional Terms:</strong> ${data.terms}</li>` : ''}
    </ol>
  </div>

  <div class="section">
    <div class="section-title">Agreement</div>
    <p style="text-align: justify;">
      By signing below, both parties acknowledge that they have read, understood, and agree to be bound by all the terms and conditions set forth in this Residential Lease Agreement.
    </p>
  </div>

  <div class="signatures">
    <div class="signature-block">
      <div class="signature-image">
        ${data.landlordSignature 
          ? `<img src="${data.landlordSignature}" alt="Landlord Signature" />` 
          : '<span style="color: #999;">Pending Signature</span>'
        }
      </div>
      <div class="signature-line">
        ${data.landlordName}<br>
        <span style="font-weight: normal; font-size: 10pt;">Landlord</span>
      </div>
    </div>
    
    <div class="signature-block">
      <div class="signature-image">
        ${data.userSignature 
          ? `<img src="${data.userSignature}" alt="Tenant Signature" />` 
          : '<span style="color: #999;">Pending Signature</span>'
        }
      </div>
      <div class="signature-line">
        ${data.tenantName}<br>
        <span style="font-weight: normal; font-size: 10pt;">Tenant</span>
      </div>
    </div>
  </div>

  ${data.signedAt ? `
  <div style="text-align: center; margin-top: 20px; font-size: 10pt; color: #666;">
    <p>Signed on: ${data.signedAt}</p>
  </div>
  ` : ''}

  <div class="footer">
    <p>This is a legally binding document. Both parties should retain a copy for their records.</p>
    <p>Generated by RentDito Property Management System</p>
  </div>
</body>
</html>
  `.trim();
};
