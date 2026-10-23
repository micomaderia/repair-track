import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import type { ReceiptSnapshot } from './snapshot';
import { renderReceiptHtml } from './template';

const LOGO = require('@/assets/images/logo/repairtrack-logoname.png');

let cachedLogo: string | null | undefined;

/** Inline data URI on native (iOS WKWebView cannot load local asset URLs). */
async function logoSource(): Promise<string | null> {
  if (cachedLogo !== undefined) return cachedLogo;
  try {
    const asset = Asset.fromModule(LOGO);
    if (Platform.OS === 'web') {
      cachedLogo = asset.uri;
    } else {
      await asset.downloadAsync();
      const base64 = await new File(asset.localUri ?? asset.uri).base64();
      cachedLogo = `data:image/png;base64,${base64}`;
    }
  } catch {
    cachedLogo = null; // Receipt still renders with a text wordmark.
  }
  return cachedLogo;
}

export async function receiptHtml(snapshot: ReceiptSnapshot): Promise<string> {
  return renderReceiptHtml(snapshot, await logoSource());
}

/**
 * Print/share only read the stored snapshot. A failure here never touches
 * payments or receipts, so retrying is always safe.
 */
export async function printReceipt(snapshot: ReceiptSnapshot): Promise<void> {
  const html = await receiptHtml(snapshot);
  if (Platform.OS === 'web') {
    printHtmlOnWeb(html);
    return;
  }
  await Print.printAsync({ html });
}

export async function canShareReceipt(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  return Sharing.isAvailableAsync();
}

export async function shareReceiptPdf(snapshot: ReceiptSnapshot): Promise<void> {
  const html = await receiptHtml(snapshot);
  const { uri } = await Print.printToFileAsync({ html });
  const named = new File(uri).parentDirectory;
  let shareUri = uri;
  try {
    const target = new File(named, `${snapshot.receiptNumber}.pdf`);
    if (target.exists) target.delete();
    new File(uri).move(target);
    shareUri = target.uri;
  } catch {
    // Keep the generated name if renaming fails.
  }
  await Sharing.shareAsync(shareUri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: `Share receipt ${snapshot.receiptNumber}`,
  });
}

/** Browser print of the receipt document itself (not the app page). */
function printHtmlOnWeb(html: string) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
  document.body.appendChild(frame);
  const doc = frame.contentWindow?.document;
  if (!doc || !frame.contentWindow) {
    frame.remove();
    throw new Error('Printing is not available in this browser.');
  }
  doc.open();
  doc.write(html);
  doc.close();
  const win = frame.contentWindow;
  const run = () => {
    win.focus();
    win.print();
    setTimeout(() => frame.remove(), 1000);
  };
  const img = doc.querySelector('img');
  if (img && !img.complete) {
    img.addEventListener('load', run, { once: true });
    img.addEventListener('error', run, { once: true });
  } else {
    run();
  }
}
