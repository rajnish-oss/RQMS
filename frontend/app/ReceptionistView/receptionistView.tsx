"use client";

import React, { useState, useEffect } from 'react';
import { UserPlus, Play, CheckCircle2, Clock, Users, UserCheck } from 'lucide-react';
import { useStore } from 'zustand';

// Import your centralized vanilla store & handler infrastructure
import { 
  patientStore, 
  handleAuthAndConnect, 
  emitAddPatient, 
  emitCallNextPatient, 
  emitEndConstultation, 
  initializeWebSocket
} from '../utils/websocket'; // Update this path to match your layout

interface Patient {
  id: string;
  name: string;
  age: number;
  token: string;
  status: 'waiting' | 'called' | 'completed';
}

export default function ReceptionistView() {
  // Bind your centralized Vanilla Zustand store to your React cycle seamlessly
  const isConnected = useStore(patientStore, (state) => state.isConnected);
  const queue = useStore(patientStore, (state) => state.queue) as Patient[];
  const currentPatient = useStore(patientStore, (state) => state.currentPatient) as Patient | null;
  const avgConsultTime = useStore(patientStore, (state) => state.avgConsultTime);
  const patientsSeen = useStore(patientStore, (state) => state.patientsSeen);

  // Local-only structural form UI state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [patientId, setPatientId] = useState('');

  // Auto-connect if an auth session token already exists
  useEffect(() => {
    const token = sessionStorage.getItem("ws_auth_token");
    initializeWebSocket(token ?? '');
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    const success = await handleAuthAndConnect(passwordInput, (msg) => {
      setErrorMsg(msg);
    });

    if (success) {
      setIsAuthenticated(true);
    }
  };

  const handleAddPatientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !age || !patientId) return;

    emitAddPatient(patientId, name, parseInt(age));

    setPatientId('');
    setName('');
    setAge('');
  };

  const handleCallNext = () => {
    if (queue.length === 0) return;
    emitCallNextPatient();
  };

  const handleEndConsultationClick = () => {
    console.log("Ending consultation for patient:", currentPatient);
    if (!currentPatient) return;
    emitEndConstultation(currentPatient.id);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <form onSubmit={handleAuthSubmit} className="bg-white p-8 rounded-2xl shadow-md max-w-sm w-full border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Staff Access Portal</h2>
          <p className="text-sm text-gray-500 mb-4">Please input the clinic passphrase to access queue modifications.</p>
          
          <input 
            type="password" 
            placeholder="Enter Staff Password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            className="w-full border p-3 rounded-lg outline-none focus:border-[#3D5CBC] mb-2"
          />
          {errorMsg && <p className="text-xs text-red-500 font-semibold mb-2">{errorMsg}</p>}
          
          <button type="submit" className="w-full bg-[#3D5CBC] text-white py-2.5 rounded-lg font-bold">
            Verify Identity
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      {/* Navbar */}
      <header className="border-b-4 border-[#F59848] bg-[#3D5CBC] px-8 py-4 text-white shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="rounded-lg bg-white p-2 text-[#3D5CBC]">
              <Users className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-wide">Reception Console</h1>
          </div>
          <div className="flex items-center space-x-2 rounded-full bg-white/10 px-4 py-1 text-sm font-medium">
            {isConnected ? (
              <>
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-400"></span>
                <span>Live Sync Engine Active</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-400"></span>
                <span>Live Sync Engine Inactive</span>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Analytics Top Cards */}
        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="flex items-center space-x-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="rounded-lg bg-[#3D5CBC]/10 p-3 text-[#3D5CBC]">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Avg Consultation Time</p>
              <p className="text-2xl font-bold text-[#3D5CBC]">{avgConsultTime} mins</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="rounded-lg bg-[#F59848]/10 p-3 text-[#F59848]">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Patients in Queue</p>
              <p className="text-2xl font-bold text-gray-900">{queue.length}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="rounded-lg bg-green-50 p-3 text-green-600">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Processed Today</p>
              <p className="text-2xl font-bold text-green-600">{patientsSeen}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left Column: Action Pad */}
          <div className="space-y-8 lg:col-span-1">
            {/* Call Next Panel */}
            <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
              <h2 className="mb-4 text-lg font-bold tracking-tight text-gray-900">Queue Controls</h2>
              
              {currentPatient !== null ? (
                <div className="mb-5 rounded-lg bg-orange-50 border border-[#F59848]/30 p-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#F59848]">Currently Inside Room</span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-3xl font-black text-[#3D5CBC]">{currentPatient.token || 'N/A'}</span>
                    <span className="text-lg font-semibold text-gray-700">{currentPatient.name}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Age: {currentPatient.age} yrs</p>
                </div>
              ) : (
                <div className="mb-5 flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400">
                  No patient currently being seen
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={handleCallNext}
                  disabled={queue.length === 0}
                  className="flex w-full items-center justify-center space-x-2 rounded-lg bg-[#3D5CBC] py-3 font-semibold text-white transition-all hover:bg-[#2d4691] disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
                >
                  <Play className="h-5 w-5 fill-white" />
                  <span>Call Next Patient</span>
                </button>

                <button
                  onClick={handleEndConsultationClick}
                  disabled={!currentPatient}
                  className="flex w-full items-center justify-center space-x-2 rounded-lg border-2 border-[#F59848] bg-white py-3 font-semibold text-[#F59848] transition-all hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <CheckCircle2 className="h-5 w-5" />
                  <span>End Consultation</span>
                </button>
              </div>
            </div>

            {/* Registration Form Panel */}
            <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
              <div className="mb-4 flex items-center space-x-2 border-b border-gray-100 pb-3">
                <UserPlus className="h-5 w-5 text-[#3D5CBC]" />
                <h2 className="text-lg font-bold text-gray-900">Add New Patient</h2>
              </div>
              <form onSubmit={handleAddPatientSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Patient ID</label>
                  <input
                    type="text"
                    required
                    placeholder="view patient booklet"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2.5 outline-none focus:border-[#3D5CBC] focus:ring-1 focus:ring-[#3D5CBC]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Patient Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2.5 outline-none focus:border-[#3D5CBC] focus:ring-1 focus:ring-[#3D5CBC]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Age</label>
                  <input
                    type="number"
                    required
                    placeholder="Years"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-2.5 outline-none focus:border-[#3D5CBC] focus:ring-1 focus:ring-[#3D5CBC]"
                  />
                </div>
                <button
                  type="submit"
                  className="mt-2 w-full rounded-lg bg-[#F59848] py-3 font-semibold text-white shadow-sm transition-all hover:bg-[#e08434]"
                >
                  Register & Enqueue
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Live Data Streams */}
          <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 lg:col-span-2">
            <h2 className="mb-4 text-lg font-bold tracking-tight text-gray-900">Live Active Queue Waiting List</h2>
            <div className="overflow-hidden rounded-xl border border-gray-100 shadow-inner">
              <table className="min-w-full divide-y divide-gray-100 bg-white text-left">
                <thead className="bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-6 py-4">Token ID</th>
                    <th className="px-6 py-4">Patient Name</th>
                    <th className="px-6 py-4">Age</th>
                    <th className="px-6 py-4">Est. Wait</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm font-medium text-gray-700">
                  {queue.length > 0 ? (
                    queue.map((patient, index) => (
                      <tr key={patient.id} className="transition-colors hover:bg-gray-50/70">
                        <td className="whitespace-nowrap px-6 py-4">
                          <span className="rounded-md bg-[#3D5CBC]/10 px-2.5 py-1 font-mono font-bold text-[#3D5CBC]">
                            {patient.token || 'Pending'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 font-semibold text-gray-900">{patient.name}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-gray-500">{patient.age} yrs</td>
                        <td className="whitespace-nowrap px-6 py-4 font-semibold text-orange-600">
                          {Math.round((index + 1) * avgConsultTime)} mins
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-sm font-medium text-gray-400">
                        All clear! No patients currently waiting in line.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
