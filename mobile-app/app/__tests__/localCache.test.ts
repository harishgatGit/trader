describe('Local Cache Search History Store logic', () => {
  it('should prepend new search query and remove duplicate from array', () => {
    const recentSearches = ['AAPL', 'NVDA', 'SPY'];
    const query = 'NVDA';
    
    // Core store update logic:
    const updated = [
      query.toUpperCase(),
      ...recentSearches.filter((s) => s !== query.toUpperCase()),
    ].slice(0, 10);

    expect(updated[0]).toBe('NVDA');
    expect(updated.length).toBe(3);
    expect(updated).toEqual(['NVDA', 'AAPL', 'SPY']);
  });

  it('should cap the search array size to maximum 10 items', () => {
    const recentSearches = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const query = 'NEW';
    
    const updated = [
      query.toUpperCase(),
      ...recentSearches.filter((s) => s !== query.toUpperCase()),
    ].slice(0, 10);

    expect(updated.length).toBe(10);
    expect(updated[0]).toBe('NEW');
    expect(updated[9]).toBe('I'); // 'J' is popped/capped off
  });
});
