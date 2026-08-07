# Referência visual — não usar

Componentes gerados por ferramenta de IA (AI Studio), sem conexão com o backend.
Usam estado mock local (`store/useMatchStore.ts`, `store/useUserStore.ts`) e dados
fixos em vez de Supabase.

**Não importar em nenhuma rota até serem reescritos puxando dado real.**

Mantidos aqui apenas como referência de design/UI.

Dependências que esses arquivos usam (`zustand`, `lucide-react`, `clsx`, `motion`,
`tailwindcss`) foram removidas do `package.json` do projeto por não serem usadas
em nenhum lugar real — por isso este código não compila/builda como está.
