/**
 * Approval Workflow Rules Configuration
 * 
 * PROVISIONAL UNIVERSITY THRESHOLDS:
 * These thresholds govern the multi-stage approval chain required for a purchase request.
 * Any request begins at HOD level (auto-approved upon submission by HOD).
 * If the university changes approval thresholds later, edit this file ONLY.
 */

// Boundary rule definition:
// PROVISIONAL: Does an exact boundary amount (e.g. exactly 50,000) belong to the lower or higher band?
// University guidance: "50,000 to below 2,00,000" means:
// - total_amount < 10000: Band 1
// - 10000 <= total_amount < 50000: Band 2
// - 50000 <= total_amount < 200000: Band 3
// - total_amount >= 200000: Band 4
// Hence, exact boundary amounts (10000, 50000, 200000) fall into the higher band.
const APPROVAL_TIERS = [
  {
    name: 'TIER_1_LOW',
    maxExclusive: 10000.00,
    roles: ['HOD'],
    description: 'Below ₹10,000: HOD only'
  },
  {
    name: 'TIER_2_MEDIUM',
    minInclusive: 10000.00,
    maxExclusive: 50000.00,
    roles: ['HOD', 'COORDINATOR', 'REGISTRAR'],
    description: '₹10,000 to below ₹50,000: HOD -> Coordinator -> Registrar'
  },
  {
    name: 'TIER_3_HIGH',
    minInclusive: 50000.00,
    maxExclusive: 200000.00,
    roles: ['HOD', 'COORDINATOR', 'REGISTRAR', 'VC'],
    description: '₹50,000 to below ₹2,00,000: HOD -> Coordinator -> Registrar -> Vice Chancellor'
  },
  {
    name: 'TIER_4_MAJOR',
    minInclusive: 200000.00,
    roles: ['HOD', 'COORDINATOR', 'REGISTRAR', 'VC', 'PC'],
    description: '₹2,00,000 and above: HOD -> Coordinator -> Registrar -> VC -> Purchase Committee'
  }
];

/**
 * Returns the ordered array of approver roles for a given request total amount.
 * 
 * @param {number|string} totalAmount - The calculated total amount of the request
 * @returns {Array<string>} Array of roles in sequential approval order, e.g. ['HOD', 'COORDINATOR', 'REGISTRAR']
 */
function getApprovalChain(totalAmount) {
  const amount = Number(totalAmount);
  
  if (isNaN(amount) || amount < 0) {
    throw new Error(`Invalid total amount for approval chain calculation: ${totalAmount}`);
  }

  if (amount < 10000) {
    return ['HOD'];
  } else if (amount < 50000) {
    return ['HOD', 'COORDINATOR', 'REGISTRAR'];
  } else if (amount < 200000) {
    return ['HOD', 'COORDINATOR', 'REGISTRAR', 'VC'];
  } else {
    return ['HOD', 'COORDINATOR', 'REGISTRAR', 'VC', 'PC'];
  }
}

module.exports = {
  APPROVAL_TIERS,
  getApprovalChain
};
