import * as XLSX from 'xlsx';
import { Material, ParameterValue } from '../types';
import { ALL_PARAMETERS } from '../constants';

/**
 * Parse Excel file and extract material data
 * Supports the BlendIQ template format with multiple samples
 * @param file Excel file to parse
 * @returns Array of Material objects
 */
export async function parseExcel(file: File): Promise<Material[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('Failed to read file'));
          return;
        }

        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON with header row
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        const materials = extractMaterialsFromSheet(jsonData);
        resolve(materials);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Extract materials from parsed sheet data
 */
function extractMaterialsFromSheet(data: any[][]): Material[] {
  const materials: Material[] = [];

  // Find material information section
  let materialInfoStartRow = -1;
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === 'Field' && data[i][1] === 'Description') {
      materialInfoStartRow = i;
      break;
    }
  }

  if (materialInfoStartRow === -1) {
    throw new Error('Invalid template format: Material information section not found');
  }

  // Extract number of samples from header row
  const headerRow = data[materialInfoStartRow];
  const numSamples = Math.floor((headerRow.length - 2) / 1); // Subtract Field and Description columns

  // Extract material info for each sample
  const materialInfoRows = data.slice(materialInfoStartRow + 1, materialInfoStartRow + 6);
  const sampleInfos: any[] = [];

  for (let sampleIdx = 0; sampleIdx < numSamples; sampleIdx++) {
    const colIdx = 2 + sampleIdx; // Sample columns start at index 2

    const info = {
      name: materialInfoRows[0]?.[colIdx] || `Sample ${sampleIdx + 1}`,
      tonnage: parseFloat(materialInfoRows[1]?.[colIdx]) || 0,
      source: materialInfoRows[2]?.[colIdx] || undefined,
      labNumber: materialInfoRows[3]?.[colIdx] || undefined,
      date: materialInfoRows[4]?.[colIdx] || undefined,
    };

    sampleInfos.push(info);
  }

  // Find parameter data section
  let paramHeaderRow = -1;
  for (let i = materialInfoStartRow + 6; i < data.length; i++) {
    if (data[i][0] === 'Category' || data[i][1] === 'Parameter') {
      paramHeaderRow = i;
      break;
    }
  }

  if (paramHeaderRow === -1) {
    throw new Error('Invalid template format: Parameter section not found');
  }

  // Parse parameter data
  const paramStartRow = paramHeaderRow + 1;

  for (let sampleIdx = 0; sampleIdx < numSamples; sampleIdx++) {
    const parameters: Record<string, ParameterValue> = {};
    const valueColStart = 3 + (sampleIdx * 3); // Each sample has 3 columns: Value, Source, Date

    // Iterate through parameter rows
    for (let rowIdx = paramStartRow; rowIdx < data.length; rowIdx++) {
      const row = data[rowIdx];
      if (!row || row.length === 0) continue;

      const paramName = row[1]; // Parameter name is in column B
      const unit = row[2]; // Unit is in column C
      const value = row[valueColStart]; // Value for this sample
      const source = row[valueColStart + 1]; // Source
      const date = row[valueColStart + 2]; // Date

      // Skip category headers and empty rows
      if (!paramName || !value || value === '') continue;

      // Find matching parameter in constants
      const paramDef = ALL_PARAMETERS.find(p => p.name === paramName);
      if (!paramDef) continue;

      // Parse value as number (all parameters are numeric in BlendIQ)
      const parsedValue = parseFloat(value);
      if (isNaN(parsedValue)) continue;

      parameters[paramName] = {
        value: parsedValue,
        unit: unit || paramDef.unit,
        source: source || undefined,
        date: date || undefined,
      };
    }

    // Create material object
    if (Object.keys(parameters).length > 0 || sampleInfos[sampleIdx].name) {
      const material: Material = {
        id: `${Date.now()}-${sampleIdx}`,
        name: sampleInfos[sampleIdx].name,
        availableTonnage: sampleInfos[sampleIdx].tonnage,
        parameters,
        source: sampleInfos[sampleIdx].source,
        labNumber: sampleInfos[sampleIdx].labNumber,
        date: sampleInfos[sampleIdx].date,
      };

      materials.push(material);
    }
  }

  if (materials.length === 0) {
    throw new Error('No material data found in Excel file');
  }

  return materials;
}

/**
 * Count how many parameters were detected in parsed materials
 */
export function countExcelParameters(materials: Material[]): number {
  const allParams = new Set<string>();
  materials.forEach(mat => {
    Object.keys(mat.parameters).forEach(param => allParams.add(param));
  });
  return allParams.size;
}
