import { ComercializadorasTab } from '@/components/ComercializadorasTab'
import { useApp } from '@/contexts/AppContext'
import { toast } from 'sonner'

export function ComercializadorasPage() {
  const {
    comercializadoras,
    comercializadorasLoading,
    createComercializadora,
    updateComercializadora,
    deleteComercializadora,
    currentUserId,
    createUser,
    agencies
  } = useApp()

  return (
    <ComercializadorasTab
      comercializadoras={comercializadoras}
      agencies={agencies}
      isLoading={comercializadorasLoading}
      onCreate={createComercializadora}
      onUpdate={updateComercializadora}
      onDelete={async (id) => {
        const success = await deleteComercializadora(id)
        if (!success) {
          toast.error('No se pudo eliminar la comercializadora')
        }
      }}
      currentUserId={currentUserId}
      createUser={createUser}
    />
  )
}
