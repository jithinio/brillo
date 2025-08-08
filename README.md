# 🚀 Brillo - Modern Business Management Platform

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)
[![Next.js](https://img.shields.io/badge/Next.js-15.3.5-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20DB-green?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Stripe](https://img.shields.io/badge/Stripe-Payments-purple?style=for-the-badge&logo=stripe)](https://stripe.com/)

> A comprehensive, modern business management platform built with Next.js 15, designed to streamline project management, client relationships, invoicing, and business analytics.

## ✨ Features Overview

### 🎯 **Core Business Management**
- **📊 Dashboard Analytics** - Real-time MRR, QRR, ARR tracking with interactive charts
- **👥 Client Management** - Complete client lifecycle with contact details and history
- **📈 Project Pipeline** - Visual drag-and-drop Kanban board for sales pipeline
- **🗂️ Project Management** - Track active, completed, on-hold, and cancelled projects
- **📧 Invoice Generation** - Professional invoice creation with custom templates
- **💰 Financial Tracking** - Revenue, expenses, and profit analysis

### 🔧 **Advanced Features**
- **📤 Data Import/Export** - CSV import for clients, projects, and invoices
- **📄 PDF Generation** - Professional invoice and report generation
- **🎨 Custom Invoice Templates** - Brandable invoice designs
- **💱 Multi-Currency Support** - Global currency conversion and tracking
- **📱 Responsive Design** - Mobile-first, modern UI with dark/light themes
- **🔍 Advanced Search** - Instant search across all entities
- **⚡ Real-time Updates** - Live data synchronization

### 💼 **Subscription Tiers**

#### 🆓 **Free Plan** - Forever Free
- ✅ Up to 10 clients
- ✅ Up to 20 projects  
- ✅ Basic pipeline tracking
- ✅ Basic reporting
- ✅ Community support
- ❌ No invoicing features

#### 🔥 **Pro Plan** - $10/month (Most Popular)
- ✅ **Everything in Free Plan**
- ✅ Unlimited clients & projects
- ✅ **Full invoicing suite**
- ✅ Custom invoice templates
- ✅ **Advanced analytics dashboard**
- ✅ Export capabilities
- ✅ Priority support
- ✅ API access

#### 💎 **Pro Yearly** - $8/month (billed annually)
- ✅ **Everything in Pro Monthly**
- ✅ **17% savings** (2 months free)
- ✅ Early access to new features
- ✅ Custom integrations
- ✅ Dedicated account manager

## 🏗️ Technical Architecture

### **Frontend Stack**
- **Framework**: Next.js 15.3.5 with App Router
- **Language**: TypeScript 5.8.3
- **Styling**: Tailwind CSS 4.1.11 with Radix UI components
- **State Management**: TanStack Query for server state
- **Charts**: Recharts for analytics visualization
- **Animations**: Framer Motion
- **Forms**: React Hook Form with Zod validation

### **Backend & Database**
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with Google OAuth
- **API**: Next.js API routes
- **File Storage**: Supabase Storage
- **Real-time**: Supabase Realtime subscriptions

### **Payments & Subscriptions**
- **Payment Processing**: Stripe
- **Subscription Management**: Custom subscription system
- **Usage Tracking**: Built-in limits and analytics

### **Development & Deployment**
- **Development**: Hot reload with concurrent webhook listening
- **Build**: Next.js production builds
- **Deployment**: Vercel
- **CI/CD**: GitHub integration
- **Monitoring**: Built-in performance tracking

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- Stripe account (for payments)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd brillo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   
   Create `.env.local` with the following variables:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   # Stripe Configuration
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   
   # Application URLs
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Database Setup**
   
   Set up your Supabase database with the required tables:
   - Users table with authentication
   - Clients, Projects, Invoices tables
   - Subscription tracking tables
   
   (Database schema available in Supabase dashboard)

5. **Start Development Server**
   ```bash
   # Standard development
   npm run dev
   
   # Development with Stripe webhooks
   npm run dev:all
   ```

   The application will be available at `http://localhost:3000`

### Development Scripts

```bash
# Development server
npm run dev

# Development with Stripe webhook listener
npm run dev:webhooks

# Development server + webhooks (concurrent)
npm run dev:all

# Production build
npm run build

# Start production server
npm run start

# Linting
npm run lint
```

## 📱 Application Structure

```
brillo/
├── app/                          # Next.js 15 App Router
│   ├── (auth)/                  # Authentication routes
│   │   ├── login/               # Login page
│   │   └── signup/              # Registration page
│   ├── api/                     # API routes
│   │   ├── stripe/              # Stripe webhooks & management
│   │   ├── generate-pdf/        # Invoice PDF generation
│   │   ├── usage/               # Usage tracking
│   │   └── feedback/            # User feedback
│   ├── dashboard/               # Main application
│   │   ├── analytics/           # Business analytics
│   │   ├── clients/             # Client management
│   │   ├── pipeline/            # Sales pipeline
│   │   ├── projects/            # Project management
│   │   ├── invoices/            # Invoice system
│   │   └── settings/            # User settings
│   └── pricing/                 # Subscription plans
├── components/                   # Reusable UI components
│   ├── ui/                      # Base UI components (Shadcn)
│   ├── gates/                   # Feature access controls
│   ├── providers/               # Context providers
│   └── table/                   # Generic data table system
├── lib/                         # Utility libraries
│   ├── types/                   # TypeScript definitions
│   ├── config/                  # Configuration files
│   └── utils/                   # Helper functions
└── hooks/                       # Custom React hooks
```

## 🔐 Authentication & Security

- **Supabase Authentication** with email/password and Google OAuth
- **Row Level Security (RLS)** for data protection
- **JWT-based sessions** with automatic refresh
- **Protected routes** with authentication middleware
- **Role-based access control** for features

## 💳 Subscription System

The platform includes a comprehensive subscription management system:

- **Free tier** with basic features and limits
- **Pro tiers** with advanced features and unlimited usage
- **Stripe integration** for secure payment processing
- **Usage tracking** and limit enforcement
- **Feature gates** that conditionally show/hide functionality
- **Upgrade/downgrade** flows with proration

## 📊 Analytics & Reporting

- **Financial Metrics**: MRR, QRR, ARR calculations
- **Revenue Tracking**: Monthly/quarterly/yearly breakdowns
- **Client Analytics**: Top paying clients, CLTV
- **Project Insights**: Pipeline conversion rates, project status tracking
- **Interactive Charts**: Line charts, bar charts, trend analysis
- **Export Capabilities**: Data export for external analysis

## 🎨 Design System

- **Modern UI**: Clean, professional interface
- **Dark/Light Themes**: System preference detection
- **Responsive Design**: Mobile-first approach
- **Accessibility**: WCAG compliance with proper ARIA labels
- **Component Library**: Radix UI + Tailwind CSS
- **Typography**: Multiple font options with web font optimization

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role | ✅ |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | ✅ |
| `STRIPE_SECRET_KEY` | Stripe secret key | ✅ |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | ✅ |
| `NEXT_PUBLIC_APP_URL` | Application base URL | ✅ |

### Stripe Webhook Setup

1. Create webhook endpoint in Stripe Dashboard
2. Point to: `https://yourdomain.com/api/stripe/webhook`
3. Select events: `customer.subscription.*`, `invoice.*`, `checkout.session.completed`
4. Copy webhook secret to environment variables

## 🚀 Deployment

### Vercel Deployment (Recommended)

1. **Connect GitHub repository** to Vercel
2. **Configure environment variables** in Vercel dashboard
3. **Deploy** - automatic deployments on git push
4. **Custom domain** configuration (optional)

### Manual Deployment

```bash
# Build for production
npm run build

# Start production server
npm run start
```

## 🧪 Development Workflow

### Code Structure
- **TypeScript everywhere** for type safety
- **Component-based architecture** with reusable UI components  
- **Custom hooks** for data fetching and state management
- **API routes** for backend functionality
- **Responsive design** patterns throughout

### Performance Optimizations
- **Image optimization** with Next.js Image component
- **Bundle splitting** and code splitting
- **Caching strategies** for API responses
- **Lazy loading** for components and routes
- **Database query optimization** with proper indexing

## 📈 Performance & Monitoring

- **Built-in performance monitoring** for subscription operations
- **Query optimization** with TanStack Query caching
- **Real-time updates** with Supabase subscriptions
- **Error boundaries** for graceful error handling
- **Loading states** and skeleton UIs for better UX

## 🔄 Data Management

### Import/Export Features
- **CSV imports** for clients, projects, and invoices
- **Data validation** and error handling during imports
- **Duplicate detection** and resolution
- **Bulk operations** for efficient data management
- **Export functionality** for data portability

### Currency Support
- **Multi-currency** project and invoice support
- **Real-time exchange rates** with caching
- **Currency conversion** widgets
- **Localized formatting** based on user preferences

## 🛠️ Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

- **Documentation**: Available in the `/docs` folder
- **Issues**: Create GitHub issues for bugs
- **Feature Requests**: Use GitHub discussions
- **Security**: Report security issues privately

---

**Built with ❤️ using Next.js, TypeScript, Supabase, and Stripe**