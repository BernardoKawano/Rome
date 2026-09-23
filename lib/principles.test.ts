import { describe, expect, it } from "vitest";
import { PRINCIPLES, PRINCIPLE_INTERVAL_MS, formatPrinciple, principleIndex } from "./principles";

describe("frases embaixo do nome", () => {
  it("mantém a primeira frase durante os 10 segundos iniciais", () => {
    expect(principleIndex(0)).toBe(0);
    expect(principleIndex(PRINCIPLE_INTERVAL_MS - 1)).toBe(0);
  });

  it("avança uma frase a cada 10 segundos e volta ao início", () => {
    expect(principleIndex(PRINCIPLE_INTERVAL_MS)).toBe(1);
    expect(principleIndex(PRINCIPLE_INTERVAL_MS * 4)).toBe(4);
    expect(principleIndex(PRINCIPLE_INTERVAL_MS * PRINCIPLES.length)).toBe(0);
  });

  it("formata título e frase como foram escritas", () => {
    expect(formatPrinciple(PRINCIPLES[0])).toBe(
      "Escala: 80% do tempo precisar mexer o ponteiro. Aumentar receita ou diminuir despesa."
    );
    expect(PRINCIPLES.map((item) => item.title)).toEqual([
      "Escala",
      "Intuitividade",
      "Autonomia",
      "Regra de negócio",
      "Humildade",
    ]);
  });
});
