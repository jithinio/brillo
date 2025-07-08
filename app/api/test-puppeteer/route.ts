import { NextRequest, NextResponse } from 'next/server'
import { createBrowser } from '@/lib/pdf-browser'

export async function GET() {
  try {
    console.log('🧪 Testing Puppeteer with environment-specific configuration...')
    
    const browser = await createBrowser()
    const page = await browser.newPage()
    
    await page.setContent(`
      <html>
        <body>
          <h1>Test PDF Generation</h1>
          <p>Environment: ${process.env.NODE_ENV}</p>
          <p>Platform: ${process.platform}</p>
          <p>Architecture: ${process.arch}</p>
          <p>Node Version: ${process.version}</p>
          <p>Working Directory: ${process.cwd()}</p>
        </body>
      </html>
    `)
    
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