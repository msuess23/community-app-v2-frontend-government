import {
  createResourceActionRegistry,
  resolveAllowedResourceActions,
} from '@/shared/resource-detail/resource-action-registry'

type Action = 'ASSIGN' | 'COMPLETE'

const registry = createResourceActionRegistry<Action>([
  {
    action: 'ASSIGN',
    dialogTitle: 'Zuweisen',
    label: 'Zuweisen',
    render: () => null,
  },
  {
    action: 'COMPLETE',
    dialogTitle: 'Abschließen',
    label: 'Abschließen',
    render: () => null,
  },
])

describe('resource action registry', () => {
  it('preserves server order, ignores duplicates and reports unknown actions', () => {
    const result = resolveAllowedResourceActions(
      ['COMPLETE', 'UNKNOWN', 'ASSIGN', 'COMPLETE'],
      registry,
    )

    expect(result.actions.map((action) => action.action)).toEqual([
      'COMPLETE',
      'ASSIGN',
    ])
    expect(result.unknownActions).toEqual(['UNKNOWN'])
  })

  it('rejects duplicate action registrations', () => {
    expect(() =>
      createResourceActionRegistry<Action>([
        {
          action: 'ASSIGN',
          dialogTitle: 'Erste Zuweisung',
          label: 'Zuweisen',
          render: () => null,
        },
        {
          action: 'ASSIGN',
          dialogTitle: 'Zweite Zuweisung',
          label: 'Noch einmal zuweisen',
          render: () => null,
        },
      ]),
    ).toThrow('Resource action "ASSIGN" is registered more than once.')
  })
})
