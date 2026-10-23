import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/layout';
import { ErrorState, InlineError, ListSkeleton } from '@/components/ui/states';
import { AppText } from '@/components/ui/text';
import { Colors, Motion, Radius, Spacing } from '@/constants/theme';
import type { ReceiptRow } from '@/features/repairs/api';
import { ReceiptView } from '@/features/receipts/components/receipt-view';
import { canShareReceipt, printReceipt, shareReceiptPdf } from '@/features/receipts/export';
import { parseReceiptSnapshot } from '@/features/receipts/snapshot';
import { useResource } from '@/hooks/use-resource';
import { AppError, unwrap } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

async function loadReceipt(id: string) {
  const row = unwrap<ReceiptRow>(await supabase.from('receipts').select('*').eq('id', id).single());
  const snapshot = row ? parseReceiptSnapshot(row.snapshot) : null;
  if (!row || !snapshot) throw new AppError('unknown', 'This receipt could not be read.');
  return { row, snapshot };
}

const isCancel = (err: unknown) => /cancel|dismiss|abort/i.test(String((err as Error)?.message ?? err));

export default function ReceiptScreen() {
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const receipt = useResource(() => loadReceipt(id), [id]);
  const [busy, setBusy] = useState<'print' | 'share' | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [shareable, setShareable] = useState(false);

  useEffect(() => {
    canShareReceipt().then(setShareable).catch(() => setShareable(false));
  }, []);

  if (receipt.loading) {
    return (
      <Screen>
        <ListSkeleton rows={2} />
      </Screen>
    );
  }
  if (!receipt.data) {
    return <Screen>{receipt.error ? <ErrorState error={receipt.error} onRetry={receipt.reload} /> : null}</Screen>;
  }

  const { row, snapshot } = receipt.data;

  // Export only reads the stored snapshot; failures never create payments or receipts.
  const run = async (kind: 'print' | 'share') => {
    if (busy) return;
    setBusy(kind);
    setExportError(null);
    try {
      if (kind === 'print') await printReceipt(snapshot);
      else await shareReceiptPdf(snapshot);
    } catch (err) {
      if (!isCancel(err)) {
        setExportError(
          kind === 'print'
            ? 'Printing failed. Check the printer and try again. The receipt is already saved.'
            : 'Could not create the PDF. Try again. The receipt is already saved.',
        );
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen
      footer={
        <View style={styles.footer}>
          <Button label="Print" icon="print-outline" variant="outline" onPress={() => run('print')} loading={busy === 'print'} disabled={busy === 'share'} style={styles.flex} testID="receipt-print" />
          {shareable ? (
            <Button label="Share PDF" icon="share-outline" onPress={() => run('share')} loading={busy === 'share'} disabled={busy === 'print'} style={styles.flex} testID="receipt-share" />
          ) : null}
        </View>
      }>
      {fresh ? (
        <View style={styles.saved} accessibilityRole="alert">
          <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
          <AppText variant="body" style={styles.flex}>
            Payment saved and receipt {row.receipt_number} issued.
          </AppText>
        </View>
      ) : null}
      <InlineError message={exportError} />
      <Animated.View entering={FadeIn.duration(Motion.slow).reduceMotion(ReduceMotion.System)}>
        <ReceiptView snapshot={snapshot} />
      </Animated.View>
      {Platform.OS === 'web' ? (
        <AppText variant="caption" tone="tertiary" style={styles.center}>
          To save a PDF in the browser, choose Print and then “Save as PDF”.
        </AppText>
      ) : null}
      <Button
        label="Back to repair"
        variant="ghost"
        icon="arrow-back"
        onPress={() => (router.canGoBack() ? router.back() : router.replace({ pathname: '/repairs/[id]', params: { id: row.repair_id } }))}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  footer: { flexDirection: 'row', gap: Spacing.md, width: '100%', maxWidth: 640 },
  saved: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.successSoft },
});
