# 🧪 Guía de Pruebas - Usuarios Híbridos

## 🎯 Para probar la funcionalidad híbrida sigue estos pasos:

### 1. Abrir la Aplicación
- ✅ Ya está abierta en http://localhost:5001

### 2. Hacer Login
- **Usuario**: admin
- **Password**: admin
(O cualquier otro usuario configurado)

### 3. Ir a la Pestaña "Usuarios"
- Buscar en la barra de navegación superior
- Hacer clic en "Usuarios"

### 4. Observar la Nueva Interfaz
- **Descripción actualizada**: "Administrar usuarios del sistema (Híbrido: Supabase + Local)"
- **Botón nuevo**: "Sincronizar" junto a "Nuevo Usuario"

### 5. Crear un Usuario de Prueba
1. Hacer clic en "Nuevo Usuario"
2. Llenar el formulario:
   - **Nombre**: "Usuario Prueba Híbrido"
   - **Email**: "prueba@hibrido.com"
   - **Roles**: Seleccionar uno o más
   - **Activo**: ✅ Sí
3. Hacer clic en "Guardar"

### 6. Verificar el Comportamiento
- **Con Supabase**: Verás "Usuario creado exitosamente en Supabase"
- **Sin Supabase**: Verás "Error en Supabase: [error]. Guardando solo localmente."
- En ambos casos el usuario aparece en la lista

### 7. Verificar Persistencia Local
1. Abrir las DevTools del navegador (F12)
2. Ir a la pestaña "Application" o "Storage"
3. Buscar "Local Storage" → "http://localhost:5001"
4. Ver la clave "users" con todos los usuarios en JSON

### 8. Probar Sincronización
1. Hacer clic en el botón "Sincronizar"
2. Ver notificación de sincronización
3. Los usuarios locales se envían a Supabase

### 9. Probar Edición/Eliminación
- Editar un usuario → se actualiza en ambos lugares
- Eliminar un usuario → se elimina de ambos lugares
- Siempre con notificaciones del estado

### 10. Verificar Resistencia a Fallos
- Los usuarios siempre se guardan localmente
- Si Supabase falla, el sistema sigue funcionando
- Los datos persisten al refrescar la página

## 📱 Comandos de Consola para Probar

Abrir DevTools (F12) y ejecutar en la consola:

```javascript
// Ver usuarios guardados localmente
console.log('Usuarios locales:', JSON.parse(localStorage.getItem('users') || '[]'))

// Contar usuarios locales
console.log('Total usuarios locales:', JSON.parse(localStorage.getItem('users') || '[]').length)

// Limpiar storage local (para pruebas)
// localStorage.removeItem('users')
```

## 🎉 Resultado Esperado

- ✅ Usuarios se crean en Supabase Y localStorage
- ✅ Sistema funciona completamente offline
- ✅ Datos persisten al refrescar
- ✅ Sincronización manual disponible
- ✅ Notificaciones claras del estado
- ✅ Experiencia fluida sin interrupciones