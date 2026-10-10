import { LegalPage } from '@/components/LegalPage';
import { DeleteAccountBox } from '@/components/DeleteAccountBox';

export const metadata = { title: 'Delete account — KAP' };
export default function DeleteAccountPage() {
  return (
    <LegalPage doc="deletion">
      <DeleteAccountBox />
    </LegalPage>
  );
}
