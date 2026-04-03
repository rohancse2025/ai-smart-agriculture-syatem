import os
import json
import logging
import urllib.request
import urllib.error
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Use redirect_slashes=False so /weather and /weather/ both work without 307
router = APIRouter(redirect_slashes=False)

class WeatherResponse(BaseModel):
    temperature: float
    humidity: int
    wind_speed: float
    condition: str
    city: str
    farming_tip: str

def get_farming_tip(temp: float, humidity: int, condition: str) -> str:
    condition_lower = condition.lower()
    if "rain" in condition_lower or "shower" in condition_lower:
        return "Rain expected. Delay spraying fertilizers or pesticides, and ensure field drainage."
    elif "storm" in condition_lower or "thunder" in condition_lower:
        return "Thunderstorm detected. Secure tall crops, postpone spraying, and protect young plants."
    elif "wind" in condition_lower:
        return "Strong winds detected. Avoid spraying chemicals and support any tall or fragile crops."
    elif humidity > 80:
        return "High humidity detected. Watch out for fungal diseases; avoid overhead irrigation today."
    elif temp > 35:
        return "High temperatures. Ensure adequate soil moisture; water early morning or late evening."
    elif temp < 10:
        return "Low temperatures. Protect sensitive crops from frost and reduce irrigation frequency."
    else:
        return "Weather conditions are optimal. Continue standard farming practices."

@router.get("", response_model=WeatherResponse)
@router.get("/", response_model=WeatherResponse)
async def get_weather(lat: float = Query(30.9010), lon: float = Query(75.8573)):
    api_key = os.environ.get("OPENWEATHER_API_KEY", "").strip()

    if not api_key:
        logger.error("OPENWEATHER_API_KEY is missing or empty in environment")
        raise HTTPException(
            status_code=500,
            detail="OPENWEATHER_API_KEY is not set. Add it to backend/.env and restart the server."
        )

    logger.info(f"Fetching weather for lat={lat}, lon={lon} (key ends with ...{api_key[-4:]})")

    url = (
        f"https://api.openweathermap.org/data/2.5/weather"
        f"?lat={lat}&lon={lon}&appid={api_key}&units=metric"
    )

    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10) as response:
            raw = response.read().decode()
            data = json.loads(raw)

    except urllib.error.HTTPError as e:
        # Read the OWM error body so we can surface the exact reason
        error_body = ""
        try:
            error_body = e.read().decode()
            error_data = json.loads(error_body)
            detail = f"OpenWeatherMap error {e.code}: {error_data.get('message', error_body)}"
        except Exception:
            detail = f"OpenWeatherMap error {e.code}: {error_body or str(e)}"
        logger.error(detail)
        raise HTTPException(status_code=e.code if e.code < 600 else 502, detail=detail)

    except urllib.error.URLError as e:
        detail = f"Network error reaching OpenWeatherMap: {str(e.reason)}"
        logger.error(detail)
        raise HTTPException(status_code=502, detail=detail)

    except Exception as e:
        detail = f"Unexpected error: {str(e)}"
        logger.error(detail)
        raise HTTPException(status_code=500, detail=detail)

    temp       = data["main"]["temp"]
    humidity   = data["main"]["humidity"]
    wind_speed = data["wind"]["speed"]
    condition  = data["weather"][0]["description"].title()
    city       = data.get("name", "Unknown")

    tip = get_farming_tip(temp, humidity, condition)

    return WeatherResponse(
        temperature=temp,
        humidity=humidity,
        wind_speed=wind_speed,
        condition=condition,
        city=city,
        farming_tip=tip
    )
