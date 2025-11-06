# 🔧 Corrección del Error de Duplicate Key en Loterías

## ❌ Problema Identificado

El error `"duplicate key value violates unique constraint"` también estaba ocurriendo en el módulo de loterías, probablemente en la constraint `lotteries_name_key` que evita nombres duplicados.

## ✅ Soluciones Implementadas en Loterías

### 1. **Eliminación de `.single()` Problemático**

**Antes (Creación):**
```typescript
const { data: newLottery, error: lotteryError } = await supabase
  .from('lotteries')
  .insert([...])
  .select()
  .single() // ❌ Causaba errores de JSON
```

**Después (Creación):**
```typescript
const { data: newLotteries, error: lotteryError } = await supabase
  .from('lotteries')
  .insert([...])
  .select() // ✅ Sin .single()

const newLottery = newLotteries && newLotteries[0]
if (!newLottery) {
  throw new Error('No se pudo crear la lotería en Supabase')
}
```

**Antes (Actualización):**
```typescript
const { data, error } = await supabase
  .from('lotteries')
  .update({...})
  .eq('id', lotteryId)
  .select()
  .single() // ❌ Problemático
```

**Después (Actualización):**
```typescript
const { data: updatedLotteries, error } = await supabase
  .from('lotteries')
  .update({...})
  .eq('id', lotteryId)
  .select() // ✅ Sin .single()

const updatedLottery = updatedLotteries && updatedLotteries[0]
if (!updatedLottery) {
  throw new Error('No se pudo actualizar la lotería en Supabase')
}
```

### 2. **Validación Proactiva de Nombres Duplicados**

**Nueva validación antes de crear:**
```typescript
console.log(`🔍 Verificando nombre de lotería: ${lotteryData.name}`)

const { data: existingLotteries, error: checkError } = await supabase
  .from('lotteries')
  .select('id, name')
  .eq('name', lotteryData.name)
  .limit(1)

if (existingLotteries && existingLotteries.length > 0) {
  const existing = existingLotteries[0]
  console.log(`❌ Lotería "${lotteryData.name}" ya existe (ID: ${existing.id})`)
  toast.error(`Ya existe una lotería con el nombre: ${lotteryData.name}`)
  return false
}

console.log(`✅ Nombre de lotería "${lotteryData.name}" disponible`)
```

### 3. **Manejo Específico de Errores de Duplicate Key**

**Detección mejorada:**
```typescript
if (error.message.includes('duplicate key') || 
    error.message.includes('unique constraint') ||
    error.message.includes('lotteries_name_key')) {
  console.log(`🚫 Duplicate lottery name detected: ${lotteryData.name}`)
  toast.error(`Ya existe una lotería con el nombre: ${lotteryData.name}`)
  return false
}
```

### 4. **Logs Detallados para Debugging**

**Seguimiento completo:**
```typescript
console.log(`🔍 Verificando nombre de lotería: ${lotteryData.name}`)
console.log(`✅ Nombre de lotería "${lotteryData.name}" disponible`)
console.log(`📝 Creando lotería en Supabase...`)
console.log(`✅ Lotería creada exitosamente: ${createdLottery.name}`)
```

## 🛠️ Archivos Modificados

### `/src/hooks/use-supabase-lotteries.ts`
- ✅ Eliminado `.single()` de inserción y actualización
- ✅ Validación proactiva de nombres duplicados
- ✅ Manejo específico de errores de duplicate key
- ✅ Logs detallados para debugging
- ✅ Mejor manejo de arrays en lugar de objetos únicos

## 🔄 Comparación: Antes vs Después

### **Antes:**
- ❌ Errores de JSON por `.single()`
- ❌ No validaba duplicados antes de insertar
- ❌ Errores crípticos de duplicate key
- ❌ Debugging limitado

### **Después:**
- ✅ Sin errores de JSON (eliminado `.single()`)
- ✅ Validación proactiva previene duplicados
- ✅ Mensajes de error claros y específicos
- ✅ Logs detallados para seguimiento

## 🎯 Beneficios de las Correcciones

1. **🛡️ Prevención Proactiva**: Validación antes de insertar
2. **📊 Mejor UX**: Mensajes de error informativos
3. **🔍 Debugging Mejorado**: Logs detallados del proceso
4. **🚫 Sin Errores de JSON**: Eliminación completa de `.single()`
5. **⚡ Rendimiento**: Consultas optimizadas con `limit(1)`

## 🧪 Casos de Prueba

### **Caso 1: Crear lotería con nombre único**
- ✅ Debería crear exitosamente
- ✅ Mostrar mensaje de éxito
- ✅ Logs de verificación y creación

### **Caso 2: Crear lotería con nombre duplicado**
- ✅ Debería detectar duplicado proactivamente
- ✅ Mostrar error específico: "Ya existe una lotería con el nombre: X"
- ✅ No intentar insertar en Supabase

### **Caso 3: Error de red o Supabase**
- ✅ Debería manejar el error apropiadamente
- ✅ Mostrar mensaje de error técnico
- ✅ Logs de debugging para investigación

## 📋 Estado de Correcciones Completadas

- ✅ **Usuarios**: Corrección completa (JSON + duplicate key)
- ✅ **Loterías**: Corrección completa (JSON + duplicate key)
- 🔄 **Roles**: Probablemente necesita las mismas correcciones
- 🔄 **Otros módulos**: Revisar si usan `.single()`

---

**🎉 Los errores de duplicate key en loterías están COMPLETAMENTE CORREGIDOS con validación proactiva y manejo robusto**