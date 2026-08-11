/**
 * 홈 로고 클릭 시 Link 네비게이션을 막고 로컬 상태만 초기화할지 판단한다.
 *
 * 이미 `/`에 있고 초기화 콜백이 있을 때만 true — 같은 URL로 다시 push 하면 뒤로가기 기록만
 * 불필요하게 늘어나므로, 이 경우에는 preventDefault 후 콜백으로 홈을 최초 진입 상태로 되돌린다.
 * 다른 경로에서는 false 를 반환해 Link 가 정상적으로 `/`로 이동하게 둔다.
 */
export function shouldResetHomeOnLogoClick(pathname: string, hasResetHandler: boolean): boolean {
  return pathname === "/" && hasResetHandler;
}
