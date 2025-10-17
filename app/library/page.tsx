import { createClient } from "@/lib/supabase/server"
import { LibraryDashboard } from "@/components/library/library-dashboard"

export default async function LibraryPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Pass user (can be null for guests) to LibraryDashboard
  return (
    <div className="min-h-screen bg-background">
      <LibraryDashboard user={user} />
    </div>
  )
}
