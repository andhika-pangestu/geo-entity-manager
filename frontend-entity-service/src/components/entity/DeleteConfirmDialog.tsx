/**
 * @file DeleteConfirmDialog.tsx
 * @description Confirmation modal before permanently deleting an entity.
 */

import { AlertTriangle } from 'lucide-react'
import { useEntityStore } from '@/store/useEntityStore'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/shared/Modal'

export function DeleteConfirmDialog() {
  const { deletingEntity, isSubmitting, closeDeleteDialog, deleteEntity } = useEntityStore()

  if (!deletingEntity) return null

  const handleConfirmDelete = async () => {
    await deleteEntity(deletingEntity.id)
  }

  return (
    <Modal
      open={Boolean(deletingEntity)}
      onClose={closeDeleteDialog}
      title="Konfirmasi Hapus Entitas"
      description="Tindakan ini akan menghapus entitas dari peta operasional."
    >
      <div className="flex flex-col gap-4">
        <Alert variant="warning">
          <AlertTriangle />
          <AlertTitle>
            Apakah Anda yakin ingin menghapus &ldquo;{deletingEntity.name}&rdquo;?
          </AlertTitle>
          <AlertDescription className="text-muted-foreground">
            ID: <span className="font-mono">{deletingEntity.id}</span> | Tipe:{' '}
            <span className="font-mono">{deletingEntity.type}</span>
          </AlertDescription>
        </Alert>

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={closeDeleteDialog}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirmDelete}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Menghapus...' : 'Ya, Hapus Entitas'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
