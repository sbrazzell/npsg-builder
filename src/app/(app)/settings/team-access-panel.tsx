'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Users, Trash2, ShieldCheck, User, Plus, AlertCircle } from 'lucide-react'
import { addAllowedUser, removeAllowedUser, updateUserRole } from '@/actions/allowed-users'

interface AllowedUser {
  id: string
  email: string
  role: string
  addedAt: Date
  addedBy: string | null
}

interface Props {
  users: AllowedUser[]
  currentEmail: string
  isAdmin: boolean
}

function RoleBadge({ role }: { role: string }) {
  return role === 'admin' ? (
    <Badge className="bg-violet-100 text-violet-800 border-violet-200 gap-1 text-[11px]">
      <ShieldCheck className="h-3 w-3" /> Admin
    </Badge>
  ) : (
    <Badge variant="outline" className="gap-1 text-[11px] text-slate-600">
      <User className="h-3 w-3" /> Member
    </Badge>
  )
}

export function TeamAccessPanel({ users: initialUsers, currentEmail, isAdmin }: Props) {
  const [users, setUsers]     = useState<AllowedUser[]>(initialUsers)
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole]  = useState<'admin' | 'member'>('member')
  const [error, setError]      = useState<string | null>(null)
  const [success, setSuccess]  = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function flash(msg: string, type: 'success' | 'error') {
    if (type === 'success') { setSuccess(msg); setError(null) }
    else                    { setError(msg);   setSuccess(null) }
    setTimeout(() => { setSuccess(null); setError(null) }, 4000)
  }

  function handleAdd() {
    const email = newEmail.trim().toLowerCase()
    if (!email) { flash('Enter an email address.', 'error'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { flash('Enter a valid email address.', 'error'); return }

    startTransition(async () => {
      const result = await addAllowedUser({ email, role: newRole })
      if (!result.success) { flash(result.error ?? 'Failed to add user.', 'error'); return }
      setUsers(prev => [...prev, result.data as AllowedUser])
      setNewEmail('')
      flash(`${email} added as ${newRole}.`, 'success')
    })
  }

  function handleRemove(id: string, email: string) {
    startTransition(async () => {
      const result = await removeAllowedUser(id)
      if (!result.success) { flash(result.error ?? 'Failed to remove user.', 'error'); return }
      setUsers(prev => prev.filter(u => u.id !== id))
      flash(`${email} removed.`, 'success')
    })
  }

  function handleRoleChange(id: string, role: 'admin' | 'member') {
    startTransition(async () => {
      const result = await updateUserRole(id, role)
      if (!result.success) { flash(result.error ?? 'Failed to update role.', 'error'); return }
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u))
    })
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          Team Access
          <span className="ml-auto text-xs font-normal text-muted-foreground tabular-nums">
            {users.length} {users.length === 1 ? 'user' : 'users'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Status messages */}
        {error && (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
            {success}
          </div>
        )}

        {/* Users table */}
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No users yet. Add one below.</p>
        ) : (
          <div className="divide-y divide-slate-100 rounded-md border">
            {users.map((user) => {
              const isSelf = user.email === currentEmail
              return (
                <div key={user.id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {user.email}
                      {isSelf && (
                        <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
                      )}
                    </p>
                    {user.addedBy && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        Added {new Date(user.addedAt).toLocaleDateString()}
                        {user.addedBy !== 'env:ALLOWED_EMAILS' && ` by ${user.addedBy}`}
                      </p>
                    )}
                  </div>

                  {/* Role selector — admins only */}
                  {isAdmin ? (
                    <Select
                      value={user.role}
                      onValueChange={(v) => handleRoleChange(user.id, v as 'admin' | 'member')}
                      disabled={isPending}
                    >
                      <SelectTrigger className="h-7 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <RoleBadge role={user.role} />
                  )}

                  {/* Remove button — admins only, cannot remove self */}
                  {isAdmin && !isSelf && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                      onClick={() => handleRemove(user.id, user.email)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Add user form — admins only */}
        {isAdmin ? (
          <div className="pt-1">
            <p className="text-xs font-medium text-slate-700 mb-2">Add a team member</p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="colleague@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                className="h-8 text-sm flex-1"
                disabled={isPending}
              />
              <Select
                value={newRole}
                onValueChange={(v) => setNewRole(v as 'admin' | 'member')}
                disabled={isPending}
              >
                <SelectTrigger className="h-8 w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="h-8"
                onClick={handleAdd}
                disabled={isPending || !newEmail.trim()}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              The person must sign in with the Google account matching this email.
              Admins can add/remove users and change roles; members can view the list.
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Only admins can add or remove team members. Contact an admin to make changes.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
