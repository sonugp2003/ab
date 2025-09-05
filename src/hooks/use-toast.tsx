
"use client"

// Inspired by react-hot-toast library
import * as React from "react"
import { type ToastProps } from "@/components/ui/toast"

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactElement
}

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

const reducer = (state: ToasterToast[], action: any) => {
  switch (action.type) {
    case "ADD_TOAST":
      return [action.toast, ...state].slice(0, TOAST_LIMIT)

    case "DISMISS_TOAST":
      const { toastId } = action
      if (toastId) {
        return state.filter((t) => t.id !== toastId)
      }
      return state.slice(0, state.length - 1)

    case "REMOVE_TOAST":
      if (action.toastId) {
        return state.filter((t) => t.id !== action.toastId)
      }
      return []

    default:
      return state
  }
}

const listeners: Array<(state: ToasterToast[]) => void> = []

let memoryState: ToasterToast[] = []

function dispatch(action: any) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type ToasterContextType = {
  toasts: ToasterToast[]
  toast: (toast: Omit<ToasterToast, "id">) => string
  dismiss: (toastId?: string) => void
}

const ToasterContext = React.createContext<ToasterContextType | undefined>(undefined)

export const useToast = () => {
  const context = React.useContext(ToasterContext)

  if (!context) {
    throw new Error("useToast must be used within a ToasterProvider")
  }

  return context
}

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToasterToast[]>(memoryState)

  React.useEffect(() => {
    listeners.push(setToasts)
    return () => {
      const index = listeners.indexOf(setToasts)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [toasts])

  const toast = React.useCallback((props: Omit<ToasterToast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9)
    dispatch({ type: "ADD_TOAST", toast: { ...props, id } })
    return id
  }, [])

  const dismiss = React.useCallback((toastId?: string) => {
    dispatch({ type: "DISMISS_TOAST", toastId })
  }, [])

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if(toasts.length > 0) {
        dispatch({ type: "DISMISS_TOAST" })
      }
    }, TOAST_REMOVE_DELAY)

    return () => clearTimeout(timer)
  }, [toasts])

  return (
    <ToasterContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
    </ToasterContext.Provider>
  )
}
