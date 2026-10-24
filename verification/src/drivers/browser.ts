import type { Browser, BrowserContext, Page } from 'playwright';
import { chromium } from 'playwright';
import type { RunContext } from '../evidence/store.ts';

export interface BrowserDriverConfig {
  headless?: boolean;
  baseURL: string;
  traceName?: string;
}

export interface ConsoleCapture {
  consoleErrors: string[];
  pageErrors: string[];
}

/**
 * Playwright-backed browser driver. Collects observations (console/page errors,
 * screenshots, trace) — semantic PASS/FAIL stays in the oracles.
 */
export class BrowserDriver {
  private browser?: Browser;
  private context?: BrowserContext;
  page?: Page;
  readonly console: ConsoleCapture = { consoleErrors: [], pageErrors: [] };
  private readonly run: RunContext;
  private readonly config: BrowserDriverConfig;

  constructor(run: RunContext, config: BrowserDriverConfig) {
    this.run = run;
    this.config = config;
  }

  async launch(): Promise<void> {
    this.browser = await chromium.launch({ headless: this.config.headless ?? true });
    this.context = await this.browser.newContext({
      baseURL: this.config.baseURL,
      acceptDownloads: true,
    });
    await this.context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    this.page = await this.context.newPage();
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') this.console.consoleErrors.push(msg.text());
    });
    this.page.on('pageerror', (err) => {
      this.console.pageErrors.push(String(err));
    });
    await this.run.emitEvent('browser.launched', { baseURL: this.config.baseURL });
  }

  async goto(path: string): Promise<void> {
    await this.page?.goto(path, { waitUntil: 'networkidle' });
  }

  async screenshot(name: string): Promise<void> {
    if (!this.page) return;
    const path = this.run.dir + '/browser/' + name;
    await this.page.screenshot({ path, fullPage: true });
    await this.run.registerFile(`browser/${name}`, path);
  }

  async captureConsole(name = 'browser.console.json'): Promise<void> {
    await this.run.writeJson(name, this.console);
  }

  /**
   * Capture the DOM state of the current page as an evidence artifact
   * (`browser.<step>.dom.json`). Drivers collect, oracles decide (browser-content).
   */
  async captureDom(name: string): Promise<void> {
    if (!this.page) return;
    const dom = await this.page.evaluate(() => {
      const text = (document.body?.innerText ?? '').replace(/\s+/g, ' ').trim();
      return {
        url: location.href,
        title: document.title,
        h1s: Array.from(document.querySelectorAll('h1')).map((el) => (el.textContent ?? '').trim()),
        h2s: Array.from(document.querySelectorAll('h2')).map((el) => (el.textContent ?? '').trim()),
        links: Array.from(document.querySelectorAll('a[href]')).map((el) => el.getAttribute('href') ?? ''),
        bodyText: text.slice(0, 20000),
      };
    });
    await this.run.writeJson(name, dom);
  }

  /** Save trace + screenshot on failure (VAH-010). */
  async captureFailureEvidence(prefix: string): Promise<void> {
    if (!this.context) return;
    const tracePath = this.run.dir + `/browser/${prefix}-trace.zip`;
    await this.context.tracing.stop({ path: tracePath });
    await this.run.registerFile(`browser/${prefix}-trace.zip`, tracePath);
    await this.screenshot(`${prefix}-failure.png`);
    await this.captureConsole(`browser/${prefix}-console.json`);
  }

  async close(ok: boolean): Promise<void> {
    try {
      if (this.context && ok) {
        // Success runs keep the trace as well: evidence > compactness.
        const tracePath = this.run.dir + '/browser/success-trace.zip';
        await this.context.tracing.stop({ path: tracePath });
        await this.run.registerFile('browser/success-trace.zip', tracePath);
      }
      await this.browser?.close();
    } catch {
      // closing must never mask the verdict
    }
    await this.run.emitEvent('browser.closed', { ok });
  }
}

/** Managed preview server for the Control Plane (started/stopped by the runner). */
export class PreviewServer {
  private child?: import('node:child_process').ChildProcess;

  async start(repoRoot: string, port = 4173): Promise<void> {
    const { spawn } = await import('node:child_process');
    this.child = spawn('pnpm', ['preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], {
      cwd: join2(repoRoot, 'control-plane'),
      env: {
        PATH: process.env.PATH ?? '',
        HOME: process.env.HOME ?? '',
        // The preview server must serve the build, never re-validate the
        // install: a dependency-status probe fails under a minimal
        // environment and would kill the server before it binds.
        npm_config_verify_deps_before_run: 'false',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    });
    let tail = '';
    const capture = (chunk: Buffer) => {
      tail = (tail + chunk.toString('utf8')).slice(-2000);
    };
    this.child.stdout?.on('data', capture);
    this.child.stderr?.on('data', capture);
    let spawnError = '';
    this.child.on('error', (err: Error) => {
      spawnError = String(err);
    });
    let exitInfo = '';
    this.child.on('exit', (code, signal) => {
      exitInfo = `exited code=${code} signal=${signal}`;
    });
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/`);
        if (res.ok) return;
      } catch {
        // not ready yet
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    const detail = [spawnError && `spawn error: ${spawnError}`, exitInfo && exitInfo, tail && `output tail: ${tail}`]
      .filter(Boolean)
      .join(' | ');
    throw new Error(`preview server did not become ready on port ${port}${detail ? ` | ${detail}` : ''}`);
  }

  async stop(): Promise<void> {
    if (this.child?.pid) {
      try {
        process.kill(-this.child.pid, 'SIGTERM');
      } catch {
        // already gone
      }
    }
  }
}

function join2(a: string, b: string): string {
  return a.endsWith('/') ? `${a}${b}` : `${a}/${b}`;
}
