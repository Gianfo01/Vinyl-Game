// Rodada 21 (I-10): cache com teto. Mesma interface de Map (get/set/has/delete), mas guarda só as `max` entradas
// usadas mais recentemente — sprites por era, capas, logos e retratos não crescem sem limite numa run de 150 anos.

export class LruMap<K, V> extends Map<K, V> {
  constructor(private readonly max = 500) { super(); }
  override get(key: K): V | undefined {
    if (!super.has(key)) return undefined;
    const v = super.get(key) as V;
    super.delete(key); // move para o fim (mais recente)
    super.set(key, v);
    return v;
  }
  override set(key: K, value: V): this {
    if (super.has(key)) super.delete(key);
    super.set(key, value);
    while (this.size > this.max) { const oldest = this.keys().next().value as K; super.delete(oldest); }
    return this;
  }
}
