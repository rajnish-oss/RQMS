import { createStore } from 'zustand/vanilla'

export type PatientState = {
  isConnected: boolean;
  queue: any[];
  currentPatient: any;
  avgConsultTime: number;
  patientsSeen: number;
}

// Utility helper type to allow values OR functional state updates (like React's useState)
type SetterArg<T> = T | ((prev: T) => T);

export type PatientActions = {
  setIsConnected: (isConnected: SetterArg<boolean>) => void;
  setQueue: (queue: SetterArg<any[]>) => void;
  setCurrentPatient: (currentPatient: SetterArg<any>) => void;
  setAvgConsultTime: (avgConsultTime: SetterArg<number>) => void;
  setPatientsSeen: (patientsSeen: SetterArg<number>) => void;
}

export type PatientStore = PatientState & PatientActions

export const defaultInitState: PatientState = {
  isConnected: false,
  queue: [],
  currentPatient: null,
  avgConsultTime: 0,
  patientsSeen: 0,
}

export const createPatientStore = (initState: PatientState = defaultInitState) => {
  return createStore<PatientStore>()((set) => ({
    ...initState,
    // Use an explicit functional check to evaluate updates dynamically against the true current state
    setIsConnected: (arg) => set((state) => ({ isConnected: typeof arg === 'function' ? (arg as Function)(state.isConnected) : arg })),
    setQueue: (arg) => set((state) => ({ queue: typeof arg === 'function' ? (arg as Function)(state.queue) : arg })),
    setCurrentPatient: (arg) => set((state) => ({ currentPatient: typeof arg === 'function' ? (arg as Function)(state.currentPatient) : arg })),
    setAvgConsultTime: (arg) => set((state) => ({ avgConsultTime: typeof arg === 'function' ? (arg as Function)(state.avgConsultTime) : arg })),
    setPatientsSeen: (arg) => set((state) => ({ patientsSeen: typeof arg === 'function' ? (arg as Function)(state.patientsSeen) : arg })),
  }))
}