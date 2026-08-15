import type { BaseTool } from './tool';

/**
 * Metadata for a registered tool.
 */
export interface ToolMetadata {
  /** Unique identifier (used in routes: /tools/<id>) */
  id: string;

  /** Display name shown in navigation */
  name: string;

  /** One-line description for the landing page */
  description: string;

  /** Emoji icon for the tool card */
  icon: string;

  /** SEO keywords */
  keywords?: string;

  /** Route path (auto-derived from id if not specified) */
  path?: string;
}

/**
 * A registered tool entry.
 */
export interface RegisteredTool extends ToolMetadata {
  /** Optional: class constructor for server-side checks */
  toolClass?: typeof BaseTool;
}

/**
 * The tool registry.
 * Tools are registered either explicitly (registerTool) or via auto-discovery
 * at build time (discoverTools).
 */
class ToolRegistry {
  private tools = new Map<string, RegisteredTool>();

  /**
   * Register a single tool.
   */
  public register(tool: RegisteredTool): void {
    this.tools.set(tool.id, tool);
  }

  /**
   * Unregister a tool by id.
   */
  public unregister(id: string): boolean {
    return this.tools.delete(id);
  }

  /**
   * Get all registered tools.
   */
  public getAll(): RegisteredTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get a tool by id.
   */
  public get(id: string): RegisteredTool | undefined {
    return this.tools.get(id);
  }

  /**
   * Search tools by name or description (case-insensitive).
   */
  public search(query: string): RegisteredTool[] {
    const lower = query.toLowerCase();
    return this.getAll().filter(
      (t) =>
        t.name.toLowerCase().includes(lower) ||
        t.description.toLowerCase().includes(lower) ||
        t.keywords?.toLowerCase().includes(lower)
    );
  }

  /**
   * Check if a tool is registered.
   */
  public has(id: string): boolean {
    return this.tools.has(id);
  }

  /**
   * Get the number of registered tools.
   */
  public count(): number {
    return this.tools.size;
  }
}

/**
 * Singleton registry instance.
 */
const registry = new ToolRegistry();

/**
 * Register a tool with the global registry.
 */
export function registerTool(tool: RegisteredTool): void {
  registry.register(tool);
}

/**
 * Discover and register all tools from src/components/tools/ at build time.
 * Each tool file exports a `meta` object conforming to ToolMetadata.
 *
 * Usage (in an Astro page or layout):
 *   await discoverTools();
 *   const tools = getTools();
 */
export async function discoverTools(): Promise<RegisteredTool[]> {
  // Try to glob-import all tool components at build time.
  // If the directory doesn't exist yet, this gracefully returns empty.
  const toolModules = import.meta.glob<{ meta: ToolMetadata }>(
    '../components/tools/**/meta.ts',
    { eager: true }
  );

  for (const [path, mod] of Object.entries(toolModules)) {
    if (mod.meta) {
      const meta = mod.meta as RegisteredTool;
      // Derive path from id if not specified
      if (!meta.path) {
        meta.path = `/tools/${meta.id}`;
      }
      registry.register(meta);
    }
  }

  return registry.getAll();
}

/**
 * Get all registered tools.
 */
export function getTools(): RegisteredTool[] {
  return registry.getAll();
}

/**
 * Get a tool by id.
 */
export function getTool(id: string): RegisteredTool | undefined {
  return registry.get(id);
}

/**
 * Search tools by query.
 */
export function searchTools(query: string): RegisteredTool[] {
  return registry.search(query);
}

/**
 * Clear all registered tools. Intended for testing only.
 */
export function __resetRegistry(): void {
  registry.getAll().forEach((t) => registry.unregister(t.id));
}
