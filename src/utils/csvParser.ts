import Papa from 'papaparse';
import { Material, ParameterValue } from '../types';
import { ALL_PARAMETERS } from '../constants';

/**
 * Defensive CSV parser that handles missing headers, blank cells, and various data formats
 */
export async function parseCSV(file: File): Promise<Material[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      complete: (results) => {
        try {
          const materials = processCSVData(results.data as string[][], file.name);
          resolve(materials);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(new Error(`CSV parsing failed: ${error.message}`));
      },
      skipEmptyLines: true,
    });
  });
}

function processCSVData(data: string[][], filename: string): Material[] {
  if (data.length === 0) {
    throw new Error('CSV file is empty');
  }

  // Try to detect format
  const format = detectCSVFormat(data);

  switch (format) {
    case 'horizontal':
      return parseHorizontalFormat(data, filename);
    case 'vertical':
      return parseVerticalFormat(data, filename);
    case 'multi-material':
      return parseMultiMaterialFormat(data, filename);
    default:
      throw new Error('Unable to detect CSV format');
  }
}

type CSVFormat = 'horizontal' | 'vertical' | 'multi-material';

function detectCSVFormat(data: string[][]): CSVFormat {
  const firstRow = data[0];
  const secondRow = data[1] || [];

  // Check if first row has parameter names
  const hasParameterHeaders = firstRow.some((cell) =>
    ALL_PARAMETERS.some((p) => normalizeParameterName(cell) === normalizeParameterName(p.name))
  );

  // Check if first column has parameter names
  const hasParameterColumn = data.slice(1).some((row) =>
    ALL_PARAMETERS.some((p) => normalizeParameterName(row[0]) === normalizeParameterName(p.name))
  );

  if (hasParameterHeaders && data.length > 1) {
    return 'horizontal'; // Parameters as columns, materials as rows
  } else if (hasParameterColumn) {
    return 'vertical'; // Parameters as rows, materials as columns
  } else {
    return 'multi-material'; // Try to parse as multi-material format
  }
}

function parseHorizontalFormat(data: string[][], filename: string): Material[] {
  const headers = data[0].map(h => h.trim());
  const materials: Material[] = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const materialName = row[0]?.trim() || `Material ${i}`;

    const parameters: Record<string, ParameterValue> = {};

    for (let j = 1; j < headers.length; j++) {
      const paramName = headers[j];
      const value = parseValue(row[j]);

      if (value !== null) {
        const param = findParameter(paramName);
        parameters[paramName] = {
          value,
          unit: param?.unit || '',
          source: filename,
        };
      }
    }

    materials.push({
      id: `mat-${Date.now()}-${i}`,
      name: materialName,
      availableTonnage: 0, // User will input this
      parameters,
      source: filename,
    });
  }

  return materials;
}

function parseVerticalFormat(data: string[][], filename: string): Material[] {
  // First row contains material names (skip first cell which is "Parameter" or empty)
  const materialNames = data[0].slice(1).map(name => name.trim() || `Material ${data[0].indexOf(name)}`);
  const materials: Material[] = materialNames.map((name, index) => ({
    id: `mat-${Date.now()}-${index}`,
    name,
    availableTonnage: 0,
    parameters: {},
    source: filename,
  }));

  // Process each row as a parameter
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const paramName = row[0]?.trim();

    if (!paramName) continue;

    const param = findParameter(paramName);

    for (let j = 1; j < row.length && j - 1 < materials.length; j++) {
      const value = parseValue(row[j]);

      if (value !== null) {
        materials[j - 1].parameters[paramName] = {
          value,
          unit: param?.unit || '',
          source: filename,
        };
      }
    }
  }

  return materials;
}

function parseMultiMaterialFormat(data: string[][], filename: string): Material[] {
  // This format might have sections for different materials
  // Try to intelligently parse it
  const materials: Material[] = [];
  let currentMaterial: Material | null = null;

  for (const row of data) {
    // Skip empty rows
    if (row.every(cell => !cell || cell.trim() === '')) {
      continue;
    }

    const firstCell = row[0]?.trim().toLowerCase();

    // Check if this is a material name row
    if (firstCell && (firstCell.includes('material') || firstCell.includes('sample') || firstCell.includes('batch'))) {
      if (currentMaterial) {
        materials.push(currentMaterial);
      }
      currentMaterial = {
        id: `mat-${Date.now()}-${materials.length}`,
        name: row[0]?.trim() || `Material ${materials.length + 1}`,
        availableTonnage: 0,
        parameters: {},
        source: filename,
      };
      continue;
    }

    // Try to parse as parameter
    if (currentMaterial) {
      const paramName = row[0]?.trim();
      const value = parseValue(row[1]);

      if (paramName && value !== null) {
        const param = findParameter(paramName);
        currentMaterial.parameters[paramName] = {
          value,
          unit: param?.unit || row[2]?.trim() || '',
          source: filename,
        };
      }
    }
  }

  if (currentMaterial) {
    materials.push(currentMaterial);
  }

  // If no materials found, create a single material with all parseable data
  if (materials.length === 0) {
    const singleMaterial: Material = {
      id: `mat-${Date.now()}-0`,
      name: filename.replace(/\.[^/.]+$/, ''),
      availableTonnage: 0,
      parameters: {},
      source: filename,
    };

    for (const row of data) {
      const paramName = row[0]?.trim();
      const value = parseValue(row[1]);

      if (paramName && value !== null) {
        const param = findParameter(paramName);
        singleMaterial.parameters[paramName] = {
          value,
          unit: param?.unit || row[2]?.trim() || '',
          source: filename,
        };
      }
    }

    materials.push(singleMaterial);
  }

  return materials;
}

function parseValue(value: string | undefined): number | null {
  if (!value) return null;

  const trimmed = value.trim().toLowerCase();

  // Handle common null values
  if (
    trimmed === '' ||
    trimmed === 'n/a' ||
    trimmed === 'na' ||
    trimmed === '-' ||
    trimmed === 'null' ||
    trimmed === 'nd' ||
    trimmed === 'not detected' ||
    trimmed === '<' ||
    trimmed.startsWith('<')
  ) {
    return null;
  }

  // Remove common non-numeric characters
  const cleaned = trimmed.replace(/[,\s%]/g, '');

  // Handle less-than values (e.g., "<0.5") - use the value
  if (cleaned.startsWith('<')) {
    const num = parseFloat(cleaned.substring(1));
    return isNaN(num) ? null : num;
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function findParameter(name: string) {
  const normalized = normalizeParameterName(name);
  return ALL_PARAMETERS.find((p) => normalizeParameterName(p.name) === normalized);
}

function normalizeParameterName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '');
}

export function countDetectedParameters(materials: Material[]): number {
  const allParams = new Set<string>();

  for (const material of materials) {
    for (const paramName of Object.keys(material.parameters)) {
      if (material.parameters[paramName].value !== null) {
        allParams.add(paramName);
      }
    }
  }

  return allParams.size;
}
