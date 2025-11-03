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
  const [password, setPassword] = useState("")

  const activeUsers = users.filter((u) => u.isActive)
  const selectedUser = activeUsers.find((u) => u.id === selectedUserId)

  const handleLogin = () => {
    if (!selectedUserId) return

    if (selectedUser?.password) {
      if (password !== selectedUser.password) {
        alert("Contraseña incorrecta")
        return
      }
    }

    onLogin(selectedUserId)
  }

  const handleUserChange = (userId: string) => {
    setSelectedUserId(userId)
    const user = activeUsers.find((u) => u.id === userId)
    if (user?.password) {
      setPassword(user.password)
    } else {
      setPassword("")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && selectedUserId) {
      handleLogin()
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
                <Select value={selectedUserId} onValueChange={handleUserChange}>
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
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="text"
                  placeholder="Ingrese su contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleLogin}
                disabled={!selectedUserId || (!!selectedUser?.password && !password)}
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
