export const harpiaExecutiveDeck = {
  company: {
    name: "Atlas Meridian",
    sector: "servicos industriais e operacoes B2B",
    footprint: "11 unidades entre Sao Paulo, Campinas e Belo Horizonte",
    size: "842 colaboradores",
    headcountGrowth: "+18% em 12 meses"
  },
  cover: {
    title: "Harpia for Atlas Meridian",
    subtitle: "Inteligencia operacional para RH, recrutamento e decisao executiva.",
    tagline: "Menos ruido. Mais acerto."
  },
  metrics: [
    { label: "tempo medio de decisao", value: "-37%", detail: "da triagem ate a aprovacao final" },
    { label: "pendencias criticas de RH", value: "-42%", detail: "com ownership e SLA visiveis" },
    { label: "onboardings no prazo", value: "96%", detail: "com fluxos e checkpoints ativos" },
    { label: "vagas com score confiavel", value: "89%", detail: "com shortlist, entrevistas e sinais claros" }
  ],
  modules: [
    {
      name: "Dashboard executivo",
      summary: "Leitura unica da operacao com alertas, ownership, risco e cadencia."
    },
    {
      name: "People ops",
      summary: "Solicitacoes, tarefas, onboarding, offboarding, calendario e compliance em um so fluxo."
    },
    {
      name: "Hiring control",
      summary: "Vagas, candidatos, pipeline, entrevistas e score operacional sem planilhas paralelas."
    },
    {
      name: "Company chat",
      summary: "Perguntas, drafts, fontes internas e acoes com contexto preso a cada thread."
    },
    {
      name: "Analytics e billing",
      summary: "Saude do funil, leitura do negocio, consumo e sinais de plano no mesmo ambiente."
    },
    {
      name: "Knowledge e aprovacoes",
      summary: "Base interna citavel, politicas rastreaveis e execucoes com trilha de aprovacao."
    }
  ],
  scenarios: [
    {
      title: "Contratacao de lideranca",
      detail: "Harpia cruza score, fit, sinais de entrevista e risco de atraso para acelerar a decisao certa."
    },
    {
      title: "Operacao de RH sem fila invisivel",
      detail: "Requests, tasks e eventos aparecem com ownership e prazo antes do problema virar escalacao."
    },
    {
      title: "Compliance com prova e contexto",
      detail: "Politicas, aceites e exigencias ficam conectados a pessoas, documentos e follow-ups."
    }
  ],
  rollout: [
    "Semana 1: setup de workspace, permissoes, estrutura e dados base.",
    "Semana 2: migracao de requests, tarefas, vagas e knowledge essencial.",
    "Semana 3: operacao assistida com dashboard, chat e cadencia de gestao.",
    "Semana 4: leitura executiva, metricas consolidadas e playbooks internos."
  ],
  closing: [
    "Visao unica da operacao.",
    "Decisao mais rapida e com mais criterio.",
    "Menos dependencia de planilha, chat solto e memoria informal."
  ]
} as const;

export type HarpiaExecutiveDeck = typeof harpiaExecutiveDeck;
