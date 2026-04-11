"use client";

import { useEffect, useRef, type ReactNode } from "react";

type CompanyChatScrollAreaProps = {
  children: ReactNode;
  className?: string;
  threadId?: string;
  messageCount: number;
};

export function CompanyChatScrollArea({ children, className, threadId, messageCount }: CompanyChatScrollAreaProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: messageCount > 1 ? "smooth" : "auto"
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [threadId, messageCount]);

  return (
    <div ref={containerRef} className={className} data-testid="company-chat-scroll-area">
      {children}
    </div>
  );
}
