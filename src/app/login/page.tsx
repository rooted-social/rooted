import { Suspense } from "react"
import LoginClient from "@/app/login/LoginClient"

export default async function LoginPage() {
  return (
    <Suspense>
      <LoginClient />
    </Suspense>
  )
}