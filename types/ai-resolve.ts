export type AiResolveActionMode = "apply" | "approval";

export type AiResolveActionState = {
  error?: string;
  success?: string;
  mode?: AiResolveActionMode;
};
