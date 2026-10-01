/**
 * download — the single browser download trigger (REQ-DEI-1 dedup, cycle
 * debt-evidence-integrity). Five call sites previously carried private copies
 * of this exact blob→anchor→revoke pattern (two of them verbatim).
 *
 * Same behavior everywhere: create the blob, build an objectURL, click a
 * detached anchor, revoke the URL after 10 s (download start grace) and return
 * the objectURL so sinks that surface it (e.g. DownloadPlanSink.downloadUrl)
 * can keep doing so. Not a store-writer: no filesystem, no fetch, no state.
 */

export function triggerDownload(data: BlobPart, filename: string, mime: string): string {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Revoke after a short delay to allow the download to start
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return url;
}
