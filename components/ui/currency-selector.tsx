"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CURRENCIES, getCurrencyConfig } from "@/lib/currency"

interface CurrencySelectorProps {
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  compact?: boolean // For narrow containers
}

export function CurrencySelector({
  value,
  onValueChange,
  placeholder = "Select currency...",
  disabled = false,
  className,
  compact = false
}: CurrencySelectorProps) {
  const [open, setOpen] = useState(false)

  const selectedCurrency = value ? CURRENCIES[value] : null

  const sortedCurrencies = Object.values(CURRENCIES).sort((a, b) => {
    // Prioritize most common currencies globally
    const priority = [
      'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', // Major global currencies
      'CNY', 'INR', 'SGD', 'HKD', 'AED', 'SAR', 'NZD' // Major emerging markets & others
    ]
    
    const aIndex = priority.indexOf(a.code)
    const bIndex = priority.indexOf(b.code)
    
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex
    }
    if (aIndex !== -1) return -1
    if (bIndex !== -1) return 1
    
    return a.name.localeCompare(b.name)
  })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {selectedCurrency ? (
              compact ? (
                <>
                  <span className="font-medium text-sm">{selectedCurrency.symbol}</span>
                  <span className="font-medium text-sm truncate">{selectedCurrency.code}</span>
                </>
              ) : (
                <>
                  <span className="font-medium">{selectedCurrency.symbol}</span>
                  <span>{selectedCurrency.code}</span>
                  <span className="text-muted-foreground truncate">({selectedCurrency.name})</span>
                </>
              )
            ) : (
              <>
                <DollarSign className="h-4 w-4 shrink-0" />
                <span className="truncate">{compact ? "Currency" : placeholder}</span>
              </>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search currencies..." />
          <CommandEmpty>No currency found.</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {sortedCurrencies.map((currency) => (
                <CommandItem
                  key={currency.code}
                  value={currency.code}
                  onSelect={(currentValue) => {
                    // Don't allow deselecting currency - always keep a valid value
                    if (currentValue !== value) {
                      onValueChange(currentValue.toUpperCase())
                    }
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === currency.code ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex items-center gap-2">
                    <span className="font-medium min-w-[2ch]">{currency.symbol}</span>
                    <span className="font-medium">{currency.code}</span>
                    <span className="text-muted-foreground">({currency.name})</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}