"use client"

import * as React from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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

interface CountrySelectProps {
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function CountrySelect({
  value,
  onValueChange,
  placeholder = "Select country",
  className,
  disabled
}: CountrySelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  const selectedCountry = React.useMemo(() => {
    if (!value) return undefined
    return countries.find(country => 
      country.code === value || 
      country.name.toLowerCase() === value.toLowerCase()
    )
  }, [value])

  const filteredCountries = React.useMemo(() => {
    if (!searchQuery) return countries.slice(0, 50) // Show first 50 countries by default
    return countries.filter(country => 
      country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.code.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 50)
  }, [searchQuery])

  const handleSelect = React.useCallback((countryCode: string) => {
    onValueChange?.(countryCode)
    setOpen(false)
    setSearchQuery("")
  }, [onValueChange])

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
              <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full h-9 justify-between px-3 py-1 text-base bg-transparent shadow-sm hover:bg-transparent hover:border-ring focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm",
              !selectedCountry && "text-muted-foreground",
              className
            )}
            disabled={disabled}
          >
            {selectedCountry ? selectedCountry.name : placeholder}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[350px] p-0 max-h-[300px]" align="start">
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
                      value={`${country.name} ${country.code}`}
                      onSelect={() => handleSelect(country.code)}
                      className="flex items-center space-x-2"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{country.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {country.code} • {country.phoneCode}
                        </div>
                      </div>
                      {selectedCountry?.code === country.code && (
                        <Check className="h-4 w-4" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </div>
          </Command>
        </PopoverContent>
    </Popover>
  )
} 