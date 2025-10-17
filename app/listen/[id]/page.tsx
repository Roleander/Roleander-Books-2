import { createClient } from "@/lib/supabase/server"
import { AudioPlayer } from "@/components/audio/audio-player"

interface ListenPageProps {
  params: {
    id: string
  }
}

export default async function ListenPage({ params }: ListenPageProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-background">
      <AudioPlayer audiobookId={params.id} user={user} />
    </div>
  )
}
