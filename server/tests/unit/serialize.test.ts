import { Prisma } from '@prisma/client';
import { serializeDoc, serializeList } from '../../src/utils/serialize';

describe('serializeDoc', () => {
  it('mirrors id into _id', () => {
    const out = serializeDoc({ id: 'abc', name: 'Sunrise' }) as any;
    expect(out.id).toBe('abc');
    expect(out._id).toBe('abc');
  });

  it('recurses into nested relations', () => {
    const out = serializeDoc({
      id: 'bill-1',
      tenancy: { id: 'ten-1', pdFullName: 'Ana' },
    }) as any;
    expect(out.tenancy._id).toBe('ten-1');
  });

  it('recurses into arrays', () => {
    const out = serializeDoc({ id: 'p1', units: [{ id: 'u1' }, { id: 'u2' }] }) as any;
    expect(out.units.map((u: any) => u._id)).toEqual(['u1', 'u2']);
  });

  it('converts Decimal to number', () => {
    const out = serializeDoc({ id: 'u1', deposit: new Prisma.Decimal('5000.00') }) as any;
    expect(out.deposit).toBe(5000);
    expect(typeof out.deposit).toBe('number');
  });

  it('preserves Date instances', () => {
    const d = new Date('2026-01-01T00:00:00Z');
    const out = serializeDoc({ id: 'x', dueDate: d }) as any;
    expect(out.dueDate).toBeInstanceOf(Date);
  });

  it('returns null for null', () => {
    expect(serializeDoc(null)).toBeNull();
  });

  it('serializeList maps every element', () => {
    expect(serializeList([{ id: 'a' }, { id: 'b' }]).map((d: any) => d._id)).toEqual(['a', 'b']);
  });
});
