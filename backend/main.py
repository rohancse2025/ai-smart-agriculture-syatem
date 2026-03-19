from pathlib import Path
import pickle
import random

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

with open("model.pkl", "rb") as f:
    model = pickle.load(f)


# ✅ ADD THIS CORS BLOCK
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------
# Model loading
# --------------------
MODEL_PATH = Path(__file__).resolve().parent / "model.pkl"
model = None
if MODEL_PATH.exists():
    # model.pkl may have been saved with joblib or pickle; try both.
    try:
        import joblib  # type: ignore

        model = joblib.load(MODEL_PATH)
    except Exception:
        with open(MODEL_PATH, "rb") as f:
            model = pickle.load(f)


# --------------------
# Routes
# --------------------
@app.get("/")
def read_root():
    return {"message": "Smart Agriculture API Running"}


@app.get("/sensor-data")
def get_sensor_data():
    return {
        "temperature": random.randint(20, 40),
        "humidity": random.randint(40, 90),
        "soil_moisture": random.randint(10, 80),
    }


def _build_features(temperature: float, humidity: float, ph: float, rainfall: float):
    """
    Build the feature vector expected by the trained model.

    You requested inputs: temperature, humidity, ph, rainfall.
    If the loaded model expects 7 features (N, P, K, temperature, humidity, ph, rainfall),
    we fill N/P/K with 0.0.
    """
    if hasattr(model, "n_features_in_"):
        n = int(model.n_features_in_)
        if n == 4:
            return [temperature, humidity, ph, rainfall]
        if n == 7:
            return [0.0, 0.0, 0.0, temperature, humidity, ph, rainfall]

    # Default to the 4-feature order you requested.
    return [temperature, humidity, ph, rainfall]


@app.get("/recommend-crop")
def recommend_crop_get(temperature: float, humidity: float, ph: float, rainfall: float):
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded on server")

    features = _build_features(temperature, humidity, ph, rainfall)
    prediction = model.predict([features])[0]
    return {"crop": prediction}


@app.post("/recommend-crop")
def recommend_crop_post(payload: dict):
    """
    Expects JSON body:
    {
        "temperature": 25.0,
        "humidity": 80.0,
        "ph": 6.5,
        "rainfall": 200.0
    }
    """
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded on server")

    try:
        temperature = float(payload["temperature"])
        humidity = float(payload["humidity"])
        ph = float(payload["ph"])
        rainfall = float(payload["rainfall"])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid input: {e}")

    features = _build_features(temperature, humidity, ph, rainfall)
    prediction = model.predict([features])[0]
    return {"crop": prediction}