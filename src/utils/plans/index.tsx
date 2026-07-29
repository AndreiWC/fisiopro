export type PlanDetailsProps = {
  maxServices: number;
  maxCustomer: number;
};
export type PlansProps = {
  BASIC: PlanDetailsProps;
  PROFESSIONAL: PlanDetailsProps;
};
export const PLANS: PlansProps = {
  BASIC: {
    maxServices: 5,
    maxCustomer: 30,
  },
  PROFESSIONAL: {
    maxServices: 10,
    maxCustomer: 60,
  },
};

export const subscriptionPlans = [
  {
    id: "BASIC",
    name: "Básico",
    description:
      "Ideal para profissionais que estão começando e precisam de uma solução simples para gerenciar seus agendamentos.",
    oldPrice: 99.9,
    price: 69.9,
    features: [
      `Até ${PLANS.BASIC.maxServices} serviços cadastrados`,
      `Até ${PLANS.BASIC.maxCustomer} clientes cadastrados`,
      "Acesso ao painel de controle para gerenciar agendamentos",
      "Suporte por e-mail para dúvidas e problemas",
      "Acesso a atualizações e melhorias do sistema",
      "Relatórios básicos de agendamento e clientes",
    ],
  },
  {
    id: "PROFESSIONAL",
    name: "Profissional",
    description:
      "Para profissionais que precisam de uma solução mais completa para gerenciar seus agendamentos.",
    oldPrice: 119.9,
    price: 99.9,
    features: [
      `Até ${PLANS.PROFESSIONAL.maxServices} serviços cadastrados`,
      `Até ${PLANS.PROFESSIONAL.maxCustomer} clientes cadastrados`,
      "Acesso ao painel de controle para gerenciar agendamentos",
      "Suporte prioritário para dúvidas e problemas",
      "Acesso a atualizações e melhorias do sistema",
      "Relatórios avançados de agendamento e clientes",
    ],
  },
];
