# AUTOPILOT AI — PROFESSIONAL FULL-STACK PROJECT (FINAL MASTER PROMPT)

Act as a senior full-stack software architect, UI/UX designer, TypeScript developer, backend engineer, and DevOps engineer.

Upgrade my existing AutoPilot AI project into a professional, production-ready full-stack application. Inspect the existing project first, preserve its useful features, and implement the actual code changes. Do not create a simple demo or just provide instructions.

## 1. PROJECT ARCHITECTURE

Organize the project into a clean, maintainable folder structure appropriate for the existing framework.

Use the following target structure where compatible with the current application:

autopilot-ai/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── layout/
│   │   │   └── ui/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── api/
│   │   ├── context/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── constants/
│   │   ├── styles/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── validators/
│   │   ├── utils/
│   │   ├── types/
│   │   ├── app.ts
│   │   └── server.ts
│   ├── tests/
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── shared/
│   └── types/
├── docs/
│   ├── SETUP.md
│   ├── API.md
│   └── DEPLOYMENT.md
├── scripts/
├── .gitignore
├── .env.example
├── package.json
├── README.md
└── LICENSE

IMPORTANT: This is a target architecture, not permission to break the current project. Adapt it to the existing framework. If the project is currently a working Vite/React application, preserve its configuration and move files only when safe. Do not create empty folders merely for appearance. Every folder and file must have a real purpose.

## 2. FRONTEND

- Use the existing frontend framework and TypeScript.
- Create reusable components and consistent layouts.
- Maintain professional, modern, responsive UI.
- Organize pages, components, hooks, API clients, state management, and types separately.
- Add proper loading states, validation, error handling, notifications, and empty states.
- Ensure all buttons, forms, links, and navigation work.
- Support mobile, tablet, and desktop.
- Preserve the AutoPilot AI identity and existing working features.

## 3. BACKEND

Create a separate Node.js and TypeScript backend only where the existing application needs one.

- Use Express or the backend framework best suited to the existing codebase.
- Separate routes, controllers, services, validation, middleware, and configuration.
- Implement structured API responses and centralized error handling.
- Add health-check endpoint: GET /api/health.
- Validate incoming requests and apply appropriate rate limiting.
- Configure CORS for the actual frontend origin.
- Never expose server secrets or internal stack traces.
- Add authentication and role-based authorization if required by existing features.
- Do not create fake endpoints or unnecessary services.

## 4. GEMINI AI INTEGRATION

- Use GEMINI_API_KEY exclusively as a server-side secret when server-side integration is required.
- Store real credentials in local environment files excluded by Git.
- Keep .env.example files limited to variable names and safe example values.
- Implement secure AI request handling, input validation, error handling, and rate limiting.
- Never hardcode API keys or send them to the browser.
- Keep existing working AI functionality intact.
- Explain how to obtain and configure the required API key.

## 5. PROFESSIONAL PROJECT CONFIGURATION

Configure the root package.json to provide convenient commands when compatible with the architecture:

- npm run dev — run the required development services.
- npm run build — build the production application.
- npm run start — start the production server where applicable.
- npm run typecheck — run TypeScript checks.
- npm run lint — run linting if configured.
- npm test — run available automated tests.

Use appropriate npm workspaces or another maintainable setup for frontend, backend, and shared code if necessary.

Create valid configuration files, TypeScript configurations, and working npm scripts. Do not add scripts that reference nonexistent files or commands.

## 6. SECURITY

- Configure .gitignore to exclude .env, .env.local, node_modules, build output, logs, and private credentials.
- Include .env.example templates.
- Validate all external input.
- Protect private routes and administrative operations where applicable.
- Avoid unsafe file uploads, path traversal, arbitrary command execution, and unauthorized access.
- Never upload API keys, database passwords, or user secrets to GitHub.

## 7. TESTING AND ERROR FIXES

- Inspect all existing source files before restructuring.
- Identify missing dependencies, broken imports, TypeScript errors, and incorrect paths.
- Fix the actual problems.
- Install dependencies and run type checks and production builds.
- Test important frontend routes and backend endpoints where possible.
- Verify that development startup and production commands reference real files.
- Do not delete useful features just to make the build pass.
- If a check cannot run, state the reason honestly.

## 8. REAL DEPLOYMENT

Prepare the project for a real deployment compatible with its architecture.

- Frontend: configure for a compatible static or frontend hosting provider.
- Backend: configure for a Node.js-compatible hosting provider.
- Add SPA fallback and correct API routing when required.
- Support production environment variables.
- Add a deployment guide with exact build commands and configuration.
- Include health checks and production startup instructions.
- Do not claim the project is online until it has actually been deployed and verified.
- Explain any paid service, usage limit, database requirement, or external API requirement.

## 9. DOCUMENTATION

Write a professional README.md containing:
- Project overview and features.
- Technology stack.
- Folder structure.
- Prerequisites.
- Installation instructions.
- Environment setup.
- Local development instructions.
- Build and testing commands.
- API documentation reference.
- Deployment instructions.
- Security notes and troubleshooting.

## 10. REQUIRED EXECUTION ORDER

1. Inspect the complete existing AutoPilot AI project.
2. Identify the current framework and actual architecture.
3. Create or safely reorganize the real folders and files.
4. Implement all required code changes.
5. Install or verify dependencies.
6. Run available checks and fix reproducible errors.
7. Verify the production build.
8. Update documentation and deployment configuration.
9. Provide a final report listing the actual folders created, files changed, commands executed, checks passed, and remaining issues.

FINAL RULES:

- Make actual code changes, not just recommendations.
- Preserve working application features.
- Do not replace the existing application with a static mockup.
- Do not generate duplicate project structures unnecessarily.
- Do not invent successful test results.
- Keep the architecture secure, maintainable, and appropriate to the actual application.
- Finish the implementation before reporting completion.
