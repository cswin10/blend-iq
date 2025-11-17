import { useState, useMemo } from 'react';
import { X, AlertTriangle, CheckCircle, Sparkles } from 'lucide-react';
import { Material, ParameterValue } from '../types';
import { ALL_PARAMETERS, PARAMETER_CATEGORIES } from '../constants';

interface ManualEntryModalProps {
  onClose: () => void;
  onSave: (material: Material) => void;
}

// Typical topsoil values for quick testing/demo
const TYPICAL_TOPSOIL_VALUES: Record<string, number> = {
  'pH': 6.5,
  'Stone Content (>2mm)': 4,
  'Organic Matter': 6,
  'Clay': 20,
  'Silt': 40,
  'Sand': 40,
  'Nitrogen (Total)': 2000,
  'Phosphorus (Available)': 25,
  'Potassium (Available)': 150,
  'Magnesium (Available)': 80,
  'Arsenic': 10,
  'Cadmium': 0.5,
  'Chromium (Total)': 30,
  'Copper': 20,
  'Lead': 50,
  'Mercury': 0.1,
  'Nickel': 15,
  'Zinc': 50,
};

export default function ManualEntryModal({ onClose, onSave }: ManualEntryModalProps) {
  const [materialName, setMaterialName] = useState('');
  const [availableTonnage, setAvailableTonnage] = useState<number>(0);
  const [showOnlyKeyParams, setShowOnlyKeyParams] = useState(false);
  const [parameterValues, setParameterValues] = useState<Record<string, ParameterValue>>({});
  const [parameterSources, setParameterSources] = useState<Record<string, string>>({});
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

    // Check for missing mandatory parameters
    const missingMandatory = ALL_PARAMETERS
      .filter(p => p.isMandatory)
      .filter(p => !parameterValues[p.name] || parameterValues[p.name].value === null)
      .map(p => p.name);

    if (missingMandatory.length > 0) {
      newErrors.push(`Missing required parameters: ${missingMandatory.join(', ')}`);
    }

    // Validate parameter values
    Object.entries(parameterValues).forEach(([paramName, paramValue]) => {
      const param = ALL_PARAMETERS.find(p => p.name === paramName);
      if (param && paramValue.value !== null) {
        // Check for negative values in contaminants/physical properties
        if (paramValue.value < 0 && param.name !== 'pH') {
          newErrors.push(`${paramName} cannot be negative`);
        }

        // Check against limits
        if (param.lowerLimit !== undefined && paramValue.value < param.lowerLimit) {
          newErrors.push(`${paramName} (${paramValue.value}) is below minimum limit (${param.lowerLimit})`);
        }
        if (param.upperLimit !== undefined && paramValue.value > param.upperLimit) {
          newErrors.push(`${paramName} (${paramValue.value}) exceeds maximum limit (${param.upperLimit})`);
        }
      }
    });

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    // Create and save material
    const newMaterial: Material = {
      id: `mat-${Date.now()}-manual`,
      name: materialName.trim(),
      availableTonnage,
      parameters: parameterValues,
      source: 'Manual Entry',
      date: new Date().toISOString(),
    };

    onSave(newMaterial);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-navy-700">Manual Material Entry</h2>
            <p className="text-sm text-gray-600 mt-1">
              Enter material data manually when lab reports are unavailable
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
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
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
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
            </div>
            <button
              onClick={handleAutoFill}
              className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium"
            >
              <Sparkles className="w-4 h-4" />
              Use Typical Topsoil Values
            </button>
          </div>

          {/* Parameters Table by Category */}
          <div className="space-y-6">
            {PARAMETER_CATEGORIES.map(category => {
              const params = parametersByCategory[category];
              if (params.length === 0) return null;

              return (
                <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-navy-50 px-4 py-2 border-b border-gray-200">
                    <h3 className="font-semibold text-navy-700">{category}</h3>
                  </div>
                  <div className="overflow-x-auto">
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
                            Source (Optional)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {params.map(param => {
                          const currentValue = parameterValues[param.name];
                          return (
                            <tr key={param.name} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">
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
        <div className="flex items-center justify-between gap-4 p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {Object.keys(parameterValues).length} of {ALL_PARAMETERS.length} parameters entered
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={validateAndSave}
              className="px-6 py-2 bg-navy-600 text-white rounded-lg hover:bg-navy-700 transition-colors font-medium"
            >
              Add Material
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
