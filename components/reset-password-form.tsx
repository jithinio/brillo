"use client"

import { HugeiconsIcon } from '@hugeicons/react';
import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
import { PasswordStrength } from "@/components/ui/password-strength"
import { EyeIcon, ViewOffIcon, CheckmarkCircleIcon, AlertCircleIcon, ShieldIcon } from '@hugeicons/core-free-icons'
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"

export function ResetPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState("")
  const [isValidToken, setIsValidToken] = useState(false)
  const [checkingToken, setCheckingToken] = useState(true)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const { updatePassword } = useAuth()

  useEffect(() => {
    // Check if we have the required tokens from the URL
    const accessToken = searchParams.get('access_token')
    const refreshToken = searchParams.get('refresh_token')
    const type = searchParams.get('type')

    if (!accessToken || !refreshToken || type !== 'recovery') {
      setError("Invalid or missing reset token. Please request a new password reset.")
      setCheckingToken(false)
      return
    }

    // Set the session with the tokens
    const setSession = async () => {
      try {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        })

        if (error) {
          setError("Invalid or expired reset token. Please request a new password reset.")
        } else {
          setIsValidToken(true)
        }
      } catch (err) {
        setError("Failed to verify reset token. Please try again.")
      } finally {
        setCheckingToken(false)
      }
    }

    setSession()
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setIsSuccess(false)

    try {
      if (!password) {
        setError("Please enter a new password")
        return
      }

      if (password.length < 6) {
        setError("Password must be at least 6 characters long")
        return
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match")
        return
      }

      const { error } = await updatePassword(password)

      if (error) {
        setError(error.message)
      } else {
        setIsSuccess(true)
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/login")
        }, 3000)
      }
    } catch (error) {
      setError("Failed to reset password. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (checkingToken) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card className="bg-background">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Verifying reset token...</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <Loader size="lg" variant="default" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isValidToken) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card className="bg-background">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <HugeiconsIcon icon={AlertCircleIcon} className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-xl">Invalid Reset Link</CardTitle>
            <CardDescription>
              This password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert variant="destructive">
                <HugeiconsIcon icon={AlertCircleIcon} className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              
              <div className="flex flex-col gap-2">
                <Link href="/forgot-password">
                  <Button className="w-full">
                    Request new reset link
                  </Button>
                </Link>
                
                <Link href="/login">
                  <Button variant="outline" className="w-full">
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

  if (isSuccess) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card className="bg-background">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
              <HugeiconsIcon icon={CheckmarkCircleIcon} className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-xl">Password reset successful!</CardTitle>
            <CardDescription>
              Your password has been updated successfully. You'll be redirected to the login page shortly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <HugeiconsIcon icon={ShieldIcon} className="h-4 w-4" />
                <AlertDescription>
                  For security reasons, you'll need to log in again with your new password.
                </AlertDescription>
              </Alert>
              
              <Link href="/login">
                <Button className="w-full">
                  Continue to login
                </Button>
              </Link>
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
          <CardTitle className="text-xl">Set new password</CardTitle>
          <CardDescription>
            Choose a strong password for your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-6">
              <div className="grid gap-3">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <HugeiconsIcon icon={ViewOffIcon} className="h-4 w-4" />
                    ) : (
                      <HugeiconsIcon icon={EyeIcon} className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {password && <PasswordStrength password={password} />}
              </div>
              
              <div className="grid gap-3">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <HugeiconsIcon icon={ViewOffIcon} className="h-4 w-4" />
                    ) : (
                      <HugeiconsIcon icon={EyeIcon} className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-sm text-destructive">Passwords do not match</p>
                )}
              </div>
              
              {error && (
                <Alert variant="destructive">
                  <HugeiconsIcon icon={AlertCircleIcon} className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || password !== confirmPassword || !password}
              >
                {isLoading ? (
                  <>
                    <Loader size="sm" variant="default" className="mr-2" />
                    Updating password...
                  </>
                ) : (
                  <>
                    <HugeiconsIcon icon={ShieldIcon} className="mr-2 h-4 w-4" />
                    Update password
                  </>
                )}
              </Button>
              
              <div className="text-center">
                <Link href="/login" className="text-sm text-muted-foreground hover:underline">
                  Back to login
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      
      <div className="text-balance text-center text-xs text-muted-foreground">
        Make sure to choose a password that's at least 6 characters long and unique to this account.
      </div>
    </div>
  )
}
