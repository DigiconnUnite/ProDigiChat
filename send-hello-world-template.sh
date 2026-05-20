#!/bin/bash

# WhatsApp Graph API curl command to send "hello world" template
# Replace ACCESS_TOKEN with your actual access token from Meta

ACCESS_TOKEN="EAF1U73VMOCcBRSpN9BZAPW3KQRiQKHwZBYDvxtwhgHToi5tFriTwI8G49ZAkdcc5zsGv8vZBklEQ0ZB4CCWaJOZB26BWju9W68ZAXvMJPlqRsXUqDzBcghyCw3QCmZCZCuewtB3npVEpNhApTXTshE2buL03XQAXgiiQCLHkO0J13x1ctKDXdy719u1x19rbXFlhvyAZDZD"
PHONE_NUMBER_ID="1052530247944533"
RECIPIENT_NUMBER="919045468542"
WHATSAPP_BUSINESS_ACCOUNT_ID="937457282263611"

curl -X POST \
  "https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "'"${RECIPIENT_NUMBER}"'",
    "type": "template",
    "template": {
      "name": "hello_world",
      "language": {
        "code": "en_US"
      }
    }
  }'
