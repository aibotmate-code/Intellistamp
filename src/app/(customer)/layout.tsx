import GlobalTopbar from '@/components/layout/GlobalTopbar'

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GlobalTopbar />
      {children}
    </>
  )
}
