import joblib
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import warnings

router = APIRouter()

MODEL_PATH = Path(__file__).resolve().parent.parent.parent.parent / "model.pkl"
model = None
if MODEL_PATH.exists():
    try:
        model = joblib.load(MODEL_PATH)
    except Exception as e:
        warnings.warn(f"Failed to load model.pkl: {e}")

class CropRequest(BaseModel):
    N: float = 0.0
    P: float = 0.0
    K: float = 0.0
    temperature: float
    humidity: float
    ph: float
    rainfall: float

def _build_features(N: float, P: float, K: float, temperature: float, humidity: float, ph: float, rainfall: float):
    if hasattr(model, "n_features_in_"):
        n = int(model.n_features_in_)
        if n == 4:
            return [temperature, humidity, ph, rainfall]
        if n == 7:
            return [N, P, K, temperature, humidity, ph, rainfall]
    return [N, P, K, temperature, humidity, ph, rainfall]

@router.get("")
def recommend_crop_get(temperature: float, humidity: float, ph: float, rainfall: float, N: float = 0.0, P: float = 0.0, K: float = 0.0):
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded on server")
    features = _build_features(N, P, K, temperature, humidity, ph, rainfall)
    prediction = model.predict([features])[0]
    return {"crop": prediction}

@router.post("")
def recommend_crop_post(payload: CropRequest):
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded on server")
    features = _build_features(payload.N, payload.P, payload.K, payload.temperature, payload.humidity, payload.ph, payload.rainfall)
    prediction = model.predict([features])[0]
    return {"crop": prediction}
