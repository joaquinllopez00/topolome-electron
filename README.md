# topolome

A local Electron app to visualize the results of a Claude / agentic categorization loop.
You define topics (categories) and a config; the agent checks your configured
sources on a loop and files items into the right category. This app is the window
into that.

## Stack

- Electron + electron-vite
- React 19 + react-router-dom (HashRouter)
- Tailwind v4 + shadcn-style components
- Mono / retro-esque dark terminal theme

## Data model (filesystem-backed)

Everything lives under `~/.topolome` so the agent can read/write it with plain
file tools:

```
~/.topolome/
  config.json            # { sources, tags, system_prompt, item_delimiter }
  categories/
    <category>/          # one directory per category  (Category = string)
      <item>.json        # one file per item: { title, description, archived }
```

The store is created and seeded on first launch.

## Routes

- `/` — overview + current config
- `/:category` — items filed into that category

## Components

`CategoryList`, `Category`, `CategoryItemList`, `CategoryItem`, `AddCategoryButton`

## Develop

```bash
npm install
npm run dev        # launches the Electron app with HMR
npm run build      # production build
npm run typecheck
```

## Not yet built

The agentic loop itself. This is the visualization/scaffold layer — the loop will
just write JSON files into `~/.topolome/categories/<category>/`.
