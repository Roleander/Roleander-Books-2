import { redirect } from "next/navigation"

export default async function HomePage() {
  // Show library with free content instead of requiring login
  redirect("/library")
}
