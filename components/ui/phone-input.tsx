"use client"

import * as React from "react"
import { ChevronDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { countries, type Country } from "@/lib/countries"

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string
  onChange?: (value: string) => void
  onCountryChange?: (country: Country) => void
  selectedCountry?: Country
  placeholder?: string
  className?: string
  id?: string
}

export function PhoneInput({
  value = "",
  onChange,
  onCountryChange,
  selectedCountry,
  placeholder = "Enter phone number",
  className,
  id,
  ...props
}: PhoneInputProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [phoneNumber, setPhoneNumber] = React.useState("")
  const [currentCountry, setCurrentCountry] = React.useState<Country>(
    selectedCountry || countries.find(c => c.code === 'US') || countries[0]
  )
  const prevValueRef = React.useRef(value)
  const [isInitialized, setIsInitialized] = React.useState(false)

  // Helper function to detect country from phone number
  const detectCountryFromPhone = React.useCallback((phoneValue: string): Country | null => {
    if (!phoneValue) return null
    
    console.log('🔍 PhoneInput: Detecting country for:', phoneValue)
    
    // Remove any non-digit characters except +
    const cleanPhone = phoneValue.replace(/[^\d+]/g, '')
    console.log('🔍 PhoneInput: Clean phone:', cleanPhone)
    
    // Handle different phone number formats
    let phoneToCheck = cleanPhone
    if (!phoneToCheck.startsWith('+') && phoneToCheck.length > 0) {
      phoneToCheck = '+' + phoneToCheck
    }
    
    // Try to match country codes (sorted by length desc to match longer codes first)
    const sortedCountries = [...countries].sort((a, b) => b.phoneCode.length - a.phoneCode.length)
    
    for (const country of sortedCountries) {
      const phoneCode = country.phoneCode.replace(/[^\d]/g, '') // Remove + and spaces
      
      // Try multiple matching patterns
      if (phoneToCheck.startsWith(`+${phoneCode}`) || 
          cleanPhone.startsWith(phoneCode) ||
          cleanPhone.startsWith(`+${phoneCode}`)) {
        console.log('✅ PhoneInput: Country matched:', country.name)
        return country
      }
    }
    
    console.log('❌ PhoneInput: No country matched')
    return null
  }, [])

  // Helper function to extract phone number without country code
  const extractPhoneNumber = React.useCallback((phoneValue: string, country: Country): string => {
    if (!phoneValue || !country) return phoneValue || ""
    
    console.log('🔧 PhoneInput: Extracting phone number from:', phoneValue, 'for country:', country.name)
    
    const cleanPhone = phoneValue.replace(/[^\d+]/g, '')
    const phoneCode = country.phoneCode.replace(/[^\d]/g, '')
    
    console.log('🔧 PhoneInput: Clean phone:', cleanPhone, 'Phone code:', phoneCode)
    
    let result = phoneValue
    
    if (cleanPhone.startsWith(`+${phoneCode}`)) {
      result = cleanPhone.substring(phoneCode.length + 1) // +1 for the +
    } else if (cleanPhone.startsWith(phoneCode)) {
      result = cleanPhone.substring(phoneCode.length)
    } else {
      // If no match, try to extract anything after the country code pattern
      const phoneCodePattern = new RegExp(`^\\+?${phoneCode}[\\s\\-\\(\\)]*`)
      const withoutCode = phoneValue.replace(phoneCodePattern, '')
      result = withoutCode || phoneValue
    }
    
    console.log('🔧 PhoneInput: Extracted number:', result)
    return result
  }, [])

  // Initialize phone number from value prop on mount
  React.useEffect(() => {
    if (!isInitialized) {
      console.log('📞 PhoneInput: Initial mount with value:', value)
      
      if (value) {
        const detectedCountry = detectCountryFromPhone(value)
        console.log('📞 PhoneInput: Detected country on mount:', detectedCountry?.name, detectedCountry?.phoneCode)
        
        if (detectedCountry) {
          setCurrentCountry(detectedCountry)
          const phoneWithoutCode = extractPhoneNumber(value, detectedCountry)
          console.log('📞 PhoneInput: Phone without code on mount:', phoneWithoutCode)
          setPhoneNumber(phoneWithoutCode)
        } else {
          console.log('📞 PhoneInput: No country detected on mount, using value as-is:', value)
          setPhoneNumber(value)
        }
      } else {
        console.log('📞 PhoneInput: Mounting with empty value')
        setPhoneNumber("")
      }
      
      setIsInitialized(true)
      prevValueRef.current = value
    }
  }, [value, isInitialized, detectCountryFromPhone, extractPhoneNumber])

  // Handle value changes after initialization
  React.useEffect(() => {
    if (isInitialized && value !== prevValueRef.current) {
      console.log('📞 PhoneInput: Value changed from', prevValueRef.current, 'to', value)
      
      if (value) {
        const detectedCountry = detectCountryFromPhone(value)
        console.log('📞 PhoneInput: Detected country:', detectedCountry?.name, detectedCountry?.phoneCode)
        
        if (detectedCountry) {
          setCurrentCountry(detectedCountry)
          const phoneWithoutCode = extractPhoneNumber(value, detectedCountry)
          console.log('📞 PhoneInput: Phone without code:', phoneWithoutCode)
          setPhoneNumber(phoneWithoutCode)
        } else {
          console.log('📞 PhoneInput: No country detected, using value as-is:', value)
          setPhoneNumber(value)
        }
      } else {
        console.log('📞 PhoneInput: Resetting to empty state')
        setPhoneNumber("")
      }
      
      prevValueRef.current = value
    }
  }, [value, isInitialized, detectCountryFromPhone, extractPhoneNumber])

  React.useEffect(() => {
    if (selectedCountry) {
      setCurrentCountry(selectedCountry)
    }
  }, [selectedCountry])

  React.useEffect(() => {
    // Only call onChange if the component is initialized and phone number was changed by user input
    if (isInitialized && phoneNumber && onChange) {
      const fullNumber = `${currentCountry.phoneCode} ${phoneNumber}`.trim()
      // Don't call onChange if this matches the current value (avoid loops)
      if (fullNumber !== value && fullNumber !== prevValueRef.current) {
        console.log('📞 PhoneInput: Calling onChange with:', fullNumber)
        onChange(fullNumber)
      }
    }
  }, [currentCountry, phoneNumber, onChange, value, isInitialized])

  const handleCountrySelect = React.useCallback((country: Country) => {
    setCurrentCountry(country)
    onCountryChange?.(country)
    setOpen(false)
    setSearchQuery("")
  }, [onCountryChange])

  const handlePhoneChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setPhoneNumber(newValue)
  }, [])

  const filteredCountries = React.useMemo(() => {
    if (!searchQuery) return countries.slice(0, 20) // Show first 20 countries by default
    return countries.filter(country => 
      country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.phoneCode.includes(searchQuery)
    ).slice(0, 20)
  }, [searchQuery])

  return (
    <div className={cn("flex relative", className)}>
      <Popover open={open} onOpenChange={setOpen} modal={true}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[80px] h-9 justify-between border-r-0 rounded-r-none px-3 py-1 text-base bg-transparent shadow-sm hover:bg-transparent hover:border-ring focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm"
          >
            <span className="text-sm font-medium">{currentCountry.phoneCode}</span>
            <ChevronDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0 max-h-[300px]" align="start">
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder="Search countries..." 
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <div className="max-h-60 overflow-y-auto">
              <CommandList className="max-h-60 overflow-y-auto">
                <CommandEmpty>No country found.</CommandEmpty>
                <CommandGroup>
                  {filteredCountries.map((country) => (
                    <CommandItem
                      key={country.code}
                      value={`${country.name} ${country.code} ${country.phoneCode}`}
                      onSelect={() => handleCountrySelect(country)}
                      className="flex items-center space-x-2"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{country.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {country.code} • {country.phoneCode}
                        </div>
                      </div>
                      {currentCountry.code === country.code && (
                        <div className="w-2 h-2 bg-primary rounded-full" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </div>
          </Command>
        </PopoverContent>
      </Popover>
      <Input
        {...props}
        type="tel"
        id={id}
        value={phoneNumber}
        onChange={handlePhoneChange}
        placeholder={placeholder}
        className="flex-1 h-9 rounded-l-none"
      />
      {/* Debug info */}
      <div className="absolute -bottom-6 left-0 text-xs text-muted-foreground">
        Input: {phoneNumber} | Country: {currentCountry.phoneCode} | Initialized: {isInitialized ? 'Yes' : 'No'}
      </div>
    </div>
  )
} 