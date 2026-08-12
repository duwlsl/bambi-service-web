"use client";


import { FeedSkeleton } from "@/components/home/feed-skeleton";
import { IconAlert, IconEmptyDoc } from "@/components/ui/state-icons";
import { StateView } from "@/components/ui/state-view";
import type { InterestTaxonomyState } from "@/hooks/use-interest-taxonomy";
import type { WikiInterestsState } from "@/hooks/use-wiki-interests";
import {
  groupInterestsByCategory,
  type CategoryGroup,
  type CategoryItem,
} from "@/lib/interest-category";
import {
  INTEREST_LEVEL_BAR_CLASS,
  INTEREST_LEVEL_LABEL,
  interestBarWidthPercent,
  resolveInterestLevel,
} from "@/lib/interest-level";
import type { InterestDto } from "@/types/interest";

/**
 * 관심사가 하나도 없는 대분류를 화면에 남길지.
 *
 * 원래 의도는 "이 서비스가 다루는 범위"를 보여주려고 빈 대분류도 남기는 것이었는데,
 * 지금은 agent 가 관심사에 taxonomy ID 를 붙여주지 않아 대부분이 [기타]로 떨어진다
 * (2026-08-05 실측: 20건 중 20건). 그 상태로 빈 대분류 8개를 세우면 노이즈만 커져서 일단 접는다.
 * **agent 가 topicId 를 내려주기 시작하면 true 로 되돌린다** — 그때는 대분류가 실제로 채워진다.
 */
const SHOW_EMPTY_CATEGORIES = false;

/**
 * [AI가 이해한 지금의 나] — taxonomy 대분류로 묶어 보여준다(2026-08-05 우석 결정).
 *
 * 이전에는 AI 추론 태그 상위 4건만 나열해서 ⑴ 무엇을 기준으로 뽑힌 4개인지 알 수 없고
 * ⑵ 파악한 관심사 범위가 좁아 보이는 문제가 있었다. 이제 상한 없이 전부 보여주되
 * taxonomy 대분류(테크·IT / 비즈니스·경제 / …)로 묶는다.
 *
 * 데이터: AI 추론 태그(GET /api/wiki/tags, score=0~1 상대 강도) + 내 관심사(GET /api/interests).
 * 분류 규칙은 lib/interest-category.ts 참조(온보딩 선택은 categoryId, 나머지는 이름 대조).
 */
export function WikiMind({
  taxonomy,
  tags,
  myInterests,
}: {
  taxonomy: InterestTaxonomyState & { refetch: () => void };
  tags: WikiInterestsState & { refetch: () => void };
  myInterests: InterestDto[] | null;
}) {
  return (
    <section aria-label="AI가 이해한 지금의 나" className="mb-8">
      <div className="rounded-[14px] border border-border bg-card px-[18px] py-4">
        <h2 className="text-[15px] font-bold tracking-[-0.01em] text-foreground">
          AI가 이해한 지금의 나
        </h2>
        <p className="mt-0.5 mb-3.5 text-[12.5px] leading-[1.6] text-muted-foreground">
          주제별로 모아 봤어요 — 관심도는 가장 높은 관심사를 기준으로 한 AI 추정이고, 직접 추가한
          관심사는 이름 옆에 따로 표시했어요.
        </p>

        <Body taxonomy={taxonomy} tags={tags} myInterests={myInterests} />
      </div>
    </section>
  );
}

function Body({
  taxonomy,
  tags,
  myInterests,
}: {
  taxonomy: InterestTaxonomyState & { refetch: () => void };
  tags: WikiInterestsState & { refetch: () => void };
  myInterests: InterestDto[] | null;
}) {
  // 대분류 골격이 없으면 묶어서 보여줄 수 없다 → taxonomy 실패는 별도 에러로 다룬다.
  if (taxonomy.status === "error") {
    return (
      <StateView
        role="alert"
        className="min-h-[160px]"
        icon={<IconAlert />}
        title="관심사 분류를 불러오지 못했어요"
        description="일시적인 문제일 수 있어요. 잠시 후 다시 시도해 주세요."
        actions={[{ label: "다시 시도", onClick: taxonomy.refetch, variant: "primary" }]}
      />
    );
  }
  if (taxonomy.status === "loading" || tags.status === "loading" || myInterests === null) {
    return <FeedSkeleton />;
  }
  if (tags.status === "error") {
    return (
      <StateView
        role="alert"
        className="min-h-[160px]"
        icon={<IconAlert />}
        title="관심사를 불러오지 못했어요"
        description="일시적인 문제일 수 있어요. 잠시 후 다시 시도해 주세요."
        actions={[{ label: "다시 시도", onClick: tags.refetch, variant: "primary" }]}
      />
    );
  }

  const wikiTags = tags.status === "success" ? tags.data : [];
  const groups = groupInterestsByCategory(taxonomy.data, wikiTags, myInterests);
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  if (total === 0) {
    return (
      <StateView
        className="min-h-[160px]"
        icon={<IconEmptyDoc />}
        title="아직 파악한 관심사가 없어요"
        description="관심 자료를 저장하거나 관심사를 직접 추가하면 여기에 주제별로 정리돼요."
      />
    );
  }

  const visible = SHOW_EMPTY_CATEGORIES ? groups : groups.filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col gap-4">
      {visible.map((group) => (
        <CategoryBlock key={group.id} group={group} />
      ))}
    </div>
  );
}

/** 대분류 1개 — 제목 줄 + 소속 관심사. 비어 있으면 옅게 두어 "채울 수 있는 자리"로 보이게 한다. */
function CategoryBlock({ group }: { group: CategoryGroup }) {
  const empty = group.items.length === 0;
  return (
    <div className={empty ? "opacity-45" : undefined}>
      <div className="mb-1.5 flex items-baseline gap-1.5">
        <span aria-hidden="true" className="text-[13px]">
          {group.emoji}
        </span>
        <h3 className="text-[13px] font-bold text-foreground">{group.name}</h3>
        {!empty && (
          <span className="text-[11.5px] font-semibold text-muted-foreground">
            {group.items.length}
          </span>
        )}
      </div>

      {empty ? (
        <p className="pl-[22px] text-[12px] text-muted-foreground">아직 없어요</p>
      ) : (
        <ul className="flex flex-col gap-1.5 pl-[22px]">
          {group.items.map((item) => (
            <MindRow key={item.key} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * 관심사 1줄 — 이름(+등록 출처) · 관심도 막대 · 관심도 라벨.
 *
 * score 가 있으면 막대 길이는 서버 값 그대로 쓰고(확대·축소 없음), 색과 라벨은 단계 함수
 * (`lib/interest-level.ts`)가 정한다. 임계값·문구·색을 이 파일에 다시 적지 않는다.
 * score 가 없으면(직접 추가만 한 관심사) 막대·색·단계를 **지어내지 않고** 안내 문구만 둔다 —
 * 점수 0(서버가 실제로 준 값 → 최하 단계)과 구분된다.
 * 절대 수치로 오해하지 않도록 %는 표기하지 않는다.
 */
function MindRow({ item }: { item: CategoryItem }) {
  const level = resolveInterestLevel(item.score);

  /*
    ≥480px 은 기존 한 줄 배치다: 이름+출처(고정폭) · 관심도 막대(flex-1) · 관심도 라벨(w-14).
    그 아래에서는 고정폭 합이 320px 화면의 행 가용폭을 넘겨 가로 스크롤이 생기므로, 폭을 깎는 대신
    **막대만 다음 줄로 내린다**(flex-wrap + order-last + w-full):
      1줄 — 이름(남은 폭 차지, truncate)·[내 관심사] · 관심도 라벨
      2줄 — 관심도 막대(전체 폭)
    order 는 시각 순서만 바꾸므로 DOM·읽기 순서는 그대로고, 막대는 aria-hidden 이라 영향이 없다.
    분기점이 360 → 480px 인 이유: 이름 옆 [내 관심사] 배지가 1줄의 고정폭 합을 늘려서
    360~480px 구간에서는 막대가 수십 px 로 뭉개진다. 그 구간은 막대를 아래 줄 전체 폭으로 둔다.
  */
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <span className="flex min-w-0 flex-1 items-center gap-1.5 min-[480px]:w-[168px] min-[480px]:flex-none">
        <span className="min-w-0 truncate text-[13px] font-semibold text-foreground">
          {item.name}
        </span>
        {/*
          등록 출처는 관심도와 다른 축이라 이름 옆 보조 표시로만 둔다. AI 추정이 기본값이므로
          모든 행에 "AI 추정"을 반복하지 않고, 사용자가 직접 등록한 항목에만 배지를 붙인다.
          아이콘 대신 문구를 쓰므로 별도 스크린리더 텍스트가 필요 없고, 색은 관심도 막대(주황)와
          경쟁하지 않도록 중립 톤으로 둔다.
        */}
        {item.source === "USER" && (
          <span className="shrink-0 rounded-[4px] border border-border px-1 py-px text-[10px] leading-[1.5] font-semibold whitespace-nowrap text-muted-foreground">
            내 관심사
          </span>
        )}
      </span>
      {level === null ? (
        <span className="order-last w-full text-[11.5px] text-muted-foreground min-[480px]:order-none min-[480px]:w-auto min-[480px]:min-w-0 min-[480px]:flex-1">
          직접 추가한 관심사
        </span>
      ) : (
        <span
          aria-hidden="true"
          className="order-last h-2 w-full rounded-full bg-background min-[480px]:order-none min-[480px]:w-auto min-[480px]:min-w-0 min-[480px]:flex-1"
        >
          <span
            className={`block h-full rounded-full ${INTEREST_LEVEL_BAR_CLASS[level]}`}
            style={{ width: `${interestBarWidthPercent(item.score ?? 0)}%` }}
          />
        </span>
      )}
      {/*
        삭제 버튼은 두지 않는다(2026-08-11 우석). 추가·삭제는 아래 2열 패널(발견 후보 ↔ 내 관심사)이
        전담하고, 이 섹션은 "AI 가 지금 나를 어떻게 보는가"를 읽는 자리다. 같은 조작을 두 군데 두면
        어디서 해야 하는지 흔들리고 행도 좁아진다.
        막대는 aria-hidden 이라 관심도를 읽어주는 것은 이 라벨뿐이다 — 점수가 없는 행도 자리를
        비우지 않고 "정보 없음"을 남겨 행 정렬과 낭독 내용을 모두 유지한다.
      */}
      <span className="w-14 shrink-0 text-right text-[11.5px] whitespace-nowrap text-muted-foreground">
        {level === null ? (
          <>
            <span aria-hidden="true">—</span>
            <span className="sr-only">관심도 정보 없음</span>
          </>
        ) : (
          INTEREST_LEVEL_LABEL[level]
        )}
      </span>
    </li>
  );
}
