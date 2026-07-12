// ════════════════════════════════════════════════════════════
// Aqua Green Agencies — Company Details
// Edit values here ONLY. Every page pulls from this one file,
// so you never have to hunt through components again.
// ════════════════════════════════════════════════════════════

const companyInfo = {
  name: 'Aqua Green Agencies',

  phones: [
    '9952828740',
    '9791814959',
    '8220801088',
    '9487416636',
  ],
  // Primary number used for "tel:" links and the header/footer display
  primaryPhone: '9952828740',

  email: 'aquagreen2017@gmail.com',
  website: 'https://www.aquagreenagencies.com',
  instagram: '@aquagreen_agencies',

  address: {
    doorNo: '29',
    street: 'R.V.L. Nagar',
    landmark: 'ESI Hospital Opposite',
    area: 'Upilipalayam (PO)',
    city: 'Coimbatore',
    pincode: '641015',
  },

  // Convenience: full one-line address string for display
  get fullAddress() {
    const a = this.address;
    return `${a.doorNo}, ${a.street}, ${a.landmark}, ${a.area}, ${a.city} - ${a.pincode}`;
  },
};

export default companyInfo;
