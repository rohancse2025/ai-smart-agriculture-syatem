from fastapi import APIRouter
import joblib
import numpy as np
from pathlib import Path

router = APIRouter()

MODEL_PATH = Path(__file__).resolve().parent.parent / "model.pkl"
model = joblib.load(MODEL_PATH) if MODEL_PATH.exists() else None

@router.post("/predict-crop")
def predict_crop(data: dict):
    if model is None:
        return {"error": "Model not loaded on server"}

    values = [
        float(data["N"]),
        float(data["P"]),
        float(data["K"]),
        float(data["temperature"]),
        float(data["humidity"]),
        float(data["ph"]),
        float(data["rainfall"]),
    ]

    prediction = model.predict([values])[0]

    return {"recommended_crop": prediction}