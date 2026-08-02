import { FileText, Trash2, Upload } from 'lucide-react'
import {
  useEffect,
  useId,
  useRef,
  type ChangeEvent,
  type ReactNode,
} from 'react'

import { formatDisplayFileSize } from '@/shared/format/display-values'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/Button'

export interface FileUploadFieldProps {
  accept?: string
  className?: string
  description?: ReactNode
  errorMessage?: ReactNode
  files: readonly File[]
  id?: string
  isDisabled?: boolean
  isInvalid?: boolean
  inputRef?: (element: HTMLInputElement | null) => void
  isRequired?: boolean
  label: ReactNode
  multiple?: boolean
  name?: string
  onBlur?: () => void
  onFilesChange: (files: File[]) => void
}

/** Collects local files without uploading them and keeps the selected names reviewable. */
export function FileUploadField({
  accept,
  className,
  description,
  errorMessage,
  files,
  id,
  inputRef: forwardedInputRef,
  isDisabled = false,
  isInvalid = false,
  isRequired = false,
  label,
  multiple = false,
  name,
  onBlur,
  onFilesChange,
}: FileUploadFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const descriptionId = description ? `${fieldId}-description` : undefined
  const errorId = isInvalid && errorMessage ? `${fieldId}-error` : undefined
  const selectedFilesId = files.length > 0 ? `${fieldId}-files` : undefined
  const inputRef = useRef<HTMLInputElement>(null)
  const describedBy = [descriptionId, selectedFilesId, errorId]
    .filter(Boolean)
    .join(' ')

  useEffect(() => {
    if (files.length === 0 && inputRef.current?.value) {
      // File inputs may only be cleared programmatically; selected File objects stay in form state.
      inputRef.current.value = ''
    }
  }, [files.length])

  /** Replaces the form value with the files returned by the platform picker. */
  function handleSelection(event: ChangeEvent<HTMLInputElement>): void {
    onFilesChange(Array.from(event.target.files ?? []))
  }

  return (
    <div className={cn('grid gap-3', className)}>
      <label
        className="text-on-surface flex items-baseline gap-1 text-sm font-semibold"
        htmlFor={fieldId}
      >
        <span>{label}</span>
        {isRequired ? (
          <span aria-hidden="true" className="text-error">
            *
          </span>
        ) : null}
      </label>

      {description ? (
        <p
          className="text-on-surface-variant -mt-1 text-sm leading-5"
          id={descriptionId}
        >
          {description}
        </p>
      ) : null}

      <div
        className={cn(
          'border-outline bg-surface rounded-xl border border-dashed p-4',
          isInvalid && 'border-error',
          isDisabled && 'opacity-70',
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="bg-primary-container text-on-primary-container flex size-10 shrink-0 items-center justify-center rounded-full">
              <Upload aria-hidden="true" size={20} />
            </span>
            <div>
              <p className="font-semibold">
                {multiple ? 'Dateien auswählen' : 'Datei auswählen'}
              </p>
              <p className="text-on-surface-variant mt-1 text-sm leading-5">
                Die Auswahl wird erst beim Absenden des Formulars übertragen.
              </p>
            </div>
          </div>

          <input
            accept={accept}
            aria-describedby={describedBy || undefined}
            aria-errormessage={errorId}
            aria-invalid={isInvalid || undefined}
            className={cn(
              'file:bg-primary file:text-on-primary file:hover:bg-primary-hover',
              'text-on-surface-variant w-full text-sm file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-lg file:border-0 file:px-4 file:py-2 file:font-semibold sm:max-w-sm',
              'focus-visible:outline-primary rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-60',
            )}
            disabled={isDisabled}
            id={fieldId}
            multiple={multiple}
            name={name}
            onBlur={onBlur}
            onChange={handleSelection}
            ref={(element) => {
              inputRef.current = element
              forwardedInputRef?.(element)
            }}
            required={isRequired && files.length === 0}
            type="file"
          />
        </div>

        {files.length > 0 ? (
          <div className="border-outline-variant mt-4 border-t pt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold">
                {files.length === 1
                  ? 'Ausgewählte Datei'
                  : `${files.length} ausgewählte Dateien`}
              </p>
              <Button
                isDisabled={isDisabled}
                onPress={() => onFilesChange([])}
                size="sm"
                type="button"
                variant="ghost"
              >
                <Trash2 aria-hidden="true" size={16} />
                Auswahl entfernen
              </Button>
            </div>
            <ul className="mt-3 space-y-2" id={selectedFilesId}>
              {files.map((file, index) => (
                <li
                  className="bg-surface-container-low flex min-w-0 items-center gap-3 rounded-lg px-3 py-2 text-sm"
                  key={`${file.name}-${file.lastModified}-${index}`}
                >
                  <FileText aria-hidden="true" className="shrink-0" size={18} />
                  <span className="min-w-0 flex-1 truncate">{file.name}</span>
                  <span className="text-on-surface-variant shrink-0">
                    {formatDisplayFileSize(file.size)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {isInvalid && errorMessage ? (
        <p className="text-error text-sm leading-5 font-medium" id={errorId}>
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
