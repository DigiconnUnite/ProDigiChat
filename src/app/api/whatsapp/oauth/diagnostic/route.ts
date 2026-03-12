/**
 * WhatsApp OAuth Diagnostic API
 * 
 * Provides diagnostic information about the OAuth configuration
 * to help troubleshoot connection issues.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET ? '***configured***' : null;
    const redirectUri = process.env.META_OAUTH_REDIRECT_URI;
    const nextPublicAppUrl = process.env.NEXT_PUBLIC_APP_URL;

    // Check if environment is configured
    const isConfigured = !!(appId && appSecret && redirectUri);

    // Get the current request URL for comparison
    const requestUrl = new URL(request.url);
    const currentOrigin = requestUrl.origin;

    // Check if redirect URI matches current origin
    const redirectUriObj = redirectUri ? new URL(redirectUri) : null;
    const redirectMatchesOrigin = redirectUriObj?.origin === currentOrigin;

    // Build diagnostic response
    const diagnostic = {
      status: isConfigured ? 'configured' : 'missing_configuration',
      environment: {
        metaAppId: appId ? `${appId.substring(0, 8)}...` : null,
        metaAppSecret: appSecret,
        metaOAuthRedirectUri: redirectUri,
        nextPublicAppUrl: nextPublicAppUrl,
      },
      currentRequest: {
        origin: currentOrigin,
        pathname: requestUrl.pathname,
      },
      validation: {
        redirectUriMatchesOrigin: redirectMatchesOrigin,
        isLocalhost: currentOrigin.includes('localhost'),
        hasProductionUrl: !!nextPublicAppUrl && !nextPublicAppUrl.includes('localhost'),
      },
      issues: [] as string[],
      recommendations: [] as string[],
    };

    // Add issues and recommendations based on validation
    if (!isConfigured) {
      diagnostic.issues.push('Missing required environment variables: META_APP_ID, META_APP_SECRET, or META_OAUTH_REDIRECT_URI');
      diagnostic.recommendations.push('Configure all required Meta OAuth environment variables');
    }

    if (!redirectMatchesOrigin && isConfigured) {
      diagnostic.issues.push(`Redirect URI origin (${redirectUriObj?.origin}) doesn't match current request origin (${currentOrigin})`);
      diagnostic.recommendations.push(`Update META_OAUTH_REDIRECT_URI to: ${currentOrigin}/api/whatsapp/oauth/callback`);
    }

    if (currentOrigin.includes('localhost') && nextPublicAppUrl && !nextPublicAppUrl.includes('localhost')) {
      diagnostic.issues.push('Running on localhost but NEXT_PUBLIC_APP_URL points to production');
      diagnostic.recommendations.push('Either update NEXT_PUBLIC_APP_URL to localhost or deploy the application');
    }

    if (!appId) {
      diagnostic.recommendations.push('Create a Meta App at https://developers.facebook.com with WhatsApp product');
    }

    if (isConfigured && redirectMatchesOrigin) {
      diagnostic.status = 'ready';
      diagnostic.recommendations.push('OAuth configuration looks correct. Try connecting your WhatsApp account.');
    }

    // Determine HTTP status
    const statusCode = isConfigured && redirectMatchesOrigin ? 200 : 400;

    return NextResponse.json(diagnostic, { status: statusCode });
  } catch (error: any) {
    console.error('OAuth diagnostic error:', error);
    return NextResponse.json(
      { error: 'Failed to run diagnostic', details: error.message },
      { status: 500 }
    );
  }
}
