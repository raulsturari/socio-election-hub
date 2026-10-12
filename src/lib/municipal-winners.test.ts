import { describe, expect, it } from "vitest";
import { municipalWinners, type WinnerVote } from "./municipal-winners";

const candidates = [
  { candidate_id: 1, ballot_name: "FLÁVIO BOLSONARO", party: "PL" },
  { candidate_id: 2, ballot_name: "LULA", party: "PT" },
  { candidate_id: 3, ballot_name: "CANDIDATO A", party: "A" },
  { candidate_id: 4, ballot_name: "CANDIDATO B", party: "B" },
];
const rows = (votes: number[]): WinnerVote[] => votes.map((vote, index) => ({
  ibge_code: "3550308", candidate_id: index + 1, votes: vote, municipalities: { name: "São Paulo", uf: "SP" },
}));
describe("municipal winners from raw votes", () => {
  it("never declares aggregated Others winner", () => {
    const [winner] = municipalWinners(rows([40, 30, 25, 20]), candidates);
    expect(winner?.series).toBe("bolsonaro"); expect(winner?.valid).toBe(115);
  });
  it("retains secondary winner identity", () => {
    const [winner] = municipalWinners(rows([10, 20, 40, 30]), candidates);
    expect(winner?.series).toBe("outros"); expect(winner?.candidates[0]?.ballot_name).toBe("CANDIDATO A");
  });
  it("preserves exact ties", () => {
    const [winner] = municipalWinners(rows([40, 40, 2, 1]), candidates);
    expect(winner?.series).toBe("tie"); expect(winner?.candidates).toHaveLength(2);
  });
  it("does not turn no valid votes into a winner", () => {
    expect(municipalWinners(rows([0, 0, 0, 0]), candidates)[0]?.series).toBe("missing");
    expect(municipalWinners([], candidates)).toEqual([]);
  });
  it("fails on unknown candidacy", () => {
    expect(() => municipalWinners(rows([10]), [])).toThrow("identificação");
  });
  it("keeps Jair identity in 2022", () => {
    const [winner] = municipalWinners(rows([10]), [{ candidate_id: 1, ballot_name: "JAIR BOLSONARO", party: "PL" }]);
    expect(winner?.candidates[0]?.ballot_name).toBe("JAIR BOLSONARO");
  });
});