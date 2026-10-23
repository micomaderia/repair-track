import { useState } from 'react';
import { router } from 'expo-router';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { InlineError } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { toAppError } from '@/lib/errors';
import { setArchived, type ArchiveKind } from '../api';

export function ArchiveAction({ kind, id, archived, onDone }: {
  kind: ArchiveKind; id: string; archived?: boolean; onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const action = archived ? 'Restore' : 'Archive';
  const save = async () => {
    setBusy(true); setError(null);
    try {
      await setArchived(kind, id, !archived);
      toast.show(`${kind === 'repair' ? 'Repair' : 'Customer'} ${archived ? 'restored' : 'archived'}`);
      setOpen(false);
      if (onDone) onDone();
      else router.replace(kind === 'repair' ? '/repairs' : '/customers');
    } catch (e) { setError(toAppError(e).message); }
    finally { setBusy(false); }
  };
  return <>
    <Button label={`${action} ${kind}`} icon={archived ? 'refresh-outline' : 'archive-outline'} variant="ghost" compact
      onPress={() => { setError(null); setOpen(true); }} />
    <Sheet visible={open} title={`${action} ${kind}?`} onClose={() => setOpen(false)} busy={busy}
      description={archived ? 'This record will return to your normal lists.' : 'Hide this record from normal lists. Payment, receipt, and repair history stay intact. You can restore it from Settings.'}>
      <InlineError message={error} />
      <Button label={`${action} ${kind}`} loading={busy} onPress={save} />
      <Button label="Keep as is" variant="outline" disabled={busy} onPress={() => setOpen(false)} />
    </Sheet>
  </>;
}
