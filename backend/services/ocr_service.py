"""
OCR Service
식단표 이미지에서 메뉴 텍스트를 추출하는 서비스
"""

import google.generativeai as genai
import base64
import re
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()


class OCRService:
    """Gemini Vision API를 사용한 식단표 이미지 처리"""
    
    def __init__(self):
        """OCR 서비스 초기화"""
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("❌ GEMINI_API_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.")

        
        genai.configure(api_key=api_key)
        
        # Vision 모델 설정
        self.model = genai.GenerativeModel(
            'gemini-2.0-flash',
            generation_config={
                "temperature": 0.3,  # 낮은 temperature로 정확도 향상
                "top_p": 0.8,
                "top_k": 40,
                "max_output_tokens": 1024,
            }
        )
        
        print("✅ OCR Service 초기화 완료 (Gemini Vision)")
    
    async def extract_menu_from_image(
        self, 
        base64_image: str,
        fallback_text: Optional[str] = None
    ) -> dict:
        """
        이미지에서 메뉴 텍스트 추출
        
        Args:
            base64_image: Base64 인코딩된 이미지 데이터
            fallback_text: OCR 실패 시 사용할 대체 텍스트 (선택)
        
        Returns:
            dict: {
                "success": bool,
                "menu_text": str,  # 추출된 메뉴 텍스트
                "menu_list": list,  # 메뉴 리스트
                "confidence": str,  # 신뢰도 ("high", "medium", "low")
                "error": str (optional)
            }
        """
        try:
            print("🔍 이미지에서 메뉴 추출 시작...")
            
            # Base64 헤더 제거 (data:image/jpeg;base64, 부분)
            if ',' in base64_image:
                base64_image = base64_image.split(',')[1]
            
            # 이미지 타입 감지
            image_bytes = base64.b64decode(base64_image)
            mime_type = self._detect_mime_type(image_bytes)
            
            # Gemini Vision API 호출
            menu_text = await self._call_gemini_vision(base64_image, mime_type)
            
            # 메뉴 리스트 파싱
            menu_list = self._parse_menu_text(menu_text)
            
            # 신뢰도 평가
            confidence = self._evaluate_confidence(menu_text, menu_list)
            
            result = {
                "success": True,
                "menu_text": menu_text,
                "menu_list": menu_list,
                "confidence": confidence
            }
            
            print(f"✅ 메뉴 추출 완료: {len(menu_list)}개 메뉴 발견")
            print(f"📋 추출된 메뉴: {', '.join(menu_list[:5])}{'...' if len(menu_list) > 5 else ''}")
            
            return result
            
        except Exception as e:
            error_msg = f"이미지 처리 실패: {str(e)}"
            print(f"❌ {error_msg}")
            
            # Fallback: 사용자가 입력한 텍스트 사용
            if fallback_text and fallback_text.strip():
                return {
                    "success": True,
                    "menu_text": fallback_text,
                    "menu_list": self._parse_menu_text(fallback_text),
                    "confidence": "fallback",
                    "error": error_msg
                }
            
            return {
                "success": False,
                "menu_text": "",
                "menu_list": [],
                "confidence": "none",
                "error": error_msg
            }
    
    async def _call_gemini_vision(self, base64_image: str, mime_type: str) -> str:
        """Gemini Vision API 호출"""
        
        # 현재 요일 가져오기
        from datetime import datetime
        weekdays_kr = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일']
        today_weekday = weekdays_kr[datetime.now().weekday()]
        
        # 이미지 파트 생성
        image_part = {
            "mime_type": mime_type,
            "data": base64_image
        }
        
        # 프롬프트 작성
        prompt = f"""
이 이미지는 구내식당 또는 학교 급식 식단표입니다.
**오늘({today_weekday}) 점심(중식) 메인 메뉴만** 추출해주세요.

**중요 지침:**
1. **날짜 선택 (우선순위):**
   - 오늘 요일과 일치하는 메뉴 선택
   - 오늘이 월요일이면 → "월요일" 또는 "월" 표시된 메뉴
   - 여러 날짜가 있다면 → 오늘 요일 > 가장 최근 날짜 순
   
2. **시간대 선택 (매우 중요):**
   - 조식/중식/석식 구분이 있다면 → **반드시 중식만** 선택
   - "아침", "조식", "breakfast" → 제외
   - "점심", "중식", "lunch" → 선택 ✅
   - "저녁", "석식", "dinner" → 제외
   - 시간대 표시 없으면 → 모든 메뉴 포함

3. 여러 코너/식당이 있다면 → 모든 코너의 메인 메뉴 포함 (예: A코너, B코너, 직원식당 등)
4. **메인 메뉴만 추출** (찌개, 구이, 볶음, 탕, 면, 덮밥, 전골, 카레, 파스타 등)
5. 메뉴명만 추출 (가격, 칼로리, 영양 정보, 날짜, 요일 제외)
6. 쉼표(,)로 구분하여 나열
7. 중복 제거

**메인 메뉴 기준 (이것만 추출):**
- ✅ 찌개류: 김치찌개, 된장찌개, 순두부찌개, 부대찌개 등
- ✅ 탕/국밥류: 갈비탕, 설렁탕, 곰탕, 감자탕, 국밥, 육개장 등
- ✅ 볶음/구이류: 제육볶음, 불고기, 닭갈비, 삼겹살, 오징어볶음 등
- ✅ 덮밥/카레류: 불고기덮밥, 카레라이스, 오므라이스 등
- ✅ 면류: 칼국수, 비빔냉면, 우동, 라면, 쌀국수, 파스타 등
- ✅ 정식/전골: 제육정식, 불고기정식, 해물전골 등
- ✅ 양식/일식/중식: 돈까스, 함박스테이크, 초밥, 짬뽕, 짜장면 등

**제외할 것 (절대 추출하지 마세요):**
- ❌ 다른 날짜/요일의 메뉴 (오늘이 아닌 화요일, 수요일 등)
- ❌ 조식(아침) 메뉴: "조식", "아침", "breakfast" 표시된 메뉴
- ❌ 석식(저녁) 메뉴: "석식", "저녁", "dinner" 표시된 메뉴
- ❌ 반찬류: 김치, 깍두기, 단무지, 배추김치, 나물, 장아찌 등
- ❌ 밥 종류: 잡곡밥, 흰밥, 현미밥 (메인이 아닌 경우)
- ❌ 부수 국: 된장국, 미역국 (메인이 아닌 경우)
- ❌ 후식: 과일, 요구르트, 음료수 등
- ❌ 가격, 칼로리 등 숫자 정보
- ❌ "오늘의 메뉴", "점심", "중식", "조식", "석식" 같은 라벨

**출력 형식 (쉼표로 구분, 메인 메뉴만):**
김치찌개, 제육볶음

**예시:**
이미지에 다음이 있다면:
```
월요일: 조식 - 토스트, 중식 - 김치찌개, 석식 - 불고기
화요일: 조식 - 시리얼, 중식 - 제육볶음, 석식 - 생선구이
```
오늘이 월요일이면 → "김치찌개" 만 추출
오늘이 화요일이면 → "제육볶음" 만 추출

오늘({today_weekday}) 점심(중식) 메인 메뉴만 추출해주세요:
"""
        
        # Gemini 호출
        response = self.model.generate_content([prompt, image_part])
        menu_text = response.text.strip()
        
        # 불필요한 텍스트 제거
        menu_text = self._clean_extracted_text(menu_text)
        
        return menu_text
    
    def _detect_mime_type(self, image_bytes: bytes) -> str:
        """이미지 MIME 타입 감지"""
        # 매직 넘버로 이미지 타입 판별
        if image_bytes.startswith(b'\xFF\xD8\xFF'):
            return "image/jpeg"
        elif image_bytes.startswith(b'\x89PNG'):
            return "image/png"
        elif image_bytes.startswith(b'GIF'):
            return "image/gif"
        elif image_bytes.startswith(b'RIFF') and b'WEBP' in image_bytes[:12]:
            return "image/webp"
        else:
            return "image/jpeg"  # 기본값
    
    def _clean_extracted_text(self, text: str) -> str:
        """추출된 텍스트 정리"""
        # 불필요한 설명문 제거
        text = re.sub(r'이미지에서.*?:', '', text, flags=re.IGNORECASE)
        text = re.sub(r'메뉴.*?:', '', text, flags=re.IGNORECASE)
        text = re.sub(r'오늘.*?메뉴.*?:', '', text, flags=re.IGNORECASE)
        text = re.sub(r'점심.*?메뉴.*?:', '', text, flags=re.IGNORECASE)
        text = re.sub(r'\*\*.*?\*\*', '', text)  # 볼드 텍스트 제거
        
        # 날짜/요일 패턴 제거
        text = re.sub(r'\d{4}[-/.]\d{1,2}[-/.]\d{1,2}', '', text)  # 2024-01-01
        text = re.sub(r'\d{1,2}월\s*\d{1,2}일', '', text)  # 1월 1일
        text = re.sub(r'[월화수목금토일]요일', '', text)  # 요일
        
        # 시간대 라벨 제거
        text = re.sub(r'(조식|중식|석식|아침|점심|저녁)[\s:]*', '', text, flags=re.IGNORECASE)
        
        # 코너명 제거 (선택적)
        text = re.sub(r'[A-Z가-힣]\s*코너[\s:]*', '', text)
        
        # 줄바꿈을 쉼표로 변환
        text = text.replace('\n', ', ')
        text = text.replace('  ', ' ')
        
        # 연속된 쉼표 제거
        text = re.sub(r',\s*,+', ',', text)
        
        return text.strip().strip(',')
    
    def _parse_menu_text(self, text: str) -> list:
        """메뉴 텍스트를 리스트로 파싱"""
        if not text:
            return []
        
        # 반찬/밥/부수품 키워드 (제외할 것)
        side_dish_keywords = [
            '김치', '깍두기', '단무지', '배추김치', '총각김치', '나물', '장아찌',
            '밥', '잡곡밥', '흰밥', '현미밥', '쌀밥',
            '된장국', '미역국', '콩나물국', '무국', '북어국',  # 메인이 아닌 국
            '과일', '요구르트', '음료', '우유', '주스',
            '샐러드', '샌드위치'  # 후식/간단 메뉴 (메인이 아닌 경우)
        ]
        
        # 여러 구분자로 분리
        menus = re.split(r'[,;\n|]', text)
        
        # 정리 및 필터링
        cleaned_menus = []
        for menu in menus:
            menu = menu.strip()
            
            # 숫자로만 된 것, 너무 짧은 것 제외
            if not menu or len(menu) < 2 or menu.isdigit():
                continue
            
            # 가격 정보 제거 (예: "김치찌개 5000원" -> "김치찌개")
            menu = re.sub(r'\d+원', '', menu).strip()
            menu = re.sub(r'[\d,]+\s*원', '', menu).strip()
            
            # 괄호 안 영어명 정리
            menu = re.sub(r'\([^)]*\)', '', menu).strip()
            
            # 반찬/밥/부수품 제외
            is_side_dish = any(keyword in menu for keyword in side_dish_keywords)
            
            # 메인 메뉴만 추가
            if menu and not is_side_dish:
                cleaned_menus.append(menu)
        
        # 중복 제거 및 순서 유지
        seen = set()
        unique_menus = []
        for menu in cleaned_menus:
            if menu.lower() not in seen:
                seen.add(menu.lower())
                unique_menus.append(menu)
        
        return unique_menus
    
    def _evaluate_confidence(self, text: str, menu_list: list) -> str:
        """추출 결과의 신뢰도 평가"""
        if not menu_list:
            return "low"
        
        # 메뉴 개수
        menu_count = len(menu_list)
        
        # 평균 메뉴명 길이
        avg_length = sum(len(m) for m in menu_list) / menu_count if menu_count > 0 else 0
        
        # 신뢰도 판단
        if menu_count >= 3 and avg_length >= 3:
            return "high"
        elif menu_count >= 2 and avg_length >= 2:
            return "medium"
        else:
            return "low"
    
    def validate_menu_extraction(self, result: dict) -> tuple:
        """
        메뉴 추출 결과 검증
        
        Returns:
            tuple: (is_valid, error_message)
        """
        if not result.get("success"):
            return False, result.get("error", "이미지 처리에 실패했습니다.")
        
        menu_list = result.get("menu_list", [])
        
        if not menu_list:
            return False, "이미지에서 메뉴를 찾을 수 없습니다. 텍스트로 입력해주세요."
        
        if len(menu_list) < 1:
            return False, "최소 1개 이상의 메뉴가 필요합니다."
        
        confidence = result.get("confidence")
        if confidence == "low":
            return False, "메뉴 인식 신뢰도가 낮습니다. 텍스트로 직접 입력하거나 더 선명한 이미지를 사용해주세요."
        
        return True, ""


# 싱글톤 인스턴스
ocr_service = OCRService()

