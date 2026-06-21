"use client";

import React, { useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { Clock, Users, Tv, Wifi, AlertCircle } from 'lucide-react';
import { patientStore, initializeWebSocket } from '../utils/websocket'; // Adjust path if needed

export default function PatientWaitingRoomView() {
  // 1. Bind UI elements directly to the global, synchronized Zustand store
  const queue = useStore(patientStore, (state) => state.queue);
  const currentPatient = useStore(patientStore, (state) => state.currentPatient);
  const avgConsultTime = useStore(patientStore, (state) => state.avgConsultTime);
  const isConnected = useStore(patientStore, (state) => state.isConnected);

  // Keep visual-only, component-specific animation state local
  const [isFlashing, setIsFlashing] = useState<boolean>(false);

  // 2. Stream Lifecycle: Fire up the WebSocket pipeline immediately on mount
  useEffect(() => {
    initializeWebSocket("");
  }, []);

  // 3. High-Visibility Flashing Call Alert Hook triggered on State shifts
  useEffect(() => {
    if (!currentPatient?.token) return;
    
    setIsFlashing(true);
    const timer = setTimeout(() => setIsFlashing(false), 4000); 
    return () => clearTimeout(timer);
  }, [currentPatient?.token]);

  return (
    <div className="min-h-screen bg-gray-950 font-sans text-gray-100 p-6 flex flex-col justify-between">
      
      {/* Top TV Header Banner */}
      <header className="bg-[#3D5CBC] rounded-2xl p-6 shadow-xl flex items-center justify-between border-b-8 border-[#F59848]">
        <div className="flex items-center space-x-4">
          <div className="rounded-xl bg-white p-3 text-[#3D5CBC] shadow-md">
            <Tv className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-wide uppercase">Patient Waiting Room</h1>
            <p className="text-white/80 text-sm font-semibold tracking-wider">Please watch this screen for your token turn</p>
          </div>
        </div>

        {/* Connectivity Status Indicator */}
        <div className={`flex items-center space-x-3 rounded-full px-5 py-2 text-sm font-bold tracking-wide transition-all ${
          isConnected ? 'bg-white/10 text-white' : 'bg-red-500 text-white animate-bounce'
        }`}>
          {isConnected ? (
            <>
              <Wifi className="h-5 w-5 text-green-400" />
              <span>LIVE UPDATES SYNCED</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-5 w-5 text-white animate-pulse" />
              <span>CONNECTION LOST - SEEK RECEPTION</span>
            </>
          )}
        </div>
      </header>

      {/* Main Display Split Screen */}
      <main className="my-6 grid grid-cols-1 gap-6 lg:grid-cols-5 flex-1">
        
        {/* BIG HERO BLOCK: Current Active Token */}
        <div className="lg:col-span-3 flex flex-col justify-between rounded-2xl bg-white border border-gray-100 p-8 shadow-xl text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-3 bg-[#3D5CBC]" />
          
          <div className="my-auto py-8">
            <span className="text-md font-black uppercase tracking-widest text-gray-400 block mb-2">
              TOKEN
            </span>
            
            {/* Massive high-visibility Token display */}
            <div className={`mx-auto inline-block rounded-3xl px-12 py-6 font-mono text-8xl md:text-9xl font-black transition-all duration-300 ${
              isFlashing 
                ? 'bg-[#F59848] text-white scale-105 shadow-2xl animate-pulse' 
                : 'bg-[#3D5CBC]/10 text-[#3D5CBC]'
            }`}>
              {currentPatient?.token || '---'}
            </div>

            <div className="mt-8 flex items-center justify-center space-x-3 text-2xl font-bold text-gray-700">
              <span>PROCEED TO CONSULTATION ROOM</span>
            </div>
          </div>

          {/* Global Running Estimates Block */}
          <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-6">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex items-center justify-center space-x-2 text-gray-500 font-bold text-sm uppercase tracking-wider mb-1">
                <Clock className="h-4 w-4 text-[#3D5CBC]" />
                <span>Current Flow Pace</span>
              </div>
              <p className="text-3xl font-black text-[#3D5CBC]">
                ~{Math.round(avgConsultTime)} <span className="text-sm font-bold text-gray-500">mins/pt</span>
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex items-center justify-center space-x-2 text-gray-500 font-bold text-sm uppercase tracking-wider mb-1">
                <Users className="h-4 w-4 text-[#F59848]" />
                <span>Tokens Remaining</span>
              </div>
              <p className="text-3xl font-black text-gray-900">{queue.length}</p>
            </div>
          </div>
        </div>

        {/* SIDE BAR: Upcoming Tokens Ticker */}
        <div className="lg:col-span-2 flex flex-col rounded-2xl bg-gray-900 border border-gray-800 p-6 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-4">
            <h2 className="text-xl font-black uppercase tracking-wider text-gray-300">Upcoming Tokens</h2>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest bg-gray-800 px-3 py-1 rounded-full">Next In Line</span>
          </div>

          {/* High density vertical scroll grid */}
          <div className="space-y-3 overflow-y-auto max-h-[440px] flex-1 pr-1 scrollbar-none">
            {queue.length > 0 ? (
              queue.map((patient, index) => (
                <div 
                  key={patient.id} 
                  className={`flex items-center justify-between rounded-xl p-4 border transition-all ${
                    index === 0 
                      ? 'bg-[#3D5CBC]/10 border-[#3D5CBC]/30' 
                      : 'bg-gray-900/50 border-gray-800'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <span className={`text-sm font-black w-6 h-6 rounded-full flex items-center justify-center ${
                      index === 0 ? 'bg-[#3D5CBC] text-white' : 'bg-gray-800 text-gray-400'
                    }`}>
                      {index + 1}
                    </span>
                    <span className="font-mono text-3xl font-black text-white tracking-tight">
                      {patient.token}
                    </span>
                  </div>

                  {/* Dynamic calculation base on real pacing metric */}
                  <div className="text-right">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-500">Est. Waiting</span>
                    <span className="text-lg font-extrabold text-[#F59848]">
                      ~{Math.round((index + 1) * avgConsultTime)} mins
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center text-gray-500 py-12">
                <p className="text-lg font-bold">No Waiting Tokens</p>
                <p className="text-xs max-w-xs mt-1">New entries registered at the reception desk will pop up here instantly.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

