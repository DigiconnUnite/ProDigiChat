import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

interface WhatsAppClientConfig {
  apiKey: string;
  phoneNumberId: string;
  businessAccountId: string;
  baseUrl?: string;
  organizationId?: string;
  onTokenRefresh?: (newToken: string) => Promise<void>;
}

// Meta WhatsApp API template submission format
export interface MetaTemplate {
  name: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  components: MetaTemplateComponent[];
  language: string;
  allow_category_selection?: boolean;
}

export interface MetaTemplateComponent {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  format?: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
  text?: string;
  media?: string;
  example?: {
    header_handle?: string[];
    body_text?: string[][];
  };
  buttons?: MetaTemplateButton[];
}

export interface MetaTemplateButton {
  type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER" | "OTP";
  text: string;
  url?: string;
  phone_number?: string;
  otp_type?: "COPY_CODE" | "URL";
}

// Meta template status response
export interface MetaTemplateStatus {
  id: string;
  name: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "PAUSED" | "DELETED";
  category: string;
  language: string;
  components: any[];
  quality_score?: string;
  rejection_reason?: string;
}

export class WhatsAppClient {
  private client: AxiosInstance;
  private phoneNumberId: string;
  private businessAccountId: string;
  private organizationId?: string;
  private onTokenRefresh?: (newToken: string) => Promise<void>;
  private apiKey: string;
  private retryCount: number = 0;
  private maxRetries: number = 1; // Only retry once for token refresh

  constructor(config: WhatsAppClientConfig) {
    this.phoneNumberId = config.phoneNumberId;
    this.businessAccountId = config.businessAccountId;
    this.organizationId = config.organizationId;
    this.onTokenRefresh = config.onTokenRefresh;
    this.apiKey = config.apiKey;

    this.client = axios.create({
      baseURL: config.baseUrl || "https://graph.facebook.com/v18.0",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
    });
  }

  private updateApiKey(newKey: string): void {
    this.apiKey = newKey;
    this.client.defaults.headers["Authorization"] = `Bearer ${newKey}`;
    console.log('[WhatsAppClient] Updated API key in client');
  }

  async refreshToken(): Promise<string> {
    try {
      // Use the refresh token endpoint
      const response: AxiosResponse<{ access_token: string }> = await this.client.post(
        `/${this.businessAccountId}/refresh_token`
      );
      
      const newToken = response.data.access_token;
      
      // Update the client with new token
      this.updateApiKey(newToken);
      
      // Call the callback to update database
      if (this.onTokenRefresh) {
        await this.onTokenRefresh(newToken);
      }
      
      return newToken;
    } catch (error) {
      console.error("Failed to refresh token:", error);
      throw error;
    }
  }

  async sendMessage(payload: any): Promise<AxiosResponse> {
    // Add required messaging_product parameter for WhatsApp API
    const messagePayload = {
      messaging_product: 'whatsapp',
      ...payload
    };
    
    try {
      console.log('[WhatsAppClient] Sending message payload:', JSON.stringify(messagePayload, null, 2));
      const response: AxiosResponse = await this.client.post(
        `/${this.phoneNumberId}/messages`,
        messagePayload
      );
      return response;
    } catch (error: any) {
      // Log detailed error information from Meta API
      const errorDetails = error.response?.data || error.message;
      console.error('[WhatsAppClient] Failed to send message - Status:', error.response?.status);
      console.error('[WhatsAppClient] Error response from Meta:', JSON.stringify(errorDetails, null, 2));
      
      // Handle 401 Unauthorized - try to refresh token and retry
      if (error.response?.status === 401 && this.retryCount < this.maxRetries) {
        console.log('[WhatsAppClient] Token expired, attempting to refresh...');
        this.retryCount++;
        
        try {
          await this.refreshToken();
          console.log('[WhatsAppClient] Token refreshed, retrying message send...');
          
          // Retry the request with new token
          const retryResponse: AxiosResponse = await this.client.post(
            `/${this.phoneNumberId}/messages`,
            messagePayload
          );
          this.retryCount = 0; // Reset retry count on success
          return retryResponse;
        } catch (refreshError) {
          console.error('[WhatsAppClient] Token refresh failed:', refreshError);
          this.retryCount = 0; // Reset retry count
          
          console.error('[WhatsAppClient] ACCESS TOKEN IS INVALID OR EXPIRED!');
          console.error('[WhatsAppClient] Please reconnect WhatsApp in Settings to refresh the token');
          throw new Error('WhatsApp access token has expired. Please reconnect WhatsApp in Settings > WhatsApp.');
        }
      }
      
      // Provide more helpful error messages
      if (error.response?.status === 400) {
        const errorObj = errorDetails?.error || errorDetails;
        if (errorObj?.message?.includes('invalid phone number')) {
          throw new Error('Invalid phone number format. Phone numbers must include country code (e.g., +1234567890)');
        }
        if (errorObj?.message?.includes('template')) {
          throw new Error('Template error: ' + errorObj.message);
        }
        if (errorObj?.message?.includes('permissions')) {
          throw new Error('Missing permissions. Please check your WhatsApp API access token.');
        }
        if (errorObj?.message?.includes('messaging_product')) {
          throw new Error('WhatsApp API configuration error: ' + errorObj.message);
        }
      }
      
      // Handle 401 Unauthorized - token expired or invalid (after retries exhausted)
      if (error.response?.status === 401) {
        console.error('[WhatsAppClient] ACCESS TOKEN IS INVALID OR EXPIRED!');
        console.error('[WhatsAppClient] Please reconnect WhatsApp in Settings to refresh the token');
        throw new Error('WhatsApp access token has expired. Please reconnect WhatsApp in Settings > WhatsApp.');
      }
      
      throw error;
    }
  }

  async submitTemplate(template: MetaTemplate): Promise<AxiosResponse> {
    try {
      console.log("Submitting template to Meta:", JSON.stringify(template, null, 2));
      const response: AxiosResponse = await this.client.post(
        `/${this.businessAccountId}/message_templates`,
        template
      );
      console.log("Meta API response:", JSON.stringify(response.data, null, 2));
      return response;
    } catch (error: any) {
      console.error("Failed to submit template to Meta:", error.response?.data || error.message);
      throw error;
    }
  }

  async getTemplateStatus(templateId: string): Promise<AxiosResponse<MetaTemplateStatus>> {
    try {
      // Fetch template details by ID from Meta
      const response: AxiosResponse<MetaTemplateStatus> = await this.client.get(
        `/${templateId}`,
        {
          params: {
            fields: "id,name,status,category,language,components,quality_score,rejection_reason"
          }
        }
      );
      return response;
    } catch (error: any) {
      console.error("Failed to get template status from Meta:", error.response?.data || error.message);
      throw error;
    }
  }

  async getAllTemplates(status?: string): Promise<AxiosResponse> {
    try {
      // Fetch all templates from Meta with pagination support
      const allTemplates: any[] = [];
      let hasMore = true;
      let cursor: string | undefined = undefined;
      
      while (hasMore) {
        const params: any = {
          fields: "id,name,status,category,language,components,quality_score,rejection_reason",
          limit: 100
        };
        
        // Add status filter if provided
        if (status) {
          params.status = status;
        }
        
        // Add cursor for pagination if available
        if (cursor) {
          params.after = cursor;
        }
        
        const response: AxiosResponse = await this.client.get(
          `/${this.businessAccountId}/message_templates`,
          { params }
        );
        
        const data = response.data;
        
        // Add templates to our collection
        if (data.data && Array.isArray(data.data)) {
          allTemplates.push(...data.data);
        }
        
        // Check for pagination
        if (data.paging && data.paging.cursors && data.paging.cursors.after) {
          cursor = data.paging.cursors.after;
        } else {
          hasMore = false;
        }
      }
      
      console.log(`[WhatsAppClient] Total templates fetched: ${allTemplates.length}`);
      
      // Return in the same format as the original API response
      return {
        data: {
          data: allTemplates,
          paging: {
            cursors: {
              after: undefined
            }
          }
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      };
    } catch (error: any) {
      console.error("Failed to get all templates from Meta:", error.response?.data || error.message);
      throw error;
    }
  }

  async deleteTemplate(templateId: string): Promise<AxiosResponse> {
    try {
      const response: AxiosResponse = await this.client.delete(
        `/${templateId}`
      );
      return response;
    } catch (error: any) {
      console.error("Failed to delete template from Meta:", error.response?.data || error.message);
      throw error;
    }
  }

  async updateTemplate(templateId: string, updates: Partial<MetaTemplate>): Promise<AxiosResponse> {
    try {
      const response: AxiosResponse = await this.client.post(
        `/${templateId}`,
        updates
      );
      return response;
    } catch (error: any) {
      console.error("Failed to update template in Meta:", error.response?.data || error.message);
      throw error;
    }
  }
}
