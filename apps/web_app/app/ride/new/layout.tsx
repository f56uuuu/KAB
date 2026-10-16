import { FeatureGate } from '@/components/FeatureGate';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <FeatureGate keys={['RIDE']}>{children}</FeatureGate>;
}
