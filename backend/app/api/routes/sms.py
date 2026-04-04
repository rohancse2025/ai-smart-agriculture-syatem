from fastapi import APIRouter, Form
from pydantic import BaseModel
import os
import logging
from dotenv import load_dotenv
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
from fastapi.responses import Response

from pathlib import Path
load_dotenv() # Fallback
# Explicitly load from backend/.env if possible
env_path = Path(__file__).resolve().parent.parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

router = APIRouter()

# Twilio Config
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_SMS_FROM = os.getenv("TWILIO_SMS_FROM", "")

logger = logging.getLogger(__name__)

class SMSRequest(BaseModel):
  to_phone: str
  message_type: str
  data: dict

def send_sms_twilio(phone: str, message: str) -> tuple[bool, str]:
  account_sid = os.getenv("TWILIO_ACCOUNT_SID")
  auth_token = os.getenv("TWILIO_AUTH_TOKEN")
  from_number = os.getenv("TWILIO_SMS_FROM")
  
  if not account_sid or not auth_token or not from_number:
    # Diagnostic print if fails (visible in uvicorn logs)
    return False, "Twilio credentials not configured in .env"
  
  # Normalize Indian phone number
  clean = phone.replace("+", "").replace(" ", "").replace("-", "")
  if clean.startswith("91") and len(clean) == 12:
    clean = clean  # already has country code
  elif len(clean) == 10:
    clean = "91" + clean
  to_number = "+" + clean
  
  try:
    client = Client(account_sid, auth_token)
    msg = client.messages.create(body=message, from_=from_number, to=to_number)
    return True, f"Sent: {msg.sid}"
  except TwilioRestException as e:
    if "unverified" in str(e).lower():
      return False, "Phone not verified in Twilio trial. Add it at twilio.com/console"
    return False, str(e)
  except Exception as e:
    return False, str(e)

def send_sms(to: str, message: str) -> bool:
  success, _ = send_sms_twilio(to, message)
  return success

@router.post("/send")
@router.post("/sms/send")  # Support both paths
def send_alert(req: SMSRequest):
  msg = ""
  
  if req.message_type == "irrigation":
    soil = req.data.get("soil_moisture", 0)
    temp = req.data.get("temperature", 0)
    if soil < 30:
      msg = (f"KisanCore ALERT: Your farm soil "
        f"moisture is {soil}% - Too DRY! "
        f"Please irrigate crops immediately. "
        f"Temp: {temp}C. -KisanCore AI")
    elif soil > 70:
      msg = (f"KisanCore ALERT: Soil moisture "
        f"is {soil}% - Too WET! "
        f"Stop irrigation, check drainage. "
        f"-KisanCore AI")
    else:
      msg = (f"KisanCore: Farm update - "
        f"Soil moisture {soil}%, Temp {temp}C. "
        f"Conditions are optimal today. "
        f"-KisanCore AI")
        
  elif req.message_type == "crop":
    crop = req.data.get("crop", "Unknown")
    confidence = req.data.get("confidence", 0)
    msg = (f"KisanCore Crop Advice: Based on "
      f"your soil data, best crop to grow is "
      f"{crop} ({confidence}% match). "
      f"Visit app for full details. "
      f"-KisanCore AI")
      
  elif req.message_type == "market":
    commodity = req.data.get("commodity", "")
    price = req.data.get("price", 0)
    trend = req.data.get("trend", "stable")
    msg = (f"KisanCore Market: {commodity} "
      f"price today Rs.{price}/quintal "
      f"({trend}). Check market page for "
      f"all mandi prices. -KisanCore AI")
      
  elif req.message_type == "weather":
    temp = req.data.get("temperature", 0)
    condition = req.data.get("condition", "")
    tip = req.data.get("tip", "")
    msg = (f"KisanCore Weather: Today {temp}C "
      f"{condition}. Tip: {tip} "
      f"-KisanCore AI")
      
  elif req.message_type == "disease":
    disease = req.data.get("disease", "")
    treatment = req.data.get("treatment", "")
    msg = (f"KisanCore Disease Alert: "
      f"{disease} detected on your crop. "
      f"Treatment: {treatment} "
      f"-KisanCore AI")

  if not msg:
    return {"status": "error", "message": "Unknown message type"}
    
  success = send_sms(req.to_phone, msg)
  return {"status": "sent" if success else "failed"}

@router.post("/daily-summary")
def daily_summary(phone: str, 
  temperature: float, humidity: float,
  soil_moisture: float, top_crop: str):
  msg = (
    f"KisanCore Daily Summary:\n"
    f"Farm: Temp {temperature}C, "
    f"Humidity {humidity}%\n"
    f"Soil: {soil_moisture}% moisture\n"
    f"Best crop: {top_crop}\n"
    f"Irrigation: "
    f"{'ON - Irrigate now' if soil_moisture < 30 else 'OFF - OK'}\n"
    f"-KisanCore AI")
  success = send_sms(phone, msg)
  return {"status": "sent" if success else "failed"}

@router.post("/webhook")
async def handle_incoming_sms(From: str = Form(...), Body: str = Form(...)):
    # Import iot dynamically to avoid circular imports
    import app.api.routes.iot as iot
    import time
    
    text = Body.strip().upper()
    response_msg = ""
    
    if text.startswith("PUMP ON"):
        duration = 60
        parts = text.split()
        if len(parts) > 2 and parts[2].isdigit():
            duration = int(parts[2])
            
        iot.latest_reading["manual_override"] = "ON"
        iot.latest_reading["override_expiry_time"] = time.time() + (duration * 60)
        response_msg = f"KisanCore: Pump activated manually for {duration} mins."
        
    elif text == "PUMP OFF":
        iot.latest_reading["manual_override"] = "OFF"
        iot.latest_reading["override_expiry_time"] = time.time() + 86400
        response_msg = "KisanCore: Pump turned OFF manually."
        
    elif text == "AUTO":
        iot.latest_reading["manual_override"] = None
        iot.latest_reading["override_expiry_time"] = 0
        response_msg = "KisanCore: Pump restored to Autonomous AI Mode."
        
    elif text == "STATUS":
        temp = iot.latest_reading.get("temperature", "--")
        hum = iot.latest_reading.get("humidity", "--")
        soil = iot.latest_reading.get("soil_moisture", "--")
        mode = iot.latest_reading.get("manual_override", "AUTO")
        if mode is None: mode = "AUTO"
        response_msg = f"Farm Status: Temp {temp}C, Air Humidity {hum}%, Soil Moisture {soil}%. Mode: {mode}. -KisanCore AI"
        
    else:
        response_msg = "Command not recognized. Valid commands: PUMP ON [mins], PUMP OFF, AUTO, STATUS."

    # Return TwiML XML response for Twilio
    xml_response = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>{response_msg}</Message>
</Response>"""
    
    return Response(content=xml_response, media_type="application/xml")

@router.get("/status")
def sms_status():
    """Check if Twilio credentials are configured"""
    sid = os.getenv("TWILIO_ACCOUNT_SID", "")
    token = os.getenv("TWILIO_AUTH_TOKEN", "")  
    from_num = os.getenv("TWILIO_SMS_FROM", "")
    
    configured = bool(sid and token and from_num and 
                      not sid.startswith("ACxx") and 
                      token != "your_auth_token_here")
    
    return {
        "configured": configured,
        "sid_set": bool(sid and not sid.startswith("ACxx")),
        "token_set": bool(token and token != "your_auth_token_here"),
        "from_number": from_num if from_num else "NOT SET",
        "instructions": "Fill TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SMS_FROM in backend/.env" if not configured else "Ready to send SMS"
    }

@router.get("/test")
def test_sms(phone: str):
    # First check config
    sid = os.getenv("TWILIO_ACCOUNT_SID", "")
    if not sid or sid.startswith("ACxx"):
        return {
            "status": "not_configured",
            "message": "Twilio not set up yet",
            "fix": "1. Go to twilio.com → sign up free\n2. Get Account SID and Auth Token from dashboard\n3. Get a free phone number\n4. Add all 3 to backend/.env\n5. Add your phone to Twilio verified callers\n6. Restart uvicorn server"
        }
    success, detail = send_sms_twilio(phone, "KisanCore: SMS test successful! Your alerts are working. 🌾 -KisanCore AI")
    return {
        "status": "success" if success else "error",
        "message": f"SMS sent to {phone}" if success else "SMS failed",
        "detail": detail,
        "fix": None if success else "Check that your phone number is verified in Twilio console (trial accounts can only send to verified numbers)"
    }
