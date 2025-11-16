import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' }),
    };
  }

  try {
    const { pdfBase64, filename } = JSON.parse(event.body || '{}');

    if (!pdfBase64) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Missing PDF data' }),
      };
    }

    // Get Claude API key from environment
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    // Call Claude API with PDF
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: pdfBase64,
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

Return ONLY valid JSON, no other text.`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${error}`);
    }

    const data = await response.json();
    const extractedText = data.content[0].text;

    // Parse the JSON from Claude's response
    let parsedData;
    try {
      // Try to extract JSON from the response
      const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      throw new Error(`Failed to parse Claude response: ${extractedText}`);
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        material,
        rawData: parsedData,
      }),
    };
  } catch (error: any) {
    console.error('PDF parsing error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: error.message || 'Failed to parse PDF',
      }),
    };
  }
};
