"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getDefaultCurrency, getCurrencySymbol } from "@/lib/currency"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Save, Eye, Palette, Type, Layout, Image, Brush } from "lucide-react"
import { PageHeader, PageContent } from "@/components/page-header"
import { useSettings } from "@/components/settings-provider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface InvoiceTemplate {
  id: string
  name: string
  description: string
  preview: string
}

interface InvoiceLayout {
  id: string
  name: string
  description: string
  preview: string
}

const invoiceDesigns: InvoiceTemplate[] = [
  {
    id: "professional",
    name: "Professional",
    description: "Traditional business invoice with clean structure",
    preview: "Classic corporate layout with formal typography"
  },
  {
    id: "modern",
    name: "Modern",
    description: "Contemporary design with bold visual elements",
    preview: "Sleek gradients and modern typography"
  },
  {
    id: "creative",
    name: "Creative",
    description: "Unique design with artistic elements",
    preview: "Bold colors and creative visual accents"
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Clean and simple with focus on content",
    preview: "Ultra-clean with maximum whitespace"
  }
]

const invoiceTemplates: InvoiceTemplate[] = [
  {
    id: "corporate",
    name: "Corporate",
    description: "Professional blue theme with formal typography",
    preview: "Blue accent colors with serif headings"
  },
  {
    id: "elegant",
    name: "Elegant",
    description: "Sophisticated purple theme with refined fonts",
    preview: "Purple accents with elegant typography"
  },
  {
    id: "vibrant",
    name: "Vibrant",
    description: "Energetic orange theme with bold typography",
    preview: "Orange accents with dynamic fonts"
  },
  {
    id: "classic",
    name: "Classic",
    description: "Timeless gray theme with traditional fonts",
    preview: "Gray accents with classic typography"
  }
]

const invoiceLayouts: InvoiceLayout[] = [
  {
    id: "standard",
    name: "Standard",
    description: "Traditional layout with company info at top",
    preview: "Standard two-column layout"
  },
  {
    id: "compact",
    name: "Compact",
    description: "Space-efficient layout for shorter invoices",
    preview: "Compact single-column layout"
  },
  {
    id: "detailed",
    name: "Detailed",
    description: "Comprehensive layout with extra sections",
    preview: "Detailed multi-section layout"
  },
  {
    id: "creative",
    name: "Creative",
    description: "Unique layout with creative positioning",
    preview: "Creative asymmetrical layout"
  }
]

const fontFamilies = [
  { value: "inter", label: "Inter", class: "font-sans" },
  { value: "roboto", label: "Roboto", class: "font-sans" },
  { value: "playfair", label: "Playfair Display", class: "font-serif" },
  { value: "merriweather", label: "Merriweather", class: "font-serif" },
  { value: "jetbrains", label: "JetBrains Mono", class: "font-mono" },
  { value: "fira", label: "Fira Code", class: "font-mono" }
]

export default function CustomizeInvoicePage() {
  const { settings, isLoading } = useSettings()
  const [activeTab, setActiveTab] = useState("design")
  
  const [companyInfo, setCompanyInfo] = useState({
    companyName: "Your Company",
    companyAddress: "123 Business St, City, State 12345", 
    companyEmail: "contact@yourcompany.com",
    companyPhone: "+1 (555) 123-4567",
    companyWebsite: "",
  })
  
  const [template, setTemplate] = useState({
    // Basic settings
    logoUrl: "",
    logoWidth: [120], // Array for slider component
    currency: "USD",
    
    // Design, Template & Layout
    designId: "professional",
    templateId: "corporate",
    layoutId: "standard",
    
    // Colors - Apply template-specific colors
    primaryColor: "#1a1a1a",
    accentColor: "#3b82f6", // Corporate blue default
    textColor: "#1a1a1a",
    mutedTextColor: "#6b7280",
    backgroundColor: "#ffffff",
    
    // Typography
    fontFamily: "inter",
    baseFontSize: [14], // Array for slider
    headingFontSize: [32], // Array for slider
    titleFontSize: [24], // Array for slider
    
    // Advanced options
    borderRadius: [8], // Array for slider
    spacing: [20], // Array for slider
  })

  // Load company information from settings
  useEffect(() => {
    if (settings.companyName) {
      setCompanyInfo(prev => ({
        ...prev,
        companyName: settings.companyName
      }))
    }
    
    if (settings.companyLogo) {
      setTemplate(prev => ({ ...prev, logoUrl: settings.companyLogo }))
    }
  }, [settings])

  // Initialize currency from global setting
  useEffect(() => {
    const globalCurrency = getDefaultCurrency()
    setTemplate(prev => ({ ...prev, currency: globalCurrency }))
  }, [])

  // Update colors based on selected template
  useEffect(() => {
    const templateColors = {
      corporate: {
        accentColor: "#3b82f6",
        primaryColor: "#1e40af",
        textColor: "#1f2937",
        mutedTextColor: "#6b7280"
      },
      elegant: {
        accentColor: "#8b5cf6",
        primaryColor: "#7c3aed",
        textColor: "#1f2937",
        mutedTextColor: "#6b7280"
      },
      vibrant: {
        accentColor: "#f97316",
        primaryColor: "#ea580c",
        textColor: "#1f2937",
        mutedTextColor: "#6b7280"
      },
      classic: {
        accentColor: "#6b7280",
        primaryColor: "#374151",
        textColor: "#1f2937",
        mutedTextColor: "#6b7280"
      }
    }

    const colors = templateColors[template.templateId as keyof typeof templateColors]
    if (colors) {
      setTemplate(prev => ({ ...prev, ...colors }))
    }
  }, [template.templateId])

  const handleSaveTemplate = () => {
    try {
      localStorage.setItem('invoice-template', JSON.stringify(template))
      toast.success("Template saved successfully!")
    } catch (error) {
      toast.error("Failed to save template")
    }
  }

  const handlePreview = () => {
    // This would open a full preview modal or new window
    toast.info("Opening full preview...")
  }

  const getTemplateStyles = () => {
    const baseStyles = {
      fontFamily: template.fontFamily === 'inter' ? "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" : template.fontFamily,
      fontSize: `${template.baseFontSize[0]}px`,
      color: template.textColor,
      backgroundColor: template.backgroundColor,
      borderRadius: `${template.borderRadius[0]}px`,
      padding: `${Math.max(template.spacing[0], 20)}px`,
      margin: '0',
      lineHeight: '1.5',
    }

    // Apply design-specific styling
    switch (template.designId) {
      case "modern":
        return {
          ...baseStyles,
          background: `linear-gradient(135deg, ${template.backgroundColor} 0%, #fafbfc 100%)`,
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          border: `1px solid ${template.accentColor}20`,
          borderRadius: "12px",
        }
      case "minimal":
        return {
          ...baseStyles,
          backgroundColor: "#ffffff",
          border: "1px solid #f1f5f9",
          borderRadius: "6px",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
        }
      case "creative":
        return {
          ...baseStyles,
          background: `linear-gradient(135deg, ${template.backgroundColor} 0%, #f8fafc 100%)`,
          border: `2px solid ${template.accentColor}20`,
          borderRadius: "16px",
          boxShadow: "0 8px 16px rgba(0, 0, 0, 0.1)",
          position: "relative" as const,
        }
      case "professional":
      default: // Professional - Clean business design
        return {
          ...baseStyles,
          backgroundColor: "#ffffff",
          border: "1px solid #e6ebf1",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
        }
    }
  }

  const getLayoutStructure = () => {
    switch (template.layoutId) {
      case "compact":
        return "single-column"
      case "detailed":
        return "multi-section"
      case "creative":
        return "asymmetrical"
      default:
        return "two-column"
    }
  }

  return (
    <>
      <PageHeader
        title="Customize Invoice Template"
        breadcrumbs={[
          { label: "Invoices", href: "/dashboard/invoices" },
          { label: "Customize" }
        ]}
        action={
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={handlePreview}>
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            <Button size="sm" onClick={handleSaveTemplate}>
              <Save className="mr-2 h-4 w-4" />
              Save Template
            </Button>
          </div>
        }
      />
      <PageContent>
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="design" className="flex items-center gap-2">
                  <Brush className="h-4 w-4" />
                  Design
                </TabsTrigger>
                <TabsTrigger value="template" className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Template
                </TabsTrigger>
                <TabsTrigger value="layout" className="flex items-center gap-2">
                  <Layout className="h-4 w-4" />
                  Layout
                </TabsTrigger>
                <TabsTrigger value="branding" className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Branding
                </TabsTrigger>
                <TabsTrigger value="typography" className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  Typography
                </TabsTrigger>
                <TabsTrigger value="colors" className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Colors
                </TabsTrigger>
              </TabsList>

              <TabsContent value="design" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Invoice Design</CardTitle>
                    <CardDescription>Choose a complete design style for your invoices</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {invoiceDesigns.map((design) => (
                        <div
                          key={design.id}
                          className={`group cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${
                            template.designId === design.id
                              ? "border-primary bg-primary/5 shadow-md"
                              : "border-muted hover:border-primary/50"
                          }`}
                          onClick={() => setTemplate(prev => ({ ...prev, designId: design.id }))}
                        >
                          {/* Design Preview Thumbnail */}
                          <div className="mb-3 h-20 rounded-lg overflow-hidden relative"
                            style={{
                              background: design.id === 'professional' ? 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)' :
                                         design.id === 'modern' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' :
                                         design.id === 'creative' ? 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' :
                                         design.id === 'minimal' ? '#ffffff' : '#ffffff',
                              border: design.id === 'professional' ? '2px solid #e2e8f0' :
                                     design.id === 'modern' ? '2px solid #667eea' :
                                     design.id === 'creative' ? '2px solid #fc8181' :
                                     design.id === 'minimal' ? '1px solid #f1f5f9' : '1px solid #e6ebf1'
                            }}
                          >
                            <div className="p-3">
                              <div className="h-2 bg-current opacity-30 rounded mb-2"></div>
                              <div className="h-1 bg-current opacity-20 rounded mb-1"></div>
                              <div className="h-1 bg-current opacity-20 rounded w-3/4 mb-1"></div>
                              <div className="h-1 bg-current opacity-15 rounded w-1/2"></div>
                            </div>
                            <div className="absolute top-2 right-2">
                              <div className={`w-3 h-3 rounded-full ${
                                design.id === 'professional' ? 'bg-blue-600' :
                                design.id === 'modern' ? 'bg-purple-600' :
                                design.id === 'creative' ? 'bg-orange-500' :
                                design.id === 'minimal' ? 'bg-gray-400' : 'bg-slate-600'
                              }`}></div>
                            </div>
                          </div>

                          {/* Design Info */}
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-sm">{design.name}</h3>
                            {template.designId === design.id && (
                              <Badge variant="default" className="text-xs">Active</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{design.description}</p>
                          <div className="text-xs text-muted-foreground/80">{design.preview}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="template" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Color Templates</CardTitle>
                    <CardDescription>Choose a color theme and typography style</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {invoiceTemplates.map((tmpl) => (
                        <div
                          key={tmpl.id}
                          className={`group cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${
                            template.templateId === tmpl.id
                              ? "border-primary bg-primary/5 shadow-md"
                              : "border-muted hover:border-primary/50"
                          }`}
                          onClick={() => setTemplate(prev => ({ ...prev, templateId: tmpl.id }))}
                        >
                          {/* Template Preview Thumbnail */}
                          <div className="mb-3 h-20 rounded-lg overflow-hidden relative"
                            style={{
                              background: tmpl.id === 'corporate' ? 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)' :
                                         tmpl.id === 'elegant' ? 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)' :
                                         tmpl.id === 'vibrant' ? 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)' :
                                         tmpl.id === 'classic' ? 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)' : '#ffffff',
                              border: tmpl.id === 'corporate' ? '2px solid #3b82f6' :
                                     tmpl.id === 'elegant' ? '2px solid #8b5cf6' :
                                     tmpl.id === 'vibrant' ? '2px solid #f97316' :
                                     tmpl.id === 'classic' ? '2px solid #6b7280' : '1px solid #e6ebf1'
                            }}
                          >
                            <div className="p-3">
                              <div className="h-2 bg-current opacity-40 rounded mb-2"></div>
                              <div className="h-1 bg-current opacity-30 rounded mb-1"></div>
                              <div className="h-1 bg-current opacity-30 rounded w-3/4 mb-1"></div>
                              <div className="h-1 bg-current opacity-20 rounded w-1/2"></div>
                            </div>
                            <div className="absolute top-2 right-2">
                              <div className={`w-3 h-3 rounded-full ${
                                tmpl.id === 'corporate' ? 'bg-blue-600' :
                                tmpl.id === 'elegant' ? 'bg-purple-600' :
                                tmpl.id === 'vibrant' ? 'bg-orange-500' :
                                tmpl.id === 'classic' ? 'bg-gray-600' : 'bg-slate-600'
                              }`}></div>
                            </div>
                          </div>

                          {/* Template Info */}
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-sm">{tmpl.name}</h3>
                            {template.templateId === tmpl.id && (
                              <Badge variant="default" className="text-xs">Active</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{tmpl.description}</p>
                          <div className="text-xs text-muted-foreground/80">{tmpl.preview}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="layout" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Invoice Layout</CardTitle>
                    <CardDescription>Choose the layout structure for your invoices</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {invoiceLayouts.map((layout) => (
                        <div
                          key={layout.id}
                          className={`group cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${
                            template.layoutId === layout.id
                              ? "border-primary bg-primary/5 shadow-md"
                              : "border-muted hover:border-primary/50"
                          }`}
                          onClick={() => setTemplate(prev => ({ ...prev, layoutId: layout.id }))}
                        >
                          {/* Layout Preview Thumbnail */}
                          <div className="mb-3 h-20 rounded-lg overflow-hidden relative bg-gray-50"
                            style={{
                              border: '1px solid #e2e8f0'
                            }}
                          >
                            <div className="p-3">
                              {layout.id === 'standard' && (
                                <div className="grid grid-cols-2 gap-2 h-full">
                                  <div className="space-y-1">
                                    <div className="h-1 bg-gray-400 rounded"></div>
                                    <div className="h-1 bg-gray-300 rounded w-3/4"></div>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="h-1 bg-gray-400 rounded"></div>
                                    <div className="h-1 bg-gray-300 rounded w-1/2"></div>
                                  </div>
                                </div>
                              )}
                              {layout.id === 'compact' && (
                                <div className="space-y-1 text-center">
                                  <div className="h-1 bg-gray-400 rounded mx-auto w-1/2"></div>
                                  <div className="h-1 bg-gray-300 rounded mx-auto w-3/4"></div>
                                  <div className="h-1 bg-gray-300 rounded mx-auto w-1/2"></div>
                                </div>
                              )}
                              {layout.id === 'detailed' && (
                                <div className="space-y-1">
                                  <div className="h-1 bg-gray-400 rounded"></div>
                                  <div className="h-1 bg-gray-300 rounded w-3/4"></div>
                                  <div className="h-px bg-gray-200 rounded my-1"></div>
                                  <div className="h-1 bg-gray-300 rounded w-1/2"></div>
                                </div>
                              )}
                              {layout.id === 'creative' && (
                                <div className="relative h-full">
                                  <div className="absolute top-0 right-0 w-1/3 h-1 bg-gray-400 rounded"></div>
                                  <div className="absolute top-2 left-0 w-1/2 h-1 bg-gray-300 rounded"></div>
                                  <div className="absolute bottom-0 left-0 w-3/4 h-1 bg-gray-300 rounded"></div>
                                </div>
                              )}
                            </div>
                            <div className="absolute top-2 right-2">
                              <div className={`w-2 h-2 rounded-sm ${
                                layout.id === 'standard' ? 'bg-blue-500' :
                                layout.id === 'compact' ? 'bg-green-500' :
                                layout.id === 'detailed' ? 'bg-purple-500' :
                                layout.id === 'creative' ? 'bg-orange-500' : 'bg-gray-500'
                              }`}></div>
                            </div>
                          </div>

                          {/* Layout Info */}
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-sm">{layout.name}</h3>
                            {template.layoutId === layout.id && (
                              <Badge variant="default" className="text-xs">Active</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{layout.description}</p>
                          <div className="text-xs text-muted-foreground/80">{layout.preview}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="branding" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Company Information</CardTitle>
                    <CardDescription>
                      Company details are managed in Settings.
                      <a href="/dashboard/settings" className="text-primary hover:underline ml-1">
                        Update company information →
                      </a>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isLoading ? (
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded border bg-muted animate-pulse"></div>
                        <div className="text-sm text-muted-foreground">Loading...</div>
                      </div>
                    ) : template.logoUrl ? (
                      <div className="flex items-center space-x-3">
                        <img 
                          src={template.logoUrl} 
                          alt="Company Logo" 
                          className="object-contain rounded border"
                          style={{ width: `${template.logoWidth[0]}px`, height: 'auto' }}
                        />
                        <div className="text-sm text-muted-foreground">
                          <strong>Logo:</strong> Loaded from Settings
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        <strong>Logo:</strong> No logo uploaded yet
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label>Logo Width: {template.logoWidth[0]}px</Label>
                      <Slider
                        value={template.logoWidth}
                        onValueChange={(value) => setTemplate(prev => ({ ...prev, logoWidth: value }))}
                        max={300}
                        min={50}
                        step={10}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>50px</span>
                        <span>300px</span>
                      </div>
                    </div>

                    <div className="text-sm text-muted-foreground space-y-1">
                      <div><strong>Company:</strong> {companyInfo.companyName}</div>
                      <div><strong>Address:</strong> {companyInfo.companyAddress}</div>
                      <div><strong>Contact:</strong> {companyInfo.companyEmail} • {companyInfo.companyPhone}</div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="typography" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Typography</CardTitle>
                    <CardDescription>Customize fonts and text sizes</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label>Font Family</Label>
                      <Select
                        value={template.fontFamily}
                        onValueChange={(value) => setTemplate(prev => ({ ...prev, fontFamily: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {fontFamilies.map((font) => (
                            <SelectItem key={font.value} value={font.value}>
                              <span className={font.class}>{font.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Base Font Size: {template.baseFontSize[0]}px</Label>
                      <Slider
                        value={template.baseFontSize}
                        onValueChange={(value) => setTemplate(prev => ({ ...prev, baseFontSize: value }))}
                        max={20}
                        min={10}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Heading Font Size: {template.headingFontSize[0]}px</Label>
                      <Slider
                        value={template.headingFontSize}
                        onValueChange={(value) => setTemplate(prev => ({ ...prev, headingFontSize: value }))}
                        max={48}
                        min={18}
                        step={2}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Title Font Size: {template.titleFontSize[0]}px</Label>
                      <Slider
                        value={template.titleFontSize}
                        onValueChange={(value) => setTemplate(prev => ({ ...prev, titleFontSize: value }))}
                        max={32}
                        min={14}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="colors" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Color Scheme</CardTitle>
                    <CardDescription>Customize the colors used in your invoices</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Primary Color</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="color"
                            value={template.primaryColor}
                            onChange={(e) => setTemplate(prev => ({ ...prev, primaryColor: e.target.value }))}
                            className="w-12 h-10 p-1"
                          />
                          <Input
                            value={template.primaryColor}
                            onChange={(e) => setTemplate(prev => ({ ...prev, primaryColor: e.target.value }))}
                            className="font-mono text-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Accent Color</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="color"
                            value={template.accentColor}
                            onChange={(e) => setTemplate(prev => ({ ...prev, accentColor: e.target.value }))}
                            className="w-12 h-10 p-1"
                          />
                          <Input
                            value={template.accentColor}
                            onChange={(e) => setTemplate(prev => ({ ...prev, accentColor: e.target.value }))}
                            className="font-mono text-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Text Color</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="color"
                            value={template.textColor}
                            onChange={(e) => setTemplate(prev => ({ ...prev, textColor: e.target.value }))}
                            className="w-12 h-10 p-1"
                          />
                          <Input
                            value={template.textColor}
                            onChange={(e) => setTemplate(prev => ({ ...prev, textColor: e.target.value }))}
                            className="font-mono text-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Muted Text Color</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="color"
                            value={template.mutedTextColor}
                            onChange={(e) => setTemplate(prev => ({ ...prev, mutedTextColor: e.target.value }))}
                            className="w-12 h-10 p-1"
                          />
                          <Input
                            value={template.mutedTextColor}
                            onChange={(e) => setTemplate(prev => ({ ...prev, mutedTextColor: e.target.value }))}
                            className="font-mono text-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Background Color</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="color"
                            value={template.backgroundColor}
                            onChange={(e) => setTemplate(prev => ({ ...prev, backgroundColor: e.target.value }))}
                            className="w-12 h-10 p-1"
                          />
                          <Input
                            value={template.backgroundColor}
                            onChange={(e) => setTemplate(prev => ({ ...prev, backgroundColor: e.target.value }))}
                            className="font-mono text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Border Radius: {template.borderRadius[0]}px</Label>
                        <Slider
                          value={template.borderRadius}
                          onValueChange={(value) => setTemplate(prev => ({ ...prev, borderRadius: value }))}
                          max={20}
                          min={0}
                          step={1}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Spacing: {template.spacing[0]}px</Label>
                        <Slider
                          value={template.spacing}
                          onValueChange={(value) => setTemplate(prev => ({ ...prev, spacing: value }))}
                          max={40}
                          min={8}
                          step={2}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="lg:col-span-3">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Live Preview</CardTitle>
                <CardDescription>See how your invoice will look with current settings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <div className="w-full max-w-2xl">
                    <div 
                      key={`${template.designId}-${template.templateId}-${template.layoutId}`}
                      className="bg-white border rounded-lg shadow-lg overflow-hidden transition-all duration-300"
                      style={{
                        minHeight: '600px',
                        ...getTemplateStyles()
                      }}
                    >
                  {/* Design-Specific Accents */}
                  {template.designId === 'creative' && (
                    <div 
                      className="absolute top-0 left-0 w-full h-1"
                      style={{ backgroundColor: template.accentColor }}
                    />
                  )}
                  {template.designId === 'modern' && (
                    <div 
                      className="absolute top-0 left-0 w-full h-2"
                      style={{ 
                        background: `linear-gradient(90deg, ${template.accentColor} 0%, ${template.accentColor}80 100%)`,
                        borderBottom: '1px solid #d1d5db'
                      }}
                    />
                  )}
                  {template.designId === 'professional' && (
                    <div 
                      className="absolute top-0 right-0 w-32 h-32 opacity-5"
                      style={{ 
                        background: `linear-gradient(135deg, ${template.accentColor} 0%, transparent 100%)`,
                        borderRadius: '0 0 0 100%'
                      }}
                    />
                  )}
                  {template.designId === 'minimal' && (
                    <div 
                      className="absolute top-4 right-4 w-20 h-20 opacity-10"
                      style={{ 
                        background: `radial-gradient(circle, ${template.accentColor} 0%, transparent 70%)`,
                        borderRadius: '50%'
                      }}
                    />
                  )}
                  
                  {/* Invoice Header */}
                  <div className="mb-8">
                    {template.layoutId === 'compact' ? (
                      // Compact Layout - Redesigned
                      <div className="space-y-8">
                        {/* Header with Logo and Company */}
                        <div className="flex items-center justify-center gap-6">
                          {template.logoUrl && (
                            <div className="flex-shrink-0">
                              <img 
                                src={template.logoUrl} 
                                alt="Company Logo" 
                                className="object-contain rounded-lg"
                                style={{ width: `${template.logoWidth[0] * 0.6}px`, height: 'auto' }}
                              />
                            </div>
                          )}
                          <div className="text-center">
                            <h1 
                              className="font-bold leading-tight mb-2"
                              style={{ 
                                color: template.primaryColor,
                                fontSize: `${template.titleFontSize[0] * 1.1}px`,
                                fontWeight: template.templateId === 'modern' ? '700' : '600'
                              }}
                            >
                              {companyInfo.companyName}
                            </h1>
                            <div 
                              className="text-sm"
                              style={{ 
                                color: template.mutedTextColor,
                                lineHeight: '1.5'
                              }}
                            >
                              {companyInfo.companyAddress}
                            </div>
                          </div>
                        </div>

                        {/* Invoice Details Bar */}
                        <div 
                          className="bg-gray-50 rounded-lg p-4 flex items-center justify-between"
                          style={{ 
                            backgroundColor: template.templateId === 'minimal' ? '#f8fafc' : template.accentColor + '08',
                            border: `1px solid ${template.accentColor}20`
                          }}
                        >
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <h2 
                                className="font-bold tracking-wide"
                                style={{ 
                                  color: template.accentColor,
                                  fontSize: `${template.headingFontSize[0] * 0.7}px`,
                                  letterSpacing: '0.05em'
                                }}
                              >
                                INVOICE
                              </h2>
                              <div 
                                className="px-2 py-1 rounded-full text-xs font-medium"
                                style={{ 
                                  backgroundColor: template.accentColor + '20',
                                  color: template.accentColor
                                }}
                              >
                                PAID
                              </div>
                            </div>
                            <div 
                              className="text-xs font-mono"
                              style={{ color: template.mutedTextColor }}
                            >
                              INV-2024-001
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div 
                              className="text-sm space-y-1"
                              style={{ color: template.textColor }}
                            >
                              <div className="font-medium">
                                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </div>
                              <div 
                                className="text-xs"
                                style={{ color: template.mutedTextColor }}
                              >
                                Due: {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Contact Info */}
                        <div className="text-center">
                          <div 
                            className="inline-flex items-center gap-4 text-sm px-4 py-2 rounded-lg"
                            style={{ 
                              color: template.mutedTextColor,
                              backgroundColor: template.templateId === 'minimal' ? '#f8fafc' : '#f9fafb',
                              border: `1px solid ${template.mutedTextColor}15`
                            }}
                          >
                            <span>{companyInfo.companyEmail}</span>
                            <span className="text-gray-300">•</span>
                            <span>{companyInfo.companyPhone}</span>
                          </div>
                        </div>
                      </div>
                    ) : template.layoutId === 'creative' ? (
                      // Creative Layout - Invoice details first, then company
                      <div className="space-y-8">
                        <div className="text-right">
                          <div className="inline-flex items-center justify-end gap-3 mb-4">
                            <h2 
                              className="font-bold tracking-wide"
                              style={{ 
                                color: template.accentColor,
                                fontSize: `${template.headingFontSize[0]}px`,
                                letterSpacing: '0.05em'
                              }}
                            >
                              INVOICE
                            </h2>
                            <div 
                              className="px-3 py-1 rounded-full text-xs font-medium"
                              style={{ 
                                backgroundColor: template.accentColor + '15',
                                color: template.accentColor
                              }}
                            >
                              PAID
                            </div>
                          </div>
                          <div 
                            className="text-sm space-y-1"
                            style={{ color: template.mutedTextColor }}
                          >
                            <div><span className="font-medium">Invoice #:</span> INV-2024-001</div>
                            <div><span className="font-medium">Date:</span> {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                            <div><span className="font-medium">Due:</span> {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-4">
                          {template.logoUrl && (
                            <div className="flex-shrink-0">
                              <img 
                                src={template.logoUrl} 
                                alt="Company Logo" 
                                className="object-contain rounded-lg"
                                style={{ width: `${template.logoWidth[0] * 0.6}px`, height: 'auto' }}
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <h1 
                              className="font-bold leading-tight mb-3"
                              style={{ 
                                color: template.primaryColor,
                                fontSize: `${template.titleFontSize[0]}px`,
                                fontWeight: template.templateId === 'modern' ? '700' : '600'
                              }}
                            >
                              {companyInfo.companyName}
                            </h1>
                            <div 
                              className="text-sm leading-relaxed"
                              style={{ 
                                color: template.mutedTextColor,
                                lineHeight: '1.6'
                              }}
                            >
                              {companyInfo.companyAddress}
                            </div>
                            <div 
                              className="text-sm mt-2"
                              style={{ color: template.mutedTextColor }}
                            >
                              {companyInfo.companyEmail} • {companyInfo.companyPhone}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Standard & Detailed Layout - Two Column
                      <div className="flex justify-between items-start">
                        <div className="flex items-start space-x-4">
                          {template.logoUrl && (
                            <div className="flex-shrink-0">
                              <img 
                                src={template.logoUrl} 
                                alt="Company Logo" 
                                className="object-contain rounded-lg"
                                style={{ width: `${template.logoWidth[0] * 0.6}px`, height: 'auto' }}
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <h1 
                              className="font-bold leading-tight mb-3"
                              style={{ 
                                color: template.primaryColor,
                                fontSize: `${template.titleFontSize[0]}px`,
                                fontWeight: template.templateId === 'modern' ? '700' : '600'
                              }}
                            >
                              {companyInfo.companyName}
                            </h1>
                            <div 
                              className="text-sm leading-relaxed"
                              style={{ 
                                color: template.mutedTextColor,
                                lineHeight: '1.6'
                              }}
                            >
                              {companyInfo.companyAddress}
                            </div>
                            <div 
                              className="text-sm mt-2"
                              style={{ color: template.mutedTextColor }}
                            >
                              {companyInfo.companyEmail} • {companyInfo.companyPhone}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="inline-flex items-center gap-3 mb-4">
                            <h2 
                              className="font-bold tracking-wide"
                              style={{ 
                                color: template.accentColor,
                                fontSize: `${template.headingFontSize[0]}px`,
                                letterSpacing: '0.05em'
                              }}
                            >
                              INVOICE
                            </h2>
                            <div 
                              className="px-3 py-1 rounded-full text-xs font-medium"
                              style={{ 
                                backgroundColor: template.accentColor + '15',
                                color: template.accentColor
                              }}
                            >
                              PAID
                            </div>
                          </div>
                          <div 
                            className="text-sm space-y-1"
                            style={{ color: template.mutedTextColor }}
                          >
                            <div><span className="font-medium">Invoice #:</span> INV-2024-001</div>
                            <div><span className="font-medium">Date:</span> {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                            <div><span className="font-medium">Due:</span> {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bill To Section */}
                  <div className="mb-10">
                    <div className={`flex items-center gap-2 mb-4 ${template.layoutId === 'compact' ? 'justify-center' : ''}`}>
                      <h3 
                        className="font-semibold text-sm uppercase tracking-wide"
                        style={{ color: template.textColor }}
                      >
                        Bill To
                      </h3>
                      {template.layoutId !== 'compact' && (
                        <div 
                          className="flex-1 h-px"
                          style={{ backgroundColor: template.mutedTextColor + '20' }}
                        />
                      )}
                    </div>
                    <div 
                      className={`bg-gray-50 rounded-lg p-4 ${template.layoutId === 'compact' ? 'text-center' : ''}`}
                      style={{ 
                        backgroundColor: template.templateId === 'minimal' ? '#f8fafc' : '#f9fafb',
                        border: `1px solid ${template.mutedTextColor}15`
                      }}
                    >
                      <div className="font-medium text-sm mb-2" style={{ color: template.textColor }}>
                        Acme Corporation
                      </div>
                      <div 
                        className="text-sm space-y-1"
                        style={{ color: template.mutedTextColor, lineHeight: '1.5' }}
                      >
                        <div>123 Business Avenue</div>
                        <div>San Francisco, CA 94102</div>
                        <div>United States</div>
                        <div className="pt-1">
                          <span className="font-medium">contact@acme.com</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Project Details - Only for Detailed Layout */}
                  {template.layoutId === 'detailed' && (
                    <div className="mb-8">
                      <div className="flex items-center gap-2 mb-4">
                        <h3 
                          className="font-semibold text-sm uppercase tracking-wide"
                          style={{ color: template.textColor }}
                        >
                          Project Details
                        </h3>
                        <div 
                          className="flex-1 h-px"
                          style={{ backgroundColor: template.mutedTextColor + '20' }}
                        />
                      </div>
                      <div 
                        className="bg-gray-50 rounded-lg p-4"
                        style={{ 
                          backgroundColor: template.templateId === 'minimal' ? '#f8fafc' : '#f9fafb',
                          border: `1px solid ${template.mutedTextColor}15`
                        }}
                      >
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium" style={{ color: template.textColor }}>Project Name:</span>
                            <div style={{ color: template.mutedTextColor }}>Website Redesign</div>
                          </div>
                          <div>
                            <span className="font-medium" style={{ color: template.textColor }}>Timeline:</span>
                            <div style={{ color: template.mutedTextColor }}>6 weeks</div>
                          </div>
                          <div>
                            <span className="font-medium" style={{ color: template.textColor }}>Start Date:</span>
                            <div style={{ color: template.mutedTextColor }}>Jan 15, 2024</div>
                          </div>
                          <div>
                            <span className="font-medium" style={{ color: template.textColor }}>End Date:</span>
                            <div style={{ color: template.mutedTextColor }}>Feb 26, 2024</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Items Table */}
                  <div className="mb-8">
                    <div className={`flex items-center gap-2 mb-4 ${template.layoutId === 'compact' ? 'justify-center' : ''}`}>
                      <h3 
                        className="font-semibold text-sm uppercase tracking-wide"
                        style={{ color: template.textColor }}
                      >
                        Items
                      </h3>
                      {template.layoutId !== 'compact' && (
                        <div 
                          className="flex-1 h-px"
                          style={{ backgroundColor: template.mutedTextColor + '20' }}
                        />
                      )}
                    </div>
                    
                    <div className="overflow-hidden rounded-lg border" style={{ borderColor: template.mutedTextColor + '20' }}>
                      <div 
                        className="bg-gray-50 px-6 py-4"
                        style={{ backgroundColor: template.templateId === 'minimal' ? '#f8fafc' : '#f9fafb' }}
                      >
                        <div className="grid grid-cols-4 gap-4 text-xs font-semibold uppercase tracking-wide" style={{ color: template.mutedTextColor }}>
                          <div>Description</div>
                          <div className="text-center">Qty</div>
                          <div className="text-center">Rate</div>
                          <div className="text-right">Amount</div>
                        </div>
                      </div>
                      <div className="bg-white">
                        <div className="px-6 py-4 border-b border-gray-100">
                          <div className="grid grid-cols-4 gap-4 text-sm items-center" style={{ color: template.textColor }}>
                            <div>
                              <div className="font-medium">Web Development</div>
                              <div className="text-xs mt-1" style={{ color: template.mutedTextColor }}>
                                Full-stack development with React & Node.js
                              </div>
                            </div>
                            <div className="text-center font-mono">1</div>
                            <div className="text-center font-mono">{getCurrencySymbol(template.currency)}2,500.00</div>
                            <div className="text-right font-mono font-medium">{getCurrencySymbol(template.currency)}2,500.00</div>
                          </div>
                        </div>
                        <div className="px-6 py-4 border-b border-gray-100">
                          <div className="grid grid-cols-4 gap-4 text-sm items-center" style={{ color: template.textColor }}>
                            <div>
                              <div className="font-medium">UI/UX Design</div>
                              <div className="text-xs mt-1" style={{ color: template.mutedTextColor }}>
                                Complete user interface and experience design
                              </div>
                            </div>
                            <div className="text-center font-mono">1</div>
                            <div className="text-center font-mono">{getCurrencySymbol(template.currency)}1,500.00</div>
                            <div className="text-right font-mono font-medium">{getCurrencySymbol(template.currency)}1,500.00</div>
                          </div>
                        </div>
                        <div className="px-6 py-4">
                          <div className="grid grid-cols-4 gap-4 text-sm items-center" style={{ color: template.textColor }}>
                            <div>
                              <div className="font-medium">Consultation</div>
                              <div className="text-xs mt-1" style={{ color: template.mutedTextColor }}>
                                Strategic planning and technical consultation
                              </div>
                            </div>
                            <div className="text-center font-mono">5</div>
                            <div className="text-center font-mono">{getCurrencySymbol(template.currency)}200.00</div>
                            <div className="text-right font-mono font-medium">{getCurrencySymbol(template.currency)}1,000.00</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Total Section */}
                  <div className="flex justify-end">
                    <div className="w-96">
                      <div 
                        className="bg-gray-50 rounded-lg p-6"
                        style={{ 
                          backgroundColor: template.templateId === 'minimal' ? '#f8fafc' : '#f9fafb',
                          border: `1px solid ${template.mutedTextColor}15`
                        }}
                      >
                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-sm" style={{ color: template.textColor }}>
                            <span>Subtotal</span>
                            <span className="font-mono">{getCurrencySymbol(template.currency)}5,000.00</span>
                          </div>
                          <div className="flex justify-between items-center text-sm" style={{ color: template.textColor }}>
                            <span>Tax (10%)</span>
                            <span className="font-mono">{getCurrencySymbol(template.currency)}500.00</span>
                          </div>
                          <div 
                            className="border-t pt-3"
                            style={{ borderColor: template.mutedTextColor + '30' }}
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-lg font-semibold" style={{ color: template.textColor }}>
                                Total
                              </span>
                              <span 
                                className="font-bold text-2xl font-mono"
                                style={{ 
                                  color: template.accentColor,
                                  fontSize: `${template.baseFontSize[0] * 1.8}px`
                                }}
                              >
                                {getCurrencySymbol(template.currency)}5,500.00
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Payment Instructions - Only for Detailed Layout */}
                  {template.layoutId === 'detailed' && (
                    <div className="mt-10 mb-8">
                      <div className="flex items-center gap-2 mb-4">
                        <h3 
                          className="font-semibold text-sm uppercase tracking-wide"
                          style={{ color: template.textColor }}
                        >
                          Payment Instructions
                        </h3>
                        <div 
                          className="flex-1 h-px"
                          style={{ backgroundColor: template.mutedTextColor + '20' }}
                        />
                      </div>
                      <div 
                        className="bg-gray-50 rounded-lg p-4"
                        style={{ 
                          backgroundColor: template.templateId === 'minimal' ? '#f8fafc' : '#f9fafb',
                          border: `1px solid ${template.mutedTextColor}15`
                        }}
                      >
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium" style={{ color: template.textColor }}>Payment Method:</span>
                            <div style={{ color: template.mutedTextColor }}>Bank Transfer</div>
                          </div>
                          <div>
                            <span className="font-medium" style={{ color: template.textColor }}>Account Number:</span>
                            <div style={{ color: template.mutedTextColor }}>1234567890</div>
                          </div>
                          <div>
                            <span className="font-medium" style={{ color: template.textColor }}>Routing Number:</span>
                            <div style={{ color: template.mutedTextColor }}>021000021</div>
                          </div>
                          <div>
                            <span className="font-medium" style={{ color: template.textColor }}>Reference:</span>
                            <div style={{ color: template.mutedTextColor }}>INV-2024-001</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Terms & Conditions - Only for Detailed Layout */}
                  {template.layoutId === 'detailed' && (
                    <div className="mb-8">
                      <div className="flex items-center gap-2 mb-4">
                        <h3 
                          className="font-semibold text-sm uppercase tracking-wide"
                          style={{ color: template.textColor }}
                        >
                          Terms & Conditions
                        </h3>
                        <div 
                          className="flex-1 h-px"
                          style={{ backgroundColor: template.mutedTextColor + '20' }}
                        />
                      </div>
                      <div className="text-sm space-y-2" style={{ color: template.mutedTextColor }}>
                        <div>1. Payment is due within 30 days of invoice date.</div>
                        <div>2. Late payments may incur a 1.5% monthly service charge.</div>
                        <div>3. All work is guaranteed for 90 days from completion.</div>
                        <div>4. Changes to project scope require written approval.</div>
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div 
                    className={`mt-12 pt-8 border-t ${template.layoutId === 'compact' ? 'text-center' : 'text-center'}`} 
                    style={{ borderColor: template.mutedTextColor + '20' }}
                  >
                    <div className="text-xs" style={{ color: template.mutedTextColor }}>
                      {template.layoutId === 'detailed' 
                        ? "Thank you for your business! Questions? Contact us at " + companyInfo.companyEmail
                        : "Thank you for your business! Payment is due within 30 days."
                      }
                    </div>
                  </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContent>
    </>
  )
}
