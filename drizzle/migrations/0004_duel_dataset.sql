-- Read-only pivot: Bolsonaro and Lula votes per municipality plus the municipal valid-vote denominator (taken once, not summed per candidate).
CREATE OR REPLACE FUNCTION public.duel_dataset(_election_id integer, _b_id integer, _l_id integer, _uf text DEFAULT NULL)
RETURNS TABLE(ibge_code character, name text, uf character, b_votes bigint, l_votes bigint, valid_votes integer)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT r.ibge_code, m.name, m.uf,
    sum(r.votes) FILTER (WHERE r.candidate_id = _b_id),
    sum(r.votes) FILTER (WHERE r.candidate_id = _l_id),
    max(r.valid_votes)
  FROM municipal_results r JOIN municipalities m ON m.ibge_code = r.ibge_code
  WHERE r.election_id = _election_id AND m.uf <> 'ZZ' AND (_uf IS NULL OR m.uf = _uf)
  GROUP BY r.ibge_code, m.name, m.uf
  ORDER BY r.ibge_code
$$;
GRANT EXECUTE ON FUNCTION public.duel_dataset(integer, integer, integer, text) TO anon, authenticated, service_role;