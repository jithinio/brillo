# Polar Billing Flow Audit

## Complete User Journey

### 1. User Clicks "Upgrade" (Pricing Page)
**File**: `components/providers/subscription-provider.tsx`
```javascript
const upgrade = async (planId: string) => {
  const checkoutUrl = `${baseUrl}/api/polar-checkout?plan=${planId}&uid=${user.id}`
  window.location.href = checkoutUrl
}
```

### 2. Checkout Route Processing
**File**: `app/api/polar-checkout/route.ts`
- Receives: `?plan=pro_monthly&uid=USER_ID`
- Fetches user profile and email from Supabase
- Maps plan to Polar product ID
- Creates checkout URL with proper parameters:
  - `products`: Product UUID
  - `customerEmail`: User's email
  - `customerExternalId`: Supabase user ID
  - `metadata`: JSON with userId

### 3. Polar Checkout Handler
**Uses**: `@polar-sh/nextjs` Checkout handler
- Redirects to Polar's hosted checkout page
- Success URL: `/dashboard?upgrade=success`

### 4. After Successful Payment
**Webhook**: `POST /api/polar/webhook`
- Polar sends webhook events
- `customer.state_changed` event updates user subscription in database

### 5. Subscription Sync
**File**: `app/api/polar/sync/route.ts`
- Called when user visits subscription management
- Fetches latest subscription status from Polar
- Updates local database

## Common Issues & Solutions

### Issue 1: "500 Internal Server Error" on Checkout
**Causes**:
1. Missing product IDs in environment variables
2. Invalid product ID format
3. Polar API authentication failure

**Debug Steps**:
1. Check `/api/debug/polar-config` (dev only)
2. Verify env vars are set:
   ```
   POLAR_ACCESS_TOKEN=polar_at_xxx
   POLAR_PRO_MONTHLY_PRODUCT_ID=uuid-here
   POLAR_PRO_YEARLY_PRODUCT_ID=uuid-here
   ```

### Issue 2: SDK Validation Errors
**Error**: `SDKValidationError: Response validation failed`
**Solution**: We now fallback to raw API calls when SDK validation fails

### Issue 3: Subscription Not Syncing
**Causes**:
1. Customer ID mismatch between Polar and database
2. Organization ID not set correctly
3. API token permissions

**Debug**:
1. Check console logs for customer ID matching
2. Verify webhook events are being received
3. Use `customer.state_changed` webhook for most reliable sync

## Environment Variables Required

```bash
# Polar Configuration
POLAR_ACCESS_TOKEN=polar_at_xxx  # From Polar dashboard
POLAR_WEBHOOK_SECRET=xxx         # From webhook settings
POLAR_ORGANIZATION_ID=xxx        # Your org UUID
NEXT_PUBLIC_POLAR_ORGANIZATION_ID=xxx  # Same as above

# Product IDs (from Polar dashboard)
POLAR_PRO_MONTHLY_PRODUCT_ID=xxx  # Monthly plan UUID
POLAR_PRO_YEARLY_PRODUCT_ID=xxx   # Yearly plan UUID

# Optional
POLAR_SANDBOX=false              # Set to true for testing
```

## Testing Checklist

- [ ] Product IDs are valid UUIDs from Polar dashboard
- [ ] Access token has correct permissions
- [ ] Webhook URL is configured in Polar: `https://yourdomain.com/api/polar/webhook`
- [ ] Customer external ID links to Supabase user ID
- [ ] Success redirect URL is accessible

## Key Files

1. **Checkout**: `/app/api/polar-checkout/route.ts`
2. **Webhooks**: `/app/api/polar/webhook/route.ts`
3. **Sync**: `/app/api/polar/sync/route.ts`
4. **Portal**: `/app/api/polar/portal/route.ts`
5. **Client**: `/lib/polar-client.ts`
6. **Provider**: `/components/providers/subscription-provider.tsx`

## Debugging Tips

1. **Enable verbose logging**: Check browser console and server logs
2. **Test in sandbox**: Set `POLAR_SANDBOX=true` for testing
3. **Verify webhooks**: Use Polar dashboard to view webhook delivery status
4. **Check customer state**: The `customer.state_changed` webhook provides complete data

## Migration from Stripe

The system uses feature flags to switch between Stripe and Polar:
- `FEATURE_FLAGS.USE_POLAR = true` in `/lib/config/environment.ts`
- All endpoints check this flag and route accordingly
- Database has both `stripe_*` and `polar_*` fields for gradual migration
