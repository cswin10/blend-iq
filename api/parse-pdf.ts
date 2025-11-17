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
      debug: {
        extractedText: text.substring(0, 2000),
        parameterCount: Object.keys(material.parameters).length,
      },
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
  // Normalize text - replace multiple spaces with single space
  const normalizedText = text.replace(/\s+/g, ' ');

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

  // Define all parameters we want to extract with multiple possible patterns
  const parameterPatterns = [
    {
      names: ['pH', 'ph'],
      standardName: 'pH',
      unit: '',
      patterns: [
        /\bpH\s+pH units\s+(\d+\.?\d*)/i,
        /\bpH\s+(\d+\.?\d*)/i,
      ],
    },
    {
      names: ['Soil Organic Matter', 'SOM', 'Organic Matter'],
      standardName: 'Organic Matter',
      unit: '%',
      patterns: [
        /\bSoil Organic Matter\s+\(SOM\)\s+%\s+(\d+\.?\d*)/i,
        /\bOrganic Matter\s+%\s+(\d+\.?\d*)/i,
        /\bSOM\s+%\s+(\d+\.?\d*)/i,
      ],
    },
    {
      names: ['Sand'],
      standardName: 'Sand',
      unit: '%',
      patterns: [
        /\bSand\s+%\s+(\d+\.?\d*)/i,
      ],
    },
    {
      names: ['Silt'],
      standardName: 'Silt',
      unit: '%',
      patterns: [
        /\bSilt\s+%\s+(\d+\.?\d*)/i,
      ],
    },
    {
      names: ['Clay'],
      standardName: 'Clay',
      unit: '%',
      patterns: [
        /\bClay\s+%\s+(\d+\.?\d*)/i,
      ],
    },
    {
      names: ['Stones', 'Stone Content'],
      standardName: 'Stone Content (>2mm)',
      unit: '%',
      patterns: [
        /\bStones?\s+>2mm\s+%\s+(\d+\.?\d*)/i,
        /\bStone Content\s+%\s+(\d+\.?\d*)/i,
      ],
    },
    {
      names: ['Total Nitrogen', 'Nitrogen'],
      standardName: 'Nitrogen',
      unit: '%',
      patterns: [
        /\bTotal Nitrogen\s+%\s+(\d+\.?\d*)/i,
        /\bNitrogen\s+%\s+(\d+\.?\d*)/i,
      ],
    },
    {
      names: ['Phosphorus'],
      standardName: 'Phosphorus',
      unit: 'mg/L',
      patterns: [
        /\bPhosphorus\s+\(P2O5\)\s+mg\/L\s+(\d+\.?\d*)/i,
        /\bPhosphorus\s+mg\/L\s+(\d+\.?\d*)/i,
      ],
    },
    {
      names: ['Potassium'],
      standardName: 'Potassium',
      unit: 'mg/L',
      patterns: [
        /\bPotassium\s+\(K2O\)\s+mg\/L\s+(\d+\.?\d*)/i,
        /\bPotassium\s+mg\/L\s+(\d+\.?\d*)/i,
      ],
    },
    // Heavy metals
    {
      names: ['Arsenic', 'As'],
      standardName: 'Arsenic',
      unit: 'mg/kg',
      patterns: [
        /\bArsenic\s+\(As\)\s+mg\/kg\s+([<>]?\d+\.?\d*)/i,
        /\bArsenic\s+mg\/kg\s+([<>]?\d+\.?\d*)/i,
      ],
    },
    {
      names: ['Cadmium', 'Cd'],
      standardName: 'Cadmium',
      unit: 'mg/kg',
      patterns: [
        /\bCadmium\s+\(Cd\)\s+mg\/kg\s+([<>]?\d+\.?\d*)/i,
        /\bCadmium\s+mg\/kg\s+([<>]?\d+\.?\d*)/i,
      ],
    },
    {
      names: ['Chromium', 'Cr'],
      standardName: 'Chromium (Total)',
      unit: 'mg/kg',
      patterns: [
        /\bChromium\s+\(Cr\)\s+mg\/kg\s+([<>]?\d+\.?\d*)/i,
        /\bChromium\s+mg\/kg\s+([<>]?\d+\.?\d*)/i,
      ],
    },
    {
      names: ['Chromium (VI)', 'Cr(VI)'],
      standardName: 'Chromium (VI)',
      unit: 'mg/kg',
      patterns: [
        /\bChromium\s+\(VI\)\s+mg\/kg\s+([<>]?\d+\.?\d*)/i,
      ],
    },
    {
      names: ['Copper', 'Cu'],
      standardName: 'Copper',
      unit: 'mg/kg',
      patterns: [
        /\bCopper\s+\(Cu\)\s+mg\/kg\s+([<>]?\d+\.?\d*)/i,
        /\bCopper\s+mg\/kg\s+([<>]?\d+\.?\d*)/i,
      ],
    },
    {
      names: ['Lead', 'Pb'],
      standardName: 'Lead',
      unit: 'mg/kg',
      patterns: [
        /\bLead\s+\(Pb\)\s+mg\/kg\s+([<>]?\d+\.?\d*)/i,
        /\bLead\s+mg\/kg\s+([<>]?\d+\.?\d*)/i,
      ],
    },
    {
      names: ['Mercury', 'Hg'],
      standardName: 'Mercury',
      unit: 'mg/kg',
      patterns: [
        /\bMercury\s+\(Hg\)\s+mg\/kg\s+([<>]?\d+\.?\d*)/i,
        /\bMercury\s+mg\/kg\s+([<>]?\d+\.?\d*)/i,
      ],
    },
    {
      names: ['Nickel', 'Ni'],
      standardName: 'Nickel',
      unit: 'mg/kg',
      patterns: [
        /\bNickel\s+\(Ni\)\s+mg\/kg\s+([<>]?\d+\.?\d*)/i,
        /\bNickel\s+mg\/kg\s+([<>]?\d+\.?\d*)/i,
      ],
    },
    {
      names: ['Selenium', 'Se'],
      standardName: 'Selenium',
      unit: 'mg/kg',
      patterns: [
        /\bSelenium\s+\(Se\)\s+mg\/kg\s+([<>]?\d+\.?\d*)/i,
        /\bSelenium\s+mg\/kg\s+([<>]?\d+\.?\d*)/i,
      ],
    },
    {
      names: ['Zinc', 'Zn'],
      standardName: 'Zinc',
      unit: 'mg/kg',
      patterns: [
        /\bZinc\s+\(Zn\)\s+mg\/kg\s+([<>]?\d+\.?\d*)/i,
        /\bZinc\s+mg\/kg\s+([<>]?\d+\.?\d*)/i,
      ],
    },
    {
      names: ['Antimony', 'Sb'],
      standardName: 'Antimony',
      unit: 'mg/kg',
      patterns: [
        /\bAntimony\s+\(Sb\)\s+mg\/kg\s+([<>]?\d+\.?\d*)/i,
        /\bAntimony\s+mg\/kg\s+([<>]?\d+\.?\d*)/i,
      ],
    },
  ];

  // Try each parameter pattern
  for (const param of parameterPatterns) {
    for (const pattern of param.patterns) {
      const match = normalizedText.match(pattern);
      if (match) {
        const valueStr = match[1].trim();
        let value: number | null = null;

        if (valueStr.startsWith('<')) {
          // Below detection limit
          value = null;
        } else if (valueStr.startsWith('>')) {
          value = parseFloat(valueStr.substring(1));
        } else {
          value = parseFloat(valueStr);
        }

        if (value !== null && !isNaN(value)) {
          parameters[param.standardName] = {
            value,
            unit: param.unit,
            source: sourceLab,
            date,
          };
        } else if (valueStr.startsWith('<')) {
          parameters[param.standardName] = {
            value: null,
            unit: param.unit,
            source: sourceLab,
            date,
          };
        }
        break; // Found this parameter, move to next
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
