import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    
    console.log('🔍 Test Auth - Token:', token)
    
    return NextResponse.json({
      success: true,
      token: {
        sub: token?.sub,
        organizationId: token?.organizationId,
        email: token?.email,
        name: token?.name,
        role: token?.role
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Test Auth Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
