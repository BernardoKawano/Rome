export const PRINCIPLE_INTERVAL_MS = 10_000;

export const PRINCIPLES = [
  {
    title: "Escala",
    body: "80% do tempo precisar mexer o ponteiro. Aumentar receita ou diminuir despesa.",
  },
  {
    title: "Intuitividade",
    body: "Tudo precisa ser intuitivo, fácil, lógico. Se ninguém usa o que você fez, então a obra não deu certo.",
  },
  {
    title: "Autonomia",
    body: "Se você está refém de alguma coisa, investigue o porquê, o processo. Autonomia para o time é aceleração de processo.",
  },
  {
    title: "Regra de negócio",
    body: "Entenda o porquê a empresa existe, qual demanda ela supre, o que ela faz, como faz, porquê existe.",
  },
  {
    title: "Humildade",
    body: "Desde o CEO da maior empresa do mundo até uma criança de 5 anos tem coisas para te ensinar. Seja humilde, ninguém gosta de alguém arrogante.",
  },
] as const;

export function principleIndex(elapsedMs: number, count = PRINCIPLES.length, intervalMs = PRINCIPLE_INTERVAL_MS): number {
  if (count <= 0) return 0;
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  return Math.floor(elapsed / intervalMs) % count;
}

export function formatPrinciple(principle: { title: string; body: string }): string {
  return `${principle.title}: ${principle.body}`;
}
