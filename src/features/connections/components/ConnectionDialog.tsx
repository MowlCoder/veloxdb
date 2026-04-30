import { useMemo, type ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
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
import type { ConnectionInput, SshAuthMethod } from '@/data/types'
import { cn } from '@/lib/utils'

const sslModeSchema = z.enum(['disable', 'prefer', 'require'])
const sshAuthMethodSchema = z.enum(['keyfile', 'password'])

const connectionSchema = z
  .object({
    name: z.string().min(2, 'Enter a connection name.'),
    host: z.string().min(1, 'Host is required.'),
    port: z.coerce.number().int().min(1).max(65535),
    database: z.string().min(1, 'Database is required.'),
    user: z.string().min(1, 'User is required.'),
    password: z.string().min(1, 'Password is required.'),
    sslMode: sslModeSchema,
    sshEnabled: z.boolean(),
    sshHost: z.string().optional(),
    sshPort: z.coerce.number().int().min(1).max(65535).optional(),
    sshUser: z.string().optional(),
    sshAuthMethod: sshAuthMethodSchema.optional(),
    sshPassword: z.string().optional(),
    sshPrivateKeyPath: z.string().optional(),
    sshPassphrase: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (!values.sshEnabled) return
    if (!values.sshHost || values.sshHost.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'SSH host is required.',
        path: ['sshHost'],
      })
    }
    if (!values.sshUser || values.sshUser.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'SSH user is required.',
        path: ['sshUser'],
      })
    }
    if (values.sshAuthMethod === 'password') {
      if (!values.sshPassword || values.sshPassword.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'SSH password is required.',
          path: ['sshPassword'],
        })
      }
    }
  })


type ConnectionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: ConnectionInput) => Promise<void> | void
  isPending?: boolean
}

function Field({
  label,
  error,
  inputId,
  children,
}: {
  label: string
  error?: string
  inputId: string
  children: ReactNode
}) {
  return (
    <label htmlFor={inputId} className="space-y-2 text-left text-xs text-muted-foreground">
      <span className="block uppercase tracking-[0.18em]">{label}</span>
      {children}
      {error ? <span className="block text-destructive">{error}</span> : null}
    </label>
  )
}

const selectClassName = cn(
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors',
  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
)

export function ConnectionDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending = false,
}: ConnectionDialogProps) {
  const defaultValues = useMemo(
    () => ({
      name: 'Local Postgres',
      host: '127.0.0.1',
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: '',
      sslMode: 'prefer' as const,
      sshEnabled: false,
      sshHost: '',
      sshPort: 22,
      sshUser: '',
      sshAuthMethod: 'keyfile' as SshAuthMethod,
      sshPassword: '',
      sshPrivateKeyPath: '',
      sshPassphrase: '',
    }),
    [],
  )

  const form = useForm({
    resolver: zodResolver(connectionSchema),
    defaultValues,
  })

  const sshEnabled = useWatch({ control: form.control, name: 'sshEnabled' })
  const sshAuthMethod = useWatch({ control: form.control, name: 'sshAuthMethod' })

  const handleSubmit = form.handleSubmit((values) => {
    const input: ConnectionInput = {
      name: values.name,
      host: values.host,
      port: values.port,
      database: values.database,
      user: values.user,
      password: values.password,
      sslMode: values.sslMode,
      sshConfig: values.sshEnabled
        ? {
            enabled: true,
            host: values.sshHost!,
            port: values.sshPort!,
            user: values.sshUser!,
            authMethod: values.sshAuthMethod!,
            password: values.sshPassword || null,
            privateKeyPath: values.sshPrivateKeyPath || null,
            passphrase: values.sshPassphrase || null,
          }
        : null,
    }
    void onSubmit(input)
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
            <Field
              label="Connection name"
              inputId="veloxdb-connection-name"
              error={form.formState.errors.name?.message}
            >
              <Input
                id="veloxdb-connection-name"
                {...form.register('name')}
                placeholder="VeloxDB local"
              />
            </Field>

            <Field
              label="Host"
              inputId="veloxdb-connection-host"
              error={form.formState.errors.host?.message}
            >
              <Input
                id="veloxdb-connection-host"
                {...form.register('host')}
                placeholder="127.0.0.1"
              />
            </Field>

            <Field
              label="Port"
              inputId="veloxdb-connection-port"
              error={form.formState.errors.port?.message}
            >
              <Input id="veloxdb-connection-port" {...form.register('port')} inputMode="numeric" />
            </Field>

            <Field
              label="Database"
              inputId="veloxdb-connection-database"
              error={form.formState.errors.database?.message}
            >
              <Input
                id="veloxdb-connection-database"
                {...form.register('database')}
                placeholder="postgres"
              />
            </Field>

            <Field
              label="User"
              inputId="veloxdb-connection-user"
              error={form.formState.errors.user?.message}
            >
              <Input id="veloxdb-connection-user" {...form.register('user')} placeholder="postgres" />
            </Field>

            <Field
              label="Password"
              inputId="veloxdb-connection-password"
              error={form.formState.errors.password?.message}
            >
              <Input id="veloxdb-connection-password" {...form.register('password')} type="password" />
            </Field>

            <Field
              label="SSL mode"
              inputId="veloxdb-connection-ssl-mode"
              error={form.formState.errors.sslMode?.message}
            >
              <select
                id="veloxdb-connection-ssl-mode"
                className={selectClassName}
                {...form.register('sslMode')}
              >
                <option value="disable">Disable (plain TCP)</option>
                <option value="prefer">Prefer (try TLS; local Postgres)</option>
                <option value="require">Require (Neon, hosted Postgres)</option>
              </select>
            </Field>
          </div>

          <div className="border-t border-border pt-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-foreground">
              <input
                type="checkbox"
                {...form.register('sshEnabled')}
                className="h-4 w-4 rounded border-input"
              />
              Connect via SSH tunnel
            </label>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground/90">
              Tunnel the database connection through a bastion/jump host. Key-based auth is
              recommended. Password auth requires{' '}
              <code className="rounded bg-muted px-1 py-px text-[11px]">sshpass</code> installed.
            </p>
          </div>

          {sshEnabled && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="SSH host"
                inputId="veloxdb-ssh-host"
                error={form.formState.errors.sshHost?.message}
              >
                <Input
                  id="veloxdb-ssh-host"
                  {...form.register('sshHost')}
                  placeholder="bastion.example.com"
                />
              </Field>

              <Field
                label="SSH port"
                inputId="veloxdb-ssh-port"
                error={form.formState.errors.sshPort?.message}
              >
                <Input
                  id="veloxdb-ssh-port"
                  {...form.register('sshPort')}
                  inputMode="numeric"
                  placeholder="22"
                />
              </Field>

              <Field
                label="SSH user"
                inputId="veloxdb-ssh-user"
                error={form.formState.errors.sshUser?.message}
              >
                <Input
                  id="veloxdb-ssh-user"
                  {...form.register('sshUser')}
                  placeholder="ubuntu"
                />
              </Field>

              <Field
                label="Auth method"
                inputId="veloxdb-ssh-auth-method"
                error={form.formState.errors.sshAuthMethod?.message}
              >
                <select
                  id="veloxdb-ssh-auth-method"
                  className={selectClassName}
                  {...form.register('sshAuthMethod')}
                >
                  <option value="keyfile">Key file (recommended)</option>
                  <option value="password">Password</option>
                </select>
              </Field>

              {sshAuthMethod === 'password' && (
                <Field
                  label="SSH password"
                  inputId="veloxdb-ssh-password"
                  error={form.formState.errors.sshPassword?.message}
                >
                  <Input
                    id="veloxdb-ssh-password"
                    {...form.register('sshPassword')}
                    type="password"
                    placeholder="SSH user password"
                  />
                </Field>
              )}

              {sshAuthMethod === 'keyfile' && (
                <>
                  <Field
                    label="Private key path"
                    inputId="veloxdb-ssh-key-path"
                    error={form.formState.errors.sshPrivateKeyPath?.message}
                  >
                    <Input
                      id="veloxdb-ssh-key-path"
                      {...form.register('sshPrivateKeyPath')}
                      placeholder="~/.ssh/id_rsa (optional)"
                    />
                  </Field>

                  <Field
                    label="Passphrase"
                    inputId="veloxdb-ssh-passphrase"
                    error={form.formState.errors.sshPassphrase?.message}
                  >
                    <Input
                      id="veloxdb-ssh-passphrase"
                      {...form.register('sshPassphrase')}
                      type="password"
                      placeholder="Key passphrase (optional)"
                    />
                  </Field>
                </>
              )}
            </div>
          )}

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
