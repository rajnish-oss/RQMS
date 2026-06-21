import React from 'react'
import {PatientStoreProvider} from '../stores/patient-state-provider'
import PatientWaitingRoomView from '../PatientWaitingRoomView/patientWaitingRoomView'
const Page = () => {
  return (
    <PatientStoreProvider>
      <PatientWaitingRoomView />
    </PatientStoreProvider>
  )
}

export default Page
