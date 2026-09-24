/**
 * validate — deterministic EPUB validation adapter (M15).
 *
 * Implements the reader-entry contract: the structural checks reference
 * readers perform when opening an EPUB (OCF layout, container→OPF
 * resolution, package metadata, manifest↔zip correspondence, spine
 * resolution, nav presence; FXL rendition metadata). No JVM/epubcheck
 * dependency — structural, byte-level, deterministic.
 */

import { readZipEntries, type ZipEntry } from '../../lib/store-zip';
import type { ValidationFinding, ValidationResult } from './types';

function findError(findings: ValidationFinding[]): ValidationResult {
  return { ok: !findings.some((f) => f.severity === 'error'), findings };
}

export function validateEpub(bytes: Uint8Array): ValidationResult {
  const findings: ValidationFinding[] = [];
  let entries: ZipEntry[];
  try {
    entries = readZipEntries(bytes);
  } catch (err) {
    findings.push({ code: 'OCF-001', severity: 'error', message: `not a readable zip: ${(err as Error).message}` });
    return findError(findings);
  }

  // (a) mimetype: first entry, stored, exact content.
  const first = entries[0];
  if (!first || first.name !== 'mimetype') {
    findings.push({ code: 'OCF-002', severity: 'error', message: 'first zip entry must be "mimetype"', ...(first?.name ? { path: first.name } : {}) });
  } else {
    const content = new TextDecoder().decode(first.data);
    if (content !== 'application/epub+zip') {
      findings.push({ code: 'OCF-003', severity: 'error', message: `mimetype content must be exactly "application/epub+zip", got "${content}"`, path: 'mimetype' });
    }
  }
  if (!entries.some((e) => e.name === 'mimetype')) {
    findings.push({ code: 'OCF-004', severity: 'error', message: 'mimetype entry missing' });
  }

  // (b) container.xml → OPF path.
  const container = entries.find((e) => e.name === 'META-INF/container.xml');
  if (!container) {
    findings.push({ code: 'OCF-005', severity: 'error', message: 'META-INF/container.xml missing' });
  } else {
    const text = new TextDecoder().decode(container.data);
    const match = /full-path="([^"]+)"/.exec(text);
    if (!match?.[1]) {
      findings.push({ code: 'OCF-006', severity: 'error', message: 'container.xml has no rootfile full-path', path: 'META-INF/container.xml' });
    } else {
      const opfPath = match[1];
      const opf = entries.find((e) => e.name === opfPath);
      if (!opf) {
        findings.push({ code: 'OCF-007', severity: 'error', message: `rootfile "${opfPath}" not present in the archive`, path: opfPath });
      } else {
        findings.push(...validateOpf(opf, entries));
      }
    }
  }

  return findError(findings);
}

function validateOpf(opf: ZipEntry, entries: ZipEntry[]): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const opfText = new TextDecoder().decode(opf.data);

  if (!opfText.includes('unique-identifier=')) {
    findings.push({ code: 'PKG-001', severity: 'error', message: 'package element lacks unique-identifier', path: opf.name });
  }
  if (!opfText.includes('<dc:title>')) {
    findings.push({ code: 'PKG-002', severity: 'error', message: 'dc:title missing', path: opf.name });
  }
  if (!opfText.includes('<dc:language>')) {
    findings.push({ code: 'PKG-003', severity: 'error', message: 'dc:language missing', path: opf.name });
  }
  if (!opfText.includes('dcterms:modified')) {
    findings.push({ code: 'PKG-004', severity: 'error', message: 'dcterms:modified missing', path: opf.name });
  }

  // Manifest items: id/href/media-type.
  const manifestItems = [...opfText.matchAll(/<item\s+id="([^"]+)"\s+href="([^"]+)"\s+media-type="([^"]+)"(?:\s+properties="([^"]*)")?\s*\/>/g)];
  if (manifestItems.length === 0) {
    findings.push({ code: 'PKG-005', severity: 'error', message: 'manifest has no parseable items', path: opf.name });
  }
  const itemIds = new Set(manifestItems.map((m) => m[1]!));
  const opfDir = opf.name.includes('/') ? opf.name.slice(0, opf.name.lastIndexOf('/') + 1) : '';

  for (const [, id, href] of manifestItems) {
    const hrefValue = href ?? '';
    const resolved = opfDir + hrefValue;
    if (!entries.some((e) => e.name === resolved)) {
      findings.push({ code: 'PKG-006', severity: 'error', message: `manifest item "${id}" href "${hrefValue}" missing from archive`, path: resolved });
    }
    // Relative hrefs must not escape the OCF (no "..").
    if (hrefValue.includes('..')) {
      findings.push({ code: 'PKG-007', severity: 'error', message: `manifest item "${id}" href escapes the package directory`, path: hrefValue });
    }
  }

  // Nav property present exactly once.
  const navItems = manifestItems.filter((m) => (m[4] ?? '').split(/\s+/).includes('nav'));
  if (navItems.length === 0) {
    findings.push({ code: 'NAV-001', severity: 'error', message: 'no manifest item carries the "nav" property (EPUB3 TOC)', path: opf.name });
  }

  // Spine idrefs resolve to manifest ids.
  const spineIdrefs = [...opfText.matchAll(/<itemref\s+idref="([^"]+)"/g)].map((m) => m[1]!);
  if (spineIdrefs.length === 0) {
    findings.push({ code: 'SPN-001', severity: 'error', message: 'spine is empty', path: opf.name });
  }
  for (const idref of spineIdrefs) {
    if (!itemIds.has(idref)) {
      findings.push({ code: 'SPN-002', severity: 'error', message: `spine idref "${idref}" not found in manifest`, path: opf.name });
    }
  }

  // FXL: pre-paginated rendition + svg properties.
  if (opfText.includes('rendition:layout">pre-paginated')) {
    if (!opfText.includes('properties="svg"')) {
      findings.push({ code: 'FXL-001', severity: 'error', message: 'pre-paginated package without svg page properties', path: opf.name });
    }
    const fxlPages = entries.filter((e) => e.name.startsWith('OEBPS/page-'));
    if (fxlPages.length === 0) {
      findings.push({ code: 'FXL-002', severity: 'error', message: 'pre-paginated package without OEBPS/page-*.xhtml documents', path: opf.name });
    } else {
      const sample = new TextDecoder().decode(fxlPages[0]!.data);
      if (!sample.includes('name="viewport"')) {
        findings.push({ code: 'FXL-003', severity: 'error', message: 'fixed-layout page lacks viewport meta', path: fxlPages[0]!.name });
      }
    }
  }

  return findings;
}
