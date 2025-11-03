import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { User } from "@/lib/types"
import { UserCircle } from "@phosphor-icons/react"

interface LoginScreenProps {
  users: User[]
  onLogin: (userId: string) => void
}

export function LoginScreen({ users, onLogin }: LoginScreenProps) {
  const [selectedUserId, setSelectedUserId] = useState("")

  const activeUsers = users.filter((u) => u.isActive)

  const handleLogin = () => {
    if (selectedUserId) {
      onLogin(selectedUserId)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <UserCircle className="h-10 w-10 text-primary" weight="fill" />
            </div>
          </div>
          <CardTitle className="text-2xl">Sistema Administrativo</CardTitle>
          <CardDescription>Lotería de Animalitos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeUsers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No hay usuarios activos en el sistema.
              </p>
              <p className="text-sm text-muted-foreground">
                Un administrador debe crear usuarios primero.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="user-select">Seleccione su usuario</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger id="user-select">
                    <SelectValue placeholder="Seleccione un usuario" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña (simulada)</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Ingrese su contraseña"
                  defaultValue="demo"
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  En esta demo, la autenticación está simplificada.
                </p>
              </div>

              <Button
                className="w-full"
                onClick={handleLogin}
                disabled={!selectedUserId}
              >
                Iniciar Sesión
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
