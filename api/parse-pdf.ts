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
  // Extract material name
  let materialName = filename.replace('.pdf', '');
  const sampleIdMatch = text.match(/Sample\s+ID[:\s]+([^\s\n]+)/i);
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

  // Split into lines for easier parsing
  const lines = text.split('\n');

  // Parameter definitions: search terms and standard names
  const parameterDefs = [
    { search: ['ph'], standardName: 'pH', unit: '' },
    { search: ['soil organic matter', 'organic matter', 'som'], standardName: 'Organic Matter', unit: '%' },
    { search: ['sand'], standardName: 'Sand', unit: '%' },
    { search: ['silt'], standardName: 'Silt', unit: '%' },
    { search: ['clay'], standardName: 'Clay', unit: '%' },
    { search: ['stones', 'stone content'], standardName: 'Stone Content (>2mm)', unit: '%' },
    { search: ['total nitrogen', 'nitrogen'], standardName: 'Nitrogen', unit: '%' },
    { search: ['phosphorus'], standardName: 'Phosphorus', unit: 'mg/L' },
    { search: ['potassium'], standardName: 'Potassium', unit: 'mg/L' },
    { search: ['arsenic', 'as'], standardName: 'Arsenic', unit: 'mg/kg' },
    { search: ['cadmium', 'cd'], standardName: 'Cadmium', unit: 'mg/kg' },
    { search: ['chromium (vi)', 'cr(vi)', 'chromium vi'], standardName: 'Chromium (VI)', unit: 'mg/kg' },
    { search: ['chromium', 'cr'], standardName: 'Chromium (Total)', unit: 'mg/kg' },
    { search: ['copper', 'cu'], standardName: 'Copper', unit: 'mg/kg' },
    { search: ['lead', 'pb'], standardName: 'Lead', unit: 'mg/kg' },
    { search: ['mercury', 'hg'], standardName: 'Mercury', unit: 'mg/kg' },
    { search: ['nickel', 'ni'], standardName: 'Nickel', unit: 'mg/kg' },
    { search: ['selenium', 'se'], standardName: 'Selenium', unit: 'mg/kg' },
    { search: ['zinc', 'zn'], standardName: 'Zinc', unit: 'mg/kg' },
    { search: ['antimony', 'sb'], standardName: 'Antimony', unit: 'mg/kg' },
  ];

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
        // Extract ALL numbers from the line (to handle cases where spaces are missing)
        const allNumbers = line.match(/([<>]?\d+\.?\d*)/g);

        if (allNumbers && allNumbers.length > 0) {
          // For lab reports, format is usually: Parameter Units Result Limit Status
          // If we have multiple numbers, the RESULT is typically smaller than LIMIT
          // Take the first number that's not super large (likely a limit value)

          let valueStr = allNumbers[0]; // Default to first number

          // If we have multiple numbers, use heuristics:
          if (allNumbers.length > 1) {
            // For heavy metals, result is typically < 1000, limits can be > 1000
            // Take the smallest value as it's likely the actual result
            const numbers = allNumbers.map(s => {
              const clean = s.replace(/[<>]/g, '');
              return { original: s, parsed: parseFloat(clean) };
            }).filter(n => !isNaN(n.parsed));

            if (numbers.length > 0) {
              // Take the smallest number (likely the result, not the limit)
              numbers.sort((a, b) => a.parsed - b.parsed);
              valueStr = numbers[0].original;
            }
          }

          let value: number | null = null;

          if (valueStr.startsWith('<')) {
            // Below detection limit
            value = null;
          } else if (valueStr.startsWith('>')) {
            value = parseFloat(valueStr.substring(1));
          } else {
            value = parseFloat(valueStr);
          }

          // Only add if we got a valid number or null (for <LOD)
          if (value !== null && !isNaN(value)) {
            parameters[param.standardName] = {
              value,
              unit: param.unit,
              source: sourceLab,
              date,
            };
            break; // Found this parameter, move to next line
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
