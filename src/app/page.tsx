import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6">
      <div className="text-center max-w-md w-full">
        <div className="text-6xl mb-4">🏷️</div>
        <h1 className="text-4xl font-black text-white mb-2">IntelliStamp</h1>
        <p className="text-zinc-400 mb-8">Smart loyalty stamps for modern businesses</p>

        <div className="flex flex-col gap-3">
          <Link
            href="/onboarding"
            className="w-full bg-yellow-400 text-black font-bold py-4 px-6 rounded-xl text-lg hover:bg-yellow-300 transition-colors"
          >
            🏪 I&apos;m a Business Owner
          </Link>
          <Link
            href="/cards"
            className="w-full border-2 border-zinc-700 text-white font-bold py-4 px-6 rounded-xl text-lg hover:border-yellow-400 hover:text-yellow-400 transition-colors"
          >
            📱 View My Loyalty Cards
          </Link>
        </div>

        <p className="text-zinc-600 text-xs mt-8">
          Powered by IntelliStamp · stamp.intellicallabs.com
        </p>
      </div>
    </main>
  )
}
