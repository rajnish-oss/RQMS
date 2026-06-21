import React from 'react'
import {PatientStoreProvider} from '../stores/patient-state-provider'
import ReceptionistView from '../ReceptionistView/receptionistView'
const Page = () => {
  return (
    <PatientStoreProvider>
      <ReceptionistView />
    </PatientStoreProvider>
  )
}

export default Page
