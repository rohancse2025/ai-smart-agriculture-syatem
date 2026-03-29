from fastapi import APIRouter

from app.api.routes import health, sensor, crop, irrigation, chat, weather, crops_ai, market, iot

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"], prefix="/health")
api_router.include_router(sensor.router, tags=["sensor"], prefix="/sensor-data")
api_router.include_router(crop.router, tags=["crop"], prefix="/recommend-crop")
api_router.include_router(irrigation.router, tags=["irrigation"], prefix="/irrigation-suggestion")
api_router.include_router(chat.router, tags=["chat"], prefix="/chat")
api_router.include_router(weather.router, tags=["weather"], prefix="/weather")
api_router.include_router(crops_ai.router, tags=["crops-ai"], prefix="/crops")
api_router.include_router(market.router, tags=["market"], prefix="/market-prices")
api_router.include_router(iot.router, tags=["iot"], prefix="/iot")
