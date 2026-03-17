import { useMemo, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

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
import type { ConnectionInput } from '@/lib/tauri'

const connectionSchema = z.object({
  name: z.string().min(2, 'Enter a connection name.'),
  host: z.string().min(1, 'Host is required.'),
  port: z.coerce.number().int().min(1).max(65535),
  database: z.string().min(1, 'Database is required.'),
  user: z.string().min(1, 'User is required.'),
  password: z.string().min(1, 'Password is required.'),
})

type ConnectionFormInput = z.input<typeof connectionSchema>
type ConnectionFormValues = z.output<typeof connectionSchema>

type ConnectionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: ConnectionInput) => Promise<void> | void
  isPending?: boolean
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <label className="space-y-2 text-left text-xs text-muted-foreground">
      <span className="block uppercase tracking-[0.18em]">{label}</span>
      {children}
      {error ? <span className="block text-destructive">{error}</span> : null}
    </label>
  )
}

export function ConnectionDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending = false,
}: ConnectionDialogProps) {
  const defaultValues = useMemo<ConnectionFormInput>(
    () => ({
      name: 'Local Postgres',
      host: '127.0.0.1',
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: '',
    }),
    [],
  )

  const form = useForm<ConnectionFormInput, undefined, ConnectionFormValues>({
    resolver: zodResolver(connectionSchema),
    defaultValues,
  })

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl border border-border p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle>New connection</DialogTitle>
          <DialogDescription>
            Credentials are sent straight to the Tauri backend and persisted there.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5 px-5 py-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Connection name" error={form.formState.errors.name?.message}>
              <Input {...form.register('name')} placeholder="VeloxDB local" />
            </Field>

            <Field label="Host" error={form.formState.errors.host?.message}>
              <Input {...form.register('host')} placeholder="127.0.0.1" />
            </Field>

            <Field label="Port" error={form.formState.errors.port?.message}>
              <Input {...form.register('port')} inputMode="numeric" />
            </Field>

            <Field label="Database" error={form.formState.errors.database?.message}>
              <Input {...form.register('database')} placeholder="postgres" />
            </Field>

            <Field label="User" error={form.formState.errors.user?.message}>
              <Input {...form.register('user')} placeholder="postgres" />
            </Field>

            <Field label="Password" error={form.formState.errors.password?.message}>
              <Input {...form.register('password')} type="password" />
            </Field>
          </div>

          <DialogFooter className="border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Connecting...' : 'Connect'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
