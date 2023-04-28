import React from 'react'
import NextHead from 'next/head'
import { useSpring, animated } from 'react-spring'
import { createGlobalStyle } from 'styled-components'
import { ViewportProvider } from 'use-viewport'
import { WalletProvider } from 'lib/wallet'

const GlobalStyles = createGlobalStyle`
  @font-face {
    font-family: 'Monserrat';
    src: url('/fonts/Montserrat-Regular.ttf');
  }
  body,
  button {
    font-family: 'Montserrat', sans-serif;
  }
  body,
  html {
    margin: 0;
    padding: 0;
    overflow-y: hidden;
    font-size: 16px;
  }
`

export default function App({ Component, pageProps }) {
  const revealProps = useSpring({
    from: { opacity: 0, transform: 'scale3d(0.98, 0.98, 1)' },
    to: { opacity: 1, transform: 'scale3d(1, 1, 1)' },
  })

  return (
    <ViewportProvider>
      <animated.div style={revealProps}>
        <NextHead>
          <title>Bonded Token Converter</title>
          <meta name="viewport" content="viewport-fit=cover" />
        </NextHead>
        <GlobalStyles />
        <WalletProvider>
          <Component {...pageProps} />
        </WalletProvider>
      </animated.div>
    </ViewportProvider>
  )
}
