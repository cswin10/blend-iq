import { useState } from 'react';
import { X, FileText, FlaskConical, Hash, Tag } from 'lucide-react';
import { Material } from '../types';

interface MaterialLabelingModalProps {
  materials: Material[];
  jobCode: string;
  onConfirm: (labeledMaterials: Material[]) => void;
  onCancel: () => void;
}

export default function MaterialLabelingModal({
  materials,
  jobCode,
  onConfirm,
  onCancel,
}: MaterialLabelingModalProps) {
  const [labeledMaterials, setLabeledMaterials] = useState<Material[]>(() => {
    // Auto-number materials that don't have names
    return materials.map((mat, index) => {
      if (!mat.name || mat.name.trim() === '') {
        return {
          ...mat,
          name: `${jobCode} - Sample ${index + 1}`,
        };
      }
      return mat;
    });
  });

  const [labUsed, setLabUsed] = useState('');
  const [labNumber, setLabNumber] = useState('');
  const [labTitle, setLabTitle] = useState('');

  const handleMaterialNameChange = (index: number, newName: string) => {
    setLabeledMaterials((prev) =>
      prev.map((mat, i) => (i === index ? { ...mat, name: newName } : mat))
    );
  };

  const handleApplyLabInfoToAll = () => {
    if (labUsed || labNumber || labTitle) {
      setLabeledMaterials((prev) =>
        prev.map((mat) => ({
          ...mat,
          source: labUsed || mat.source,
          // Store lab metadata in the material's parameters
          // Or we could add a new field to Material interface
        }))
      );
    }
  };

  const handleConfirm = () => {
    // Apply lab info before confirming
    const finalMaterials = labeledMaterials.map((mat) => ({
      ...mat,
      source: labUsed || mat.source,
      // Add lab metadata
      labNumber: labNumber || undefined,
      labTitle: labTitle || undefined,
    }));

    onConfirm(finalMaterials as Material[]);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-navy-600" />
              <div>
                <h2 className="text-2xl font-bold text-navy-700">Label Uploaded Samples</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {materials.length} sample{materials.length > 1 ? 's' : ''} detected. Review and label each one.
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Lab Information */}
        <div className="p-6 border-b border-gray-200 bg-blue-50">
          <h3 className="font-semibold text-navy-700 mb-3 flex items-center gap-2">
            <FlaskConical className="w-5 h-5" />
            Lab Report Information (Optional)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Lab Used
              </label>
              <input
                type="text"
                value={labUsed}
                onChange={(e) => setLabUsed(e.target.value)}
                placeholder="e.g., ABC Laboratory"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Lab Report No.
              </label>
              <input
                type="text"
                value={labNumber}
                onChange={(e) => setLabNumber(e.target.value)}
                placeholder="e.g., LAB-2024-001"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Lab Title
              </label>
              <input
                type="text"
                value={labTitle}
                onChange={(e) => setLabTitle(e.target.value)}
                placeholder="e.g., Soil Analysis Report"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
              />
            </div>
          </div>
          <button
            onClick={handleApplyLabInfoToAll}
            className="mt-3 text-xs text-navy-600 hover:text-navy-700 font-medium underline"
          >
            Apply lab info to all samples
          </button>
        </div>

        {/* Samples List */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="font-semibold text-navy-700 mb-4 flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Sample Names
          </h3>
          <div className="space-y-3">
            {labeledMaterials.map((material, index) => (
              <div
                key={material.id}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-navy-300 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-navy-100 rounded-full flex items-center justify-center">
                    <Hash className="w-4 h-4 text-navy-600" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Sample {index + 1} Name
                    </label>
                    <input
                      type="text"
                      value={material.name}
                      onChange={(e) => handleMaterialNameChange(index, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {Object.keys(material.parameters).length} parameters detected
                      {material.source && ` • Source: ${material.source}`}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-between gap-3">
          <button onClick={onCancel} className="btn btn-secondary px-6 py-2">
            Cancel
          </button>
          <button onClick={handleConfirm} className="btn btn-primary px-6 py-2">
            Confirm & Add Samples
          </button>
        </div>
      </div>
    </div>
  );
}
