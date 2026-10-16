import { FeatureGate } from '@/components/FeatureGate';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <FeatureGate keys={['STORE_DEVICE']}>{children}</FeatureGate>;
}
