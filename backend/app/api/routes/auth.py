from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
import bcrypt
from jose import jwt
import datetime
from app.database import get_db, Farmer, FarmerHistory
from sqlalchemy.orm import Session

router = APIRouter()
SECRET_KEY = "kisancore-secret-key-2024"
ALGORITHM = "HS256"

class RegisterRequest(BaseModel):
  name: str
  phone: str
  password: str
  location: str = ""
  farm_size: float = 0.0

class LoginRequest(BaseModel):
  phone: str
  password: str

class UpdateProfileRequest(BaseModel):
  name: str = ""
  location: str = ""
  farm_size: float = 0.0
  farm_size_unit: str = "acres"
  soil_type: str = ""
  primary_crop: str = ""
  irrigation_type: str = ""
  soil_ph: float = 6.5
  nitrogen: float = 50.0
  potassium: float = 40.0
  sms_alerts_enabled: str = "false"
  sms_phone: str = ""

def create_token(phone: str):
  expire = datetime.datetime.utcnow() + datetime.timedelta(days=30)
  return jwt.encode(
    {"sub": phone, "exp": expire}, 
    SECRET_KEY, algorithm=ALGORITHM)

@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
  existing = db.query(Farmer).filter(Farmer.phone == req.phone).first()
  if existing:
    raise HTTPException(400, detail="Phone already registered")
  hashed_pw = bcrypt.hashpw(req.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
  farmer = Farmer(
    name=req.name, phone=req.phone,
    password_hash=hashed_pw,
    location=req.location,
    farm_size=req.farm_size)
  db.add(farmer)
  db.commit()
  db.refresh(farmer)
  return {"token": create_token(req.phone),
    "farmer": {"name": farmer.name,
    "phone": farmer.phone,
    "location": farmer.location}}

@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
  farmer = db.query(Farmer).filter(Farmer.phone == req.phone).first()
  if not farmer:
    raise HTTPException(401, detail="Wrong phone or password")
  
  is_valid = bcrypt.checkpw(req.password.encode('utf-8'), farmer.password_hash.encode('utf-8'))
  if not is_valid:
    raise HTTPException(401, detail="Wrong phone or password")
    
  return {"token": create_token(req.phone),
    "farmer": {"name": farmer.name,
    "phone": farmer.phone,
    "location": farmer.location,
    "soil_ph": farmer.soil_ph,
    "nitrogen": farmer.nitrogen,
    "farm_size": farmer.farm_size}}

@router.get("/profile")
def get_profile(phone: str, db: Session = Depends(get_db)):
  farmer = db.query(Farmer).filter(Farmer.phone == phone).first()
  if not farmer:
    raise HTTPException(404)
  return farmer

@router.put("/profile")
def update_profile(phone: str, req: UpdateProfileRequest, db: Session = Depends(get_db)):
  farmer = db.query(Farmer).filter(Farmer.phone == phone).first()
  if not farmer:
    raise HTTPException(404)
  
  if req.name: farmer.name = req.name
  farmer.location = req.location
  farmer.farm_size = req.farm_size
  farmer.farm_size_unit = req.farm_size_unit
  farmer.soil_type = req.soil_type
  farmer.primary_crop = req.primary_crop
  farmer.irrigation_type = req.irrigation_type
  farmer.soil_ph = req.soil_ph
  farmer.nitrogen = req.nitrogen
  farmer.potassium = req.potassium
  farmer.sms_alerts_enabled = req.sms_alerts_enabled
  farmer.sms_phone = req.sms_phone
  
  db.commit()
  db.refresh(farmer)
  return {"status": "updated", "farmer": farmer}

@router.post("/history")
def save_history(farmer_id: int, type: str, data: str, db: Session = Depends(get_db)):
  history = FarmerHistory(farmer_id=farmer_id, type=type, data=data)
  db.add(history)
  db.commit()
  return {"status": "saved"}

@router.get("/history/{farmer_id}")
def get_history(farmer_id: int, db: Session = Depends(get_db)):
  return db.query(FarmerHistory).filter(
    FarmerHistory.farmer_id == farmer_id
  ).order_by(FarmerHistory.created_at.desc()
  ).limit(20).all()

@router.get("/farmer/{farmer_id}/crops")
def get_farmer_crops(farmer_id: int, 
  db: Session = Depends(get_db)):
  from app.database import CropRecord
  return db.query(CropRecord).filter(
    CropRecord.farmer_id == farmer_id,
    CropRecord.status == "growing"
  ).all()

@router.post("/farmer/{farmer_id}/crops")
def add_crop(farmer_id: int, crop_name: str,
  planted_date: str, field_size: float = 0.0,
  db: Session = Depends(get_db)):
  from app.database import CropRecord
  import datetime
  planted = datetime.datetime.strptime(
    planted_date, "%Y-%m-%d")
  harvest = planted + datetime.timedelta(days=120)
  crop = CropRecord(
    farmer_id=farmer_id,
    crop_name=crop_name,
    planted_date=planted_date,
    expected_harvest=harvest.strftime("%Y-%m-%d"),
    field_size=field_size,
    status="growing"
  )
  db.add(crop)
  db.commit()
  return {"status": "added", "crop": crop_name}

@router.delete("/farmer/crops/{crop_id}")
def remove_crop(crop_id: int, 
  db: Session = Depends(get_db)):
  from app.database import CropRecord
  crop = db.query(CropRecord).filter(
    CropRecord.id == crop_id).first()
  if crop:
    crop.status = "harvested"
    db.commit()
  return {"status": "removed"}

@router.put("/farmer/{farmer_id}/stats")
def update_stats(farmer_id: int,
  scan_done: bool = False,
  chat_done: bool = False,
  db: Session = Depends(get_db)):
  farmer = db.query(Farmer).filter(
    Farmer.id == farmer_id).first()
  if farmer:
    if scan_done: farmer.total_scans += 1
    if chat_done: farmer.total_chats += 1
    db.commit()
  return {"status": "updated"}
