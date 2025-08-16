import { Suspense } from "react"
import { ResetPasswordForm } from "@/components/reset-password-form"
import { Loader } from "@/components/ui/loader"

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <img
            src="/brillo_logo.svg"
            alt="Brillo"
            className="h-6 w-auto"
          />
        </a>
        <Suspense fallback={<div className="flex justify-center py-8"><Loader size="lg" variant="default" /></div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
