import { ApiError } from '@/api/client/api-error'
import { getApiErrorPresentation } from '@/api/client/api-error-presentation'

describe('getApiErrorPresentation', () => {
  it('maps network failures to a safe retry message', () => {
    expect(
      getApiErrorPresentation(
        new ApiError({
          errorCode: 'NETWORK_ERROR',
          message: 'fetch failed',
          status: 0,
        }),
      ),
    ).toEqual({
      description:
        'Der Server ist derzeit nicht erreichbar. Prüfe die Verbindung und versuche es erneut.',
      title: 'Keine Verbindung zum Server',
    })
  })

  it('uses the generic conflict message for workflow conflicts', () => {
    expect(
      getApiErrorPresentation(
        new ApiError({
          errorCode: 'WORKFLOW_VALIDATION_FAILED',
          message: 'Transition no longer allowed',
          status: 409,
        }),
      ),
    ).toEqual({
      description:
        'Der Stand hat sich zwischenzeitlich geändert. Lade die Daten neu und prüfe die verfügbaren Aktionen.',
      title: 'Daten wurden zwischenzeitlich geändert',
    })
  })

  it('allows a feature to translate a stable backend error code', () => {
    expect(
      getApiErrorPresentation(
        new ApiError({
          errorCode: 'APPOINTMENT_SLOT_NOT_AVAILABLE',
          message: 'Appointment slot is not available',
          status: 409,
        }),
        {
          messagesByErrorCode: {
            APPOINTMENT_SLOT_NOT_AVAILABLE: {
              description: 'Wähle einen anderen Termin aus.',
              title: 'Termin nicht mehr verfügbar',
            },
          },
        },
      ),
    ).toEqual({
      description: 'Wähle einen anderen Termin aus.',
      title: 'Termin nicht mehr verfügbar',
    })
  })

  it('does not expose an unknown server message to the user', () => {
    expect(
      getApiErrorPresentation(
        new ApiError({
          message: 'Traceback: database connection failed',
          status: 503,
        }),
      ),
    ).toEqual({
      description:
        'Auf dem Server ist ein unerwarteter Fehler aufgetreten. Versuche es später erneut.',
      title: 'Serverfehler',
    })
  })

  it('uses the caller fallback for non-API errors', () => {
    expect(
      getApiErrorPresentation(new Error('Unexpected error'), {
        fallback: {
          description: 'Der Kontostatus konnte nicht geprüft werden.',
          title: 'Kontostatus nicht verfügbar',
        },
      }),
    ).toEqual({
      description: 'Der Kontostatus konnte nicht geprüft werden.',
      title: 'Kontostatus nicht verfügbar',
    })
  })
})
