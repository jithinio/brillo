"use client"

import { HugeiconsIcon } from '@hugeicons/react';
import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader } from "@/components/ui/loader"
import { ArrowLeft01Icon, Mail01Icon, CheckmarkCircleIcon, AlertCircleIcon } from '@hugeicons/core-free-icons'
import { useAuth } from "@/components/auth-provider"

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState("")
  const { resetPassword } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setIsSuccess(false)

    try {
      if (!email) {
        setError("Please enter your email address")
        return
      }

      const { error } = await resetPassword(email)

      if (error) {
        setError(error.message)
      } else {
        setIsSuccess(true)
      }
    } catch (error) {
      setError("Failed to send reset email. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card className="bg-background">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
              <HugeiconsIcon icon={CheckmarkCircleIcon} className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-xl">Check your email</CardTitle>
            <CardDescription>
              We've sent a password reset link to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <HugeiconsIcon icon={Mail01Icon} className="h-4 w-4" />
                <AlertDescription>
                  The reset link will expire in 1 hour. If you don't see the email, check your spam folder.
                </AlertDescription>
              </Alert>
              
              <div className="flex flex-col gap-2">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setIsSuccess(false)
                    setEmail("")
                  }}
                >
                  Try a different email
                </Button>
                
                <Link href="/login">
                  <Button variant="ghost" className="w-full">
                    <HugeiconsIcon icon={ArrowLeft01Icon} className="mr-2 h-4 w-4" />
                    Back to login
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="bg-background">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Reset your password</CardTitle>
          <CardDescription>
            Enter your email address and we'll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-6">
              <div className="grid gap-3">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              {error && (
                <Alert variant="destructive">
                  <HugeiconsIcon icon={AlertCircleIcon} className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader size="sm" variant="default" className="mr-2" />
                    Sending reset link...
                  </>
                ) : (
                  <>
                    <HugeiconsIcon icon={Mail01Icon} className="mr-2 h-4 w-4" />
                    Send reset link
                  </>
                )}
              </Button>
              
              <div className="text-center">
                <Link href="/login" className="text-sm text-muted-foreground hover:underline">
                  <HugeiconsIcon icon={ArrowLeft01Icon} className="mr-1 h-3 w-3 inline" />
                  Back to login
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      
      <div className="text-balance text-center text-xs text-muted-foreground">
        If you're having trouble, contact{" "}
        <a href="mailto:support@brillo.dev" className="underline underline-offset-4 hover:text-primary">
          support@brillo.dev
        </a>
      </div>
    </div>
  )
}
