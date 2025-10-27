import type React from "react"
import type { Metadata } from "next"
import { Crimson_Text, Inter } from "next/font/google"
import "./globals.css"
import { SplashScreenProvider } from "@/components/ui/splash-screen"
import { ThemeProvider } from "@/components/theme-provider"

const crimsonText = Crimson_Text({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-serif",
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

export const metadata: Metadata = {
  title: "AudioStory - Interactive Audiobook Platform",
  description: "Immerse yourself in interactive audiobook experiences with voice-controlled branching narratives",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${crimsonText.variable} ${inter.variable}`}>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SplashScreenProvider>
            {children}
          </SplashScreenProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
