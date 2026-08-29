describe('jest harness', () => {
  it('runs TypeScript tests', () => {
    const sum = (a: number, b: number): number => a + b;
    expect(sum(2, 3)).toBe(5);
  });
});
