# Polar.sh Migration Guide

This guide documents the migration from Stripe to Polar.sh for payment processing in the Brillo application.

## Overview

We've successfully migrated the payment infrastructure from Stripe to Polar.sh. The migration includes:
- Checkout sessions
- Subscription management
- Webhooks
- Customer portal
- Database schema updates

## Configuration

### Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Polar Configuration
POLAR_ACCESS_TOKEN=your_polar_access_token
POLAR_ORGANIZATION_ID=your_polar_org_id
POLAR_PRO_MONTHLY_PRODUCT_ID=your_monthly_product_id
POLAR_PRO_YEARLY_PRODUCT_ID=your_yearly_product_id
POLAR_WEBHOOK_SECRET=your_webhook_secret
POLAR_SANDBOX=false # Set to true for testing

# Public URL for webhooks and redirects
NEXT_PUBLIC_URL=https://your-domain.com
```

### Database Migration

Run the following SQL migration to add Polar fields to your database:

```sql
-- Add Polar fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS polar_customer_id TEXT,
ADD COLUMN IF NOT EXISTS polar_subscription_id TEXT;

-- Create indexes for Polar IDs
CREATE INDEX IF NOT EXISTS idx_profiles_polar_customer_id ON profiles(polar_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_polar_subscription_id ON profiles(polar_subscription_id);
```

## Setting up Polar

1. **Create a Polar Account**
   - Sign up at [polar.sh](https://polar.sh)
   - Create your organization

2. **Create Products**
   - Create a monthly subscription product
   - Create a yearly subscription product
   - Note down the product IDs

3. **Configure Webhooks**
   - Add webhook endpoint: `https://app.brillo.so/api/polar/webhook` (or your domain)
   - Select the following events:
     - `subscription.created`
     - `subscription.updated`
     - `subscription.canceled`
     - `checkout.created`
     - `checkout.updated`
     - `order.created`
     - `customer.state_changed` (if available)

4. **Get API Credentials**
   - Generate an API access token
   - Note down your organization ID
   - Copy the webhook secret

## Feature Comparison

| Feature | Stripe | Polar |
|---------|--------|-------|
| Checkout | ✅ Custom checkout page | ✅ Hosted checkout |
| Subscriptions | ✅ Full management | ✅ Full management |
| Customer Portal | ✅ Stripe-hosted | ✅ Polar-hosted |
| Webhooks | ✅ Extensive events | ✅ Essential events |
| License Keys | ❌ Not available | ✅ Built-in support |
| Digital Downloads | ❌ Not available | ✅ Built-in support |
| GitHub Integration | ❌ Not available | ✅ Native integration |

## Migration Steps

1. **Install Dependencies**
   ```bash
   npm install @polar-sh/sdk @polar-sh/nextjs
   ```

2. **Update Environment Variables**
   - Add all Polar configuration variables
   - Keep Stripe variables for rollback capability

3. **Run Database Migration**
   - Apply the SQL migration to add Polar fields

4. **Deploy Application**
   - The application automatically uses Polar when configured
   - Feature flag `USE_POLAR` is set to `true` by default

5. **Test Integration**
   - Create test subscriptions
   - Verify webhook handling
   - Test customer portal access

## API Endpoints

The following endpoints have been updated or added:

- `/api/polar-checkout` - Creates Polar checkout sessions
- `/api/polar/webhook` - Handles Polar webhooks
- `/api/polar/manage` - Manages subscriptions (cancel, resume, portal)
- `/api/polar/sync` - Syncs subscription status from Polar

The existing Stripe endpoints redirect to Polar endpoints when `USE_POLAR` is enabled.

## Rollback Plan

If you need to rollback to Stripe:

1. Set `USE_POLAR` to `false` in `/lib/config/environment.ts`
2. Ensure Stripe environment variables are configured
3. Redeploy the application

## Support

For issues with the Polar integration:
- Check the [Polar documentation](https://docs.polar.sh)
- Review webhook logs in your Polar dashboard
- Check application logs for integration errors

## Future Enhancements

Consider leveraging these Polar features:
- License key generation for software products
- Digital file distribution
- GitHub repository access management
- Custom checkout fields
- Advanced analytics
