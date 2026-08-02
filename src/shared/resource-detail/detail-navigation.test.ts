import {
  createResourceDetailNavigationState,
  resolveResourceDetailReturnTo,
} from '@/shared/resource-detail/detail-navigation'

describe('resource detail navigation', () => {
  it('preserves the complete list URL for a deterministic return link', () => {
    expect(
      createResourceDetailNavigationState({
        hash: '#results',
        pathname: '/tickets',
        search: '?status=OPEN&page=3',
      }),
    ).toEqual({ from: '/tickets?status=OPEN&page=3#results' })
  })

  it('accepts safe internal router state and rejects external redirects', () => {
    expect(
      resolveResourceDetailReturnTo(
        { from: '/tickets?status=OPEN&page=3' },
        '/tickets',
      ),
    ).toBe('/tickets?status=OPEN&page=3')
    expect(
      resolveResourceDetailReturnTo(
        { from: '//external.example/path' },
        '/tickets',
      ),
    ).toBe('/tickets')
    expect(
      resolveResourceDetailReturnTo(
        { from: '/\\external.example/path' },
        '/tickets',
      ),
    ).toBe('/tickets')
    expect(
      resolveResourceDetailReturnTo(
        { from: '/tickets\nexternal' },
        '/tickets',
      ),
    ).toBe('/tickets')
  })
})
