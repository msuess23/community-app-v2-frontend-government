import type {
  FieldError,
  FieldErrors,
  FieldValues,
  Resolver,
} from 'react-hook-form'
import type { ZodIssue, ZodType } from 'zod'

type MutableErrorRecord = Record<string, unknown>

function setIssueError(errors: MutableErrorRecord, issue: ZodIssue): void {
  const path = issue.path.map(String)
  const fieldError: FieldError = {
    message: issue.message,
    type: issue.code,
  }

  if (path.length === 0) {
    errors.root ??= fieldError
    return
  }

  let current = errors

  path.forEach((segment, index) => {
    const isLastSegment = index === path.length - 1

    if (isLastSegment) {
      current[segment] ??= fieldError
      return
    }

    const nextSegment = path[index + 1]
    const nextContainer = current[segment]

    if (
      typeof nextContainer !== 'object' ||
      nextContainer === null ||
      'message' in nextContainer
    ) {
      current[segment] = /^\d+$/.test(nextSegment ?? '') ? [] : {}
    }

    current = current[segment] as MutableErrorRecord
  })
}

export function createZodResolver<TFieldValues extends FieldValues>(
  schema: ZodType<TFieldValues>,
): Resolver<TFieldValues> {
  return async (values) => {
    const result = await schema.safeParseAsync(values)

    if (result.success) {
      return {
        errors: {},
        values: result.data,
      }
    }

    const errors = {} as FieldErrors<TFieldValues>

    result.error.issues.forEach((issue) => {
      setIssueError(errors as MutableErrorRecord, issue)
    })

    return {
      errors,
      values: {} as TFieldValues,
    }
  }
}
