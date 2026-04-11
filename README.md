# 📈 Surebet Calculator & Dashboard

Um sistema completo para gestão de banca e cálculo de apostas de arbitragem (Surebet/Dutching). Desenvolvido com foco em performance, experiência do usuário (Mobile-First) e segurança de dados em nível de banco de dados.

## 🚀 Funcionalidades

* **Calculadora de Surebet/Dutching:** Algoritmo para identificar oportunidades de lucro garantido ou realizar a redução de danos (Hedge) igualando o retorno independente do resultado.
* **Dashboard Analítico:** Acompanhamento de KPIs em tempo real:
  * Lucro Total Acumulado
  * ROI Médio (%)
  * Capital Preso (Exposição de Risco em operações pendentes)
* **Gestão de Operações (CRUD Completo):**
  * Registro de novas entradas (Casas, Odds, Stakes, Lucro Esperado).
  * Atualização de status (Green/Red) com recálculo automático de banca.
  * Edição de operações via Modal dinâmico.
  * Exclusão segura de registros.
* **Segurança Robusta (RLS):** Arquitetura Multitenant garantida por Row Level Security no Supabase. Um usuário não consegue ler, alterar ou deletar os dados de outro, mesmo interceptando a API.

## 🛠️ Tecnologias Utilizadas

**Frontend:**
* [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
* [TypeScript](https://www.typescriptlang.org/)
* [Tailwind CSS](https://tailwindcss.com/) (Estilização e Responsividade)
* [Lucide React](https://lucide.dev/) (Ícones)

**Backend & Auth:**
* [Supabase](https://supabase.com/) (PostgreSQL + Autenticação)

**Hospedagem:**
* [Vercel](https://vercel.com/)

