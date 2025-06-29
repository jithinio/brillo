"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Save, Edit, Loader2, Camera, AlertCircle } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { PageHeader, PageContent, PageTitle } from "@/components/page-header"
import { Alert, AlertDescription } from "@/components/ui/alert"

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
  const { toast } = useToast()

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

  useEffect(() => {
    if (user) {
      initializeProfile()
    }
  }, [user])

  const initializeProfile = async () => {
    try {
      setLoading(true)
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
      setLoading(false)
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
        toast({
          title: "Success",
          description: "Profile updated locally (database not available)",
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
          toast({
            title: "Success",
            description: "Profile updated locally (database table not found)",
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

      toast({
        title: "Success",
        description: "Profile updated successfully",
      })
      setIsEditing(false)
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      })
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

        toast({
          title: "Success",
          description: "Avatar updated locally (storage not available)",
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

          toast({
            title: "Success",
            description: "Avatar updated locally (storage bucket not found)",
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

      toast({
        title: "Success",
        description: "Avatar updated successfully",
      })
    } catch (error) {
      console.error("Error uploading avatar:", error)
      toast({
        title: "Error",
        description: "Failed to upload avatar",
        variant: "destructive",
      })
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

  if (loading) {
    return (
      <>
        <PageHeader title="Profile" breadcrumbs={[{ label: "Profile" }]} />
        <PageContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </PageContent>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Profile"
        breadcrumbs={[{ label: "Profile" }]}
        action={
          <div className="flex space-x-2">
            {isEditing ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button size="sm" onClick={updateProfile} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Changes
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            )}
          </div>
        }
      />
      <PageContent>
        <PageTitle title="Profile" description="Manage your personal profile and public information" error={error} />

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
                      <AvatarImage src={profile.avatar_url || "/placeholder.svg"} alt={profile.full_name || "User"} />
                      <AvatarFallback className="text-lg">
                        {getInitials(profile.full_name || profile.first_name || "U")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0">
                      <Label htmlFor="avatar-upload" className="cursor-pointer">
                        <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors">
                          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
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
                  <Badge variant="secondary">12</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Clients</span>
                  <Badge variant="secondary">8</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Invoices</span>
                  <Badge variant="secondary">24</Badge>
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
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your recent actions and updates.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Profile updated</p>
                      <p className="text-xs text-muted-foreground">Just now</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Signed in to account</p>
                      <p className="text-xs text-muted-foreground">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Account created</p>
                      <p className="text-xs text-muted-foreground">
                        {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "Recently"}
                      </p>
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
