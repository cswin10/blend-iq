import { Handler } from '@netlify/functions';
import { spawn } from 'child_process';
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
    const pythonScript = path.join(process.cwd(), 'netlify', 'functions', 'optimizer.py');

    const python = spawn('python3', [pythonScript]);

    let outputData = '';
    let errorData = '';

    // Send input data to Python script
    python.stdin.write(JSON.stringify({ materials, config }));
    python.stdin.end();

    python.stdout.on('data', (data) => {
      outputData += data.toString();
    });

    python.stderr.on('data', (data) => {
      errorData += data.toString();
      console.error('Python stderr:', data.toString());
    });

    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python script exited with code ${code}: ${errorData}`));
        return;
      }

      try {
        const result = JSON.parse(outputData);
        resolve(result);
      } catch (error) {
        reject(new Error('Failed to parse Python output'));
      }
    });

    python.on('error', (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
  });
}
