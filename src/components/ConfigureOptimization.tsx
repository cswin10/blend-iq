import React, { useState } from 'react';
import { Settings, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { Material, OptimizationConfig, MaterialConstraint } from '../types';
import { ALL_PARAMETERS, PARAMETER_CATEGORIES, DEFAULT_TOLERANCE } from '../constants';

interface ConfigureOptimizationProps {
  materials: Material[];
  config: OptimizationConfig;
  onConfigChange: (config: OptimizationConfig) => void;
  onBack: () => void;
  onOptimize: () => void;
}

export default function ConfigureOptimization({
  materials,
  config,
  onConfigChange,
  onBack,
  onOptimize,
}: ConfigureOptimizationProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showParameterModal, setShowParameterModal] = useState(false);

  const handleToleranceChange = (value: number) => {
    onConfigChange({ ...config, tolerance: value });
  };

  const handleAutoRelaxChange = (checked: boolean) => {
    onConfigChange({ ...config, autoRelax: checked });
  };

  const handleMaterialConstraintChange = (
    materialId: string,
    field: keyof MaterialConstraint,
    value: any
  ) => {
    const existing = config.materialConstraints.find((c) => c.materialId === materialId);

    let newConstraints: MaterialConstraint[];

    if (existing) {
      newConstraints = config.materialConstraints.map((c) =>
        c.materialId === materialId ? { ...c, [field]: value } : c
      );
    } else {
      newConstraints = [
        ...config.materialConstraints,
        {
          materialId,
          priority: 'Medium',
          [field]: value,
        } as MaterialConstraint,
      ];
    }

    onConfigChange({ ...config, materialConstraints: newConstraints });
  };

  const handleParameterToggle = (paramName: string) => {
    const isSelected = config.selectedParameters.includes(paramName);

    const newSelected = isSelected
      ? config.selectedParameters.filter((p) => p !== paramName)
      : [...config.selectedParameters, paramName];

    onConfigChange({ ...config, selectedParameters: newSelected });
  };

  const selectAllInCategory = (category: string) => {
    const categoryParams = ALL_PARAMETERS.filter((p) => p.category === category).map((p) => p.name);

    const newSelected = [
      ...new Set([...config.selectedParameters, ...categoryParams]),
    ];

    onConfigChange({ ...config, selectedParameters: newSelected });
  };

  const deselectAllInCategory = (category: string) => {
    const categoryParams = ALL_PARAMETERS.filter((p) => p.category === category).map((p) => p.name);

    const newSelected = config.selectedParameters.filter((p) => !categoryParams.includes(p));

    onConfigChange({ ...config, selectedParameters: newSelected });
  };

  // Auto-select mandatory parameters on mount and scroll to top
  React.useEffect(() => {
    // Scroll to top when this component loads
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (config.selectedParameters.length === 0) {
      const mandatoryParams = ALL_PARAMETERS.filter((p) => p.isMandatory).map((p) => p.name);
      onConfigChange({ ...config, selectedParameters: mandatoryParams });
    }
  }, []);

  const getMaterialConstraint = (materialId: string) => {
    return config.materialConstraints.find((c) => c.materialId === materialId);
  };

  return (
    <div className="max-w-4xl mx-auto slide-in">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-navy-700 mb-2">Configure Optimisation</h1>
        <p className="text-sm sm:text-base text-gray-600">
          Set tolerance levels and constraints for your soil blend optimisation.
        </p>
      </div>

      {/* Main Configuration */}
      <div className="card mb-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-6 h-6 text-navy-600" />
          <h2 className="text-xl font-semibold text-navy-700">Optimisation Settings</h2>
        </div>

        {/* Tolerance Slider */}
        <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <label className="text-base sm:text-lg font-semibold text-navy-700 mb-0">
                Tolerance Level
              </label>
              <span className="text-xs sm:text-sm text-gray-600 font-normal">
                (How close to target values)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Current:</span>
              <input
                type="number"
                min="15"
                max="100"
                value={config.tolerance}
                onChange={(e) => handleToleranceChange(parseInt(e.target.value) || DEFAULT_TOLERANCE)}
                className="w-16 sm:w-20 px-2 sm:px-3 py-1.5 border-2 border-navy-300 rounded-lg text-sm sm:text-base font-bold text-navy-700 text-center focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
              />
              <span className="text-sm font-medium text-navy-700">%</span>
            </div>
          </div>

          <div className="relative mb-3">
            <input
              type="range"
              min="15"
              max="100"
              step="5"
              value={config.tolerance}
              onChange={(e) => handleToleranceChange(parseInt(e.target.value))}
              className="w-full h-3 bg-gradient-to-r from-red-200 via-yellow-200 to-green-200 rounded-lg appearance-none cursor-pointer slider-thumb"
              style={{
                background: `linear-gradient(to right,
                  #fca5a5 0%,
                  #fcd34d ${((config.tolerance - 15) / (100 - 15)) * 50}%,
                  #86efac ${((config.tolerance - 15) / (100 - 15)) * 100}%)`
              }}
            />
          </div>

          <div className="flex justify-between text-xs sm:text-sm font-medium mb-3">
            <span className="text-red-600 flex items-center gap-1">
              <span>15%</span>
              <span className="hidden sm:inline text-xs font-normal">(Strict)</span>
            </span>
            <span className="text-gray-600 flex items-center gap-1">
              <span>50%</span>
              <span className="hidden sm:inline text-xs font-normal">(Moderate)</span>
            </span>
            <span className="text-green-600 flex items-center gap-1">
              <span>100%</span>
              <span className="hidden sm:inline text-xs font-normal">(Relaxed)</span>
            </span>
          </div>

          <div className="mt-3 flex items-start gap-2 text-xs sm:text-sm text-gray-700 bg-white/60 p-3 rounded-lg">
            <Info className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5 text-navy-600" />
            <div>
              <p className="font-medium mb-1">What does tolerance mean?</p>
              <p className="text-gray-600">
                Tolerance controls how precisely the blend must match your target values.
                <span className="font-medium"> Lower values (15-30%)</span> require very strict compliance—ideal for sensitive projects.
                <span className="font-medium"> Higher values (60-100%)</span> allow more flexibility—useful when exact matches are difficult.
              </p>
            </div>
          </div>
        </div>

        {/* Auto-Relax */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="auto-relax"
            checked={config.autoRelax}
            onChange={(e) => handleAutoRelaxChange(e.target.checked)}
            className="w-4 h-4 text-navy-600 rounded focus:ring-navy-500"
          />
          <label htmlFor="auto-relax" className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm font-medium text-gray-700">
              Auto-Relax Tolerance (Recommended)
            </span>
            <span className="text-xs text-gray-500">
              Automatically increase tolerance if no solution is found
            </span>
          </label>
        </div>
      </div>

      {/* Parameter Selection */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-navy-700">
            Parameters ({config.selectedParameters.length} selected)
          </h2>
          <button
            onClick={() => setShowParameterModal(true)}
            className="btn btn-secondary text-sm"
          >
            Select Parameters
          </button>
        </div>

        <p className="text-sm text-gray-600">
          {config.selectedParameters.length === 0
            ? 'No parameters selected. Click "Select Parameters" to choose which parameters to optimise.'
            : `${config.selectedParameters.length} parameter(s) will be optimised to meet BS3882:2015 standards.`}
        </p>
      </div>

      {/* Advanced Options */}
      <div className="card mb-8">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 w-full text-left"
        >
          {showAdvanced ? (
            <ChevronDown className="w-5 h-5 text-navy-600" />
          ) : (
            <ChevronRight className="w-5 h-5 text-navy-600" />
          )}
          <h2 className="text-xl font-semibold text-navy-700">Advanced Options</h2>
        </button>

        {showAdvanced && (
          <div className="mt-6 space-y-6">
            {/* Material Constraints */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Material Constraints</h3>
              <div className="space-y-3">
                {materials.map((material) => {
                  const constraint = getMaterialConstraint(material.id);
                  return (
                    <div
                      key={material.id}
                      className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-3 p-3 bg-gray-50 rounded-lg border-2 border-gray-200 hover:border-navy-300 transition-colors"
                    >
                      <div className="sm:col-span-1">
                        <p className="text-xs sm:text-sm font-medium text-gray-900">{material.name}</p>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Min %</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={constraint?.minPercentage || ''}
                          onChange={(e) =>
                            handleMaterialConstraintChange(
                              material.id,
                              'minPercentage',
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          placeholder="0"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Max %</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={constraint?.maxPercentage || ''}
                          onChange={(e) =>
                            handleMaterialConstraintChange(
                              material.id,
                              'maxPercentage',
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          placeholder="100"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Priority</label>
                        <select
                          value={constraint?.priority || 'Medium'}
                          onChange={(e) =>
                            handleMaterialConstraintChange(
                              material.id,
                              'priority',
                              e.target.value as 'Low' | 'Medium' | 'High'
                            )
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option>Low</option>
                          <option>Medium</option>
                          <option>High</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
        <button onClick={onBack} className="btn btn-secondary px-6 py-3 w-full sm:w-auto order-2 sm:order-1">
          <span>← Back</span>
        </button>
        <button
          onClick={onOptimize}
          disabled={config.selectedParameters.length === 0}
          className={`btn btn-primary px-6 sm:px-8 py-3 text-base sm:text-lg w-full sm:w-auto order-1 sm:order-2 ${
            config.selectedParameters.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <span>Optimise Blend →</span>
        </button>
      </div>

      {/* Parameter Selection Modal */}
      {showParameterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-2xl font-bold text-navy-700">Select Parameters</h3>
              <p className="text-sm text-gray-600 mt-1">
                Choose which parameters to include in the optimisation
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {PARAMETER_CATEGORIES.map((category) => {
                const categoryParams = ALL_PARAMETERS.filter((p) => p.category === category);
                const selectedCount = categoryParams.filter((p) =>
                  config.selectedParameters.includes(p.name)
                ).length;

                return (
                  <div key={category} className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">
                        {category} ({selectedCount}/{categoryParams.length})
                      </h4>
                      <div className="flex gap-2">
                        <button
                          onClick={() => selectAllInCategory(category)}
                          className="text-xs text-navy-600 hover:text-navy-700 font-medium"
                        >
                          Select All
                        </button>
                        <button
                          onClick={() => deselectAllInCategory(category)}
                          className="text-xs text-gray-600 hover:text-gray-700 font-medium"
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {categoryParams.map((param) => (
                        <label
                          key={param.name}
                          className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={config.selectedParameters.includes(param.name)}
                            onChange={() => handleParameterToggle(param.name)}
                            className="w-4 h-4 text-navy-600 rounded focus:ring-navy-500"
                          />
                          <span className="text-sm text-gray-900">
                            {param.name}
                            {param.isMandatory && (
                              <span className="text-xs text-red-600 ml-1">*</span>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowParameterModal(false)} className="btn btn-secondary">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
