import os
import json
import numpy as np
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.utils import to_categorical
from sklearn.model_selection import train_test_split

# 1. Configuration
DATA_DIR = "./data/dataset"
MODEL_SAVE_PATH = "./asl_model.h5"
LABELS_SAVE_PATH = "./labels.json"

# ==============================================================================
# 🧠 THE NORMALIZATION ALGORITHM (Train on Shapes, Not Screen Positions)
# ==============================================================================
def normalize_landmarks(sequence):
    normalized_seq = []
    for frame in sequence:
        landmarks = np.array(frame).reshape(21, 3)
        
        # 1. Translation: Make the wrist (index 0) the origin
        base_x, base_y, base_z = landmarks[0]
        translated_landmarks = landmarks - np.array([base_x, base_y, base_z])
        
        # 2. Scaling: Normalize the size of the hand
        max_value = np.max(np.abs(translated_landmarks))
        if max_value > 0:
            scaled_landmarks = translated_landmarks / max_value
        else:
            scaled_landmarks = translated_landmarks
            
        normalized_seq.append(scaled_landmarks.flatten())
    return np.array(normalized_seq)
# ==============================================================================

def load_data():
    sequences, labels = [], []
    
    if not os.path.exists(DATA_DIR):
        print(f"Error: Could not find directory {DATA_DIR}")
        return None, None

    # Read every JSON file in the dataset folder
    for filename in os.listdir(DATA_DIR):
        if filename.endswith(".json"):
            filepath = os.path.join(DATA_DIR, filename)
            with open(filepath, 'r') as f:
                data = json.load(f)
                
                # 🚨 APPLY NORMALIZATION TO THE RAW DATA HERE 🚨
                raw_sequence = data["sequence"]
                normalized_sequence = normalize_landmarks(raw_sequence)
                
                sequences.append(normalized_sequence)
                labels.append(data["label"])
                
    return np.array(sequences), np.array(labels)

def train_model():
    print("Loading data...")
    X, y_raw = load_data()
    
    if X is None or len(X) == 0:
        print("No data found! Please record some signs first.")
        return

    print(f"Loaded {len(X)} sequences.")
    print(f"Feature shape: {X.shape}") 

    # 2. Preprocess Labels
    unique_labels = sorted(list(set(y_raw)))
    label_map = {label: num for num, label in enumerate(unique_labels)}
    
    with open(LABELS_SAVE_PATH, 'w') as f:
        json.dump(label_map, f)
        
    y_encoded = np.array([label_map[label] for label in y_raw])
    y_categorical = to_categorical(y_encoded).astype(int)

    # 3. Split into Training and Testing Sets
    X_train, X_test, y_train, y_test = train_test_split(X, y_categorical, test_size=0.2, random_state=42)

    # 4. Build the LSTM Architecture
    print("\nBuilding model...")
    model = Sequential([
        LSTM(64, return_sequences=True, activation='relu', input_shape=(30, 63)),
        LSTM(128, return_sequences=True, activation='relu'),
        LSTM(64, return_sequences=False, activation='relu'),
        Dense(64, activation='relu'),
        Dense(32, activation='relu'),
        Dense(len(unique_labels), activation='softmax') 
    ])

    model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['categorical_accuracy'])
    model.summary()

    # 5. Train the Model
    print("\nStarting training...")
    model.fit(X_train, y_train, epochs=150, batch_size=8, validation_data=(X_test, y_test))

    # 6. Save the final weights
    model.save(MODEL_SAVE_PATH)
    print(f"\n✅ Training Complete! Model saved to {MODEL_SAVE_PATH}")
    print(f"✅ Label map saved to {LABELS_SAVE_PATH}")

if __name__ == "__main__":
    train_model()