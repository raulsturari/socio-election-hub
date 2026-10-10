<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Brasil Data Lab architecture
- Official data is loaded only by `scripts/ingest/pipeline.py` (service role, run outside the app); the web app is read-only — keeps writes auditable via import_jobs/import_job_logs.
- An election is exposed in the UI only when `elections.validated = true`, set by the importer after file = zones = municipalities reconciliation — prevents showing unverified numbers.
- All joins between sources use the 7-digit IBGE code; TSE codes are mapped via `municipalities.tse_code`, validated against the IBGE Localidades API — single harmonization key.
- Public reads go through `createServerFn` in `src/lib/data.functions.ts` using a publishable-key client (`supabase-public.server.ts`, imported dynamically inside handlers) with paginated, ordered selects — PostgREST caps at 1000 rows.
- Filters live in URL search params (`src/lib/filters.ts`) shared by all content routes — survive refresh and carry across bottom-nav tabs.
- TSE codes missing from the community mapping are filled only by a unique exact normalized name+UF match, logged as a warning on the import job — keeps new municipalities (e.g. created after the mapping) reconcilable without guessing.
- Lab statistics (Pearson/Spearman/OLS) are pure functions in `src/lib/lab-stats.ts` + `lab-analysis.ts`, run server-side in `lab.functions.ts` over the `lab_dataset` RPC — the phone gets only points and results, and tests pin values to scipy/numpy references.
- Lab predictors come from `X_VARIABLES`; an entry with `indicatorId: null` is shown as unavailable, never simulated — add a SIDRA entry (table/variable/classifications) to the pipeline before enabling one.
- Explore presets live in a typed catalog; read-only server functions reuse lab_dataset and exact vote counts for weighted bars — keeps every visualization traceable without writing electoral data.
- Explore national maps and scatterplots use Canvas; keyed IBGE transitions animate only visual properties and tour waits for successful queries — avoids thousands of animated DOM nodes and advancing past unloaded charts.
- Explore map transitions composite prerendered rasters and gallery thumbnails fetch near the viewport — bounds animation work and avoids loading every municipal dataset at once.
- Electoral colors resolve only explicit candidate names or party metadata through a shared identity resolver and scoped CSS tokens, with every other candidacy in one "outros" token; nonpartisan scopes reset the palette — prevents ideology/ballot-number guesses and color leakage into social indicators.
- Bolsonaro × Lula × Outros grouping is analytical only: `src/lib/duel.ts` (pure, tested) groups raw candidate rows as ratio of sums over all valid votes, and the read-only `duel_dataset` RPC returns per-municipality focus votes plus one valid-vote denominator; the global `modo` URL param (legacy `cand` maps to a mode) drives every electoral view — raw candidates stay intact and denominators are never renormalized.
- Scatter rendering and reading share `scatter-domain`; `scatter-geometry` diagnoses IBGE-deduplicated X, per-series spread and paired crossings, and `graph-reading` synthesizes one conclusion — prevents invented shapes from mismatched scales or pooled candidates. Technical and geometry details mount only when expanded and remount closed on analysis/filter keys.
