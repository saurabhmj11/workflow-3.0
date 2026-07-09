"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, Settings, User, RotateCcw, BarChart3 } from "lucide-react"
import Link from "next/link"

interface UserNavProps {
  onResetOnboarding?: () => void
}

export function UserNav({ onResetOnboarding }: UserNavProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Not loaded yet
  if (status === "loading") {
    return (
      <div className="h-8 w-8 rounded-full bg-zinc-800 animate-pulse" />
    )
  }

  // Not authenticated — show sign in button
  if (!session?.user) {
    return (
      <Link href="/login">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
        >
          <User className="h-3.5 w-3.5" />
          <span className="text-xs">Sign in</span>
        </Button>
      </Link>
    )
  }

  const user = session.user
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email
        .slice(0, 2)
        .toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
          <Avatar className="h-8 w-8">
            {user.image && <AvatarImage src={user.image} alt={user.name || "User avatar"} />}
            <AvatarFallback className="bg-linear-to-br from-violet-600 to-cyan-500 text-white text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-zinc-900 border-zinc-800" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium text-zinc-100">{user.name || "User"}</p>
            <p className="text-xs text-zinc-500">{user.email}</p>
            {user.role && user.role !== "USER" && (
              <p className="text-xs text-cyan-400 font-medium">{user.role}</p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem
          className="text-zinc-300 focus:text-zinc-100 focus:bg-zinc-800 cursor-pointer"
          onClick={() => router.push("/dashboard")}
        >
          <BarChart3 className="mr-2 h-4 w-4" />
          Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-zinc-300 focus:text-zinc-100 focus:bg-zinc-800 cursor-pointer"
          onClick={() => router.push("/settings")}
        >
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-zinc-800" />
        {onResetOnboarding && (
          <DropdownMenuItem
            className="text-violet-400 focus:text-violet-200 focus:bg-violet-500/10 cursor-pointer"
            onClick={onResetOnboarding}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Restart Onboarding
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
