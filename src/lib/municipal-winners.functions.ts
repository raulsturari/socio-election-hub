import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { municipalWinners, winnerVoteSchema } from "./municipal-winners";

export const getMunicipalWinners = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ electionId: z.number().int(), uf: z.string().length(2).nullable() }).parse(input))
  .handler(async ({ data }) => {
    const { publicClient, selectAllPages } = await import("./supabase-public.server");
    const sb = publicClient();
    const election = await sb.from("elections").select("id").eq("id", data.electionId).eq("validated", true).maybeSingle();
    if (election.error) throw new Error(election.error.message);
    if (!election.data) return [];
    const result = await sb.rpc("election_summary", { _election_id: data.electionId });
    if (result.error) throw new Error(result.error.message);
    const candidates = z.array(z.object({ candidate_id: z.number().int(), ballot_name: z.string(), party: z.string() })).parse(result.data ?? []);
    // Candidate-indexed reads run concurrently; pagination never truncates national coverage.
    const pages = await Promise.all(candidates.map((candidate) => selectAllPages((from, to) => {
      let query = sb.from("municipal_results")
        .select("ibge_code, candidate_id, votes, municipalities!inner(name, uf)")
        .eq("election_id", data.electionId).eq("candidate_id", candidate.candidate_id)
        .neq("municipalities.uf", "ZZ").order("ibge_code");
      if (data.uf) query = query.eq("municipalities.uf", data.uf);
      return query.range(from, to);
    })));
    return municipalWinners(pages.flat().map((row) => winnerVoteSchema.parse(row)), candidates);
  });