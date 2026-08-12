"use client";

import * as React from "react";
import { Popover as PopoverPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * 공용 Popover — shadcn 규격 래퍼(radix `@radix-ui/react-popover`).
 *
 * 레포에 팝오버 공용 컴포넌트가 없어 새로 둔다. `radix-ui` 는 이미 의존성이고
 * (Button 이 같은 패키지의 Slot 을 쓴다) 새 패키지를 추가하지 않는다.
 * 직접 구현 대신 radix 를 쓰는 이유는 **화면 가장자리 충돌 회피 · Esc · 바깥 클릭 ·
 * 트리거로의 포커스 복귀**가 요구사항인데, 이 넷을 손으로 다시 만들면 엣지케이스가 샌다.
 *
 * 스타일은 목업 팝오버(.svpop)와 같은 언어로 맞춘다 — bg-popover · border · radius 12 ·
 * `0 10px 30px rgba(10,12,15,.14)` 그림자. 색은 전부 토큰이라 다크 모드가 자동으로 따라온다.
 */
function Popover({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverAnchor({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

/**
 * 팝오버 본문. Portal 로 body 에 붙이므로 부모의 overflow 에 잘리지 않고,
 * `collisionPadding` 으로 뷰포트 가장자리에서 자동으로 뒤집히거나 밀려난다.
 * 폭은 좁은 화면에서 넘치지 않게 `calc(100vw - 24px)` 로 한 번 더 잠근다.
 */
function PopoverContent({
  className,
  align = "start",
  sideOffset = 6,
  collisionPadding = 12,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(
          "z-50 w-[264px] max-w-[calc(100vw-24px)] rounded-[12px] border border-border bg-popover p-3 text-popover-foreground shadow-[0_10px_30px_rgba(10,12,15,.14)] outline-none",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger };
