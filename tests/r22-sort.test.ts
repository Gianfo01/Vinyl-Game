import { describe, expect, it } from 'vitest';
import { num22 } from '../src/ui/sort22';
describe('r22 ordenação de tabelas', () => {
  it('lê moeda, milhar, decimal, % e sufixos', () => {
    expect(num22('$1,234')).toBe(1234);
    expect(num22('US$ 4.352')).toBe(4352);
    expect(num22('1.234,5')).toBe(1234.5);
    expect(num22('12%')).toBe(12);
    expect(num22('−300')).toBe(-300);
    expect(num22('2,5 mi')).toBe(2.5e6);
    expect(num22('3k')).toBe(3000);
    expect(num22('0,8')).toBe(0.8);
    expect(num22('Beatles')).toBeNull();
  });
});
