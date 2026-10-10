CREATE OR REPLACE FUNCTION public.indicator_coverage()
RETURNS TABLE(indicator_id text, year smallint, nonnull bigint, total bigint)
LANGUAGE sql STABLE SET search_path TO 'public'
AS $$
  SELECT v.indicator_id, max(v.year)::smallint, count(v.value), count(*)
  FROM indicator_values v
  GROUP BY v.indicator_id
  ORDER BY v.indicator_id
$$;
GRANT EXECUTE ON FUNCTION public.indicator_coverage() TO anon, authenticated, service_role;