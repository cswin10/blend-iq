import { Parameter, StandardLimits } from './types';

// All parameters based on S4UL, C4UL, and BS3882 standards
export const ALL_PARAMETERS: Parameter[] = [
  // Heavy Metals
  { name: 'Antimony (Sb)', category: 'Heavy Metal', unit: 'mg/kg', lowerLimit: 0, upperLimit: 999 },
  { name: 'Arsenic (As)', category: 'Heavy Metal', unit: 'mg/kg', lowerLimit: 0, upperLimit: 37 },
  { name: 'Cadmium (Cd)', category: 'Heavy Metal', unit: 'mg/kg', lowerLimit: 0, upperLimit: 11 },
  { name: 'Chromium (Cr)', category: 'Heavy Metal', unit: 'mg/kg', lowerLimit: 0, upperLimit: 910 },
  { name: 'Chromium (hexavalent)', category: 'Heavy Metal', unit: 'mg/kg', lowerLimit: 0, upperLimit: 6 },
  { name: 'Copper (Cu)', category: 'Heavy Metal', unit: 'mg/kg', lowerLimit: 0, upperLimit: 135, isMandatory: true },
  { name: 'Lead (Pb)', category: 'Heavy Metal', unit: 'mg/kg', lowerLimit: 0, upperLimit: 200 },
  { name: 'Mercury (Hg)', category: 'Heavy Metal', unit: 'mg/kg', lowerLimit: 0, upperLimit: 11 },
  { name: 'Nickel (Ni)', category: 'Heavy Metal', unit: 'mg/kg', lowerLimit: 0, upperLimit: 75, isMandatory: true },
  { name: 'Selenium (Se)', category: 'Heavy Metal', unit: 'mg/kg', lowerLimit: 0, upperLimit: 250 },
  { name: 'Zinc (Zn)', category: 'Heavy Metal', unit: 'mg/kg', lowerLimit: 0, upperLimit: 200, isMandatory: true },

  // Polycyclic Aromatic Hydrocarbons (PAHs)
  { name: 'Naphthalene', category: 'PAH', unit: 'mg/kg', lowerLimit: 0, upperLimit: 5.6 },
  { name: 'Acenaphthylene', category: 'PAH', unit: 'mg/kg', lowerLimit: 0, upperLimit: 420 },
  { name: 'Acenaphthene', category: 'PAH', unit: 'mg/kg', lowerLimit: 0, upperLimit: 510 },
  { name: 'Fluorene', category: 'PAH', unit: 'mg/kg', lowerLimit: 0, upperLimit: 400 },
  { name: 'Phenanthrene', category: 'PAH', unit: 'mg/kg', lowerLimit: 0, upperLimit: 220 },
  { name: 'Anthracene', category: 'PAH', unit: 'mg/kg', lowerLimit: 0, upperLimit: 5400 },
  { name: 'Fluoranthene', category: 'PAH', unit: 'mg/kg', lowerLimit: 0, upperLimit: 560 },
  { name: 'Pyrene', category: 'PAH', unit: 'mg/kg', lowerLimit: 0, upperLimit: 1200 },
  { name: 'Benzo(a)anthracene', category: 'PAH', unit: 'mg/kg', lowerLimit: 0, upperLimit: 13 },
  { name: 'Chrysene', category: 'PAH', unit: 'mg/kg', lowerLimit: 0, upperLimit: 22 },
  { name: 'Benzo(b)fluoranthene', category: 'PAH', unit: 'mg/kg', lowerLimit: 0, upperLimit: 3.3 },
  { name: 'Benzo(k)fluoranthene', category: 'PAH', unit: 'mg/kg', lowerLimit: 0, upperLimit: 93 },
  { name: 'Benzo(a)pyrene', category: 'PAH', unit: 'mg/kg', lowerLimit: 0, upperLimit: 2.7 },
  { name: 'Indeno(1,2,3-cd)pyrene', category: 'PAH', unit: 'mg/kg', lowerLimit: 0, upperLimit: 36 },
  { name: 'Dibenz(a,h)anthracene', category: 'PAH', unit: 'mg/kg', lowerLimit: 0, upperLimit: 0.28 },
  { name: 'Benzo(g,h,i)perylene', category: 'PAH', unit: 'mg/kg', lowerLimit: 0, upperLimit: 340 },

  // Total Petroleum Hydrocarbons (TPH)
  { name: 'Aliphatic >C5 - C6', category: 'TPH', unit: 'mg/kg', lowerLimit: 0, upperLimit: 78 },
  { name: 'Aliphatic >C6 - C8', category: 'TPH', unit: 'mg/kg', lowerLimit: 0, upperLimit: 230 },
  { name: 'Aliphatic >C8 - C10', category: 'TPH', unit: 'mg/kg', lowerLimit: 0, upperLimit: 65 },
  { name: 'Aliphatic >C10 - C12', category: 'TPH', unit: 'mg/kg', lowerLimit: 0, upperLimit: 118 },
  { name: 'Aliphatic >C12 - C16', category: 'TPH', unit: 'mg/kg', lowerLimit: 0, upperLimit: 59 },
  { name: 'Aliphatic >C16 - C21', category: 'TPH', unit: 'mg/kg', lowerLimit: 0, upperLimit: 9999 },
  { name: 'Aliphatic >C21 - C34', category: 'TPH', unit: 'mg/kg', lowerLimit: 0, upperLimit: 9999 },
  { name: 'Aliphatic (C5 - C34)', category: 'TPH', unit: 'mg/kg', lowerLimit: 0, upperLimit: 9999 },
  { name: 'Aliphatic >C16 - C35', category: 'TPH', unit: 'mg/kg', lowerLimit: 0, upperLimit: 92000 },
  { name: 'Aromatic >C5 - C7', category: 'TPH', unit: 'mg/kg', lowerLimit: 0, upperLimit: 140 },
  { name: 'Aromatic >C7 - C8', category: 'TPH', unit: 'mg/kg', lowerLimit: 0, upperLimit: 290 },
  { name: 'Aromatic >C8 - C10', category: 'TPH', unit: 'mg/kg', lowerLimit: 0, upperLimit: 83 },
  { name: 'Aromatic >C10 - C12', category: 'TPH', unit: 'mg/kg', lowerLimit: 0, upperLimit: 180 },
  { name: 'Aromatic >C12 - C16', category: 'TPH', unit: 'mg/kg', lowerLimit: 0, upperLimit: 330 },
  { name: 'Aromatic >C16 - C21', category: 'TPH', unit: 'mg/kg', lowerLimit: 0, upperLimit: 540 },
  { name: 'Aromatic >C21 - C35', category: 'TPH', unit: 'mg/kg', lowerLimit: 0, upperLimit: 1500 },
  { name: 'Aromatic (C5 - C35)', category: 'TPH', unit: 'mg/kg', lowerLimit: 0, upperLimit: 9999 },
  { name: 'Total >C5 - C35', category: 'TPH', unit: 'mg/kg', lowerLimit: 0, upperLimit: 9999 },

  // BTEX
  { name: 'Benzene', category: 'BTEX', unit: 'µg/kg', lowerLimit: 0, upperLimit: 0.17 },
  { name: 'Toluene', category: 'BTEX', unit: 'µg/kg', lowerLimit: 0, upperLimit: 290 },
  { name: 'Ethylbenzene', category: 'BTEX', unit: 'µg/kg', lowerLimit: 0, upperLimit: 110 },
  { name: 'p & m-xylene', category: 'BTEX', unit: 'µg/kg', lowerLimit: 0, upperLimit: 140 },
  { name: 'o-xylene', category: 'BTEX', unit: 'µg/kg', lowerLimit: 0, upperLimit: 130 },
  { name: 'MTBE', category: 'BTEX', unit: 'µg/kg', lowerLimit: 0, upperLimit: 84 },

  // BS3882 Topsoil Parameters
  { name: 'SOM', category: 'BS3882', unit: '%', lowerLimit: 5, upperLimit: 10, isMandatory: true },
  { name: 'Moisture Content', category: 'BS3882', unit: '%', lowerLimit: 0, upperLimit: 100 },
  { name: 'pH', category: 'BS3882', unit: 'pH units', lowerLimit: 5.5, upperLimit: 8.5, isMandatory: true },
  { name: 'Clay content', category: 'BS3882', unit: '%', lowerLimit: 5, upperLimit: 35, isMandatory: true },
  { name: 'Silt content', category: 'BS3882', unit: '%', lowerLimit: 0, upperLimit: 65, isMandatory: true },
  { name: 'Sand content', category: 'BS3882', unit: '%', lowerLimit: 30, upperLimit: 85, isMandatory: true },
  { name: 'Loss on Ignition', category: 'BS3882', unit: '%', lowerLimit: 5, upperLimit: 20 },
  { name: '>2mm', category: 'BS3882', unit: '%', lowerLimit: 0, upperLimit: 30, isMandatory: true },
  { name: '>20mm', category: 'BS3882', unit: '%', lowerLimit: 0, upperLimit: 10 },
  { name: '>50mm', category: 'BS3882', unit: '%', lowerLimit: 0, upperLimit: 0.00001 },
  { name: 'Carbonate', category: 'BS3882', unit: '%', lowerLimit: 0, upperLimit: 1 },
  { name: 'Total nitrogen', category: 'BS3882', unit: '%', lowerLimit: 0.15, upperLimit: 1 },
  { name: 'Phosphate', category: 'BS3882', unit: 'mg/L', lowerLimit: 16, upperLimit: 140 },
  { name: 'Potassium', category: 'BS3882', unit: 'mg/L', lowerLimit: 121, upperLimit: 1500 },
  { name: 'Magnesium', category: 'BS3882', unit: 'mg/L', lowerLimit: 51, upperLimit: 600 },
  { name: 'C:N', category: 'BS3882', unit: ':1', lowerLimit: 0, upperLimit: 20 },
  { name: 'Electrical Conductivity', category: 'BS3882', unit: 'uS/cm', lowerLimit: 0, upperLimit: 3300 },
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
  'Heavy Metal',
  'PAH',
  'TPH',
  'BTEX',
  'BS3882',
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
