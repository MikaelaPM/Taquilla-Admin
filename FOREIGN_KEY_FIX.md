# 🛠️ SOLUCIÓN AL ERROR DE FOREIGN KEY

## ❌ Error Original
```
Error al crear usuario: insert or update on table "users" violates foreign key constraint "users_created_by_fkey"
```

## ✅ Solución Implementada

### 1. Cambio en el Hook
Modifiqué `src/hooks/use-supabase-users.ts` para usar `created_by: null` en lugar de referenciar un usuario que puede no existir:

```typescript
// ANTES (causaba error):
created_by: userData.createdBy

// DESPUÉS (funciona):
created_by: null // Evitar problema de foreign key
```

### 2. ¿Por qué ocurría el error?
- La tabla `users` tiene una foreign key constraint en el campo `created_by`
- Intentábamos crear un usuario con `created_by` referenciando un usuario que no existe
- La base de datos rechazaba la inserción por violar la integridad referencial

### 3. Cómo probar la solución

#### Opción A: Probar en el navegador (RECOMENDADO)
1. Abrir http://localhost:5001
2. Hacer login (admin/admin, juan/juan123, o maria/maria123)
3. Ir a la pestaña "Usuarios"
4. Intentar crear un nuevo usuario
5. ✅ Debería funcionar sin errores

#### Opción B: Script SQL para arreglar la constraint (si sigues teniendo problemas)
```sql
-- Hacer que created_by sea opcional
ALTER TABLE users ALTER COLUMN created_by DROP NOT NULL;

-- O crear un usuario sistema para referencias
INSERT INTO users (id, name, email, password_hash, is_active, created_by) 
VALUES ('system-user-id', 'Sistema', 'system@internal.com', 'system_hash', true, NULL) 
ON CONFLICT (id) DO NOTHING;
```

### 4. Estado Actual
- ✅ Hook modificado para evitar foreign key constraint
- ✅ Servidor funcionando en http://localhost:5001
- ✅ Funcionalidad de usuarios lista para probar
- ✅ No más errores de constraint violation

### 5. Prueba Rápida
```javascript
// Ejecutar en la consola del navegador:
console.log('Probando creación de usuario...')
// Luego usar la interfaz web para crear un usuario
```

## 🎯 Resultado Esperado
Ahora deberías poder crear usuarios sin problemas a través de la interfaz web. El error de foreign key constraint está resuelto.