export async function createBrowser() {
  const isProduction = process.env.NODE_ENV === 'production'
  console.log('🌍 Environment:', isProduction ? 'production' : 'development')
  
  if (isProduction) {
    // Production: Use puppeteer-core + @sparticuz/chromium for serverless
    const puppeteer = (await import('puppeteer-core')).default
    const chromium = (await import('@sparticuz/chromium')).default
    
    console.log('🔍 Chromium debugging info:')
    console.log('- Platform:', process.platform)
    console.log('- Architecture:', process.arch)
    console.log('- Node version:', process.version)
    console.log('- Working directory:', process.cwd())
    
    let executablePath
    try {
      executablePath = await chromium.executablePath()
      console.log('✅ Chromium executable path resolved:', executablePath)
    } catch (pathError) {
      console.error('❌ Failed to resolve Chromium executable path:', pathError)
      // Try alternative approach for pnpm/serverless environments
      console.log('🔄 Attempting alternative Chromium path resolution...')
      
      // Check if we can find the chromium binary in common locations
      const fs = await import('fs')
      const path = await import('path')
      
      const possiblePaths = [
        '/opt/nodejs/node_modules/@sparticuz/chromium/bin/chromium',
        '/var/task/node_modules/@sparticuz/chromium/bin/chromium',
        path.join(process.cwd(), 'node_modules/@sparticuz/chromium/bin/chromium'),
        path.join(__dirname, '../../../node_modules/@sparticuz/chromium/bin/chromium'),
      ]
      
      for (const possiblePath of possiblePaths) {
        try {
          if (fs.existsSync(possiblePath)) {
            executablePath = possiblePath
            console.log('✅ Found Chromium at:', possiblePath)
            break
          }
        } catch (e) {
          console.log('❌ Path not found:', possiblePath)
        }
      }
      
      if (!executablePath) {
        throw new Error('Could not find Chromium executable. Please check @sparticuz/chromium installation.')
      }
    }
    
    return await puppeteer.launch({
      args: [
        ...chromium.args,
        // Essential serverless flags
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--single-process'
      ],
      executablePath: executablePath,
      headless: true,
      timeout: 30000,
      protocolTimeout: 30000,
      ignoreDefaultArgs: ['--disable-extensions'],
      defaultViewport: {
        width: 794,
        height: 1123,
        deviceScaleFactor: 1
      }
    })
  } else {
    // Development: Use regular puppeteer
    const puppeteer = (await import('puppeteer')).default
    
    return await puppeteer.launch({
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
} 