export interface Audiobook {
  id: number
  title: string
  author: string
  narrator: string
  duration: string
  rating: number
  genre: string
  cover: string
  description: string
  progress: number
  audioUrl?: string
  chapters?: Chapter[]
}

export interface Chapter {
  id: number
  title: string
  startTime: number
  duration: number
}

export const audiobooks: Audiobook[] = [
  {
    id: 1,
    title: "The Midnight Library",
    author: "Matt Haig",
    narrator: "Carey Mulligan",
    duration: "8h 32m",
    rating: 4.5,
    genre: "Fiction",
    cover: "/midnight-library-cover.png",
    description: "A dazzling novel about all the choices that go into a life well lived.",
    progress: 0,
    audioUrl: "/placeholder-audio.mp3",
  },
  {
    id: 2,
    title: "Atomic Habits",
    author: "James Clear",
    narrator: "James Clear",
    duration: "5h 35m",
    rating: 4.8,
    genre: "Self-Help",
    cover: "/atomic-habits-cover.png",
    description: "An easy and proven way to build good habits and break bad ones.",
    progress: 45,
    audioUrl: "/placeholder-audio.mp3",
  },
  {
    id: 3,
    title: "Project Hail Mary",
    author: "Andy Weir",
    narrator: "Ray Porter",
    duration: "16h 10m",
    rating: 4.7,
    genre: "Science Fiction",
    cover: "/project-hail-mary-cover.png",
    description: "A lone astronaut must save the earth from disaster in this incredible new science-based thriller.",
    progress: 0,
    audioUrl: "/placeholder-audio.mp3",
  },
  {
    id: 4,
    title: "Educated",
    author: "Tara Westover",
    narrator: "Julia Whelan",
    duration: "12h 10m",
    rating: 4.6,
    genre: "Biography",
    cover: "/educated-memoir-cover.png",
    description: "A memoir about a young girl who, kept out of school, leaves her survivalist family.",
    progress: 78,
    audioUrl: "/placeholder-audio.mp3",
  },
]

export function getAudiobookById(id: number): Audiobook | undefined {
  return audiobooks.find((book) => book.id === id)
}

export function getAudiobooksByGenre(genre: string): Audiobook[] {
  if (genre === "All") return audiobooks
  return audiobooks.filter((book) => book.genre === genre)
}

export function searchAudiobooks(query: string): Audiobook[] {
  const lowercaseQuery = query.toLowerCase()
  return audiobooks.filter(
    (book) =>
      book.title.toLowerCase().includes(lowercaseQuery) ||
      book.author.toLowerCase().includes(lowercaseQuery) ||
      book.narrator.toLowerCase().includes(lowercaseQuery),
  )
}
