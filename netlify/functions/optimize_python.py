"""
Netlify Python Function Handler for BlendIQ Optimization
"""
import json
import sys
import os

# Add the current directory to Python path to import optimizer logic
sys.path.insert(0, os.path.dirname(__file__))

from optimizer import optimize_blend

def handler(event, context):
    """
    Netlify function handler
    """
    # CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    }

    # Handle preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': ''
        }

    if event.get('httpMethod') != 'POST':
        return {
            'statusCode': 405,
            'headers': headers,
            'body': json.dumps({'message': 'Method not allowed'})
        }

    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        materials = body.get('materials')
        config = body.get('config')

        if not materials or not config:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'message': 'Missing required parameters'})
            }

        # Run optimization
        result = optimize_blend(materials, config)

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(result)
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'success': False,
                'message': str(e)
            })
        }
