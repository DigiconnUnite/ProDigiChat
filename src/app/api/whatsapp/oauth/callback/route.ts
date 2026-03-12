/**
 * WhatsApp OAuth Callback API
 * 
 * Handles the OAuth callback from Meta after user authorizes the app.
 * Supports both regular OAuth and Embedded Signup flows.
 * 
 * CRITICAL: For Embedded Signup, the callback includes session_info parameter
 * which must be exchanged for a System User token.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createWhatsAppOAuthService } from '@/lib/whatsapp-oauth';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { encryptWhatsAppCredential } from '@/lib/encryption';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // CRITICAL: Get ALL parameters from callback
  const code = searchParams.get('code');
  const sessionInfo = searchParams.get('session_info');  // KEY for Embedded Signup
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const isEmbedded = searchParams.get('embedded') === 'true';

  // Helper function to build error URL
  const buildErrorUrl = (message: string, needsAccount: boolean = false) => {
    const base = `/dashboard/settings?whatsapp=error&message=${encodeURIComponent(message)}`;
    const params = new URLSearchParams(base.split('?')[1] || '');
    if (isEmbedded) params.set('embedded', 'true');
    if (needsAccount) params.set('needsAccount', 'true');
    return `/dashboard/settings?${params.toString()}`;
  };

  // Handle OAuth errors from Meta
  if (error) {
    console.error('[OAuth Callback] OAuth error from Meta:', error, errorDescription);
    return NextResponse.redirect(new URL(buildErrorUrl(errorDescription || error), request.url));
  }

  // CRITICAL: Must have either code OR session_info
  if (!code && !sessionInfo) {
    return NextResponse.redirect(new URL(buildErrorUrl('Missing authorization code or session info'), request.url));
  }

  // Decode state to get organization ID
  let orgId: string;
  if (state) {
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
      orgId = stateData.orgId;
      
      // Validate state timestamp to prevent replay attacks
      const timestamp = stateData.timestamp || 0;
      const maxAge = 10 * 60 * 1000; // 10 minutes
      if (Date.now() - timestamp > maxAge) {
        throw new Error('State expired');
      }
    } catch (decodeError) {
      console.error('[OAuth Callback] Failed to decode OAuth state:', decodeError);
      return NextResponse.redirect(new URL(buildErrorUrl('Invalid OAuth state'), request.url));
    }
  } else {
    console.error('[OAuth Callback] No state parameter in OAuth callback');
    return NextResponse.redirect(new URL(buildErrorUrl('Missing OAuth state'), request.url));
  }

  try {
    const oauthService = createWhatsAppOAuthService(request.url);
    
    // CRITICAL: Handle both Embedded Signup and regular OAuth flows
    let accessToken: string;
    let wabaId: string;
    let businessAccountId: string;
    
    if (sessionInfo) {
      // ===== EMBEDDED SIGNUP FLOW =====
      console.log('[OAuth Callback] Using Embedded Signup flow with session_info');
      
      // Step 1: Exchange session_info for System User token
      // This is the KEY difference from regular OAuth!
      accessToken = await oauthService.exchangeSessionInfoForToken(sessionInfo);
      console.log('[OAuth Callback] Got System User token from session_info');
      
      // Step 2: Get long-lived token
      const longLivedToken = await oauthService.getLongLivedToken(accessToken);
      accessToken = longLivedToken;
      
      // Step 3: Find WABA ID
      wabaId = await oauthService.findWhatsAppBusinessAccount(accessToken);
      businessAccountId = wabaId; // For embedded signup, these are often the same
      
      console.log('[OAuth Callback] Found WABA:', wabaId);
    } else {
      // ===== REGULAR OAUTH FLOW =====
      console.log('[OAuth Callback] Using regular OAuth flow with code');
      
      // Step 1: Exchange code for access token
      const tokens = await oauthService.exchangeCodeForTokens(code!);
      
      // Step 2: Get long-lived token
      accessToken = await oauthService.getLongLivedToken(tokens.accessToken);
      
      // Step 3: Find WABA ID
      wabaId = await oauthService.findWhatsAppBusinessAccount(accessToken);
      businessAccountId = wabaId;
      
      console.log('[OAuth Callback] Found WABA:', wabaId);
    }

    // Get business account info
    const businessAccountInfo = await oauthService.getBusinessAccountInfo(
      accessToken,
      wabaId
    );

    // Get phone numbers
    const phoneNumbers = await oauthService.getPhoneNumbers(
      accessToken,
      wabaId
    );

    // Setup webhooks - NOTE: Webhook URL must be configured manually in Meta App Dashboard
    // We can only subscribe the app to receive webhooks here
    await oauthService.setupWebhooks(
      accessToken,
      wabaId
    );

    // Verify subscription was successful
    const isSubscribed = await oauthService.verifyAppSubscription(accessToken, wabaId);
    console.log('[OAuth Callback] App subscription verified:', isSubscribed);

    // Check if this is the first account for this org
    const existingAccounts = await prisma.whatsAppCredential.count({
      where: { organizationId: orgId }
    });
    const isFirstAccount = existingAccounts === 0;
    
    // Prepare credential data
    const credentialData = {
      organizationId: orgId,
      connectionType: sessionInfo ? 'embedded_signup' : 'oauth',
      accountName: businessAccountInfo.name || 'WhatsApp Account',
      accessToken: accessToken,
      businessAccountId: wabaId, // Use WABA ID
      businessAccountName: businessAccountInfo.name,
      messageTemplateNamespace: businessAccountInfo.messageTemplateNamespace,
      // Store additional WABA account details
      currency: businessAccountInfo.currency,
      timezoneId: businessAccountInfo.timezoneId,
      accountReviewStatus: businessAccountInfo.accountReviewStatus,
      businessType: businessAccountInfo.businessType,
      businessLocation: businessAccountInfo.businessLocation,
      // Store owner business info
      ownerBusinessId: businessAccountInfo.ownerBusinessId,
      ownerBusinessName: businessAccountInfo.ownerBusinessName,
      ownerBusinessPhone: businessAccountInfo.ownerBusinessPhone,
      ownerBusinessEmail: businessAccountInfo.ownerBusinessEmail,
      ownerBusinessAddress: businessAccountInfo.ownerBusinessAddress,
      tokenExpiresAt: new Date(Date.now() + (59 * 24 * 60 * 60 * 1000)),
      isWebhookSubscribed: isSubscribed,
      connectedAt: new Date(),
      connectedDevice: sessionInfo ? 'Embedded Signup' : 'OAuth',
      lastVerifiedAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      isDefault: isFirstAccount
    } as any;
    
    // Encrypt sensitive credential fields before storage
    const encryptedCredentialData = encryptWhatsAppCredential(credentialData);
    
    // Create new credential
    const newCredential = await prisma.whatsAppCredential.create({
      data: encryptedCredentialData
    });

    // Store phone numbers
    if (phoneNumbers.length > 0) {
      await prisma.whatsAppPhoneNumber.deleteMany({
        where: { credentialId: newCredential.id }
      });

      await prisma.whatsAppPhoneNumber.createMany({
        data: phoneNumbers.map((phone, index) => ({
          credentialId: newCredential.id,
          displayName: phone.displayName,
          phoneNumber: phone.phoneNumber,
          verifiedWaPhoneNumber: phone.phoneNumber, // Store certified phone number
          verificationStatus: phone.verificationStatus,
          codeVerificationStatus: phone.codeVerificationStatus || 'PENDING',
          qualityScore: phone.qualityScore || '',
          qualityRating: phone.qualityScore || '',
          // Store additional phone number fields
          messagingLimitTier: phone.messagingLimitTier,
          phoneNumberStatus: phone.status,
          nameStatus: phone.nameStatus,
          isDefault: index === 0,
          isVerified: phone.verificationStatus === 'VERIFIED'
        }))
      });
    }

    // Redirect to settings with success
    const successRedirectUrl = isEmbedded 
      ? '/dashboard/settings?whatsapp=connected&embedded=true'
      : '/dashboard/settings?whatsapp=connected';
    
    console.log('[OAuth Callback] Successfully connected WhatsApp account for org:', orgId);
    return NextResponse.redirect(new URL(successRedirectUrl, request.url));
    
  } catch (error: any) {
    console.error('[OAuth Callback] OAuth callback error:', error);
    
    const errorMessage = error.message || 'Failed to complete OAuth flow';
    
    // Check if error is due to missing WhatsApp Business Account
    const needsAccount = errorMessage.includes('No WhatsApp Business Account found');
    
    // Provide more helpful message for missing account
    const enhancedMessage = needsAccount
      ? 'No WhatsApp Business Account found. Please complete the Embedded Signup flow to create one, or ensure your Business Account has WhatsApp access.'
      : errorMessage;
    
    return NextResponse.redirect(new URL(buildErrorUrl(enhancedMessage, needsAccount), request.url));
  }
}
