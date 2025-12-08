import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ApiKeyDialog } from '@/components/ApiKeyDialog'
import { useApp } from '@/contexts/AppContext'
import { ApiKey } from '@/lib/types'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, Pencil, Trash, MagnifyingGlass, Key, Copy, Eye, EyeSlash, Warning, CheckCircle, XCircle } from '@phosphor-icons/react'

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [apiKeyToDelete, setApiKeyToDelete] = useState<ApiKey | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())

  const filteredApiKeys = useMemo(() => {
    return apiKeys.filter(apiKey => {
      const matchesSearch = search === '' ||
        apiKey.name.toLowerCase().includes(search.toLowerCase()) ||
        apiKey.description.toLowerCase().includes(search.toLowerCase())

      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && apiKey.isActive) ||
        (statusFilter === 'inactive' && !apiKey.isActive)

      return matchesSearch && matchesStatus
    })
  }, [apiKeys, search, statusFilter])

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

  const handleDeleteClick = (apiKey: ApiKey) => {
    setApiKeyToDelete(apiKey)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!apiKeyToDelete) return

    setIsDeleting(true)
    try {
      const success = await deleteApiKey(apiKeyToDelete.id)
      if (success) {
        toast.success('API Key eliminada exitosamente')
        setDeleteDialogOpen(false)
        setApiKeyToDelete(null)
      } else {
        throw new Error('Error eliminando API Key')
      }
    } catch (error) {
      toast.error('Error eliminando la API Key')
    } finally {
      setIsDeleting(false)
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Gestiona las claves de acceso a la API
              </CardDescription>
            </div>
            <Button onClick={() => { setEditingApiKey(undefined); setApiKeyDialogOpen(true) }}>
              <Plus className="mr-2" weight="bold" />
              Nueva API Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Barra de búsqueda */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o descripción..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Estadísticas - Filtros clickeables */}
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
                className="h-8"
              >
                Total: {apiKeys.length}
              </Button>
              <Button
                variant={statusFilter === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('active')}
                className={`h-8 ${statusFilter === 'active' ? 'bg-green-600 hover:bg-green-700' : 'text-green-600 border-green-600 hover:bg-green-50'}`}
              >
                Activas: {apiKeys.filter(k => k.isActive).length}
              </Button>
              <Button
                variant={statusFilter === 'inactive' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('inactive')}
                className={`h-8 ${statusFilter === 'inactive' ? 'bg-red-600 hover:bg-red-700' : 'text-red-600 border-red-600 hover:bg-red-50'}`}
              >
                Inactivas: {apiKeys.filter(k => !k.isActive).length}
              </Button>
            </div>

            {/* Tabla */}
            {filteredApiKeys.length === 0 ? (
              <div className="text-center py-8">
                <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {search || statusFilter !== 'all' ? 'No se encontraron API Keys' : 'No hay API Keys registradas'}
                </p>
                {!search && statusFilter === 'all' && (
                  <Button onClick={() => setApiKeyDialogOpen(true)} variant="outline" className="mt-4">
                    <Plus className="mr-2" weight="bold" />
                    Crear Primera API Key
                  </Button>
                )}
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Creada</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApiKeys.map((apiKey) => (
                      <TableRow key={apiKey.id}>
                        <TableCell>
                          <span className="font-medium">{apiKey.name}</span>
                        </TableCell>
                        <TableCell>
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
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">
                          {apiKey.description || '-'}
                        </TableCell>
                        <TableCell>
                          {apiKey.isActive ? (
                            <Badge variant="default" className="gap-1 bg-green-600">
                              <CheckCircle weight="fill" size={14} />
                              Activa
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <XCircle weight="fill" size={14} />
                              Inactiva
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {apiKey.createdAt ? format(new Date(apiKey.createdAt), "dd MMM yyyy", { locale: es }) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditApiKey(apiKey)}
                            >
                              <Pencil size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(apiKey)}
                            >
                              <Trash size={16} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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

      {/* Diálogo de confirmación para eliminar */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <Warning className="h-6 w-6 text-destructive" weight="fill" />
              </div>
              <div>
                <DialogTitle>Eliminar API Key</DialogTitle>
                <DialogDescription>
                  Esta acción no se puede deshacer
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              ¿Está seguro que desea eliminar la API Key <span className="font-semibold text-foreground">"{apiKeyToDelete?.name}"</span>?
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Cualquier aplicación que use esta key dejará de funcionar.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash className="mr-2 h-4 w-4" />
                  Eliminar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
