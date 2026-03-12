/**
 * Pre-made WhatsApp Template Library
 * 
 * Template names follow WhatsApp's naming conventions:
 * - Start with a lowercase letter
 * - Use only lowercase letters, numbers, and underscores
 * - Be descriptive and concise
 * 
 * Reference: https://developers.facebook.com/docs/whatsapp/message-templates/guidelines/
 */

import { WhatsAppTemplate, TemplateCategory, TemplateTranslation, Button } from '@/types/template';

// Helper function to create buttons
const createButton = (id: string, type: 'quick_reply' | 'call_to_action', text: string, actionType?: 'url' | 'phone', actionValue?: string): Button => ({
  id,
  type,
  text,
  actionType,
  actionValue,
});

// Pre-made template definitions with WhatsApp-compliant names
export interface PremadeTemplate {
  id: string;
  name: string;           // WhatsApp template name (lowercase with underscores)
  displayName: string;   // Human-readable display name
  description: string;
  category: TemplateCategory;
  popularity: number;
  tags: string[];
  translations: TemplateTranslation[];
  preview: {
    header?: string;
    body: string;
    footer?: string;
  };
}

// Marketing Templates
export const marketingTemplates: PremadeTemplate[] = [
  {
    id: 'marketing_welcome_01',
    name: 'marketing_welcome_01',
    displayName: 'Welcome Message',
    description: 'Warm welcome for new customers with special offer',
    category: 'marketing',
    popularity: 95,
    tags: ['welcome', 'new_customer', 'offer'],
    preview: {
      header: '🎉 Welcome to Our Store!',
      body: 'Hi {{1}}, thank you for joining us! As a special welcome gift, use code WELCOME10 for 10% off your first order.',
      footer: 'Valid for 7 days'
    },
    translations: [
      {
        language: 'en_US',
        body: 'Hi {{1}}, thank you for joining us! As a special welcome gift, use code WELCOME10 for 10% off your first order.',
        footer: 'Valid for 7 days',
        buttons: [
          createButton('btn_welcome_shop', 'quick_reply', 'Shop Now'),
          createButton('btn_welcome_learn', 'quick_reply', 'Learn More'),
        ]
      },
      {
        language: 'es_ES',
        body: '¡Hola {{1}}, gracias por unirte a nosotros! Como regalo de bienvenida, usa el código WELCOME10 para obtener un 10% de descuento en tu primer pedido.',
        footer: 'Válido por 7 días',
        buttons: [
          createButton('btn_welcome_shop', 'quick_reply', 'Comprar Ahora'),
          createButton('btn_welcome_learn', 'quick_reply', 'Más Información'),
        ]
      }
    ]
  },
  {
    id: 'marketing_abandoned_cart_01',
    name: 'marketing_abandoned_cart_01',
    displayName: 'Abandoned Cart Reminder',
    description: 'Remind customers about items left in their cart',
    category: 'marketing',
    popularity: 92,
    tags: ['cart', 'reminder', 'recovery'],
    preview: {
      header: '🛒 You Forgot Something!',
      body: 'Hi {{1}}, you left {{2}} item(s) in your cart. Don\'t miss out - they\'re still available! Complete your purchase now.',
      footer: 'Items reserved for 24 hours'
    },
    translations: [
      {
        language: 'en_US',
        body: 'Hi {{1}}, you left {{2}} item(s) in your cart. Don\'t miss out - they\'re still available! Complete your purchase now.',
        footer: 'Items reserved for 24 hours',
        buttons: [
          createButton('btn_cart_complete', 'quick_reply', 'Complete Purchase'),
          createButton('btn_cart_remove', 'quick_reply', 'Remove Item'),
        ]
      }
    ]
  },
  {
    id: 'marketing_order_confirmed_01',
    name: 'marketing_order_confirmed_01',
    displayName: 'Order Confirmation',
    description: 'Confirm order receipt and provide details',
    category: 'marketing',
    popularity: 98,
    tags: ['order', 'confirmation', 'receipt'],
    preview: {
      header: '✅ Order Confirmed!',
      body: 'Thank you for your order, {{1}}! Order #{{2}} has been received. We\'ll notify you when it\'s shipped.',
      footer: 'Questions? Reply to this message'
    },
    translations: [
      {
        language: 'en_US',
        body: 'Thank you for your order, {{1}}! Order #{{2}} has been received. We\'ll notify you when it\'s shipped.',
        footer: 'Questions? Reply to this message',
        buttons: [
          createButton('btn_order_track', 'quick_reply', 'Track Order'),
          createButton('btn_order_details', 'quick_reply', 'View Details'),
        ]
      }
    ]
  },
  {
    id: 'marketing_shipping_update_01',
    name: 'marketing_shipping_update_01',
    displayName: 'Shipping Update',
    description: 'Notify customer about shipping status',
    category: 'marketing',
    popularity: 88,
    tags: ['shipping', 'update', 'delivery'],
    preview: {
      header: '📦 Great News!',
      body: 'Hi {{1}}, your order #{{2}} has been shipped! Track your package using the link below.',
      footer: 'Expected delivery: {{3}}'
    },
    translations: [
      {
        language: 'en_US',
        body: 'Hi {{1}}, your order #{{2}} has been shipped! Track your package using the link below.',
        footer: 'Expected delivery: {{3}}',
        buttons: [
          createButton('btn_ship_track', 'call_to_action', 'Track Package', 'url', 'https://track.yourshop.com/{{4}}'),
          createButton('btn_ship_help', 'quick_reply', 'Need Help'),
        ]
      }
    ]
  },
  {
    id: 'marketing_special_promo_01',
    name: 'marketing_special_promo_01',
    displayName: 'Special Promotion',
    description: 'Announce special offers and discounts',
    category: 'marketing',
    popularity: 85,
    tags: ['promo', 'sale', 'discount'],
    preview: {
      header: '🔥 Limited Time Offer!',
      body: 'Hi {{1}}! Don\'t miss our {{2}}% OFF sale! Use code: {{3}} at checkout. Offer ends {{4}}!',
      footer: 'Minimum purchase required. T&C apply.'
    },
    translations: [
      {
        language: 'en_US',
        body: 'Hi {{1}}! Don\'t miss our {{2}}% OFF sale! Use code: {{3}} at checkout. Offer ends {{4}}!',
        footer: 'Minimum purchase required. T&C apply.',
        buttons: [
          createButton('btn_promo_shop', 'quick_reply', 'Shop Now'),
          createButton('btn_promo_learn', 'quick_reply', 'Learn More'),
        ]
      }
    ]
  },
  {
    id: 'marketing_review_request_01',
    name: 'marketing_review_request_01',
    displayName: 'Request Review',
    description: 'Ask customers to leave a review',
    category: 'marketing',
    popularity: 80,
    tags: ['review', 'feedback', 'rating'],
    preview: {
      header: '⭐ How Was Your Experience?',
      body: 'Hi {{1}}, thank you for purchasing from us! We\'d love to hear your feedback. Take a moment to rate your experience.',
      footer: 'Your opinion matters to us!'
    },
    translations: [
      {
        language: 'en_US',
        body: 'Hi {{1}}, thank you for purchasing from us! We\'d love to hear your feedback. Take a moment to rate your experience.',
        footer: 'Your opinion matters to us!',
        buttons: [
          createButton('btn_review_leave', 'quick_reply', 'Leave Review'),
          createButton('btn_review_skip', 'quick_reply', 'Skip'),
        ]
      }
    ]
  },
  {
    id: 'marketing_flash_sale_01',
    name: 'marketing_flash_sale_01',
    displayName: 'Flash Sale Alert',
    description: 'Quick notification about time-limited flash sales',
    category: 'marketing',
    popularity: 90,
    tags: ['flash_sale', 'limited_time', 'urgent'],
    preview: {
      header: '⚡ FLASH SALE ALERT!',
      body: 'Hi {{1}}! {{2}}% OFF for the next {{3}} hours only! Don\'t miss this incredible deal. Shop now!',
      footer: 'While supplies last'
    },
    translations: [
      {
        language: 'en_US',
        body: 'Hi {{1}}! {{2}}% OFF for the next {{3}} hours only! Don\'t miss this incredible deal. Shop now!',
        footer: 'While supplies last',
        buttons: [
          createButton('btn_flash_shop', 'quick_reply', 'Shop Now'),
          createButton('btn_flash_remind', 'quick_reply', 'Remind Me'),
        ]
      }
    ]
  },
  {
    id: 'marketing_loyalty_reward_01',
    name: 'marketing_loyalty_reward_01',
    displayName: 'Loyalty Reward',
    description: 'Reward loyal customers with exclusive offers',
    category: 'marketing',
    popularity: 82,
    tags: ['loyalty', 'reward', 'vip'],
    preview: {
      header: '🎁 Exclusive Reward For You!',
      body: 'Hi {{1}}, as one of our valued customers, you deserve something special! Use code {{2}} for {{3}}% off.',
      footer: 'Valid for VIP members only'
    },
    translations: [
      {
        language: 'en_US',
        body: 'Hi {{1}}, as one of our valued customers, you deserve something special! Use code {{2}} for {{3}}% off.',
        footer: 'Valid for VIP members only',
        buttons: [
          createButton('btn_loyalty_claim', 'quick_reply', 'Claim Reward'),
          createButton('btn_loyalty_details', 'quick_reply', 'Learn More'),
        ]
      }
    ]
  },
  {
    id: 'marketing_birthday_offer_01',
    name: 'marketing_birthday_offer_01',
    displayName: 'Birthday Offer',
    description: 'Special birthday discount for customers',
    category: 'marketing',
    popularity: 75,
    tags: ['birthday', 'celebration', 'gift'],
    preview: {
      header: '🎂 Happy Birthday!',
      body: 'Hi {{1}}, happy birthday from our team! We\'re celebrating you with {{2}}% off your entire order. Use code: {{3}}',
      footer: 'Valid this week only!'
    },
    translations: [
      {
        language: 'en_US',
        body: 'Hi {{1}}, happy birthday from our team! We\'re celebrating you with {{2}}% off your entire order. Use code: {{3}}',
        footer: 'Valid this week only!',
        buttons: [
          createButton('btn_bday_shop', 'quick_reply', 'Shop Now'),
          createButton('btn_bday_claim', 'quick_reply', 'Claim Gift'),
        ]
      }
    ]
  },
  {
    id: 'marketing_back_in_stock_01',
    name: 'marketing_back_in_stock_01',
    displayName: 'Back In Stock',
    description: 'Notify customers when out-of-stock items are available',
    category: 'marketing',
    popularity: 78,
    tags: ['back_in_stock', 'notification', 'availability'],
    preview: {
      header: '📦 Back In Stock!',
      body: 'Hi {{1}}, great news! {{2}} is now back in stock. Don\'t miss out - order now!',
      footer: 'Limited quantity available'
    },
    translations: [
      {
        language: 'en_US',
        body: 'Hi {{1}}, great news! {{2}} is now back in stock. Don\'t miss out - order now!',
        footer: 'Limited quantity available',
        buttons: [
          createButton('btn_stock_order', 'quick_reply', 'Order Now'),
          createButton('btn_stock_notify', 'quick_reply', 'Notify Me'),
        ]
      }
    ]
  },
  {
    id: 'marketing_upsell_01',
    name: 'marketing_upsell_01',
    displayName: 'Product Upsell',
    description: 'Recommend complementary products to customers',
    category: 'marketing',
    popularity: 73,
    tags: ['upsell', 'recommendation', 'accessories'],
    preview: {
      header: '💡 You Might Like This!',
      body: 'Hi {{1}}, customers who bought {{2}} also loved {{3}}. Complete your order with this amazing add-on!',
      footer: 'Special bundle price available'
    },
    translations: [
      {
        language: 'en_US',
        body: 'Hi {{1}}, customers who bought {{2}} also loved {{3}}. Complete your order with this amazing add-on!',
        footer: 'Special bundle price available',
        buttons: [
          createButton('btn_upsell_add', 'quick_reply', 'Add to Order'),
          createButton('btn_upsell_no', 'quick_reply', 'No Thanks'),
        ]
      }
    ]
  },
  {
    id: 'marketing_re_engagement_01',
    name: 'marketing_re_engagement_01',
    displayName: 'We Miss You',
    description: 'Re-engage inactive customers with a special offer',
    category: 'marketing',
    popularity: 70,
    tags: ['re_engagement', 'inactive', 'comeback'],
    preview: {
      header: '😢 We Miss You!',
      body: 'Hi {{1}}, it\'s been a while! We\'d love to have you back. Here\'s {{2}}% off your next order: {{3}}',
      footer: 'Valid for returning customers'
    },
    translations: [
      {
        language: 'en_US',
        body: 'Hi {{1}}, it\'s been a while! We\'d love to have you back. Here\'s {{2}}% off your next order: {{3}}',
        footer: 'Valid for returning customers',
        buttons: [
          createButton('btn_reengage_shop', 'quick_reply', 'Shop Now'),
          createButton('btn_reengage_later', 'quick_reply', 'Maybe Later'),
        ]
      }
    ]
  },
];

// Utility Templates
export const utilityTemplates: PremadeTemplate[] = [
  {
    id: 'utility_appointment_reminder_01',
    name: 'utility_appointment_reminder_01',
    displayName: 'Appointment Reminder',
    description: 'Remind customers about upcoming appointments',
    category: 'utility',
    popularity: 90,
    tags: ['appointment', 'reminder', 'schedule'],
    preview: {
      header: '📅 Appointment Reminder',
      body: 'Hi {{1}}, this is a reminder for your appointment on {{2}} at {{3}}. Reply YES to confirm or call us to reschedule.',
      footer: 'Location: {{4}}'
    },
    translations: [
      {
        language: 'en_US',
        body: 'Hi {{1}}, this is a reminder for your appointment on {{2}} at {{3}}. Reply YES to confirm or call us to reschedule.',
        footer: 'Location: {{4}}',
        buttons: [
          createButton('btn_appt_confirm', 'quick_reply', 'Confirm'),
          createButton('btn_appt_call', 'call_to_action', 'Call Us', 'phone', '+1234567890'),
        ]
      }
    ]
  },
  {
    id: 'utility_payment_reminder_01',
    name: 'utility_payment_reminder_01',
    displayName: 'Payment Due Reminder',
    description: 'Remind about upcoming or overdue payments',
    category: 'utility',
    popularity: 87,
    tags: ['payment', 'invoice', 'due'],
    preview: {
      header: '💳 Payment Reminder',
      body: 'Hi {{1}}, this is a friendly reminder that your payment of {{2}} is due on {{3}}. Please make your payment to avoid any late fees.',
      footer: 'Invoice #{{4}}'
    },
    translations: [
      {
        language: 'en_US',
        body: 'Hi {{1}}, this is a friendly reminder that your payment of {{2}} is due on {{3}}. Please make your payment to avoid any late fees.',
        footer: 'Invoice #{{4}}',
        buttons: [
          createButton('btn_pay_now', 'call_to_action', 'Pay Now', 'url', 'https://pay.yourshop.com/{{5}}'),
          createButton('btn_pay_invoice', 'quick_reply', 'View Invoice'),
        ]
      }
    ]
  },
  {
    id: 'utility_account_verification_01',
    name: 'utility_account_verification_01',
    displayName: 'Account Verification',
    description: 'Verify user account or phone number',
    category: 'utility',
    popularity: 95,
    tags: ['verification', 'otp', 'security'],
    preview: {
      header: '🔐 Verify Your Account',
      body: 'Your verification code is: {{1}}. This code expires in {{2}} minutes. Never share this code with anyone.',
      footer: 'If you didn\'t request this, please ignore.'
    },
    translations: [
      {
        language: 'en_US',
        body: 'Your verification code is: {{1}}. This code expires in {{2}} minutes. Never share this code with anyone.',
        footer: 'If you didn\'t request this, please ignore.',
        buttons: []
      }
    ]
  },
  {
    id: 'utility_delivery_confirmed_01',
    name: 'utility_delivery_confirmed_01',
    displayName: 'Delivery Confirmation',
    description: 'Confirm successful delivery',
    category: 'utility',
    popularity: 93,
    tags: ['delivery', 'complete', 'received'],
    preview: {
      header: '📬 Delivered!',
      body: 'Hi {{1}}, your order #{{2}} has been delivered! We hope you enjoy your purchase. Rate your experience or contact us if you have any issues.',
      footer: 'Thank you for shopping with us!'
    },
    translations: [
      {
        language: 'en_US',
        body: 'Hi {{1}}, your order #{{2}} has been delivered! We hope you enjoy your purchase. Rate your experience or contact us if you have any issues.',
        footer: 'Thank you for shopping with us!',
        buttons: [
          createButton('btn_delivery_rate', 'quick_reply', 'Rate Experience'),
          createButton('btn_delivery_help', 'quick_reply', 'Get Help'),
        ]
      }
    ]
  },
  {
    id: 'utility_delivery_delayed_01',
    name: 'utility_delivery_delayed_01',
    displayName: 'Delivery Delay Notice',
    description: 'Inform customers about delayed shipments',
    category: 'utility',
    popularity: 85,
    tags: ['delivery', 'delay', 'shipping'],
    preview: {
      header: '📦 Shipping Update',
      body: 'Hi {{1}}, we apologize but your order #{{2}} has been delayed. The new estimated delivery date is {{3}}. We appreciate your patience.',
      footer: 'Contact us for more information'
    },
    translations: [
      {
        language: 'en_US',
        body: 'Hi {{1}}, we apologize but your order #{{2}} has been delayed. The new estimated delivery date is {{3}}. We appreciate your patience.',
        footer: 'Contact us for more information',
        buttons: [
          createButton('btn_delay_track', 'call_to_action', 'Track Order', 'url', 'https://track.yourshop.com/{{4}}'),
          createButton('btn_delay_contact', 'quick_reply', 'Contact Support'),
        ]
      }
    ]
  },
  {
    id: 'utility_payment_received_01',
    name: 'utility_payment_received_01',
    displayName: 'Payment Received',
    description: 'Confirm payment has been received',
    category: 'utility',
    popularity: 89,
    tags: ['payment', 'received', 'confirmation'],
    preview: {
      header: '💰 Payment Received!',
      body: 'Hi {{1}}, we have received your payment of {{2}} for invoice #{{3}}. Thank you for your prompt payment.',
      footer: 'Receipt will be emailed to you'
    },
    translations: [
      {
        language: 'en_US',
        body: 'Hi {{1}}, we have received your payment of {{2}} for invoice #{{3}}. Thank you for your prompt payment.',
        footer: 'Receipt will be emailed to you',
        buttons: [
          createButton('btn_payment_receipt', 'quick_reply', 'View Receipt'),
        ]
      }
    ]
  },
  {
    id: 'utility_refund_processed_01',
    name: 'utility_refund_processed_01',
    displayName: 'Refund Processed',
    description: 'Notify customers that a refund has been processed',
    category: 'utility',
    popularity: 84,
    tags: ['refund', 'money_back', 'processed'],
    preview: {
      header: '💵 Refund Processed',
      body: 'Hi {{1}}, your refund of {{2}} for order #{{3}} has been processed. Please allow 5-10 business days for the amount to appear in your account.',
      footer: 'Thank you for your understanding'
    },
    translations: [
      {
        language: 'en_US',
        body: 'Hi {{1}}, your refund of {{2}} for order #{{3}} has been processed. Please allow 5-10 business days for the amount to appear in your account.',
        footer: 'Thank you for your understanding',
        buttons: [
          createButton('btn_refund_details', 'quick_reply', 'More Details'),
        ]
      }
    ]
  },
  {
    id: 'utility_subscription_renewal_01',
    name: 'utility_subscription_renewal_01',
    displayName: 'Subscription Renewal',
    description: 'Remind about upcoming subscription renewal',
    category: 'utility',
    popularity: 81,
    tags: ['subscription', 'renewal', 'recurring'],
    preview: {
      header: '🔄 Subscription Renewal',
      body: 'Hi {{1}}, your subscription will renew on {{2}}. Your card ending in {{3}} will be charged {{4}}. Reply YES to confirm or manage your subscription.',
      footer: 'Manage your subscription anytime'
    },
    translations: [
      {
        language: 'en_US',
        body: 'Hi {{1}}, your subscription will renew on {{2}}. Your card ending in {{3}} will be charged {{4}}. Reply YES to confirm or manage your subscription.',
        footer: 'Manage your subscription anytime',
        buttons: [
          createButton('btn_sub_manage', 'call_to_action', 'Manage Subscription', 'url', 'https://yourshop.com/subscription'),
          createButton('btn_sub_confirm', 'quick_reply', 'Confirm'),
        ]
      }
    ]
  },
  {
    id: 'utility_document_ready_01',
    name: 'utility_document_ready_01',
    displayName: 'Document Ready',
    description: 'Notify when a document is ready for viewing',
    category: 'utility',
    popularity: 77,
    tags: ['document', 'ready', 'download'],
    preview: {
      header: '📄 Document Ready',
      body: 'Hi {{1}}, your document "{{2}}" is now ready. Click below to view or download it.',
      footer: 'Available for 30 days'
    },
    translations: [
      {
        language: 'en_US',
        body: 'Hi {{1}}, your document "{{2}}" is now ready. Click below to view or download it.',
        footer: 'Available for 30 days',
        buttons: [
          createButton('btn_doc_view', 'call_to_action', 'View Document', 'url', 'https://yourshop.com/docs/{{3}}'),
        ]
      }
    ]
  },
  {
    id: 'utility_loyalty_points_01',
    name: 'utility_loyalty_points_01',
    displayName: 'Loyalty Points Update',
    description: 'Notify about loyalty points balance or earning',
    category: 'utility',
    popularity: 79,
    tags: ['loyalty', 'points', 'rewards'],
    preview: {
      header: '⭐ Points Update',
      body: 'Hi {{1}}, you just earned {{2}} points! You now have {{3}} points total. Redeem them for rewards!',
      footer: '1 point = $0.01 value'
    },
    translations: [
      {
        language: 'en_US',
        body: 'Hi {{1}}, you just earned {{2}} points! You now have {{3}} points total. Redeem them for rewards!',
        footer: '1 point = $0.01 value',
        buttons: [
          createButton('btn_points_redeem', 'quick_reply', 'Redeem Points'),
          createButton('btn_points_learn', 'quick_reply', 'Learn More'),
        ]
      }
    ]
  },
];

// Authentication Templates
export const authenticationTemplates: PremadeTemplate[] = [
  {
    id: 'auth_otp_login_01',
    name: 'auth_otp_login_01',
    displayName: 'Login OTP',
    description: 'One-time password for login verification',
    category: 'authentication',
    popularity: 98,
    tags: ['login', 'otp', '2fa'],
    preview: {
      header: '🔑 Login Verification',
      body: 'Your login code is: {{1}}. This code expires in {{2}} minutes. If you didn\'t try to log in, please ignore this message.',
      footer: 'Stay secure!'
    },
    translations: [
      {
        language: 'en_US',
        body: 'Your login code is: {{1}}. This code expires in {{2}} minutes. If you didn\'t try to log in, please ignore this message.',
        footer: 'Stay secure!',
        buttons: []
      }
    ]
  },
  {
    id: 'auth_password_reset_01',
    name: 'auth_password_reset_01',
    displayName: 'Password Reset',
    description: 'Password reset request confirmation',
    category: 'authentication',
    popularity: 94,
    tags: ['password', 'reset', 'security'],
    preview: {
      header: '🔓 Password Reset Request',
      body: 'You requested to reset your password. Click the button below to create a new password. This link expires in {{1}} minutes.',
      footer: 'Didn\'t request this? Secure your account now.'
    },
    translations: [
      {
        language: 'en_US',
        body: 'You requested to reset your password. Click the button below to create a new password. This link expires in {{1}} minutes.',
        footer: 'Didn\'t request this? Secure your account now.',
        buttons: [
          createButton('btn_reset_password', 'call_to_action', 'Reset Password', 'url', 'https://yourshop.com/reset/{{2}}'),
        ]
      }
    ]
  },
  {
    id: 'auth_account_created_01',
    name: 'auth_account_created_01',
    displayName: 'Account Created',
    description: 'Confirm successful account creation',
    category: 'authentication',
    popularity: 91,
    tags: ['account', 'created', 'welcome'],
    preview: {
      header: '🎊 Account Created!',
      body: 'Welcome {{1}}! Your account has been successfully created. Verify your email {{2}} to get started.',
      footer: 'Questions? Contact our support team.'
    },
    translations: [
      {
        language: 'en_US',
        body: 'Welcome {{1}}! Your account has been successfully created. Verify your email {{2}} to get started.',
        footer: 'Questions? Contact our support team.',
        buttons: [
          createButton('btn_verify_email', 'call_to_action', 'Verify Email', 'url', 'https://yourshop.com/verify/{{3}}'),
        ]
      }
    ]
  },
  {
    id: 'auth_phone_verification_01',
    name: 'auth_phone_verification_01',
    displayName: 'Phone Number Verification',
    description: 'Verify phone number with OTP',
    category: 'authentication',
    popularity: 92,
    tags: ['phone', 'verification', 'otp'],
    preview: {
      header: '📱 Verify Your Phone',
      body: 'Your phone verification code is: {{1}}. This code expires in {{2}} minutes. Enter this code to verify your phone number.',
      footer: 'Never share this code with anyone'
    },
    translations: [
      {
        language: 'en_US',
        body: 'Your phone verification code is: {{1}}. This code expires in {{2}} minutes. Enter this code to verify your phone number.',
        footer: 'Never share this code with anyone',
        buttons: []
      }
    ]
  },
  {
    id: 'auth_email_verification_01',
    name: 'auth_email_verification_01',
    displayName: 'Email Verification',
    description: 'Verify email address with link or code',
    category: 'authentication',
    popularity: 93,
    tags: ['email', 'verification', 'confirm'],
    preview: {
      header: '📧 Verify Your Email',
      body: 'Hi {{1}}, please verify your email address by entering this code: {{2}}. This code expires in {{3}} minutes.',
      footer: 'If you didn\'t create an account, please ignore.'
    },
    translations: [
      {
        language: 'en_US',
        body: 'Hi {{1}}, please verify your email address by entering this code: {{2}}. This code expires in {{3}} minutes.',
        footer: 'If you didn\'t create an account, please ignore.',
        buttons: [
          createButton('btn_email_verify', 'call_to_action', 'Verify Email', 'url', 'https://yourshop.com/verify/{{4}}'),
        ]
      }
    ]
  },
  {
    id: 'auth_account_locked_01',
    name: 'auth_account_locked_01',
    displayName: 'Account Locked Alert',
    description: 'Notify about locked account due to suspicious activity',
    category: 'authentication',
    popularity: 86,
    tags: ['account', 'locked', 'security'],
    preview: {
      header: '🔒 Account Locked',
      body: 'Hi {{1}}, we\'ve detected unusual activity on your account and have temporarily locked it for your security. Click below to unlock.',
      footer: 'If this wasn\'t you, please contact support'
    },
    translations: [
      {
        language: 'en_US',
        body: 'Hi {{1}}, we\'ve detected unusual activity on your account and have temporarily locked it for your security. Click below to unlock.',
        footer: 'If this wasn\'t you, please contact support',
        buttons: [
          createButton('btn_unlock_account', 'call_to_action', 'Unlock Account', 'url', 'https://yourshop.com/unlock/{{2}}'),
          createButton('btn_contact_support', 'quick_reply', 'Contact Support'),
        ]
      }
    ]
  },
  {
    id: 'auth_mfa_enabled_01',
    name: 'auth_mfa_enabled_01',
    displayName: 'MFA Enabled Confirmation',
    description: 'Confirm two-factor authentication has been enabled',
    category: 'authentication',
    popularity: 88,
    tags: ['mfa', '2fa', 'enabled'],
    preview: {
      header: '🛡️ 2FA Enabled',
      body: 'Hi {{1}}, two-factor authentication has been enabled on your account! Your account is now more secure.',
      footer: 'Keep your backup codes safe'
    },
    translations: [
      {
        language: 'en_US',
        body: 'Hi {{1}}, two-factor authentication has been enabled on your account! Your account is now more secure.',
        footer: 'Keep your backup codes safe',
        buttons: [
          createButton('btn_mfa_backup_codes', 'call_to_action', 'View Backup Codes', 'url', 'https://yourshop.com/backup-codes'),
        ]
      }
    ]
  },
  {
    id: 'auth_password_changed_01',
    name: 'auth_password_changed_01',
    displayName: 'Password Changed Confirmation',
    description: 'Confirm password has been changed',
    category: 'authentication',
    popularity: 89,
    tags: ['password', 'changed', 'security'],
    preview: {
      header: '🔑 Password Changed',
      body: 'Hi {{1}}, your password has been successfully changed. If you didn\'t make this change, please contact us immediately.',
      footer: 'Stay secure!'
    },
    translations: [
      {
        language: 'en_US',
        body: 'Hi {{1}}, your password has been successfully changed. If you didn\'t make this change, please contact us immediately.',
        footer: 'Stay secure!',
        buttons: [
          createButton('btn_password_help', 'quick_reply', 'Need Help?'),
        ]
      }
    ]
  },
  {
    id: 'auth_login_alert_01',
    name: 'auth_login_alert_01',
    displayName: 'New Login Alert',
    description: 'Notify about new device/login to account',
    category: 'authentication',
    popularity: 90,
    tags: ['login', 'alert', 'security'],
    preview: {
      header: '🚨 New Login Detected',
      body: 'Hi {{1}}, we noticed a new login to your account from {{2}} on {{3}}. If this wasn\'t you, secure your account immediately.',
      footer: 'Stay secure!'
    },
    translations: [
      {
        language: 'en_US',
        body: 'Hi {{1}}, we noticed a new login to your account from {{2}} on {{3}}. If this wasn\'t you, secure your account immediately.',
        footer: 'Stay secure!',
        buttons: [
          createButton('btn_login_secure', 'call_to_action', 'Secure Account', 'url', 'https://yourshop.com/security'),
          createButton('btn_login_was_me', 'quick_reply', 'It Was Me'),
        ]
      }
    ]
  },
];

// All templates combined
export const premadeTemplates: PremadeTemplate[] = [
  ...marketingTemplates,
  ...utilityTemplates,
  ...authenticationTemplates,
];

// Export a function to get templates by category
export function getTemplatesByCategory(category: TemplateCategory): PremadeTemplate[] {
  switch (category) {
    case 'marketing':
      return marketingTemplates;
    case 'utility':
      return utilityTemplates;
    case 'authentication':
      return authenticationTemplates;
    default:
      return premadeTemplates;
  }
}

// Export a function to find a template by name
export function findTemplateByName(name: string): PremadeTemplate | undefined {
  return premadeTemplates.find(t => t.name === name);
}

// Export a function to generate a unique template name based on display name
export function generateWhatsAppTemplateName(displayName: string, category: TemplateCategory): string {
  // Convert to lowercase, replace spaces and special chars with underscores
  const baseName = displayName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .trim();
  
  // Add category prefix
  return `${category}_${baseName}`;
}
