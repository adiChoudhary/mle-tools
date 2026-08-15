// Flow repro — replicates real user interactions in a DOM
import { describe, it, expect, beforeEach } from 'vitest';
import { DataConverter } from '../DataConverter.js';
import { SampleDataGenerator } from '../SampleDataGenerator.js';
import { JsonFormatter } from '../JsonFormatter.js';

function makeEl(id: string) {
  const el = document.createElement('div');
  el.id = id;
  document.body.appendChild(el);
  return el;
}

function setVal(id: string, value: string) {
  const el = document.getElementById(id) as HTMLTextAreaElement | HTMLInputElement;
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function click(id: string) {
  (document.getElementById(id) as HTMLElement).click();
}

describe('JsonFormatter flow', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('beautify works end to end', async () => {
    const el = makeEl('jf-tool');
    const f = new JsonFormatter(el);
    await f.init();

    setVal('json-input', '{"name":"Alice","age":30}');
    click('beautify-btn');
    await new Promise((r) => setTimeout(r, 100));

    const out = document.getElementById('json-output')!.innerHTML;
    expect(out).toContain('Alice');
    expect(out).toContain('age');
    expect(out).toContain('\n'); // formatted
  });

  it('compare mode shows diff', async () => {
    const el = makeEl('jf-tool-cmp');
    const f = new JsonFormatter(el);
    await f.init();

    setVal('json-input', '{"a":1,"b":2}');
    click('compare-btn');
    await new Promise((r) => setTimeout(r, 10));
    expect(document.getElementById('compare-container')!.classList.contains('hidden')).toBe(false);

    setVal('json-compare-input', '{"a":1,"c":3}');
    click('run-compare-btn');
    await new Promise((r) => setTimeout(r, 100));

    const out = document.getElementById('json-output')!.innerHTML;
    expect(out).toContain('added');
    expect(out).toContain('removed');
    expect(out).toContain('b');
    expect(out).toContain('c');
  });

  it('escape/unescape round-trip', async () => {
    const el = makeEl('jf-tool-esc');
    const f = new JsonFormatter(el);
    await f.init();

    setVal('json-input', 'hello "world"\nline2');
    click('escape-btn');
    await new Promise((r) => setTimeout(r, 50));
    const escaped = (document.getElementById('json-output') as HTMLElement).textContent || '';
    expect(escaped).toContain('\\"');

    setVal('json-input', escaped.trim());
    click('unescape-btn');
    await new Promise((r) => setTimeout(r, 50));
    const unescaped = (document.getElementById('json-output') as HTMLElement).textContent || '';
    expect(unescaped).toContain('hello');
  });
});

describe('DataConverter flow', () => {
  beforeEach(() => { document.body.innerHTML = ''; });
  it('CSV -> JSON works end to end', async () => {
    const el = makeEl('dc-tool');
    const c = new DataConverter(el);
    await c.init();

    setVal('data-input', 'name,age,city\nAlice,30,New York\nBob,25,London');
    click('convert-btn');
    // conversion is async (dynamic import) — wait a tick
    await new Promise((r) => setTimeout(r, 100));

    const out = document.getElementById('data-output')!.innerHTML;
    console.log('DC CSV->JSON output:', out.slice(0, 300));
    expect(out).toContain('Alice');
    expect(out).toContain('New York');
  });

  it('JSON -> CSV works end to end', async () => {
    const el = makeEl('dc-tool-2');
    const c = new DataConverter(el);
    await c.init();

    click('mode-json-to-csv');
    await new Promise((r) => setTimeout(r, 10));
    setVal('data-input', '[{"name":"Alice","age":30},{"name":"Bob","age":25}]');
    click('convert-btn');
    await new Promise((r) => setTimeout(r, 100));

    const out = document.getElementById('data-output')!.innerHTML;
    console.log('DC JSON->CSV output:', out.slice(0, 300));
    expect(out).toContain('Alice');
    expect(out).toContain('name');
  });
});

describe('SampleDataGenerator flow', () => {
  beforeEach(() => { document.body.innerHTML = ''; });
  it('generate produces output', async () => {
    const el = makeEl('sdg-tool');
    const g = new SampleDataGenerator(el);
    g.init();
    await new Promise((r) => setTimeout(r, 10));

    click('sample-generate-btn');
    await new Promise((r) => setTimeout(r, 50));

    const out = (document.getElementById('sample-output') as HTMLTextAreaElement).value;
    console.log('SDG output:', out.slice(0, 200));
    expect(out.length).toBeGreaterThan(50);
  });
});
