import { useState, useEffect } from 'react';
import { Download, FileText, AlertTriangle, CheckCircle, XCircle, ArrowLeft, RotateCcw } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import Plot from 'react-plotly.js';
import { OptimizationResult, Material, OptimizationConfig } from '../types';
import { exportToPDF, exportToCSV, exportToJSON } from '../utils/export';
import { SOIL_TEXTURE_ACCEPTABLE_RANGE } from '../constants';

interface ResultsProps {
  result: OptimizationResult;
  materials: Material[];
  config: OptimizationConfig;
  onBack: () => void;
  onStartNew: () => void;
}

const COLORS = ['#003d5c', '#0066cc', '#00cccc', '#4da9ff', '#80c1ff', '#b3d9ff'];

export default function Results({ result, materials, config, onBack, onStartNew }: ResultsProps) {
  const [filterStatus, setFilterStatus] = useState<'all' | 'marginal' | 'exceeding'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Scroll to top when results load
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Prepare pie chart data
  const pieData = result.tonnageBreakdown.map((tb) => ({
    name: tb.materialName,
    value: tb.percentage,
  }));

  // Filter residuals
  const filteredResiduals = result.residuals.filter((r) => {
    const statusMatch =
      filterStatus === 'all' ||
      (filterStatus === 'marginal' && r.status === 'marginal') ||
      (filterStatus === 'exceeding' && r.status === 'exceeding');

    const categoryMatch = filterCategory === 'all' || r.category === filterCategory;

    return statusMatch && categoryMatch;
  });

  // Get unique categories
  const categories = ['all', ...new Set(result.residuals.map((r) => r.category))];

  // Prepare soil texture triangle data
  const soilTexturePlot = result.soilTexture ? (
    <Plot
      data={
        [
          // Acceptable range (shaded area)
          {
            type: 'scatterternary',
            mode: 'lines',
            a: [
              SOIL_TEXTURE_ACCEPTABLE_RANGE.clay.min,
              SOIL_TEXTURE_ACCEPTABLE_RANGE.clay.max,
              SOIL_TEXTURE_ACCEPTABLE_RANGE.clay.max,
              SOIL_TEXTURE_ACCEPTABLE_RANGE.clay.min,
              SOIL_TEXTURE_ACCEPTABLE_RANGE.clay.min,
            ],
            b: [
              SOIL_TEXTURE_ACCEPTABLE_RANGE.silt.min,
              SOIL_TEXTURE_ACCEPTABLE_RANGE.silt.min,
              SOIL_TEXTURE_ACCEPTABLE_RANGE.silt.max,
              SOIL_TEXTURE_ACCEPTABLE_RANGE.silt.max,
              SOIL_TEXTURE_ACCEPTABLE_RANGE.silt.min,
            ],
            c: [
              100 - SOIL_TEXTURE_ACCEPTABLE_RANGE.clay.min - SOIL_TEXTURE_ACCEPTABLE_RANGE.silt.min,
              100 - SOIL_TEXTURE_ACCEPTABLE_RANGE.clay.max - SOIL_TEXTURE_ACCEPTABLE_RANGE.silt.min,
              100 - SOIL_TEXTURE_ACCEPTABLE_RANGE.clay.max - SOIL_TEXTURE_ACCEPTABLE_RANGE.silt.max,
              100 - SOIL_TEXTURE_ACCEPTABLE_RANGE.clay.min - SOIL_TEXTURE_ACCEPTABLE_RANGE.silt.max,
              100 - SOIL_TEXTURE_ACCEPTABLE_RANGE.clay.min - SOIL_TEXTURE_ACCEPTABLE_RANGE.silt.min,
            ],
            fill: 'toself',
            fillcolor: 'rgba(0, 102, 204, 0.2)',
            line: { color: '#0066cc', width: 2 },
            name: 'BS3882 Acceptable Range',
            hoverinfo: 'skip',
          },
          // Blend point
          {
            type: 'scatterternary',
            mode: 'markers',
            a: [result.soilTexture.clay],
            b: [result.soilTexture.silt],
            c: [result.soilTexture.sand],
            marker: {
              symbol: 'circle',
              size: 12,
              color: result.soilTexture.withinAcceptableRange ? '#00cc00' : '#ff0000',
              line: { color: '#fff', width: 2 },
            },
            name: 'Blend',
            text: [
              `Clay: ${result.soilTexture.clay.toFixed(1)}%<br>` +
              `Silt: ${result.soilTexture.silt.toFixed(1)}%<br>` +
              `Sand: ${result.soilTexture.sand.toFixed(1)}%`,
            ],
            hoverinfo: 'text',
          },
        ] as any
      }
      layout={{
        ternary: {
          sum: 100,
          aaxis: { title: 'Clay %', min: 0, gridcolor: '#f0f0f0' },
          baxis: { title: 'Silt %', min: 0, gridcolor: '#f0f0f0' },
          caxis: { title: 'Sand %', min: 0, gridcolor: '#f0f0f0' },
        },
        showlegend: true,
        legend: { x: 0, y: -0.1, orientation: 'h' },
        margin: { l: 0, r: 0, t: 0, b: 0 },
        height: 400,
      }}
      config={{ displayModeBar: false }}
      className="w-full"
    />
  ) : null;

  const handleExportPDF = () => {
    exportToPDF(materials, config, result);
  };

  const handleExportCSV = () => {
    exportToCSV(materials, config, result);
  };

  const handleExportJSON = () => {
    exportToJSON(materials, config, result);
  };

  return (
    <div className="max-w-6xl mx-auto slide-in">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-navy-700 mb-2">Optimisation Results</h1>
        <p className="text-sm sm:text-base text-gray-600">
          Review your optimised soil blend and export the results.
        </p>
      </div>

      {/* Success/Warning Banner */}
      {result.success ? (
        <div className="card mb-6 bg-green-50 border-green-200">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-900">Optimisation Successful</h3>
              <p className="text-sm text-green-700 mt-1">
                Found optimal blend ratios meeting {result.compliance.compliant} of{' '}
                {result.compliance.totalParameters} parameters within tolerance.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="card mb-6 bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">Optimisation Failed</h3>
              <p className="text-sm text-red-700 mt-1">
                {result.errorMessage || 'Unable to find blend ratios that meet all requirements.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="card mb-6 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900">Warnings</h3>
              <ul className="text-sm text-amber-700 mt-2 space-y-1">
                {result.warnings.map((warning, i) => (
                  <li key={i}>• {warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
        {/* Blend Composition */}
        <div className="card overflow-hidden">
          <h2 className="text-lg sm:text-xl font-semibold text-navy-700 mb-4">Blend Composition</h2>
          <div className="w-full -mx-2 sm:mx-0" style={{ height: '380px', minHeight: '380px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="42%"
                  labelLine={true}
                  label={({ name, value }) => {
                    // Show shortened labels on very small screens
                    const shortName = name.length > 15 ? name.substring(0, 12) + '...' : name;
                    return window.innerWidth < 400 ? `${value.toFixed(1)}%` : `${shortName}: ${value.toFixed(1)}%`;
                  }}
                  outerRadius={window.innerWidth < 640 ? "50%" : "58%"}
                  fill="#8884d8"
                  dataKey="value"
                  style={{ fontSize: window.innerWidth < 640 ? '11px' : '12px' }}
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => `${value.toFixed(2)}%`}
                  contentStyle={{ fontSize: '12px' }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={40}
                  wrapperStyle={{
                    fontSize: window.innerWidth < 640 ? '10px' : '12px',
                    paddingTop: '10px',
                    paddingLeft: window.innerWidth < 640 ? '10px' : '0px',
                    paddingRight: window.innerWidth < 640 ? '10px' : '0px'
                  }}
                  iconSize={window.innerWidth < 640 ? 8 : 10}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Compliance Summary */}
        <div className="card">
          <h2 className="text-lg sm:text-xl font-semibold text-navy-700 mb-4">Compliance Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Total Parameters:</span>
              <span className="font-semibold">{result.compliance.totalParameters}</span>
            </div>
            <div className="flex justify-between items-center text-green-700">
              <span>✓ Compliant:</span>
              <span className="font-semibold">
                {result.compliance.compliant} (
                {((result.compliance.compliant / result.compliance.totalParameters) * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="flex justify-between items-center text-amber-600">
              <span>⚠ Marginal:</span>
              <span className="font-semibold">{result.compliance.marginal}</span>
            </div>
            <div className="flex justify-between items-center text-red-600">
              <span>✗ Exceeding:</span>
              <span className="font-semibold">{result.compliance.exceeding}</span>
            </div>
            <div className="border-t border-gray-200 pt-3 mt-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Mean Residual:</span>
                <span className="font-medium">{result.compliance.meanResidual.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between items-center text-sm mt-2">
                <span className="text-gray-600">Highest Residual:</span>
                <span className="font-medium">{result.compliance.highestResidual.toFixed(2)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tonnage Breakdown */}
      <div className="card mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-navy-700 mb-4">Tonnage Breakdown</h2>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full min-w-[640px]">
            <thead className="bg-navy-600 text-white">
              <tr>
                <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm">Material</th>
                <th className="px-3 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm">Available</th>
                <th className="px-3 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm">Used</th>
                <th className="px-3 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm">Remaining</th>
                <th className="px-3 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm">Percentage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {result.tonnageBreakdown.map((tb, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 sm:px-4 py-2 sm:py-3 font-medium text-xs sm:text-sm">{tb.materialName}</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm">{tb.available.toFixed(2)} t</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-right font-semibold text-xs sm:text-sm">{tb.used.toFixed(2)} t</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm">{tb.remaining.toFixed(2)} t</td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-right">
                    <span
                      className="inline-block px-2 py-1 rounded text-xs font-medium shadow-md"
                      style={{ backgroundColor: COLORS[i % COLORS.length], color: '#fff' }}
                    >
                      {tb.percentage.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Soil Texture Triangle */}
      {result.soilTexture && (
        <div className="card mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-navy-700 mb-4">Soil Texture Analysis</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="min-h-[300px]">{soilTexturePlot}</div>
            <div className="flex flex-col justify-center">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-700">Clay:</span>
                  <span className="font-semibold">{result.soilTexture.clay.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Silt:</span>
                  <span className="font-semibold">{result.soilTexture.silt.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Sand:</span>
                  <span className="font-semibold">{result.soilTexture.sand.toFixed(2)}%</span>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  {result.soilTexture.withinAcceptableRange ? (
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">Within acceptable range (BS3882:2015)</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-700">
                      <XCircle className="w-5 h-5" />
                      <span className="font-medium">Outside acceptable range</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Parameter Residuals */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-navy-700">Parameter Residuals</h2>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-1.5 border-2 border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-navy-500"
            >
              <option value="all">All Status</option>
              <option value="marginal">Marginal Only</option>
              <option value="exceeding">Exceeding Only</option>
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-1.5 border-2 border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-navy-500"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-xs sm:text-sm min-w-[640px]">
            <thead className="bg-navy-600 text-white">
              <tr>
                <th className="px-3 py-2 text-left">Parameter</th>
                <th className="px-3 py-2 text-right">Value</th>
                <th className="px-3 py-2 text-right">Limits</th>
                <th className="px-3 py-2 text-right">Target</th>
                <th className="px-3 py-2 text-right">Residual</th>
                <th className="px-3 py-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredResiduals.map((r, i) => {
                const bgColor =
                  r.status === 'compliant'
                    ? 'bg-green-50'
                    : r.status === 'marginal'
                    ? 'bg-amber-50'
                    : 'bg-red-50';

                const textColor =
                  r.status === 'compliant'
                    ? 'text-green-700'
                    : r.status === 'marginal'
                    ? 'text-amber-700'
                    : 'text-red-700';

                const limits =
                  r.lowerLimit !== undefined && r.upperLimit !== undefined
                    ? `${r.lowerLimit} - ${r.upperLimit}`
                    : r.lowerLimit !== undefined
                    ? `≥ ${r.lowerLimit}`
                    : r.upperLimit !== undefined
                    ? `≤ ${r.upperLimit}`
                    : '-';

                return (
                  <tr key={i} className={`${bgColor} hover:opacity-80`}>
                    <td className="px-3 py-2 font-medium">{r.parameter}</td>
                    <td className="px-3 py-2 text-right">
                      {r.value.toFixed(2)} {r.unit}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600">{limits}</td>
                    <td className="px-3 py-2 text-right">{r.target.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-medium">{r.residualPercent.toFixed(2)}%</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`font-medium ${textColor}`}>
                        {r.status === 'compliant' ? '✓' : r.status === 'marginal' ? '⚠' : '✗'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="card mb-8 bg-gray-50 border-gray-300">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-gray-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-gray-900">Disclaimer</h3>
            <p className="text-sm text-gray-700 mt-2">
              ⚠️ This optimisation is based solely on laboratory data provided. Validation testing by a
              UKAS or MCERTS accredited laboratory is strongly recommended before use.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-4">
        {/* Mobile: Stack buttons vertically */}
        <div className="flex flex-col sm:hidden gap-3">
          <button onClick={handleExportPDF} className="btn btn-primary flex items-center justify-center gap-2 w-full">
            <FileText className="w-4 h-4" />
            <span>Export PDF Report</span>
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleExportJSON} className="btn btn-secondary flex items-center justify-center gap-2 text-xs">
              <Download className="w-3 h-3" />
              <span>JSON</span>
            </button>
            <button onClick={handleExportCSV} className="btn btn-secondary flex items-center justify-center gap-2 text-xs">
              <Download className="w-3 h-3" />
              <span>CSV</span>
            </button>
          </div>
          <button onClick={onBack} className="btn btn-secondary flex items-center justify-center gap-2 w-full">
            <ArrowLeft className="w-4 h-4" />
            <span>Adjust & Re-optimise</span>
          </button>
          <button onClick={onStartNew} className="btn btn-secondary flex items-center justify-center gap-2 w-full">
            <RotateCcw className="w-4 h-4" />
            <span>Start New Blend</span>
          </button>
        </div>

        {/* Desktop: Original layout */}
        <div className="hidden sm:flex justify-between items-center">
          <button onClick={onBack} className="btn btn-secondary flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden lg:inline">Adjust & Re-optimise</span>
            <span className="lg:hidden">Adjust</span>
          </button>

          <div className="flex gap-2 lg:gap-3">
            <button onClick={handleExportJSON} className="btn btn-secondary flex items-center gap-2 text-xs lg:text-sm">
              <Download className="w-4 h-4" />
              <span className="hidden lg:inline">Export JSON</span>
              <span className="lg:hidden">JSON</span>
            </button>
            <button onClick={handleExportCSV} className="btn btn-secondary flex items-center gap-2 text-xs lg:text-sm">
              <Download className="w-4 h-4" />
              <span className="hidden lg:inline">Export CSV</span>
              <span className="lg:hidden">CSV</span>
            </button>
            <button onClick={handleExportPDF} className="btn btn-primary flex items-center gap-2 text-xs lg:text-sm">
              <FileText className="w-4 h-4" />
              <span className="hidden lg:inline">Export PDF Report</span>
              <span className="lg:hidden">PDF</span>
            </button>
          </div>

          <button onClick={onStartNew} className="btn btn-secondary flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            <span className="hidden lg:inline">Start New Blend</span>
            <span className="lg:hidden">New</span>
          </button>
        </div>
      </div>
    </div>
  );
}
