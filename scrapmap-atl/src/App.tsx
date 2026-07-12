import { AppProvider, useApp } from './context/AppContext'
import TabBar from './components/TabBar'
import SignInSheet from './components/SignInSheet'
import NamePromptSheet from './components/NamePromptSheet'
import OnboardingOverlay from './components/OnboardingOverlay'
import Home from './screens/Home'
import Groups from './screens/Groups'
import Learn from './screens/Learn'
import Dropoffs from './screens/Dropoffs'
import PartnerDashboard from './screens/PartnerDashboard'

const isPartnerView = new URLSearchParams(window.location.search).has('partner')

function Loading() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="loading-dots flex gap-1.5">
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}

function Shell() {
  const { tab, loading, notice } = useApp()

  if (isPartnerView) {
    return (
      <div className="app-bg relative mx-auto flex h-dvh max-w-[640px] flex-col shadow-2xl">
        <main className="flex-1 overflow-y-auto">{loading ? <Loading /> : <PartnerDashboard />}</main>
      </div>
    )
  }

  return (
    <div className="app-bg relative mx-auto flex h-dvh max-w-[420px] flex-col shadow-2xl">
      <main className="flex-1 overflow-y-auto pb-24">
        {loading ? (
          <Loading />
        ) : (
          <div key={tab} className="anim-screen">
            {tab === 'home' && <Home />}
            {tab === 'groups' && <Groups />}
            {tab === 'learn' && <Learn />}
            {tab === 'dropoffs' && <Dropoffs />}
          </div>
        )}
      </main>
      <TabBar />
      {notice ? (
        <div className="pointer-events-none absolute inset-x-4 top-3 z-[1100]">
          <div className="anim-toast rounded-2xl border border-white/20 bg-gray-900/92 px-4 py-3 text-sm font-medium text-white shadow-xl backdrop-blur">
            {notice}
          </div>
        </div>
      ) : null}
      <SignInSheet />
      <NamePromptSheet />
      <OnboardingOverlay />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}
