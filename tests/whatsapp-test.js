/**
 * WhatsApp Message Testing Script (JavaScript Version)
 * Tests the backend functionality of WhatsApp message sending
 * 
 * Usage: node tests/whatsapp-test.js
 */

const axios = require('axios');
require('dotenv').config(); // Load environment variables from .env

// Configuration for WhatsApp API
class WhatsAppClient {
  constructor(config) {
    this.phoneNumberId = config.phoneNumberId;
    this.businessAccountId = config.businessAccountId;

    this.client = axios.create({
      baseURL: config.baseUrl || "https://graph.facebook.com/v18.0",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
    });
  }

  async sendMessage(payload) {
    try {
      const response = await this.client.post(
        `/${this.phoneNumberId}/messages`,
        payload
      );
      return response;
    } catch (error) {
      console.error("Failed to send message:", error.response?.data || error.message);
      throw error;
    }
  }

  async refreshToken() {
    try {
      const response = await this.client.post(
        `/${this.businessAccountId}/refresh_token`
      );
      return response.data.access_token;
    } catch (error) {
      console.error("Failed to refresh token:", error.response?.data || error.message);
      throw error;
    }
  }

  async getBusinessAccountInfo() {
    try {
      const response = await this.client.get(
        `/${this.businessAccountId}`
      );
      return response;
    } catch (error) {
      console.error("Failed to get business account info:", error.response?.data || error.message);
      throw error;
    }
  }
}

// WhatsApp Test Class
class WhatsAppMessageTester {
  constructor(config, mockMode = true) {
    this.client = new WhatsAppClient(config);
    this.testResults = [];
    this.mockMode = mockMode;
  }

  addResult(testName, status, message, response = undefined, error = undefined) {
    this.testResults.push({ testName, status, message, response, error });
  }

  async testSendTextMessage(to, message) {
    console.log(`\n🧪 Testing: Send Text Message to ${to}`);
    
    if (this.mockMode) {
      const mockResponse = {
        messaging_product: "whatsapp",
        contacts: [{ input: to, wa_id: "1234567890" }],
        messages: [{ id: "wamid.mock123456789" }]
      };
      this.addResult(
        "Send Text Message",
        "PASS",
        `Text message sent successfully (mock): "${message}"`,
        mockResponse
      );
      console.log(`✅ Mock: Text message queued for ${to}`);
      return mockResponse;
    }

    try {
      const response = await this.client.sendMessage({
        to,
        type: "text",
        text: { body: message },
      });
      this.addResult(
        "Send Text Message",
        "PASS",
        `Text message sent successfully`,
        response.data
      );
      console.log(`✅ Text message sent:`, response.data);
      return response.data;
    } catch (error) {
      this.addResult(
        "Send Text Message",
        "FAIL",
        `Failed to send text message`,
        undefined,
        error.message
      );
      console.error(`❌ Failed to send text message:`, error.message);
      throw error;
    }
  }

  async testSendTemplateMessage(to, templateName, components) {
    console.log(`\n🧪 Testing: Send Template Message - ${templateName}`);
    
    if (this.mockMode) {
      const mockResponse = {
        messaging_product: "whatsapp",
        contacts: [{ input: to, wa_id: "1234567890" }],
        messages: [{ id: "wamid.template123456" }]
      };
      this.addResult(
        "Send Template Message",
        "PASS",
        `Template message sent successfully (mock): ${templateName}`,
        mockResponse
      );
      console.log(`✅ Mock: Template message queued for ${to}`);
      return mockResponse;
    }

    try {
      const response = await this.client.sendMessage({
        to,
        type: "template",
        template: { name: templateName, language: { code: "en_US" }, components },
      });
      this.addResult(
        "Send Template Message",
        "PASS",
        `Template message sent successfully`,
        response.data
      );
      console.log(`✅ Template message sent:`, response.data);
      return response.data;
    } catch (error) {
      this.addResult(
        "Send Template Message",
        "FAIL",
        `Failed to send template message`,
        undefined,
        error.message
      );
      console.error(`❌ Failed to send template message:`, error.message);
      throw error;
    }
  }

  async testSendMediaMessage(to, mediaUrl, caption) {
    console.log(`\n🧪 Testing: Send Media Message to ${to}`);
    
    if (this.mockMode) {
      const mockResponse = {
        messaging_product: "whatsapp",
        contacts: [{ input: to, wa_id: "1234567890" }],
        messages: [{ id: "wamid.media123456" }]
      };
      this.addResult(
        "Send Media Message",
        "PASS",
        `Media message sent successfully (mock)`,
        mockResponse
      );
      console.log(`✅ Mock: Media message queued for ${to}`);
      return mockResponse;
    }

    try {
      const response = await this.client.sendMessage({
        to,
        type: "image",
        image: { link: mediaUrl, caption },
      });
      this.addResult(
        "Send Media Message",
        "PASS",
        `Media message sent successfully`,
        response.data
      );
      console.log(`✅ Media message sent:`, response.data);
      return response.data;
    } catch (error) {
      this.addResult(
        "Send Media Message",
        "FAIL",
        `Failed to send media message`,
        undefined,
        error.message
      );
      console.error(`❌ Failed to send media message:`, error.message);
      throw error;
    }
  }

  async testTokenRefresh() {
    console.log(`\n🧪 Testing: Token Refresh`);
    
    if (this.mockMode) {
      const mockResponse = { access_token: "mock_new_access_token_12345" };
      this.addResult(
        "Token Refresh",
        "PASS",
        `Token refreshed successfully (mock)`,
        mockResponse
      );
      console.log(`✅ Mock: Token refreshed`);
      return mockResponse.access_token;
    }

    try {
      const newToken = await this.client.refreshToken();
      this.addResult(
        "Token Refresh",
        "PASS",
        `Token refreshed successfully`,
        { access_token: newToken.substring(0, 10) + "..." }
      );
      console.log(`✅ Token refreshed:`, newToken.substring(0, 10) + "...");
      return newToken;
    } catch (error) {
      this.addResult(
        "Token Refresh",
        "FAIL",
        `Failed to refresh token`,
        undefined,
        error.message
      );
      console.error(`❌ Failed to refresh token:`, error.message);
      throw error;
    }
  }

  async testBusinessAccountInfo() {
    console.log(`\n🧪 Testing: Business Account Info`);
    
    if (this.mockMode) {
      const mockResponse = {
        id: "123456789012345",
        name: "Test Business Account",
        category: "Marketing"
      };
      this.addResult(
        "Business Account Info",
        "PASS",
        `Business account info retrieved (mock)`,
        mockResponse
      );
      console.log(`✅ Mock: Business account info retrieved`);
      return mockResponse;
    }

    try {
      const response = await this.client.getBusinessAccountInfo();
      this.addResult(
        "Business Account Info",
        "PASS",
        `Business account info retrieved`,
        response.data
      );
      console.log(`✅ Business account info:`, response.data);
      return response.data;
    } catch (error) {
      this.addResult(
        "Business Account Info",
        "FAIL",
        `Failed to get business account info`,
        undefined,
        error.message
      );
      console.error(`❌ Failed to get business account info:`, error.message);
      throw error;
    }
  }

  async testMessageValidation() {
    console.log(`\n🧪 Testing: Message Validation`);
    
    const testCases = [
      { message: "Valid message", expected: true, description: "Normal message" },
      { message: "A".repeat(4096), expected: true, description: "Message at max length" },
      { message: "A".repeat(4097), expected: false, description: "Message exceeds max length" },
      { message: "", expected: false, description: "Empty message" },
      { message: "https://example.com/valid-url", expected: true, description: "URL in message" },
    ];

    const validationResults = [];

    for (const testCase of testCases) {
      const isValid = this.validateMessage(testCase.message);
      const status = isValid === testCase.expected ? "PASS" : "FAIL";
      
      const result = {
        description: testCase.description,
        input: testCase.message.substring(0, 50) + (testCase.message.length > 50 ? "..." : ""),
        expected: testCase.expected,
        actual: isValid,
        status
      };
      validationResults.push(result);
      
      console.log(`  ${status}: ${testCase.description} - ${isValid ? "Valid" : "Invalid"}`);
    }

    const allPassed = validationResults.every(r => r.status === "PASS");
    this.addResult(
      "Message Validation",
      allPassed ? "PASS" : "FAIL",
      `Message validation tests: ${validationResults.filter(r => r.status === "PASS").length}/${validationResults.length} passed`,
      validationResults
    );

    return validationResults;
  }

  validateMessage(message) {
    if (!message || message.trim().length === 0) return false;
    if (message.length > 4096) return false;
    return true;
  }

  async runAllTests(testPhoneNumber = "+1234567890") {
    console.log("\n" + "=".repeat(60));
    console.log("🚀 Starting WhatsApp Message Backend Tests");
    console.log("=".repeat(60));

    try {
      await this.testBusinessAccountInfo();
      await this.testTokenRefresh();
      await this.testSendTextMessage(testPhoneNumber, "Hello! This is a test message from the WhatsApp Marketing Tool.");
      await this.testSendTemplateMessage(testPhoneNumber, "test_template", [
        {
          type: "body",
          parameters: [
            { type: "text", text: "John" }
          ]
        }
      ]);
      await this.testSendMediaMessage(testPhoneNumber, "https://example.com/test-image.jpg", "Test Image Caption");
      await this.testMessageValidation();

      this.printSummary();

    } catch (error) {
      console.error("\n❌ Test suite failed with error:", error);
    }
  }

  printSummary() {
    console.log("\n" + "=".repeat(60));
    console.log("📊 Test Summary");
    console.log("=".repeat(60));

    const passed = this.testResults.filter(r => r.status === "PASS").length;
    const failed = this.testResults.filter(r => r.status === "FAIL").length;
    const total = this.testResults.length;

    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(2)}%`);

    console.log("\n" + "-".repeat(60));
    console.log("Detailed Results:");
    console.log("-".repeat(60));

    this.testResults.forEach((result, index) => {
      const icon = result.status === "PASS" ? "✅" : "❌";
      console.log(`${icon} ${index + 1}. ${result.testName}: ${result.message}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    console.log("\n" + "=".repeat(60));
  }

  getTestResults() {
    return this.testResults;
  }
}

// Main execution
async function main() {
  // Load environment variables
  require('dotenv').config();
  
  // Get environment variables or use defaults for testing
  const config = {
    apiKey: process.env.WHATSAPP_API_KEY || "mock_api_key",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "mock_phone_number_id",
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "mock_business_account_id",
  };

  // Enable mock mode only if no real API key is set
  const hasRealApiKey = process.env.WHATSAPP_API_KEY && 
                        !process.env.WHATSAPP_API_KEY.includes('mock') &&
                        !process.env.WHATSAPP_API_KEY.startsWith('your-');
  const mockMode = !hasRealApiKey;

  console.log(`\n📱 WhatsApp API Configuration:`);
  console.log(`   Mode: ${mockMode ? "MOCK (No real API calls)" : "LIVE (Real API calls)"}`);
  console.log(`   Phone Number ID: ${config.phoneNumberId}`);
  console.log(`   Business Account ID: ${config.businessAccountId}`);

  const tester = new WhatsAppMessageTester(config, mockMode);
  const testPhoneNumber = process.env.TEST_PHONE_NUMBER || "+1234567890";
  
  await tester.runAllTests(testPhoneNumber);

  const results = tester.getTestResults();
  const allPassed = results.every(r => r.status === "PASS");
  process.exit(allPassed ? 0 : 1);
}

// Export for programmatic use
module.exports = { WhatsAppClient, WhatsAppMessageTester };

// Run if executed directly
main().catch(console.error);
