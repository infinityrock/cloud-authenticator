import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/** Proxies Google's generate_204 so the browser can read the Date header for clock sync. */
function googleTimeSyncPlugin(): Plugin {
  const handler = async (
    _req: unknown,
    res: {
      setHeader: (k: string, v: string) => void
      statusCode: number
      end: (body: string) => void
    },
  ) => {
    try {
      const response = await fetch('https://www.google.com/generate_204', {
        method: 'HEAD',
      })
      const date = response.headers.get('date')
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Cache-Control', 'no-store')
      if (!date) {
        res.statusCode = 502
        res.end(JSON.stringify({ error: 'No Date header from Google' }))
        return
      }
      res.end(
        JSON.stringify({
          date,
          serverTime: new Date(date).getTime(),
        }),
      )
    } catch (error) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(
        JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
        }),
      )
    }
  }

  const mount = (path: string, server: {
    middlewares: {
      use: (
        route: string,
        fn: (
          req: { method?: string; url?: string },
          res: {
            setHeader: (k: string, v: string) => void
            statusCode: number
            end: (body: string) => void
          },
          next: () => void,
        ) => void,
      ) => void
    }
  }) => {
    server.middlewares.use(path, (req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        next()
        return
      }
      void handler(req, res)
    })
  }

  return {
    name: 'google-time-sync',
    configureServer(server) {
      mount('/api/google-time', server)
      mount('/cloud-authenticator/api/google-time', server)
    },
    configurePreviewServer(server) {
      mount('/api/google-time', server)
      mount('/cloud-authenticator/api/google-time', server)
    },
  }
}

// Project Pages site: https://<user>.github.io/cloud-authenticator/
export default defineConfig({
  base: '/cloud-authenticator/',
  plugins: [react(), googleTimeSyncPlugin()],
})
