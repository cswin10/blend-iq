import { ALL_PARAMETERS } from '../constants';

/**
 * Generate a CSV template for material data entry
 * @param materialName Optional material name to pre-fill
 * @returns CSV content as string
 */
export function generateCSVTemplate(materialName: string = 'Material Name'): string {
  const headers = ['Material Name', 'Parameter', 'Value', 'Unit', 'Source', 'Date'];

  const rows = ALL_PARAMETERS.map(param => {
    return [
      materialName,
      param.name,
      '', // Empty value for user to fill
      param.unit,
      '', // Empty source
      '', // Empty date
    ];
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
}

/**
 * Download CSV template file
 * @param filename Name for the downloaded file
 */
export function downloadCSVTemplate(filename: string = 'BlendIQ_Material_Template.csv'): void {
  const csvContent = generateCSVTemplate();
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Generate example CSV with sample data for demonstration
 */
export function generateExampleCSV(): string {
  const headers = ['Material Name', 'Parameter', 'Value', 'Unit', 'Source', 'Date'];

  // Example data for a few parameters
  const exampleData = [
    ['Topsoil A', 'pH', '6.5', 'pH units', 'ABC Laboratory', '2024-01-15'],
    ['Topsoil A', 'SOM', '7.2', '%', 'ABC Laboratory', '2024-01-15'],
    ['Topsoil A', 'Arsenic (As)', '12', 'mg/kg', 'ABC Laboratory', '2024-01-15'],
    ['Topsoil A', 'Copper (Cu)', '28', 'mg/kg', 'ABC Laboratory', '2024-01-15'],
    ['Topsoil A', 'Nickel (Ni)', '18', 'mg/kg', 'ABC Laboratory', '2024-01-15'],
    ['Topsoil A', 'Zinc (Zn)', '65', 'mg/kg', 'ABC Laboratory', '2024-01-15'],
    ['Topsoil A', 'Clay content', '22', '%', 'ABC Laboratory', '2024-01-15'],
    ['Topsoil A', 'Silt content', '45', '%', 'ABC Laboratory', '2024-01-15'],
    ['Topsoil A', 'Sand content', '33', '%', 'ABC Laboratory', '2024-01-15'],
  ];

  const csvContent = [
    headers.join(','),
    ...exampleData.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
}
