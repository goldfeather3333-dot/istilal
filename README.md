# PlagaiScans

A comprehensive document plagiarism and AI detection platform using advanced similarity analysis.

## 📚 Documentation

For complete documentation, see [DOCUMENTATION.md](./DOCUMENTATION.md).

### Quick Links

| Section | Description |
|---------|-------------|
| [Overview](./DOCUMENTATION.md#overview) | Platform introduction and key features |
| [User Roles](./DOCUMENTATION.md#user-roles) | Customer, Staff, and Admin capabilities |
| [Pages & Routes](./DOCUMENTATION.md#pages--routes) | Complete navigation guide |
| [Database Schema](./DOCUMENTATION.md#database-schema) | Tables and relationships |
| [Edge Functions](./DOCUMENTATION.md#edge-functions) | Serverless functions documentation |
| [Security & RLS Policies](./DOCUMENTATION.md#security--rls-policies) | Authentication and row-level security |
| [Integrations](./DOCUMENTATION.md#integrations) | WhatsApp, Email setup |
| [UI Components](./DOCUMENTATION.md#ui-components) | Component library overview |
| [Routes Summary](./DOCUMENTATION.md#routes-summary) | All application routes |

## 🚀 Quick Start

```bash
# Clone and install
npm install

# Start development server
npm run dev
```

## 🔑 Key Features

### For Customers
- Upload documents for plagiarism checking
- View AI detection results
- Download detailed PDF reports
- Track document processing status
- Manage credit balance

### For Staff
- Process assigned documents
- Upload similarity and AI reports
- Track personal performance metrics
- View completed work history

### For Admins
- Full system oversight
- User and staff management
- Pricing configuration
- Analytics and revenue tracking
- Email and notification management

## 🛠️ Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Lovable Cloud (Supabase)
- **Email**: SendPulse SMTP
- **Payments**: Crypto (NOWPayments), Manual verification

## 📁 Project Structure

```
src/
├── components/     # Reusable UI components
├── contexts/       # React contexts (Auth, Cart)
├── hooks/          # Custom hooks
├── pages/          # Page components
├── integrations/   # Supabase client
└── lib/            # Utilities
```

## 📞 Support

For support, contact: support@plagaiscans.com

---

**Operated by Goldfeather Prem Ltd (UK) | Built with Lovable**
