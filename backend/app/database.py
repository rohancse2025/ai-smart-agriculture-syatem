from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import datetime

SQLALCHEMY_DATABASE_URL = "sqlite:///./kisancore.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Farmer(Base):
  __tablename__ = "farmers"
  id = Column(Integer, primary_key=True, index=True)
  name = Column(String, nullable=False)
  phone = Column(String, unique=True, index=True)
  password_hash = Column(String, nullable=False)
  location = Column(String, default="")
  farm_size = Column(Float, default=0.0)
  soil_ph = Column(Float, default=6.5)
  nitrogen = Column(Float, default=50.0)
  potassium = Column(Float, default=40.0)
  farm_size_unit = Column(String, default="acres")
  soil_type = Column(String, default="")
  primary_crop = Column(String, default="")
  irrigation_type = Column(String, default="")
  active_crops = Column(Text, default="[]")
  last_scan_result = Column(Text, default="")
  total_scans = Column(Integer, default=0)
  total_chats = Column(Integer, default=0)
  sms_alerts_enabled = Column(String, default="false")
  sms_phone = Column(String, default="")
  created_at = Column(DateTime, default=datetime.datetime.utcnow)

class CropRecord(Base):
  __tablename__ = "crop_records"
  id = Column(Integer, primary_key=True)
  farmer_id = Column(Integer)
  crop_name = Column(String)
  planted_date = Column(String)
  expected_harvest = Column(String)
  field_size = Column(Float, default=0.0)
  status = Column(String, default="growing")
  notes = Column(Text, default="")
  created_at = Column(DateTime, default=datetime.datetime.utcnow)

class FarmerHistory(Base):
  __tablename__ = "farmer_history"
  id = Column(Integer, primary_key=True)
  farmer_id = Column(Integer)
  type = Column(String)  
  data = Column(Text)
  created_at = Column(DateTime, default=datetime.datetime.utcnow)

Base.metadata.create_all(bind=engine)

def get_db():
  db = SessionLocal()
  try:
    yield db
  finally:
    db.close()
