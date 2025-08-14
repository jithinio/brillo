"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader } from "@/components/ui/loader"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Save, Edit, Camera, AlertCircle, Shield, Trash2 } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { useClients } from "@/hooks/use-clients"
import { useInvoices } from "@/hooks/use-invoices"
import { useAdvancedProjects } from "@/hooks/use-advanced-projects"
import { toast } from "sonner"
import { PageHeader, PageContent, PageTitle } from "@/components/page-header"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"


interface Profile {
  id: string
  first_name?: string
  last_name?: string
  full_name?: string
  title?: string
  bio?: string
  location?: string
  website?: string
  avatar_url?: string
  phone?: string
  company?: string
}

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSupabaseReady, setIsSupabaseReady] = useState(false)
  const { user } = useAuth()


  const [profile, setProfile] = useState<Profile>({
    id: "",
    first_name: "",
    last_name: "",
    full_name: "",
    title: "",
    bio: "",
    location: "",
    website: "",
    avatar_url: "",
    phone: "",
    company: "",
  })
  
  // Track the last user ID to prevent unnecessary re-initialization
  const [lastUserId, setLastUserId] = useState<string | null>(null)

  // Security settings state
  const [securitySettings, setSecuritySettings] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  // Delete account state
  const [showDeleteWarning, setShowDeleteWarning] = useState(false)
  const [showDeleteVerification, setShowDeleteVerification] = useState(false)
  const [deleteVerification, setDeleteVerification] = useState({
    password: "",
    confirmationText: "",
  })
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch real data for Quick Stats
  const { totalCount: projectsCount, isLoading: projectsLoading } = useAdvancedProjects({})
  const { totalCount: clientsCount, isLoading: clientsLoading } = useClients({})
  const { totalCount: invoicesCount, isLoading: invoicesLoading } = useInvoices({})

  useEffect(() => {
    if (user && user.id !== lastUserId) {
      setLastUserId(user.id)
      initializeProfile()
    }
  }, [user?.id, lastUserId]) // Only re-run when user ID actually changes



  const initializeProfile = async () => {
    try {
      // Only set loading to true if we don't already have profile data
      if (!profile.id || profile.id === "") {
        setLoading(true)
      }
      setError(null)

      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        console.log("Supabase not configured, using local profile data")
        setIsSupabaseReady(false)
        setError("Database not configured - using local profile data")
        loadLocalProfile()
        return
      }

      setIsSupabaseReady(true)
      await fetchProfile()
    } catch (error) {
      console.error("Error initializing profile:", error)
      setError("Failed to load profile data")
      loadLocalProfile()
    } finally {
      // Only set loading to false if we were actually loading
      if (!profile.id || profile.id === "" || loading) {
        setLoading(false)
      }
    }
  }

  const loadLocalProfile = () => {
    // Load profile from user metadata or localStorage
    const localProfile = {
      id: user?.id || "demo-user",
      first_name: user?.user_metadata?.first_name || localStorage.getItem("profile_first_name") || "",
      last_name: user?.user_metadata?.last_name || localStorage.getItem("profile_last_name") || "",
      full_name:
        user?.user_metadata?.full_name ||
        localStorage.getItem("profile_full_name") ||
        user?.email?.split("@")[0] ||
        "Demo User",
      title: localStorage.getItem("profile_title") || "",
      bio: localStorage.getItem("profile_bio") || "",
      location: localStorage.getItem("profile_location") || "",
      website: localStorage.getItem("profile_website") || "",
      avatar_url: user?.user_metadata?.avatar_url || localStorage.getItem("profile_avatar_url") || "",
      phone: localStorage.getItem("profile_phone") || "",
      company: localStorage.getItem("profile_company") || "",
    }
    setProfile(localProfile)
  }

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user?.id).single()

      if (error && error.code !== "PGRST116") {
        // If table doesn't exist, fall back to local storage
        if (error.message.includes("does not exist")) {
          console.log("Profiles table doesn't exist, using local storage")
          setError("Database table not found - using local profile data")
          loadLocalProfile()
          return
        }
        throw error
      }

      if (data) {
        setProfile(data)
      } else {
        // Create initial profile from user metadata
        const newProfile = {
          id: user?.id || "",
          first_name: user?.user_metadata?.first_name || "",
          last_name: user?.user_metadata?.last_name || "",
          full_name: user?.user_metadata?.full_name || user?.email?.split("@")[0] || "",
          avatar_url: user?.user_metadata?.avatar_url || "",
        }
        setProfile(newProfile)
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
      setError("Failed to fetch profile from database")
      loadLocalProfile()
    }
  }

  const updateProfile = async () => {
    try {
      setSaving(true)

      if (!isSupabaseReady) {
        // Save to localStorage if Supabase isn't available
        saveToLocalStorage()
        toast.success("Profile updated locally", {
          description: "Database not available"
        })
        setIsEditing(false)
        return
      }

      const { error } = await supabase.from("profiles").upsert({
        ...profile,
        id: user?.id,
      })

      if (error) {
        // If table doesn't exist, save locally
        if (error.message.includes("does not exist")) {
          saveToLocalStorage()
          toast.success("Profile updated locally", {
            description: "Database table not found"
          })
          setIsEditing(false)
          return
        }
        throw error
      }

      // Update auth user metadata if possible
      try {
        const { error: authError } = await supabase.auth.updateUser({
          data: {
            full_name: profile.full_name,
            first_name: profile.first_name,
            last_name: profile.last_name,
          },
        })

        if (authError) {
          console.warn("Could not update auth metadata:", authError)
        }
      } catch (authError) {
        console.warn("Auth update failed:", authError)
      }

      toast.success("Profile updated successfully")
      setIsEditing(false)
    } catch (error) {
      console.error("Error updating profile:", error)
      toast.error("Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const saveToLocalStorage = () => {
    // Save profile data to localStorage as fallback
    Object.entries(profile).forEach(([key, value]) => {
      if (key !== "id" && value) {
        localStorage.setItem(`profile_${key}`, value.toString())
      }
    })
  }

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select an image to upload.")
      }

      const file = event.target.files[0]

      if (!isSupabaseReady) {
        // For demo purposes, create a local URL
        const localUrl = URL.createObjectURL(file)
        const updatedProfile = { ...profile, avatar_url: localUrl }
        setProfile(updatedProfile)
        localStorage.setItem("profile_avatar_url", localUrl)

        toast.success("Avatar updated locally", {
          description: "Storage not available"
        })
        return
      }

      const fileExt = file.name.split(".").pop()
      const filePath = `${user?.id}/avatar.${fileExt}`

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true })

      if (uploadError) {
        // If storage isn't configured, fall back to local URL
        if (uploadError.message.includes("bucket") || uploadError.message.includes("not found")) {
          const localUrl = URL.createObjectURL(file)
          const updatedProfile = { ...profile, avatar_url: localUrl }
          setProfile(updatedProfile)
          localStorage.setItem("profile_avatar_url", localUrl)

          toast.success("Avatar updated locally", {
            description: "Storage bucket not found"
          })
          return
        }
        throw uploadError
      }

      // Get public URL
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath)
      const avatarUrl = data.publicUrl

      // Update profile with new avatar URL
      const updatedProfile = { ...profile, avatar_url: avatarUrl }
      setProfile(updatedProfile)

      // Save to database if possible
      try {
        const { error: updateError } = await supabase.from("profiles").upsert({
          ...updatedProfile,
          id: user?.id,
        })

        if (updateError && !updateError.message.includes("does not exist")) {
          throw updateError
        }
      } catch (dbError) {
        console.warn("Could not save to database:", dbError)
        localStorage.setItem("profile_avatar_url", avatarUrl)
      }

      // Update auth user metadata
      try {
        const { error: authError } = await supabase.auth.updateUser({
          data: {
            avatar_url: avatarUrl,
          },
        })

        if (authError) {
          console.warn("Could not update auth metadata:", authError)
        }
      } catch (authError) {
        console.warn("Auth update failed:", authError)
      }

      toast.success("Avatar updated successfully")
    } catch (error) {
      console.error("Error uploading avatar:", error)
      toast.error("Failed to upload avatar")
    } finally {
      setUploading(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const handleUpdatePassword = async () => {
    if (!securitySettings.currentPassword) {
      toast.error("Current password is required")
      return
    }

    if (!securitySettings.newPassword) {
      toast.error("New password is required")
      return
    }

    if (securitySettings.newPassword !== securitySettings.confirmPassword) {
      toast.error("New passwords do not match")
      return
    }

    if (securitySettings.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long")
      return
    }

    try {
      // In a real app, you would send this to your backend API
      // await api.updatePassword(securitySettings.currentPassword, securitySettings.newPassword)
      
      // Clear password fields
      setSecuritySettings({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })

      toast.success("Your password has been updated successfully")
    } catch (error) {
      console.error("Error updating password:", error)
      toast.error("Failed to update password. Please try again.")
    }
  }

  const handleDeleteAccount = () => {
    setShowDeleteWarning(true)
  }

  const proceedToVerification = () => {
    setShowDeleteWarning(false)
    setShowDeleteVerification(true)
  }

  const handleDeleteAccountConfirm = async () => {
    // Check if user is a Google OAuth user (no password required)
    const isGoogleUser = user?.app_metadata?.provider === 'google'
    
    // Validate inputs based on user type
    if (!isGoogleUser && !deleteVerification.password) {
      toast.error("Please enter your current password")
      return
    }

    if (deleteVerification.confirmationText !== "DELETE") {
      toast.error("Please type 'DELETE' to confirm")
      return
    }

    try {
      setIsDeleting(true)

      // Call the delete account API
      const response = await fetch('/api/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          password: isGoogleUser ? null : deleteVerification.password,
          isGoogleUser: isGoogleUser
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete account')
      }

      toast.success("Account deleted successfully")
      
      // Clear all local storage
      localStorage.clear()
      
      // Sign out the user
      if (typeof window !== 'undefined') {
        const { supabase } = await import('@/lib/supabase')
        await supabase.auth.signOut()
      }
      
      // Redirect to login or goodbye page
      setTimeout(() => {
        window.location.href = "/login"
      }, 1000)

    } catch (error: any) {
      console.error("Error deleting account:", error)
      toast.error(error.message || "Failed to delete account. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  const resetDeleteState = () => {
    setShowDeleteWarning(false)
    setShowDeleteVerification(false)
    setDeleteVerification({
      password: "",
      confirmationText: "",
    })
  }

  if (loading) {
    return (
      <>
        <PageHeader
          title="Profile"
          action={
            <div className="flex space-x-2">
              <Skeleton className="h-9 w-24" />
            </div>
          }
        />
        <PageContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Picture</CardTitle>
                  <CardDescription>Update your profile picture and avatar.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col items-center space-y-4">
                    <Skeleton className="w-24 h-24 rounded-full" />
                    <div className="text-center">
                      <Skeleton className="h-4 w-48 mx-auto" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex justify-between">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-5 w-8 rounded-full" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>
                    <Skeleton className="h-4 w-80" />
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-10 w-full" />
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

  return (
    <>
      <PageHeader
        title="Profile"
        action={
          <div className="flex space-x-2">
            {isEditing ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button size="sm" onClick={updateProfile} disabled={saving}>
                  {saving ? <Loader size="sm" variant="default" className="mr-1.5" /> : <Save className="mr-1.5 h-4 w-4" />}
                  Save Changes
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="mr-1.5 h-4 w-4" />
                Edit Profile
              </Button>
            )}
          </div>
        }
      />
      <PageContent>
        {error && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}. Your changes will be saved locally and synced when the database is available.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Profile Picture</CardTitle>
                <CardDescription>Update your profile picture and avatar.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <Avatar className="w-24 h-24">
                      <AvatarImage src={profile.avatar_url || "/placeholder-user.jpg"} alt={profile.full_name || "User"} />
                      <AvatarFallback className="text-lg">
                        {getInitials(profile.full_name || profile.first_name || "U")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0">
                      <Label htmlFor="avatar-upload" className="cursor-pointer">
                        <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors">
                          {uploading ? <Loader size="sm" variant="default" /> : <Camera className="h-4 w-4" />}
                        </div>
                      </Label>
                      <Input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={uploadAvatar}
                        disabled={uploading}
                        className="hidden"
                      />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Click the camera icon to upload a new photo</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Projects</span>
                  {projectsLoading ? (
                    <Skeleton className="h-5 w-8 rounded-full" />
                  ) : (
                    <Badge variant="secondary">{projectsCount}</Badge>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Clients</span>
                  {clientsLoading ? (
                    <Skeleton className="h-5 w-8 rounded-full" />
                  ) : (
                    <Badge variant="secondary">{clientsCount}</Badge>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Invoices</span>
                  {invoicesLoading ? (
                    <Skeleton className="h-5 w-8 rounded-full" />
                  ) : (
                    <Badge variant="secondary">{invoicesCount}</Badge>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Member Since</span>
                  <span className="text-sm">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "Jan 2024"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Update your personal details and contact information.
                  <br />
                  <span className="text-xs">
                    For company information used in invoices, visit{" "}
                    <a href="/dashboard/settings" className="text-primary hover:underline">
                      Settings
                    </a>
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={profile.first_name || ""}
                      onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={profile.last_name || ""}
                      onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={profile.full_name || ""}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={user?.email || ""} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed here. Contact support if you need to update your email.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Job Title</Label>
                    <Input
                      id="title"
                      value={profile.title || ""}
                      onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={profile.company || ""}
                      onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={profile.phone || ""}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={profile.location || ""}
                      onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={profile.website || ""}
                    onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    rows={4}
                    value={profile.bio || ""}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    disabled={!isEditing}
                    placeholder="Tell us about yourself..."
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="mr-2 h-5 w-5" />
                  Security Settings
                </CardTitle>
                <CardDescription>Change your account password and security settings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input 
                    id="currentPassword" 
                    type="password" 
                    value={securitySettings.currentPassword}
                    onChange={(e) => setSecuritySettings({...securitySettings, currentPassword: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input 
                    id="newPassword" 
                    type="password" 
                    value={securitySettings.newPassword}
                    onChange={(e) => setSecuritySettings({...securitySettings, newPassword: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    value={securitySettings.confirmPassword}
                    onChange={(e) => setSecuritySettings({...securitySettings, confirmPassword: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>
                {isEditing && (
                  <Button size="sm" onClick={handleUpdatePassword}>Update Password</Button>
                )}
              </CardContent>
            </Card>

            <Card className="mt-6 border-destructive/20">
              <CardHeader>
                <CardTitle className="flex items-center text-destructive">
                  <Trash2 className="mr-2 h-5 w-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription>
                  Permanently delete your account and all associated data. This action cannot be undone.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-destructive">Account Deletion</p>
                    <p className="text-xs text-muted-foreground">
                      Deleting your account will permanently remove:
                    </p>
                    <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1 ml-4">
                      <li>Your profile and personal information</li>
                      <li>All projects and project data</li>
                      <li>All invoices and financial records</li>
                      <li>All clients and relationships</li>
                      <li>Company settings and preferences</li>
                      <li>Uploaded files and documents</li>
                    </ul>
                  </div>
                </div>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleDeleteAccount}
                  className="text-white hover:text-white"
                >
                  <Trash2 className="mr-1.5 h-4 w-4 text-white" />
                  Delete Account
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Delete Account Warning Dialog */}
        <AlertDialog open={showDeleteWarning} onOpenChange={setShowDeleteWarning}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                Delete Account
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>
                    You are about to permanently delete your account and all associated data.
                  </p>
                  
                  <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                    <div className="font-medium text-destructive mb-2">⚠️ This action will permanently delete:</div>
                    <ul className="text-sm text-destructive/80 list-disc list-inside space-y-1">
                      <li>Your profile and personal information</li>
                      <li>All projects and project data</li>
                      <li>All invoices and financial records</li>
                      <li>All clients and relationships</li>
                      <li>Company settings and preferences</li>
                      <li>Uploaded files and documents</li>
                      <li>Analytics and cached data</li>
                    </ul>
                  </div>
                  
                  <div className="text-sm font-medium text-destructive">
                    ⚠️ This action cannot be undone and no data can be recovered.
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    Are you sure you want to continue?
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowDeleteWarning(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={proceedToVerification}
                className="bg-destructive hover:bg-destructive/90 text-white hover:text-white"
              >
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Account Verification Dialog */}
        <AlertDialog open={showDeleteVerification} onOpenChange={resetDeleteState}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                Confirm Account Deletion
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  <p className="text-destructive font-medium">
                    This is your final chance to cancel. Once confirmed, your account will be permanently deleted.
                  </p>
                  
                  <div className="space-y-3">
                    {/* Only show password field for non-Google users */}
                    {user?.app_metadata?.provider !== 'google' && (
                      <div className="space-y-2">
                        <Label htmlFor="deletePassword" className="text-sm font-medium">
                          Enter your current password to confirm:
                        </Label>
                        <Input
                          id="deletePassword"
                          type="password"
                          value={deleteVerification.password}
                          onChange={(e) => setDeleteVerification({
                            ...deleteVerification,
                            password: e.target.value
                          })}
                          placeholder="Current password"
                          className="border-destructive/20 focus:border-destructive"
                        />
                      </div>
                    )}
                    
                    {/* Show different messaging for Google users */}
                    {user?.app_metadata?.provider === 'google' && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          <span className="font-medium">Google Account:</span> No password verification required for OAuth accounts.
                        </p>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor="deleteConfirmation" className="text-sm font-medium">
                        Type <span className="font-mono bg-muted px-1 rounded">DELETE</span> to confirm:
                      </Label>
                      <Input
                        id="deleteConfirmation"
                        value={deleteVerification.confirmationText}
                        onChange={(e) => setDeleteVerification({
                          ...deleteVerification,
                          confirmationText: e.target.value
                        })}
                        placeholder="Type DELETE to confirm"
                        className="border-destructive/20 focus:border-destructive"
                      />
                    </div>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={resetDeleteState} disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteAccountConfirm}
                disabled={
                  isDeleting || 
                  deleteVerification.confirmationText !== "DELETE" ||
                  (user?.app_metadata?.provider !== 'google' && !deleteVerification.password)
                }
                className="bg-destructive hover:bg-destructive/90 text-white hover:text-white disabled:text-white/70"
              >
                {isDeleting ? (
                  <>
                    <Loader size="sm" variant="default" className="mr-1.5 text-white" />
                    Deleting Account...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-1.5 h-4 w-4 text-white" />
                    Delete Account Permanently
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </PageContent>
    </>
  )
}
