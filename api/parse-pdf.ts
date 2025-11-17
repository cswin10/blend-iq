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
    { search: ['chromium (vi)', 'chromium vi', 'cr(vi)', 'cr vi'], standardName: 'Chromium (VI)', unit: 'mg/kg' },
    { search: ['chromium (total)', 'chromium total', 'total chromium', 'chromium', 'cr'], standardName: 'Chromium (Total)', unit: 'mg/kg' },
    { search: ['stone content', 'stones >2mm', 'stones (>2mm)', 'stones'], standardName: 'Stone Content (>2mm)', unit: '%' },
    { search: ['soil organic matter', 'organic matter', 'som'], standardName: 'Organic Matter', unit: '%' },
    { search: ['total nitrogen', 'nitrogen (total)'], standardName: 'Nitrogen', unit: '%' },
    { search: ['clay (<', 'clay %', 'clay'], standardName: 'Clay', unit: '%' },
    { search: ['silt (', 'silt %', 'silt'], standardName: 'Silt', unit: '%' },
    { search: ['total sand', 'sand (', 'sand %', 'sand'], standardName: 'Sand', unit: '%' },
    { search: ['ph (', 'ph'], standardName: 'pH', unit: '' },
    { search: ['phosphorus (p2o5)', 'phosphorus p2o5', 'extractable phosphorus', 'phosphorus'], standardName: 'Phosphorus', unit: 'mg/L' },
    { search: ['potassium (k2o)', 'potassium k2o', 'extractable potassium', 'potassium'], standardName: 'Potassium', unit: 'mg/L' },
    { search: ['total arsenic', 'arsenic (as)', 'arsenic'], standardName: 'Arsenic', unit: 'mg/kg' },
    { search: ['total cadmium', 'cadmium (cd)', 'cadmium'], standardName: 'Cadmium', unit: 'mg/kg' },
    { search: ['total copper', 'copper (cu)', 'copper'], standardName: 'Copper', unit: 'mg/kg' },
    { search: ['total lead', 'lead (pb)', 'lead'], standardName: 'Lead', unit: 'mg/kg' },
    { search: ['total mercury', 'mercury (hg)', 'mercury'], standardName: 'Mercury', unit: 'mg/kg' },
    { search: ['total nickel', 'nickel (ni)', 'nickel'], standardName: 'Nickel', unit: 'mg/kg' },
    { search: ['total selenium', 'selenium (se)', 'selenium'], standardName: 'Selenium', unit: 'mg/kg' },
    { search: ['total zinc', 'zinc (zn)', 'zinc'], standardName: 'Zinc', unit: 'mg/kg' },
    { search: ['total antimony', 'antimony (sb)', 'antimony'], standardName: 'Antimony', unit: 'mg/kg' },
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
