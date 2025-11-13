# Auto-Reactivación de "Juega Mañana"

## Funcionalidad Implementada

Se ha agregado una funcionalidad automática para reactivar el toggle "Juega Mañana" después de la medianoche.

## Comportamiento

### Cuando se desactiva "Juega Mañana" antes de las 12:00 AM:

1. **Registro de Desactivación**: El sistema guarda el timestamp exacto de cuando se desactivó
2. **Tracking Automático**: Se monitorea la lotería para auto-reactivación
3. **Verificación Periódica**: Cada minuto, el sistema verifica si ya pasó la medianoche
4. **Reactivación Automática**: Al detectar que ya es un día diferente (después de las 12:00 AM), automáticamente:
   - Reactiva el toggle "Juega Mañana"
   - Actualiza la lotería en la base de datos
   - Muestra un mensaje en consola confirmando la reactivación
   - Remueve el tracking ya que se completó la reactivación

### Ejemplo de Uso:

1. **11:30 PM del Día 1**: Un administrador desactiva "Juega Mañana" para una lotería
   - Sistema registra: "Desactivado a las 23:30 del Día 1"

2. **12:01 AM del Día 2**: El sistema automáticamente:
   - Detecta que ya pasó la medianoche
   - Reactiva "Juega Mañana"
   - Ahora la lotería está disponible para el próximo sorteo

## Detalles Técnicos

### Archivos Creados/Modificados:

1. **`/src/hooks/use-auto-play-tomorrow.ts`** (NUEVO)
   - Hook personalizado que maneja la lógica de auto-reactivación
   - Almacena estados en localStorage
   - Verifica cada minuto si debe reactivar

2. **`/src/App.tsx`** (MODIFICADO)
   - Importa y usa el hook `useAutoPlayTomorrow`
   - Pasa el callback al componente `LotteryDialog`

3. **`/src/components/LotteryDialog.tsx`** (MODIFICADO)
   - Acepta el callback `onPlayTomorrowChange`
   - Notifica cambios en el toggle "Juega Mañana"

### Almacenamiento:

Los estados se guardan en `localStorage` con la clave `playTomorrowStates` que contiene:
```typescript
{
  lotteryId: string,
  deactivatedAt: string, // ISO timestamp
  shouldAutoReactivate: boolean
}
```

### Verificación:

- **Intervalo**: Cada 60 segundos
- **Comparación**: Se comparan fechas (sin horas) para determinar si cambió el día
- **Limpieza**: Los estados se eliminan automáticamente después de reactivar

## Comportamiento Manual:

Si un administrador **reactiva manualmente** "Juega Mañana" antes de la medianoche:
- El tracking se elimina inmediatamente
- No habrá reactivación automática
- El estado manual tiene prioridad

## Ventajas:

✅ Automático - No requiere intervención del administrador
✅ Preciso - Verifica cada minuto después de la medianoche
✅ Persistente - Usa localStorage para sobrevivir recargas de página
✅ Limpio - Se auto-limpia después de reactivar
✅ Flexible - Respeta cambios manuales del administrador

## Logs en Consola:

El sistema muestra mensajes informativos:
- `📅 Registrada desactivación de "Juega Mañana" para lotería {id}`
- `🌅 Auto-reactivando "Juega Mañana" para {nombre}`
- `✅ {nombre} ahora juega mañana automáticamente`
- `✅ Removido tracking para lotería {id} (activado manualmente)`
