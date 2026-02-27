export const cosineSimilarity = (a: number[], b: number[]): number => {
  if (a.length !== b.length || a.length === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    const av = a[i] || 0;
    const bv = b[i] || 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

export const reciprocalRankFusion = (
  rankedLists: Array<Array<{ id: string; score: number }>>,
  k = 60,
): Array<{ id: string; score: number }> => {
  const scores = new Map<string, number>();

  rankedLists.forEach((list) => {
    list.forEach((item, index) => {
      const rank = index + 1;
      const current = scores.get(item.id) || 0;
      scores.set(item.id, current + 1 / (k + rank));
    });
  });

  return Array.from(scores.entries())
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score);
};
