-- RPC para insertar resultados de Pollo Lleno
-- Ejecutar en Supabase

create or replace function public.create_daily_result_pollo_lleno(
  p_numbers integer[],
  p_result_date date
)
returns public.daily_results_pollo_lleno
language plpgsql
security definer
as $$
declare
  inserted public.daily_results_pollo_lleno;
begin
  insert into public.daily_results_pollo_lleno (numbers, result_date)
  values (p_numbers, p_result_date)
  returning * into inserted;

  return inserted;
end;
$$;

grant execute on function public.create_daily_result_pollo_lleno(integer[], date) to anon, authenticated;
