export const brand = {
  name: "Harpia",
  desktopName: "Harpia Desktop",
  tagline: "Veja alem do curriculo",
  shortDescription: "Precisao para decidir melhor em recrutamento e people ops.",
  description:
    "Sistema operacional estrategico para recrutamento e people ops com clareza, precisao e inteligencia operacional.",
  marketingEyebrow: "Precisao para decidir melhor",
  supportEmail: "hello@harpia.app",
  noReplyEmail: "noreply@harpia.app",
  careersDemoSlug: "harpia",
  legacyCareersDemoSlug: "hireflow-demo"
} as const;

export const brandPaths = {
  pricing: "/pricing",
  demo: "/book-demo",
  login: "/login",
  careersDemo: `/careers/${brand.careersDemoSlug}`,
  legacyCareersDemo: `/careers/${brand.legacyCareersDemoSlug}`
} as const;

export function formatBrandTitle(pageTitle?: string) {
  return pageTitle ? `${pageTitle} | ${brand.name}` : brand.name;
}

export const defaultMetadata = {
  title: brand.name,
  description: brand.description
} as const;
