import type React from "react"
import type { Metadata } from "next"
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
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
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
  title: "Brillo - Business Management Platform",
  description: "Manage your clients, projects, and invoices with ease",
  generator: 'v0.dev',
  icons: {
    icon: [
      { url: '/Favicon.svg', type: 'image/svg+xml' },
      { url: '/Favicon.png', type: 'image/png' }
    ],
    shortcut: '/Favicon.svg',
    apple: '/Favicon.png', // Keep PNG for Apple devices as they have better PNG support
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Check for new unified cache key format first
                  var cacheKeys = Object.keys(localStorage).filter(function(key) {
                    return key.startsWith('brillo-sub-cache-');
                  });
                  
                  var foundPlan = null;
                  var mostRecentTimestamp = 0;
                  
                  // Find the most recent valid cache entry
                  for (var i = 0; i < cacheKeys.length; i++) {
                    var saved = localStorage.getItem(cacheKeys[i]);
                    if (saved) {
                      try {
                        var parsed = JSON.parse(saved);
                        var age = Date.now() - parsed.timestamp;
                        // 10 minute cache validity (increased for better reliability)
                        if (age < 10 * 60 * 1000 && parsed.data && parsed.data.planId && parsed.timestamp > mostRecentTimestamp) {
                          mostRecentTimestamp = parsed.timestamp;
                          foundPlan = parsed.data.planId;
                        }
                      } catch (parseError) {
                        // Skip invalid entries
                      }
                    }
                  }
                  
                  // Only set attribute if we found a valid plan
                  // Don't default to anything - let components handle unknown state
                  if (foundPlan) {
                    var isPro = foundPlan === 'pro_monthly' || foundPlan === 'pro_yearly';
                    document.documentElement.setAttribute('data-user-plan', isPro ? 'pro' : 'free');
                  } else {
                    // Set loading state to prevent any flashing
                    document.documentElement.setAttribute('data-user-plan', 'loading');
                  }
                  
                } catch (e) {
                  // On error, set loading state rather than defaulting to free
                  document.documentElement.setAttribute('data-user-plan', 'loading');
                }
              })();
            `
          }}
        />
      </head>
      <body className={`${inter.className} ${GeistMono.variable} ${inter.variable} ${roboto.variable} ${openSans.variable} ${lato.variable} ${poppins.variable} ${montserrat.variable} ${playfair.variable} ${merriweather.variable} ${sourceCodePro.variable} ${jetbrainsMono.variable} ${inconsolata.variable}`}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  )
}
