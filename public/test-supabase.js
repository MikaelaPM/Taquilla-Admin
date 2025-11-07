// Test de conexión directa a Supabase
console.log('🔍 Verificando variables de entorno...')
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('VITE_SUPABASE_ANON_KEY presente:', !!import.meta.env.VITE_SUPABASE_ANON_KEY)

import { supabase } from '/src/lib/supabase.js'

async function testSupabaseConnection() {
  try {
    console.log('🔌 Probando conexión a Supabase...')
    
    // Test simple - verificar si podemos hacer una consulta básica
    const { data, error, count } = await supabase
      .from('draws')
      .select('*', { count: 'exact' })
      .limit(1)
    
    if (error) {
      console.error('❌ Error de Supabase:', error)
      console.error('Código:', error.code)
      console.error('Detalles:', error.details)
      console.error('Hint:', error.hint)
      console.error('Mensaje:', error.message)
    } else {
      console.log('✅ ¡Conexión a Supabase exitosa!')
      console.log('📊 Tabla draws existe y es accesible')
      console.log('📈 Total registros:', count)
      console.log('📄 Datos:', data)
    }
  } catch (err) {
    console.error('💥 Error general:', err)
  }
}

// Ejecutar test
testSupabaseConnection()

// Hacer disponible globalmente para testing
window.testSupabase = testSupabaseConnection