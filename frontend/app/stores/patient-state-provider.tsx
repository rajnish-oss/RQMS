'use client'

import { type ReactNode, createContext, useState, useContext } from 'react'
import { useStore } from 'zustand'

import { type PatientStore, createPatientStore } from './patient-state' // Note: Use PatientStore type here for clarity

export type PatientStoreApi = ReturnType<typeof createPatientStore>

// 1. Global Context instance
export const PatientStoreContext = createContext<PatientStoreApi | undefined>(
  undefined,
)

export interface PatientStoreProviderProps {
  children: ReactNode
}

// 2. Safe Next.js state provider wrapper
export const PatientStoreProvider = ({
  children,
}: PatientStoreProviderProps) => {
  const [store] = useState(() => createPatientStore())
  return (
    <PatientStoreContext.Provider value={store}>
      {children}
    </PatientStoreContext.Provider>
  )
}

// 3. Custom consumer hook
export const usePatientStore = <T,>(
  selector: (store: PatientStore) => T,
): T => {
  // FIXED: Renamed local reference to avoid shadowing the global context variable
  const storeContextApi = useContext(PatientStoreContext)
  
  if (!storeContextApi) {
    throw new Error(`usePatientStore must be used within PatientStoreProvider`)
  }

  return useStore(storeContextApi, selector)
}