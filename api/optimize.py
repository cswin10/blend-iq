from http.server import BaseHTTPRequestHandler
import json
import sys
import os
import numpy as np
from scipy.optimize import minimize, differential_evolution


class handler(BaseHTTPRequestHandler):
    """Vercel Python function handler for blend optimization"""

    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.end_headers()

    def do_POST(self):
        """Handle POST request"""
        try:
            # Read request body
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))

            materials = data.get('materials')
            config = data.get('config')

            if not materials or not config:
                self.send_error(400, 'Missing required parameters')
                return

            # Run optimization
            result = optimize_blend(materials, config)

            # Send response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode('utf-8'))

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            error_response = {
                'success': False,
                'message': str(e)
            }
            self.wfile.write(json.dumps(error_response).encode('utf-8'))


def optimize_blend(materials, config):
    """Main optimization function - same logic as optimizer.py"""
    n_materials = len(materials)

    if n_materials < 2:
        raise ValueError("At least 2 materials are required for blending")

    # Extract parameters from materials
    material_params = extract_material_parameters(materials, config)

    # Get parameter targets and limits
    targets, limits = get_targets_and_limits(material_params, config)

    # Set up optimization constraints
    constraints = setup_constraints(materials, config, n_materials)

    # Set up bounds (0 to 1 for each material ratio)
    bounds = [(0, 1) for _ in range(n_materials)]

    # Initial guess (equal distribution)
    x0 = np.ones(n_materials) / n_materials

    # Define objective function
    def objective(ratios):
        return calculate_objective(ratios, material_params, targets, limits, config)

    # Run optimization
    tolerance = config.get('tolerance', 30) / 100
    auto_relax = config.get('autoRelax', True)

    result = minimize(
        objective,
        x0,
        method='SLSQP',
        bounds=bounds,
        constraints=constraints,
        options={'maxiter': 1000, 'ftol': 1e-9}
    )

    relaxed_tolerance = None
    if not result.success and auto_relax:
        for new_tolerance in [0.4, 0.5, 0.6, 0.8, 1.0]:
            config_copy = config.copy()
            config_copy['tolerance'] = new_tolerance * 100

            def relaxed_objective(ratios):
                return calculate_objective(ratios, material_params, targets, limits, config_copy)

            result = minimize(
                relaxed_objective,
                x0,
                method='SLSQP',
                bounds=bounds,
                constraints=constraints,
                options={'maxiter': 1000, 'ftol': 1e-9}
            )

            if result.success:
                relaxed_tolerance = new_tolerance * 100
                break

    if not result.success:
        result = differential_evolution(
            objective,
            bounds,
            constraints=constraints,
            maxiter=1000,
            seed=42
        )

    # Normalize ratios
    ratios = result.x / np.sum(result.x)

    # Calculate blend parameters
    blend_params = calculate_blend_parameters(ratios, material_params)

    # Calculate residuals
    residuals = calculate_residuals(blend_params, targets, limits, config)

    # Build result
    optimization_result = build_result(
        success=result.success,
        ratios=ratios,
        materials=materials,
        residuals=residuals,
        blend_params=blend_params,
        iterations=result.nit if hasattr(result, 'nit') else 0,
        convergence=result.success,
        relaxed_tolerance=relaxed_tolerance,
        config=config
    )

    return optimization_result


def extract_material_parameters(materials, config):
    """Extract parameter values for each material"""
    selected_params = config.get('selectedParameters', [])
    material_params = {}

    for param_name in selected_params:
        values = []
        for material in materials:
            param_data = material.get('parameters', {}).get(param_name, {})
            value = param_data.get('value')
            values.append(value if value is not None else np.nan)
        material_params[param_name] = values

    return material_params


def get_targets_and_limits(material_params, config):
    """Calculate target values and limits for each parameter"""
    targets = {}
    limits = {}

    bs3882_limits = {
        'pH': {'lower': 5.5, 'upper': 8.5},
        'Stone Content (>2mm)': {'upper': 8},
        'Organic Matter': {'lower': 3.5, 'upper': 10},
        'Clay': {'lower': 8, 'upper': 35},
        'Silt': {'lower': 15, 'upper': 60},
        'Sand': {'lower': 30, 'upper': 60},
        'Arsenic': {'upper': 20},
        'Cadmium': {'upper': 3},
        'Chromium (Total)': {'upper': 100},
        'Copper': {'upper': 200},
        'Lead': {'upper': 450},
        'Mercury': {'upper': 1},
        'Nickel': {'upper': 75},
        'Zinc': {'upper': 300},
    }

    zero_seeking = [
        'Arsenic', 'Cadmium', 'Chromium (Total)', 'Chromium (VI)',
        'Lead', 'Mercury', 'Selenium', 'Molybdenum',
        'Cyanide (Free)', 'Cyanide (Total)', 'TPH (Total Petroleum Hydrocarbons)',
        'PAH (Total)', 'PCBs (Total)', 'Asbestos'
    ]

    for param_name in material_params.keys():
        custom_limits = config.get('customLimits', {}).get(param_name, {})
        default_limits = bs3882_limits.get(param_name, {})

        param_limits = {
            'lower': custom_limits.get('lower', default_limits.get('lower')),
            'upper': custom_limits.get('upper', default_limits.get('upper'))
        }

        limits[param_name] = param_limits

        if param_name in zero_seeking:
            targets[param_name] = param_limits.get('lower', 0)
        elif param_limits.get('lower') is not None and param_limits.get('upper') is not None:
            targets[param_name] = (param_limits['lower'] + param_limits['upper']) / 2
        elif param_limits.get('lower') is not None:
            targets[param_name] = param_limits['lower']
        elif param_limits.get('upper') is not None:
            targets[param_name] = param_limits['upper']
        else:
            targets[param_name] = 0

    return targets, limits


def setup_constraints(materials, config, n_materials):
    """Setup optimization constraints"""
    constraints = []

    constraints.append({
        'type': 'eq',
        'fun': lambda x: np.sum(x) - 1
    })

    for constraint in config.get('materialConstraints', []):
        material_id = constraint.get('materialId')
        min_pct = constraint.get('minPercentage')
        max_pct = constraint.get('maxPercentage')

        mat_idx = next((i for i, m in enumerate(materials) if m['id'] == material_id), None)

        if mat_idx is not None:
            if min_pct is not None:
                constraints.append({
                    'type': 'ineq',
                    'fun': lambda x, idx=mat_idx, min_val=min_pct/100: x[idx] - min_val
                })

            if max_pct is not None:
                constraints.append({
                    'type': 'ineq',
                    'fun': lambda x, idx=mat_idx, max_val=max_pct/100: max_val - x[idx]
                })

    return constraints


def calculate_objective(ratios, material_params, targets, limits, config):
    """Calculate objective function value"""
    blend_params = calculate_blend_parameters(ratios, material_params)
    tolerance = config.get('tolerance', 30) / 100
    total_error = 0

    for param_name, target_value in targets.items():
        blend_value = blend_params.get(param_name)

        if blend_value is None or np.isnan(blend_value):
            continue

        param_limits = limits.get(param_name, {})
        lower = param_limits.get('lower')
        upper = param_limits.get('upper')

        if lower is not None and blend_value < lower:
            residual = (lower - blend_value) / (target_value if target_value != 0 else 1)
        elif upper is not None and blend_value > upper:
            residual = (blend_value - upper) / (target_value if target_value != 0 else 1)
        else:
            residual = (blend_value - target_value) / (target_value if target_value != 0 else 1)

        if abs(residual) > tolerance:
            total_error += (residual ** 2) * 10
        else:
            total_error += residual ** 2

    return total_error


def calculate_blend_parameters(ratios, material_params):
    """Calculate weighted average parameters for the blend"""
    blend_params = {}

    for param_name, values in material_params.items():
        valid_mask = ~np.isnan(values)

        if not np.any(valid_mask):
            continue

        valid_ratios = ratios[valid_mask]
        valid_values = np.array(values)[valid_mask]

        if np.sum(valid_ratios) > 0:
            normalized_ratios = valid_ratios / np.sum(valid_ratios)
            blend_params[param_name] = np.sum(normalized_ratios * valid_values)

    return blend_params


def calculate_residuals(blend_params, targets, limits, config):
    """Calculate residuals for each parameter"""
    residuals = []
    tolerance = config.get('tolerance', 30)

    for param_name, blend_value in blend_params.items():
        target = targets.get(param_name, 0)
        param_limits = limits.get(param_name, {})

        lower = param_limits.get('lower')
        upper = param_limits.get('upper')

        if lower is not None and blend_value < lower:
            residual = blend_value - lower
        elif upper is not None and blend_value > upper:
            residual = blend_value - upper
        else:
            residual = blend_value - target

        residual_percent = abs(residual / (target if target != 0 else 1)) * 100

        if residual_percent <= tolerance:
            status = 'compliant'
        elif residual_percent <= tolerance * 1.5:
            status = 'marginal'
        else:
            status = 'exceeding'

        residuals.append({
            'parameter': param_name,
            'value': float(blend_value),
            'lowerLimit': lower,
            'upperLimit': upper,
            'target': float(target),
            'residual': float(residual),
            'residualPercent': float(residual_percent),
            'status': status
        })

    residuals.sort(key=lambda r: abs(r['residualPercent']), reverse=True)
    return residuals


def build_result(success, ratios, materials, residuals, blend_params, iterations, convergence, relaxed_tolerance, config):
    """Build the optimization result dictionary"""
    blend_ratios = {materials[i]['id']: float(ratios[i]) for i in range(len(materials))}

    tonnage_breakdown = []
    for i, material in enumerate(materials):
        ratio = ratios[i]
        available = material.get('availableTonnage', 0)
        used = available * ratio
        remaining = available - used

        tonnage_breakdown.append({
            'materialName': material['name'],
            'materialId': material['id'],
            'available': float(available),
            'used': float(used),
            'remaining': float(remaining),
            'percentage': float(ratio * 100)
        })

    compliant = sum(1 for r in residuals if r['status'] == 'compliant')
    marginal = sum(1 for r in residuals if r['status'] == 'marginal')
    exceeding = sum(1 for r in residuals if r['status'] == 'exceeding')

    mean_residual = np.mean([abs(r['residualPercent']) for r in residuals]) if residuals else 0
    highest_residual = max([abs(r['residualPercent']) for r in residuals]) if residuals else 0
    lowest_residual = min([abs(r['residualPercent']) for r in residuals]) if residuals else 0

    compliance = {
        'totalParameters': len(residuals),
        'compliant': compliant,
        'marginal': marginal,
        'exceeding': exceeding,
        'meanResidual': float(mean_residual),
        'highestResidual': float(highest_residual),
        'lowestResidual': float(lowest_residual)
    }

    soil_texture = None
    if 'Clay' in blend_params and 'Silt' in blend_params and 'Sand' in blend_params:
        clay = blend_params['Clay']
        silt = blend_params['Silt']
        sand = blend_params['Sand']
        total = clay + silt + sand

        if total > 0:
            clay_pct = (clay / total) * 100
            silt_pct = (silt / total) * 100
            sand_pct = (sand / total) * 100

            within_range = (
                8 <= clay_pct <= 35 and
                15 <= silt_pct <= 60 and
                30 <= sand_pct <= 60
            )

            soil_texture = {
                'clay': float(clay_pct),
                'silt': float(silt_pct),
                'sand': float(sand_pct),
                'withinAcceptableRange': within_range
            }

    warnings = []
    if exceeding > 0:
        warnings.append(f'{exceeding} parameter(s) exceed acceptable limits')
    if marginal > 0:
        warnings.append(f'{marginal} parameter(s) are marginal')
    if relaxed_tolerance:
        warnings.append(f'Tolerance was relaxed to {relaxed_tolerance:.0f}% to find a solution')

    missing_params = []
    for param in config.get('selectedParameters', []):
        if param not in blend_params:
            missing_params.append(param)

    if missing_params:
        warnings.append(f'Missing data for: {", ".join(missing_params[:5])}' +
                       (f' and {len(missing_params) - 5} more' if len(missing_params) > 5 else ''))

    return {
        'success': success,
        'blendRatios': blend_ratios,
        'tonnageBreakdown': tonnage_breakdown,
        'compliance': compliance,
        'residuals': residuals,
        'soilTexture': soil_texture,
        'warnings': warnings,
        'optimizationDetails': {
            'iterations': iterations,
            'convergence': convergence,
            'relaxedTolerance': relaxed_tolerance,
            'method': 'SLSQP'
        }
    }
