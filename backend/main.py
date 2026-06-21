import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect,Query
import redis.asyncio as aioredis 
from dotenv import load_dotenv
from redisQueue import *
import os
from datetime import datetime, timedelta
import jwt
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

app = FastAPI()
CHANNEL_KEY = "channel:updates"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# 1. HTTP Endpoint to exchange the passphrase for a JWT token
@app.post("/api/auth")
async def authenticate_receptionist(payload: dict):
    password = payload.get("password")
    print(password)
    print(os.getenv("STAFF_PASSPHRASE"))
    if password != os.getenv("STAFF_PASSPHRASE"):
        return {"success": False, "message": "Invalid Staff Passphrase"}
    
    # Token expires automatically in 12 hours (end of shift)
    expiry = datetime.utcnow() + timedelta(hours=12)
    token = jwt.encode({"role": "receptionist", "exp": expiry}, os.getenv("JWT_SECRET"), algorithm=os.getenv("ALGORITHM"))
    return {"success": True, "token": token}

async def redis_listener_task(websocket: WebSocket):
    """Listens continuously to Redis Pub/Sub and pushes messages to this WebSocket."""
    # Establish an async connection to Redis
    async_redis = aioredis.from_url(
        "redis://localhost:6379", 
        decode_responses=True,
        health_check_interval=20,     # Pings the Redis server every 20 seconds to prevent idleness
        socket_keepalive=True,        # Instructs the OS kernel to send TCP keepalive probes
        socket_timeout=None           # Prevents the read loop from throwing an explicit timeout error
    )
    pubsub = async_redis.pubsub()
    await pubsub.subscribe(CHANNEL_KEY)
    
    try:
        async for message in pubsub.listen():
            # Redis pubsub yields metadata on subscribe, skip it
            if message["type"] == "message":
                payload = message["data"]
                # Send the live update straight to the screen
                await websocket.send_text(payload)
    except Exception as e:
        print(f"Redis listener error: {e}")
    finally:
        await pubsub.unsubscribe(CHANNEL_KEY)
        await async_redis.close()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket,token: str | None = Query(None)):
    await websocket.accept()
    
    # Start the background task that forwards Redis updates to this client
    listener_task = asyncio.create_task(redis_listener_task(websocket))

    is_receptionist = False
    if token:
        try:
            decoded = jwt.decode(token, os.getenv("JWT_SECRET"), algorithms=[os.getenv("ALGORITHM")])
            if decoded.get("role") == "receptionist":
                is_receptionist = True
        except jwt.PyJWTError:
            pass
    
    try:
        while True:
            try:

                data = await websocket.receive_json()
                action = data.get("action")

                match action:
                    # --- Public / Read-Only Actions (Allowed for anyone) ---
                    case "GET_INITIAL_QUEUE":
                        get_initial_queue()

                    # --- Protected / Write Actions (Receptionist Only) ---
                    case "ADD_PATIENT" | "CALL_NEXT_PATIENT" | "END_CONSULTATION":
                        if not is_receptionist:
                            await websocket.send_json({"event": "UNAUTHORIZED", "error": "Write Access Denied."})
                            continue # Skips processing the case if unauthorized

                        # Process the specific write action since they are authorized
                        if action == "ADD_PATIENT":
                            add_patient(
                                patient_id=data.get("patient_id"), 
                                name=data.get("name"), 
                                age=data.get("age"),
                            )
                        elif action == "CALL_NEXT_PATIENT":
                            call_next_patient()
                        elif action == "END_CONSULTATION":
                            end_consultation(patient_id=data.get("patient_id"))

                    # --- Fallback Default Case ---
                    case _:
                        print(f"Unknown action received: {action}")
                        await websocket.send_json({"error": "Unknown action"})

            except ValueError as json_err:
                # Catches bad JSON formatting
                print(f"Invalid JSON received: {json_err}")
                await websocket.send_json({"error": "Invalid JSON format"})
                
            except Exception as e:
                # Catches database errors, missing keys, or logic failures
                print(f"Error processing action: {e}")
                # Tell the client something went wrong so they aren't left hanging
                await websocket.send_json({"error": "Internal server processing error"})
                # The loop continues to the next 'await websocket.receive_json()'
                
    except WebSocketDisconnect:
        print("Client disconnected gracefully")
    except Exception as outer_e:
        print(f"Fatal connection error: {outer_e}")
    finally:
        # Crucial clean up: stop listening to Redis if the client actually disconnects
        listener_task.cancel()
        try:
            await websocket.close()
        except:
            pass