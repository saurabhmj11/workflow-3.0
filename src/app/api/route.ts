import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    name: 'OpenWorkflow API',
    version: '0.2.0',
    health: '/api/health',
    docs: '/api/docs',
  })
}
