import React, { useEffect, useState } from 'react'
import { AbsoluteFill, Sequence, continueRender, delayRender } from 'remotion'
import { HookSceneV2 }      from '../scenes/v2/HookSceneV2'
import { DashboardSceneV2 } from '../scenes/v2/DashboardSceneV2'
import { QRSceneV2 }        from '../scenes/v2/QRSceneV2'
import { ScanSceneV2 }      from '../scenes/v2/ScanSceneV2'
import { StampSceneV2 }     from '../scenes/v2/StampSceneV2'
import { RewardSceneV2 }    from '../scenes/v2/RewardSceneV2'
import { MerchantSceneV2 }  from '../scenes/v2/MerchantSceneV2'
import { BrandingSceneV2 }  from '../scenes/v2/BrandingSceneV2'
import { FinalSceneV2 }     from '../scenes/v2/FinalSceneV2'
import { C }                from '../components/colors'

function useFonts() {
  const [handle] = useState(() => delayRender('Loading Google Fonts'))

  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600;700;900&family=Barlow+Condensed:wght@500;600;700&display=swap'
    document.head.appendChild(link)

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

// 30 fps: seconds → frames
const S = (sec: number) => Math.round(sec * 30)

// V2 timing — 50 seconds (1500 frames)
//  0-  4s  Hook         (120f)
//  4- 11s  Dashboard    (210f)
// 11- 17s  QR / Kiosk   (180f)
// 17- 23s  Customer Scan(180f)
// 23- 30s  Stamp        (210f)
// 30- 36s  Reward       (180f)
// 36- 41s  Merchant     (150f)
// 41- 46s  Branding     (150f)
// 46- 50s  Final        (120f)

export function IntelliStampDemoV2() {
  useFonts()

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {/* Scene 1: Hook */}
      <Sequence from={S(0)} durationInFrames={S(5)}>
        <AbsoluteFill>
          <HookSceneV2 />
        </AbsoluteFill>
      </Sequence>

      {/* Scene 2: Dashboard */}
      <Sequence from={S(4)} durationInFrames={S(8)}>
        <AbsoluteFill>
          <DashboardSceneV2 />
        </AbsoluteFill>
      </Sequence>

      {/* Scene 3: QR / Kiosk */}
      <Sequence from={S(11)} durationInFrames={S(7)}>
        <AbsoluteFill>
          <QRSceneV2 />
        </AbsoluteFill>
      </Sequence>

      {/* Scene 4: Customer Scan */}
      <Sequence from={S(17)} durationInFrames={S(7)}>
        <AbsoluteFill>
          <ScanSceneV2 />
        </AbsoluteFill>
      </Sequence>

      {/* Scene 5: Stamp animation */}
      <Sequence from={S(23)} durationInFrames={S(8)}>
        <AbsoluteFill>
          <StampSceneV2 />
        </AbsoluteFill>
      </Sequence>

      {/* Scene 6: Rewards / Milestones */}
      <Sequence from={S(30)} durationInFrames={S(7)}>
        <AbsoluteFill>
          <RewardSceneV2 />
        </AbsoluteFill>
      </Sequence>

      {/* Scene 7: Merchant dashboard */}
      <Sequence from={S(36)} durationInFrames={S(6)}>
        <AbsoluteFill>
          <MerchantSceneV2 />
        </AbsoluteFill>
      </Sequence>

      {/* Scene 8: Branding */}
      <Sequence from={S(41)} durationInFrames={S(6)}>
        <AbsoluteFill>
          <BrandingSceneV2 />
        </AbsoluteFill>
      </Sequence>

      {/* Scene 9: Final */}
      <Sequence from={S(46)} durationInFrames={S(4) + 1}>
        <AbsoluteFill>
          <FinalSceneV2 />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  )
}
