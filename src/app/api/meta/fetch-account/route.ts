import { NextResponse } from 'next/server';
import { META_API_BASE } from '@/lib/meta-config';

/**
 * Meta Fetch Account API Route
 * 
 * Fetches WhatsApp Business Account details, phone numbers, and user information
 * using the Meta Graph API.
 * 
 * @see https://developers.facebook.com/docs/whatsapp/overview
 * @see https://developers.facebook.com/docs/graph-api
 */

const GRAPH_BASE_URL = META_API_BASE;

interface RequestBody {
  accessToken: string;
  wabaId?: string;
  phoneNumberId?: string;
}

/**
 * Helper function to make Graph API requests
 */
async function fetchFromGraphAPI(
  endpoint: string,
  accessToken: string,
  fields?: string
): Promise<any> {
  const url = new URL(`${GRAPH_BASE_URL}${endpoint}`);
  url.searchParams.set('access_token', accessToken);
  if (fields) {
    url.searchParams.set('fields', fields);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `Graph API error: ${response.status}`);
  }

  return response.json();
}

/**
 * POST handler for fetching Meta account information
 */
export async function POST(request: Request) {
  try {
    // Parse request body
    const body: RequestBody = await request.json();
    const { accessToken, wabaId, phoneNumberId } = body;

    // Validation: Check if accessToken is provided
    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'accessToken is required',
        },
        { status: 400 }
      );
    }

    // Initialize response data
    let accounts: any[] = [];
    let phoneNumbers: any[] = [];
    let user: any = null;
    let tokenInfo: any = null;
    let specificPhone: any = null;
    let wabaAccount: any = null;

    // 1. Fetch WABA Account Details (if wabaId provided)
    if (wabaId) {
      try {
        console.log('Fetching WABA account details for:', wabaId);
        wabaAccount = await fetchFromGraphAPI(
          `/${wabaId}`,
          accessToken,
          'id,name,currency,timezone_id,message_template_namespace,account_review_status,business_type,primary_business_location'
        );
        console.log('WABA account details fetched:', wabaAccount);
      } catch (error) {
        console.error('Error fetching WABA account details:', error);
        // Continue with other requests even if this fails
      }
    }

    // 2. Fetch All Businesses and WABA Accounts
    try {
      console.log('Fetching businesses and WABA accounts...');
      const businessesData = await fetchFromGraphAPI(
        '/me/businesses',
        accessToken,
        'id,name,whatsapp_business_accounts{id,name,currency,timezone_id,message_template_namespace,account_review_status,business_type}'
      );

      // Extract accounts from businesses
      if (businessesData.data) {
        for (const business of businessesData.data) {
          if (business.whatsapp_business_accounts?.data) {
            for (const waba of business.whatsapp_business_accounts.data) {
              accounts.push({
                ...waba,
                businessId: business.id,
                businessName: business.name,
              });
            }
          }
        }
      }
      console.log(`Found ${accounts.length} WABA accounts`);
    } catch (error) {
      console.error('Error fetching businesses:', error);
      // Continue with other requests even if this fails
    }

    // 3. Fetch Phone Numbers for Each Account
    console.log('Fetching phone numbers for each account...');
    for (const account of accounts) {
      try {
        console.log(`Fetching phone numbers for account: ${account.id} (${account.name})`);
        const phoneData = await fetchFromGraphAPI(
          `/${account.id}/phone_numbers`,
          accessToken,
          'id,display_phone_number,verified_name,quality_rating,messaging_limit_tier,status,name_status,certificate,last_onboarded_time'
        );

        if (phoneData.data) {
          for (const phone of phoneData.data) {
            phoneNumbers.push({
              ...phone,
              accountId: account.id,
              accountName: account.name,
            });
          }
          console.log(`Found ${phoneData.data.length} phone numbers for account ${account.id}`);
        }
      } catch (error) {
        console.error(`Error fetching phone numbers for account ${account.id}:`, error);
        // Continue with other accounts even if one fails
      }
    }
    console.log(`Total phone numbers fetched: ${phoneNumbers.length}`);

    // 4. Fetch Specific Phone Number (if phoneNumberId provided)
    if (phoneNumberId) {
      try {
        specificPhone = await fetchFromGraphAPI(
          `/${phoneNumberId}`,
          accessToken,
          'id,display_phone_number,verified_name,quality_rating,messaging_limit_tier,status,name_status,certificate'
        );
      } catch (error) {
        console.error('Error fetching specific phone number:', error);
        // Continue with other requests even if this fails
      }
    }

    // 5. Fetch User Info
    try {
      user = await fetchFromGraphAPI(
        '/me',
        accessToken,
        'id,name,email,picture'
      );
    } catch (error) {
      console.error('Error fetching user info:', error);
      // Continue with other requests even if this fails
    }

    // 6. Debug Token
    try {
      const debugUrl = new URL(`${GRAPH_BASE_URL}/debug_token`);
      debugUrl.searchParams.set('input_token', accessToken);
      debugUrl.searchParams.set('access_token', accessToken);

      const debugResponse = await fetch(debugUrl.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (debugResponse.ok) {
        tokenInfo = await debugResponse.json();
      }
    } catch (error) {
      console.error('Error debugging token:', error);
      // Continue even if this fails
    }

    // Return successful response
    return NextResponse.json({
      success: true,
      wabaAccount,
      accounts,
      phoneNumbers,
      user,
      tokenInfo,
      specificPhone,
    });

  } catch (error) {
    // Log the error for debugging
    console.error('Meta Fetch Account Error:', error);

    // Return a proper error response
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch account information',
      },
      { status: 500 }
    );
  }
}
