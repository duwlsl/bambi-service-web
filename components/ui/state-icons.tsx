/**
 * 상태 화면용 아이콘 — 목업(variants/*-states.html)의 pstate 아이콘 스트로크 스타일을 그대로 옮긴 것.
 * currentColor 기반이라 StateView 의 iconTone(neutral/brand)에 따라 색이 결정된다.
 * 임의 확장 없이 목업에 이미 존재하는 종류만 둔다.
 */
import type { SVGProps } from "react";

/** 오류 — 원 + 느낌표(피드/리포트 데이터 오류, 전역 에러). 목업 err-api 아이콘. */
export function IconAlert(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 20 20"
      width={20}
      height={20}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      aria-hidden="true"
      {...props}
    >
      <circle cx="10" cy="10" r="7.4" />
      <line x1="10" y1="6.4" x2="10" y2="10.8" strokeLinecap="round" />
      <circle cx="10" cy="13.6" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** 빈 상태 — 문서(줄) 아이콘(피드 · 내 보고서 Empty). 목업 empty-all 아이콘. */
export function IconEmptyDoc(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={20}
      height={20}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      aria-hidden="true"
      {...props}
    >
      <rect x="2.2" y="2.8" width="11.6" height="10.4" rx="1.8" />
      <line x1="4.6" y1="6" x2="11.4" y2="6" strokeLinecap="round" />
      <line x1="4.6" y1="8.6" x2="9.4" y2="8.6" strokeLinecap="round" />
    </svg>
  );
}

/** 찾을 수 없음 — 돋보기(404). 목업 nav 검색 아이콘과 같은 시각 언어. */
export function IconSearch(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 20 20"
      width={20}
      height={20}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      aria-hidden="true"
      {...props}
    >
      <circle cx="8.6" cy="8.6" r="5.2" />
      <line x1="12.6" y1="12.6" x2="16.4" y2="16.4" strokeLinecap="round" />
    </svg>
  );
}
