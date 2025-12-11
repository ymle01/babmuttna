import httpx
from typing import Dict, Optional
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

class WeatherService:
    def __init__(self):
        # Open-Meteo는 API 키가 필요 없습니다!
        self.base_url = "https://api.open-meteo.com/v1/forecast"
        print("✅ Open-Meteo 날씨 서비스 초기화 (무료, 빠른 응답)")
    
    def get_location_coords(self, location: str) -> tuple:
        """한국 주요 도시 좌표 (위도, 경도)"""
        location_coords = {
            "서울": (37.5665, 126.9780),
            "강남": (37.4979, 127.0276),
            "여의도": (37.5219, 126.9245),
            "판교": (37.3944, 127.1109),
            "부산": (35.1796, 129.0756),
            "대구": (35.8714, 128.6014),
            "인천": (37.4563, 126.7052),
            "광주": (35.1595, 126.8526),
            "대전": (36.3504, 127.3845),
            "울산": (35.5384, 129.3114),
            "세종": (36.4800, 127.2890),
            "수원": (37.2636, 127.0286),
            "창원": (35.2272, 128.6811),
            "고양": (37.6584, 126.8320),
            "용인": (37.2411, 127.1776),
        }
        return location_coords.get(location, (37.5665, 126.9780))  # 기본값: 서울
    
    async def get_weather(self, location: str = "서울", lat: float = None, lng: float = None) -> Dict:
        """Open-Meteo API로 날씨 정보 조회 (무료, 빠름)"""
        try:
            # 좌표가 제공되면 우선 사용, 없으면 location으로 좌표 찾기
            if lat is not None and lng is not None:
                print(f"📍 사용자 제공 좌표 사용: {lat}, {lng} ({location})")
                latitude, longitude = lat, lng
            else:
                print(f"📍 location 기반 좌표 사용: {location}")
                latitude, longitude = self.get_location_coords(location)
            
            params = {
                "latitude": latitude,
                "longitude": longitude,
                "current": "temperature_2m,relative_humidity_2m,weather_code,precipitation,cloud_cover",
                "timezone": "Asia/Seoul"
            }
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(self.base_url, params=params)
                
                if response.status_code == 200:
                    data = response.json()
                    current = data.get("current", {})
                    
                    # 날씨 코드를 한국어로 변환
                    weather_code = current.get("weather_code", 0)
                    sky_condition = self._weather_code_to_condition(weather_code)
                    
                    # 강수 여부 확인
                    precipitation = current.get("precipitation", 0)
                    precipitation_str = "비" if precipitation > 0 else "없음"
                    
                    weather_data = {
                        "location": location,
                        "temperature": round(current.get("temperature_2m", 20), 1),
                        "sky_condition": sky_condition,
                        "precipitation": precipitation_str,
                        "humidity": int(current.get("relative_humidity_2m", 50)),
                    }
                    
                    print(f"✅ Open-Meteo 날씨 조회 성공: {weather_data}")
                    return weather_data
                else:
                    print(f"⚠️ Open-Meteo API 오류: {response.status_code}")
                    return self._get_dummy_weather(location)
                    
        except Exception as e:
            print(f"⚠️ 날씨 API 오류: {e}")
            return self._get_dummy_weather(location)
    
    def _weather_code_to_condition(self, code: int) -> str:
        """WMO Weather Code를 한국어 날씨 상태로 변환"""
        # WMO Weather interpretation codes
        if code == 0:
            return "맑음"
        elif code in [1, 2]:
            return "구름많음"
        elif code == 3:
            return "흐림"
        elif code in [45, 48]:
            return "안개"
        elif code in [51, 53, 55, 56, 57]:
            return "이슬비"
        elif code in [61, 63, 65, 66, 67]:
            return "비"
        elif code in [71, 73, 75, 77]:
            return "눈"
        elif code in [80, 81, 82]:
            return "소나기"
        elif code in [85, 86]:
            return "눈"
        elif code in [95, 96, 99]:
            return "뇌우"
        else:
            return "맑음"
    
    def _get_dummy_weather(self, location: str) -> Dict:
        """테스트용 더미 날씨 데이터"""
        print(f"🌤️ 더미 날씨 데이터 사용 ({location})")
        
        import random
        
        now = datetime.now()
        hour = now.hour
        
        # 시간대별 현실적인 날씨
        if 6 <= hour < 12:  # 아침
            temp = random.uniform(15, 25)
            sky = random.choice(["맑음", "구름많음"])
        elif 12 <= hour < 18:  # 오후
            temp = random.uniform(20, 30)
            sky = random.choice(["맑음", "구름많음", "흐림"])
        elif 18 <= hour < 22:  # 저녁
            temp = random.uniform(18, 28)
            sky = random.choice(["맑음", "구름많음"])
        else:  # 밤
            temp = random.uniform(12, 22)
            sky = random.choice(["맑음", "구름많음", "흐림"])
        
        return {
            "location": location,
            "temperature": round(temp, 1),
            "sky_condition": sky,
            "precipitation": "없음",
            "humidity": random.randint(40, 80),
            "note": "Open-Meteo API 응답 없음 - 더미 데이터"
        }
