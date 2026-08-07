import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '@/api/client/api-fetch'
import { appendFileToFormData } from '@/api/client/multipart-form-data'
import type { InfoImageResponse } from '@/api/generated/models'
import {
  deleteInfoImageApiV1InfosInfoIdImagesImageIdDelete,
  setInfoCoverImageApiV1InfosInfoIdImagesImageIdCoverPut,
  getUploadInfoImageApiV1InfosInfoIdImagesPostUrl,
} from '@/api/generated/infos/infos'
import { mapInfoImageResponse } from '@/features/infos/model/info-mapper'
import { infoFeatureQueryKeys } from '@/features/infos/queries/info-query-keys'
import type { MediaAsset } from '@/shared/media/media-model'

export type UploadInfoImageVariables = Readonly<{
  altText: string
  file: File
}>

export type InfoImageIdentifier = Readonly<{
  imageId: string
}>

/** Uploads one Info image without coupling callers to generated multipart names. */
export async function uploadInfoImage(
  infoId: string,
  { altText, file }: UploadInfoImageVariables,
): Promise<MediaAsset> {
  const formData = new FormData()
  await appendFileToFormData(formData, 'file', file, file.name)
  formData.append('alt_text', altText)

  return mapInfoImageResponse(
    await apiFetch<InfoImageResponse>(
      getUploadInfoImageApiV1InfosInfoIdImagesPostUrl(infoId),
      { body: formData, method: 'POST' },
    ),
  )
}

/** Uploads one image and adds the server-confirmed asset to the current gallery. */
export function useUploadInfoImageMutation(infoId: string) {
  const queryClient = useQueryClient()
  const imagesKey = infoFeatureQueryKeys.images(infoId)

  return useMutation<MediaAsset, unknown, UploadInfoImageVariables>({
    mutationFn: (variables) => uploadInfoImage(infoId, variables),
    mutationKey: ['infos', infoId, 'images', 'upload'],
    onSuccess: async (uploadedAsset) => {
      await queryClient.cancelQueries({ exact: true, queryKey: imagesKey })
      queryClient.setQueryData<MediaAsset[]>(imagesKey, (current = []) => {
        const withoutDuplicate = current.filter(
          (asset) => asset.id !== uploadedAsset.id,
        )
        const normalizedCurrent = uploadedAsset.isCover
          ? withoutDuplicate.map((asset) => ({ ...asset, isCover: false }))
          : withoutDuplicate
        return [...normalizedCurrent, uploadedAsset]
      })

      await Promise.all([
        queryClient.invalidateQueries({
          exact: true,
          queryKey: imagesKey,
        }),
        queryClient.invalidateQueries({
          exact: true,
          queryKey: infoFeatureQueryKeys.detail(infoId),
        }),
        queryClient.invalidateQueries({
          queryKey: infoFeatureQueryKeys.lists(),
        }),
      ])
    },
  })
}

/** Selects one server-owned cover image and synchronizes all current projections. */
export function useSetInfoCoverImageMutation(infoId: string) {
  const queryClient = useQueryClient()
  const imagesKey = infoFeatureQueryKeys.images(infoId)

  return useMutation<MediaAsset, unknown, InfoImageIdentifier>({
    mutationFn: async ({ imageId }) =>
      mapInfoImageResponse(
        await setInfoCoverImageApiV1InfosInfoIdImagesImageIdCoverPut(
          infoId,
          imageId,
        ),
      ),
    mutationKey: ['infos', infoId, 'images', 'cover'],
    onSuccess: async (selectedAsset) => {
      await queryClient.cancelQueries({ exact: true, queryKey: imagesKey })
      queryClient.setQueryData<MediaAsset[]>(imagesKey, (current = []) =>
        current.map((asset) =>
          asset.id === selectedAsset.id
            ? selectedAsset
            : { ...asset, isCover: false },
        ),
      )

      await Promise.all([
        queryClient.invalidateQueries({
          exact: true,
          queryKey: infoFeatureQueryKeys.detail(infoId),
        }),
        queryClient.invalidateQueries({
          queryKey: infoFeatureQueryKeys.lists(),
        }),
      ])
    },
  })
}

/** Deletes one physical image and reloads the server-selected replacement cover. */
export function useDeleteInfoImageMutation(infoId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, unknown, InfoImageIdentifier>({
    mutationFn: ({ imageId }) =>
      deleteInfoImageApiV1InfosInfoIdImagesImageIdDelete(infoId, imageId),
    mutationKey: ['infos', infoId, 'images', 'delete'],
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          exact: true,
          queryKey: infoFeatureQueryKeys.images(infoId),
        }),
        queryClient.invalidateQueries({
          exact: true,
          queryKey: infoFeatureQueryKeys.detail(infoId),
        }),
        queryClient.invalidateQueries({
          queryKey: infoFeatureQueryKeys.lists(),
        }),
      ])
    },
  })
}
