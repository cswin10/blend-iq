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
      extractedText: text.substring(0, 500), // First 500 chars for debugging
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

  // Extract material name (usually at the top of the report)
  let materialName = filename.replace('.pdf', '');
  const namePatterns = [
    /sample\s*(?:name|id|ref|no)[:\s]+([^\n]+)/i,
    /material[:\s]+([^\n]+)/i,
    /site[:\s]+([^\n]+)/i,
  ];

  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      materialName = match[1].trim();
      break;
    }
  }

  // Extract date
  let date: string | undefined;
  const datePatterns = [
    /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/,
    /(\d{4}[/-]\d{1,2}[/-]\d{1,2})/,
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
    /laboratory[:\s]+([^\n]+)/i,
    /lab[:\s]+([^\n]+)/i,
    /tested\s+by[:\s]+([^\n]+)/i,
  ];

  for (const pattern of labPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      sourceLab = match[1].trim();
      break;
    }
  }

  // Parameter extraction patterns
  const parameters: Material['parameters'] = {};

  // Common parameter patterns with their units
  const parameterPatterns = [
    // Format: "pH 7.5" or "pH: 7.5" or "pH 7.5 units"
    { name: 'pH', pattern: /\bpH[:\s]+(\d+\.?\d*)/i, unit: '' },

    // Heavy metals (usually in mg/kg)
    { name: 'Arsenic', pattern: /\barsenic[:\s]+(\d+\.?\d*)/i, unit: 'mg/kg' },
    { name: 'Cadmium', pattern: /\bcadmium[:\s]+(\d+\.?\d*)/i, unit: 'mg/kg' },
    { name: 'Chromium (Total)', pattern: /\bchromium[:\s]+(?:total)?[:\s]*(\d+\.?\d*)/i, unit: 'mg/kg' },
    { name: 'Copper', pattern: /\bcopper[:\s]+(\d+\.?\d*)/i, unit: 'mg/kg' },
    { name: 'Lead', pattern: /\blead[:\s]+(\d+\.?\d*)/i, unit: 'mg/kg' },
    { name: 'Mercury', pattern: /\bmercury[:\s]+(\d+\.?\d*)/i, unit: 'mg/kg' },
    { name: 'Nickel', pattern: /\bnickel[:\s]+(\d+\.?\d*)/i, unit: 'mg/kg' },
    { name: 'Zinc', pattern: /\bzinc[:\s]+(\d+\.?\d*)/i, unit: 'mg/kg' },

    // Particle size distribution (%)
    { name: 'Clay', pattern: /\bclay[:\s]+(\d+\.?\d*)/i, unit: '%' },
    { name: 'Silt', pattern: /\bsilt[:\s]+(\d+\.?\d*)/i, unit: '%' },
    { name: 'Sand', pattern: /\bsand[:\s]+(\d+\.?\d*)/i, unit: '%' },

    // Organic matter (%)
    { name: 'Organic Matter', pattern: /\borganic\s+matter[:\s]+(\d+\.?\d*)/i, unit: '%' },

    // Stone content (%)
    { name: 'Stone Content (>2mm)', pattern: /\bstone\s+content[:\s]+(\d+\.?\d*)/i, unit: '%' },

    // Nutrients (mg/kg or %)
    { name: 'Nitrogen', pattern: /\bnitrogen[:\s]+(\d+\.?\d*)/i, unit: 'mg/kg' },
    { name: 'Phosphorus', pattern: /\bphosphorus[:\s]+(\d+\.?\d*)/i, unit: 'mg/kg' },
    { name: 'Potassium', pattern: /\bpotassium[:\s]+(\d+\.?\d*)/i, unit: 'mg/kg' },

    // Contaminants
    { name: 'TPH (Total Petroleum Hydrocarbons)', pattern: /\bTPH[:\s]+(\d+\.?\d*)/i, unit: 'mg/kg' },
    { name: 'PAH (Total)', pattern: /\bPAH[:\s]+(?:total)?[:\s]*(\d+\.?\d*)/i, unit: 'mg/kg' },
  ];

  // Extract each parameter
  for (const { name, pattern, unit } of parameterPatterns) {
    const match = text.match(pattern);
    if (match) {
      const value = parseFloat(match[1]);
      if (!isNaN(value)) {
        parameters[name] = {
          value,
          unit,
          source: sourceLab,
          date,
        };
      }
    }
  }

  // Check for non-detected values (ND, <LOD, etc.)
  const ndPatterns = [
    /(\w+(?:\s+\w+)*)[:\s]+(?:<\s*LOD|ND|not\s+detected|below\s+detection)/i,
  ];

  for (const pattern of ndPatterns) {
    const matches = text.matchAll(new RegExp(pattern.source, 'gi'));
    for (const match of matches) {
      const paramName = match[1].trim();
      // Check if this matches any of our known parameters
      const knownParam = parameterPatterns.find(p =>
        p.name.toLowerCase().includes(paramName.toLowerCase()) ||
        paramName.toLowerCase().includes(p.name.toLowerCase().split(' ')[0])
      );

      if (knownParam && !parameters[knownParam.name]) {
        parameters[knownParam.name] = {
          value: null,
          unit: knownParam.unit,
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
