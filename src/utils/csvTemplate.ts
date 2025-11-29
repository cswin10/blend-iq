import { ALL_PARAMETERS } from '../constants';
import { ParameterCategory } from '../types';

/**
 * Generate a CSV template for material data entry
 * Grouped by parameter category for better organization
 * @returns CSV content as string
 */
export function generateCSVTemplate(): string {
  // Group parameters by category
  const categories: ParameterCategory[] = ['Heavy Metal', 'PAH', 'TPH', 'BTEX', 'BS3882'];

  const categoryLabels = {
    'Heavy Metal': 'HEAVY METALS',
    'PAH': 'POLYCYCLIC AROMATIC HYDROCARBONS (PAH)',
    'TPH': 'TOTAL PETROLEUM HYDROCARBONS (TPH)',
    'BTEX': 'BTEX (Benzene, Toluene, Ethylbenzene, Xylenes)',
    'BS3882': 'BS3882:2015 TOPSOIL PARAMETERS'
  };

  const rows: string[] = [];

  // Add material name entry at the top
  rows.push('MATERIAL INFORMATION');
  rows.push('Material Name:,[ENTER MATERIAL NAME HERE]');
  rows.push('Available Tonnage:,[ENTER TONNAGE]');
  rows.push('Source/Lab:,[OPTIONAL]');
  rows.push('Date:,[OPTIONAL - FORMAT: YYYY-MM-DD]');
  rows.push(''); // Empty row for spacing

  // Add main headers
  rows.push('Parameter,Value,Unit,Source,Date');
  rows.push(''); // Empty row for spacing

  // Group parameters by category
  categories.forEach(category => {
    const categoryParams = ALL_PARAMETERS.filter(p => p.category === category);

    if (categoryParams.length > 0) {
      // Category header
      rows.push(`"${categoryLabels[category]}"`);

      // Parameters in this category
      categoryParams.forEach(param => {
        rows.push(`"${param.name}",,${param.unit},,`);
      });

      // Empty row between categories
      rows.push('');
    }
  });

  return rows.join('\n');
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
  const rows: string[] = [];

  // Material information
  rows.push('MATERIAL INFORMATION');
  rows.push('Material Name:,Topsoil Sample A');
  rows.push('Available Tonnage:,500');
  rows.push('Source/Lab:,ABC Laboratory');
  rows.push('Date:,2024-01-15');
  rows.push('');

  // Headers
  rows.push('Parameter,Value,Unit,Source,Date');
  rows.push('');

  // Example Heavy Metals
  rows.push('"HEAVY METALS"');
  rows.push('"Arsenic (As)",12,mg/kg,ABC Laboratory,2024-01-15');
  rows.push('"Copper (Cu)",28,mg/kg,ABC Laboratory,2024-01-15');
  rows.push('"Nickel (Ni)",18,mg/kg,ABC Laboratory,2024-01-15');
  rows.push('"Zinc (Zn)",65,mg/kg,ABC Laboratory,2024-01-15');
  rows.push('');

  // Example BS3882 Parameters
  rows.push('"BS3882:2015 TOPSOIL PARAMETERS"');
  rows.push('"pH",6.5,pH units,ABC Laboratory,2024-01-15');
  rows.push('"SOM",7.2,%,ABC Laboratory,2024-01-15');
  rows.push('"Clay content",22,%,ABC Laboratory,2024-01-15');
  rows.push('"Silt content",45,%,ABC Laboratory,2024-01-15');
  rows.push('"Sand content",33,%,ABC Laboratory,2024-01-15');

  return rows.join('\n');
}
