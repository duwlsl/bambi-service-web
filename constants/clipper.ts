/**
 * 밤새비서 클리퍼(Chrome 확장 프로그램) 관련 상수.
 *
 * 클리퍼는 사용자가 아이콘을 누른 페이지만 저장하는 별도 확장 프로그램이다(개인정보처리방침 §3).
 * 웹은 **설치 경로를 안내만 한다** — 설치 여부 감지·강제 설치·권한 확인은 하지 않는다
 * (확장 설치 상태는 웹 페이지가 알 수 있는 정보가 아니고, 알아야 할 이유도 없다).
 */

/**
 * Chrome 웹 스토어 등록 주소 — 설치 CTA 의 단일 출처.
 * 경로의 퍼센트 인코딩은 스토어가 발급한 원문 그대로 둔다(디코딩하면 링크가 깨질 수 있다).
 */
export const CLIPPER_CHROME_WEBSTORE_URL =
  "https://chromewebstore.google.com/detail/%EB%B0%A4%EC%83%88%EB%B9%84%EC%84%9C-%ED%81%B4%EB%A6%AC%ED%8D%BC/igppogonpcbfplikeemaldkoakhginjk";
