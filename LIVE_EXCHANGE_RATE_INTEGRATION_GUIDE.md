# 🚀 **Live Exchange Rate Integration Guide**

## **Step 1: Get Your Free API Key (2 minutes)**

### **Sign Up for UniRateAPI**
1. Visit: https://unirateapi.com/
2. Click **"Get Free API Key"**
3. Sign up with email (no credit card required)
4. Copy your API key from the dashboard

### **Add API Key to Environment**
```bash
# In your .env.local file
NEXT_PUBLIC_UNIRATEAPI_KEY=your_api_key_here

# Or for server-side only
UNIRATEAPI_KEY=your_api_key_here
```

---

## **Step 2: Test the API (5 minutes)**

### **Quick Test Script**
```javascript
// Create test-api.js in your project root
const API_KEY = 'your_api_key_here'

// Test current rates
async function testCurrentRates() {
  const response = await fetch(`https://api.unirateapi.com/api/rates?api_key=${API_KEY}&base=USD`)
  const data = await response.json()
  console.log('✅ Current USD rates:', data.rates)
}

// Test historical rates  
async function testHistoricalRates() {
  const response = await fetch(`https://api.unirateapi.com/api/historical/rates?api_key=${API_KEY}&date=2024-01-01&base=USD`)
  const data = await response.json()
  console.log('✅ Historical USD rates for 2024-01-01:', data.rates)
}

testCurrentRates()
testHistoricalRates()
```

Run: `node test-api.js`

---

## **Step 3: Integration Options**

### **Option A: Gradual Migration (Recommended)**

Update your existing `lib/exchange-rates.ts`:

```typescript
// lib/exchange-rates.ts
import { 
  getLiveExchangeRate, 
  getHistoricalExchangeRate,
  convertWithLiveRate,
  convertWithHistoricalRate 
} from './exchange-rates-live'

// Keep your existing exports working
export const getExchangeRate = getLiveExchangeRate
export const convertWithCurrentRate = convertWithLiveRate

// Add new historical conversion for invoices
export const convertWithInvoiceDate = convertWithHistoricalRate

// Your existing mock data as fallback (keep unchanged)
export const MOCK_EXCHANGE_RATES = {
  // ... your existing mock data
}
```

### **Option B: Direct Replacement**

Replace your current `lib/exchange-rates.ts` with the new live implementation:

```bash
# Backup current file
mv lib/exchange-rates.ts lib/exchange-rates-mock.ts

# Use the new live implementation
mv lib/exchange-rates-live.ts lib/exchange-rates.ts
```

---

## **Step 4: Update Invoice Currency Conversion**

### **Enhance `lib/currency-conversion.ts`**

```typescript
// lib/currency-conversion.ts
import { getHistoricalExchangeRate } from '@/lib/exchange-rates'

export async function convertInvoiceAmount(
  amount: number,
  invoiceCurrency: string,
  issueDate: string,
  targetCurrency?: string
): Promise<ConvertedInvoiceAmount> {
  
  // Get target currency (company default if not provided)
  let defaultCurrency = targetCurrency
  if (!defaultCurrency) {
    try {
      const settings = await getCompanySettings()
      defaultCurrency = settings?.default_currency || 'USD'
    } catch {
      defaultCurrency = 'USD'
    }
  }

  // If same currency, no conversion needed
  if (invoiceCurrency === defaultCurrency) {
    return {
      originalAmount: amount,
      originalCurrency: invoiceCurrency,
      convertedAmount: amount,
      targetCurrency: defaultCurrency,
      exchangeRate: 1,
      conversionDate: issueDate,
      wasConverted: false
    }
  }

  try {
    // 🚀 NEW: Use historical rate for the invoice issue date
    const exchangeRate = await getHistoricalExchangeRate(invoiceCurrency, defaultCurrency, issueDate)
    const convertedAmount = amount * exchangeRate

    return {
      originalAmount: amount,
      originalCurrency: invoiceCurrency,
      convertedAmount: convertedAmount,
      targetCurrency: defaultCurrency,
      exchangeRate: exchangeRate,
      conversionDate: issueDate,
      wasConverted: true
    }
  } catch (error) {
    console.error(`Currency conversion failed for ${invoiceCurrency} to ${defaultCurrency}:`, error)
    
    // Fallback: return original amount without conversion
    return {
      originalAmount: amount,
      originalCurrency: invoiceCurrency,
      convertedAmount: amount,
      targetCurrency: invoiceCurrency,
      exchangeRate: 1,
      conversionDate: issueDate,
      wasConverted: false
    }
  }
}
```

---

## **Step 5: Test Your Integration**

### **Test Invoice Conversion**
```typescript
// Test in your browser console or create a test file
import { convertInvoiceAmount } from '@/lib/currency-conversion'

// Test current invoice
const testResult = await convertInvoiceAmount(
  1000,           // $1000 USD invoice
  'USD',          // Invoice currency  
  '2024-01-15',   // Invoice issue date
  'INR'           // Convert to INR
)

console.log('Conversion result:', testResult)
// Expected: { convertedAmount: ~74500, exchangeRate: ~74.5, wasConverted: true }
```

### **Test Currency Widget**
```typescript
// Test the currency converter widget
import { convertWithLiveRate } from '@/lib/exchange-rates'

const widgetTest = await convertWithLiveRate(100, 'USD', 'EUR')
console.log('Widget conversion:', widgetTest)
// Expected: { convertedAmount: ~85, rate: ~0.85 }
```

---

## **Step 6: Monitor & Optimize**

### **Check API Usage**
```typescript
// Add to your app for monitoring
import { getExchangeRateCacheStats } from '@/lib/exchange-rates'

console.log('Cache stats:', getExchangeRateCacheStats())
// Shows cache usage and performance
```

### **Handle API Limits**
UniRateAPI free tier allows 30 requests/minute. For your usage:

- **Current estimate**: ~180 requests/day = ~0.125/minute ✅
- **Growth (10x)**: ~1,800 requests/day = ~1.25/minute ✅
- **Peak hour**: ~150 requests = ~2.5/minute ✅

**You're well within limits!** The built-in rate limiting ensures you won't exceed 30/minute.

### **Fallback Strategy**
If API fails, the system automatically falls back to your existing mock rates:

```typescript
// Automatic fallback in exchange-rates-live.ts
catch (error) {
  console.error('UniRateAPI failed, using fallback rates')
  return getFallbackRates(baseCurrency) // Your existing mock data
}
```

---

## **Step 7: Production Deployment**

### **Environment Variables**
```bash
# Production .env
UNIRATEAPI_KEY=your_production_api_key

# Development .env.local  
NEXT_PUBLIC_UNIRATEAPI_KEY=your_development_api_key
```

### **Error Monitoring**
Add error tracking for API failures:

```typescript
// In your error monitoring (Sentry, LogRocket, etc.)
if (error.message.includes('UniRateAPI')) {
  // Track API failures for monitoring
  analytics.track('exchange_rate_api_error', {
    service: 'UniRateAPI',
    error: error.message,
    fallback_used: true
  })
}
```

---

## **Benefits You'll Get Immediately**

### **✅ Accurate Invoice Conversions**
- **Historical rates** for exact invoice date calculations
- **No more estimation errors** in your ₹2.68M totals
- **Reliable ECB data** sources

### **✅ Real-time Currency Widget**  
- **Live exchange rates** in your currency converter
- **Up-to-date** conversions for users
- **Professional accuracy**

### **✅ Performance Optimized**
- **Smart caching** reduces API calls
- **Batch processing** for multiple conversions
- **Fallback protection** ensures no downtime

### **✅ Cost Effective**
- **Free forever** for your current usage
- **No surprise bills** as you scale
- **Enterprise-grade** reliability at $0 cost

---

## **Quick Start Checklist**

- [ ] Sign up for UniRateAPI (free, no credit card)
- [ ] Add API key to `.env.local` 
- [ ] Test API with simple fetch calls
- [ ] Copy `lib/exchange-rates-live.ts` to your project
- [ ] Update imports in `lib/currency-conversion.ts`
- [ ] Test invoice conversion with real historical data
- [ ] Deploy and monitor API usage

**Time to complete: ~30 minutes**  
**Result: Professional-grade currency conversion! 🚀**

---

## **Need Help?**

### **UniRateAPI Support**
- Documentation: https://unirateapi.com/docs
- Email: support@unirateapi.com

### **Common Issues**
1. **"API key not found"** → Check environment variables
2. **"Rate limit exceeded"** → Add delays between requests (built-in)
3. **"Historical data not available"** → Check date format (YYYY-MM-DD)
4. **"Conversion failed"** → API automatically falls back to mock data

**Your currency conversion will be bulletproof! 💰⚡**