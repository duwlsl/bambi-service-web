import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/**
 * /wiki 관심사 관리 UI 의 불변식.
 *
 * 화면 회귀보다 **정책 회귀**를 막는 게 목적이다: 목록 상한이 사라지면 관심사가 늘수록 패널이
 * 다시 길어지고, 근거 문구를 코드에 직접 쓰면 API 에 없는 이유를 지어내게 된다.
 */
const found = readFileSync(new URL("../components/wiki/wiki-found.tsx", import.meta.url), "utf8");
const mine = readFileSync(
  new URL("../components/wiki/wiki-my-interests.tsx", import.meta.url),
  "utf8",
);
const popover = readFileSync(new URL("../components/ui/popover.tsx", import.meta.url), "utf8");

/**
 * "이 문구가 없어야 한다" 류 검사는 **주석을 뺀 코드**만 본다.
 * 왜 그 표기를 지웠는지 설명한 주석(예: confidence 가 전부 52% 라 뺐다)까지 걸리면,
 * 결정의 근거를 파일에 남기는 것 자체가 불가능해진다.
 */
function code(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const foundCode = code(found);
const mineCode = code(mine);

test("두 목록 모두 기본 노출 개수 상한을 둔다", () => {
  assert.match(found, /const FOUND_PREVIEW = 2;/);
  assert.match(found, /candidates\.slice\(0, FOUND_PREVIEW\)/);
  assert.match(mine, /const MY_PREVIEW = 6;/);
  assert.match(mine, /interests\.slice\(0, MY_PREVIEW\)/);
});

test("상한을 넘으면 더 보기·접기 토글을 제공한다", () => {
  assert.match(found, /추천 \$\{restCount\}개 더 보기/);
  assert.match(mine, /전체 \$\{state\.data\.length\}개 보기/);
  for (const source of [found, mine]) {
    assert.match(source, /접기/);
    assert.match(source, /aria-expanded=\{expanded\}/);
  }
});

test("추천 카드의 동작은 아이콘이 아니라 문구로 드러낸다", () => {
  // `＋` 단독 칩·`×` 단독 버튼으로 되돌아가지 않게 텍스트 라벨과 aria-label 을 함께 고정한다.
  assert.match(found, /aria-label=\{`\$\{name\} 내 관심사로 추가`\}/);
  assert.match(found, /aria-label=\{`\$\{name\} 추천에서 숨기기`\}/);
  assert.match(found, />\s*추가\s*<\/Button>|추가하는 중…/);
  assert.match(found, />\s*숨기기\s*<\/Button>/);
});

test("되돌릴 수 없는 숨기기에는 확인 단계를 둔다", () => {
  // POST /api/wiki/tags/blocks 는 해제 API 가 없다 → 한 번 누르면 끝나면 안 된다.
  assert.match(found, /추천에서 숨길까요\?/);
  assert.match(found, /data-confirm="hide"/);
  assert.match(mine, /삭제할까요\?/);
});

test("추천 이유는 API 값만 쓰고 화면에서 지어내지 않는다", () => {
  // 근거는 WikiTag.reasonMessages(constants/wiki.ts 매핑)에서만 온다.
  assert.match(found, /reason: tag\.reasonMessages\[0\]/);
  assert.match(found, /reason !== undefined &&/);
  // constants/wiki.ts 의 확정 문구를 컴포넌트에 복사해 두면 근거 없는 카드에도 새어 나간다.
  assert.doesNotMatch(foundCode, /저장한 자료에서 반복해 나타난 주제예요/);
  assert.doesNotMatch(foundCode, /관련 카드에 좋아요를 눌렀어요/);
});

test("내 관심사에는 근거 없는 출처·신뢰도 표기를 두지 않는다", () => {
  // fetchUserInterests 가 source=USER 만 반환한다 → 구분할 데이터가 없다.
  assert.doesNotMatch(mineCode, /직접 설정|AI 추천|LLM 추론|신뢰도/);
  assert.doesNotMatch(mineCode, /confidence/);
});

test("상세는 공용 팝오버로 열고 목록 높이를 바꾸지 않는다", () => {
  assert.match(mine, /from "@\/components\/ui\/popover"/);
  assert.match(mine, /<PopoverTrigger asChild>/);
  // Portal + 충돌 회피가 있어야 좁은 화면·가장자리에서 잘리지 않는다.
  assert.match(popover, /PopoverPrimitive\.Portal/);
  assert.match(popover, /collisionPadding/);
});

test("공용 버튼 컴포넌트를 재사용한다", () => {
  for (const source of [found, mine]) {
    assert.match(source, /import \{ Button \} from "@\/components\/ui\/button";/);
  }
});
