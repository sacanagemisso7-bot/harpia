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
  const shouldStickToBottomRef = useRef(true);
  const previousThreadIdRef = useRef<string | undefined>(threadId);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    function handleScroll() {
      const currentContainer = containerRef.current;

      if (!currentContainer) {
        return;
      }

      const distanceFromBottom =
        currentContainer.scrollHeight - currentContainer.scrollTop - currentContainer.clientHeight;
      shouldStickToBottomRef.current = distanceFromBottom < 120;
    }

    handleScroll();
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const threadChanged = previousThreadIdRef.current !== threadId;
    previousThreadIdRef.current = threadId;

    if (!threadChanged && !shouldStickToBottomRef.current) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: threadChanged || messageCount <= 1 ? "auto" : "smooth"
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [threadId, messageCount]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      if (!shouldStickToBottomRef.current) {
        return;
      }

      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth"
      });
    });

    observer.observe(container);
    Array.from(container.children).forEach((child) => observer.observe(child));

    return () => observer.disconnect();
  }, [threadId, messageCount]);

  return (
    <div ref={containerRef} className={className} data-testid="company-chat-scroll-area">
      {children}
    </div>
  );
}
