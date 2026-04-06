// Auto-pause when the tab becomes hidden to prevent time drift

export type VisibilityController = {
  attach: (onHide: () => void, onShow: () => void) => void;
  detach: () => void;
};

export function createVisibilityController(): VisibilityController {
  let hideHandler: (() => void) | null = null;
  let showHandler: (() => void) | null = null;
  let listener: ((e: Event) => void) | null = null;

  return {
    attach(onHide, onShow) {
      hideHandler = onHide;
      showHandler = onShow;
      listener = () => {
        if (typeof document === 'undefined') return;
        if (document.hidden) hideHandler?.();
        else showHandler?.();
      };
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', listener);
      }
    },
    detach() {
      if (typeof document !== 'undefined' && listener) {
        document.removeEventListener('visibilitychange', listener);
      }
      listener = null;
      hideHandler = null;
      showHandler = null;
    },
  };
}
