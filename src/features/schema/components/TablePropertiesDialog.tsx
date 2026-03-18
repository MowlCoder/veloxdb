import { useEffect, useMemo, useState } from 'react'
import { SpinnerGapIcon, CheckIcon } from '@phosphor-icons/react'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { ColumnProperties, TableInfo } from '@/data/types'
import { useApplyTablePropertiesMutation, useTablePropertiesQuery } from '@/features/schema/queries'

type TablePropertiesDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  connectionId: string | undefined
  table: TableInfo | null
}

type DraftColumn = {
  isNullable: boolean
  isUnique: boolean
}

function ToggleButton({
  checked,
  disabled,
  onClick,
}: {
  checked: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="flex items-center justify-center rounded-sm border border-border/80 bg-background/50 p-1 transition hover:bg-muted/30 disabled:opacity-50"
      disabled={disabled}
      aria-pressed={checked}
      onClick={onClick}
    >
      {checked ? <CheckIcon className="size-3" /> : <span className="size-3 rounded-[2px] border border-border/80" />}
    </button>
  )
}

function formatConstraintHint(column: ColumnProperties) {
  if (column.isPrimaryKey) return 'Primary key'
  if (column.isPartOfCompositeUnique) return 'Composite UNIQUE'
  return undefined
}

export function TablePropertiesDialog({
  open,
  onOpenChange,
  connectionId,
  table,
}: TablePropertiesDialogProps) {
  const propertiesQuery = useTablePropertiesQuery({
    connectionId,
    table,
    enabled: open && Boolean(connectionId && table),
  })
  const applyMutation = useApplyTablePropertiesMutation()

  const columns = propertiesQuery.data ?? []

  const [draft, setDraft] = useState<Record<string, DraftColumn>>({})

  useEffect(() => {
    if (!propertiesQuery.data) return

    const next: Record<string, DraftColumn> = {}
    for (const col of propertiesQuery.data) {
      next[col.columnName] = { isNullable: col.isNullable, isUnique: col.isUnique }
    }
    setDraft(next)
  }, [propertiesQuery.data])

  const targetTableLabel = table ? `${table.schema}.${table.name}` : '—'

  const isDirty = useMemo(() => {
    if (!propertiesQuery.data) return false
    return propertiesQuery.data.some((col) => {
      const d = draft[col.columnName]
      return d ? d.isNullable !== col.isNullable || d.isUnique !== col.isUnique : false
    })
  }, [propertiesQuery.data, draft])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl border border-border p-0 sm:max-w-3xl">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle>Table properties</DialogTitle>
          <DialogDescription>Configure nullability and UNIQUE constraints for columns.</DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[70vh] flex-col overflow-hidden">
          <div className="px-5 py-3 text-xs text-muted-foreground">
            Editing: <span className="text-foreground">{targetTableLabel}</span>
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-5 pb-5">
            {propertiesQuery.isLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
                <SpinnerGapIcon className="size-4 animate-spin" />
                Loading properties...
              </div>
            ) : null}

            {propertiesQuery.isError ? (
              <div className="py-4 text-xs text-destructive">
                {propertiesQuery.error instanceof Error ? propertiesQuery.error.message : 'Failed to load properties'}
              </div>
            ) : null}

            {propertiesQuery.isSuccess && columns.length === 0 ? (
              <div className="py-4 text-xs text-muted-foreground">No columns found for this table.</div>
            ) : null}

            {propertiesQuery.isSuccess && columns.length > 0 ? (
              <div className="divide-y divide-border">
                {columns.map((col) => {
                  const d = draft[col.columnName] ?? {
                    isNullable: col.isNullable,
                    isUnique: col.isUnique,
                  }

                  const uniqueDisabled = col.isPrimaryKey || col.isPartOfCompositeUnique
                  const nullableDisabled = col.isPrimaryKey
                  const hint = formatConstraintHint(col)

                  return (
                    <div key={col.columnName} className="grid grid-cols-[1.4fr_1fr_auto_auto] items-center gap-3 py-3">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium text-foreground">{col.columnName}</div>
                        <div className="truncate text-[11px] text-muted-foreground">{col.dataType}</div>
                      </div>

                      <div className="min-w-0 text-xs text-muted-foreground">
                        {hint ? <span className="rounded-sm border border-border/60 bg-muted/30 px-2 py-0.5">{hint}</span> : null}
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Nullable</span>
                        <ToggleButton
                          checked={d.isNullable}
                          disabled={nullableDisabled}
                          onClick={() =>
                            setDraft((current) => ({
                              ...current,
                              [col.columnName]: { ...d, isNullable: !d.isNullable },
                            }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Unique</span>
                        <ToggleButton
                          checked={d.isUnique}
                          disabled={uniqueDisabled}
                          onClick={() =>
                            setDraft((current) => ({
                              ...current,
                              [col.columnName]: { ...d, isUnique: !d.isUnique },
                            }))
                          }
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter className="border-t border-border px-5 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={applyMutation.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={applyMutation.isPending || !isDirty || !table || !connectionId}
            onClick={async () => {
              if (!table || !connectionId) return

              const columnsUpdate = columns.map((col) => ({
                columnName: col.columnName,
                isNullable: draft[col.columnName]?.isNullable ?? col.isNullable,
                isUnique: draft[col.columnName]?.isUnique ?? col.isUnique,
              }))

              await applyMutation.mutateAsync({
                connectionId,
                tableSchema: table.schema,
                tableName: table.name,
                columns: columnsUpdate,
              })
              onOpenChange(false)
            }}
          >
            {applyMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

