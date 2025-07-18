# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

This project uses pnpm as the package manager:

- `pnpm dev` - Start local dev server at localhost:3000
- `pnpm build` - Build production site to ./dist/
- `pnpm postbuild` - Run Pagefind search indexing after build (required for search functionality)
- `pnpm preview` - Preview built site locally
- `pnpm lint` - Run Biome linter
- `pnpm format` - Format code using Biome and Prettier
- `pnpm check` - Run Astro type checking

## Architecture Overview

This is an Astro-based blog built on the Astro Cactus theme with the following key components:

### Content Management
- Uses Astro Content Collections for type-safe content management
- Blog posts in `src/content/post/` with frontmatter schema validation
- Notes in `src/content/note/` for shorter content
- Content schema defined in `src/content.config.ts`

### Site Configuration
- Main site config in `src/site.config.ts` including author, title, description, URL
- Astro config in `astro.config.ts` with integrations and markdown processing
- Uses Tailwind v4 for styling with custom configuration

### Key Features
- Static site generation with Astro v5
- Dark/light theme toggle
- Search functionality via Pagefind (requires postbuild step)
- OG image generation using Satori
- RSS feeds auto-generated
- MDX support with custom remark/rehype plugins

### Content Structure
- Posts require: title, description, publishDate
- Optional: tags, coverImage, ogImage, updatedDate, draft status
- Notes require: title, publishDate
- Frontmatter validation enforced by Zod schemas

### Styling & Theming
- Tailwind CSS with custom theme in `src/styles/global.css`
- Code blocks use Expressive Code with Catppuccin themes
- Responsive design with semantic HTML
- Custom fonts loaded via Vite plugin

### Custom Plugins
- `src/plugins/remark-reading-time.ts` - Calculates reading time
- `src/plugins/remark-admonitions.ts` - Adds custom admonition blocks

## Development Notes

- Search functionality only works after running both `build` and `postbuild`
- Uses Biome for linting/formatting with custom config in `biome.json`
- Images should be optimized as .webp when possible
- The site is configured for deployment at https://blog.king-11.dev