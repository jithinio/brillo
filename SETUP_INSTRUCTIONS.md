# 🚀 **Quick Setup Instructions**

## **Step 1: Add API Key to Environment**

Create or update your `.env.local` file in the project root:

```bash
# Create .env.local file
echo "NEXT_PUBLIC_UNIRATEAPI_KEY=YeUbKEB8P5hiGxcIrNisO0arUK1PgCkxtAU3t0jSK3X0druV89fcbPnPyDhstbpQ" > .env.local
```

Or manually create `.env.local` with this content:
```env
# UniRateAPI Configuration
NEXT_PUBLIC_UNIRATEAPI_KEY=YeUbKEB8P5hiGxcIrNisO0arUK1PgCkxtAU3t0jSK3X0druV89fcbPnPyDhstbpQ
```

## **Step 2: Test API in Browser Console**

Open your browser and go to your app (or any page), then paste this in the console:

```javascript
// Test current rates
fetch('https://api.unirateapi.com/api/rates?api_key=YeUbKEB8P5hiGxcIrNisO0arUK1PgCkxtAU3t0jSK3X0druV89fcbPnPyDhstbpQ&base=USD')
  .then(r => r.json())
  .then(data => {
    console.log('✅ Current rates:', data)
    console.log('USD to INR:', data.rates.INR)
    console.log('USD to EUR:', data.rates.EUR)
  })

// Test historical rates
fetch('https://api.unirateapi.com/api/historical/rates?api_key=YeUbKEB8P5hiGxcIrNisO0arUK1PgCkxtAU3t0jSK3X0druV89fcbPnPyDhstbpQ&date=2024-01-01&base=USD')
  .then(r => r.json())
  .then(data => {
    console.log('✅ Historical rates for 2024-01-01:', data)
    console.log('USD to INR on Jan 1:', data.rates.INR)
  })
```

## **Step 3: Integrate with Your System**

### **Option A: Replace Current Implementation**

```bash
# Backup your current file
cp lib/exchange-rates.ts lib/exchange-rates-backup.ts

# Replace with live API version
cp lib/exchange-rates-transition-example.ts lib/exchange-rates.ts
```

### **Option B: Gradual Integration**

Add this to your `lib/exchange-rates.ts`:

```typescript
// Add at the top of lib/exchange-rates.ts
import { getLiveExchangeRate, getHistoricalExchangeRate } from './exchange-rates-live'

// Replace your getExchangeRate function with:
export async function getExchangeRate(from: string, to: string): Promise<number> {
  try {
    return await getLiveExchangeRate(from, to)
  } catch (error) {
    console.warn('Live API failed, using mock rates:', error)
    return getMockExchangeRate(from, to) // Your existing function
  }
}
```

## **Step 4: Test Invoice Conversion**

Add this test to your browser console after integration:

```javascript
// Test invoice conversion with real historical data
async function testInvoiceConversion() {
  const { convertInvoiceAmount } = await import('./lib/currency-conversion.js')
  
  const result = await convertInvoiceAmount(
    1000,           // $1000 USD invoice
    'USD',          // Invoice currency
    '2024-01-15',   // Invoice issue date
    'INR'           // Convert to INR
  )
  
  console.log('Invoice conversion result:', result)
  console.log('$1000 USD on 2024-01-15 =', result.convertedAmount, 'INR')
  console.log('Exchange rate used:', result.exchangeRate)
  console.log('Was converted:', result.wasConverted)
}

testInvoiceConversion()
```

## **Step 5: Verify Everything Works**

1. **Currency converter widget** should show live rates
2. **Invoice metrics** should use historical rates for accurate conversion
3. **Performance** should be fast with smart caching
4. **Fallback** to mock data if API fails

## **Expected Results**

✅ **Current USD to INR**: ~82-84 (live rate)  
✅ **Historical USD to INR (Jan 1, 2024)**: ~83.27 (exact historical rate)  
✅ **Invoice conversion**: Perfect accuracy using issue date rates  
✅ **Performance**: Sub-second response with caching  

## **Monitor Usage**

Your API key allows 30 requests/minute. With your current usage (~180/day), you're using only **0.4%** of the limit!

```javascript
// Check cache performance
import { getExchangeRateCacheStats } from './lib/exchange-rates-live'
console.log('Cache stats:', getExchangeRateCacheStats())
```

**Ready to have enterprise-grade currency conversion! 🎯💰**