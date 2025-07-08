import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const isProduction = process.env.NODE_ENV === 'production'
    console.log('🧪 Testing Puppeteer with environment:', isProduction ? 'production' : 'development')
    
    let browser
    
    if (isProduction) {
      // Production: Use puppeteer-core + @sparticuz/chromium for serverless
      const puppeteer = (await import('puppeteer-core')).default
      const chromium = (await import('@sparticuz/chromium')).default
      
      browser = await puppeteer.launch({
        args: [
          ...chromium.args,
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security'
        ],
        executablePath: await chromium.executablePath(),
        headless: true,
        timeout: 30000
      })
    } else {
      // Development: Use regular puppeteer
      const puppeteer = (await import('puppeteer')).default
      
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security'
        ],
        timeout: 30000
      })
    }
    
    const page = await browser.newPage()
    await page.setContent('<html><body><h1>Test PDF Generation</h1><p>Environment: ' + (isProduction ? 'Production' : 'Development') + '</p></body></html>')
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
    })
    
    await browser.close()
    
    console.log('✅ Puppeteer test successful!')
    
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="test.pdf"',
      },
    })
    
  } catch (error) {
    console.error('❌ Puppeteer test failed:', error)
    return NextResponse.json(
      { 
        error: 'Puppeteer test failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
} 