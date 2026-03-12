import { NextRequest, NextResponse } from 'next/server';
import {
  exchangeCodeForToken,
  getLongLivedToken,
  getMetaUserInfo,
  getWABAAccounts,
  getPhoneNumbers,
  WABAAccount,
} from '@/lib/meta-oauth';

/**
 * Meta OAuth Callback API Route
 * 
 * Handles the OAuth callback from Meta after user authentication.
 * Exchanges the authorization code for access tokens, fetches user
 * information and WhatsApp Business Accounts, and returns the result
 * to the opener window.
 * 
 * @see https://developers.facebook.com/docs/whatsapp/overview
 * @see https://developers.facebook.com/docs/facebook-login
 */

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle user denial or errors
  if (error) {
    console.error('Meta OAuth Error:', error, errorDescription);
    
    return new NextResponse(
      generateErrorHTML(errorDescription || error), {
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  }

  // Check if authorization code is present
  if (!code) {
    return new NextResponse(
      generateErrorHTML('No authorization code received'), {
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  }

  try {
    // Step 1: Exchange authorization code for short-lived access token
    console.log('Step 1: Exchanging code for short-lived token...');
    const shortLivedTokenResponse = await exchangeCodeForToken(code);
    const shortLivedToken = shortLivedTokenResponse.access_token;

    // Step 2: Exchange for long-lived token
    console.log('Step 2: Exchanging for long-lived token...');
    const longLivedTokenResponse = await getLongLivedToken(shortLivedToken);
    const accessToken = longLivedTokenResponse.access_token;
    const expiresIn = longLivedTokenResponse.expires_in;

    // Step 3: Get user information
    console.log('Step 3: Fetching user information...');
    const userInfo = await getMetaUserInfo(accessToken);

    // Step 4: Get WhatsApp Business Accounts
    console.log('Step 4: Fetching WhatsApp Business Accounts...');
    const wabaAccounts = await getWABAAccounts(accessToken);

    // Step 5: Get phone numbers for each account
    console.log('Step 5: Fetching phone numbers for each account...');
    const wabaAccountsWithPhones: WABAAccount[] = [];

    for (const account of wabaAccounts) {
      try {
        console.log(`Fetching phone numbers for account: ${account.id} (${account.name})`);
        const phoneNumbersData = await getPhoneNumbers(account.id, accessToken);
        const phoneNumbers = phoneNumbersData.data || [];
        
        console.log(`Found ${phoneNumbers.length} phone numbers for account ${account.id}`);

        // Add each phone number as a separate account entry
        if (phoneNumbers.length > 0) {
          for (const phone of phoneNumbers) {
            // Use phone.id as that's the phone_number_id from Meta API
            const phoneId = phone.id || phone.phone_number_id;
            wabaAccountsWithPhones.push({
              id: account.id,
              name: account.name,
              phone_number: phone.display_phone_number,
              phone_number_id: phoneId,
              business_id: account.business_id || account.id,
              business_name: account.business_name || account.name,
              quality_rating: phone.quality_rating || 'UNKNOWN',
              messaging_limit: phone.messaging_limit_tier || '1000',
              status: phone.status || 'UNKNOWN',
            });
          }
        } else {
          // Add account without phone numbers
          wabaAccountsWithPhones.push({
            id: account.id,
            name: account.name,
            phone_number: '',
            phone_number_id: '',
            business_id: account.business_id || account.id,
            business_name: account.business_name || account.name,
            quality_rating: 'UNKNOWN',
            messaging_limit: '1000',
            status: 'NO_PHONE',
          });
        }
      } catch (phoneError) {
        console.error(`Error fetching phone numbers for account ${account.id}:`, phoneError);
        // Add account without phone numbers on error
        wabaAccountsWithPhones.push({
          id: account.id,
          name: account.name,
          phone_number: '',
          phone_number_id: '',
          business_id: account.business_id || account.id,
          business_name: account.business_name || account.name,
          quality_rating: 'UNKNOWN',
          messaging_limit: '1000',
          status: 'ERROR',
        });
      }
    }

    console.log(`Total accounts with phones: ${wabaAccountsWithPhones.length}`);

    // Prepare the response data
    const responseData = {
      success: true,
      user: {
        id: userInfo.id,
        name: userInfo.name,
        email: userInfo.email,
        picture: userInfo.picture?.data?.url,
      },
      accessToken,
      expiresIn,
      wabaAccounts: wabaAccountsWithPhones,
      connectedAt: new Date().toISOString(),
    };

    console.log('Meta OAuth completed successfully');

    // Return success HTML page
    return new NextResponse(
      generateSuccessHTML(responseData), {
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );

  } catch (error) {
    console.error('Meta OAuth Callback Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new NextResponse(
      generateErrorHTML(errorMessage), {
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  }
}

/**
 * Generates the success HTML page with loading spinner and green gradient
 */
function generateSuccessHTML(data: any): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Successfully Connected!</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: white;
      padding: 20px;
    }
    
    .container {
      text-align: center;
      max-width: 400px;
    }
    
    .spinner-container {
      margin-bottom: 24px;
    }
    
    .spinner {
      width: 60px;
      height: 60px;
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-top: 4px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .checkmark {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      display: block;
      stroke-width: 2;
      stroke: white;
      stroke-miterlimit: 10;
      box-shadow: inset 0px 0px 0px rgba(255, 255, 255, 0.2);
      animation: scale 0.3s ease-in-out 0.5s both;
    }
    
    .checkmark-circle {
      stroke-dasharray: 166;
      stroke-dashoffset: 166;
      stroke-width: 2;
      stroke-miterlimit: 10;
      stroke: white;
      fill: none;
      animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) 0.5s forwards;
    }
    
    .checkmark-check {
      transform-origin: 50% 50%;
      stroke-dasharray: 48;
      stroke-dashoffset: 48;
      animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
    }
    
    @keyframes stroke {
      100% { stroke-dashoffset: 0; }
    }
    
    @keyframes scale {
      0%, 100% { transform: none; }
      50% { transform: scale(1.1); }
    }
    
    h1 {
      font-size: 28px;
      font-weight: 600;
      margin-bottom: 12px;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    p {
      font-size: 16px;
      opacity: 0.9;
      margin-bottom: 20px;
    }
    
    .data-preview {
      background: rgba(255, 255, 255,);
      border-radius: 12px;
      padding: 16px;
      text-align: left;
      font 0.15-family: 'Monaco', 'Menlo', monospace;
      font-size: 12px;
      max-height: 150px;
      overflow-y: auto;
    }
    
    .data-preview pre {
      white-space: pre-wrap;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner-container">
      <svg class="checkmark" viewBox="0 0 52 52">
        <circle class="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
        <path class="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
      </svg>
    </div>
    <h1>Successfully Connected!</h1>
    <p>Your WhatsApp Business account has been linked.</p>
    <div class="data-preview">
      <pre>${JSON.stringify(data, null, 2)}</pre>
    </div>
  </div>
  
  <script>
    // Send data to opener window
    const data = ${JSON.stringify(data)};
    
    if (window.opener) {
      window.opener.postMessage({
        type: 'META_OAUTH_SUCCESS',
        data: data
      }, '*');
    }
    
    // Close the popup after 1.5 seconds
    setTimeout(() => {
      window.close();
    }, 1500);
  </script>
</body>
</html>`;
}

/**
 * Generates the error HTML page with red gradient
 */
function generateErrorHTML(errorMessage: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connection Failed</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #DC3545 0%, #C82333 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: white;
      padding: 20px;
    }
    
    .container {
      text-align: center;
      max-width: 400px;
    }
    
    .error-icon {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }
    
    .error-icon svg {
      width: 32px;
      height: 32px;
      stroke: white;
      stroke-width: 2;
      fill: none;
    }
    
    h1 {
      font-size: 28px;
      font-weight: 600;
      margin-bottom: 12px;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    p {
      font-size: 16px;
      opacity: 0.9;
      margin-bottom: 20px;
    }
    
    .error-details {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 12px;
      padding: 16px;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="error-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </div>
    <h1>Connection Failed</h1>
    <p>Unable to connect your WhatsApp Business account.</p>
    <div class="error-details">
      ${escapeHtml(errorMessage)}
    </div>
  </div>
  
  <script>
    // Send error to opener window
    const errorData = {
      success: false,
      error: ${JSON.stringify(errorMessage)}
    };
    
    if (window.opener) {
      window.opener.postMessage({
        type: 'META_OAUTH_ERROR',
        data: errorData
      }, '*');
    }
    
    // Close the popup after 2 seconds
    setTimeout(() => {
      window.close();
    }, 2000);
  </script>
</body>
</html>`;
}

/**
 * Escapes HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&',
    '<': '<',
    '>': '>',
    '"': '"',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
