import { Composition } from 'remotion'
import { IntelliStampDemo } from './compositions/IntelliStampDemo'

// 30fps, 1920×1080, 60 seconds = 1800 frames
const FPS = 30
const DURATION_SEC = 60
const FRAMES = FPS * DURATION_SEC

export function Root() {
  return (
    <>
      <Composition
        id="IntelliStampDemo"
        component={IntelliStampDemo}
        durationInFrames={FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ vertical: false }}
      />
      {/* 9:16 vertical variant — same composition, portrait canvas */}
      <Composition
        id="IntelliStampDemoVertical"
        component={IntelliStampDemo}
        durationInFrames={FRAMES}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ vertical: true }}
      />
    </>
  )
}
