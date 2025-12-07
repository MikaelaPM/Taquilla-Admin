import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ApiKeyDialog } from '@/components/ApiKeyDialog'
import { useApp } from '@/contexts/AppContext'
import { ApiKey } from '@/lib/types'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, Pencil, Trash, MagnifyingGlass, Key, Copy, Eye, EyeSlash } from '@phosphor-icons/react'

export function ApiKeysPage() {
  const {
    apiKeys,
    currentUserId,
    createApiKey,
    updateApiKey,
    deleteApiKey
  } = useApp()

  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false)
  const [editingApiKey, setEditingApiKey] = useState<ApiKey | undefined>()
  const [deleteApiKeyDialogOpen, setDeleteApiKeyDialogOpen] = useState(false)
  const [apiKeyToDelete, setApiKeyToDelete] = useState<string | null>(null)
  const [apiKeySearch, setApiKeySearch] = useState('')
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())

  const filteredApiKeys = apiKeys.filter((apiKey) => {
    return (
      apiKeySearch === '' ||
      apiKey.name.toLowerCase().includes(apiKeySearch.toLowerCase()) ||
      apiKey.description.toLowerCase().includes(apiKeySearch.toLowerCase())
    )
  })

  const handleSaveApiKey = async (apiKey: ApiKey) => {
    try {
      if (apiKey.id && apiKeys.find(k => k.id === apiKey.id)) {
        const success = await updateApiKey(apiKey.id, {
          name: apiKey.name,
          description: apiKey.description,
          isActive: apiKey.isActive,
          permissions: apiKey.permissions
        })

        if (success) {
          toast.success('API Key actualizada exitosamente')
        } else {
          throw new Error('Error actualizando API Key')
        }
      } else {
        if (!currentUserId) {
          throw new Error('Usuario no autenticado')
        }

        const { key: newKey, success } = await createApiKey({
          name: apiKey.name,
          description: apiKey.description,
          isActive: apiKey.isActive,
          permissions: apiKey.permissions,
          createdBy: currentUserId
        })

        if (success && newKey) {
          toast.success('API Key creada exitosamente')
          setTimeout(() => {
            toast.info(`Nueva API Key: ${newKey}`, {
              duration: 10000,
              description: 'Copia esta key ahora, no podrás verla de nuevo'
            })
          }, 500)
        } else {
          throw new Error('Error creando API Key')
        }
      }

      setEditingApiKey(undefined)
    } catch (error) {
      toast.error('Error guardando la API Key')
    }
  }

  const handleEditApiKey = (apiKey: ApiKey) => {
    setEditingApiKey(apiKey)
    setApiKeyDialogOpen(true)
  }

  const handleDeleteApiKey = (id: string) => {
    setApiKeyToDelete(id)
    setDeleteApiKeyDialogOpen(true)
  }

  const confirmDeleteApiKey = async () => {
    if (!apiKeyToDelete) return

    try {
      const success = await deleteApiKey(apiKeyToDelete)

      if (success) {
        toast.success('API Key eliminada exitosamente')
        setDeleteApiKeyDialogOpen(false)
        setApiKeyToDelete(null)
      } else {
        throw new Error('Error eliminando API Key')
      }
    } catch (error) {
      toast.error('Error eliminando la API Key')
    }
  }

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('API Key copiada al portapapeles')
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold">Gestión de API Keys</h2>
          <p className="text-muted-foreground text-sm">Administrar claves de acceso a la API</p>
        </div>
        <Button onClick={() => setApiKeyDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2" />
          Nueva API Key
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o descripción..."
              value={apiKeySearch}
              onChange={(e) => setApiKeySearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {filteredApiKeys.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Key className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">
              {apiKeys.length === 0 ? 'No hay API Keys creadas' : 'No se encontraron API Keys'}
            </p>
            <p className="text-muted-foreground mb-4">
              {apiKeys.length === 0
                ? 'Cree su primera API Key para empezar'
                : 'Intente con otros criterios de búsqueda'}
            </p>
            {apiKeys.length === 0 && (
              <Button onClick={() => setApiKeyDialogOpen(true)}>
                <Plus className="mr-2" />
                Crear Primera API Key
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <ScrollArea className="h-[400px] md:h-[600px]">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Nombre</TableHead>
                    <TableHead className="whitespace-nowrap">Key</TableHead>
                    <TableHead className="whitespace-nowrap">Descripción</TableHead>
                    <TableHead className="whitespace-nowrap">Estado</TableHead>
                    <TableHead className="whitespace-nowrap">Creada</TableHead>
                    <TableHead className="whitespace-nowrap">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApiKeys.map((apiKey) => (
                    <TableRow key={apiKey.id}>
                      <TableCell className="font-medium whitespace-nowrap text-xs md:text-sm">
                        {apiKey.name}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {visibleKeys.has(apiKey.id)
                              ? apiKey.key
                              : apiKey.key.substring(0, 10) + '••••••••••'}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => toggleKeyVisibility(apiKey.id)}
                          >
                            {visibleKeys.has(apiKey.id) ? <EyeSlash size={14} /> : <Eye size={14} />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(apiKey.key)}
                          >
                            <Copy size={14} />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs md:text-sm max-w-[200px] truncate">
                        {apiKey.description}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant={apiKey.isActive ? 'default' : 'secondary'} className="text-xs">
                          {apiKey.isActive ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs md:text-sm">
                        {format(new Date(apiKey.createdAt), 'dd/MM/yyyy', { locale: es })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditApiKey(apiKey)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteApiKey(apiKey.id)}
                          >
                            <Trash />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </Card>
      )}

      <ApiKeyDialog
        open={apiKeyDialogOpen}
        onOpenChange={(open) => {
          setApiKeyDialogOpen(open)
          if (!open) setEditingApiKey(undefined)
        }}
        apiKey={editingApiKey}
        currentUserId={currentUserId}
        onSave={handleSaveApiKey}
      />

      <Dialog open={deleteApiKeyDialogOpen} onOpenChange={setDeleteApiKeyDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash className="h-5 w-5 text-destructive" />
              Eliminar API Key
            </DialogTitle>
            <DialogDescription className="pt-2 space-y-2">
              <p className="font-medium">
                ¿Está seguro de que desea eliminar esta API Key?
              </p>
              <p className="text-sm">
                Esta acción no se puede deshacer. Cualquier aplicación que use esta key dejará de funcionar.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteApiKeyDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDeleteApiKey}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
