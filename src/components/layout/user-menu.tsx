'use client'

import { useSession, signOut } from 'next-auth/react'
import Image from 'next/image'

export function UserMenu() {
  const { data: session } = useSession()

  if (!session?.user) return null

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-600 hidden sm:block">
        {session.user.email}
      </span>
      {session.user.image && (
        <Image
          src={session.user.image}
          alt={session.user.name ?? 'User'}
          width={28}
          height={28}
          className="rounded-full"
        />
      )}
      <button
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="text-xs text-slate-500 hover:text-slate-800 transition-colors px-2 py-1 rounded hover:bg-slate-100"
      >
        Sign out
      </button>
    </div>
  )
}
