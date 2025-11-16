import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { OptimizationResult, Material, OptimizationConfig, ExportData } from '../types';

/**
 * Export results as PDF (Declaration of Compliance format)
 */
export function exportToPDF(
  materials: Material[],
  config: OptimizationConfig,
  result: OptimizationResult
): void {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('BlendIQ Soil Blend Analysis', 105, 20, { align: 'center' });

  // Subtitle
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Declaration of Compliance', 105, 28, { align: 'center' });

  // Date
  doc.setFontSize(10);
  doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 14, 40);

  let yPosition = 50;

  // Blend Composition
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Blend Composition', 14, yPosition);
  yPosition += 10;

  const compositionData = result.tonnageBreakdown.map((tb) => [
    tb.materialName,
    tb.percentage.toFixed(2) + '%',
    tb.used.toFixed(2) + ' tonnes',
    tb.remaining.toFixed(2) + ' tonnes',
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['Material', 'Percentage', 'Used', 'Remaining']],
    body: compositionData,
    theme: 'grid',
    headStyles: { fillColor: [0, 61, 92] }, // Navy blue
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Compliance Summary
  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Compliance Summary', 14, yPosition);
  yPosition += 10;

  const compliance = result.compliance;
  const complianceSummary = [
    ['Total Parameters Tested', compliance.totalParameters.toString()],
    ['Compliant', `${compliance.compliant} (${((compliance.compliant / compliance.totalParameters) * 100).toFixed(1)}%)`],
    ['Marginal', compliance.marginal.toString()],
    ['Exceeding Limits', compliance.exceeding.toString()],
    ['Mean Residual', compliance.meanResidual.toFixed(2) + '%'],
    ['Highest Residual', compliance.highestResidual.toFixed(2) + '%'],
  ];

  autoTable(doc, {
    startY: yPosition,
    body: complianceSummary,
    theme: 'plain',
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 70 },
      1: { cellWidth: 'auto' },
    },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Soil Texture (if available)
  if (result.soilTexture) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Soil Texture Analysis', 14, yPosition);
    yPosition += 10;

    const textureData = [
      ['Clay', result.soilTexture.clay.toFixed(2) + '%'],
      ['Silt', result.soilTexture.silt.toFixed(2) + '%'],
      ['Sand', result.soilTexture.sand.toFixed(2) + '%'],
      [
        'Status',
        result.soilTexture.withinAcceptableRange
          ? '✓ Within acceptable range (BS3882:2015)'
          : '✗ Outside acceptable range',
      ],
    ];

    autoTable(doc, {
      startY: yPosition,
      body: textureData,
      theme: 'plain',
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // Parameter Details (New Page)
  doc.addPage();
  yPosition = 20;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Parameter Analysis', 14, yPosition);
  yPosition += 10;

  const parameterData = result.residuals.map((r) => {
    const limits =
      r.lowerLimit !== undefined && r.upperLimit !== undefined
        ? `${r.lowerLimit} - ${r.upperLimit}`
        : r.lowerLimit !== undefined
        ? `≥ ${r.lowerLimit}`
        : r.upperLimit !== undefined
        ? `≤ ${r.upperLimit}`
        : '-';

    const statusSymbol =
      r.status === 'compliant' ? '✓' : r.status === 'marginal' ? '⚠' : '✗';

    return [
      r.parameter,
      r.value.toFixed(2),
      r.unit,
      limits,
      r.target.toFixed(2),
      statusSymbol,
    ];
  });

  autoTable(doc, {
    startY: yPosition,
    head: [['Parameter', 'Value', 'Unit', 'Limits', 'Target', 'Status']],
    body: parameterData,
    theme: 'grid',
    headStyles: { fillColor: [0, 61, 92] },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 25, halign: 'right' },
      2: { cellWidth: 20 },
      3: { cellWidth: 30 },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 20, halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        const rowIndex = data.row.index;
        const status = result.residuals[rowIndex]?.status;

        if (status === 'compliant') {
          data.cell.styles.textColor = [0, 128, 0]; // Green
        } else if (status === 'marginal') {
          data.cell.styles.textColor = [255, 140, 0]; // Orange
        } else {
          data.cell.styles.textColor = [255, 0, 0]; // Red
        }
      }
    },
  });

  // Disclaimer (Last Page)
  yPosition = (doc as any).lastAutoTable.finalY + 15;

  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Disclaimer', 14, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const disclaimerText =
    '⚠️ This optimisation is based solely on laboratory data provided. Validation testing by a UKAS or MCERTS accredited laboratory is strongly recommended before use.';

  const splitDisclaimer = doc.splitTextToSize(disclaimerText, 180);
  doc.text(splitDisclaimer, 14, yPosition);

  // Warnings
  if (result.warnings.length > 0) {
    yPosition += splitDisclaimer.length * 5 + 10;

    doc.setFont('helvetica', 'bold');
    doc.text('Warnings:', 14, yPosition);
    yPosition += 6;

    doc.setFont('helvetica', 'normal');
    result.warnings.forEach((warning) => {
      const splitWarning = doc.splitTextToSize(`• ${warning}`, 180);
      doc.text(splitWarning, 14, yPosition);
      yPosition += splitWarning.length * 5 + 2;
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Generated by BlendIQ | Page ${i} of ${pageCount}`,
      105,
      290,
      { align: 'center' }
    );
  }

  // Save
  const filename = `BlendIQ_Analysis_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

/**
 * Export results as CSV
 */
export function exportToCSV(
  materials: Material[],
  config: OptimizationConfig,
  result: OptimizationResult
): void {
  let csv = 'BlendIQ Soil Blend Analysis\n';
  csv += `Date,${new Date().toLocaleDateString('en-GB')}\n\n`;

  // Blend Composition
  csv += 'Blend Composition\n';
  csv += 'Material,Percentage,Used (tonnes),Remaining (tonnes)\n';
  result.tonnageBreakdown.forEach((tb) => {
    csv += `${tb.materialName},${tb.percentage.toFixed(2)}%,${tb.used.toFixed(2)},${tb.remaining.toFixed(2)}\n`;
  });
  csv += '\n';

  // Compliance Summary
  csv += 'Compliance Summary\n';
  csv += `Total Parameters,${result.compliance.totalParameters}\n`;
  csv += `Compliant,${result.compliance.compliant}\n`;
  csv += `Marginal,${result.compliance.marginal}\n`;
  csv += `Exceeding,${result.compliance.exceeding}\n`;
  csv += `Mean Residual,${result.compliance.meanResidual.toFixed(2)}%\n`;
  csv += `Highest Residual,${result.compliance.highestResidual.toFixed(2)}%\n`;
  csv += '\n';

  // Soil Texture
  if (result.soilTexture) {
    csv += 'Soil Texture\n';
    csv += `Clay,${result.soilTexture.clay.toFixed(2)}%\n`;
    csv += `Silt,${result.soilTexture.silt.toFixed(2)}%\n`;
    csv += `Sand,${result.soilTexture.sand.toFixed(2)}%\n`;
    csv += `Within Range,${result.soilTexture.withinAcceptableRange ? 'Yes' : 'No'}\n`;
    csv += '\n';
  }

  // Parameter Details
  csv += 'Parameter Analysis\n';
  csv += 'Parameter,Value,Unit,Lower Limit,Upper Limit,Target,Residual %,Status\n';
  result.residuals.forEach((r) => {
    csv += `${r.parameter},${r.value.toFixed(2)},${r.unit},${r.lowerLimit || ''},${r.upperLimit || ''},${r.target.toFixed(2)},${r.residualPercent.toFixed(2)},${r.status}\n`;
  });

  // Download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `BlendIQ_Analysis_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export complete data as JSON (for reloading)
 */
export function exportToJSON(
  materials: Material[],
  config: OptimizationConfig,
  result: OptimizationResult
): void {
  const exportData: ExportData = {
    materials,
    config,
    result,
    exportDate: new Date().toISOString(),
    version: '1.0.0',
  };

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `BlendIQ_Data_${new Date().toISOString().split('T')[0]}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Import data from JSON
 */
export async function importFromJSON(file: File): Promise<ExportData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        resolve(data);
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
