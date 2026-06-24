import { createPatientStore } from '../stores/patient-state'; // Make sure this path matches your store file

// 1. Initialize your centralized global Vanilla Zustand store
export const patientStore = createPatientStore();

// Keep a module-level reference to the active socket
let ws: WebSocket | null = null;

// 2. Authentication and Initialization Orchestrator (Pure Vanilla JS)
export const handleAuthAndConnect = async (passwordInput: string, onError: (msg: string) => void) => {
  try {
    const res = await fetch("https://rqms-backend.onrender.com/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: passwordInput })
    });
    
    const data = await res.json();
    
    if (data.success) {
      if (typeof window !== 'undefined') {
        localStorage.setItem("ws_auth_token", data.token);
      }
      console.log("websocket connected successfully")
      initializeWebSocket(data.token);
      return true; // Authentication successful
    } else {
      onError(data.message);
      return false;
    }
  } catch (err) {
    console.error("Auth HTTP failure:", err);
    onError("Network connection to auth server failed.");
    return false;
  }
};

export const verifyStoredAuthToken = async (token: string) => {
  try {
    const res = await fetch("https://rqms-backend.onrender.com/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    });

    const data = await res.json();
    return Boolean(data.success);
  } catch (err) {
    console.error("Stored auth token verification failed:", err);
    return false;
  }
};

// 3. Main WebSocket Pipeline Engine
export const initializeWebSocket = (token: string) => {
  // Prevent duplicate open sockets
  if (ws && ws.readyState === WebSocket.OPEN) return;

  ws = new WebSocket('wss://rqms-backend.onrender.com/ws?token=' + token);
  
  // Grab the direct store mutation handle
  const store = patientStore.getState();

  ws.onopen = () => {
    store.setIsConnected(true);
    ws?.send(JSON.stringify({ "action": "GET_INITIAL_QUEUE" }));
  };

  ws.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data);
    if (!data.event) return;

    console.log("Received WebSocket packet:", data);

    const store = patientStore.getState();


    switch (data.event) {
      case 'PATIENT_ADDED':
        // Safe functional update! Prevents any stale closure arrays
        store.setQueue((prevQueue) => [...prevQueue, data.data]);
        break;
      
      case 'METRICS_UPDATED':
        console.log("Received metrics update:", data);
        store.setAvgConsultTime(data.data.average_consultation_time);
        store.setCurrentPatient(null);
        break;

      case 'TOKEN_CHANGED':
        store.setQueue((prevQueue) => prevQueue.filter((_, i) => i !== 0));
        store.setPatientsSeen((prevSeen) => prevSeen + 1);
        store.setAvgConsultTime(data.data.average_consultation_time);
        store.setCurrentPatient(data.data);
        break;

      case 'INITIAL_QUEUE':
        console.log("Received initial queue:", data.data.initial_queue);
        store.setQueue(data.data.initial_queue || []);
        break;

      default:
        break;
    }
  } catch (err) {
    console.error("Error parsing WebSocket packet:", err);
  }
};

  ws.onerror = (error) => {
    console.error("WebSocket Error:", error);
  };

  ws.onclose = () => {
    store.setIsConnected(false);
  };
};

export const emitAddPatient = (patientId: string, name: string, age: number) => {
  ws?.send(JSON.stringify({
    action: "ADD_PATIENT",
    patient_id: patientId,
    name,
    age
  }));
};

export const emitCallNextPatient = () => {
  ws?.send(JSON.stringify({ action: "CALL_NEXT_PATIENT" }));
};

export const emitEndConstultation = (patientId: string) => {
  ws?.send(JSON.stringify({"action": "END_CONSULTATION","patient_id": patientId}));
};
