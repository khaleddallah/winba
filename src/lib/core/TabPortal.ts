const tabNodes = new Map<string, HTMLElement>();

let stashContainer: HTMLElement | null = null;

function ensureStashContainer(): HTMLElement {
  if (typeof document === 'undefined') {
    throw new Error('TabPortal stash container requires a browser environment');
  }
  if (stashContainer) return stashContainer;
  stashContainer = document.createElement('div');
  stashContainer.id = '__wm7_tab_stash';
  stashContainer.style.display = 'none';
  document.body.appendChild(stashContainer);
  return stashContainer;
}

export function registerTabNode(tabId: string, el: HTMLElement) {
  tabNodes.set(tabId, el);
}

export function unregisterTabNode(tabId: string, el?: HTMLElement) {
  const existing = tabNodes.get(tabId);
  if (!existing) return;
  if (el && existing !== el) return;
  tabNodes.delete(tabId);
}

export function getTabNode(tabId: string): HTMLElement | undefined {
  return tabNodes.get(tabId);
}

export function mountTabNode(tabId: string, container: HTMLElement): boolean {
  const node = tabNodes.get(tabId);
  container.replaceChildren();
  if (!node) return false;
  container.appendChild(node);
  return true;
}

export function moveTabNodeToStash(tabId: string) {
  const node = tabNodes.get(tabId);
  if (!node) return;
  const stash = ensureStashContainer();
  stash.appendChild(node);
}
