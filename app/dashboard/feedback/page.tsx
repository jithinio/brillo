"use client"

import { HugeiconsIcon } from '@hugeicons/react';
import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader } from "@/components/ui/loader"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DollarSend01Icon, Message01Icon } from '@hugeicons/core-free-icons'
import { toast } from "sonner"
import { PageHeader, PageContent } from "@/components/page-header"
import { useAuth } from "@/components/auth-provider"

interface FeedbackForm {
  name: string
  email: string
  subject: string
  message: string
  feedbackType: string
}

export default function FeedbackPage() {
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<FeedbackForm>({
    name: user?.user_metadata?.full_name || user?.email?.split("@")[0] || "",
    email: user?.email || "",
    subject: "",
    message: "",
    feedbackType: "general"
  })

  const handleInputChange = (field: keyof FeedbackForm, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send feedback')
      }

      toast.success("Feedback sent successfully!", {
        description: "Thank you for your feedback. We'll get back to you soon."
      })

      // Reset form
      setFormData({
        name: user?.user_metadata?.full_name || user?.email?.split("@")[0] || "",
        email: user?.email || "",
        subject: "",
        message: "",
        feedbackType: "general"
      })

    } catch (error) {
      console.error('Error sending feedback:', error)
      toast.error(error instanceof Error ? error.message : "Failed to send feedback")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <PageHeader title="Feedback" />
      <PageContent>
        <div className="flex justify-center">
          <div className="w-full max-w-[600px]">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold text-foreground mb-2">
                Share Your Feedback
              </h1>
              <p className="text-muted-foreground">
                We'd love to hear from you! Your feedback helps us improve Brillo.
              </p>
            </div>

            <Card>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Your name"
                        disabled={isSubmitting}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="your@email.com"
                        disabled={isSubmitting}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="feedbackType">Feedback Type</Label>
                    <Select 
                      value={formData.feedbackType} 
                      onValueChange={(value) => handleInputChange('feedbackType', value)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select feedback type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General Feedback</SelectItem>
                        <SelectItem value="bug">Bug Report</SelectItem>
                        <SelectItem value="feature">Feature Request</SelectItem>
                        <SelectItem value="improvement">Improvement Suggestion</SelectItem>
                        <SelectItem value="question">Question</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => handleInputChange('subject', e.target.value)}
                      placeholder="Brief description of your feedback"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message <span className="text-red-500">*</span></Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => handleInputChange('message', e.target.value)}
                      placeholder="Please provide detailed feedback..."
                      rows={6}
                      disabled={isSubmitting}
                      required
                    />
                  </div>

                  <div className="flex justify-start pt-4">
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="min-w-32"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader size="sm" variant="default" className="mr-2" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <HugeiconsIcon icon={DollarSend01Icon} className="mr-2 h-4 w-4"  />
                          Send Feedback
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p>
                Your feedback is important to us and helps us improve Brillo.
              </p>
            </div>
          </div>
        </div>
      </PageContent>
    </>
  )
}