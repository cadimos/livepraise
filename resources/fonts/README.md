# Fontes embutidas — Live Praise

Fontes servidas localmente via `GET /fonts/{familia}/{ficheiro}` (sem CDN em runtime).

## Licenças (OFL / Apache)

| Família | Licença | Origem |
|---------|---------|--------|
| Roboto | Apache 2.0 | Google Fonts (legado v0.0.8 + paridade) |
| Source Sans 3 | OFL 1.1 | [adobe-fonts/source-sans](https://github.com/adobe-fonts/source-sans) via `@fontsource/source-sans-3` |
| Lato | OFL 1.1 | [latofonts/lato-source](https://github.com/latofonts/lato-source) via `@fontsource/lato` |
| Open Sans | OFL 1.1 | [googlefonts/open-sans](https://github.com/googlefonts/open-sans) via `@fontsource/open-sans` |
| Noto Sans | OFL 1.1 | [notofonts/latin-greek-cyrillic](https://github.com/notofonts/latin-greek-cyrillic) via `@fontsource/noto-sans` |
| Literata | OFL 1.1 | [googlefonts/literata](https://github.com/googlefonts/literata) via `@fontsource/literata` |
| Merriweather | OFL 1.1 | [SorkinType/Merriweather](https://github.com/SorkinType/Merriweather) via `@fontsource/merriweather` |

Repor binários após alteração do manifesto: `node scripts/vendor-cad311-fonts.mjs` (requer `@fontsource/*` em `node_modules`).
