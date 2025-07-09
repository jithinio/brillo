import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { 
  Inter, 
  Roboto, 
  Open_Sans, 
  Lato, 
  Poppins, 
  Montserrat, 
  Playfair_Display, 
  Merriweather, 
  Source_Code_Pro, 
  JetBrains_Mono, 
  Inconsolata 
} from "next/font/google"
import "./globals.css"
import { ClientProviders } from "@/components/client-providers"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-roboto",
})

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-opensans",
})

const lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-lato",
})

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
})

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
})

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
})

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-merriweather",
})

const sourceCodePro = Source_Code_Pro({
  subsets: ["latin"],
  variable: "--font-sourcecodepro",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
})

const inconsolata = Inconsolata({
  subsets: ["latin"],
  variable: "--font-inconsolata",
})

export const metadata: Metadata = {
  title: "Suitebase - Business Management Platform",
  description: "Manage your clients, projects, and invoices with ease",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} ${inter.variable} ${roboto.variable} ${openSans.variable} ${lato.variable} ${poppins.variable} ${montserrat.variable} ${playfair.variable} ${merriweather.variable} ${sourceCodePro.variable} ${jetbrainsMono.variable} ${inconsolata.variable}`}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  )
}
