<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# UI components

Use shadcn/ui primitives from `@/components/ui/*` (React Aria base, `aria-nova` style) for buttons, menus, tabs, form controls, and other interactive UI. Add missing components with `pnpm dlx shadcn@latest add <name>`. Omit color classes when body or component defaults suffice; see `.cursor/rules/shadcn-ui.mdc`.
