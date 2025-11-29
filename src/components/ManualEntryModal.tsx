import { useState, useMemo } from 'react';
import { X, AlertTriangle, CheckCircle, Sparkles } from 'lucide-react';
import { Material, ParameterValue } from '../types';
import { ALL_PARAMETERS, PARAMETER_CATEGORIES } from '../constants';

interface ManualEntryModalProps {
  onClose: () => void;
  onSave: (material: Material) => void;
  existingMaterial?: Material; // Optional - for editing existing materials
}

// Typical topsoil values for quick testing/demo
const TYPICAL_TOPSOIL_VALUES: Record<string, number> = {
  // BS3882 Parameters
  'pH': 6.5,
  'SOM': 7,
  'Moisture Content': 20,
  'Clay content': 20,
  'Silt content': 40,
  'Sand content': 40,
  '>2mm': 5,
  '>20mm': 2,
  'Total nitrogen': 0.4,
  'Phosphate': 50,
  'Potassium': 200,
  'Magnesium': 100,
  'Electrical Conductivity': 1000,

  // Heavy Metals
  'Arsenic (As)': 10,
  'Cadmium (Cd)': 0.5,
  'Chromium (Cr)': 30,
  'Copper (Cu)': 20,
  'Lead (Pb)': 50,
  'Mercury (Hg)': 0.1,
  'Nickel (Ni)': 15,
  'Zinc (Zn)': 50,
};

export default function ManualEntryModal({ onClose, onSave, existingMaterial }: ManualEntryModalProps) {
  const [materialName, setMaterialName] = useState(existingMaterial?.name || '');
  const [availableTonnage, setAvailableTonnage] = useState<number>(existingMaterial?.availableTonnage || 0);
  const [showOnlyKeyParams, setShowOnlyKeyParams] = useState(false);
  const [parameterValues, setParameterValues] = useState<Record<string, ParameterValue>>(existingMaterial?.parameters || {});
  const [parameterSources, setParameterSources] = useState<Record<string, string>>(() => {
    const sources: Record<string, string> = {};
    if (existingMaterial?.parameters) {
      Object.entries(existingMaterial.parameters).forEach(([key, value]) => {
        if (value.source) {
          sources[key] = value.source;
        }
      });
    }
    return sources;
  });
  const [errors, setErrors] = useState<string[]>([]);

  // Filter parameters based on toggle
  const displayedParameters = useMemo(() => {
    if (showOnlyKeyParams) {
      return ALL_PARAMETERS.filter(p => p.isMandatory);
    }
    return ALL_PARAMETERS;
  }, [showOnlyKeyParams]);

  // Group parameters by category
  const parametersByCategory = useMemo(() => {
    const grouped: Record<string, typeof ALL_PARAMETERS> = {};
    PARAMETER_CATEGORIES.forEach(cat => {
      grouped[cat] = displayedParameters.filter(p => p.category === cat);
    });
    return grouped;
  }, [displayedParameters]);

  const handleParameterChange = (paramName: string, value: string, unit: string) => {
    const numValue = value.trim() === '' ? null : parseFloat(value);

    setParameterValues(prev => ({
      ...prev,
      [paramName]: {
        value: numValue,
        unit,
        source: parameterSources[paramName] || 'Manual Entry',
      }
    }));
  };

  const handleSourceChange = (paramName: string, source: string) => {
    setParameterSources(prev => ({
      ...prev,
      [paramName]: source
    }));

    // Update existing parameter value with new source
    if (parameterValues[paramName]) {
      setParameterValues(prev => ({
        ...prev,
        [paramName]: {
          ...prev[paramName],
          source: source || 'Manual Entry',
        }
      }));
    }
  };

  const handleAutoFill = () => {
    const autoFilledValues: Record<string, ParameterValue> = {};

    Object.entries(TYPICAL_TOPSOIL_VALUES).forEach(([paramName, value]) => {
      const param = ALL_PARAMETERS.find(p => p.name === paramName);
      if (param) {
        autoFilledValues[paramName] = {
          value,
          unit: param.unit,
          source: 'Typical Topsoil (Auto-filled)',
        };
      }
    });

    setParameterValues(autoFilledValues);
  };

  const validateAndSave = () => {
    const newErrors: string[] = [];

    // Validate material name
    if (!materialName.trim()) {
      newErrors.push('Material name is required');
    }

    if (availableTonnage <= 0) {
      newErrors.push('Available tonnage must be greater than 0');
    }

    // NOTE: Removed mandatory parameter check - real-world lab reports often only test for specific parameters
    // Users can enter partial data as long as they have at least one parameter

    // Check that at least one parameter is entered
    const enteredParams = Object.entries(parameterValues).filter(
      ([_, value]) => value.value !== null
    );

    if (enteredParams.length === 0) {
      newErrors.push('Please enter at least one parameter value');
    }

    // Validate parameter values (only for parameters that have been entered)
    Object.entries(parameterValues).forEach(([paramName, paramValue]) => {
      const param = ALL_PARAMETERS.find(p => p.name === paramName);
      if (param && paramValue.value !== null) {
        // Check for negative values in contaminants/physical properties
        if (paramValue.value < 0 && param.name !== 'pH') {
          newErrors.push(`${paramName} cannot be negative`);
        }

        // Check against limits (warnings, not errors - allow users to proceed)
        // This validation is informational only
        if (param.lowerLimit !== undefined && paramValue.value < param.lowerLimit) {
          // Just a warning, don't block submission
          console.warn(`${paramName} (${paramValue.value}) is below minimum limit (${param.lowerLimit})`);
        }
        if (param.upperLimit !== undefined && paramValue.value > param.upperLimit) {
          // Just a warning, don't block submission
          console.warn(`${paramName} (${paramValue.value}) exceeds maximum limit (${param.upperLimit})`);
        }
      }
    });

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    // Filter out null/empty parameters before saving
    const filteredParameters: Record<string, ParameterValue> = {};
    Object.entries(parameterValues).forEach(([key, value]) => {
      if (value.value !== null) {
        filteredParameters[key] = value;
      }
    });

    // Create or update material
    const material: Material = {
      id: existingMaterial?.id || `mat-${Date.now()}-manual`,
      name: materialName.trim(),
      availableTonnage,
      parameters: filteredParameters, // Only include parameters with values
      source: existingMaterial?.source || 'Manual Entry',
      date: existingMaterial?.date || new Date().toISOString(),
    };

    onSave(material);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-4 sm:p-6 border-b border-gray-200">
          <div className="flex-1 pr-4">
            <h2 className="text-xl sm:text-2xl font-bold text-navy-700">
              {existingMaterial ? 'Add Missing Parameters' : 'Manual Material Entry'}
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              {existingMaterial
                ? `Fill in missing parameters for ${existingMaterial.name}`
                : 'Enter material data manually when lab reports are unavailable'
              }
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Material Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Material Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={materialName}
                onChange={(e) => setMaterialName(e.target.value)}
                placeholder="e.g., Compost A, Topsoil B"
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Available Tonnage <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={availableTonnage || ''}
                onChange={(e) => setAvailableTonnage(parseFloat(e.target.value) || 0)}
                placeholder="0.0"
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyKeyParams}
                onChange={(e) => setShowOnlyKeyParams(e.target.checked)}
                className="w-4 h-4 text-navy-600 rounded focus:ring-navy-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Show only key parameters ({ALL_PARAMETERS.filter(p => p.isMandatory).length} required)
              </span>
            </label>
            <button
              onClick={handleAutoFill}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium w-full sm:w-auto"
            >
              <Sparkles className="w-4 h-4" />
              <span>Use Typical Topsoil Values</span>
            </button>
          </div>

          {/* Parameters by Category - Responsive Layout */}
          <div className="space-y-6">
            {PARAMETER_CATEGORIES.map(category => {
              const params = parametersByCategory[category];
              if (params.length === 0) return null;

              return (
                <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-navy-50 px-4 py-2 border-b border-gray-200">
                    <h3 className="font-semibold text-navy-700">{category}</h3>
                  </div>

                  {/* Desktop Table View - Hidden on Mobile */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                            Parameter
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                            Value
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                            Unit
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                            Source
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {params.map(param => {
                          const currentValue = parameterValues[param.name];
                          const isDetected = existingMaterial?.parameters[param.name] !== undefined;
                          return (
                            <tr key={param.name} className={`hover:bg-gray-50 ${isDetected ? 'bg-green-50' : ''}`}>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                <div className="flex items-center gap-2">
                                  {isDetected && (
                                    <span title="Detected from upload">
                                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                                    </span>
                                  )}
                                  <div>
                                    {param.name}
                                    {param.isMandatory && (
                                      <span className="ml-1 text-red-500" title="Required parameter">*</span>
                                    )}
                                    {(param.lowerLimit !== undefined || param.upperLimit !== undefined) && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        {param.lowerLimit !== undefined && `Min: ${param.lowerLimit}`}
                                        {param.lowerLimit !== undefined && param.upperLimit !== undefined && ' | '}
                                        {param.upperLimit !== undefined && `Max: ${param.upperLimit}`}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={currentValue?.value ?? ''}
                                  onChange={(e) => handleParameterChange(param.name, e.target.value, param.unit)}
                                  placeholder="—"
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-navy-500 focus:border-navy-500"
                                />
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {param.unit || '—'}
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={parameterSources[param.name] || ''}
                                  onChange={(e) => handleSourceChange(param.name, e.target.value)}
                                  placeholder="Manual Entry"
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-navy-500 focus:border-navy-500"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View - Hidden on Desktop */}
                  <div className="md:hidden divide-y divide-gray-200">
                    {params.map(param => {
                      const currentValue = parameterValues[param.name];
                      const isDetected = existingMaterial?.parameters[param.name] !== undefined;
                      return (
                        <div key={param.name} className={`p-4 space-y-3 ${isDetected ? 'bg-green-50' : ''}`}>
                          <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-1">
                              {isDetected && (
                                <span title="Detected from upload">
                                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                                </span>
                              )}
                              <span>
                                {param.name}
                                {param.isMandatory && (
                                  <span className="ml-1 text-red-500" title="Required parameter">*</span>
                                )}
                              </span>
                            </label>
                            {(param.lowerLimit !== undefined || param.upperLimit !== undefined) && (
                              <div className="text-xs text-gray-500 mb-2">
                                {param.lowerLimit !== undefined && `Min: ${param.lowerLimit}`}
                                {param.lowerLimit !== undefined && param.upperLimit !== undefined && ' | '}
                                {param.upperLimit !== undefined && `Max: ${param.upperLimit}`}
                              </div>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Value
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={currentValue?.value ?? ''}
                                onChange={(e) => handleParameterChange(param.name, e.target.value, param.unit)}
                                placeholder="—"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Unit
                              </label>
                              <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-700">
                                {param.unit || '—'}
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Source (Optional)
                            </label>
                            <input
                              type="text"
                              value={parameterSources[param.name] || ''}
                              onChange={(e) => handleSourceChange(param.name, e.target.value)}
                              placeholder="Manual Entry"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="mt-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-red-800 mb-2">
                    Please fix the following issues:
                  </h4>
                  <ul className="list-disc list-inside space-y-1">
                    {errors.map((error, idx) => (
                      <li key={idx} className="text-sm text-red-700">{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Note:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>Required parameters are marked with <span className="text-red-500">*</span></li>
                  <li>Values will be validated against BS3882:2015 limits</li>
                  <li>Source field helps track data origin (optional)</li>
                  <li>Leave parameters blank if values are unknown</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
            {Object.keys(parameterValues).length} of {ALL_PARAMETERS.length} parameters entered
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={onClose}
              className="px-4 sm:px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={validateAndSave}
              className="px-4 sm:px-6 py-2 bg-navy-600 text-white rounded-lg hover:bg-navy-700 transition-colors font-medium"
            >
              Add Material
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
