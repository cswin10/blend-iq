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

  // Known limits for intelligent number splitting
  const knownLimits: { [key: string]: number} = {
    'Arsenic (As)': 37,
    'Cadmium (Cd)': 11,
    'Chromium (Cr)': 910,
    'Chromium (hexavalent)': 6,
    'Copper (Cu)': 135,
    'Lead (Pb)': 200,
    'Mercury (Hg)': 11,
    'Nickel (Ni)': 75,
    'Zinc (Zn)': 200,
    'Selenium (Se)': 250,
    'SOM': 10,
    'Clay content': 35,
    'Silt content': 65,
    'Sand content': 85,
    '>2mm': 30,
  };

  // Parameter definitions: search terms and standard names
  // IMPORTANT: Order matters! More specific terms first to avoid false matches
  const parameterDefs = [
    // BS3882 Parameters
    { search: ['ph (', 'ph'], standardName: 'pH', unit: 'pH units' },
    { search: ['soil organic matter', 'organic matter', 'som'], standardName: 'SOM', unit: '%' },
    { search: ['moisture content', 'moisture'], standardName: 'Moisture Content', unit: '%' },
    { search: ['clay (<', 'clay content', 'clay %', 'clay'], standardName: 'Clay content', unit: '%' },
    { search: ['silt content', 'silt (', 'silt %', 'silt'], standardName: 'Silt content', unit: '%' },
    { search: ['sand content', 'total sand', 'sand (', 'sand %', 'sand'], standardName: 'Sand content', unit: '%' },
    { search: ['loss on ignition', 'loi'], standardName: 'Loss on Ignition', unit: '%' },
    { search: ['>50mm', 'stone >50mm'], standardName: '>50mm', unit: '%' },
    { search: ['>20mm', 'stone >20mm'], standardName: '>20mm', unit: '%' },
    { search: ['>2mm', 'stone content', 'stones >2mm'], standardName: '>2mm', unit: '%' },
    { search: ['carbonate content', 'carbonate'], standardName: 'Carbonate', unit: '%' },
    { search: ['total nitrogen', 'nitrogen'], standardName: 'Total nitrogen', unit: '%' },
    { search: ['phosphate', 'phosphorus'], standardName: 'Phosphate', unit: 'mg/L' },
    { search: ['potassium', 'k'], standardName: 'Potassium', unit: 'mg/L' },
    { search: ['magnesium', 'mg'], standardName: 'Magnesium', unit: 'mg/L' },
    { search: ['c:n ratio', 'c:n'], standardName: 'C:N', unit: ':1' },
    { search: ['electrical conductivity', 'ec'], standardName: 'Electrical Conductivity', unit: 'uS/cm' },

    // Heavy Metals - Most specific first
    { search: ['chromium (hexavalent)', 'chromium (vi)', 'chromium vi', 'cr(vi)', 'cr vi', 'hexavalent'], standardName: 'Chromium (hexavalent)', unit: 'mg/kg' },
    { search: ['chromium (total)', 'chromium total', 'total chromium', 'chromium (cr)', 'chromium', 'cr'], standardName: 'Chromium (Cr)', unit: 'mg/kg' },
    { search: ['antimony (sb)', 'antimony', 'sb'], standardName: 'Antimony (Sb)', unit: 'mg/kg' },
    { search: ['arsenic (as)', 'arsenic', 'as'], standardName: 'Arsenic (As)', unit: 'mg/kg' },
    { search: ['cadmium (cd)', 'cadmium', 'cd'], standardName: 'Cadmium (Cd)', unit: 'mg/kg' },
    { search: ['copper (cu)', 'copper', 'cu'], standardName: 'Copper (Cu)', unit: 'mg/kg' },
    { search: ['lead (pb)', 'lead', 'pb'], standardName: 'Lead (Pb)', unit: 'mg/kg' },
    { search: ['mercury (hg)', 'mercury', 'hg'], standardName: 'Mercury (Hg)', unit: 'mg/kg' },
    { search: ['nickel (ni)', 'nickel', 'ni'], standardName: 'Nickel (Ni)', unit: 'mg/kg' },
    { search: ['selenium (se)', 'selenium', 'se'], standardName: 'Selenium (Se)', unit: 'mg/kg' },
    { search: ['zinc (zn)', 'zinc', 'zn'], standardName: 'Zinc (Zn)', unit: 'mg/kg' },

    // TPH - Total Petroleum Hydrocarbons
    { search: ['total >c5 - c35', 'total (c5 - c35)'], standardName: 'Total >C5 - C35', unit: 'mg/kg' },
    { search: ['aromatic (c5 - c35)', 'aromatic c5 - c35'], standardName: 'Aromatic (C5 - C35)', unit: 'mg/kg' },
    { search: ['aliphatic (c5 - c34)', 'aliphatic c5 - c34'], standardName: 'Aliphatic (C5 - C34)', unit: 'mg/kg' },
    { search: ['aliphatic >c16 - c35'], standardName: 'Aliphatic >C16 - C35', unit: 'mg/kg' },
    { search: ['aliphatic >c21 - c34'], standardName: 'Aliphatic >C21 - C34', unit: 'mg/kg' },
    { search: ['aliphatic >c16 - c21'], standardName: 'Aliphatic >C16 - C21', unit: 'mg/kg' },
    { search: ['aliphatic >c12 - c16'], standardName: 'Aliphatic >C12 - C16', unit: 'mg/kg' },
    { search: ['aliphatic >c10 - c12'], standardName: 'Aliphatic >C10 - C12', unit: 'mg/kg' },
    { search: ['aliphatic >c8 - c10'], standardName: 'Aliphatic >C8 - C10', unit: 'mg/kg' },
    { search: ['aliphatic >c6 - c8'], standardName: 'Aliphatic >C6 - C8', unit: 'mg/kg' },
    { search: ['aliphatic >c5 - c6'], standardName: 'Aliphatic >C5 - C6', unit: 'mg/kg' },
    { search: ['aromatic >c21 - c35'], standardName: 'Aromatic >C21 - C35', unit: 'mg/kg' },
    { search: ['aromatic >c16 - c21'], standardName: 'Aromatic >C16 - C21', unit: 'mg/kg' },
    { search: ['aromatic >c12 - c16'], standardName: 'Aromatic >C12 - C16', unit: 'mg/kg' },
    { search: ['aromatic >c10 - c12'], standardName: 'Aromatic >C10 - C12', unit: 'mg/kg' },
    { search: ['aromatic >c8 - c10'], standardName: 'Aromatic >C8 - C10', unit: 'mg/kg' },
    { search: ['aromatic >c7 - c8'], standardName: 'Aromatic >C7 - C8', unit: 'mg/kg' },
    { search: ['aromatic >c5 - c7'], standardName: 'Aromatic >C5 - C7', unit: 'mg/kg' },

    // PAHs - Polycyclic Aromatic Hydrocarbons
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

    // BTEX
    { search: ['benzene : hs', 'benzene'], standardName: 'Benzene', unit: 'µg/kg' },
    { search: ['toluene : hs', 'toluene'], standardName: 'Toluene', unit: 'µg/kg' },
    { search: ['ethylbenzene : hs', 'ethylbenzene'], standardName: 'Ethylbenzene', unit: 'µg/kg' },
    { search: ['p & m-xylene', 'p&m-xylene', 'p and m-xylene'], standardName: 'p & m-xylene', unit: 'µg/kg' },
    { search: ['o-xylene : hs', 'o-xylene'], standardName: 'o-xylene', unit: 'µg/kg' },
    { search: ['mtbe : hs', 'mtbe'], standardName: 'MTBE', unit: 'µg/kg' },
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
