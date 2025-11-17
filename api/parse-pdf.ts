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
      extractedText: text.substring(0, 1000), // First 1000 chars for debugging
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
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  // Extract material name
  let materialName = filename.replace('.pdf', '');
  const namePatterns = [
    /sample\s*(?:name|id|ref|no|ID)[:\s]+([^\n]+)/i,
    /material\s*(?:type)?[:\s]+([^\n]+)/i,
    /site[:\s]+([^\n]+)/i,
    /client[:\s]+([^\n]+)/i,
  ];

  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const value = match[1].trim();
      // Use the longest match that's reasonable
      if (value.length > 3 && value.length < 100) {
        materialName = value;
        break;
      }
    }
  }

  // Extract date
  let date: string | undefined;
  const datePatterns = [
    /date\s+(?:tested|sampled|received)[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
    /(\d{1,2}[/-]\d{1,2}[/-]\d{4})/,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      date = match[1];
      break;
    }
  }

  // Extract lab name
  let sourceLab = filename;
  const labPatterns = [
    /^([A-Z0-9\s&]+LABORATOR(?:Y|IES))/im,
    /laboratory[:\s]+([^\n]+)/i,
    /tested\s+by[:\s]+([^\n]+)/i,
  ];

  for (const pattern of labPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      sourceLab = match[1].trim();
      break;
    }
  }

  // Parameter extraction - improved for tabular formats
  const parameters: Material['parameters'] = {};

  // Parameter name mappings (handle variations)
  const parameterMappings: { [key: string]: { standardName: string; unit: string } } = {
    'ph': { standardName: 'pH', unit: '' },
    'soil organic matter': { standardName: 'Organic Matter', unit: '%' },
    'som': { standardName: 'Organic Matter', unit: '%' },
    'organic matter': { standardName: 'Organic Matter', unit: '%' },
    'sand': { standardName: 'Sand', unit: '%' },
    'silt': { standardName: 'Silt', unit: '%' },
    'clay': { standardName: 'Clay', unit: '%' },
    'stones': { standardName: 'Stone Content (>2mm)', unit: '%' },
    'stone content': { standardName: 'Stone Content (>2mm)', unit: '%' },
    'arsenic': { standardName: 'Arsenic', unit: 'mg/kg' },
    'cadmium': { standardName: 'Cadmium', unit: 'mg/kg' },
    'chromium': { standardName: 'Chromium (Total)', unit: 'mg/kg' },
    'chromium (vi)': { standardName: 'Chromium (VI)', unit: 'mg/kg' },
    'copper': { standardName: 'Copper', unit: 'mg/kg' },
    'lead': { standardName: 'Lead', unit: 'mg/kg' },
    'mercury': { standardName: 'Mercury', unit: 'mg/kg' },
    'nickel': { standardName: 'Nickel', unit: 'mg/kg' },
    'selenium': { standardName: 'Selenium', unit: 'mg/kg' },
    'zinc': { standardName: 'Zinc', unit: 'mg/kg' },
    'antimony': { standardName: 'Antimony', unit: 'mg/kg' },
    'nitrogen': { standardName: 'Nitrogen', unit: '%' },
    'total nitrogen': { standardName: 'Nitrogen', unit: '%' },
    'phosphorus': { standardName: 'Phosphorus', unit: 'mg/L' },
    'potassium': { standardName: 'Potassium', unit: 'mg/L' },
  };

  // Process each line looking for tabular data
  // Format: "Parameter Units Value ..." or "Parameter Value Units ..."
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip header lines
    if (line.match(/parameter|units|result|limit|status/i) && !line.match(/\d+\.?\d*/)) {
      continue;
    }

    // Try to match tabular format: "Parameter Units Value ..."
    // Example: "pH pH units 7.4 5.5 - 8.5 Pass"
    // Example: "Sand % 59.6 20 - 70 Pass"
    const tabularMatch = line.match(/^([A-Za-z\s\(\)]+?)\s+(mg\/kg|%|pH units|µS\/cm|:1|mg\/L)?\s+([<>]?\d+\.?\d*)/);

    if (tabularMatch) {
      const paramName = tabularMatch[1].trim().toLowerCase();
      const unitInLine = tabularMatch[2]?.trim();
      const valueStr = tabularMatch[3].trim();

      // Check if this parameter is in our mappings
      let mapping = parameterMappings[paramName];

      // Try partial match if exact match doesn't work
      if (!mapping) {
        for (const [key, value] of Object.entries(parameterMappings)) {
          if (paramName.includes(key) || key.includes(paramName)) {
            mapping = value;
            break;
          }
        }
      }

      if (mapping) {
        let value: number | null = null;

        // Handle < and > prefixes
        if (valueStr.startsWith('<')) {
          // Values like "<0.5" are below detection limit
          value = null;
        } else if (valueStr.startsWith('>')) {
          // Values like ">100" - take the number
          value = parseFloat(valueStr.substring(1));
        } else {
          value = parseFloat(valueStr);
        }

        if (value !== null && !isNaN(value)) {
          parameters[mapping.standardName] = {
            value,
            unit: unitInLine || mapping.unit,
            source: sourceLab,
            date,
          };
        } else if (valueStr.startsWith('<')) {
          // Store non-detected values
          parameters[mapping.standardName] = {
            value: null,
            unit: unitInLine || mapping.unit,
            source: sourceLab,
            date,
          };
        }
      }
    }
  }

  // Additional fallback: Try colon-separated format
  // Example: "pH: 7.5" or "Arsenic: 12.5 mg/kg"
  for (const [searchTerm, mapping] of Object.entries(parameterMappings)) {
    if (parameters[mapping.standardName]) {
      continue; // Already found
    }

    const pattern = new RegExp(`\\b${searchTerm}[:\\s]+([<>]?\\d+\\.?\\d*)`, 'i');
    const match = text.match(pattern);

    if (match) {
      const valueStr = match[1].trim();
      let value: number | null = null;

      if (valueStr.startsWith('<')) {
        value = null;
      } else if (valueStr.startsWith('>')) {
        value = parseFloat(valueStr.substring(1));
      } else {
        value = parseFloat(valueStr);
      }

      if (value !== null && !isNaN(value)) {
        parameters[mapping.standardName] = {
          value,
          unit: mapping.unit,
          source: sourceLab,
          date,
        };
      } else if (valueStr.startsWith('<')) {
        parameters[mapping.standardName] = {
          value: null,
          unit: mapping.unit,
          source: sourceLab,
          date,
        };
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
