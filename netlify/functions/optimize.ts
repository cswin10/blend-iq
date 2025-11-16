import { Handler } from '@netlify/functions';
import { PythonShell } from 'python-shell';
import path from 'path';

interface OptimizationRequest {
  materials: any[];
  config: any;
}

export const handler: Handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' }),
    };
  }

  try {
    const requestBody: OptimizationRequest = JSON.parse(event.body || '{}');
    const { materials, config } = requestBody;

    if (!materials || !config) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Missing required parameters' }),
      };
    }

    // Call Python optimization script
    const result = await runPythonOptimization(materials, config);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };
  } catch (error: any) {
    console.error('Optimization error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: error.message || 'Optimization failed',
        success: false,
      }),
    };
  }
};

async function runPythonOptimization(materials: any[], config: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, 'optimizer.py');

    const options = {
      mode: 'json' as const,
      pythonPath: process.env.PYTHON_PATH || 'python3',
      pythonOptions: ['-u'],
      scriptPath: path.dirname(pythonScript),
      args: [],
    };

    const pyshell = new PythonShell('optimizer.py', options);

    // Send input data to Python
    pyshell.send(JSON.stringify({ materials, config }));

    let result: any = null;

    pyshell.on('message', (message: any) => {
      result = message;
    });

    pyshell.end((err, code, signal) => {
      if (err) {
        reject(new Error(`Python execution failed: ${err.message}`));
        return;
      }

      if (code !== 0) {
        reject(new Error(`Python script exited with code ${code}`));
        return;
      }

      if (result) {
        resolve(result);
      } else {
        reject(new Error('No result from Python script'));
      }
    });
  });
}
