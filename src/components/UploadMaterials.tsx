import React, { useState } from 'react';
import { Upload, FileText, Trash2, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { Material } from '../types';
import { parseCSV, countDetectedParameters } from '../utils/csvParser';
import { ALL_PARAMETERS } from '../constants';

interface UploadMaterialsProps {
  materials: Material[];
  onMaterialsChange: (materials: Material[]) => void;
  onNext: () => void;
}

export default function UploadMaterials({
  materials,
  onMaterialsChange,
  onNext,
}: UploadMaterialsProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      const newMaterials: Material[] = [];

      for (const file of Array.from(files)) {
        if (file.type === 'application/pdf') {
          // Parse PDF using OpenAI GPT-4o API
          const pdfMaterial = await parsePDF(file);
          newMaterials.push(pdfMaterial);
        } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
          // Parse CSV
          const csvMaterials = await parseCSV(file);
          newMaterials.push(...csvMaterials);
        } else {
          console.warn(`Unsupported file type: ${file.type}`);
        }
      }

      onMaterialsChange([...materials, ...newMaterials]);
    } catch (err: any) {
      setError(err.message || 'Failed to parse files');
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
      // Reset input
      event.target.value = '';
    }
  };

  const parsePDF = async (file: File): Promise<Material> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const base64 = e.target?.result as string;
          const pdfBase64 = base64.split(',')[1]; // Remove data:application/pdf;base64,

          const response = await fetch('/api/parse-pdf', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              pdfBase64,
              filename: file.name,
            }),
          });

          if (!response.ok) {
            throw new Error('PDF parsing failed');
          }

          const data = await response.json();

          if (!data.success) {
            throw new Error(data.message || 'Failed to parse PDF');
          }

          resolve(data.material);
        } catch (error: any) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read PDF file'));
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveMaterial = (materialId: string) => {
    onMaterialsChange(materials.filter((m) => m.id !== materialId));
  };

  const handleTonnageChange = (materialId: string, tonnage: number) => {
    onMaterialsChange(
      materials.map((m) => (m.id === materialId ? { ...m, availableTonnage: tonnage } : m))
    );
  };

  const canProceed = materials.length >= 2 && materials.every((m) => m.availableTonnage > 0);
  const detectedParams = materials.length > 0 ? countDetectedParameters(materials) : 0;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy-700 mb-2">Upload Materials</h1>
        <p className="text-gray-600">
          Upload PDFs or CSVs of laboratory reports to begin optimising your soil blend.
        </p>
      </div>

      {/* Upload Area */}
      <div className="card mb-6">
        <label
          className={`
            flex flex-col items-center justify-center w-full h-48
            border-2 border-dashed rounded-lg cursor-pointer
            transition-colors duration-200
            ${isUploading ? 'border-gray-300 bg-gray-50' : 'border-navy-300 bg-navy-50 hover:bg-navy-100'}
          `}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {isUploading ? (
              <>
                <Loader className="w-12 h-12 mb-3 text-navy-500 animate-spin" />
                <p className="text-sm text-navy-600 font-medium">Processing files...</p>
              </>
            ) : (
              <>
                <Upload className="w-12 h-12 mb-3 text-navy-500" />
                <p className="mb-2 text-sm text-navy-600">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">PDF or CSV files (multiple files supported)</p>
              </>
            )}
          </div>
          <input
            type="file"
            className="hidden"
            multiple
            accept=".pdf,.csv"
            onChange={handleFileUpload}
            disabled={isUploading}
          />
        </label>

        <div className="mt-4 flex justify-between items-center">
          <button
            onClick={() => setShowManualEntry(!showManualEntry)}
            className="text-sm text-navy-600 hover:text-navy-700 font-medium"
          >
            + Manual Entry
          </button>

          {materials.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span>
                Loaded {materials.length} material{materials.length > 1 ? 's' : ''} with{' '}
                {detectedParams} of {ALL_PARAMETERS.length} parameters detected
              </span>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Upload Error</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Materials List */}
      {materials.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-semibold text-navy-700 mb-4">Materials ({materials.length})</h2>

          <div className="space-y-4">
            {materials.map((material) => (
              <div
                key={material.id}
                className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <FileText className="w-6 h-6 text-navy-500 flex-shrink-0 mt-1" />

                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{material.name}</h3>
                  <p className="text-sm text-gray-600">
                    {Object.keys(material.parameters).length} parameters detected
                  </p>
                  {material.source && (
                    <p className="text-xs text-gray-500 mt-1">Source: {material.source}</p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Available Tonnage
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={material.availableTonnage || ''}
                      onChange={(e) =>
                        handleTonnageChange(material.id, parseFloat(e.target.value) || 0)
                      }
                      className="w-32 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                      placeholder="0.0"
                    />
                  </div>

                  <button
                    onClick={() => handleRemoveMaterial(material.id)}
                    className="text-red-600 hover:text-red-700 p-2"
                    title="Remove material"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={onNext}
          disabled={!canProceed}
          className={`
            btn btn-primary px-8 py-3 text-lg
            ${!canProceed ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          Continue to Configuration →
        </button>
      </div>

      {!canProceed && materials.length > 0 && (
        <p className="text-sm text-amber-600 text-right mt-2">
          Please enter available tonnage for all materials to continue
        </p>
      )}
    </div>
  );
}
