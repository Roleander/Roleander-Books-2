import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SubscriptionManager } from "@/components/subscription/subscription-manager"

export default async function SubscriptionPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen bg-background">
      <SubscriptionManager />
    </div>
  )
}
