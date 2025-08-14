/**
 * Debug utilities for cache management
 */

export const debugCache = {
  // Check localStorage cache contents
  inspectLocalStorage: () => {
    console.log('📊 Cache Debug: Inspecting localStorage...')
    const keys = Object.keys(localStorage)
    const projectRelatedKeys = keys.filter(key => 
      key.includes('project') || 
      key.includes('analytics') || 
      key.includes('dashboard') ||
      key === 'analytics-data' ||
      key === 'unified-projects-data' ||
      key === 'dashboard-data'
    )
    
    console.log('Project-related localStorage keys:', projectRelatedKeys)
    
    projectRelatedKeys.forEach(key => {
      try {
        const data = localStorage.getItem(key)
        const parsed = data ? JSON.parse(data) : null
        console.log(`${key}:`, {
          exists: !!data,
          timestamp: parsed?.timestamp ? new Date(parsed.timestamp).toISOString() : 'No timestamp',
          dataSize: data?.length || 0,
          projectCount: parsed?.data?.projects?.length || 'N/A'
        })
      } catch (error) {
        console.log(`${key}: Error parsing`, error)
      }
    })
  },

  // Force clear all project-related cache
  forceClearAll: () => {
    console.log('🧹 Cache Debug: Force clearing all caches...')
    
    // Clear localStorage
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.includes('project') || 
          key.includes('analytics') || 
          key.includes('dashboard') ||
          key === 'analytics-data' ||
          key === 'unified-projects-data' ||
          key === 'dashboard-data') {
        localStorage.removeItem(key)
        console.log(`Cleared: ${key}`)
      }
    })
    
    console.log('✅ All project-related localStorage cleared')
    
    // Clear session storage as well
    const sessionKeys = Object.keys(sessionStorage)
    sessionKeys.forEach(key => {
      if (key.includes('project') || 
          key.includes('analytics') || 
          key.includes('dashboard')) {
        sessionStorage.removeItem(key)
        console.log(`Cleared session: ${key}`)
      }
    })
  },

  // Test if cache is actually cleared after deletion
  testCacheClear: () => {
    console.log('🧪 Cache Debug: Testing cache clear...')
    debugCache.inspectLocalStorage()
    
    // Check if browser has any cached responses
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        console.log('Available browser caches:', cacheNames)
        cacheNames.forEach(cacheName => {
          if (cacheName.includes('analytics') || cacheName.includes('project')) {
            console.log(`Found project-related cache: ${cacheName}`)
          }
        })
      })
    }
  },

  // Manually trigger analytics cache invalidation
  triggerAnalyticsInvalidation: () => {
    console.log('🔄 Cache Debug: Manually triggering analytics cache invalidation...')
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('project-cache-invalidated', {
        detail: { reason: 'manual debug trigger' }
      }))
    }
  },

  // Test complete cache invalidation
  testCompleteInvalidation: () => {
    console.log('🧪 Cache Debug: Testing complete cache invalidation...')
    
    // Step 1: Check current state
    console.log('Step 1: Current cache state:')
    debugCache.inspectLocalStorage()
    
    // Step 2: Clear caches
    console.log('Step 2: Clearing all caches...')
    debugCache.forceClearAll()
    
    // Step 3: Trigger analytics invalidation
    console.log('Step 3: Triggering analytics invalidation...')
    debugCache.triggerAnalyticsInvalidation()
    
    // Step 4: Check final state
    setTimeout(() => {
      console.log('Step 4: Final cache state:')
      debugCache.inspectLocalStorage()
    }, 1000)
  }
}

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).debugCache = debugCache
}
