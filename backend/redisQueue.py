from redis import Redis
import json
from datetime import datetime
import urllib.parse as urlparse
import os

# Connect to Redis. decode_responses=True automatically converts bytes to strings,
# so we can clean up the manual decoding logic entirely.
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")

# 2. Automatically fix missing protocol schemes from raw endpoints
if redis_url and not redis_url.startswith(("redis://", "rediss://")):
    redis_url = f"rediss://{redis_url}"

# 3. Parse the connection parameters safely
url = urlparse.urlparse(redis_url)

# 4. Handle TLS requirements for cloud architectures (like Render)
is_ssl = url.scheme == "rediss"

# 5. Initialize the connection client pool securely
r = Redis(
    host=url.hostname,
    port=url.port or 6379,
    username=url.username,
    password=url.password,
    ssl=is_ssl,
    ssl_cert_reqs="none" if is_ssl else None,  # Bypasses self-signed internal cert errors on Render
    decode_responses=True
)

QUEUE_KEY = "patient_queue"
METRICS_KEY = "queue:metrics"
CHANNEL_KEY = "channel:updates"

def add_patient(patient_id, name, age):
    patient_key = f"patient:{patient_id}"

    next_num = r.incr("counter:daily_tokens")
    token = f"{next_num:03d}"
    # 1. Store patient details
    created_at = datetime.now().isoformat()
    patient_data = {
        "id": patient_id,
        "name": name,
        "age": age,
        "token": token,
        "status": "waiting",
        "created_at": created_at
    }
    r.hset(patient_key, mapping=patient_data)
    # 2. Add patient id to queue
    r.expire(patient_key, 86400)
    r.rpush(QUEUE_KEY, patient_id)

    # 3. BROADCAST: Tell the WebSocket servers a new patient joined
    # Frontend needs this to update "Tokens Ahead" calculations dynamically
    payload = {
        "event": "PATIENT_ADDED",
        "data": patient_data
    }
    r.publish(CHANNEL_KEY, json.dumps(payload))


def call_next_patient():
    # 2. Atomically remove the next person from queue
    patient_id = r.lpop(QUEUE_KEY)

    if not patient_id:
        # If queue is empty (e.g., end of the day), clear active patient tracker
        r.delete(METRICS_KEY + ":active_patient_id")
        r.publish(CHANNEL_KEY, json.dumps({"event": "QUEUE_EMPTY"}))
        return None

    patient_key = f"patient:{patient_id}"
    
    # 3. Start the clock for the new patient
    called_at = datetime.now().isoformat()
    r.hset(patient_key, mapping={
        "status": "called",
        "called_at": called_at
    })

    
    # Save this patient as the currently active one in the room
    r.set(METRICS_KEY + ":active_patient_id", patient_id)

    patient = r.hgetall(patient_key)
    
    start_time = datetime.fromisoformat(patient["created_at"])
    duration = (datetime.now() - start_time).total_seconds() / 60.0
    duration = max(1.0, round(duration, 1))

    # 2. Save consultation duration to Redis
    r.rpush(METRICS_KEY + ":durations", duration)

    # 2. Get previous rolling metrics from Redis
    metrics = r.hgetall(METRICS_KEY)
    prev_avg = float(metrics.get("average_consultation_time", 15.0))
    count = int(metrics.get("patients_seen_count", 0))

    # 3. Calculate Cumulative Moving Average (CMA)
    new_avg = ((prev_avg * count) + duration) / (count + 1)
    new_avg = round(new_avg, 1)

    # Update Global State Metrics
    r.hset(METRICS_KEY, "current_token", patient["token"])

    # 4. LIVE SYNC: Broadcast the change to WebSockets
    remaining_count = r.llen(QUEUE_KEY)
    
    
    payload = {
        "event": "TOKEN_CHANGED",
        "data": {
            "id": patient["id"],
            "token": patient["token"],
            "name": patient["name"],
            "age": patient["age"],
            "remaining_in_queue": remaining_count,
            "average_consultation_time": new_avg
        }
    }
    r.publish(CHANNEL_KEY, json.dumps(payload))
    return patient

def end_consultation(patient_id):
    """
    NEW FUNCTION: Triggered when doctor finishes treating a patient.
    Calculates Cumulative Moving Average and broadcasts it to Screen 2.
    """
    patient_key = f"patient:{patient_id}"
    patient = r.hgetall(patient_key)
    
    if not patient or "called_at" not in patient:
        return None

    # 1. Calculate actual session duration in minutes
    start_time = datetime.fromisoformat(patient["created_at"])
    duration = (datetime.now() - start_time).total_seconds() / 60.0
    
    # Sanity guard: prevent 0-minute metrics if clicked instantly by accident
    duration = max(1.0, round(duration, 1))

    # 2. Save consultation duration to Redis
    r.rpush(METRICS_KEY + ":durations", duration)

    # 2. Get previous rolling metrics from Redis
    metrics = r.hgetall(METRICS_KEY)
    prev_avg = float(metrics.get("average_consultation_time", 15.0))
    count = int(metrics.get("patients_seen_count", 0))

    # 3. Calculate Cumulative Moving Average (CMA)
    new_avg = ((prev_avg * count) + duration) / (count + 1)
    new_avg = round(new_avg, 1)

    # 4. Save updated metrics back into Redis
    pipe = r.pipeline()
    pipe.hset(patient_key, "status", "completed")
    pipe.hset(METRICS_KEY, "average_consultation_time", new_avg)
    pipe.hincrby(METRICS_KEY, "patients_seen_count", 1)
    pipe.execute()

    # 5. Broadcast new average globally so Screen 2 wait time shifts dynamically
    payload = {
        "event": "METRICS_UPDATED",
        "data": {
            "average_consultation_time": new_avg
        }
    }
    r.publish(CHANNEL_KEY, json.dumps(payload))
    return new_avg


def get_initial_queue():
    # Since decode_responses=True is active on initialization, 
    # we don't need any manual byte-to-string cleaning loop hacks here.
    patient_ids = r.lrange(QUEUE_KEY, 0, -1)

    if not patient_ids:
        return []

    pipe = r.pipeline()
    for patient_id in patient_ids:
        pipe.hgetall(f"patient:{patient_id}")
    
    raw_patients = pipe.execute()
    
    # Filter out empty entries if data anomalies exist
    queue = [p for p in raw_patients if p]
    payload = {
        "event": "INITIAL_QUEUE",
        "data": {
            "initial_queue": queue
        }
    }
    r.publish(CHANNEL_KEY, json.dumps(payload))

