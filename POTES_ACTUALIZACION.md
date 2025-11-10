# 🎲 ACTUALIZACIÓN DE POTES - NUEVOS PORCENTAJES

## 📊 Cambios Realizados

Se han actualizado los porcentajes de distribución de los potes del sistema:

| Pote | Antes | Ahora | Cambio |
|------|-------|-------|--------|
| **Pote de Premios** | 40% | **60%** | +20% |
| **Pote de Reserva → Costos** | 35% | **30%** | -5% (y renombrado) |
| **Pote de Ganancias** | 25% | **10%** | -15% |

### 🔄 Cambios Específicos

1. **Pote de Premios**: Aumentado del 40% al **60%**
   - Mayor porcentaje destinado a pagar premios ganadores
   - Mejora la capacidad de pago del sistema

2. **Pote de Reserva → Costos**: Del 35% al **30%** y renombrado
   - Nombre actualizado: "Pote de Reserva" → **"Costos"**
   - Ahora representa costos operativos y gastos del sistema
   - Reducido en 5 puntos porcentuales

3. **Pote de Ganancias**: Reducido del 25% al **10%**
   - Menor porcentaje de ganancias
   - Los fondos se redistribuyen a premios y costos

---

## ✅ Archivos Actualizados

### 1. Esquema de Base de Datos
- ✅ `supabase-schema.sql` - INSERT actualizado con nuevos valores

### 2. Código TypeScript/React
- ✅ `src/lib/pot-utils.ts` - Constante `INITIAL_POTS` actualizada
- ✅ `src/App.tsx` - Mensaje de alerta actualizado

### 3. Scripts de Migración
- ✅ `update-pots-percentages.sql` - Script SQL para actualizar potes existentes
- ✅ `INICIALIZAR_POTES_NUEVOS.sql` - Script SQL para inicializar potes nuevos
- ✅ `update-pots.mjs` - Script Node.js para actualización automática
- ✅ `initialize-pots-new.mjs` - Script Node.js para inicialización automática

---

## 🚀 Instrucciones de Aplicación

### Opción 1: Base de Datos Nueva (Sin Potes)

Si tu base de datos **NO tiene potes todavía**:

1. **Ejecutar en Supabase Dashboard:**
   ```sql
   -- Ejecuta el contenido completo de: INICIALIZAR_POTES_NUEVOS.sql
   ```

2. **Pasos en Supabase:**
   - Abre [Supabase Dashboard](https://supabase.com/dashboard)
   - Ve a tu proyecto
   - Haz clic en **SQL Editor**
   - Copia y pega el contenido de `INICIALIZAR_POTES_NUEVOS.sql`
   - Haz clic en **Run**

3. **Verificar:**
   - Deberías ver mensajes de confirmación en la salida
   - Verifica que se crearon 3 potes con los nuevos porcentajes

### Opción 2: Base de Datos con Potes Existentes

Si tu base de datos **YA TIENE potes** (del esquema anterior):

1. **Ejecutar en Supabase Dashboard:**
   ```sql
   -- Ejecuta el contenido completo de: update-pots-percentages.sql
   ```

2. **Pasos en Supabase:**
   - Abre [Supabase Dashboard](https://supabase.com/dashboard)
   - Ve a tu proyecto
   - Haz clic en **SQL Editor**
   - Copia y pega el contenido de `update-pots-percentages.sql`
   - Haz clic en **Run**

3. **Verificar:**
   - Los potes existentes se actualizarán
   - "Pote de Reserva" se renombrará a "Costos"
   - Los porcentajes cambiarán a 60/30/10

---

## 🧪 Verificación en la Aplicación

Después de ejecutar el script SQL:

1. **Inicia o recarga la aplicación**
   ```bash
   npm run dev
   ```

2. **Ve al Dashboard**
   - Verifica que los potes se muestren correctamente

3. **Comprueba los valores:**
   ```
   ✓ Pote de Premios: 60%
   ✓ Costos: 30%
   ✓ Pote de Ganancias: 10%
   ```

4. **Realiza una jugada de prueba:**
   - Crea una apuesta pequeña
   - Verifica que se distribuya correctamente:
     - 60% al Pote de Premios
     - 30% a Costos
     - 10% al Pote de Ganancias

---

## 📝 Ejemplo de Distribución

Si se hace una apuesta de **Bs. 100**:

| Pote | Porcentaje | Monto |
|------|------------|-------|
| Pote de Premios | 60% | Bs. 60 |
| Costos | 30% | Bs. 30 |
| Pote de Ganancias | 10% | Bs. 10 |
| **TOTAL** | **100%** | **Bs. 100** |

---

## 🔧 Troubleshooting

### Error: "new row violates row-level security policy"
- **Solución**: Ejecuta el SQL directamente en Supabase Dashboard (no uses los scripts .mjs)
- Las políticas RLS solo permiten operaciones desde el Dashboard o con service_role key

### Error: "La tabla pots ya contiene datos"
- **Solución**: Usa `update-pots-percentages.sql` en lugar de `INICIALIZAR_POTES_NUEVOS.sql`
- El script de inicialización solo funciona con tablas vacías

### Los potes no se actualizan en la interfaz
- **Solución**: Recarga la aplicación completamente (Ctrl+R o Cmd+R)
- Verifica que hayas ejecutado el SQL correctamente en Supabase

---

## 📚 Archivos de Referencia

```
INICIALIZAR_POTES_NUEVOS.sql     ← Para bases de datos nuevas
update-pots-percentages.sql      ← Para actualizar potes existentes
src/lib/pot-utils.ts             ← Constantes TypeScript
src/App.tsx                      ← Mensaje de alerta
supabase-schema.sql              ← Esquema completo actualizado
```

---

## ✨ Estado Final

- ✅ Esquema de base de datos actualizado
- ✅ Código TypeScript actualizado
- ✅ Scripts de migración creados
- ✅ Documentación completa
- ⏳ **Pendiente**: Ejecutar SQL en Supabase Dashboard

---

**Última actualización**: 2025-01-13  
**Versión**: 2.0 (Potes con 60/30/10)