import json
import numpy as np
import socketio
from fastapi import FastAPI
from tensorflow.keras.models import load_model
import uvicorn
import os

print("🧠 Loading AI Model into Memory...")
# Load the brain we just trained
model = load_model('asl_model.h5')

print(f"🔍 AI BRAIN CAPACITY: {model.output_shape}")

# Load the dictionary so the backend knows that '0' means 'hello'
with open('labels.json', 'r') as f:
    label_map = json.load(f)
reverse_label_map = {v: k for k, v in label_map.items()}

# Setup the Server & WebSockets
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
app = FastAPI()
socket_app = socketio.ASGIApp(sio, app)

# Memory banks
user_memory = {}
frame_counters = {} # Added to track frame rhythm


# ==============================================================================
# 🧠 THE NORMALIZATION ALGORITHM
# This makes the AI scale and position invariant!
# ==============================================================================
def normalize_landmarks(sequence):
    """
    Takes a sequence of 30 frames (each with 63 features) and normalizes them.
    Makes the wrist (0,0,0) and scales the hand size between 0 and 1.
    """
    normalized_seq = []
    
    for frame in sequence:
        # Reshape the flat 63 array back to 21 landmarks (x, y, z)
        landmarks = np.array(frame).reshape(21, 3)
        
        # 1. Translation: Make the wrist (index 0) the origin
        base_x, base_y, base_z = landmarks[0]
        translated_landmarks = landmarks - np.array([base_x, base_y, base_z])
        
        # 2. Scaling: Find the max distance from the wrist and divide by it
        max_value = np.max(np.abs(translated_landmarks))
        if max_value > 0:
            scaled_landmarks = translated_landmarks / max_value
        else:
            scaled_landmarks = translated_landmarks
            
        # Flatten back to 63 features
        normalized_seq.append(scaled_landmarks.flatten())
        
    return np.array(normalized_seq)
# ==============================================================================


@sio.event
async def connect(sid, environ):
    print(f"🟢 User Connected! ID: {sid}")
    user_memory[sid] = []
    frame_counters[sid] = 0

@sio.event
async def disconnect(sid):
    print(f"🔴 User Disconnected! ID: {sid}")
    if sid in user_memory:
        del user_memory[sid]
    if sid in frame_counters:
        del frame_counters[sid]

@sio.event
async def process_landmarks(sid, data):
    """
    This function catches the 63 numbers sent from the frontend webcam.
    """
    user_memory[sid].append(data)
    frame_counters[sid] += 1
    
    # 🚨 DEBUG 1: Prove the data is arriving from the frontend
    if frame_counters[sid] % 15 == 0:
        print(f"📡 Receiving live frames... Buffer size: {len(user_memory[sid])}")

    # Keep only the last 30 frames
    if len(user_memory[sid]) > 30:
        user_memory[sid].pop(0)
        
    # OPTIMIZATION: Only run the heavy AI math every 5 frames to kill the lag
    if len(user_memory[sid]) == 30 and frame_counters[sid] % 5 == 0:
        sequence_array = np.array(user_memory[sid])
        
        # 🚨 APPLY NORMALIZATION BEFORE PREDICTING 🚨
        normalized_sequence = normalize_landmarks(sequence_array)
        
        # Use the normalized data for the prediction input
        prediction_input = np.expand_dims(normalized_sequence, axis=0)
        
        # OPTIMIZATION: model() is up to 10x faster than model.predict() in real-time loops
        predictions = model(prediction_input, training=False)[0]
        predictions_np = predictions.numpy() if hasattr(predictions, 'numpy') else predictions
        
        predicted_class_id = int(np.argmax(predictions_np))
        confidence = float(predictions_np[predicted_class_id])
        word = reverse_label_map[predicted_class_id]
        
        # 🚨 DEBUG 2: Print EVERYTHING the AI thinks, regardless of strictness
        print(f"🧠 AI Thinks: {word.upper()} (Score: {confidence:.2f})")
        
        # If the AI is more than 85% sure, send the translation back
        if confidence > 0.85:
            print(f"🎯 CONFIDENT HIT: {word.upper()}! Sending to UI...")
            await sio.emit('prediction', {'word': word, 'confidence': confidence}, to=sid)
            
            # Wipe the memory so it doesn't stutter the same word
            user_memory[sid] = []

# ==============================================================================
# 🚀 CLOUD DEPLOYMENT BLOCK
# ==============================================================================
if __name__ == '__main__':
    # Grab the port assigned by Render/Hugging Face, or default to 8080 locally
    port = int(os.environ.get("PORT", 8080))
    print(f"🚀 Starting SignSync Neural Engine on port {port}...")
    
    # Bind to 0.0.0.0 so the external internet can reach it
    uvicorn.run(socket_app, host="0.0.0.0", port=port)