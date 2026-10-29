# Gestão de Senha Administrativa & Atalho de Atendimento via Celular/WhatsApp

Esta atualização adiciona o gerenciamento de segurança (troca de senha com validação da senha atual) e a configuração dinâmica do número de celular/WhatsApp da **Adê Andrade Confeitaria** diretamente no Painel Administrativo, além de disponibilizar atalhos rápidos no catálogo público para que os clientes tirem dúvidas a qualquer momento.

### User Review & Critical Decisions

> [!IMPORTANT]
> As decisões abaixo foram alinhadas e confirmadas na etapa de perguntas e serão aplicadas mantendo 100% dos recursos existentes do catálogo, construtor "Monte seu Bolo" e motor de agendamento.

- **Decisão Confirmada 1 — Posicionamento do Atalho de Dúvidas**: Exibição de um botão flutuante discreto no canto inferior direito da vitrine pública, acompanhado de atalhos diretos na seção de informações do ateliê e no rodapé.
- **Decisão Confirmada 2 — Configuração do Número de Celular/WhatsApp**: O número de atendimento e recebimento de pedidos será editável diretamente dentro do Painel Administrativo, refletindo em tempo real tanto nos atalhos de dúvidas quanto no link de formalização do checkout.
- **Decisão Confirmada 3 — Fluxo de Troca de Senha no Admin**: O formulário exigirá a confirmação da **senha atual**, a digitação da **nova senha** (mínimo de 6 caracteres) e a **confirmação da nova senha**, com persistência local imediata.

---

### 1. Overview & Core Concept

- **What It Does**:
  1. Permite que a administração altere sua senha de acesso de forma segura dentro do painel e atualize o telefone/WhatsApp oficial e mensagem padrão de atendimento do ateliê.
  2. Oferece aos visitantes do catálogo público um canal imediato ("Tirar Dúvidas no WhatsApp") com número formatado visível e link direto para iniciar conversa ou ligação.
- **Target Audience / Persona**:
  - **Clientes da Confeitaria**: Pessoas que desejam esclarecer dúvidas sobre tamanhos de bolo, entrega, flores naturais, cores ou disponibilidade antes de fechar o pedido.
  - **Gestão do Ateliê (Adê Andrade)**: Administradora que precisa manter sua credencial de acesso protegida e atualizar o número de contato comercial sem depender de alterações no código.
- **Key Value**: Reduz o abandono de carrinho ao facilitar o contato humano imediato e garante autonomia operacional sobre a senha e os dados de contato do ateliê.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Fluxo do Cliente (Sanar Dúvidas)**:
     - Ao navegar pelo catálogo público, o cliente visualiza no canto inferior direito um botão flutuante elegante (*"Dúvidas? Fale com o Ateliê"* com o número formatado) e links dedicados na seção de informações e no rodapé.
     - Ao clicar, abre-se o WhatsApp (ou discador) com o número configurado no painel e uma mensagem amigável pré-preenchida (*"Olá, Adê Andrade Confeitaria! Estou vendo o catálogo 2026 e gostaria de tirar uma dúvida."*).
  2. **Fluxo do Administrador (Troca de Senha & Contato)**:
     - No Painel Administrativo, na aba de **Configuração & Segurança** (ou através de atalho no cabeçalho do painel), o administrador encontra dois novos blocos:
       - **Atendimento & WhatsApp da Confeitaria**: Campos para editar o número com DDD (ex.: `(79) 99999-9999`) e a mensagem inicial de atendimento, com validação de dígitos e feedback instantâneo de salvamento.
       - **Segurança — Alterar Senha de Acesso**: Campos para *Senha Atual*, *Nova Senha* e *Confirmar Nova Senha*, validando se a senha atual confere e se a confirmação coincide antes de persistir a nova credencial.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Minimalista, editorial e acolhedor, preservando a identidade da Adê Andrade Confeitaria.
  - *Color Palette & Mood*: Superfícies em off-white (`#FCF9F8`) e branco puro (`#FFFFFF`), detalhes em rosa suave (`#FDF4F7` / `#EAD8DF`), acento principal em rosa antigo (`#9E586F`), botões primários em carvão (`#231F20`) e destaque de WhatsApp em verde esmeralda sóbrio (`#047857`).
  - *Typography & Hierarchy*: Títulos em `Cormorant Garamond`, interface e controles em `Plus Jakarta Sans`, e números de telefone/métricas em `JetBrains Mono` (`tabular-nums`).
  - *Component Styling & Layout*: Respeito ao limite de 15% de área fixa em telas móveis (botão flutuante compacto que não obstrui os cards nem o rodapé do drawer de checkout).
- **Interactive Feedback & Motion**:
  - Alertas claros de sucesso (*"Senha atualizada com sucesso"*, *"Número de WhatsApp atualizado"*) e mensagens de erro específicas quando a senha atual estiver incorreta ou as senhas não coincidirem.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Número de Contato Unificado para Dúvidas e Checkout**
  - *Chosen Approach*: Centralizar o número de celular/WhatsApp no estado persistido da loja para que qualquer atualização no Painel Administrativo atualize automaticamente o botão flutuante de dúvidas, o rodapé, a seção de informações e o envio do pedido no 3º passo do checkout.
  - *Why*: Evita inconsistências onde o cliente vê um número no rodapé e outro ao finalizar a encomenda.
  - *Alternatives Considered*: Manter números separados para dúvidas e pedidos foi descartado para manter a operação simples e centralizada.
- **Decision 2: Persistência da Senha Administrativa e Recuperação Segura**
  - *Chosen Approach*: Persistir a senha customizada no armazenamento local do navegador, mantendo a validação obrigatória da senha atual para qualquer troca, e exibir na tela de login uma indicação discreta caso a senha padrão ainda esteja ativa.
  - *Why*: Garante proteção imediata da sessão administrativa sem exigir infraestrutura externa de banco de dados.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     StoreContext (Persistência Local)                    │
│  • produtos, configs, pedidos, bloqueios                                 │
│  • settings: { whatsapp_numero, whatsapp_exibicao, mensagem_duvidas }    │
│  • adminPassword (persistida com validação de senha atual)               │
└───────────────────┬──────────────────────────────────┬───────────────────┘
                    │                                  │
                    ▼                                  ▼
┌───────────────────────────────────────┐  ┌───────────────────────────────┐
│        Fluxo Público (Cliente)        │  │     Painel Administrativo     │
├───────────────────────────────────────┤  ├───────────────────────────────┤
│ • PublicStorefront                    │  │ • Tela de Login (usa senha    │
│   ├─ Seção Informações (Card Contato) │  │   persistida no StoreContext) │
│   └─ Botão Flutuante "Tirar Dúvidas"  │  │ • Aba Configuração & Segurança│
│ • Rodapé Editorial                    │  │   ├─ Form: WhatsApp / Celular │
│   └─ Link direto de Celular/WhatsApp  │  │   └─ Form: Trocar Senha       │
│ • CartCheckoutDrawer                  │  │      (Senha Atual + Nova +    │
│   └─ Formalização usa WhatsApp salvo  │  │       Confirmação)            │
└───────────────────────────────────────┘  └───────────────────────────────┘
```

- **Data Model & State**:
  - Inclusão do objeto `AtelierSettings` persistido junto ao banco local contendo:
    - `whatsapp_numero`: string numérica limpa para links `wa.me` e `tel:` (ex.: `"5579999999999"`).
    - `telefone_exibicao`: string formatada para leitura humana (ex.: `"(79) 99999-9999"`).
    - `mensagem_duvidas`: texto padrão enviado ao clicar no atalho de dúvidas.
  - Inclusão da chave de credencial administrativa persistida (`ade_andrade_admin_pwd_v1`) inicializada com `"ade2026"`.
- **Interactive Component & State Mapping**:
  - `changeAdminPassword(currentPassword, newPassword)`: verifica se `currentPassword` corresponde à senha salva; em caso afirmativo, salva `newPassword` e retorna confirmação para a UI.
  - `updateAtelierSettings(newSettings)`: valida o telefone informado, extrai os dígitos para o link `https://wa.me/` e atualiza instantaneamente todos os componentes públicos e administrativos sem necessidade de recarregar a página.
