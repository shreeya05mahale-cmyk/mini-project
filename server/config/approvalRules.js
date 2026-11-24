/**
 * Approval Workflow Rules Configuration
 * 
 * Hierarchy Rules for KLE Tech:
 * 1. The department requests through the HOD only (no direct faculty/student requisition).
 * 2. InfoCell Coordinator scrutinizes and approves first.
 * 3. Threshold Tiers:
 *    - Up to ₹50,000: HOD -> Coordinator -> Registrar
 *    - > ₹50,000 and <= ₹2,00,000: HOD -> Coordinator -> Registrar -> Vice Chancellor (VC)
 *    - > ₹2,00,000: HOD -> Coordinator -> Registrar -> VC -> Pro Chancellor (PC)
 */

const APPROVAL_TIERS = [
  {
    name: 'TIER_1_STANDARD',
    maxInclusive: 50000.00,
    roles: ['HOD', 'COORDINATOR', 'REGISTRAR'],
    description: 'Up to ₹50,000: HOD -> Coordinator -> Registrar'
  },
  {
    name: 'TIER_2_MEDIUM',
    minExclusive: 50000.00,
    maxInclusive: 200000.00,
    roles: ['HOD', 'COORDINATOR', 'REGISTRAR', 'VC'],
    description: '₹50,001 to ₹2,00,000: HOD -> Coordinator -> Registrar -> Vice Chancellor'
  },
  {
    name: 'TIER_3_MAJOR',
    minExclusive: 200000.00,
    roles: ['HOD', 'COORDINATOR', 'REGISTRAR', 'VC', 'PC'],
    description: 'Above ₹2,00,000: HOD -> Coordinator -> Registrar -> VC -> Pro Chancellor'
  }
];

/**
 * Returns the ordered array of approver roles for a given request total amount.
 * 
 * @param {number|string} totalAmount - The calculated total amount of the request
 * @returns {Array<string>} Array of roles in sequential approval order
 */
function getApprovalChain(totalAmount) {
  const amount = Number(totalAmount);
  
  if (isNaN(amount) || amount < 0) {
    throw new Error(`Invalid total amount for approval chain calculation: ${totalAmount}`);
  }

  if (amount <= 50000.00) {
    return ['HOD', 'COORDINATOR', 'REGISTRAR'];
  } else if (amount <= 200000.00) {
    return ['HOD', 'COORDINATOR', 'REGISTRAR', 'VC'];
  } else {
    return ['HOD', 'COORDINATOR', 'REGISTRAR', 'VC', 'PC'];
  }
}

module.exports = {
  APPROVAL_TIERS,
  getApprovalChain
};
