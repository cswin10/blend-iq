import {
  Material,
  OptimizationConfig,
  OptimizationResult,
  ParameterResidual,
  ComplianceSummary,
  TonnageBreakdown,
  SoilTexture,
} from '../types';
import {
  BS3882_LIMITS,
  pH_DEPENDENT_LIMITS,
  ZERO_SEEKING_PARAMETERS,
  SOIL_TEXTURE_ACCEPTABLE_RANGE,
} from '../constants';

/**
 * Main optimization function
 * Calls the API endpoint to run Python SciPy optimization
 */
export async function optimizeBlend(
  materials: Material[],
  config: OptimizationConfig
): Promise<OptimizationResult> {
  try {
    const response = await fetch('/api/optimize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        materials,
        config,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Optimization failed');
    }

    const result: OptimizationResult = await response.json();
    return result;
  } catch (error) {
    console.error('Optimization error:', error);
    throw error;
  }
}

/**
 * Calculate blend parameters based on ratios
 */
export function calculateBlendParameters(
  materials: Material[],
  ratios: Record<string, number>
): Record<string, number> {
  const blendParams: Record<string, number> = {};

  // Get all unique parameter names
  const allParamNames = new Set<string>();
  materials.forEach((mat) => {
    Object.keys(mat.parameters).forEach((param) => allParamNames.add(param));
  });

  // Calculate weighted average for each parameter
  allParamNames.forEach((paramName) => {
    let weightedSum = 0;
    let totalWeight = 0;

    materials.forEach((mat) => {
      const ratio = ratios[mat.id] || 0;
      const paramValue = mat.parameters[paramName]?.value;

      if (paramValue !== null && paramValue !== undefined && ratio > 0) {
        weightedSum += paramValue * ratio;
        totalWeight += ratio;
      }
    });

    if (totalWeight > 0) {
      blendParams[paramName] = weightedSum / totalWeight;
    }
  });

  return blendParams;
}

/**
 * Calculate residuals for all parameters
 */
export function calculateResiduals(
  blendParams: Record<string, number>,
  config: OptimizationConfig,
  materials: Material[]
): ParameterResidual[] {
  const residuals: ParameterResidual[] = [];
  const blendPH = blendParams['pH'] || 7;

  config.selectedParameters.forEach((paramName) => {
    const value = blendParams[paramName];
    if (value === null || value === undefined) return;

    const limits = getParameterLimits(paramName, blendPH, config);
    const target = calculateTarget(paramName, limits);

    const residual = calculateResidualValue(value, target, limits);
    const residualPercent = Math.abs((residual / (target || 1)) * 100);

    const status = determineStatus(residualPercent, config.tolerance);

    // Find parameter category
    const param = materials[0]?.parameters[paramName];
    const category = getCategoryForParameter(paramName);

    residuals.push({
      parameter: paramName,
      category,
      value,
      lowerLimit: limits.lower,
      upperLimit: limits.upper,
      target,
      residual,
      residualPercent,
      status,
      unit: param?.unit || '',
    });
  });

  return residuals.sort((a, b) => Math.abs(b.residual) - Math.abs(a.residual));
}

function getParameterLimits(
  paramName: string,
  pH: number,
  config: OptimizationConfig
): { lower?: number; upper?: number } {
  // Check custom limits first
  if (config.customLimits[paramName]) {
    return config.customLimits[paramName];
  }

  // Check pH-dependent limits
  if (pH_DEPENDENT_LIMITS[paramName as keyof typeof pH_DEPENDENT_LIMITS]) {
    const pHLimits = pH_DEPENDENT_LIMITS[paramName as keyof typeof pH_DEPENDENT_LIMITS];
    return pH > 6.5 ? pHLimits.high_pH : pHLimits.low_pH;
  }

  // Default to BS3882 limits
  return BS3882_LIMITS[paramName] || {};
}

function calculateTarget(
  paramName: string,
  limits: { lower?: number; upper?: number }
): number {
  // Zero-seeking for contaminants
  if (ZERO_SEEKING_PARAMETERS.includes(paramName)) {
    return limits.lower || 0;
  }

  // Mid-point for parameters with both limits
  if (limits.lower !== undefined && limits.upper !== undefined) {
    return (limits.lower + limits.upper) / 2;
  }

  // Use the single limit if only one exists
  if (limits.lower !== undefined) return limits.lower;
  if (limits.upper !== undefined) return limits.upper;

  return 0;
}

function calculateResidualValue(
  value: number,
  target: number,
  limits: { lower?: number; upper?: number }
): number {
  // If value is within limits, residual is 0
  if (limits.lower !== undefined && value < limits.lower) {
    return value - limits.lower;
  }
  if (limits.upper !== undefined && value > limits.upper) {
    return value - limits.upper;
  }

  // Otherwise, calculate distance from target
  return value - target;
}

function determineStatus(
  residualPercent: number,
  tolerance: number
): 'compliant' | 'marginal' | 'exceeding' {
  if (residualPercent <= tolerance) return 'compliant';
  if (residualPercent <= tolerance * 1.5) return 'marginal';
  return 'exceeding';
}

function getCategoryForParameter(paramName: string): any {
  // This should reference ALL_PARAMETERS from constants
  const textureParams = ['Clay', 'Silt', 'Sand'];
  const physicalParams = ['pH', 'Stone Content (>2mm)', 'Bulk Density', 'Moisture Content'];
  const chemicalParams = ['Organic Matter', 'Electrical Conductivity', 'Carbonate Content'];
  const nutrientParams = ['Nitrogen (Total)', 'Phosphorus (Available)', 'Potassium (Available)'];

  if (textureParams.includes(paramName)) return 'Texture';
  if (physicalParams.includes(paramName)) return 'Physical';
  if (chemicalParams.includes(paramName)) return 'Chemical';
  if (nutrientParams.includes(paramName)) return 'Nutrients';
  return 'Contaminants';
}

/**
 * Calculate compliance summary
 */
export function calculateComplianceSummary(
  residuals: ParameterResidual[]
): ComplianceSummary {
  const compliant = residuals.filter((r) => r.status === 'compliant').length;
  const marginal = residuals.filter((r) => r.status === 'marginal').length;
  const exceeding = residuals.filter((r) => r.status === 'exceeding').length;

  const meanResidual =
    residuals.reduce((sum, r) => sum + Math.abs(r.residualPercent), 0) / residuals.length;

  const highestResidual = Math.max(...residuals.map((r) => Math.abs(r.residualPercent)));
  const lowestResidual = Math.min(...residuals.map((r) => Math.abs(r.residualPercent)));

  return {
    totalParameters: residuals.length,
    compliant,
    marginal,
    exceeding,
    meanResidual,
    highestResidual,
    lowestResidual,
  };
}

/**
 * Calculate tonnage breakdown
 */
export function calculateTonnageBreakdown(
  materials: Material[],
  ratios: Record<string, number>
): TonnageBreakdown[] {
  return materials.map((mat) => {
    const percentage = (ratios[mat.id] || 0) * 100;
    const used = (mat.availableTonnage * percentage) / 100;
    const remaining = mat.availableTonnage - used;

    return {
      materialName: mat.name,
      materialId: mat.id,
      available: mat.availableTonnage,
      used,
      remaining,
      percentage,
    };
  });
}

/**
 * Calculate soil texture
 */
export function calculateSoilTexture(blendParams: Record<string, number>): SoilTexture | undefined {
  const clay = blendParams['Clay'];
  const silt = blendParams['Silt'];
  const sand = blendParams['Sand'];

  if (clay === undefined || silt === undefined || sand === undefined) {
    return undefined;
  }

  // Normalize to 100%
  const total = clay + silt + sand;
  const normalizedClay = (clay / total) * 100;
  const normalizedSilt = (silt / total) * 100;
  const normalizedSand = (sand / total) * 100;

  const withinRange =
    normalizedClay >= SOIL_TEXTURE_ACCEPTABLE_RANGE.clay.min &&
    normalizedClay <= SOIL_TEXTURE_ACCEPTABLE_RANGE.clay.max &&
    normalizedSilt >= SOIL_TEXTURE_ACCEPTABLE_RANGE.silt.min &&
    normalizedSilt <= SOIL_TEXTURE_ACCEPTABLE_RANGE.silt.max &&
    normalizedSand >= SOIL_TEXTURE_ACCEPTABLE_RANGE.sand.min &&
    normalizedSand <= SOIL_TEXTURE_ACCEPTABLE_RANGE.sand.max;

  return {
    clay: normalizedClay,
    silt: normalizedSilt,
    sand: normalizedSand,
    withinAcceptableRange: withinRange,
  };
}

/**
 * Validate materials have sufficient data
 */
export function validateMaterials(materials: Material[]): string[] {
  const warnings: string[] = [];

  if (materials.length < 2) {
    warnings.push('At least 2 materials are required for blending');
  }

  materials.forEach((mat) => {
    if (mat.availableTonnage <= 0) {
      warnings.push(`${mat.name}: Available tonnage must be greater than 0`);
    }

    const paramCount = Object.keys(mat.parameters).filter(
      (key) => mat.parameters[key].value !== null
    ).length;

    if (paramCount === 0) {
      warnings.push(`${mat.name}: No valid parameters detected`);
    }
  });

  return warnings;
}

/**
 * Check if blend meets all constraints
 */
export function checkConstraints(
  ratios: Record<string, number>,
  config: OptimizationConfig
): boolean {
  for (const constraint of config.materialConstraints) {
    const ratio = ratios[constraint.materialId] || 0;

    if (constraint.minPercentage && ratio * 100 < constraint.minPercentage) {
      return false;
    }

    if (constraint.maxPercentage && ratio * 100 > constraint.maxPercentage) {
      return false;
    }
  }

  return true;
}
