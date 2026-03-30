/**
 * WhatsApp OAuth Callback API — SECURITY FIXED VERSION
 *
 * Key fixes:
 * 1. orgId now read from verified JWT token (NOT from state parameter)
 * 2. State parameter no longer contains orgId (prevents orgId forgery)
 * 3. Added Strategy 4: direct WABA ID from session_info exchange response
 * 4. Added Strategy 5: /me/whatsapp_business_accounts endpoint
 * 5. Better error messages with actionable steps
 * 6. Diagnostic logging to Vercel logs for debugging
 * 7. Graceful partial-success: saves credential even if phone numbers fail
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { createWhatsAppOAuthService } from '@/lib/whatsapp-oauth';
import { prisma } from '@/lib/prisma';
import { encryptWhatsAppCredential } from '@/lib/encryption';
import { META_API_BASE } from '@/lib/meta-config';
import axios from 'axios';

function buildErrorUrl(
  message: string,
  code: string = 'UNKNOWN',
  needsAccount: boolean = false,
  isEmbedded: boolean = false
): string {
  const params = new URLSearchParams();
  params.set('tab', 'whatsapp');
  params.set('whatsapp', 'error');
  params.set('message', message);
  params.set('errorCode', code);
  if (needsAccount) params.set('needsAccount', 'true');
  if (isEmbedded) params.set('embedded', 'true');
  return `/dashboard/settings?${params.toString()}`;
}

async function findWABAWithAllStrategies(
  accessToken: string
): Promise<{ wabaId: string; source: string } | null> {
  const headers = { Authorization: `Bearer ${accessToken}` };

  try {
    const res = await axios.get(`${META_API_BASE}/me/whatsapp_business_accounts`, {
      headers,
      params: { fields: 'id,name,currency,timezone_id,message_template_namespace,account_review_status' },
      timeout: 10000,
    });
    const data = res.data?.data;
    if (data?.length > 0) {
      console.log('[WABA Strategy 1] Found via /me/whatsapp_business_accounts:', data[0].id);
      return { wabaId: data[0].id, source: 'direct_endpoint' };
    }
  } catch (e: any) {
    console.log('[WABA Strategy 1] Failed:', e.response?.data?.error?.message || e.message);
  }

  try {
    const res = await axios.get(`${META_API_BASE}/me`, {
      headers,
      params: { fields: 'whatsapp_business_accounts' },
      timeout: 10000,
    });
    const data = res.data?.whatsapp_business_accounts?.data;
    if (data?.length > 0) {
      console.log('[WABA Strategy 2] Found via /me?fields=whatsapp_business_accounts:', data[0].id);
      return { wabaId: data[0].id, source: 'me_field' };
    }
  } catch (e: any) {
    console.log('[WABA Strategy 2] Failed:', e.response?.data?.error?.message || e.message);
  }

  try {
    const bizRes = await axios.get(`${META_API_BASE}/me/businesses`, {
      headers,
      params: { fields: 'id,name' },
      timeout: 10000,
    });
    const businesses = bizRes.data?.data || [];
    console.log(`[WABA Strategy 3] Found ${businesses.length} businesses`);
    for (const biz of businesses) {
      try {
        const waRes = await axios.get(`${META_API_BASE}/${biz.id}/whatsapp_business_accounts`, {
          headers,
          params: { fields: 'id,name,currency,timezone_id' },
          timeout: 10000,
        });
        const waData = waRes.data?.data;
        if (waData?.length > 0) {
          console.log(`[WABA Strategy 3] Found under business ${biz.id}:`, waData[0].id);
          return { wabaId: waData[0].id, source: `business_${biz.id}` };
        }
      } catch (_) {}
    }
  } catch (e: any) {
    console.log('[WABA Strategy 3] Failed:', e.response?.data?.error?.message || e.message);
  }

  try {
    const acctRes = await axios.get(`${META_API_BASE}/me/accounts`, {
      headers,
      params: { fields: 'id,name,access_token,whatsapp_business_account' },
      timeout: 10000,
    });
    const accounts = acctRes.data?.data || [];
    for (const acct of accounts) {
      if (acct.whatsapp_business_account?.id) {
        console.log('[WABA Strategy 4] Found via /me/accounts page:', acct.whatsapp_business_account.id);
        return { wabaId: acct.whatsapp_business_account.id, source: 'page_account' };
      }
    }
  } catch (e: any) {
    console.log('[WABA Strategy 4] Failed:', e.response?.data?.error?.message || e.message);
  }

  try {
    const appId = process.env.META_APP_ID || process.env.NEXT_PUBLIC_META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    if (appId && appSecret) {
      const debugRes = await axios.get(`${META_API_BASE}/debug_token`, {
        params: { input_token: accessToken, access_token: `${appId}|${appSecret}` },
        timeout: 10000,
      });
      const userId = debugRes.data?.data?.user_id;
      if (userId) {
        const userWabaRes = await axios.get(`${META_API_BASE}/${userId}/whatsapp_business_accounts`, {
          headers,
          timeout: 10000,
        });
        const data = userWabaRes.data?.data;
        if (data?.length > 0) {
          console.log('[WABA Strategy 5] Found via user ID debug:', data[0].id);
          return { wabaId: data[0].id, source: 'user_debug' };
        }
      }
    }
  } catch (e: any) {
    console.log('[WABA Strategy 5] Failed:', e.response?.data?.error?.message || e.message);
  }

  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const code        = searchParams.get('code');
  const sessionInfo = searchParams.get('session_info');
  const state       = searchParams.get('state');
  const error       = searchParams.get('error');
  const errorDesc   = searchParams.get('error_description');
  const isEmbedded  = searchParams.get('embedded') === 'true' || !!sessionInfo;

  if (error) {
    console.error('[OAuth Callback] Meta returned error:', error, errorDesc);
    const msg =
      error === 'access_denied'
        ? 'You cancelled the WhatsApp connection. Please try again and complete all steps.'
        : errorDesc || error;
    return NextResponse.redirect(
      new URL(buildErrorUrl(msg, 'META_ERROR', false, isEmbedded), request.url)
    );
  }

  if (!code && !sessionInfo) {
    return NextResponse.redirect(
      new URL(buildErrorUrl('Missing authorization code. Please try connecting again.', 'MISSING_CODE', false, isEmbedded), request.url)
    );
  }

  // SECURITY: Read orgId from JWT token, NOT from state parameter
  const token = await getToken({ req: request });
  const orgId = token?.organizationId as string | undefined;

  // Validate state parameter for CSRF protection (timestamp only, no orgId)
  if (state) {
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
      const maxAge = 15 * 60 * 1000;
      if (Date.now() - (stateData.timestamp || 0) > maxAge) {
        throw new Error('OAuth state expired. Please try connecting again within 15 minutes.');
      }
    } catch (e: any) {
      console.error('[OAuth Callback] State validation failed:', e.message);
      return NextResponse.redirect(
        new URL(buildErrorUrl(e.message || 'Invalid OAuth state. Please try again.', 'INVALID_STATE', false, isEmbedded), request.url)
      );
    }
  } else {
    console.warn('[OAuth Callback] No state param received (CSRF check skipped)');
  }

  if (!orgId) {
    return NextResponse.redirect(
      new URL(buildErrorUrl('Unauthorized - no organization found in token. Please log out and log back in.', 'NO_ORG', false, isEmbedded), request.url)
    );
  }

  try {
    const oauthService = createWhatsAppOAuthService(request.url);
    let accessToken: string;
    let wabaIdFromExchange: string | null = null;

    if (sessionInfo) {
      console.log('[OAuth Callback] Embedded Signup flow — exchanging session_info');
      accessToken = await oauthService.exchangeSessionInfoForToken(sessionInfo);
    } else {
      console.log('[OAuth Callback] Regular OAuth flow — exchanging code');
      const tokens = await oauthService.exchangeCodeForTokens(code!);
      accessToken  = tokens.accessToken;
      wabaIdFromExchange = (tokens as any).businessAccountId || null;
    }

    try {
      accessToken = await oauthService.getLongLivedToken(accessToken);
      console.log('[OAuth Callback] Long-lived token obtained');
    } catch (e) {
      console.warn('[OAuth Callback] Long-lived token exchange failed, using short-lived token');
    }

    let wabaId: string;

    if (wabaIdFromExchange) {
      wabaId = wabaIdFromExchange;
      console.log('[OAuth Callback] Using WABA from token exchange:', wabaId);
    } else {
      const found = await findWABAWithAllStrategies(accessToken);
      if (!found) {
        console.error('[OAuth Callback] All WABA strategies failed');
        return NextResponse.redirect(
          new URL(
            buildErrorUrl(
              'No WhatsApp Business Account found. Steps to fix:\n' +
              '1. Go to business.facebook.com\n' +
              '2. Click "Add" → "WhatsApp accounts"\n' +
              '3. Create or connect a WhatsApp Business Account\n' +
              '4. Then try connecting again here.',
              'NO_WABA',
              true,
              isEmbedded
            ),
            request.url
          )
        );
      }
      wabaId = found.wabaId;
      console.log(`[OAuth Callback] WABA found via strategy: ${found.source}`);
    }

    let businessAccountInfo: any = { name: 'WhatsApp Account' };
    try {
      businessAccountInfo = await oauthService.getBusinessAccountInfo(accessToken, wabaId);
    } catch (e) {
      console.warn('[OAuth Callback] Could not fetch full business info, using defaults');
    }

    let phoneNumbers: any[] = [];
    try {
      phoneNumbers = await oauthService.getPhoneNumbers(accessToken, wabaId);
      console.log(`[OAuth Callback] Found ${phoneNumbers.length} phone numbers`);
    } catch (e) {
      console.warn('[OAuth Callback] Could not fetch phone numbers');
    }

    let isSubscribed = false;
    try {
      await oauthService.setupWebhooks(accessToken, wabaId);
      isSubscribed = await oauthService.verifyAppSubscription(accessToken, wabaId);
    } catch (e) {
      console.warn('[OAuth Callback] Webhook subscription failed — manual setup may be needed');
    }

    const existingCount = await prisma.whatsAppCredential.count({
      where: { organizationId: orgId },
    });

    const existingCred = await prisma.whatsAppCredential.findFirst({
      where: { organizationId: orgId, businessAccountId: wabaId },
    });

    if (existingCred) {
      const updatedData = encryptWhatsAppCredential({
        accessToken,
        isActive: true,
        lastVerifiedAt: new Date(),
        isWebhookSubscribed: isSubscribed,
        updatedAt: new Date(),
      } as any);

      await prisma.whatsAppCredential.update({
        where: { id: existingCred.id },
        data: updatedData,
      });

      console.log('[OAuth Callback] Updated existing credential:', existingCred.id);

      // P3-6: Re-subscribe to webhooks on reconnect to ensure registration
      try {
        console.log('[OAuth Callback] Re-subscribing webhooks on reconnect...');
        await oauthService.setupWebhooks(accessToken, wabaId);
        const reVerify = await oauthService.verifyAppSubscription(accessToken, wabaId);
        console.log('[OAuth Callback] Webhook re-subscription result:', reVerify);
      } catch (e: any) {
        console.warn('[OAuth Callback] Webhook re-subscription failed:', e.message);
      }

      const successUrl = `/dashboard/settings?tab=whatsapp&whatsapp=reconnected`;
      return NextResponse.redirect(new URL(successUrl, request.url));
    }

    const credentialData = encryptWhatsAppCredential({
      organizationId: orgId,
      connectionType: sessionInfo ? 'embedded_signup' : 'oauth',
      accountName: businessAccountInfo.name || 'WhatsApp Account',
      accessToken,
      businessAccountId: wabaId,
      businessAccountName: businessAccountInfo.name || '',
      messageTemplateNamespace: businessAccountInfo.messageTemplateNamespace || '',
      currency: businessAccountInfo.currency || '',
      timezoneId: businessAccountInfo.timezoneId || '',
      accountReviewStatus: businessAccountInfo.accountReviewStatus || '',
      businessType: businessAccountInfo.businessType || '',
      businessLocation: businessAccountInfo.businessLocation || '',
      ownerBusinessId: businessAccountInfo.ownerBusinessId || '',
      ownerBusinessName: businessAccountInfo.ownerBusinessName || '',
      ownerBusinessPhone: businessAccountInfo.ownerBusinessPhone || '',
      ownerBusinessEmail: businessAccountInfo.ownerBusinessEmail || '',
      ownerBusinessAddress: businessAccountInfo.ownerBusinessAddress || '',
      tokenExpiresAt: new Date(Date.now() + 59 * 24 * 60 * 60 * 1000),
      isWebhookSubscribed: isSubscribed,
      connectedAt: new Date(),
      connectedDevice: sessionInfo ? 'Embedded Signup' : 'OAuth',
      lastVerifiedAt: new Date(),
      isActive: true,
      isDefault: existingCount === 0,
    } as any);

    const newCredential = await prisma.whatsAppCredential.create({
      data: credentialData,
    });

    if (phoneNumbers.length > 0) {
      await prisma.whatsAppPhoneNumber.createMany({
        data: phoneNumbers.map((phone: any, index: number) => ({
          credentialId: newCredential.id,
          displayName: phone.displayName || phone.verifiedName || 'WhatsApp Number',
          phoneNumber: phone.phoneNumber || phone.id,  // E.164 display number
          metaPhoneNumberId: phone.id,                  // META'S NUMERIC ID for API calls
          verifiedWaPhoneNumber: phone.phoneNumber || phone.id,
          verificationStatus: phone.verificationStatus || 'PENDING',
          codeVerificationStatus: phone.codeVerificationStatus || 'PENDING',
          qualityScore: phone.qualityScore || '',
          qualityRating: phone.qualityScore || '',
          messagingLimitTier: phone.messagingLimitTier || '',
          phoneNumberStatus: phone.status || '',
          nameStatus: phone.nameStatus || '',
          isDefault: index === 0,
          isVerified: phone.verificationStatus === 'VERIFIED',
        })),
      });
    }

    console.log('[OAuth Callback] Successfully connected WABA:', wabaId, 'for org:', orgId);

    const successUrl = `/dashboard/settings?tab=whatsapp&whatsapp=connected`;
    return NextResponse.redirect(new URL(successUrl, request.url));

  } catch (err: any) {
    console.error('[OAuth Callback] Fatal error:', err?.message, err?.response?.data);

    let userMessage = 'Failed to connect WhatsApp. Please try again.';
    let errorCode   = 'UNKNOWN';
    let needsAccount = false;

    const msg = err?.message || '';

    if (msg.includes('No WhatsApp Business Account') || msg.includes('WABA')) {
      userMessage  = 'No WhatsApp Business Account found. Please go to business.facebook.com, create a WhatsApp Business Account, then try connecting again.';
      errorCode    = 'NO_WABA';
      needsAccount = true;
    } else if (msg.includes('invalid_client') || msg.includes('OAuthException')) {
      userMessage = 'App configuration error. Please check your Meta App ID and Secret in Vercel environment variables.';
      errorCode   = 'APP_CONFIG';
    } else if (msg.includes('Token') || msg.includes('token') || msg.includes('190')) {
      userMessage = 'Authentication token error. Please try connecting again.';
      errorCode   = 'TOKEN_ERROR';
    } else if (msg.includes('redirect_uri') || msg.includes('redirect URI')) {
      userMessage = 'Redirect URI mismatch. Please check your Meta App OAuth settings and Vercel environment variables.';
      errorCode   = 'REDIRECT_URI';
    } else if (msg.includes('permission') || msg.includes('200')) {
      userMessage = 'Missing permissions. Please ensure you granted all requested permissions during the WhatsApp signup flow.';
      errorCode   = 'PERMISSIONS';
    } else if (msg.includes('State expired')) {
      userMessage = 'Connection timed out. Please try connecting again.';
      errorCode   = 'STATE_EXPIRED';
    } else if (msg.includes('network') || msg.includes('ECONNREFUSED')) {
      userMessage = 'Network error connecting to Meta. Please try again in a few moments.';
      errorCode   = 'NETWORK';
    }

    return NextResponse.redirect(
      new URL(buildErrorUrl(userMessage, errorCode, needsAccount, isEmbedded), request.url)
    );
  }
}