import type { AppProps } from 'next/app'
import Layout from '../components/Layout'
import { useRouter } from 'next/router'
import '../styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()
  
  // Páginas que no necesitan layout
  const noLayoutPages = ['/login']
  const showLayout = !noLayoutPages.includes(router.pathname)

  if (showLayout) {
    return (
      <Layout>
        <Component {...pageProps} />
      </Layout>
    )
  }

  return <Component {...pageProps} />
}