import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { fileURLToPath } from 'node:url'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  /*
    Where the site is mounted. `/` for a domain apex or a project deployed at
    the root, which is the normal case.

    If you host under a sub-path — `example.com/form/`, or a GitHub Pages
    project site at `user.github.io/repo/` — set `PUBLIC_BASE_PATH` in a
    `.env.production` file (see `.env.example`) and rebuild. It has to be the
    single value used for both the asset URLs here and the router's `basename`
    in `main.tsx`; `main.tsx` reads `import.meta.env.BASE_URL`, so Vite keeps
    the two in step and there is no second place to forget.

    Do not "solve" this with `base: './'`. Relative asset URLs look portable,
    but they resolve against the *document* URL, so on a deep route like
    `/learn/protein` the browser would ask for `/learn/assets/index.js` and
    404. An absolute path rooted at a known base is the only thing that
    survives deep links.
  */
  const env = loadEnv(mode, process.cwd(), '')
  const base = env.PUBLIC_BASE_PATH || '/'

  return {
    base,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
    },
    build: {
      /*
        Long-lived, content-hashed filenames, so a deploy is a pure cache swap
        and returning visitors never re-download an unchanged chunk.
      */
      assetsDir: 'assets',
      sourcemap: false,
      target: 'es2022',
    },
  }
})
