import type { Candidate, CandidateStage } from "./board-schema";

export const CANDIDATE_STAGES: { id: CandidateStage; label: string }[] = [
  { id: "list", label: "Lista" },
  { id: "approved", label: "Aprovados" },
  { id: "rejected", label: "Recusados" },
];

function fold(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** Pesquisa por nome, celular, endereço ou texto das POCs. Vazio devolve toda a gente. */
export function candidateMatchesQuery(person: Pick<Candidate, "name" | "phone" | "address" | "pocs">, query: string): boolean {
  const text = query.trim();
  if (!text) return true;
  const haystack = fold([person.name, person.phone, person.address, person.pocs].join("\n"));
  if (haystack.includes(fold(text))) return true;
  const digits = text.replace(/\D/g, "");
  if (digits.length >= 3) {
    return person.phone.replace(/\D/g, "").includes(digits);
  }
  return false;
}

export function candidatesInStage(candidates: Candidate[], stage: CandidateStage, query: string): Candidate[] {
  return candidates
    .filter((person) => person.stage === stage && candidateMatchesQuery(person, query))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}
