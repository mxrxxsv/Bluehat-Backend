// Simple Jest configuration test
describe("Jest Setup", () => {
  it("should run basic test", () => {
    expect(1 + 1).toBe(2);
  });

  it("should have access to global functions", () => {
    expect(typeof describe).toBe("function");
    expect(typeof it).toBe("function");
    expect(typeof expect).toBe("function");
  });
});
