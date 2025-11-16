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
    <div className="min-h-screen">
      {/* Header */}
      <header className="animated-gradient text-white shadow-2xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="slide-in">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">BlendIQ</h1>
              <p className="text-blue-100 text-xs sm:text-sm mt-1">
                Soil Blending Optimisation for UK Remediation Engineers
              </p>
            </div>
            {/* Progress Indicator - Hidden on mobile, shown on tablet+ */}
            <div className="hidden md:flex items-center gap-2 lg:gap-3">
              <StepIndicator active={step === 'upload'} completed={['configure', 'optimizing', 'results'].includes(step)}>
                1. Upload
              </StepIndicator>
              <div className="w-4 lg:w-8 h-0.5 bg-white/30"></div>
              <StepIndicator active={step === 'configure'} completed={['optimizing', 'results'].includes(step)}>
                2. Configure
              </StepIndicator>
              <div className="w-4 lg:w-8 h-0.5 bg-white/30"></div>
              <StepIndicator active={step === 'optimizing' || step === 'results'} completed={step === 'results'}>
                3. Results
              </StepIndicator>
            </div>
            {/* Mobile Progress Indicator */}
            <div className="flex md:hidden items-center gap-2 w-full">
              <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-500"
                  style={{
                    width: step === 'upload' ? '33%' : step === 'configure' ? '66%' : '100%'
                  }}
                />
              </div>
              <span className="text-xs text-white/90 font-medium whitespace-nowrap">
                {step === 'upload' ? 'Step 1/3' : step === 'configure' ? 'Step 2/3' : 'Step 3/3'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {error && (
          <div className="max-w-4xl mx-auto mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl shadow-lg slide-in">
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
          <div className="flex flex-col items-center justify-center py-12 sm:py-20 slide-in">
            <div className="relative">
              <Loader className="w-16 h-16 sm:w-20 sm:h-20 text-navy-600 animate-spin mb-4" />
              <div className="absolute inset-0 w-16 h-16 sm:w-20 sm:h-20 bg-navy-400 rounded-full animate-ping opacity-20"></div>
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold text-navy-700 mb-2 text-center px-4">
              Optimising Blend Ratios...
            </h2>
            <p className="text-sm sm:text-base text-gray-600 text-center px-4">
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
      <footer className="bg-white/80 backdrop-blur-sm border-t border-gray-200 mt-8 sm:mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-xs sm:text-sm text-gray-600">
            <p className="text-center sm:text-left">
              BlendIQ v1.0.0 | Built for BS3882:2015, S4UL, and C4UL compliance
            </p>
            <p className="text-center sm:text-right">
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
        px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300
        ${active
          ? 'bg-white text-navy-700 shadow-lg scale-110'
          : completed
          ? 'bg-white/40 text-white backdrop-blur-sm'
          : 'bg-white/20 text-white/60'
        }
      `}
    >
      {children}
    </div>
  );
}

export default App;
