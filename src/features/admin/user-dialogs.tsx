import { useEffect, useState } from 'react'
import { Loader2, Mail, ShieldCheck } from 'lucide-react'
import { FormField } from '@/components/common/form-field'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ROLES } from '@/lib/constants'
import type { Role, SystemUser } from '@/types'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface InviteUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingEmails: string[]
  onSubmit: (input: { name: string; email: string; role: Role }) => Promise<void>
}

export function InviteUserDialog({ open, onOpenChange, existingEmails, onSubmit }: InviteUserDialogProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('employee')
  const [errors, setErrors] = useState<{ name?: string; email?: string; role?: string }>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setName('')
      setEmail('')
      setRole('employee')
      setErrors({})
      setSubmitting(false)
    }
  }, [open])

  const handleSubmit = async () => {
    const nextErrors: { name?: string; email?: string; role?: string } = {}
    const trimmedName = name.trim()
    const trimmedEmail = email.trim().toLowerCase()

    if (!trimmedName) {
      nextErrors.name = 'Full name is required.'
    } else if (trimmedName.length < 2) {
      nextErrors.name = 'Enter at least two characters.'
    }

    if (!trimmedEmail) {
      nextErrors.email = 'Email address is required.'
    } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
      nextErrors.email = 'Enter a valid email address.'
    } else if (existingEmails.some((existing) => existing.toLowerCase() === trimmedEmail)) {
      nextErrors.email = 'A user with this email already exists.'
    }

    if (!role) nextErrors.role = 'Select a role.'

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    try {
      await onSubmit({ name: trimmedName, email: trimmedEmail, role })
      onOpenChange(false)
    } catch {
      // The parent mutation surfaces the error toast.
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a user</DialogTitle>
          <DialogDescription>
            Create a user account. No invitation email is sent in this deployment.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            void handleSubmit()
          }}
        >
          <FormField label="Full name" htmlFor="invite-user-name" error={errors.name} required>
            <Input
              id="invite-user-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setErrors((previous) => ({ ...previous, name: undefined }))
              }}
              placeholder="e.g. Dev Patel"
              disabled={submitting}
              autoFocus
            />
          </FormField>

          <FormField label="Work email" htmlFor="invite-user-email" error={errors.email} required>
            <Input
              id="invite-user-email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                setErrors((previous) => ({ ...previous, email: undefined }))
              }}
              placeholder="name@horizontech.example"
              disabled={submitting}
            />
          </FormField>

          <FormField
            label="Role"
            htmlFor="invite-user-role"
            error={errors.role}
            hint="role permissions"
            required
          >
            <Select value={role} onValueChange={(value) => setRole(value as Role)} disabled={submitting}>
              <SelectTrigger id="invite-user-role" aria-label="Invite user role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <div className="rounded-lg border border-sky-100 bg-sky-50/70 px-3 py-2 text-[11.5px] leading-relaxed text-sky-800">
            <div className="flex items-center gap-1.5 font-medium">
              <Mail className="size-3.5" />
              Invitation created
            </div>
            <p className="mt-0.5">
              The new identity starts as <span className="font-medium">Invited</span> and is stored by the HRMS API.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : <Mail />}
              Send invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface ChangeRoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: SystemUser | null
  onSubmit: (role: Role) => Promise<void>
}

export function ChangeRoleDialog({ open, onOpenChange, user, onSubmit }: ChangeRoleDialogProps) {
  const [role, setRole] = useState<Role>('employee')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open && user) {
      setRole(user.role)
      setSubmitting(false)
    }
  }, [open, user])

  const handleSubmit = async () => {
    if (!user) return
    setSubmitting(true)
    try {
      await onSubmit(role)
      onOpenChange(false)
    } catch {
      // The parent mutation surfaces the error toast.
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change user role</DialogTitle>
          <DialogDescription>
            Update the role for {user?.name ?? 'this user'}. The change takes effect the next time the user signs in.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            void handleSubmit()
          }}
        >
          <div className="rounded-lg border border-border bg-slate-50/70 px-3 py-2.5 text-[12px]">
            <p className="font-medium text-slate-700">{user?.name}</p>
            <p className="text-slate-500">{user?.email}</p>
            <p className="mt-1 text-[11px] text-slate-400">
              Current role: {ROLES.find((option) => option.value === user?.role)?.label ?? user?.role}
            </p>
          </div>

          <FormField label="New role" htmlFor="change-user-role" required>
            <Select value={role} onValueChange={(value) => setRole(value as Role)} disabled={submitting}>
              <SelectTrigger id="change-user-role" aria-label="New role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-[11.5px] leading-relaxed text-amber-900">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
            <p>
              Changing a role does not alter the current session's permissions. The user must sign in again to receive
              the new role.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !user || role === user.role}>
              {submitting ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
              Update role
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
