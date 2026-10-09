export function waitForPreviewContainer<T extends HTMLElement>(
  getContainer: () => T | null,
  scheduleFrame: (callback: FrameRequestCallback) => number,
  maxAttempts = 60,
): Promise<T> {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const check = () => {
      const container = getContainer();
      if (container) {
        resolve(container);
        return;
      }

      attempts += 1;
      if (attempts >= maxAttempts) {
        reject(new Error("Widget preview container was not created"));
        return;
      }

      scheduleFrame(check);
    };

    check();
  });
}
