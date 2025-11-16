import { Parameter, StandardLimits } from './types';

// All 71 parameters grouped by category
export const ALL_PARAMETERS: Parameter[] = [
  // Physical Properties
  { name: 'pH', category: 'Physical', unit: '', lowerLimit: 5.5, upperLimit: 8.5, isMandatory: true },
  { name: 'Stone Content (>2mm)', category: 'Physical', unit: '% w/w', upperLimit: 8, isMandatory: true },
  { name: 'Stone Content (>10mm)', category: 'Physical', unit: '% w/w', upperLimit: 2 },
  { name: 'Bulk Density', category: 'Physical', unit: 'g/cm³', lowerLimit: 0.9, upperLimit: 1.3 },
  { name: 'Moisture Content', category: 'Physical', unit: '% w/w' },
  { name: 'Water Holding Capacity', category: 'Physical', unit: '%' },
  { name: 'Hydraulic Conductivity', category: 'Physical', unit: 'cm/s' },

  // Texture (mandatory for compliance)
  { name: 'Clay', category: 'Texture', unit: '% w/w', lowerLimit: 8, upperLimit: 35, isMandatory: true },
  { name: 'Silt', category: 'Texture', unit: '% w/w', lowerLimit: 15, upperLimit: 60, isMandatory: true },
  { name: 'Sand', category: 'Texture', unit: '% w/w', lowerLimit: 30, upperLimit: 60, isMandatory: true },

  // Chemical Properties
  { name: 'Organic Matter', category: 'Chemical', unit: '% w/w', lowerLimit: 3.5, upperLimit: 10, isMandatory: true },
  { name: 'Total Organic Carbon', category: 'Chemical', unit: '% w/w' },
  { name: 'Electrical Conductivity', category: 'Chemical', unit: 'dS/m', upperLimit: 2 },
  { name: 'Carbonate Content', category: 'Chemical', unit: '% w/w', upperLimit: 5 },
  { name: 'Soluble Salts', category: 'Chemical', unit: 'mg/l', upperLimit: 1500 },
  { name: 'Cation Exchange Capacity', category: 'Chemical', unit: 'meq/100g' },

  // Nutrients
  { name: 'Nitrogen (Total)', category: 'Nutrients', unit: 'mg/kg', lowerLimit: 100 },
  { name: 'Phosphorus (Available)', category: 'Nutrients', unit: 'mg/kg', lowerLimit: 16 },
  { name: 'Phosphorus (Total)', category: 'Nutrients', unit: 'mg/kg' },
  { name: 'Potassium (Available)', category: 'Nutrients', unit: 'mg/kg', lowerLimit: 121 },
  { name: 'Potassium (Total)', category: 'Nutrients', unit: 'mg/kg' },
  { name: 'Magnesium (Available)', category: 'Nutrients', unit: 'mg/kg', lowerLimit: 50 },
  { name: 'Magnesium (Total)', category: 'Nutrients', unit: 'mg/kg' },
  { name: 'Calcium (Available)', category: 'Nutrients', unit: 'mg/kg' },
  { name: 'Calcium (Total)', category: 'Nutrients', unit: 'mg/kg' },
  { name: 'Sulphur', category: 'Nutrients', unit: 'mg/kg' },

  // Heavy Metals (Contaminants) - pH dependent for some
  { name: 'Arsenic', category: 'Contaminants', unit: 'mg/kg', upperLimit: 20, isMandatory: true },
  { name: 'Cadmium', category: 'Contaminants', unit: 'mg/kg', upperLimit: 3, isMandatory: true },
  { name: 'Chromium (Total)', category: 'Contaminants', unit: 'mg/kg', upperLimit: 100, isMandatory: true },
  { name: 'Chromium (VI)', category: 'Contaminants', unit: 'mg/kg', upperLimit: 1 },
  { name: 'Copper', category: 'Contaminants', unit: 'mg/kg', upperLimit: 200, isMandatory: true }, // pH dependent
  { name: 'Lead', category: 'Contaminants', unit: 'mg/kg', upperLimit: 450, isMandatory: true },
  { name: 'Mercury', category: 'Contaminants', unit: 'mg/kg', upperLimit: 1, isMandatory: true },
  { name: 'Nickel', category: 'Contaminants', unit: 'mg/kg', upperLimit: 75, isMandatory: true }, // pH dependent
  { name: 'Zinc', category: 'Contaminants', unit: 'mg/kg', upperLimit: 300, isMandatory: true }, // pH dependent
  { name: 'Selenium', category: 'Contaminants', unit: 'mg/kg', upperLimit: 3 },
  { name: 'Molybdenum', category: 'Contaminants', unit: 'mg/kg', upperLimit: 4 },
  { name: 'Boron (Water Soluble)', category: 'Contaminants', unit: 'mg/kg', upperLimit: 3 },
  { name: 'Boron (Total)', category: 'Contaminants', unit: 'mg/kg' },

  // Organic Contaminants
  { name: 'TPH (Total Petroleum Hydrocarbons)', category: 'Contaminants', unit: 'mg/kg', upperLimit: 500 },
  { name: 'TPH C5-C6', category: 'Contaminants', unit: 'mg/kg' },
  { name: 'TPH C6-C8', category: 'Contaminants', unit: 'mg/kg' },
  { name: 'TPH C8-C10', category: 'Contaminants', unit: 'mg/kg' },
  { name: 'TPH C10-C12', category: 'Contaminants', unit: 'mg/kg' },
  { name: 'TPH C12-C16', category: 'Contaminants', unit: 'mg/kg' },
  { name: 'TPH C16-C21', category: 'Contaminants', unit: 'mg/kg' },
  { name: 'TPH C21-C35', category: 'Contaminants', unit: 'mg/kg' },
  { name: 'TPH C35-C44', category: 'Contaminants', unit: 'mg/kg' },

  // PAHs (Polycyclic Aromatic Hydrocarbons)
  { name: 'PAH (Total)', category: 'Contaminants', unit: 'mg/kg', upperLimit: 50 },
  { name: 'Naphthalene', category: 'Contaminants', unit: 'mg/kg' },
  { name: 'Acenaphthylene', category: 'Contaminants', unit: 'mg/kg' },
  { name: 'Acenaphthene', category: 'Contaminants', unit: 'mg/kg' },
  { name: 'Fluorene', category: 'Contaminants', unit: 'mg/kg' },
  { name: 'Phenanthrene', category: 'Contaminants', unit: 'mg/kg' },
  { name: 'Anthracene', category: 'Contaminants', unit: 'mg/kg' },
  { name: 'Fluoranthene', category: 'Contaminants', unit: 'mg/kg' },
  { name: 'Pyrene', category: 'Contaminants', unit: 'mg/kg' },
  { name: 'Benzo(a)anthracene', category: 'Contaminants', unit: 'mg/kg' },
  { name: 'Chrysene', category: 'Contaminants', unit: 'mg/kg' },
  { name: 'Benzo(b)fluoranthene', category: 'Contaminants', unit: 'mg/kg' },
  { name: 'Benzo(k)fluoranthene', category: 'Contaminants', unit: 'mg/kg' },
  { name: 'Benzo(a)pyrene', category: 'Contaminants', unit: 'mg/kg', upperLimit: 1 },
  { name: 'Indeno(1,2,3-cd)pyrene', category: 'Contaminants', unit: 'mg/kg' },
  { name: 'Dibenz(a,h)anthracene', category: 'Contaminants', unit: 'mg/kg' },
  { name: 'Benzo(g,h,i)perylene', category: 'Contaminants', unit: 'mg/kg' },

  // Other Organics
  { name: 'PCBs (Total)', category: 'Contaminants', unit: 'mg/kg', upperLimit: 0.5 },
  { name: 'Phenols (Total)', category: 'Contaminants', unit: 'mg/kg' },
  { name: 'Cyanide (Free)', category: 'Contaminants', unit: 'mg/kg', upperLimit: 1 },
  { name: 'Cyanide (Complex)', category: 'Contaminants', unit: 'mg/kg' },
  { name: 'Cyanide (Total)', category: 'Contaminants', unit: 'mg/kg' },
  { name: 'Asbestos', category: 'Contaminants', unit: 'presence', upperLimit: 0 },
];

// BS3882:2015 Standard Limits
export const BS3882_LIMITS: Record<string, { lower?: number; upper?: number }> = {
  'pH': { lower: 5.5, upper: 8.5 },
  'Stone Content (>2mm)': { upper: 8 },
  'Organic Matter': { lower: 3.5, upper: 10 },
  'Clay': { lower: 8, upper: 35 },
  'Silt': { lower: 15, upper: 60 },
  'Sand': { lower: 30, upper: 60 },
  'Arsenic': { upper: 20 },
  'Cadmium': { upper: 3 },
  'Chromium (Total)': { upper: 100 },
  'Copper': { upper: 200 }, // pH > 6.5
  'Lead': { upper: 450 },
  'Mercury': { upper: 1 },
  'Nickel': { upper: 75 }, // pH > 6.5
  'Zinc': { upper: 300 }, // pH > 6.5
  'Boron (Water Soluble)': { upper: 3 },
};

// pH-dependent limits for Zn, Cu, Ni (BS3882:2015)
export const pH_DEPENDENT_LIMITS = {
  'Zinc': {
    low_pH: { upper: 200 }, // pH <= 6.5
    high_pH: { upper: 300 }, // pH > 6.5
  },
  'Copper': {
    low_pH: { upper: 130 },
    high_pH: { upper: 200 },
  },
  'Nickel': {
    low_pH: { upper: 50 },
    high_pH: { upper: 75 },
  },
};

// S4UL (Category 4 Screening Levels - Suitable for Use) - Residential with plant uptake
export const S4UL_LIMITS: Record<string, { lower?: number; upper?: number }> = {
  'Arsenic': { upper: 32 },
  'Cadmium': { upper: 8 },
  'Chromium (Total)': { upper: 5000 },
  'Chromium (VI)': { upper: 8 },
  'Lead': { upper: 310 },
  'Mercury': { upper: 8 },
  'Nickel': { upper: 230 },
  'Selenium': { upper: 260 },
  'Cyanide (Free)': { upper: 3.8 },
  'TPH (Total Petroleum Hydrocarbons)': { upper: 5000 },
  'PAH (Total)': { upper: 50 },
  'Benzo(a)pyrene': { upper: 5 },
};

// C4UL (Category 4 Screening Levels - Commercial/Industrial)
export const C4UL_LIMITS: Record<string, { lower?: number; upper?: number }> = {
  'Arsenic': { upper: 640 },
  'Cadmium': { upper: 1400 },
  'Chromium (Total)': { upper: 5000 },
  'Chromium (VI)': { upper: 8 },
  'Lead': { upper: 1500 },
  'Mercury': { upper: 480 },
  'Nickel': { upper: 5000 },
  'Selenium': { upper: 12000 },
  'Cyanide (Free)': { upper: 530 },
  'TPH (Total Petroleum Hydrocarbons)': { upper: 5000 },
  'PAH (Total)': { upper: 5000 },
  'Benzo(a)pyrene': { upper: 50 },
};

export const STANDARD_LIMITS: StandardLimits = {
  BS3882: BS3882_LIMITS,
  S4UL: S4UL_LIMITS,
  C4UL: C4UL_LIMITS,
};

// Soil texture triangle acceptable range (BS3882)
export const SOIL_TEXTURE_ACCEPTABLE_RANGE = {
  clay: { min: 8, max: 35 },
  silt: { min: 15, max: 60 },
  sand: { min: 30, max: 60 },
};

// Parameter categories for grouping
export const PARAMETER_CATEGORIES = [
  'Physical',
  'Chemical',
  'Nutrients',
  'Contaminants',
  'Texture',
] as const;

// Default tolerance for optimization
export const DEFAULT_TOLERANCE = 30; // 30%

// Zero-seeking parameters (contaminants where lower = 0)
export const ZERO_SEEKING_PARAMETERS = [
  'Arsenic',
  'Cadmium',
  'Chromium (Total)',
  'Chromium (VI)',
  'Lead',
  'Mercury',
  'Selenium',
  'Molybdenum',
  'Cyanide (Free)',
  'Cyanide (Complex)',
  'Cyanide (Total)',
  'TPH (Total Petroleum Hydrocarbons)',
  'PAH (Total)',
  'PCBs (Total)',
  'Asbestos',
];
