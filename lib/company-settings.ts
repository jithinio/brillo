import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export interface CompanySettings {
  id?: string
  user_id?: string
  company_name: string
  company_address?: string
  company_email?: string
  company_phone?: string
  company_website?: string
  company_logo?: string
  company_registration?: string
  default_currency: string
  tax_rate: number
  tax_name: string
  include_tax_in_prices: boolean
  auto_calculate_tax: boolean
  invoice_prefix: string
  invoice_template?: any // JSON object for invoice template settings
  created_at?: string
  updated_at?: string
}

export async function getCompanySettings(): Promise<CompanySettings | null> {
  try {
    if (!isSupabaseConfigured()) {
      console.log('Supabase not configured, using mock data')
      return null
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('Authentication error:', authError)
      return null
    }
    
    if (!user) {
      console.log('No authenticated user found')
      return null
    }

    // Get the most recent record if multiple exist
    const { data: dataArray, error } = await supabase
      .from('company_settings')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
    
    const data = dataArray && dataArray.length > 0 ? dataArray[0] : null

    if (error) {
      console.error('Error fetching company settings:', error)
      return null
    }

    return data
  } catch (err) {
    console.error('Unexpected error in getCompanySettings:', err)
    return null
  }
}

export async function upsertCompanySettings(settings: Partial<CompanySettings>): Promise<CompanySettings | null> {
  try {
    if (!isSupabaseConfigured()) {
      console.log('Supabase not configured, cannot save settings')
      return null
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('Authentication error:', authError)
      return null
    }
    
    if (!user) {
      console.log('No authenticated user found')
      return null
    }

    // Check if settings already exist (get the most recent one)
    const { data: existingArray } = await supabase
      .from('company_settings')
      .select('id')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
    
    const existingSettings = existingArray && existingArray.length > 0 ? existingArray[0] : null

    const settingsData = {
      ...settings,
      user_id: user.id,
      updated_at: new Date().toISOString()
    }

    let result
    if (existingSettings) {
      // Update all existing settings for this user (handles duplicates)
      result = await supabase
        .from('company_settings')
        .update(settingsData)
        .eq('user_id', user.id)
        .select()
      
      // If update succeeded, return the most recent record
      if (result.data && result.data.length > 0) {
        // Sort by updated_at to get the most recent
        const sortedData = result.data.sort((a, b) => 
          new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
        )
        return sortedData[0]
      }
    } else {
      // Insert new settings
      result = await supabase
        .from('company_settings')
        .insert({ ...settingsData, created_at: new Date().toISOString() })
        .select()
        .single()
        
      if (result.error) {
        console.error('Error inserting company settings:', result.error)
        return null
      }
      
      return result.data
    }

    if (result.error) {
      console.error('Error upserting company settings:', result.error)
      return null
    }

    return null
  } catch (err) {
    console.error('Unexpected error in upsertCompanySettings:', err)
    return null
  }
}

export async function updateCompanyLogo(logoUrl: string): Promise<boolean> {
  try {
    if (!isSupabaseConfigured()) {
      console.log('Supabase not configured, cannot update logo')
      return false
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('Authentication error:', authError)
      return false
    }
    
    if (!user) {
      console.log('No authenticated user found')
      return false
    }

    // Update all existing records for this user (handles duplicates)
    const { error } = await supabase
      .from('company_settings')
      .update({
        company_logo: logoUrl,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    if (error) {
      console.error('Error updating company logo:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('Unexpected error in updateCompanyLogo:', err)
    return false
  }
}

export async function uploadCompanyLogo(file: File): Promise<string | null> {
  try {
    if (!isSupabaseConfigured()) {
      console.log('Supabase not configured, cannot upload logo')
      return null
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('Authentication error:', authError)
      return null
    }
    
    if (!user) {
      console.log('No authenticated user found')
      return null
    }

    const fileExt = file.name.split('.').pop()
    const timestamp = Date.now()
    const fileName = `${user.id}/company-logo-${timestamp}.${fileExt}`

    const { data, error } = await supabase.storage
      .from('company-assets')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (error) {
      console.error('Error uploading company logo:', error)
      return null
    }

    const { data: { publicUrl } } = supabase.storage
      .from('company-assets')
      .getPublicUrl(fileName)

    return publicUrl
  } catch (err) {
    console.error('Unexpected error in uploadCompanyLogo:', err)
    return null
  }
} 