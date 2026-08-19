import React, { useEffect, useState } from 'react'
import { AbsoluteFill, Sequence, continueRender, delayRender } from 'remotion'
import { HookScene }      from '../scenes/HookScene'
import { DashboardScene } from '../scenes/DashboardScene'
import { QRScene }        from '../scenes/QRScene'
import { ScanScene }      from '../scenes/ScanScene'
import { StampScene }     from '../scenes/StampScene'
import { RewardScene }    from '../scenes/RewardScene'
import { MerchantScene }  from '../scenes/MerchantScene'
import { BrandingScene }  from '../scenes/BrandingScene'
import { FinalScene }     from '../scenes/FinalScene'
import { C }              from '../components/colors'

// Loads Google Fonts (Bebas Neue + Barlow) used by the real IntelliStamp app.
// Uses delayRender so Remotion waits for fonts before rendering each frame.
function useFonts() {
  const [handle] = useState(() => delayRender('Loading Google Fonts'))

  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600;700;900&family=Barlow+Condensed:wght@500;600;700&display=swap'
    document.head.appendChild(link)

    // Wait for fonts to be ready
    const loaded = () => continueRender(handle)
    if (document.fonts) {
      document.fonts.ready.then(loaded).catch(loaded)
    } else {
      loaded()
    }

    return () => {
      document.head.removeChild(link)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

// 30 fps scene timestamps (seconds → frames)
const S = (sec: number) => Math.round(sec * 30)

// Scene boundaries
//  0- 4s  Hook
//  4-10s  Dashboard
// 10-16s  QR / Kiosk
// 16-23s  Customer Scan
// 23-31s  Stamp animation
// 31-39s  Reward / Milestones
// 39-47s  Merchant dashboard (customers tab)
// 47-54s  Branding
// 54-60s  Final

interface IntelliStampDemoProps {
  vertical?: boolean
}

// Crossfade overlay between scenes
function Fade({ startFrame, endFrame }: { startFrame: number; endFrame: number }) {
  return (
    <Sequence from={startFrame} durationInFrames={endFrame - startFrame}>
      <AbsoluteFill style={{ background: C.bg }} />
    </Sequence>
  )
}

export function IntelliStampDemo(_props: IntelliStampDemoProps) {
  useFonts()

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {/* Scene 1: Hook */}
      <Sequence from={S(0)} durationInFrames={S(5)}>
        <AbsoluteFill>
          <HookScene />
        </AbsoluteFill>
      </Sequence>

      {/* Scene 2: Dashboard */}
      <Sequence from={S(4)} durationInFrames={S(7)}>
        <AbsoluteFill>
          <DashboardScene />
        </AbsoluteFill>
      </Sequence>

      {/* Scene 3: QR / Kiosk */}
      <Sequence from={S(10)} durationInFrames={S(7)}>
        <AbsoluteFill>
          <QRScene />
        </AbsoluteFill>
      </Sequence>

      {/* Scene 4: Customer Scan */}
      <Sequence from={S(16)} durationInFrames={S(8)}>
        <AbsoluteFill>
          <ScanScene />
        </AbsoluteFill>
      </Sequence>

      {/* Scene 5: Stamp animation */}
      <Sequence from={S(23)} durationInFrames={S(9)}>
        <AbsoluteFill>
          <StampScene />
        </AbsoluteFill>
      </Sequence>

      {/* Scene 6: Rewards / Milestones */}
      <Sequence from={S(31)} durationInFrames={S(9)}>
        <AbsoluteFill>
          <RewardScene />
        </AbsoluteFill>
      </Sequence>

      {/* Scene 7: Merchant dashboard */}
      <Sequence from={S(39)} durationInFrames={S(9)}>
        <AbsoluteFill>
          <MerchantScene />
        </AbsoluteFill>
      </Sequence>

      {/* Scene 8: Branding */}
      <Sequence from={S(47)} durationInFrames={S(8)}>
        <AbsoluteFill>
          <BrandingScene />
        </AbsoluteFill>
      </Sequence>

      {/* Scene 9: Final */}
      <Sequence from={S(54)} durationInFrames={S(6) + 1}>
        <AbsoluteFill>
          <FinalScene />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  )
}
