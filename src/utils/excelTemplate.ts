import ExcelJS from 'exceljs';
import { ALL_PARAMETERS } from '../constants';
import { ParameterCategory } from '../types';

/**
 * Generate a styled Excel template for material data entry
 * Supports multiple samples with color-coded category grouping
 * @param numSamples Number of sample columns to include (default: 3)
 * @returns Excel workbook
 */
export async function generateExcelTemplate(numSamples: number = 3): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Material Data', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 20 }] // Freeze header rows
  });

  // Color scheme matching website theme
  const colors = {
    navy: '1E3A8A',       // Navy blue header
    navyLight: '3B82F6',  // Light navy
    green: '059669',      // Green accent
    lightBlue: 'E0E7FF',  // Light blue background
    lightGreen: 'D1FAE5', // Light green background
    yellow: 'FEF3C7',     // Yellow for PAH
    orange: 'FED7AA',     // Orange for TPH
    purple: 'E9D5FF',     // Purple for BTEX
    gray: 'F3F4F6',       // Gray for BS3882
    white: 'FFFFFF',
  };

  const categoryColors: Record<ParameterCategory, string> = {
    'Heavy Metal': colors.lightGreen,
    'PAH': colors.yellow,
    'TPH': colors.orange,
    'BTEX': colors.purple,
    'BS3882': colors.gray,
  };

  let currentRow = 1;

  // Title
  const titleRow = worksheet.getRow(currentRow);
  titleRow.getCell(1).value = 'BLENDIQ MATERIAL DATA ENTRY TEMPLATE';
  titleRow.getCell(1).font = { size: 16, bold: true, color: { argb: colors.navy } };
  titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  titleRow.height = 25;
  worksheet.mergeCells(currentRow, 1, currentRow, 3 + (numSamples * 3));
  titleRow.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: colors.lightBlue }
  };
  currentRow += 2;

  // Instructions
  const instructionStyle = { size: 10, color: { argb: '374151' } };
  worksheet.getRow(currentRow).getCell(1).value = 'INSTRUCTIONS:';
  worksheet.getRow(currentRow).getCell(1).font = { size: 11, bold: true, color: { argb: colors.navy } };
  currentRow++;

  const instructions = [
    '1. Enter material information in the blue section below',
    '2. Enter parameter values for each sample in the columns provided',
    '3. Leave cells blank for parameters not tested',
    '4. Save and upload this file to BlendIQ'
  ];

  instructions.forEach(instruction => {
    worksheet.getRow(currentRow).getCell(1).value = instruction;
    worksheet.getRow(currentRow).getCell(1).font = instructionStyle;
    currentRow++;
  });
  currentRow++;

  // Material Information Section
  const headerRow = worksheet.getRow(currentRow);
  headerRow.getCell(1).value = 'MATERIAL INFORMATION';
  headerRow.getCell(1).font = { size: 13, bold: true, color: { argb: colors.white } };
  headerRow.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: colors.navy }
  };
  headerRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 22;
  worksheet.mergeCells(currentRow, 1, currentRow, 3 + (numSamples * 3));
  currentRow += 2;

  // Material info headers
  const infoHeaderRow = worksheet.getRow(currentRow);
  infoHeaderRow.getCell(1).value = 'Field';
  infoHeaderRow.getCell(2).value = 'Description';

  for (let i = 1; i <= numSamples; i++) {
    infoHeaderRow.getCell(2 + i).value = `Sample ${i}`;
  }

  // Style info headers
  for (let col = 1; col <= 2 + numSamples; col++) {
    const cell = infoHeaderRow.getCell(col);
    cell.font = { bold: true, color: { argb: colors.white } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colors.navyLight }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    };
  }
  currentRow++;

  // Material info rows
  const infoFields = [
    { field: 'Material Name', description: 'Name/identifier for the material' },
    { field: 'Available Tonnage', description: 'Total tonnage available (tonnes)' },
    { field: 'Source/Lab', description: 'Laboratory or source (optional)' },
    { field: 'Lab Report No.', description: 'Lab report number (optional)' },
    { field: 'Date', description: 'Sample/test date (YYYY-MM-DD)' }
  ];

  infoFields.forEach(({ field, description }) => {
    const row = worksheet.getRow(currentRow);
    row.getCell(1).value = field;
    row.getCell(2).value = description;

    // Style
    row.getCell(1).font = { bold: true };
    row.getCell(2).font = { italic: true, size: 9 };

    for (let col = 1; col <= 2 + numSamples; col++) {
      const cell = row.getCell(col);
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
      if (col > 2) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEF9C3' } // Light yellow for input
        };
      }
    }
    currentRow++;
  });
  currentRow += 2;

  // Parameter Table Header
  const paramHeaderRow = worksheet.getRow(currentRow);
  let col = 1;
  paramHeaderRow.getCell(col++).value = 'Category';
  paramHeaderRow.getCell(col++).value = 'Parameter';
  paramHeaderRow.getCell(col++).value = 'Unit';

  for (let i = 1; i <= numSamples; i++) {
    paramHeaderRow.getCell(col++).value = `Sample ${i} Value`;
    paramHeaderRow.getCell(col++).value = 'Source';
    paramHeaderRow.getCell(col++).value = 'Date';
  }

  // Style parameter headers
  for (let c = 1; c < col; c++) {
    const cell = paramHeaderRow.getCell(c);
    cell.font = { bold: true, color: { argb: colors.white } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colors.green }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'medium' },
      bottom: { style: 'medium' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    };
  }
  paramHeaderRow.height = 20;
  currentRow++;

  // Group parameters by category
  const categories: ParameterCategory[] = ['Heavy Metal', 'PAH', 'TPH', 'BTEX', 'BS3882'];
  const categoryLabels = {
    'Heavy Metal': 'HEAVY METALS',
    'PAH': 'POLYCYCLIC AROMATIC HYDROCARBONS (PAH)',
    'TPH': 'TOTAL PETROLEUM HYDROCARBONS (TPH)',
    'BTEX': 'BTEX (Benzene, Toluene, Ethylbenzene, Xylenes)',
    'BS3882': 'BS3882:2015 TOPSOIL PARAMETERS'
  };

  categories.forEach(category => {
    const categoryParams = ALL_PARAMETERS.filter(p => p.category === category);

    if (categoryParams.length > 0) {
      categoryParams.forEach((param, index) => {
        const row = worksheet.getRow(currentRow);

        // Category (only show on first row of category)
        if (index === 0) {
          row.getCell(1).value = categoryLabels[category];
          row.getCell(1).font = { bold: true, size: 11 };
        }

        row.getCell(2).value = param.name;
        row.getCell(3).value = param.unit;

        // Style category cell with color
        row.getCell(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: categoryColors[category] }
        };
        row.getCell(1).border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'medium' },
          right: { style: 'thin' }
        };

        // Style parameter and unit cells
        [2, 3].forEach(c => {
          row.getCell(c).border = {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          };
          row.getCell(c).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: categoryColors[category] }
          };
        });

        // Value, Source, Date cells for each sample
        let valueCol = 4;
        for (let s = 0; s < numSamples; s++) {
          // Value cell (highlighted for input)
          row.getCell(valueCol).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFEF9C3' } // Light yellow
          };
          row.getCell(valueCol).border = {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          };

          // Source and Date cells
          [valueCol + 1, valueCol + 2].forEach(c => {
            row.getCell(c).border = {
              top: { style: 'thin' },
              bottom: { style: 'thin' },
              left: { style: 'thin' },
              right: { style: 'thin' }
            };
          });

          valueCol += 3;
        }

        currentRow++;
      });
    }
  });

  // Set column widths
  worksheet.getColumn(1).width = 35; // Category
  worksheet.getColumn(2).width = 35; // Parameter
  worksheet.getColumn(3).width = 12; // Unit

  let colIdx = 4;
  for (let i = 0; i < numSamples; i++) {
    worksheet.getColumn(colIdx++).width = 15; // Value
    worksheet.getColumn(colIdx++).width = 20; // Source
    worksheet.getColumn(colIdx++).width = 14; // Date
  }

  return workbook;
}

/**
 * Download Excel template file
 * @param filename Name for the downloaded file
 * @param numSamples Number of sample columns to include
 */
export async function downloadExcelTemplate(
  filename: string = 'BlendIQ_Material_Template.xlsx',
  numSamples: number = 3
): Promise<void> {
  const workbook = await generateExcelTemplate(numSamples);
  const buffer = await workbook.xlsx.writeBuffer();

  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
