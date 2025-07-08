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
    console.log('- __dirname:', __dirname)
    console.log('- process.env.LAMBDA_TASK_ROOT:', process.env.LAMBDA_TASK_ROOT)
    console.log('- process.env.VERCEL:', process.env.VERCEL)
    
    // Try to list relevant directories for debugging
    try {
      const fs = await import('fs')
      const path = await import('path')
      
      const dirsToCheck = [
        process.cwd(),
        '/var/task',
        '/opt/nodejs',
        path.join(process.cwd(), 'node_modules'),
        path.join(process.cwd(), '.next'),
      ]
      
      for (const dir of dirsToCheck) {
        try {
          if (fs.existsSync(dir)) {
            console.log(`📁 Directory exists: ${dir}`)
            const contents = fs.readdirSync(dir)
            console.log(`   Contents: ${contents.slice(0, 5).join(', ')}${contents.length > 5 ? '...' : ''}`)
            
            // Look for chromium specifically
            if (contents.includes('node_modules')) {
              const nodeModulesPath = path.join(dir, 'node_modules')
              const nmContents = fs.readdirSync(nodeModulesPath)
              const chromiumDirs = nmContents.filter(item => item.includes('chromium'))
              if (chromiumDirs.length > 0) {
                console.log(`   Chromium-related dirs: ${chromiumDirs.join(', ')}`)
              }
            }
          }
        } catch (e) {
          console.log(`❌ Cannot access directory: ${dir}`)
        }
      }
    } catch (e) {
      console.log('❌ Error during directory inspection:', e)
    }
    
    let executablePath
    
    // First, try the standard chromium.executablePath()
    try {
      executablePath = await chromium.executablePath()
      console.log('✅ Chromium executable path resolved via standard method:', executablePath)
      
      // Verify the file exists
      const fs = await import('fs')
      if (fs.existsSync(executablePath)) {
        console.log('✅ Chromium executable file confirmed to exist')
      } else {
        console.log('❌ Chromium executable file does not exist at resolved path')
        executablePath = null
      }
    } catch (pathError) {
      console.error('❌ Failed to resolve Chromium executable path via standard method:', pathError)
      executablePath = null
    }
    
    // If standard method failed, try manual path resolution
    if (!executablePath) {
      console.log('🔄 Attempting manual Chromium path resolution...')
      
      const fs = await import('fs')
      const path = await import('path')
      
      // Comprehensive list of possible paths for different serverless environments
      const possiblePaths = [
        // Vercel-specific paths
        '/var/task/node_modules/@sparticuz/chromium/bin/chromium',
        '/var/task/.next/server/chunks/chromium',
        '/var/task/.next/server/app/chromium',
        path.join(process.cwd(), 'node_modules/@sparticuz/chromium/bin/chromium'),
        path.join(process.cwd(), '.next/server/chunks/chromium'),
        
        // AWS Lambda paths
        '/opt/nodejs/node_modules/@sparticuz/chromium/bin/chromium',
        '/var/runtime/node_modules/@sparticuz/chromium/bin/chromium',
        
        // pnpm specific paths
        '/var/task/node_modules/.pnpm/@sparticuz+chromium@137.0.1/node_modules/@sparticuz/chromium/bin/chromium',
        path.join(process.cwd(), 'node_modules/.pnpm/@sparticuz+chromium@137.0.1/node_modules/@sparticuz/chromium/bin/chromium'),
        
        // Generic fallbacks
        path.join(__dirname, '../../../node_modules/@sparticuz/chromium/bin/chromium'),
        path.join(__dirname, '../../node_modules/@sparticuz/chromium/bin/chromium'),
        path.join(__dirname, '../node_modules/@sparticuz/chromium/bin/chromium'),
      ]
      
      console.log('🔍 Checking paths:')
      for (const possiblePath of possiblePaths) {
        console.log(`   Checking: ${possiblePath}`)
        try {
          if (fs.existsSync(possiblePath)) {
            executablePath = possiblePath
            console.log('✅ Found Chromium at:', possiblePath)
            break
          } else {
            console.log('   ❌ Not found')
          }
        } catch (e) {
          console.log('   ❌ Error checking path:', (e as Error).message)
        }
      }
    }
    
    // If still no path found, try to use system chromium as last resort
    if (!executablePath) {
      console.log('🔄 Attempting to use system chromium...')
      const systemPaths = [
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
      ]
      
      const fs = await import('fs')
      for (const systemPath of systemPaths) {
        try {
          if (fs.existsSync(systemPath)) {
            executablePath = systemPath
            console.log('✅ Using system chromium at:', systemPath)
            break
          }
        } catch (e) {
          console.log('❌ System path not accessible:', systemPath)
        }
      }
    }
    
    if (!executablePath) {
      // Final attempt: try to trigger chromium binary extraction
      console.log('🔄 Final attempt: triggering chromium binary extraction...')
      try {
        // This might trigger the binary extraction
        await chromium.executablePath()
        executablePath = await chromium.executablePath()
        console.log('✅ Chromium extracted successfully:', executablePath)
      } catch (e) {
        console.error('❌ Failed to extract chromium binary:', e)
        
        // Try alternative extraction method using font()
        console.log('🔄 Alternative extraction: using chromium.font()...')
        try {
          await chromium.font('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap')
          executablePath = await chromium.executablePath()
          console.log('✅ Chromium extracted via font() method:', executablePath)
        } catch (fontError) {
          console.error('❌ Font extraction method also failed:', fontError)
          throw new Error(`Could not find or extract Chromium executable. Environment: ${process.env.VERCEL ? 'Vercel' : 'Unknown'}, Platform: ${process.platform}, Arch: ${process.arch}. Original error: ${e}`)
        }
      }
    }
    
    console.log('🚀 Launching browser with executable:', executablePath)
    
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