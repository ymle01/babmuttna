from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, List
import uvicorn
from services.weather_service import WeatherService
from services.ai_service import AIService
from services.ocr_service import ocr_service

app = FastAPI(
    title="AI 점심 메뉴 추천 API",
    description="날씨 기반 AI 점심 메뉴 추천 서비스",
    version="1.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 서비스 인스턴스
weather_service = WeatherService()
ai_service = AIService()

# Request 모델
class CafeteriaMenuRequest(BaseModel):
    location: str = "서울"
    cafeteria_menu: Optional[str] = None  # 구내식당 메뉴 (텍스트, 선택)
    image_data: Optional[str] = None  # Base64 인코딩된 이미지 (선택)
    user_location: Optional[Dict] = None  # 위도, 경도
    prefer_external: bool = True  # 외부식당 선호 (CAM 모드)
    daily_menus: Optional[List[Dict]] = None  # 오늘의 추천 메뉴 리스트 (중복 체크용)

@app.get("/")
async def root():
    return {
        "message": "AI 점심 메뉴 추천 API",
        "version": "1.0.0",
        "endpoints": {
            "weather": "/api/weather?location={location}",
            "recommend-from-cafeteria": "/api/recommend-from-cafeteria (POST)",
            "daily-recommendations": "/api/daily-recommendations (GET)",
            "daily-recommendations-refresh": "/api/daily-recommendations-refresh (POST)"
        }
    }

@app.get("/api/weather")
async def get_weather(location: str = "서울", lat: Optional[float] = None, lng: Optional[float] = None):
    """날씨 정보 조회 (좌표 우선, 없으면 location 사용)"""
    try:
        weather_data = await weather_service.get_weather(location, lat, lng)
        return {
            "success": True,
            "data": weather_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/recommend-from-cafeteria")
async def recommend_from_cafeteria(request: CafeteriaMenuRequest):
    """구내식당 메뉴 기반 외부 메뉴 추천 (텍스트 or 이미지 OCR)"""
    try:
        # 1. 날씨 정보 가져오기 (사용자 좌표가 있으면 우선 사용)
        lat = None
        lng = None
        if request.user_location:
            lat = request.user_location.get('latitude')
            lng = request.user_location.get('longitude')
            print(f"📍 사용자 좌표 사용: lat={lat}, lng={lng}")
        
        weather_data = await weather_service.get_weather(
            request.location,
            lat=lat,
            lng=lng
        )
        
        # 2. 메뉴 텍스트 결정 (이미지 OCR or 텍스트)
        menu_text = request.cafeteria_menu
        ocr_confidence = None
        
        if request.image_data:
            print("📸 이미지에서 메뉴 추출 중...")
            # OCR 서비스로 이미지 처리
            ocr_result = await ocr_service.extract_menu_from_image(
                request.image_data,
                fallback_text=request.cafeteria_menu  # 보조 텍스트
            )
            
            # OCR 결과 검증
            is_valid, error_msg = ocr_service.validate_menu_extraction(ocr_result)
            
            if not is_valid:
                raise HTTPException(status_code=400, detail=error_msg)
            
            menu_text = ocr_result["menu_text"]
            ocr_confidence = ocr_result["confidence"]
            print(f"✅ OCR 완료: {menu_text[:50]}... (신뢰도: {ocr_confidence})")
        
        elif not menu_text:
            raise HTTPException(
                status_code=400, 
                detail="메뉴 텍스트 또는 이미지를 제공해주세요."
            )
        
        # 3. AI 추천 생성 (CAM 모드 지원 + 오늘의 메뉴 중복 체크)
        recommendation = await ai_service.recommend_from_cafeteria_menu(
            weather_data,
            menu_text,
            request.user_location,
            request.prefer_external,  # CAM 모드 전달
            request.daily_menus  # 오늘의 메뉴 전달
        )
        
        # OCR 신뢰도 정보 추가
        if ocr_confidence:
            recommendation["ocr_confidence"] = ocr_confidence
            recommendation["extracted_menu"] = menu_text
        
        return {
            "success": True,
            "data": recommendation
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/daily-recommendations")
async def get_daily_recommendations(location: str = "서울", lat: Optional[float] = None, lng: Optional[float] = None):
    """오늘의 추천 메뉴 3개 조회 (위치 & 날씨 기반)"""
    try:
        # 1. 날씨 정보 가져오기 (좌표 우선)
        weather_data = await weather_service.get_weather(location, lat, lng)
        
        # 2. AI 오늘의 추천 메뉴 생성
        recommendations = await ai_service.get_daily_recommendations(weather_data, location)
        
        return {
            "success": True,
            "data": recommendations
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/daily-recommendations-refresh")
async def refresh_daily_recommendations(request: CafeteriaMenuRequest):
    """구내식당 메뉴와 연관 낮은 오늘의 메뉴 재생성"""
    try:
        # 1. 날씨 정보 가져오기
        lat = None
        lng = None
        if request.user_location:
            lat = request.user_location.get('latitude')
            lng = request.user_location.get('longitude')
        
        weather_data = await weather_service.get_weather(
            request.location,
            lat=lat,
            lng=lng
        )
        
        # 2. 구내식당 메뉴와 연관 낮은 오늘의 메뉴 생성
        recommendations = await ai_service.get_daily_recommendations_with_exclusion(
            weather_data,
            request.location,
            request.cafeteria_menu
        )
        
        return {
            "success": True,
            "data": recommendations
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """헬스 체크"""
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )

