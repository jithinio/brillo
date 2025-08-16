"use client"

import { HugeiconsIcon } from '@hugeicons/react';
import { useState, useEffect, useCallback, useRef } from "react"
import { CancelIcon, ArrowUpDownIcon, CopyIcon, MoveIcon } from '@hugeicons/core-free-icons'
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CurrencySelector } from "@/components/ui/currency-selector"
import { formatCurrency, CURRENCIES } from "@/lib/currency"
import { convertWithLiveRate } from "@/lib/exchange-rates-live"
import { getCompanySettings } from "@/lib/company-settings"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface CurrencyConverterWidgetProps {
  isOpen: boolean
  onClose: () => void
  defaultToCurrency?: string
}

interface Position {
  x: number
  y: number
}

const POSITION_KEY = 'currency-converter-position'

export function CurrencyConverterWidget({
  isOpen,
  onClose,
  defaultToCurrency
}: CurrencyConverterWidgetProps) {
  const [position, setPosition] = useState<Position>({ x: 100, y: 100 })
  const [fromAmount, setFromAmount] = useState("")
  const [fromCurrency, setFromCurrency] = useState("USD")
  const [toCurrency, setToCurrency] = useState("EUR")
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null)
  const [isConverting, setIsConverting] = useState(false)
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const widgetRef = useRef<HTMLDivElement>(null)

  // Load position from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedPosition = localStorage.getItem(POSITION_KEY)
        if (savedPosition) {
          const parsed = JSON.parse(savedPosition)
          setPosition(parsed)
        } else {
          // Default position: center-right of screen
          const defaultX = Math.max(50, window.innerWidth - 400)
          const defaultY = Math.max(50, (window.innerHeight - 280) / 2)
          setPosition({ x: defaultX, y: defaultY })
        }
      } catch {
        // Failed to load saved position
      }
    }
  }, [])

  // Load default "to" currency from company settings
  useEffect(() => {
    if (isOpen) {
      loadDefaultToCurrency()
    }
  }, [isOpen, defaultToCurrency])

  const loadDefaultToCurrency = async () => {
    try {
      if (defaultToCurrency) {
        setToCurrency(defaultToCurrency)
      } else {
        const settings = await getCompanySettings()
        if (settings?.default_currency) {
          setToCurrency(settings.default_currency)
        }
      }
    } catch (error) {
      console.error('Failed to load default currency:', error)
    }
  }

  // Save position to localStorage
  const savePosition = useCallback((newPosition: Position) => {
    try {
      localStorage.setItem(POSITION_KEY, JSON.stringify(newPosition))
    } catch {
      // Failed to save position
    }
  }, [])



  // Handle conversion
  const handleConvert = useCallback(async () => {
    if (!fromAmount || isNaN(Number(fromAmount)) || fromCurrency === toCurrency) {
      setConvertedAmount(null)
      setExchangeRate(null)
      return
    }

    console.log(`💱 Currency Widget: Converting ${fromAmount} ${fromCurrency} → ${toCurrency}`)
    setIsConverting(true)
    try {
      const amount = parseFloat(fromAmount)
      const result = await convertWithLiveRate(amount, fromCurrency, toCurrency)
      
      console.log(`💱 Currency Widget: Conversion result:`, result)
      setConvertedAmount(result.convertedAmount)
      setExchangeRate(result.rate)
    } catch (error) {
      console.error('❌ Currency Widget: Conversion failed:', error)
      toast.error('Failed to convert currency')
    } finally {
      setIsConverting(false)
    }
  }, [fromAmount, fromCurrency, toCurrency])

  // Auto-convert when inputs change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (fromAmount && fromCurrency && toCurrency) {
        handleConvert()
      }
    }, 500) // Debounce conversion

    return () => clearTimeout(timer)
  }, [fromAmount, fromCurrency, toCurrency, handleConvert])

  // Swap currencies
  const handleSwapCurrencies = () => {
    const tempCurrency = fromCurrency
    setFromCurrency(toCurrency)
    setToCurrency(tempCurrency)
    
    // Swap amounts if we have a converted amount
    if (convertedAmount && fromAmount) {
      setFromAmount(convertedAmount.toString())
    }
  }

  // Copy converted amount to clipboard
  const handleCopyAmount = async () => {
    if (convertedAmount) {
      try {
        const formattedAmount = formatCurrency(convertedAmount, toCurrency)
        await navigator.clipboard.writeText(formattedAmount)
        toast.success('Copied to clipboard')
      } catch (error) {
        toast.error('Failed to copy to clipboard')
      }
    }
  }

  // Manual drag handlers (using mouse events instead of @dnd-kit for floating widget)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!widgetRef.current) return
    
    const rect = widgetRef.current.getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
    setIsDragging(true)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return
    
    const newPosition = {
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    }
    
    // Constrain to viewport - allow full screen usage
    const maxX = window.innerWidth - 380 // widget width (updated for wider currency selectors)
    const maxY = window.innerHeight - 280 // widget height (reduced for better screen usage)
    
    newPosition.x = Math.max(0, Math.min(maxX, newPosition.x))
    newPosition.y = Math.max(0, Math.min(maxY, newPosition.y))
    
    setPosition(newPosition)
  }, [isDragging, dragOffset])

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false)
      savePosition(position)
    }
  }, [isDragging, position, savePosition])

  // Add global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  if (!isOpen) return null

  return (
    <div 
      ref={widgetRef}
      className="fixed z-50"
      style={{ 
        left: position.x,
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
    >
      <Card className="w-[360px] shadow-xl border bg-background/95 backdrop-blur-sm rounded-xl overflow-hidden">
        <CardHeader 
          className="py-3 px-3 cursor-grab active:cursor-grabbing border-b bg-gradient-to-r from-background to-muted/30"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={MoveIcon} className="h-4 w-4 text-muted-foreground/60"  />
              <h3 className="font-medium text-sm text-foreground/90">Currency Converter</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors"
              onClick={onClose}
            >
              <HugeiconsIcon icon={CancelIcon} className="h-3.5 w-3.5"  />
            </Button>
          </div>
        </CardHeader>
          
          <CardContent className="p-4 space-y-3">
            {/* From Currency */}
            <div className="space-y-1.5">
              <Label htmlFor="from-amount" className="text-xs font-medium text-muted-foreground">From</Label>
              <div className="flex gap-2">
                <Input
                  id="from-amount"
                  type="number"
                  placeholder="0.00"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  className="flex-1 h-9 rounded-lg border-muted-foreground/20 focus:border-primary"
                />
                <CurrencySelector
                  value={fromCurrency}
                  onValueChange={setFromCurrency}
                  className="w-[120px] h-9"
                  compact
                />
              </div>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center -mb-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSwapCurrencies}
                className="h-6 w-6 p-0 rounded-full border-muted-foreground/20 hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <HugeiconsIcon icon={ArrowUpDownIcon} className="h-3 w-3"  />
              </Button>
            </div>

            {/* To Currency */}
            <div className="space-y-1.5">
              <Label htmlFor="to-amount" className="text-xs font-medium text-muted-foreground">To</Label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    id="to-amount"
                    value={convertedAmount ? formatCurrency(convertedAmount, toCurrency) : ""}
                    readOnly
                    placeholder={isConverting ? "Converting..." : "0.00"}
                    className={cn(
                      "pr-8 h-9 rounded-lg border-muted-foreground/20",
                      convertedAmount && "font-medium text-green-600 bg-green-50/50"
                    )}
                  />
                  {convertedAmount && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-0.5 h-7 w-7 p-0 hover:bg-green-100 rounded-md"
                      onClick={handleCopyAmount}
                    >
                      <HugeiconsIcon icon={CopyIcon} className="h-3 w-3"  />
                    </Button>
                  )}
                </div>
                <CurrencySelector
                  value={toCurrency}
                  onValueChange={setToCurrency}
                  className="w-[120px] h-9"
                  compact
                />
              </div>
            </div>

            {/* Exchange Rate */}
            {exchangeRate && (
              <div className="text-xs text-muted-foreground text-center py-1 bg-muted/30 rounded-md">
                1 {fromCurrency} = {exchangeRate.toFixed(6)} {toCurrency}
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  )
}