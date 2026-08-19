import { Composition } from 'remotion'
import { IntelliStampDemo } from './compositions/IntelliStampDemo'
import { IntelliStampDemoV2 } from './compositions/IntelliStampDemoV2'

// 30fps, 1920×1080
const FPS = 30

export function Root() {
  return (
    <>
      {/* V1 — 60 seconds */}
      <Composition
        id="IntelliStampDemo"
        component={IntelliStampDemo}
        durationInFrames={FPS * 60}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ vertical: false }}
      />
      {/* V1 9:16 vertical variant */}
      <Composition
        id="IntelliStampDemoVertical"
        component={IntelliStampDemo}
        durationInFrames={FPS * 60}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ vertical: true }}
      />
      {/* V2 — 50 seconds (tighter, larger UI, zoom-ins, cursor) */}
      <Composition
        id="IntelliStampDemoV2"
        component={IntelliStampDemoV2}
        durationInFrames={FPS * 50}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
    </>
  )
}
