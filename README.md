# Soothia

[![CI](https://github.com/shrooms08/soothia/actions/workflows/ci.yml/badge.svg)](https://github.com/shrooms08/soothia/actions/workflows/ci.yml)

**Call any match before kickoff. Proven on Sui, remembered on Walrus.**

Soothia is a Chrome extension with a small floating orb on every page. It reads match pages and articles, and lets you make a call on what it finds.

## Total Recall

Each call is saved to Walrus Memory and its hash is committed on Sui mainnet before kickoff. After the match, the result is read from ESPN and your record is scored. Full docs are coming.

## Repo layout

- `extension/`: the Chrome extension
- `worker/`: the API Worker (`/detect`, `/recall/*`, `/stats`)
- `move/soothia_recall/`: the Sui Move package for commits
- `site/`: the landing page
- `scripts/`: packaging and asset scripts

## Commands

- Install everything: `npm ci` at the root, then in `extension`, `worker` and `scripts`
- Tests: `npm test`
- Typecheck: `npm run typecheck`
- Build the extension zip: `npm run package-extension --prefix scripts`

## License

MIT. See [LICENSE](LICENSE). Music license in [LICENSE-music.txt](LICENSE-music.txt).
