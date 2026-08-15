/**
 * Client-side tool loader — convenience wrapper for hydrating BaseTool
 * subclasses inside Astro island scripts.
 *
 * Usage in a tool page (script define:island or regular script):
 *
 *   import { initTool } from '../../utils/tool-loader.ts';
 *   import { JsonFormatter } from './JsonFormatter.ts';
 *
 *   initTool('json-formatter', JsonFormatter, {
 *     rootElement: document.getElementById('json-tool-root')!
 *   });
 *
 * The loader:
 *  - Waits for the element to become visible (IntersectionObserver)
 *  - Instantiates the tool class
 *  - Calls tool.onMount() → tool.init()
 *  - On page unload, calls tool.dispose()
 */
import type { BaseTool } from './tool';
import { hydrateOnVisible } from './visibility';
import { registerTool } from './registry';

/**
 * Options passed to initTool.
 */
export interface InitToolOptions {
  /** The DOM element that the tool will use */
  rootElement: HTMLElement;

  /** Max memory in bytes (default: 50MB) */
  maxMemoryBytes?: number;

  /** Worker script URL (default: data-processor.ts) */
  workerScript?: string;

  /** Tool metadata for auto-registration */
  metadata?: {
    name: string;
    description: string;
    icon: string;
    keywords?: string;
  };
}

/**
 * Initialize a tool with progressive enhancement (visibility-based hydration).
 * Registers the tool in the global registry and hydrates it when visible.
 */
export function initTool<T extends BaseTool>(
  toolId: string,
  ToolClass: new (config: { rootElement: HTMLElement }) => T,
  options: InitToolOptions
): void {
  // Register tool metadata
  if (options.metadata) {
    registerTool({
      id: toolId,
      name: options.metadata.name,
      description: options.metadata.description,
      icon: options.metadata.icon,
      keywords: options.metadata.keywords
    });
  }

  // Hydrate on visibility
  const tool = new ToolClass({ rootElement: options.rootElement });

  const dispose = hydrateOnVisible(options.rootElement, tool);

  // Clean up on page unload
  window.addEventListener('unload', () => {
    dispose();
  });
}
