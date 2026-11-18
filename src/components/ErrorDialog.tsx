import { useEffect, useRef } from 'react'

type ErrorDialogProps = {
  message: string
  title?: string
  onClose: () => void
  onRetry?: () => void
  retryLabel?: string
  closeLabel?: string
}

export function ErrorDialog({
  message,
  title = 'Error de conexión!',
  onClose,
  onRetry,
  retryLabel,
  closeLabel = 'Cerrar',
}: ErrorDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => {
      if (dialog?.open) dialog.close()
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => onCloseRef.current(), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [message])

  const retry = () => {
    onClose()
    onRetry?.()
  }

  return (
    <dialog
      ref={dialogRef}
      className="app-error-dialog"
      role="alertdialog"
      aria-labelledby="app-error-title"
      aria-describedby="app-error-message"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose()
      }}
    >
      <header className="app-error-dialog-header">
        <h2 id="app-error-title">{title}</h2>
        <button type="button" onClick={onClose} aria-label={closeLabel}>×</button>
      </header>
      
      {onRetry && retryLabel ? (
        <footer className="app-error-dialog-actions">
          <button type="button" onClick={retry}>{retryLabel}</button>
        </footer>
      ) : null}
    </dialog>
  )
}
