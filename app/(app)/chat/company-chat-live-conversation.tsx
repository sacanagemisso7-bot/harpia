"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Bot, MessageSquareText } from "lucide-react";

import { CompanyChatScrollArea } from "@/components/chat/company-chat-scroll-area";
import { COMPANY_CHAT_SUBMISSION_EVENT, type CompanyChatSubmissionEventDetail } from "@/components/chat/company-chat-events";

import styles from "./company-chat-page.module.css";

type CompanyChatLiveConversationProps = {
  threadId?: string;
  messageCount: number;
  hasMessages: boolean;
  messageStack: ReactNode;
  emptyState: ReactNode;
};

function matchesThread(activeThreadId: string | undefined, eventThreadId: string | null | undefined) {
  if (!activeThreadId && !eventThreadId) {
    return true;
  }

  return Boolean(activeThreadId && eventThreadId && activeThreadId === eventThreadId);
}

export function CompanyChatLiveConversation({
  threadId,
  messageCount,
  hasMessages,
  messageStack,
  emptyState
}: CompanyChatLiveConversationProps) {
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  useEffect(() => {
    function handleSubmission(event: Event) {
      const detail = (event as CustomEvent<CompanyChatSubmissionEventDetail>).detail;

      if (!detail || !matchesThread(threadId, detail.threadId)) {
        return;
      }

      if (detail.phase === "start") {
        setPendingMessage(detail.message ?? null);
        return;
      }

      setPendingMessage(null);
    }

    window.addEventListener(COMPANY_CHAT_SUBMISSION_EVENT, handleSubmission as EventListener);
    return () => window.removeEventListener(COMPANY_CHAT_SUBMISSION_EVENT, handleSubmission as EventListener);
  }, [threadId]);

  useEffect(() => {
    setPendingMessage(null);
  }, [threadId, messageCount]);

  const shouldShowConversation = hasMessages || Boolean(pendingMessage);

  return (
    <CompanyChatScrollArea className={styles.messageRiver} threadId={threadId} messageCount={messageCount + (pendingMessage ? 2 : 0)}>
      {shouldShowConversation ? (
        <div className={styles.messageStack}>
          {hasMessages ? messageStack : null}

          {pendingMessage ? (
            <>
              <div className={`${styles.messageRow} ${styles.messageUser}`}>
                <div className={styles.messageColumn}>
                  <div className={styles.messageMeta}>
                    <span className={styles.messageRole}>
                      <MessageSquareText className="h-3.5 w-3.5" />
                      Você
                    </span>
                    <span>Agora</span>
                  </div>

                  <div className={`${styles.messageBubble} ${styles.userBubble}`}>
                    <div className={styles.messageBody}>{pendingMessage}</div>
                  </div>
                </div>
              </div>

              <div className={`${styles.messageRow} ${styles.messageAssistant}`}>
                <div className={styles.messageColumn}>
                  <div className={styles.messageMeta}>
                    <span className={styles.messageRole}>
                      <Bot className="h-3.5 w-3.5" />
                      Harpia
                    </span>
                    <span>Analisando</span>
                  </div>

                  <div className={`${styles.messageBubble} ${styles.assistantBubble} ${styles.pendingBubble}`}>
                    <div className={styles.pendingMessage}>
                      <span className={styles.pendingDots} aria-hidden="true">
                        <span />
                        <span />
                        <span />
                      </span>
                      <span>Harpia está analisando o contexto do workspace…</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      ) : (
        emptyState
      )}
    </CompanyChatScrollArea>
  );
}
