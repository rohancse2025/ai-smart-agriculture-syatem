import os
import json
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from groq import Groq
from app.core.settings import settings

load_dotenv()
logger = logging.getLogger(__name__)

# Simple in-memory cache to prevent redundant Groq calls
RECOMMENDATION_CACHE = {}

router = APIRouter(redirect_slashes=False)

class CropInput(BaseModel):
    nitrogen: float
    phosphorus: float
    potassium: float
    temperature: float
    humidity: float
    ph: float
    rainfall: float

class CropResult(BaseModel):
    name: str
    emoji: str
    reason: str
    water_needed: str
    best_season: str
    profit_potential: str  # Low / Medium / High

class CropRecommendationResponse(BaseModel):
    crops: list[CropResult]

SYSTEM_PROMPT = """You are an expert agricultural scientist for Indian farmers.
Given soil and climate parameters, recommend exactly 3 suitable crops.

Return ONLY a valid JSON array with exactly 3 objects. No markdown, no explanation, no extra text.
Use English only for all text values (name, reason, water_needed, etc.).

Each object must have these exact keys:
- name: crop name (string)
- emoji: a single relevant emoji (string)
- reason: 1 sentence why this crop suits the given parameters (string)
- water_needed: e.g. "Low (200-400mm)", "Medium (500-800mm)", "High (900mm+)" (string)
- best_season: e.g. "Kharif (June-Oct)", "Rabi (Nov-Apr)", "Zaid (Mar-Jun)" (string)
- profit_potential: exactly one of "Low", "Medium", "High" (string)

Example output format:
[
  {"name": "Rice", "emoji": "🌾", "reason": "...", "water_needed": "High (900mm+)", "best_season": "Kharif (June-Oct)", "profit_potential": "Medium"},
  {"name": "Wheat", "emoji": "🌿", "reason": "...", "water_needed": "Medium (450-650mm)", "best_season": "Rabi (Nov-Apr)", "profit_potential": "High"},
  {"name": "Maize", "emoji": "🌽", "reason": "...", "water_needed": "Medium (500-800mm)", "best_season": "Kharif (June-Oct)", "profit_potential": "Medium"}
]"""

@router.post("", response_model=CropRecommendationResponse)
@router.post("/", response_model=CropRecommendationResponse)
async def recommend_crops(data: CropInput):
    api_key = settings.groq_api_key
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not set in settings")
    
    # Check cache first (using a simple key based on inputs)
    cache_key = f"{data.nitrogen}_{data.phosphorus}_{data.potassium}_{round(data.temperature,1)}_{round(data.humidity,1)}_{data.ph}_{data.rainfall}"
    if cache_key in RECOMMENDATION_CACHE:
        logger.info("Returning cached crop recommendation")
        return CropRecommendationResponse(crops=RECOMMENDATION_CACHE[cache_key])

    user_message = (
        f"Soil and climate parameters:\n"
        f"- Nitrogen (N): {data.nitrogen} mg/kg\n"
        f"- Phosphorus (P): {data.phosphorus} mg/kg\n"
        f"- Potassium (K): {data.potassium} mg/kg\n"
        f"- Temperature: {data.temperature}°C\n"
        f"- Humidity: {data.humidity}%\n"
        f"- Soil pH: {data.ph}\n"
        f"- Rainfall: {data.rainfall} mm/year\n\n"
        f"Recommend the top 3 most suitable crops as a JSON array."
    )
    
    try:
        client = Groq(api_key=api_key)
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message}
            ],
            max_tokens=500,  # Reduced from 800 to 500 to save tokens
            temperature=0.3
        )
        
        raw = response.choices[0].message.content.strip()
        
        # Strip any accidental markdown code fences
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()
        
        crops_data = json.loads(raw)
        
        if not isinstance(crops_data, list) or len(crops_data) < 3:
            raise ValueError("Expected a JSON array of at least 3 crops")
        
        crops = [CropResult(**c) for c in crops_data[:3]]
        
        # Save to cache before returning
        RECOMMENDATION_CACHE[cache_key] = crops
        return CropRecommendationResponse(crops=crops)
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Groq response as JSON: {e}\nRaw: {raw}")
        raise HTTPException(status_code=500, detail="AI returned invalid JSON. Please try again.")
    except Exception as e:
        logger.error(f"Crop recommendation error: {e}")
        error_str = str(e)
        if "rate_limit_exceeded" in error_str.lower() or "429" in error_str:
            raise HTTPException(status_code=429, detail="AI Rate Limit Reached. Please try again in a few minutes.")
        raise HTTPException(status_code=500, detail=str(e))
