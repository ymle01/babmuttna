export function fixOklchColors(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null, false);
  
    while (walker.nextNode()) {
      const el = walker.currentNode;
  
      // inline
      if (el.style) {
        if (el.style.backgroundColor?.includes('oklch')) el.style.backgroundColor = '#ffffff';
        if (el.style.color?.includes('oklch')) el.style.color = '#0f172a';
        if (el.style.borderColor?.includes('oklch')) el.style.borderColor = '#e2e8f0';
      }
  
      const cs = root.defaultView?.getComputedStyle(el);
      if (!cs) continue;
  
      if (cs.getPropertyValue('background-color')?.includes('oklch')) {
        el.style.backgroundColor = '#ffffff';
      }
      if (cs.getPropertyValue('color')?.includes('oklch')) {
        el.style.color = '#0f172a';
      }
      if (cs.getPropertyValue('border-color')?.includes('oklch')) {
        el.style.borderColor = '#e2e8f0';
      }
      if (cs.getPropertyValue('backdrop-filter') || cs.getPropertyValue('-webkit-backdrop-filter')) {
        el.style.backdropFilter = 'none';
        el.style.webkitBackdropFilter = 'none';
      }
    }
  }
  