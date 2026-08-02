# Form workflow and unsaved changes

This foundation defines how editable workflows behave before feature-specific ticket, appointment, information, user, or office forms are added.

## Goals

- preserve user input while validation or a remote mutation fails;
- prevent duplicate submissions;
- expose validation errors before the individual fields;
- protect dirty forms from accidental in-app navigation and browser-level exits;
- keep form controls usable with keyboard, touch, zoom, and assistive technology;
- provide narrow React Hook Form adapters without coupling shared controls to a feature API.

## Shared controls

The visual controls live under `src/shared/ui` and their React Hook Form adapters under `src/shared/forms`.

| Control                                         | Purpose                                                                      |
| ----------------------------------------------- | ---------------------------------------------------------------------------- |
| `TextField` / `ControlledTextField`             | single-line text, email, password, date, time, and other native input types  |
| `TextAreaField` / `ControlledTextAreaField`     | descriptions, comments, reasons, and other multiline text                    |
| `SelectField` / `ControlledSelectField`         | finite, already-loaded option sets using the platform-native select behavior |
| `RadioGroupField` / `ControlledRadioGroupField` | small mutually exclusive option sets that should remain visible together     |
| `FileUploadField` / `ControlledFileUploadField` | local file selection and review before a feature mutation uploads data       |
| `CheckboxField` / `ControlledCheckboxField`     | independent boolean decisions                                                |

`ControlledChangeReasonField` applies the common label, explanation, required marker, and 500-character limit for administrative audit reasons. Feature schemas should compose `changeReasonSchema` and call `normalizeChangeReason()` before creating a request payload.

Async office or user searches are intentionally not represented by a native select. A later feature should add an accessible combobox together with its concrete query, result labelling, loading, empty, and error behavior. This avoids a generic control that cannot communicate remote lifecycle semantics correctly.

## Form structure

`FormSection` gives long forms named sections with optional descriptions and one required-field explanation. A single asterisk is visual only; the underlying controls continue to expose their required state programmatically.

`FormActions` remains the shared responsive action row. `FormSubmitButton` adds the submission contract:

- the button is disabled while the request is pending;
- the pending label describes the active operation;
- `aria-busy` exposes the pending state;
- repeated activation cannot trigger the same mutation again.

Feature forms should keep their values after server errors. They should call React Hook Form's `reset()` only after the server has confirmed the accepted state, or when the user explicitly discards the draft.

## Error workflow

`FormErrorSummary` accepts a `focusKey` and `shouldFocus`. Feature forms pass React Hook Form's `submitCount` and set `shouldFocusError: false` so a failed submission follows this sequence:

1. the summary is rendered and receives focus;
2. screen-reader and keyboard users hear the overall problem count and messages;
3. field-specific messages link to the affected control;
4. correction remains possible without losing any other input.

Backend field errors continue to use `applySubmissionError()`. A feature mapper is responsible for translating backend field names to the matching frontend form paths.

## Unsaved changes

`useUnsavedChangesGuard()` combines two browser behaviors:

- React Router's blocker protects same-origin navigation inside the application and uses the shared accessible confirmation dialog;
- `beforeunload` protects reload, tab closing, and external navigation with the browser-controlled warning text.

The hook compares pathname, query string, and hash. Query-only navigation is therefore protected when it would replace a dirty view.

A form must stop being dirty before intentional post-save navigation. The expected order is:

1. await the server mutation;
2. reset the form to the server-confirmed values;
3. update or invalidate the relevant query cache;
4. navigate to the next route;
5. show global success feedback.

For an explicit non-navigation action that also discards data, use the returned `confirmDiscardChanges()` function. After acceptance, reset the form before continuing. The account page demonstrates this for logout while profile edits are pending.

The browser does not allow custom copy for hard-reload or tab-close warnings. Feature code must not depend on a specific message in that case.

## Files

`FileUploadField` stores selected `File` objects only in form memory. It does not upload, persist, preview, or inspect them. Feature code remains responsible for:

- MIME type and size validation;
- image dimensions or PDF-specific checks;
- upload progress and cancellation;
- translating server-side file errors;
- clearing selected objects after a confirmed upload.

Sensitive files must never be persisted in local storage or a service-worker cache.

## Accessibility contract

Every shared field provides a visible label, description association, invalid state, error association, and a minimum 44-pixel interaction target where applicable. Radio options remain fully visible, native selects use platform interaction behavior, and selected files are exposed as a readable list.

Feature acceptance tests should cover at least:

- keyboard-only completion and correction;
- focus on the error summary after submit;
- cancel and accept paths of the unsaved-change dialog;
- browser `beforeunload` registration while dirty;
- mobile wrapping of action rows and file metadata;
- 200 to 400 percent zoom without clipped controls;
- Axe checks for the final form page or dialog.

## Deliberate exclusions

This patch does not add:

- a remote-data combobox;
- rich-text editing;
- tag or repeatable-field collections;
- feature-specific dynamic action schemas;
- upload transport or progress;
- autosave or draft persistence;
- a global form registry across tabs.

Those behaviors need concrete backend and workflow semantics and should be introduced with the feature that requires them.
