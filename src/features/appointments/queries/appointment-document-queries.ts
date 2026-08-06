import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '@/api/client/api-fetch'
import {
  appendFileToFormData,
  getUploadFilename,
} from '@/api/client/multipart-form-data'
import { createMappedQueryOptions } from '@/api/contract/query-options'
import type {
  AppointmentDocumentResponse,
  BodyUploadAppointmentDocumentApiV1AppointmentsAppointmentIdDocumentsPost,
} from '@/api/generated/models'
import {
  getDownloadAppointmentDocumentApiV1AppointmentsAppointmentIdDocumentsDocumentVersionIdContentGetUrl,
  getUploadAppointmentDocumentApiV1AppointmentsAppointmentIdDocumentsPostUrl,
  listAppointmentDocumentsApiV1AppointmentsAppointmentIdDocumentsGet,
  listAppointmentDocumentVersionsApiV1AppointmentsAppointmentIdDocumentsDocumentGroupIdVersionsGet,
} from '@/api/generated/appointment-documents/appointment-documents'
import {
  getAppointmentDocumentErrorPresentation,
  APPOINTMENT_DOCUMENT_ERROR_MESSAGES,
} from '@/features/appointments/model/appointment-document-form'
import {
  mapAppointmentDocumentResponse,
  mapAppointmentDocumentVersions,
  mapCurrentAppointmentDocuments,
  type AppointmentDocumentRecord,
} from '@/features/appointments/model/appointment-document'
import { appointmentFeatureQueryKeys } from '@/features/appointments/queries/appointment-query-keys'
import { useFeedback } from '@/shared/feedback/feedback-context'
import { useResourceActionMutation } from '@/shared/resource-detail/use-resource-action-mutation'

/** Creates the query for all current appointment document groups. */
export function createAppointmentDocumentsQueryOptions(appointmentId: string) {
  return createMappedQueryOptions({
    map: mapCurrentAppointmentDocuments,
    queryFn: (signal) =>
      listAppointmentDocumentsApiV1AppointmentsAppointmentIdDocumentsGet(
        appointmentId,
        { signal },
      ),
    queryKey: appointmentFeatureQueryKeys.documents(appointmentId),
  })
}

/** Creates the query for every retained version of one document group. */
export function createAppointmentDocumentVersionsQueryOptions(
  appointmentId: string,
  documentGroupId: string,
) {
  return createMappedQueryOptions({
    map: mapAppointmentDocumentVersions,
    queryFn: (signal) =>
      listAppointmentDocumentVersionsApiV1AppointmentsAppointmentIdDocumentsDocumentGroupIdVersionsGet(
        appointmentId,
        documentGroupId,
        { signal },
      ),
    queryKey: appointmentFeatureQueryKeys.documentVersions(
      appointmentId,
      documentGroupId,
    ),
  })
}

export type UploadAppointmentDocumentVariables = Readonly<{
  appointmentId: string
  request: BodyUploadAppointmentDocumentApiV1AppointmentsAppointmentIdDocumentsPost
}>

/** Uploads one immutable PDF version and refreshes current documents, versions and events. */
export function useUploadAppointmentDocumentMutation() {
  return useResourceActionMutation<
    AppointmentDocumentRecord,
    UploadAppointmentDocumentVariables
  >({
    conflictQueryKeys: ({ appointmentId }) => [
      appointmentFeatureQueryKeys.documents(appointmentId),
      appointmentFeatureQueryKeys.events(appointmentId),
      appointmentFeatureQueryKeys.detail(appointmentId),
      appointmentFeatureQueryKeys.lists(),
    ],
    errorPresentation: {
      fallback: getAppointmentDocumentErrorPresentation(undefined),
      messagesByErrorCode: APPOINTMENT_DOCUMENT_ERROR_MESSAGES,
    },
    getCachePlan: (_, { appointmentId }) => ({
      invalidate: [
        appointmentFeatureQueryKeys.documents(appointmentId),
        appointmentFeatureQueryKeys.documentVersionLists(appointmentId),
        appointmentFeatureQueryKeys.events(appointmentId),
        appointmentFeatureQueryKeys.detail(appointmentId),
        appointmentFeatureQueryKeys.lists(),
      ],
    }),
    mutationFn: ({ appointmentId, request }) =>
      uploadAppointmentDocument(appointmentId, request),
    mutationKey: ['appointments', 'documents', 'upload'],
    successFeedback: (document) => ({
      description: document.visibleToCitizen
        ? 'Die neue PDF-Version wurde gespeichert und ist für den Bürger freigegeben.'
        : 'Die neue PDF-Version wurde als internes Behördendokument gespeichert.',
      title:
        document.versionNumber === 1
          ? 'Dokument hochgeladen'
          : 'Neue Dokumentversion hochgeladen',
    }),
  })
}

async function uploadAppointmentDocument(
  appointmentId: string,
  request: BodyUploadAppointmentDocumentApiV1AppointmentsAppointmentIdDocumentsPost,
): Promise<AppointmentDocumentRecord> {
  const formData = new FormData()
  await appendFileToFormData(
    formData,
    'file',
    request.file,
    getUploadFilename(request.file, 'termindokument.pdf'),
  )
  formData.append('document_type', request.document_type)
  if (request.visible_to_citizen !== undefined) {
    formData.append(
      'visible_to_citizen',
      request.visible_to_citizen.toString(),
    )
  }
  if (request.replace_document_group_id) {
    formData.append(
      'replace_document_group_id',
      request.replace_document_group_id,
    )
  }

  return mapAppointmentDocumentResponse(
    await apiFetch<AppointmentDocumentResponse>(
      getUploadAppointmentDocumentApiV1AppointmentsAppointmentIdDocumentsPostUrl(
        appointmentId,
      ),
      { body: formData, method: 'POST' },
    ),
  )
}

export type DownloadAppointmentDocumentVariables = Readonly<{
  appointmentId: string
  document: AppointmentDocumentRecord
}>

/** Downloads one authorized immutable PDF and starts a browser download by original filename. */
export function useDownloadAppointmentDocumentMutation() {
  const queryClient = useQueryClient()
  const { notify } = useFeedback()

  return useMutation<void, unknown, DownloadAppointmentDocumentVariables>({
    mutationFn: async ({ appointmentId, document }) => {
      const blob = await apiFetch<Blob>(
        getDownloadAppointmentDocumentApiV1AppointmentsAppointmentIdDocumentsDocumentVersionIdContentGetUrl(
          appointmentId,
          document.id,
        ),
        { method: 'GET', responseType: 'blob' },
      )
      triggerBlobDownload(blob, document.originalFilename)
    },
    mutationKey: ['appointments', 'documents', 'download'],
    onError: async (error, { appointmentId }) => {
      await queryClient
        .invalidateQueries({
          queryKey: appointmentFeatureQueryKeys.documents(appointmentId),
        })
        .catch(() => undefined)
      await queryClient
        .invalidateQueries({
          queryKey:
            appointmentFeatureQueryKeys.documentVersionLists(appointmentId),
        })
        .catch(() => undefined)
      const presentation = getAppointmentDocumentErrorPresentation(error)
      notify({
        autoDismissAfter: null,
        dedupeKey: 'appointment-document:download-error',
        description: presentation.description,
        title: presentation.title,
        tone: 'error',
      })
    },
  })
}

/** Creates a temporary object URL and always releases it after the browser consumes the click. */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  anchor.hidden = true
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
}
