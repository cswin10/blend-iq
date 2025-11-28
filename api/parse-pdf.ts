import type { VercelRequest, VercelResponse } from '@vercel/node';

interface Material {
  id: string;
  name: string;
  availableTonnage: number;
  parameters: {
    [key: string]: {
      value: number | null;
      unit: string;
      source: string;
      date?: string;
    };
  };
  source: string;
  date?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { pdfBase64, filename } = req.body;

    if (!pdfBase64) {
      return res.status(400).json({ success: false, message: 'Missing PDF data' });
    }

    // Convert base64 to buffer
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

    // Dynamically import pdf-parse (it's a CommonJS module)
    const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;

    // Parse PDF
    const data = await pdfParse(pdfBuffer);
    const text = data.text;

    if (!text || text.trim().length === 0) {
      throw new Error('No text content found in PDF');
    }

    // Extract material data from text using pattern matching
    const material = extractMaterialData(text, filename || 'Imported Material');

    return res.status(200).json({
      success: true,
      material,
    });
  } catch (error: any) {
    console.error('PDF parsing error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to parse PDF',
    });
  }
}

function extractMaterialData(text: string, filename: string): Material {
  // Extract material name from Sample ID or Sample Reference
  let materialName = filename.replace('.pdf', '');
  const sampleIdMatch = text.match(/Sample\s+(?:ID|Reference)[:\s]+([A-Z0-9\-]+)/i);
  if (sampleIdMatch) {
    materialName = sampleIdMatch[1].trim();
  }

  // Extract date
  let date: string | undefined;
  const dateMatch = text.match(/Date\s+(?:Tested|Sampled)[:\s]+(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (dateMatch) {
    date = dateMatch[1];
  }

  // Extract lab name
  let sourceLab = filename;
  const labMatch = text.match(/^([A-Z0-9\s&]+LABORATOR(?:Y|IES))/im);
  if (labMatch) {
    sourceLab = labMatch[1].trim();
  }

  const parameters: Material['parameters'] = {};

  // BS3882 limits for intelligent number splitting
  const knownLimits: { [key: string]: number } = {
    'Arsenic': 20,
    'Cadmium': 3,
    'Chromium (Total)': 100,
    'Chromium (VI)': 1,
    'Copper': 200,
    'Lead': 450,
    'Mercury': 1,
    'Nickel': 75,
    'Zinc': 300,
    'Selenium': 3,
    'Stone Content (>2mm)': 8,
    'Organic Matter': 10,
    'Clay': 35,
    'Silt': 60,
    'Sand': 60,
  };

  // Parameter definitions: search terms and standard names
  // IMPORTANT: Order matters! More specific terms first to avoid false matches
  const parameterDefs = [
    // Physical Properties
    { search: ['ph (', 'ph'], standardName: 'pH', unit: '' },
    { search: ['stone content (>10mm)', 'stones >10mm'], standardName: 'Stone Content (>10mm)', unit: '% w/w' },
    { search: ['stone content', 'stones >2mm', 'stones (>2mm)', 'stone'], standardName: 'Stone Content (>2mm)', unit: '% w/w' },
    { search: ['bulk density'], standardName: 'Bulk Density', unit: 'g/cm³' },
    { search: ['moisture content', 'moisture'], standardName: 'Moisture Content', unit: '% w/w' },
    { search: ['water holding capacity', 'whc'], standardName: 'Water Holding Capacity', unit: '%' },
    { search: ['hydraulic conductivity'], standardName: 'Hydraulic Conductivity', unit: 'cm/s' },

    // Texture
    { search: ['clay (<', 'clay %', 'clay'], standardName: 'Clay', unit: '% w/w' },
    { search: ['silt (', 'silt %', 'silt'], standardName: 'Silt', unit: '% w/w' },
    { search: ['total sand', 'sand (', 'sand %', 'sand'], standardName: 'Sand', unit: '% w/w' },

    // Chemical Properties
    { search: ['soil organic matter', 'organic matter', 'som'], standardName: 'Organic Matter', unit: '% w/w' },
    { search: ['total organic carbon', 'toc'], standardName: 'Total Organic Carbon', unit: '% w/w' },
    { search: ['electrical conductivity', 'ec'], standardName: 'Electrical Conductivity', unit: 'dS/m' },
    { search: ['carbonate content', 'carbonates'], standardName: 'Carbonate Content', unit: '% w/w' },
    { search: ['soluble salts'], standardName: 'Soluble Salts', unit: 'mg/l' },
    { search: ['cation exchange capacity', 'cec'], standardName: 'Cation Exchange Capacity', unit: 'meq/100g' },

    // Nutrients
    { search: ['nitrogen (total)', 'total nitrogen', 'nitrogen'], standardName: 'Nitrogen (Total)', unit: 'mg/kg' },
    { search: ['phosphorus (available)', 'available phosphorus'], standardName: 'Phosphorus (Available)', unit: 'mg/kg' },
    { search: ['phosphorus (total)', 'total phosphorus'], standardName: 'Phosphorus (Total)', unit: 'mg/kg' },
    { search: ['potassium (available)', 'available potassium'], standardName: 'Potassium (Available)', unit: 'mg/kg' },
    { search: ['potassium (total)', 'total potassium'], standardName: 'Potassium (Total)', unit: 'mg/kg' },
    { search: ['magnesium (available)', 'available magnesium'], standardName: 'Magnesium (Available)', unit: 'mg/kg' },
    { search: ['magnesium (total)', 'total magnesium'], standardName: 'Magnesium (Total)', unit: 'mg/kg' },
    { search: ['calcium (available)', 'available calcium'], standardName: 'Calcium (Available)', unit: 'mg/kg' },
    { search: ['calcium (total)', 'total calcium'], standardName: 'Calcium (Total)', unit: 'mg/kg' },
    { search: ['sulphur'], standardName: 'Sulphur', unit: 'mg/kg' },

    // Heavy Metals - Most specific first
    { search: ['chromium (hexavalent)', 'chromium (vi)', 'chromium vi', 'cr(vi)', 'cr vi', 'hexavalent chromium'], standardName: 'Chromium (VI)', unit: 'mg/kg' },
    { search: ['chromium (total)', 'chromium total', 'total chromium', 'chromium (cr)', 'chromium'], standardName: 'Chromium (Total)', unit: 'mg/kg' },
    { search: ['antimony (sb)', 'antimony', 'sb'], standardName: 'Antimony', unit: 'mg/kg' },
    { search: ['arsenic (as)', 'arsenic', 'as'], standardName: 'Arsenic', unit: 'mg/kg' },
    { search: ['cadmium (cd)', 'cadmium', 'cd'], standardName: 'Cadmium', unit: 'mg/kg' },
    { search: ['copper (cu)', 'copper', 'cu'], standardName: 'Copper', unit: 'mg/kg' },
    { search: ['lead (pb)', 'lead', 'pb'], standardName: 'Lead', unit: 'mg/kg' },
    { search: ['mercury (hg)', 'mercury', 'hg'], standardName: 'Mercury', unit: 'mg/kg' },
    { search: ['nickel (ni)', 'nickel', 'ni'], standardName: 'Nickel', unit: 'mg/kg' },
    { search: ['selenium (se)', 'selenium', 'se'], standardName: 'Selenium', unit: 'mg/kg' },
    { search: ['zinc (zn)', 'zinc', 'zn'], standardName: 'Zinc', unit: 'mg/kg' },
    { search: ['molybdenum (mo)', 'molybdenum', 'mo'], standardName: 'Molybdenum', unit: 'mg/kg' },
    { search: ['boron (water soluble)', 'water soluble boron', 'boron - water soluble'], standardName: 'Boron (Water Soluble)', unit: 'mg/kg' },
    { search: ['boron (total)', 'total boron'], standardName: 'Boron (Total)', unit: 'mg/kg' },

    // TPH - Total Petroleum Hydrocarbons
    { search: ['total petroleum hydrocarbons', 'tph (total)', 'tph total', 'tph >c5'], standardName: 'TPH (Total Petroleum Hydrocarbons)', unit: 'mg/kg' },
    { search: ['aliphatic >c5 - c6', 'tph c5-c6', 'c5-c6'], standardName: 'TPH C5-C6', unit: 'mg/kg' },
    { search: ['aliphatic >c6 - c8', 'tph c6-c8', 'c6-c8'], standardName: 'TPH C6-C8', unit: 'mg/kg' },
    { search: ['aliphatic >c8 - c10', 'tph c8-c10', 'c8-c10'], standardName: 'TPH C8-C10', unit: 'mg/kg' },
    { search: ['aliphatic >c10 - c12', 'tph c10-c12', 'c10-c12'], standardName: 'TPH C10-C12', unit: 'mg/kg' },
    { search: ['aliphatic >c12 - c16', 'tph c12-c16', 'c12-c16'], standardName: 'TPH C12-C16', unit: 'mg/kg' },
    { search: ['aliphatic >c16 - c21', 'tph c16-c21', 'c16-c21'], standardName: 'TPH C16-C21', unit: 'mg/kg' },
    { search: ['aliphatic >c21 - c34', 'aliphatic >c21 - c35', 'tph c21-c35', 'c21-c35'], standardName: 'TPH C21-C35', unit: 'mg/kg' },
    { search: ['tph c35-c44', 'c35-c44'], standardName: 'TPH C35-C44', unit: 'mg/kg' },

    // PAHs - Polycyclic Aromatic Hydrocarbons
    { search: ['**total epa-16 pahs', 'total epa-16', 'pah (total)', 'total pah'], standardName: 'PAH (Total)', unit: 'mg/kg' },
    { search: ['naphthalene'], standardName: 'Naphthalene', unit: 'mg/kg' },
    { search: ['acenaphthylene'], standardName: 'Acenaphthylene', unit: 'mg/kg' },
    { search: ['acenaphthene'], standardName: 'Acenaphthene', unit: 'mg/kg' },
    { search: ['fluorene'], standardName: 'Fluorene', unit: 'mg/kg' },
    { search: ['phenanthrene'], standardName: 'Phenanthrene', unit: 'mg/kg' },
    { search: ['anthracene'], standardName: 'Anthracene', unit: 'mg/kg' },
    { search: ['fluoranthene'], standardName: 'Fluoranthene', unit: 'mg/kg' },
    { search: ['pyrene'], standardName: 'Pyrene', unit: 'mg/kg' },
    { search: ['benzo(a)anthracene', 'benz(a)anthracene'], standardName: 'Benzo(a)anthracene', unit: 'mg/kg' },
    { search: ['chrysene'], standardName: 'Chrysene', unit: 'mg/kg' },
    { search: ['benzo(b)fluoranthene'], standardName: 'Benzo(b)fluoranthene', unit: 'mg/kg' },
    { search: ['benzo(k)fluoranthene'], standardName: 'Benzo(k)fluoranthene', unit: 'mg/kg' },
    { search: ['benzo(a)pyrene'], standardName: 'Benzo(a)pyrene', unit: 'mg/kg' },
    { search: ['indeno(1,2,3-cd)pyrene'], standardName: 'Indeno(1,2,3-cd)pyrene', unit: 'mg/kg' },
    { search: ['dibenz(a,h)anthracene'], standardName: 'Dibenz(a,h)anthracene', unit: 'mg/kg' },
    { search: ['benzo(g,h,i)perylene', 'benzo(ghi)perylene'], standardName: 'Benzo(g,h,i)perylene', unit: 'mg/kg' },

    // Other Organics
    { search: ['pcbs (total)', 'total pcbs', 'pcb'], standardName: 'PCBs (Total)', unit: 'mg/kg' },
    { search: ['phenols (total)', 'total phenols'], standardName: 'Phenols (Total)', unit: 'mg/kg' },
    { search: ['cyanide (free)', 'free cyanide'], standardName: 'Cyanide (Free)', unit: 'mg/kg' },
    { search: ['cyanide (complex)', 'complex cyanide'], standardName: 'Cyanide (Complex)', unit: 'mg/kg' },
    { search: ['cyanide (total)', 'total cyanide'], standardName: 'Cyanide (Total)', unit: 'mg/kg' },
    { search: ['asbestos screen', 'asbestos'], standardName: 'Asbestos', unit: 'presence' },
  ];

  // Split into lines for easier parsing
  const lines = text.split('\n');

  // Look through each line for parameter names and extract values
  for (const line of lines) {
    const lineLower = line.toLowerCase();

    // Skip empty lines and header lines
    if (line.trim().length === 0 || lineLower.includes('parameter') && lineLower.includes('result')) {
      continue;
    }

    // Try to match each parameter
    for (const param of parameterDefs) {
      // Check if any search term appears in this line
      const matchedTerm = param.search.find(term => lineLower.includes(term));

      if (matchedTerm && !parameters[param.standardName]) {
        // Found a parameter! Now extract numeric values
        // Strategy: Find the parameter name, skip the unit, then take ONLY the first number

        // Remove known noise patterns first
        let cleanLine = line;
        // Remove dates
        cleanLine = cleanLine.replace(/\d{1,2}\/\d{1,2}\/\d{4}/g, ' ');
        // Remove particle size ranges like (0.05-2.0mm), (<0.002mm)
        cleanLine = cleanLine.replace(/\([<>]?\d*\.?\d+-?\d*\.?\d*mm\)/gi, ' ');
        // Remove year ranges
        cleanLine = cleanLine.replace(/\(\d{4}-\d{4}\)/g, ' ');
        // Remove "pH (1:2.5 water)" type patterns
        cleanLine = cleanLine.replace(/\(\d+:[\d.]+[^)]*\)/g, ' ');

        // Extract ALL numbers from the cleaned line
        const allNumbers = cleanLine.match(/([<>]?\d+\.?\d*)/g);

        if (allNumbers && allNumbers.length > 0) {
          // Filter to get reasonable result values (exclude very small formatting artifacts)
          let candidateNumbers = allNumbers
            .map(s => {
              const clean = s.replace(/[<>]/g, '');
              return { original: s, parsed: parseFloat(clean) };
            })
            .filter(n => {
              if (isNaN(n.parsed)) return false;
              // Filter by parameter type for reasonableness
              if (param.unit === '%') {
                return n.parsed >= 0.1 && n.parsed <= 100;
              } else if (param.standardName === 'pH') {
                return n.parsed >= 0 && n.parsed <= 14;
              } else if (param.unit === 'mg/kg' || param.unit === 'mg/L') {
                // Heavy metals and nutrients: typically 0-10000
                return n.parsed >= 0.01 && n.parsed < 10000;
              }
              return n.parsed >= 0.1 && n.parsed < 100000;
            });

          if (candidateNumbers.length === 0) {
            // Fallback: use all numbers if filtering removed everything
            candidateNumbers = allNumbers.map(s => ({
              original: s,
              parsed: parseFloat(s.replace(/[<>]/g, ''))
            })).filter(n => !isNaN(n.parsed));
          }

          if (candidateNumbers.length === 0) continue;

          // CRITICAL: Take the FIRST reasonable number (result always comes before limits in lab reports)
          let valueStr = candidateNumbers[0].original;

          // Check if this is a concatenated number (result + limit merged)
          // E.g., "42450" = 42 (result) + 450 (limit)
          const knownLimit = knownLimits[param.standardName];

          if (knownLimit && !valueStr.startsWith('<') && !valueStr.startsWith('>')) {
            const numValue = parseFloat(valueStr);

            // If number is suspiciously large (> 1000 for most params), check for concatenation
            if (numValue > 1000 || (numValue > 100 && knownLimit < 100)) {
              const numStr = valueStr;
              const limitStr = knownLimit.toString();

              // Check if the number ends with the known limit
              if (numStr.endsWith(limitStr)) {
                // Split off the limit, what's left is the actual value
                const actualValue = numStr.substring(0, numStr.length - limitStr.length);
                if (actualValue.length > 0 && !isNaN(parseFloat(actualValue))) {
                  valueStr = actualValue;
                }
              }
              // Use length-based heuristic for splitting
              // Heavy metals are typically 1-3 digits, limits are 2-3 digits
              else if (numStr.length >= 4) {
                let splitPoint: number;

                if (numStr.length === 4) {
                  // Could be 1+3 or 2+2, prefer 2 digits if valid
                  const candidate2 = parseFloat(numStr.substring(0, 2));
                  const candidate1 = parseFloat(numStr.substring(0, 1));
                  if (candidate2 > 0 && candidate2 <= knownLimit) {
                    splitPoint = 2;
                  } else if (candidate1 > 0 && candidate1 <= knownLimit) {
                    splitPoint = 1;
                  } else {
                    splitPoint = 2; // default to 2
                  }
                } else if (numStr.length === 5) {
                  // Likely 2+3 (e.g., 39200, 26100), take first 2 digits
                  splitPoint = 2;
                } else if (numStr.length === 6) {
                  // Could be 3+3 (e.g., 392450), take first 3 digits
                  splitPoint = 3;
                } else {
                  // Unknown length, take first 2 digits as safe default
                  splitPoint = Math.min(2, Math.floor(numStr.length / 2));
                }

                const candidate = parseFloat(numStr.substring(0, splitPoint));
                if (candidate > 0 && !isNaN(candidate)) {
                  valueStr = numStr.substring(0, splitPoint);
                }
              }
            }
          }

          // We've already taken the first reasonable number above.
          // No need to re-sort or re-filter - the first number is always the result value.

          let value: number | null = null;

          if (valueStr.startsWith('<')) {
            value = null;
          } else if (valueStr.startsWith('>')) {
            value = parseFloat(valueStr.substring(1));
          } else {
            value = parseFloat(valueStr);
          }

          // Only add if we got a valid number
          if (value !== null && !isNaN(value)) {
            parameters[param.standardName] = {
              value,
              unit: param.unit,
              source: sourceLab,
              date,
            };
            break;
          } else if (valueStr.startsWith('<')) {
            parameters[param.standardName] = {
              value: null,
              unit: param.unit,
              source: sourceLab,
              date,
            };
            break;
          }
        }
      }
    }
  }

  return {
    id: `mat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: materialName,
    availableTonnage: 0,
    parameters,
    source: sourceLab,
    date,
  };
}
