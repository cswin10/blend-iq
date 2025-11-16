import React, { useState } from 'react';
import { Loader } from 'lucide-react';
import UploadMaterials from './components/UploadMaterials';
import ConfigureOptimization from './components/ConfigureOptimization';
import Results from './components/Results';
import { Material, OptimizationConfig, OptimizationResult } from './types';
import { DEFAULT_TOLERANCE } from './constants';
import { optimizeBlend } from './utils/optimization';

type Step = 'upload' | 'configure' | 'optimizing' | 'results';

function App() {
  const [step, setStep] = useState<Step>('upload');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [config, setConfig] = useState<OptimizationConfig>({
    tolerance: DEFAULT_TOLERANCE,
    autoRelax: true,
    materialConstraints: [],
    selectedParameters: [],
    customLimits: {},
  });
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOptimize = async () => {
    setStep('optimizing');
    setError(null);

    try {
      const optimizationResult = await optimizeBlend(materials, config);
      setResult(optimizationResult);
      setStep('results');
    } catch (err: any) {
      setError(err.message || 'Optimisation failed');
      setStep('configure');
    }
  };

  const handleStartNew = () => {
    setStep('upload');
    setMaterials([]);
    setConfig({
      tolerance: DEFAULT_TOLERANCE,
      autoRelax: true,
      materialConstraints: [],
      selectedParameters: [],
      customLimits: {},
    });
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-navy-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">BlendIQ</h1>
              <p className="text-navy-100 text-sm mt-1">
                Soil Blending Optimisation for UK Remediation Engineers
              </p>
            </div>
            {/* Progress Indicator */}
            <div className="flex items-center gap-3">
              <StepIndicator active={step === 'upload'} completed={['configure', 'optimizing', 'results'].includes(step)}>
                1. Upload
              </StepIndicator>
              <div className="w-8 h-0.5 bg-navy-400"></div>
              <StepIndicator active={step === 'configure'} completed={['optimizing', 'results'].includes(step)}>
                2. Configure
              </StepIndicator>
              <div className="w-8 h-0.5 bg-navy-400"></div>
              <StepIndicator active={step === 'optimizing' || step === 'results'} completed={step === 'results'}>
                3. Results
              </StepIndicator>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="max-w-4xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-medium text-red-800">Error</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        )}

        {step === 'upload' && (
          <UploadMaterials
            materials={materials}
            onMaterialsChange={setMaterials}
            onNext={() => setStep('configure')}
          />
        )}

        {step === 'configure' && (
          <ConfigureOptimization
            materials={materials}
            config={config}
            onConfigChange={setConfig}
            onBack={() => setStep('upload')}
            onOptimize={handleOptimize}
          />
        )}

        {step === 'optimizing' && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader className="w-16 h-16 text-navy-600 animate-spin mb-4" />
            <h2 className="text-2xl font-semibold text-navy-700 mb-2">
              Optimising Blend Ratios...
            </h2>
            <p className="text-gray-600">
              Running SciPy optimisation engine to find optimal mixing ratios
            </p>
          </div>
        )}

        {step === 'results' && result && (
          <Results
            result={result}
            materials={materials}
            config={config}
            onBack={() => setStep('configure')}
            onStartNew={handleStartNew}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <p>
              BlendIQ v1.0.0 | Built for BS3882:2015, S4UL, and C4UL compliance
            </p>
            <p>
              © {new Date().getFullYear()} BlendIQ. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

interface StepIndicatorProps {
  active: boolean;
  completed: boolean;
  children: React.ReactNode;
}

function StepIndicator({ active, completed, children }: StepIndicatorProps) {
  return (
    <div
      className={`
        px-4 py-2 rounded-lg text-sm font-medium transition-colors
        ${active ? 'bg-cyan-500 text-white' : completed ? 'bg-navy-400 text-white' : 'bg-navy-700 text-navy-300'}
      `}
    >
      {children}
    </div>
  );
}

export default App;
