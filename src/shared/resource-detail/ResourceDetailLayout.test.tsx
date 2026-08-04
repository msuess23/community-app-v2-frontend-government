import { screen } from '@testing-library/react'

import {
  ResourceDetailLayout,
  ResourceDetailSection,
  ResourceMetadataList,
} from '@/shared/resource-detail/ResourceDetailLayout'
import { renderRouter } from '@/test/render'

describe('ResourceDetailLayout', () => {
  it('provides return navigation, section anchors and semantic metadata', () => {
    renderRouter(
      [
        {
          path: '/tickets/ticket-1',
          element: (
            <ResourceDetailLayout
              backLink={{
                label: 'Zur Anliegenübersicht',
                to: '/tickets?status=OPEN&page=3',
              }}
              navigationClassName="lg:hidden"
              navigationItems={[
                { id: 'overview', label: 'Übersicht' },
                { id: 'history', label: 'Ereignisse' },
              ]}
              status={<span>In Bearbeitung</span>}
              title="Defekte Straßenbeleuchtung"
            >
              <ResourceDetailSection id="overview" title="Übersicht">
                <ResourceMetadataList
                  items={[
                    { label: 'Behörde', value: 'Tiefbauamt' },
                    { label: 'Version', value: '3' },
                  ]}
                />
              </ResourceDetailSection>
              <ResourceDetailSection id="history" title="Ereignisse">
                <p>Noch keine Ereignisse</p>
              </ResourceDetailSection>
            </ResourceDetailLayout>
          ),
        },
      ],
      ['/tickets/ticket-1'],
    )

    expect(
      screen.getByRole('heading', { name: 'Defekte Straßenbeleuchtung' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Zur Anliegenübersicht' }),
    ).toHaveAttribute('href', '/tickets?status=OPEN&page=3')
    expect(
      screen.getByRole('navigation', {
        name: 'Abschnitte dieser Detailansicht',
      }),
    ).toHaveClass('lg:hidden')
    expect(screen.getByRole('link', { name: 'Ereignisse' })).toHaveAttribute(
      'href',
      '#history',
    )
    expect(screen.getByText('Behörde').tagName).toBe('DT')
    expect(screen.getByText('Tiefbauamt').tagName).toBe('DD')
  })
})
