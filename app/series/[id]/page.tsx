import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SeriesDetail } from "@/components/series/series-detail"

interface SeriesPageProps {
  params: {
    id: string
  }
}

export default async function SeriesPage({ params }: SeriesPageProps) {
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
      <SeriesDetail seriesId={params.id} />
    </div>
  )
}
