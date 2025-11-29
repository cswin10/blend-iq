// Material and Parameter Types
export interface Material {
  id: string;
  name: string;
  availableTonnage: number;
  parameters: Record<string, ParameterValue>;
  source?: string;
  date?: string;
}

export interface ParameterValue {
  value: number | null;
  unit: string;
  source?: string;
  date?: string;
}

export interface Parameter {
  name: string;
  category: ParameterCategory;
  unit: string;
  lowerLimit?: number;
  upperLimit?: number;
  targetValue?: number;
  isMandatory?: boolean;
}

export type ParameterCategory =
  | 'Heavy Metal'
  | 'PAH'
  | 'TPH'
  | 'BTEX'
  | 'BS3882';

// Optimization Configuration
export interface OptimizationConfig {
  tolerance: number;
  autoRelax: boolean;
  materialConstraints: MaterialConstraint[];
  selectedParameters: string[];
  customLimits: Record<string, { lower?: number; upper?: number }>;
}

export interface MaterialConstraint {
  materialId: string;
  minPercentage?: number;
  maxPercentage?: number;
  priority: 'Low' | 'Medium' | 'High';
}

// Optimization Results
export interface OptimizationResult {
  success: boolean;
  blendRatios: Record<string, number>; // materialId -> percentage
  tonnageBreakdown: TonnageBreakdown[];
  compliance: ComplianceSummary;
  residuals: ParameterResidual[];
  soilTexture?: SoilTexture;
  warnings: string[];
  errorMessage?: string;
  optimizationDetails: OptimizationDetails;
}

export interface TonnageBreakdown {
  materialName: string;
  materialId: string;
  available: number;
  used: number;
  remaining: number;
  percentage: number;
}

export interface ComplianceSummary {
  totalParameters: number;
  compliant: number;
  marginal: number;
  exceeding: number;
  meanResidual: number;
  highestResidual: number;
  lowestResidual: number;
}

export interface ParameterResidual {
  parameter: string;
  category: ParameterCategory;
  value: number;
  lowerLimit?: number;
  upperLimit?: number;
  target: number;
  residual: number;
  residualPercent: number;
  status: 'compliant' | 'marginal' | 'exceeding';
  unit: string;
}

export interface SoilTexture {
  clay: number;
  silt: number;
  sand: number;
  withinAcceptableRange: boolean;
}

export interface OptimizationDetails {
  iterations: number;
  convergence: boolean;
  relaxedTolerance?: number;
  method: string;
}

// Upload Types
export interface UploadBatch {
  id: string;
  files: File[];
  status: 'pending' | 'processing' | 'complete' | 'error';
  materials: Material[];
  parametersDetected: number;
  errorMessage?: string;
}

// Standard Limits
export interface StandardLimits {
  BS3882: Record<string, { lower?: number; upper?: number }>;
  S4UL: Record<string, { lower?: number; upper?: number }>;
  C4UL: Record<string, { lower?: number; upper?: number }>;
}

// Export Types
export interface ExportData {
  materials: Material[];
  config: OptimizationConfig;
  result: OptimizationResult;
  exportDate: string;
  version: string;
}

// Job Management Types
export interface Job {
  id: string;
  jobTitle: string;
  jobCode: string;
  date: string;
  initials: string;
  createdAt: string;
  updatedAt: string;
  materials: Material[];
  config?: OptimizationConfig;
  result?: OptimizationResult;
}

export interface JobMetadata {
  id: string;
  jobTitle: string;
  jobCode: string;
  date: string;
  initials: string;
  createdAt: string;
  updatedAt: string;
  materialCount: number;
}
