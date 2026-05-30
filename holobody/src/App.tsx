import { Suspense } from 'react'
import Scene from './Scene'
import HoloBody from './HoloBody'
import PlaceholderBody from './PlaceholderBody'

export default function App() {
  return (
    <>
      <Scene>
        <Suspense fallback={<PlaceholderBody />}>
          <HoloBody url="/models/standard-male-figure.dae" />
        </Suspense>
      </Scene>
      <div className="hud">
        <div className="title">HOLOBODY</div>
        <div className="sub">standard male figure</div>
      </div>
    </>
  )
}
