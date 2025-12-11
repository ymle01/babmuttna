// ✅ 1. 무조건 통과시킬 애들
const ALWAYS_ALLOW = new Set([
  "국밥",
  "돼지국밥",
  "순대국밥",
  "사골국밥",
  "설렁탕",
  "갈비탕",
  "곰탕",
  "감자탕",
  "육개장",
  "해장국",
  "치킨",
  "제육"
]);

const HANGUL_JAMO_ONLY = /^[\u3131-\u318E]+$/; // ㄱ~ㅣ(자모만)
const KOR2 = /[가-힣]{2,}/;                     // 완성형 한글 2자+
const ALNUM2 = /[A-Za-z0-9]{2,}/;               // 영숫자 2자+

const FOOD_NEGATIVE = new Set([
  "그림","사진","이미지","파일","텍스트","문장","단어","테스트",
  "후회돼","그렇게","뭐라도","아무거나","추천","메뉴","배고파"
]);

const FOOD_SUFFIXES = [
  "찌개","국","탕","전골","덮밥","비빔밥","볶음밥","죽","면","라면","우동","냉면","칼국수","쌀국수","수제비","소바",
  "구이","볶음","조림","찜","튀김","전","파스타","리조또","피자","스테이크","함박","돈까스","카츠",
  "초밥","스시","사시미","회","동","규동","가츠동","마라탕","훠궈","짬뽕","짜장면","탕수육","유산슬","깐풍기",
  "샐러드","포케","샌드위치","버거","토스트","빵","갈비탕","설렁탕","육개장","감자탕","해장국","곰탕", "치킨", "제육"
];

const FOOD_KEYWORDS = new Set([
  "김치찌개","된장찌개","부대찌개","순두부찌개","갈비탕","육개장","삼계탕","감자탕","해장국","곰탕",
  "비빔밥","제육볶음","불고기","닭갈비","카레","쭈꾸미","보쌈","족발","칼국수","콩국수","막국수",
  "냉면","비빔냉면","평양냉면","함흥냉면","잔치국수","우동","라면","쌀국수","소바",
  "파스타","리조또","피자","스테이크","함박스테이크","돈까스","치즈돈까스","규카츠",
  "초밥","스시","연어덮밥","사시미","회덮밥","가츠동","규동",
  "마라탕","마라샹궈","꿔바로우","짜장면","짬뽕","볶음밥","탕수육",
  "떡볶이","김밥","라볶이","순대","튀김","분식","샐러드","포케","그레인볼","샌드위치","버거","토스트"
]);

const EN_HINTS = ["pasta","pizza","steak","ramen","soba","udon","sushi","donburi","risotto","burger","sandwich","poke","salad","noodle","noodles","curry","maratang"];

export function normalizeAndSplit(text = "") {
  let t = text.trim();
  t = t.replace(/[\/\n\r;|]+/g, ",");
  t = t.replace(/\s+/g, " ");
  const arr = t.split(",").map((s) => s.trim()).filter(Boolean);
  return [...new Set(arr)];
}

function isFoodLike(token = "") {
  const t = token.trim();

  // ✅ 2. 여기서 제일 먼저 화이트리스트 확인
  if (ALWAYS_ALLOW.has(t)) return true;
  // "국밥"이 들어간 건 다 살려
  if (t.includes("국밥")) return true;

  if (FOOD_NEGATIVE.has(t)) return false;
  if (FOOD_KEYWORDS.has(t)) return true;
  if (FOOD_SUFFIXES.some((suf) => t.endsWith(suf))) return true;

  const low = t.toLowerCase();
  if (EN_HINTS.some((k) => low.includes(k))) return true;

  return false;
}

export function isValidMenuToken(token = "") {
  const t = token.trim();
  if (!t) return false;

  // ✅ 3. 여기서도 한 번 더
  if (ALWAYS_ALLOW.has(t)) return true;
  if (t.includes("국밥")) return true;

  if (FOOD_NEGATIVE.has(t)) return false;
  if (HANGUL_JAMO_ONLY.test(t)) return false;
  if (!(KOR2.test(t) || ALNUM2.test(t))) return false;

  return isFoodLike(t);
}

/** 입력 검증 → 배너 문구 반환 */
export function validateMenuTokens(rawText, hasImage = false) {
  const tokens = normalizeAndSplit(rawText);
  const valids = tokens.filter(isValidMenuToken);

  // (1) 이미지만 있는 경우 - OCR로 처리하므로 통과
  if (tokens.length === 0 && hasImage) {
    return {
      ok: true,
      tokens,
      valids,
    };
  }

  // (2) 텍스트는 있는데 다 음식이 아닌 경우
  if (tokens.length > 0 && valids.length === 0) {
    return {
      ok: false,
      title: "메뉴 인식 불가",
      desc: "입력하신 단어가 음식명으로 인식되지 않았습니다. 예: 김치찌개, 파스타, 초밥처럼 실제 음식명을 입력해주세요.",
      tokens, valids,
    };
  }

  // (3) 이미지도 없고 텍스트도 유효한 게 없는 경우
  if (!hasImage && valids.length === 0) {
    return {
      ok: false,
      title: "입력이 필요해요",
      desc: "식단표 이미지를 업로드하거나 메뉴를 텍스트로 입력해주세요.",
      tokens, valids,
    };
  }

  return { ok: true, tokens, valids };
}
