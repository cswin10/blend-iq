import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { pdfBase64, filename } = req.body;

    if (!pdfBase64) {
      return res.status(400).json({ message: 'Missing PDF data' });
    }

    // Get OpenAI API key from environment
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Call OpenAI GPT-4 API with PDF as base64 image
    // Note: OpenAI doesn't natively support PDF, so we send it as a data URL
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at extracting structured data from laboratory reports. Always return valid JSON only, with no additional text or markdown formatting.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${pdfBase64}`,
                },
              },
              {
                type: 'text',
                text: `Extract all soil and contamination parameters from this laboratory report.

Return a JSON object with the following structure:
{
  "materialName": "name of the soil sample/material",
  "sourceLab": "name of the laboratory",
  "date": "report date in YYYY-MM-DD format",
  "parameters": [
    {
      "parameter": "parameter name (e.g., pH, Arsenic, Clay, etc.)",
      "value": numeric value only (null if not detected or <LOD),
      "unit": "unit of measurement",
      "notes": "any relevant notes"
    }
  ]
}

Important:
- Extract ALL parameters you can find
- Common parameters include: pH, Stone Content, Organic Matter, Clay, Silt, Sand, heavy metals (As, Cd, Cr, Cu, Pb, Hg, Ni, Zn), nutrients (N, P, K, Mg), TPH, PAHs, etc.
- For values marked as "<LOD", "<0.5", "ND", "Not Detected", use null for the value
- Be precise with units (mg/kg, %, w/w, etc.)
- If multiple samples are present, create separate entries for each

Return ONLY valid JSON, no other text or markdown code blocks.`,
              },
            ],
          },
        ],
        max_tokens: 4096,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    const extractedText = data.choices[0].message.content;

    // Parse the JSON from GPT-4's response
    let parsedData;
    try {
      // Remove markdown code blocks if present
      let jsonText = extractedText.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\n?/g, '');
      }

      // Try to extract JSON from the response
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      throw new Error(`Failed to parse GPT-4 response: ${extractedText}`);
    }

    // Convert to Material format
    const material = {
      id: `mat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: parsedData.materialName || filename || 'Imported Material',
      availableTonnage: 0,
      parameters: {},
      source: parsedData.sourceLab || filename,
      date: parsedData.date,
    };

    // Add parameters
    if (parsedData.parameters && Array.isArray(parsedData.parameters)) {
      parsedData.parameters.forEach((param: any) => {
        if (param.parameter && param.value !== undefined) {
          material.parameters[param.parameter] = {
            value: param.value,
            unit: param.unit || '',
            source: parsedData.sourceLab || filename,
            date: parsedData.date,
          };
        }
      });
    }

    return res.status(200).json({
      success: true,
      material,
      rawData: parsedData,
    });
  } catch (error: any) {
    console.error('PDF parsing error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to parse PDF',
    });
  }
}
