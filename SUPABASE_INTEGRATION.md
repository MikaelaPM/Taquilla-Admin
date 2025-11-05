# Integración con Supabase - Guía Completa

## 📋 Resumen

Este proyecto incluye integración completa con Supabase para persistencia de datos, autenticación y sincronización en tiempo real.

## 🚀 Configuración Inicial

### 1. Configurar Variables de Entorno

Ya se ha creado el archivo `.env` con las plantillas necesarias. Debes reemplazar los valores con tus credenciales reales de Supabase:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

**Dónde obtener estas credenciales:**

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto (o crea uno nuevo)
3. Ve a **Settings** > **API**
4. Copia:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_ANON_KEY`

### 2. Ejecutar el Schema SQL

El archivo `supabase-schema.sql` contiene toda la estructura de la base de datos:

1. En el Dashboard de Supabase, ve a **SQL Editor**
2. Crea una nueva consulta
3. Copia y pega todo el contenido de `supabase-schema.sql`
4. Ejecuta el script (botón **Run**)
5. Verifica que se hayan creado todas las tablas en **Table Editor**

### 3. Crear Usuario Administrador

Después de ejecutar el schema, crea el primer usuario administrador:

```sql
-- Inserta el usuario administrador
WITH new_user AS (
  INSERT INTO users (name, email, password_hash, is_active)
  VALUES (
    'Administrador Principal',
    'admin@loteria.com',
    crypt('TuContraseñaSegura123!', gen_salt('bf')),
    TRUE
  )
  RETURNING id
)
INSERT INTO user_roles (user_id, role_id)
SELECT 
  new_user.id,
  roles.id
FROM new_user, roles
WHERE roles.name = 'Administrador';
```

**⚠️ IMPORTANTE:** Cambia `'TuContraseñaSegura123!'` por una contraseña segura.

## 📁 Estructura de Archivos

```
/workspaces/spark-template/
├── .env                          # Variables de entorno (NO SUBIR A GIT)
├── .env.example                  # Plantilla de variables de entorno
├── supabase-schema.sql           # Schema completo de la base de datos
├── SUPABASE_SETUP.md            # Documentación detallada de Supabase
├── SUPABASE_INTEGRATION.md      # Este archivo
└── src/
    └── config/
        └── supabase.ts          # Cliente de Supabase configurado
```

## 🔧 Uso del Cliente de Supabase

### Importar el Cliente

```typescript
import { supabase } from '@/config/supabase'
```

### Ejemplos de Uso

#### Consultar Datos

```typescript
// Obtener todas las loterías activas
const { data, error } = await supabase
  .from('lotteries')
  .select('*')
  .eq('is_active', true)

if (error) {
  console.error('Error:', error)
} else {
  console.log('Loterías:', data)
}
```

#### Insertar Datos

```typescript
// Crear una nueva jugada
const { data, error } = await supabase
  .from('bets')
  .insert({
    lottery_id: 'uuid-loteria',
    lottery_name: 'Lotto Activo',
    animal_number: '12',
    animal_name: 'Caballo',
    amount: 100,
    potential_win: 5000,
  })
  .select()

if (error) {
  console.error('Error:', error)
} else {
  console.log('Jugada creada:', data)
}
```

#### Actualizar Datos

```typescript
// Actualizar el balance de un pote
const { data, error } = await supabase
  .from('pots')
  .update({ balance: 50000 })
  .eq('name', 'Pote de Premios')

if (error) {
  console.error('Error:', error)
}
```

#### Eliminar Datos

```typescript
// Eliminar una lotería
const { error } = await supabase
  .from('lotteries')
  .delete()
  .eq('id', 'uuid-loteria')

if (error) {
  console.error('Error:', error)
}
```

#### Relaciones y Joins

```typescript
// Obtener loterías con sus premios
const { data, error } = await supabase
  .from('lotteries')
  .select(`
    *,
    prizes (*)
  `)
  .eq('is_active', true)
```

#### Funciones Personalizadas

```typescript
// Obtener permisos de un usuario
const { data, error } = await supabase
  .rpc('get_user_permissions', {
    user_uuid: 'uuid-del-usuario'
  })

console.log('Permisos:', data)
```

#### Vistas

```typescript
// Obtener estadísticas de loterías
const { data, error } = await supabase
  .from('lottery_statistics')
  .select('*')
  .order('total_bets', { ascending: false })
```

### Subscripciones en Tiempo Real

```typescript
// Escuchar cambios en las jugadas
const subscription = supabase
  .channel('bets-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'bets'
    },
    (payload) => {
      console.log('Cambio en jugadas:', payload)
      // Actualizar el estado de tu componente aquí
    }
  )
  .subscribe()

// Para cancelar la subscripción
// subscription.unsubscribe()
```

## 🔐 Seguridad

### Row Level Security (RLS)

Todas las tablas tienen políticas RLS configuradas. Esto significa:

- Los usuarios solo pueden acceder a datos según sus permisos
- Las API keys tienen acceso limitado según su configuración
- No se puede eliminar un usuario a sí mismo
- Los roles del sistema están protegidos

### Permisos Disponibles

```typescript
type Permission = 
  | 'dashboard'   // Ver y gestionar potes
  | 'reports'     // Ver reportes y estadísticas
  | 'lotteries'   // Gestionar loterías
  | 'bets'        // Registrar jugadas
  | 'winners'     // Realizar sorteos
  | 'history'     // Ver historial
  | 'users'       // Gestionar usuarios
  | 'roles'       // Gestionar roles
  | 'api-keys'    // Gestionar API keys
```

### Verificar Permisos

```typescript
// Obtener permisos del usuario actual
const { data: permissions } = await supabase
  .rpc('get_user_permissions', {
    user_uuid: currentUserId
  })

const hasPermission = (perm: string) => {
  return permissions?.includes(perm)
}
```

## 🔄 Migración desde useKV

Si estás migrando datos desde `useKV` a Supabase:

### Antes (useKV)

```typescript
const [lotteries, setLotteries] = useKV<Lottery[]>('lotteries', [])

// Agregar lotería
setLotteries((current) => [...current, newLottery])
```

### Después (Supabase)

```typescript
// Obtener loterías
const { data: lotteries } = await supabase
  .from('lotteries')
  .select('*')

// Agregar lotería
const { data } = await supabase
  .from('lotteries')
  .insert(newLottery)
  .select()
```

### Hook Personalizado para Supabase

Puedes crear un hook similar a `useKV` para Supabase:

```typescript
// src/hooks/use-supabase-table.ts
import { useEffect, useState } from 'react'
import { supabase } from '@/config/supabase'

export function useSupabaseTable<T>(tableName: string) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetchData()

    const subscription = supabase
      .channel(`${tableName}-changes`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        () => fetchData()
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [tableName])

  const fetchData = async () => {
    setLoading(true)
    const { data: result, error: err } = await supabase
      .from(tableName)
      .select('*')
    
    if (err) {
      setError(err)
    } else {
      setData(result || [])
    }
    setLoading(false)
  }

  return { data, loading, error, refetch: fetchData }
}
```

## 📊 Base de Datos

### Tablas Principales

| Tabla | Descripción |
|-------|-------------|
| `roles` | Roles del sistema con permisos |
| `users` | Usuarios del sistema |
| `user_roles` | Relación usuarios-roles |
| `api_keys` | Claves API para acceso externo |
| `lotteries` | Loterías configuradas |
| `prizes` | Premios por animal |
| `bets` | Jugadas realizadas |
| `draws` | Resultados de sorteos |
| `pots` | Potes del sistema |
| `transfers` | Transferencias entre potes |
| `withdrawals` | Retiros de ganancias |

### Vistas Útiles

| Vista | Descripción |
|-------|-------------|
| `users_with_roles` | Usuarios con roles y permisos |
| `lottery_statistics` | Estadísticas por lotería |
| `pots_summary` | Resumen de potes |

### Funciones

| Función | Descripción |
|---------|-------------|
| `get_user_permissions(uuid)` | Obtiene permisos de un usuario |
| `verify_api_key(hash)` | Verifica una API key |

## 🔍 Tips y Mejores Prácticas

### 1. Manejo de Errores

```typescript
try {
  const { data, error } = await supabase
    .from('bets')
    .insert(newBet)
  
  if (error) throw error
  
  toast.success('Jugada registrada')
} catch (error) {
  console.error('Error:', error)
  toast.error('Error al registrar jugada')
}
```

### 2. Validación de Datos

```typescript
// Antes de insertar, valida con Zod
import { z } from 'zod'

const BetSchema = z.object({
  lottery_id: z.string().uuid(),
  amount: z.number().positive(),
  animal_number: z.string().length(2),
})

const validatedData = BetSchema.parse(betData)
```

### 3. Transacciones

Para operaciones que requieren múltiples inserts/updates, usa transacciones:

```typescript
// Ejemplo: Registrar sorteo y actualizar ganadores
const { error: drawError } = await supabase.rpc('process_draw', {
  lottery_id: 'uuid',
  winning_number: '12'
})
```

### 4. Caché y Optimización

```typescript
// Usar React Query para caché automático
import { useQuery } from '@tanstack/react-query'

export function useLotteries() {
  return useQuery({
    queryKey: ['lotteries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lotteries')
        .select('*')
      
      if (error) throw error
      return data
    }
  })
}
```

## 🐛 Solución de Problemas

### Error: "Cannot find module '@supabase/supabase-js'"

```bash
npm install @supabase/supabase-js
```

### Error: "Invalid API key"

Verifica que:
1. Las variables de entorno estén correctamente configuradas
2. El archivo `.env` esté en la raíz del proyecto
3. Hayas reiniciado el servidor de desarrollo

### Error: "Row Level Security policy violation"

El usuario no tiene permisos para la operación. Verifica:
1. El usuario está autenticado
2. El usuario tiene los roles correctos
3. Las políticas RLS están configuradas correctamente

### Error al ejecutar el schema SQL

Si hay errores al ejecutar el schema:
1. Verifica que no existan las tablas previamente
2. Ejecuta el script en partes si es necesario
3. Revisa los logs de error en Supabase

## 📚 Recursos Adicionales

- [Documentación de Supabase](https://supabase.com/docs)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Realtime](https://supabase.com/docs/guides/realtime)

## 🤝 Soporte

Si tienes problemas:
1. Revisa la documentación de Supabase
2. Consulta los ejemplos en este documento
3. Verifica los logs en el Dashboard de Supabase
4. Contacta al equipo de desarrollo

---

**Nota:** Este archivo debe mantenerse actualizado conforme evoluciona la integración con Supabase.
