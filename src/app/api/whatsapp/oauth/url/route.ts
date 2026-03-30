/**
 * WhatsApp OAuth URL Generator API
 * 
 * Generates the OAuth authorization URL for the embedded signup flow.
 * This endpoint is called by the frontend when user clicks "Connect WhatsApp"
 * 
 * CRITICAL SECURITY: orgId is read from the verified JWT token only.
 * Query parameters are NOT trusted for security-sensitive operations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { createWhatsAppOAuthService } from '@/lib/whatsapp-oauth';
import { randomBytes } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // SECURITY: Read orgId from JWT token, NOT from query params
    const token = await getToken({ req: request });
    const orgId = token?.organizationId as string | undefined;
    
    const forceReauth = searchParams.get('forceReauth') === 'true';
    const embedded = searchParams.get('embedded') !== 'false'; // Default to embedded signup
    
    // Optional prefill data (these are NOT security-sensitive, just UX)
    const prefillPhone = searchParams.get('prefillPhone') || undefined;
    const prefillBusiness = searchParams.get('prefillBusiness') || undefined;

    if (!orgId) {
      return NextResponse.json(
        { error: 'Unauthorized - no organization found in token' },
        { status: 401 }
      );
    }

    // Create OAuth service with dynamic domain detection
    const oauthService = createWhatsAppOAuthService(request.url);

    // Generate state for CSRF protection
    // NOTE: orgId is NOT included in state since it will be re-verified from JWT
    // in the callback endpoint, preventing orgId forgery attacks
    const state = Buffer.from(JSON.stringify({ 
      timestamp: Date.now(),
      nonce: randomBytes(16).toString('hex')
    })).toString('base64');

    let url: string;
    
    if (embedded) {
      // Use Embedded Signup flow (RECOMMENDED)
      // This automatically handles business creation, WABA setup, phone verification
      console.log('[OAuth URL] Generating Embedded Signup URL for orgId:', orgId);
      
      const prefill = (prefillPhone || prefillBusiness) ? {
        phone_number: prefillPhone,
        business_name: prefillBusiness
      } : undefined;
      
      url = oauthService.getEmbeddedSignupUrl(state, prefill);
    } else {
      // Fallback to regular OAuth (for existing WABA)
      console.log('[OAuth URL] Generating regular OAuth URL for orgId:', orgId);
      // Use embedded signup URL for both cases as it handles both scenarios
      url = oauthService.getEmbeddedSignupUrl(state);
    }

    // Get the redirect URI for diagnostic purposes
    const config = oauthService.getConfig();
    console.log('[OAuth URL] OAuth URL generated successfully for orgId:', orgId, { 
      embedded, 
      forceReauth,
      redirectUri: config.redirectUri
    });
    
    return NextResponse.json({ 
      url,
      state,
      embedded,
      redirectUri: config.redirectUri,
      expiresIn: 600 // 10 minutes
    });
  } catch (error: any) {
    console.error('[OAuth URL] Error generating OAuth URL:', error);
    
    // Check for specific error types
    const errorMessage = error.message || 'Unknown error';
    
    if (errorMessage.includes('Missing required environment variables')) {
      return NextResponse.json(
        { error: 'WhatsApp OAuth is not configured. Please contact administrator.' },
        { status: 503 }
      );
    }

    // Check if it's a domain/redirect URI issue
    if (errorMessage.includes('redirect') || errorMessage.includes('domain')) {
      return NextResponse.json(
        { 
          error: 'OAuth redirect URI configuration issue. Please ensure your domain is registered in Meta Developer Console.',
          details: 'Go to developers.facebook.com → Your App → Settings → Basic → Add your domain to App Domains'
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate OAuth URL' },
      { status: 500 }
    );
  }
}
