import type { VercelRequest, VercelResponse } from '@vercel/node';

interface Material {
  id: string;
  name: string;
  availableTonnage?: number;
  parameters: {
    [key: string]: {
      value?: number;
    };
  };
}

interface Config {
  selectedParameters: string[];
  tolerance?: number;
  autoRelax?: boolean;
  materialConstraints?: Array<{
    materialId: string;
    minPercentage?: number;
    maxPercentage?: number;
  }>;
  customLimits?: {
    [key: string]: {
      lower?: number;
      upper?: number;
    };
  };
}

interface OptimizationResult {
  success: boolean;
  blendRatios: { [key: string]: number };
  tonnageBreakdown: Array<{
    materialName: string;
    materialId: string;
    available: number;
    used: number;
    remaining: number;
    percentage: number;
  }>;
  compliance: {
    totalParameters: number;
    compliant: number;
    marginal: number;
    exceeding: number;
    meanResidual: number;
    highestResidual: number;
    lowestResidual: number;
  };
  residuals: Array<{
    parameter: string;
    value: number;
    lowerLimit?: number;
    upperLimit?: number;
    target: number;
    residual: number;
    residualPercent: number;
    status: string;
  }>;
  soilTexture?: {
    clay: number;
    silt: number;
    sand: number;
    withinAcceptableRange: boolean;
  };
  warnings: string[];
  optimizationDetails: {
    iterations: number;
    convergence: boolean;
    relaxedTolerance?: number;
    method: string;
  };
}

const BS3882_LIMITS: { [key: string]: { lower?: number; upper?: number } } = {
  'pH': { lower: 5.5, upper: 8.5 },
  'Stone Content (>2mm)': { upper: 8 },
  'Organic Matter': { lower: 3.5, upper: 10 },
  'Clay': { lower: 8, upper: 35 },
  'Silt': { lower: 15, upper: 60 },
  'Sand': { lower: 30, upper: 60 },
  'Arsenic': { upper: 20 },
  'Cadmium': { upper: 3 },
  'Chromium (Total)': { upper: 100 },
  'Copper': { upper: 200 },
  'Lead': { upper: 450 },
  'Mercury': { upper: 1 },
  'Nickel': { upper: 75 },
  'Zinc': { upper: 300 },
};

const ZERO_SEEKING = [
  'Arsenic', 'Cadmium', 'Chromium (Total)', 'Chromium (VI)',
  'Lead', 'Mercury', 'Selenium', 'Molybdenum',
  'Cyanide (Free)', 'Cyanide (Total)', 'TPH (Total Petroleum Hydrocarbons)',
  'PAH (Total)', 'PCBs (Total)', 'Asbestos'
];

const PARAMETER_CATEGORIES: { [key: string]: string } = {
  // Heavy Metals
  'Arsenic': 'Heavy Metals',
  'Cadmium': 'Heavy Metals',
  'Chromium (Total)': 'Heavy Metals',
  'Chromium (VI)': 'Heavy Metals',
  'Copper': 'Heavy Metals',
  'Lead': 'Heavy Metals',
  'Mercury': 'Heavy Metals',
  'Nickel': 'Heavy Metals',
  'Selenium': 'Heavy Metals',
  'Zinc': 'Heavy Metals',
  'Antimony': 'Heavy Metals',
  'Molybdenum': 'Heavy Metals',

  // Soil Texture
  'Clay': 'Soil Texture',
  'Silt': 'Soil Texture',
  'Sand': 'Soil Texture',

  // Physical Properties
  'pH': 'Physical Properties',
  'Organic Matter': 'Physical Properties',
  'Stone Content (>2mm)': 'Physical Properties',
  'Stone Content (2-6mm)': 'Physical Properties',
  'Stone Content (6-20mm)': 'Physical Properties',
  'Moisture Content': 'Physical Properties',
  'Electrical Conductivity': 'Physical Properties',
  'Carbonate': 'Physical Properties',

  // Nutrients
  'Total Nitrogen': 'Nutrients',
  'Phosphorus': 'Nutrients',
  'Phosphorus (P2O5)': 'Nutrients',
  'Potassium': 'Nutrients',
  'Potassium (K2O)': 'Nutrients',
  'Magnesium': 'Nutrients',
  'C:N Ratio': 'Nutrients',
  'Boron (Water Soluble)': 'Nutrients',

  // Contaminants
  'Cyanide (Free)': 'Contaminants',
  'Cyanide (Total)': 'Contaminants',
  'TPH (Total Petroleum Hydrocarbons)': 'Contaminants',
  'PAH (Total)': 'Contaminants',
  'PCBs (Total)': 'Contaminants',
  'Asbestos': 'Contaminants',
};

function getParameterCategory(paramName: string): string {
  return PARAMETER_CATEGORIES[paramName] || 'Other';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed. Use POST.',
    });
  }

  try {
    const { materials, config } = req.body as { materials?: Material[]; config?: Config };

    if (!materials || !config) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: materials and config are required',
      });
    }

    if (materials.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least 2 materials are required for blending',
      });
    }

    const result = optimizeBlend(materials, config);
    return res.status(200).json(result);

  } catch (error: any) {
    console.error('Optimization error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'An unexpected error occurred during optimization',
      type: error.name,
    });
  }
}

function optimizeBlend(materials: Material[], config: Config): OptimizationResult {
  const nMaterials = materials.length;

  // Extract material parameters
  const materialParams = extractMaterialParameters(materials, config);

  // Get targets and limits
  const { targets, limits } = getTargetsAndLimits(materialParams, config);

  // Run optimization
  const tolerance = (config.tolerance || 30) / 100;
  const autoRelax = config.autoRelax !== false;

  let result = runOptimization(materials, materialParams, targets, limits, config, tolerance);
  let relaxedTolerance: number | undefined = undefined;

  // Auto-relax if needed
  if (!result.success && autoRelax) {
    for (const newTolerance of [0.4, 0.5, 0.6, 0.8, 1.0]) {
      result = runOptimization(materials, materialParams, targets, limits, config, newTolerance);
      if (result.success) {
        relaxedTolerance = newTolerance * 100;
        break;
      }
    }
  }

  // Normalize ratios
  const sum = result.ratios.reduce((a, b) => a + b, 0);
  const ratios = result.ratios.map(r => r / sum);

  // Calculate blend parameters
  const blendParams = calculateBlendParameters(ratios, materialParams);

  // Calculate residuals
  const residuals = calculateResiduals(blendParams, targets, limits, config);

  // Build result
  return buildResult({
    success: result.success,
    ratios,
    materials,
    residuals,
    blendParams,
    iterations: result.iterations,
    convergence: result.success,
    relaxedTolerance,
    config,
  });
}

function extractMaterialParameters(materials: Material[], config: Config): { [key: string]: (number | null)[] } {
  const selectedParams = config.selectedParameters || [];
  const materialParams: { [key: string]: (number | null)[] } = {};

  for (const paramName of selectedParams) {
    const values: (number | null)[] = [];
    for (const material of materials) {
      const paramData = material.parameters?.[paramName];
      const value = paramData?.value;
      values.push(value !== undefined ? value : null);
    }
    materialParams[paramName] = values;
  }

  return materialParams;
}

function getTargetsAndLimits(
  materialParams: { [key: string]: (number | null)[] },
  config: Config
): { targets: { [key: string]: number }; limits: { [key: string]: { lower?: number; upper?: number } } } {
  const targets: { [key: string]: number } = {};
  const limits: { [key: string]: { lower?: number; upper?: number } } = {};

  for (const paramName of Object.keys(materialParams)) {
    const customLimits = config.customLimits?.[paramName] || {};
    const defaultLimits = BS3882_LIMITS[paramName] || {};

    const paramLimits = {
      lower: customLimits.lower !== undefined ? customLimits.lower : defaultLimits.lower,
      upper: customLimits.upper !== undefined ? customLimits.upper : defaultLimits.upper,
    };

    limits[paramName] = paramLimits;

    // Set target
    if (ZERO_SEEKING.includes(paramName)) {
      targets[paramName] = paramLimits.lower || 0;
    } else if (paramLimits.lower !== undefined && paramLimits.upper !== undefined) {
      targets[paramName] = (paramLimits.lower + paramLimits.upper) / 2;
    } else if (paramLimits.lower !== undefined) {
      targets[paramName] = paramLimits.lower;
    } else if (paramLimits.upper !== undefined) {
      targets[paramName] = paramLimits.upper;
    } else {
      targets[paramName] = 0;
    }
  }

  return { targets, limits };
}

function runOptimization(
  materials: Material[],
  materialParams: { [key: string]: (number | null)[] },
  targets: { [key: string]: number },
  limits: { [key: string]: { lower?: number; upper?: number } },
  config: Config,
  tolerance: number
): { ratios: number[]; success: boolean; iterations: number } {
  const nMaterials = materials.length;

  // Initial guess: equal distribution
  let ratios = new Array(nMaterials).fill(1 / nMaterials);

  // Setup constraints
  const materialConstraints = config.materialConstraints || [];
  const constraintMap = new Map<string, { min?: number; max?: number }>();

  for (const constraint of materialConstraints) {
    constraintMap.set(constraint.materialId, {
      min: constraint.minPercentage !== undefined ? constraint.minPercentage / 100 : undefined,
      max: constraint.maxPercentage !== undefined ? constraint.maxPercentage / 100 : undefined,
    });
  }

  // Gradient descent with constraints
  const maxIterations = 1000;
  const learningRate = 0.01;
  let prevObjective = Infinity;
  let convergenceCount = 0;

  for (let iter = 0; iter < maxIterations; iter++) {
    // Calculate objective and gradient
    const objective = calculateObjective(ratios, materialParams, targets, limits, tolerance);
    const gradient = calculateGradient(ratios, materialParams, targets, limits, tolerance);

    // Update ratios with gradient descent
    const newRatios = ratios.map((r, i) => r - learningRate * gradient[i]);

    // Project onto constraints
    ratios = projectOntoConstraints(newRatios, materials, constraintMap);

    // Check convergence
    if (Math.abs(prevObjective - objective) < 1e-9) {
      convergenceCount++;
      if (convergenceCount > 10) {
        return { ratios, success: objective < tolerance * 10, iterations: iter };
      }
    } else {
      convergenceCount = 0;
    }

    prevObjective = objective;
  }

  const finalObjective = calculateObjective(ratios, materialParams, targets, limits, tolerance);
  return { ratios, success: finalObjective < tolerance * 10, iterations: maxIterations };
}

function calculateObjective(
  ratios: number[],
  materialParams: { [key: string]: (number | null)[] },
  targets: { [key: string]: number },
  limits: { [key: string]: { lower?: number; upper?: number } },
  tolerance: number
): number {
  const blendParams = calculateBlendParameters(ratios, materialParams);
  let totalError = 0;

  for (const [paramName, targetValue] of Object.entries(targets)) {
    const blendValue = blendParams[paramName];

    if (blendValue === undefined || isNaN(blendValue)) {
      continue;
    }

    const paramLimits = limits[paramName] || {};

    // Apply tolerance to make limits STRICTER (narrower range for safety margin)
    let lower = paramLimits.lower;
    let upper = paramLimits.upper;

    if (lower !== undefined && upper !== undefined) {
      // Both limits exist - shrink range from both ends
      const range = upper - lower;
      lower = lower + (range * tolerance); // Move lower limit UP
      upper = upper - (range * tolerance); // Move upper limit DOWN
    } else if (upper !== undefined) {
      // Only upper limit (contaminants) - reduce it
      upper = upper * (1 - tolerance);
    } else if (lower !== undefined) {
      // Only lower limit - increase it
      lower = lower * (1 + tolerance);
    }

    let safeDivisor: number;
    let residual: number;

    if (lower !== undefined && blendValue < lower) {
      safeDivisor = Math.abs(lower) > 1e-10 ? Math.abs(lower) : 1.0;
      residual = (lower - blendValue) / safeDivisor;
    } else if (upper !== undefined && blendValue > upper) {
      safeDivisor = Math.abs(upper) > 1e-10 ? Math.abs(upper) : 1.0;
      residual = (blendValue - upper) / safeDivisor;
    } else {
      // Within acceptable range
      // For parameters with upper limit only (heavy metals), use upper limit as divisor
      if (upper !== undefined && lower === undefined && Math.abs(targetValue) < 1e-10) {
        safeDivisor = Math.abs(upper);
      } else if (lower !== undefined && upper !== undefined) {
        // For range parameters, use range width
        safeDivisor = Math.abs(upper - lower);
      } else {
        safeDivisor = Math.abs(targetValue) > 1e-10 ? Math.abs(targetValue) : 1.0;
      }
      residual = (blendValue - targetValue) / safeDivisor;
    }

    if (Math.abs(residual) > tolerance) {
      totalError += (residual ** 2) * 10;
    } else {
      totalError += residual ** 2;
    }
  }

  return totalError;
}

function calculateGradient(
  ratios: number[],
  materialParams: { [key: string]: (number | null)[] },
  targets: { [key: string]: number },
  limits: { [key: string]: { lower?: number; upper?: number } },
  tolerance: number
): number[] {
  const epsilon = 1e-6;
  const gradient: number[] = [];

  const baseObjective = calculateObjective(ratios, materialParams, targets, limits, tolerance);

  for (let i = 0; i < ratios.length; i++) {
    const ratiosCopy = [...ratios];
    ratiosCopy[i] += epsilon;
    const newObjective = calculateObjective(ratiosCopy, materialParams, targets, limits, tolerance);
    gradient.push((newObjective - baseObjective) / epsilon);
  }

  return gradient;
}

function projectOntoConstraints(
  ratios: number[],
  materials: Material[],
  constraintMap: Map<string, { min?: number; max?: number }>
): number[] {
  // Enforce bounds [0, 1]
  ratios = ratios.map(r => Math.max(0, Math.min(1, r)));

  // Enforce material-specific constraints
  for (let i = 0; i < materials.length; i++) {
    const constraint = constraintMap.get(materials[i].id);
    if (constraint) {
      if (constraint.min !== undefined) {
        ratios[i] = Math.max(ratios[i], constraint.min);
      }
      if (constraint.max !== undefined) {
        ratios[i] = Math.min(ratios[i], constraint.max);
      }
    }
  }

  // Project onto sum = 1 constraint
  const sum = ratios.reduce((a, b) => a + b, 0);
  if (sum > 1e-10) {
    ratios = ratios.map(r => r / sum);
  } else {
    // If all ratios are zero, reset to equal distribution
    ratios = new Array(ratios.length).fill(1 / ratios.length);
  }

  return ratios;
}

function calculateBlendParameters(
  ratios: number[],
  materialParams: { [key: string]: (number | null)[] }
): { [key: string]: number } {
  const blendParams: { [key: string]: number } = {};

  for (const [paramName, values] of Object.entries(materialParams)) {
    let totalWeight = 0;
    let weightedSum = 0;

    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      if (value !== null && !isNaN(value)) {
        weightedSum += ratios[i] * value;
        totalWeight += ratios[i];
      }
    }

    if (totalWeight > 0) {
      blendParams[paramName] = weightedSum / totalWeight;
    }
  }

  return blendParams;
}

function calculateResiduals(
  blendParams: { [key: string]: number },
  targets: { [key: string]: number },
  limits: { [key: string]: { lower?: number; upper?: number } },
  config: Config
): Array<{
  parameter: string;
  value: number;
  lowerLimit?: number;
  upperLimit?: number;
  target: number;
  residual: number;
  residualPercent: number;
  status: string;
}> {
  const residuals: Array<any> = [];
  const tolerancePct = config.tolerance || 30;
  const tolerance = tolerancePct / 100;

  for (const [paramName, blendValue] of Object.entries(blendParams)) {
    const target = targets[paramName] || 0;
    const paramLimits = limits[paramName] || {};

    // Apply tolerance to make limits STRICTER (narrower range for safety margin)
    let lower = paramLimits.lower;
    let upper = paramLimits.upper;
    const originalLower = lower;
    const originalUpper = upper;

    if (lower !== undefined && upper !== undefined) {
      // Both limits exist - shrink range from both ends
      const range = upper - lower;
      lower = lower + (range * tolerance); // Move lower limit UP
      upper = upper - (range * tolerance); // Move upper limit DOWN
    } else if (upper !== undefined) {
      // Only upper limit (contaminants) - reduce it
      upper = upper * (1 - tolerance);
    } else if (lower !== undefined) {
      // Only lower limit - increase it
      lower = lower * (1 + tolerance);
    }

    let residual: number;
    let safeDivisor: number;
    let status: string;

    // Check compliance against ADJUSTED (stricter) limits
    if (lower !== undefined && blendValue < lower) {
      // Below adjusted lower limit - EXCEEDING (not safe)
      residual = blendValue - lower;
      safeDivisor = Math.abs(originalLower || lower) > 1e-10 ? Math.abs(originalLower || lower) : 1.0;

      // Check if it's between original and adjusted limit (marginal zone)
      if (originalLower !== undefined && blendValue >= originalLower) {
        status = 'marginal'; // Within legal limit but not safety margin
      } else {
        status = 'exceeding'; // Outside even the legal limit
      }
    } else if (upper !== undefined && blendValue > upper) {
      // Above adjusted upper limit - EXCEEDING (not safe)
      residual = blendValue - upper;
      safeDivisor = Math.abs(originalUpper || upper) > 1e-10 ? Math.abs(originalUpper || upper) : 1.0;

      // Check if it's between adjusted and original limit (marginal zone)
      if (originalUpper !== undefined && blendValue <= originalUpper) {
        status = 'marginal'; // Within legal limit but not safety margin
      } else {
        status = 'exceeding'; // Outside even the legal limit
      }
    } else {
      // Within adjusted limits - COMPLIANT (safe)
      residual = blendValue - target;

      // For parameters with upper limit only (heavy metals), use original upper limit as divisor
      if (originalUpper !== undefined && originalLower === undefined && Math.abs(target) < 1e-10) {
        safeDivisor = Math.abs(originalUpper);
      } else if (originalLower !== undefined && originalUpper !== undefined) {
        // For range parameters, use original range width
        safeDivisor = Math.abs(originalUpper - originalLower);
      } else {
        safeDivisor = Math.abs(target) > 1e-10 ? Math.abs(target) : 1.0;
      }

      status = 'compliant'; // Within safety margin
    }

    const residualPercent = Math.abs(residual / safeDivisor) * 100;

    residuals.push({
      parameter: paramName,
      value: blendValue,
      lowerLimit: originalLower, // Show original screening value
      upperLimit: originalUpper, // Show original screening value
      target,
      residual,
      residualPercent,
      status, // Status is based on adjusted (stricter) limits
      category: getParameterCategory(paramName),
      unit: 'mg/kg', // Default unit, could be enhanced to be parameter-specific
    });
  }

  residuals.sort((a, b) => Math.abs(b.residualPercent) - Math.abs(a.residualPercent));
  return residuals;
}

function buildResult(params: {
  success: boolean;
  ratios: number[];
  materials: Material[];
  residuals: Array<any>;
  blendParams: { [key: string]: number };
  iterations: number;
  convergence: boolean;
  relaxedTolerance?: number;
  config: Config;
}): OptimizationResult {
  const { success, ratios, materials, residuals, blendParams, iterations, convergence, relaxedTolerance, config } = params;

  const blendRatios: { [key: string]: number } = {};
  for (let i = 0; i < materials.length; i++) {
    blendRatios[materials[i].id] = ratios[i];
  }

  const tonnageBreakdown = materials.map((material, i) => {
    const ratio = ratios[i];
    const available = material.availableTonnage || 0;
    const used = available * ratio;
    const remaining = available - used;

    return {
      materialName: material.name,
      materialId: material.id,
      available,
      used,
      remaining,
      percentage: ratio * 100,
    };
  });

  const compliant = residuals.filter(r => r.status === 'compliant').length;
  const marginal = residuals.filter(r => r.status === 'marginal').length;
  const exceeding = residuals.filter(r => r.status === 'exceeding').length;

  const meanResidual = residuals.length > 0
    ? residuals.reduce((sum, r) => sum + Math.abs(r.residualPercent), 0) / residuals.length
    : 0;
  const highestResidual = residuals.length > 0
    ? Math.max(...residuals.map(r => Math.abs(r.residualPercent)))
    : 0;
  const lowestResidual = residuals.length > 0
    ? Math.min(...residuals.map(r => Math.abs(r.residualPercent)))
    : 0;

  const compliance = {
    totalParameters: residuals.length,
    compliant,
    marginal,
    exceeding,
    meanResidual,
    highestResidual,
    lowestResidual,
  };

  let soilTexture: OptimizationResult['soilTexture'] = undefined;
  if ('Clay' in blendParams && 'Silt' in blendParams && 'Sand' in blendParams) {
    const clay = blendParams.Clay || 0;
    const silt = blendParams.Silt || 0;
    const sand = blendParams.Sand || 0;
    const total = clay + silt + sand;

    if (total > 1e-10) {
      const clayPct = (clay / total) * 100;
      const siltPct = (silt / total) * 100;
      const sandPct = (sand / total) * 100;

      const withinRange = (
        clayPct >= 8 && clayPct <= 35 &&
        siltPct >= 15 && siltPct <= 60 &&
        sandPct >= 30 && sandPct <= 60
      );

      soilTexture = {
        clay: clayPct,
        silt: siltPct,
        sand: sandPct,
        withinAcceptableRange: withinRange,
      };
    }
  }

  const warnings: string[] = [];
  if (exceeding > 0) {
    warnings.push(`${exceeding} parameter(s) exceed acceptable limits`);
  }
  if (marginal > 0) {
    warnings.push(`${marginal} parameter(s) are marginal`);
  }
  if (relaxedTolerance) {
    warnings.push(`Tolerance was relaxed to ${relaxedTolerance.toFixed(0)}% to find a solution`);
  }

  const missingParams: string[] = [];
  for (const param of config.selectedParameters || []) {
    if (!(param in blendParams)) {
      missingParams.push(param);
    }
  }

  if (missingParams.length > 0) {
    const displayParams = missingParams.slice(0, 5).join(', ');
    const extra = missingParams.length > 5 ? ` and ${missingParams.length - 5} more` : '';
    warnings.push(`Missing data for: ${displayParams}${extra}`);
  }

  return {
    success,
    blendRatios,
    tonnageBreakdown,
    compliance,
    residuals,
    soilTexture,
    warnings,
    optimizationDetails: {
      iterations,
      convergence,
      relaxedTolerance,
      method: 'Gradient Descent with Constraints',
    },
  };
}
