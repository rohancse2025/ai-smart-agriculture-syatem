from fastapi import APIRouter, Form
from pydantic import BaseModel
import os
import logging
from dotenv import load_dotenv
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
from fastapi.responses import Response

load_dotenv()
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
  """
  Sends a standard SMS using Twilio.
  Normalizes Indian phone numbers to E.164 format (+91...).
  """
  if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
    return False, "Twilio credentials not configured"

  try:
    # Normalize phone: 9876543210 -> +919876543210
    clean_phone = phone.strip().replace(" ", "").replace("-", "")
    if not clean_phone.startswith("+"):
        if clean_phone.startswith("91") and len(clean_phone) == 12:
            clean_phone = "+" + clean_phone
        else:
            # Assume 10-digit Indian number
            if len(clean_phone) == 10:
                clean_phone = "+91" + clean_phone
            else:
                # Fallback: just prepend plus if missing
                clean_phone = "+" + clean_phone

    client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    msg = client.messages.create(
        body=message,
        from_=TWILIO_SMS_FROM,
        to=clean_phone
    )
    
    return True, f"Sent: {msg.sid}"

  except TwilioRestException as e:
    # Special handling for unverified numbers in Free Trial (code 21608)
    if e.code == 21608:
        logger.warning(f"Twilio Trial Error: {clean_phone} is unverified. Please verify this number in Twilio Console.")
        return False, f"Unverified number: {e.msg}"
    return False, str(e)
  except Exception as e:
    logger.error(f"Twilio General Error: {e}")
    return False, str(e)

def send_sms(to: str, message: str) -> bool:
  """Wrapper to maintain existing interface"""
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

@router.get("/test")
def test_sms(phone: str):
    success, detail = send_sms_twilio(phone, "KisanCore: This is a test message from your new Twilio SMS integration. It's working! 🌾")
    if success:
        return {"status": "success", "message": f"Test SMS sent to {phone}", "details": detail}
    else:
        return {"status": "error", "message": "Failed to send test SMS.", "reason": detail}
