# ProDigiChat - WhatsApp Marketing Tool

A comprehensive WhatsApp marketing platform for managing contacts, campaigns, and messaging at scale.

## Features

- **Contact Management**: Import, organize, and segment contacts with custom tags and attributes
- **Campaign Management**: Create and manage broadcast campaigns with templates
- **Inbox**: Real-time chat interface for 1-on-1 WhatsApp conversations
- **Segments**: Create dynamic segments for targeted campaigns
- **Analytics**: Track message delivery, read rates, and campaign performance
- **Multi-Organization Support**: Manage multiple organizations with role-based access control
- **WhatsApp Integration**: Connect multiple WhatsApp Business accounts
- **Billing**: Usage-based pricing with multiple plan tiers

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: MongoDB
- **Authentication**: NextAuth.js (Google OAuth, Credentials)
- **State Management**: Zustand
- **Caching**: Upstash Redis
- **Real-time**: Socket.io
- **Testing**: Jest

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB instance
- Upstash Redis account (for caching)
- Meta Developer account (for WhatsApp Business API)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Configure your `.env.local` with:
   - `MONGODB_URI`: MongoDB connection string
   - `NEXTAUTH_SECRET`: NextAuth secret key
   - `NEXTAUTH_URL`: Application URL
   - `UPSTASH_REDIS_REST_URL`: Upstash Redis URL
   - `UPSTASH_REDIS_REST_TOKEN`: Upstash Redis token
   - `WHATSAPP_WEBHOOK_VERIFY_TOKEN`: Webhook verification token

5. Initialize the database:
   ```bash
   npm run db:push
   ```

6. Run the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   └── landing/           # Landing page
├── components/            # React components
├── lib/                   # Utility libraries
├── services/              # Business logic layer
├── repositories/          # Data access layer
├── middleware/            # Error handling middleware
├── store/                 # Zustand state management
├── types/                 # TypeScript type definitions
└── __tests__/             # Test files
```

## Architecture

### Service Layer Pattern
- **Services**: Business logic (`ContactService`, `CampaignService`)
- **Repositories**: Data access (`ContactRepository`, `BaseRepository`)
- **API Routes**: HTTP handlers that use services

### Data Model Consistency
- Tags are stored as JSON arrays
- Message content is stored as JSON objects
- Custom attributes are stored as JSON objects
- Utility functions in `src/types/common.ts` handle parsing/stringifying

### Caching Strategy
- Analytics data cached for 5 minutes
- Organization-specific cache keys
- Automatic cache invalidation on updates

### Real-time Updates
- Socket.io for inbox message broadcasting
- WebSocket integration for live updates

## API Endpoints

### Contacts
- `GET /api/contacts` - List contacts with filtering
- `POST /api/contacts` - Create new contact
- `PUT /api/contacts` - Update contact
- `DELETE /api/contacts` - Delete contact

### Campaigns
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns` - Create campaign
- `PUT /api/campaigns/[id]` - Update campaign
- `POST /api/campaigns/[id]/launch` - Launch campaign

### Inbox
- `GET /api/inbox` - Get conversations/messages
- `POST /api/inbox` - Send message
- `PATCH /api/inbox` - Mark messages as read

### Segments
- `GET /api/segments` - List segments
- `POST /api/segments` - Create segment
- `DELETE /api/segments/[id]` - Delete segment

### Analytics
- `GET /api/analytics` - Get analytics data (cached)

### Billing
- `GET /api/settings/billing` - Get billing info with usage
- `PUT /api/settings/billing` - Update billing plan

### Webhooks
- `POST /api/webhooks/whatsapp` - WhatsApp webhook handler
- `GET /api/webhooks/whatsapp` - Webhook verification

## Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Deployment

### Vercel
1. Connect your repository to Vercel
2. Configure environment variables
3. Deploy

### Manual Deployment
```bash
npm run build
npm start
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | Yes |
| `NEXTAUTH_SECRET` | NextAuth secret | Yes |
| `NEXTAUTH_URL` | Application URL | Yes |
| `UPSTASH_REDIS_REST_URL` | Redis URL | No |
| `UPSTASH_REDIS_REST_TOKEN` | Redis token | No |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Webhook verification | Yes |

## License

MIT
