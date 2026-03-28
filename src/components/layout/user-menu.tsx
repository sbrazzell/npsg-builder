'use client'

import { useSession, signOut } from 'next-auth/react'
import Image from 'next/image'

export function UserMenu() {
  const { data: session } = useSession()

  if (!session?.user) return null

  return (
    <div className="flex items-center gap-2">
      {session.user.image && (
        <Image
          src={session.user.image}
          alt={session.user.name ?? 'User'}
          width={28}
          height={28}
          className="rounded-full shrink-0"
        />
      )}
      <span className="text-sm text-slate-600 hidden md:block max-w-[160px] truncate">
        {session.user.name ?? session.user.email}
      </span>
      <button
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="text-xs text-slate-500 hover:text-slate-800 transition-colors px-2 py-1 rounded hover:bg-slate-100 shrink-0"
      >
        Sign out
      </button>
    </div>
  )
}
