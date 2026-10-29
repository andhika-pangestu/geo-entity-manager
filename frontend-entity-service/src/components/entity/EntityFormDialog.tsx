/**
 * @file EntityFormDialog.tsx
 * @description Modal for creating/updating entities: React Hook Form + Zod, coordinate
 * pre-filling, dynamic type chips and JSON metadata editing. Fields are composed with
 * `FormField`; vertical spacing comes from the form's `gap-*`.
 */

import { useEffect, useRef, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, AlertTriangle, Check, ChevronDown, MapPin, Plus, Trash2 } from 'lucide-react'
import {
  entityFormSchema,
  parseMetadataJson,
  type EntityFormValues,
} from '@/schemas/entitySchema'
import { getTypeColor, previewTypeColor } from '@/lib/mapIcons'
import { useEntityStore } from '@/store/useEntityStore'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FormField } from '@/components/shared/FormField'
import { Modal } from '@/components/shared/Modal'

const DEFAULT_LATITUDE = -6.2088
const DEFAULT_LONGITUDE = 106.8456

function getSubmitLabel(isSubmitting: boolean, isEditMode: boolean): string {
  if (isSubmitting) return 'Menyimpan...'
  return isEditMode ? 'Simpan Perubahan' : 'Buat Entitas'
}

export function EntityFormDialog() {
  const {
    isFormDialogOpen: isOpen,
    editingEntity,
    pickedCoords,
    typeSuggestions,
    isSubmitting,
    error,
    closeFormDialog,
    createEntity,
    updateEntity,
    deleteEntityType,
  } = useEntityStore()

  const isEditMode = editingEntity !== null
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false)
  const [typeDeleteWarning, setTypeDeleteWarning] = useState<string | null>(null)
  const [pendingDeleteType, setPendingDeleteType] = useState<string | null>(null)
  const [isDeletingType, setIsDeletingType] = useState(false)
  const comboboxRef = useRef<HTMLDivElement | null>(null)

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EntityFormValues>({
    resolver: zodResolver(entityFormSchema),
    defaultValues: {
      name: '',
      type: 'vehicle',
      status: 'active',
      latitude: DEFAULT_LATITUDE,
      longitude: DEFAULT_LONGITUDE,
      description: '',
      metadataRaw: '',
    },
  })

  const currentTypeValue = watch('type')
  const normalizedTyped = (currentTypeValue ?? '').trim().toLowerCase()
  const activeDotColor = previewTypeColor(normalizedTyped || 'vehicle').hex
  const isCustomTyped = normalizedTyped.length >= 2 && !typeSuggestions.includes(normalizedTyped)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
        setIsTypeDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset or pre-fill form fields when the dialog opens or the edited entity changes
  useEffect(() => {
    if (!isOpen) {
      setIsTypeDropdownOpen(false)
      setTypeDeleteWarning(null)
      setPendingDeleteType(null)
      return
    }
    setTypeDeleteWarning(null)
    setPendingDeleteType(null)

    if (editingEntity) {
      const hasMetadata = Object.keys(editingEntity.metadata ?? {}).length > 0
      reset({
        name: editingEntity.name,
        type: editingEntity.type,
        status: editingEntity.status,
        latitude: editingEntity.latitude,
        longitude: editingEntity.longitude,
        description: editingEntity.description ?? '',
        metadataRaw: hasMetadata ? JSON.stringify(editingEntity.metadata, null, 2) : '',
      })
    } else {
      reset({
        name: '',
        type: 'vehicle',
        status: 'active',
        latitude: pickedCoords ? pickedCoords[0] : DEFAULT_LATITUDE,
        longitude: pickedCoords ? pickedCoords[1] : DEFAULT_LONGITUDE,
        description: '',
        metadataRaw: '',
      })
    }
  }, [isOpen, editingEntity, pickedCoords, reset])

  const onSubmit = async (values: EntityFormValues) => {
    const payload = {
      name: values.name.trim(),
      type: values.type.trim().toLowerCase(),
      status: values.status,
      latitude: values.latitude,
      longitude: values.longitude,
      description: values.description?.trim() || null,
      metadata: parseMetadataJson(values.metadataRaw),
    }

    if (isEditMode && editingEntity) {
      await updateEntity(editingEntity.id, payload)
    } else {
      await createEntity(payload)
    }
  }

  const submitLabel = getSubmitLabel(isSubmitting, isEditMode)

  return (
    <Modal
      open={isOpen}
      onClose={closeFormDialog}
      title={isEditMode ? 'Edit Entitas Geografis' : 'Tambah Entitas Geografis Baru'}
      description="Masukkan detail identitas, lokasi koordinat, dan atribut entitas."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {(error || typeDeleteWarning) && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{error ?? typeDeleteWarning}</AlertDescription>
          </Alert>
        )}

        <FormField label="Nama Entitas *" htmlFor="entity-name-input" error={errors.name?.message}>
          <Input
            id="entity-name-input"
            placeholder="Contoh: Armada Logistik A-02 / Sensor Cuaca Monas"
            {...register('name')}
          />
        </FormField>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField
            label="Tipe Entitas (Dinamis) *"
            htmlFor="entity-type-input"
            error={errors.type?.message}
          >
            <div ref={comboboxRef} className="relative">
              <div className="relative flex items-center">
                <span
                  className="pointer-events-none absolute left-3 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: activeDotColor }}
                />
                <Input
                  id="entity-type-input"
                  autoComplete="off"
                  placeholder="Pilih atau ketik tipe baru"
                  className="pl-8 pr-8 font-mono text-xs"
                  onFocus={() => setIsTypeDropdownOpen(true)}
                  {...register('type', {
                    onChange: () => {
                      setIsTypeDropdownOpen(true)
                      setTypeDeleteWarning(null)
                    },
                  })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  aria-label="Buka daftar tipe"
                  className="absolute right-1 h-7 w-7 p-0 text-muted-foreground"
                  onClick={() => setIsTypeDropdownOpen((prev) => !prev)}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </div>

              {isTypeDropdownOpen && (
                <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 flex max-h-48 flex-col gap-0.5 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
                  {isCustomTyped && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 justify-start gap-2 px-2 font-mono text-xs text-primary"
                      onClick={() => {
                        setValue('type', normalizedTyped, { shouldValidate: true })
                        setIsTypeDropdownOpen(false)
                      }}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: activeDotColor }}
                      />
                      <Plus className="h-3 w-3 shrink-0" />
                      <span className="truncate">Gunakan tipe baru &quot;{normalizedTyped}&quot;</span>
                    </Button>
                  )}

                  {typeSuggestions.map((suggestion) => {
                    const { hex } = getTypeColor(suggestion)
                    const isSelected = normalizedTyped === suggestion
                    return (
                      <div
                        key={suggestion}
                        className="flex items-center justify-between gap-1 rounded-sm hover:bg-accent"
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 flex-1 justify-start gap-2 px-2 font-mono text-xs"
                          onClick={() => {
                            setValue('type', suggestion, { shouldValidate: true })
                            setTypeDeleteWarning(null)
                            setIsTypeDropdownOpen(false)
                          }}
                        >
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: hex }}
                          />
                          <span className="truncate">{suggestion}</span>
                          {isSelected && <Check className="h-3 w-3 shrink-0 text-primary" />}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          title={`Hapus tipe ${suggestion}`}
                          aria-label={`Hapus tipe ${suggestion}`}
                          className="h-6 w-6 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            setTypeDeleteWarning(null)
                            setIsTypeDropdownOpen(false)
                            setPendingDeleteType(suggestion)
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </FormField>

          <FormField
            label="Status Operasional *"
            htmlFor="entity-status-select"
            error={errors.status?.message}
          >
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="entity-status-select" className="h-9 text-sm">
                    <SelectValue placeholder="Pilih status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active (Beroperasi)</SelectItem>
                    <SelectItem value="maintenance">Maintenance (Perawatan)</SelectItem>
                    <SelectItem value="inactive">Inactive (Non-aktif)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
        </div>

        <Card className="shadow-none">
          <CardContent className="flex flex-col gap-2 p-3.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                Koordinat Geografis WGS 84
              </span>
              <span className="text-2xs text-muted-foreground">
                Lat [-90..90] | Lng [-180..180]
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                label="Latitude *"
                htmlFor="entity-lat-input"
                size="sm"
                tone="muted"
                error={errors.latitude?.message}
              >
                <Input
                  id="entity-lat-input"
                  type="number"
                  step="any"
                  placeholder="-6.2088"
                  {...register('latitude', { valueAsNumber: true })}
                />
              </FormField>

              <FormField
                label="Longitude *"
                htmlFor="entity-lng-input"
                size="sm"
                tone="muted"
                error={errors.longitude?.message}
              >
                <Input
                  id="entity-lng-input"
                  type="number"
                  step="any"
                  placeholder="106.8456"
                  {...register('longitude', { valueAsNumber: true })}
                />
              </FormField>
            </div>
          </CardContent>
        </Card>

        <FormField
          label="Deskripsi (Opsional)"
          htmlFor="entity-desc-input"
          error={errors.description?.message}
        >
          <Textarea
            id="entity-desc-input"
            rows={2}
            placeholder="Catatan operasional, lokasi spesifik, atau keterangan unit..."
            {...register('description')}
          />
        </FormField>

        <FormField
          label="Metadata Atribut Tambahan (JSON Object)"
          htmlFor="entity-metadata-input"
          error={errors.metadataRaw?.message}
        >
          <Textarea
            id="entity-metadata-input"
            variant="code"
            rows={3}
            placeholder='{"battery_pct": 90, "speed_kmh": 45}'
            {...register('metadataRaw')}
          />
        </FormField>

        <div className="flex items-center justify-end gap-2 border-t pt-3">
          <Button type="button" variant="outline" onClick={closeFormDialog}>
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {submitLabel}
          </Button>
        </div>
      </form>

      <Modal
        open={Boolean(pendingDeleteType)}
        onClose={() => setPendingDeleteType(null)}
        title="Konfirmasi Hapus Tipe Entitas"
        description="Tindakan ini akan menghapus tipe dari daftar saran pilihan."
      >
        <div className="flex flex-col gap-4">
          <Alert variant="warning">
            <AlertTriangle />
            <AlertTitle>
              Apakah Anda yakin ingin menghapus tipe &ldquo;{pendingDeleteType}&rdquo;?
            </AlertTitle>
            <AlertDescription className="text-muted-foreground">
              Tipe hanya dapat dihapus jika tidak sedang digunakan oleh entitas aktif mana pun.
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingDeleteType(null)}
              disabled={isDeletingType}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeletingType}
              onClick={async () => {
                if (!pendingDeleteType) return
                const targetType = pendingDeleteType
                setIsDeletingType(true)
                const res = await deleteEntityType(targetType)
                setIsDeletingType(false)
                setPendingDeleteType(null)
                if (!res.ok && res.message) {
                  setTypeDeleteWarning(res.message)
                } else if (normalizedTyped === targetType) {
                  const nextFallback =
                    typeSuggestions.find((t) => t !== targetType) ?? 'vehicle'
                  setValue('type', nextFallback, { shouldValidate: true })
                }
              }}
            >
              {isDeletingType ? 'Menghapus...' : 'Ya, Hapus Tipe'}
            </Button>
          </div>
        </div>
      </Modal>
    </Modal>
  )
}
