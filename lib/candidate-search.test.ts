import { describe, expect, it } from "vitest";
import type { Candidate } from "./board-schema";
import { candidateMatchesQuery, candidatesInStage } from "./candidate-search";

function person(patch: Partial<Candidate> & Pick<Candidate, "id" | "name">): Candidate {
  return {
    address: "Rua do Pátio, 10",
    phone: "(11) 98888-1234",
    culturalScore: 8,
    technicalScore: 7,
    pocs: "POC de pátio no staging",
    stage: "list",
    updatedAt: "2026-10-15T12:00:00.000Z",
    ...patch,
  };
}

describe("candidate-search", () => {
  const ana = person({ id: "ana", name: "Ana Lima" });

  it("encontra pelo nome sem acento", () => {
    expect(candidateMatchesQuery(ana, "ana lima")).toBe(true);
    expect(candidateMatchesQuery(person({ id: "b", name: "José", address: "Pátio" }), "patio")).toBe(true);
  });

  it("encontra pelo celular mesmo com pontuação diferente", () => {
    expect(candidateMatchesQuery(ana, "98888")).toBe(true);
    expect(candidateMatchesQuery(ana, "11 98888-1234")).toBe(true);
  });

  it("encontra pelo texto das POCs e ignora pesquisa vazia", () => {
    expect(candidateMatchesQuery(ana, "staging")).toBe(true);
    expect(candidateMatchesQuery(ana, "   ")).toBe(true);
  });

  it("não devolve quem não corresponde", () => {
    expect(candidateMatchesQuery(ana, "Bruno")).toBe(false);
  });

  it("separa a coluna e deixa os mais recentes primeiro", () => {
    const older = person({ id: "old", name: "Old", stage: "approved", updatedAt: "2026-01-01T00:00:00.000Z" });
    const newer = person({ id: "new", name: "New", stage: "approved", updatedAt: "2026-06-01T00:00:00.000Z" });
    const listed = person({ id: "list", name: "Lista", stage: "list" });
    expect(candidatesInStage([older, listed, newer], "approved", "").map((item) => item.id)).toEqual(["new", "old"]);
    expect(candidatesInStage([older, listed, newer], "approved", "new")).toEqual([newer]);
  });
});
