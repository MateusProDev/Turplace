# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Checklist de Deploy

- [x] Firebase configurado (Auth, Firestore)
- [x] Cloudinary configurado (upload_preset, cloud_name)
- [x] Variáveis de ambiente adicionadas no Vercel
- [x] Deploy do frontend no Vercel
- [x] Regras do Firestore aplicadas
- [x] Cadastro, listagem e contato testados
- [x] Fluxo admin (aprovação de serviços) validado
- [x] Responsividade e UX simples garantidos

## Como rodar localmente

1. Configure o arquivo `src/utils/firebase.ts` com suas credenciais do Firebase.
2. Configure o arquivo `src/utils/cloudinary.ts` com seu `cloud_name` e `upload_preset`.
3. Rode `npm run dev` para iniciar o frontend.
4. Faça deploy no Vercel para produção.


MVP pronto para validação!

## Estratégia de Planos (Monetização)

Oferecemos planos pensados para prestadores que preferem pagar um valor fixo/benefício em vez de uma comissão alta:

- Free — Comissão: 15% — Sem destaque, Sem analytics
- Profissional — Comissão: 8% — Destaque no catálogo, Perfil verificado
- Premium — Comissão: 5% — Topo da categoria, Leads prioritários, Analytics avançado

Copy sugerida para o site:

> Você só paga quando vende.
> A Turplace cobra uma pequena comissão para manter a plataforma segura, promover seu serviço e conectar você com agências qualificadas.
>
> Simples. Justo. Aceitável.

Para criar os planos no Stripe e gravar seus IDs no Firestore (ou arquivo local), veja `README_STRIPE.md` e execute o script `npm run create:stripe-plans` após configurar `.env`.
