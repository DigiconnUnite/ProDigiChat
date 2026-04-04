import { NextResponse } from 'next/server';
import { buildEmbeddedSignupUrl, generateState, META_CONFIG } from '@/lib/meta-oauth';

/**
 * Meta OAuth Connect API Route
 * 
 * Initiates the Meta OAuth flow for connecting to WhatsApp Business API.
 * Generates a secure state parameter for CSRF protection and returns
 * the appropriate OAuth URL based on configuration.
 * 
 * @see https://developers.facebook.com/docs/whatsapp/overview
 * @see https://developers.facebook.com/docs/facebook-login
 */

export async function GET() {
  try {
    if (!META_CONFIG.configurationId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing NEXT_PUBLIC_META_CONFIG_ID environment variable',
        },
        { status: 500 }
      );
    }

    // Generate a secure state parameter for CSRF protection
    const state = generateState();

    // Always use Embedded Signup for WhatsApp onboarding when config_id is provided.
    const authUrl = buildEmbeddedSignupUrl(state);

    // Return the OAuth configuration and URL
    return NextResponse.json({
      success: true,
      authUrl,
      state,
      config: {
        appId: META_CONFIG.appId,
        redirectUri: META_CONFIG.redirectUri,
        scopes: META_CONFIG.scopes,
      },
    });
  } catch (error) {
    // Log the error for debugging
    console.error('Meta OAuth Connect Error:', error);

    // Return a proper error response
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to build OAuth URL',
      },
      { status: 500 }
    );
  }
}
