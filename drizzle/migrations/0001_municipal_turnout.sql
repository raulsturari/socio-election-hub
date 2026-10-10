CREATE TABLE public.municipal_turnout (
  election_id integer NOT NULL REFERENCES public.elections(id),
  ibge_code character(7) NOT NULL REFERENCES public.municipalities(ibge_code),
  eligible integer NOT NULL CHECK (eligible >= 0),
  turnout integer NOT NULL CHECK (turnout >= 0),
  abstentions integer NOT NULL CHECK (abstentions >= 0),
  valid_votes integer NOT NULL CHECK (valid_votes >= 0),
  blank_votes integer NOT NULL CHECK (blank_votes >= 0),
  null_votes integer NOT NULL CHECK (null_votes >= 0),
  zones_count integer NOT NULL,
  import_job_id uuid NOT NULL REFERENCES public.import_jobs(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (election_id, ibge_code)
);
GRANT SELECT ON public.municipal_turnout TO anon, authenticated;
GRANT ALL ON public.municipal_turnout TO service_role;
ALTER TABLE public.municipal_turnout ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read official data" ON public.municipal_turnout FOR SELECT TO anon, authenticated USING (true);
CREATE TRIGGER municipal_turnout_touch BEFORE UPDATE ON public.municipal_turnout FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.turnout_summary(_election_id integer, _uf text DEFAULT NULL, _ibge text DEFAULT NULL)
RETURNS TABLE(eligible bigint, turnout bigint, abstentions bigint, valid_votes bigint, blank_votes bigint, null_votes bigint, municipalities bigint)
LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT sum(t.eligible)::bigint, sum(t.turnout)::bigint, sum(t.abstentions)::bigint, sum(t.valid_votes)::bigint,
         sum(t.blank_votes)::bigint, sum(t.null_votes)::bigint, count(*)::bigint
  FROM municipal_turnout t JOIN municipalities m USING (ibge_code)
  WHERE t.election_id = _election_id AND (_uf IS NULL OR m.uf = _uf) AND (_ibge IS NULL OR t.ibge_code = _ibge)
$$;
GRANT EXECUTE ON FUNCTION public.turnout_summary(integer, text, text) TO anon, authenticated;