import { inlineHtmlImages } from "./printImageUtils";

interface PrintHtmlOptions {
  html: string;
  title: string;
  printDelayMs?: number;
  closeAfterPrint?: boolean;
}

const DEFAULT_PRINT_DELAY_MS = 350;
const AFTER_PRINT_FALLBACK_MS = 3500;

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

const PRINT_ENHANCER_CSS = `
  <style id="safe-print-enhancer">
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      img {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
        image-rendering: -webkit-optimize-contrast;
        display: inline-block;
      }
    }
  </style>
`;

const ensureHtmlDocument = (title: string, html: string): string => {
  let doc = html;
  if (!/<html[\s>]/i.test(doc)) {
    doc = `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>${title}</title></head><body>${doc}</body></html>`;
  }

  // Inject enhancer CSS inside <head>
  if (/<head[\s>]/i.test(doc)) {
    doc = doc.replace(/<head[\s>]/i, (match) => `${match}${PRINT_ENHANCER_CSS}`);
  } else {
    doc = doc.replace(/<html[\s>]/i, (match) => `${match}<head>${PRINT_ENHANCER_CSS}</head>`);
  }

  return doc;
};

/**
 * Ensures all <img> elements inside a document are decoded and fully loaded
 * before print preview is launched.
 */
const waitForImagesInDocument = async (doc: Document, timeoutMs = 4500): Promise<void> => {
  const images = Array.from(doc.images);
  if (images.length === 0) return;

  const promises = images.map((img) => {
    if (img.complete && img.naturalWidth > 0) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };

      const timer = window.setTimeout(done, timeoutMs);

      const onFinish = () => {
        window.clearTimeout(timer);
        if ("decode" in img && typeof (img as any).decode === "function") {
          (img as any).decode().then(done).catch(done);
        } else {
          done();
        }
      };

      img.addEventListener("load", onFinish, { once: true });
      img.addEventListener("error", done, { once: true });
    });
  });

  await Promise.race([
    Promise.all(promises),
    new Promise((resolve) => window.setTimeout(resolve, timeoutMs)),
  ]);

  // Brief pause for browser rendering engine to layout and paint images
  await wait(120);
};

const printFromPopup = async (
  popup: Window,
  html: string,
  printDelayMs: number,
  closeAfterPrint: boolean,
): Promise<void> => {
  popup.document.open();
  popup.document.write(html);
  popup.document.close();

  // Actively wait for all images (school logo, signatures, photos) to finish loading
  await waitForImagesInDocument(popup.document);
  await wait(printDelayMs);

  await new Promise<void>((resolve) => {
    let settled = false;
    let fallbackTimer = 0;

    const mediaQuery = popup.matchMedia?.("print");

    const cleanup = () => {
      if (mediaQuery) {
        if ("removeEventListener" in mediaQuery) {
          mediaQuery.removeEventListener("change", onMediaChange);
        } else {
          (mediaQuery as MediaQueryList).removeListener(onMediaChange);
        }
      }
      popup.removeEventListener("beforeunload", finalize);
      popup.onafterprint = null;
      window.clearTimeout(fallbackTimer);
    };

    const finalize = () => {
      if (settled) return;
      settled = true;
      cleanup();
      if (closeAfterPrint && !popup.closed) {
        popup.close();
      }
      resolve();
    };

    const onMediaChange = (event: MediaQueryListEvent | MediaQueryList) => {
      if (!event.matches) finalize();
    };

    if (mediaQuery) {
      if ("addEventListener" in mediaQuery) {
        mediaQuery.addEventListener("change", onMediaChange);
      } else {
        (mediaQuery as MediaQueryList).addListener(onMediaChange);
      }
    }

    popup.addEventListener("beforeunload", finalize);
    popup.onafterprint = finalize;
    fallbackTimer = window.setTimeout(finalize, AFTER_PRINT_FALLBACK_MS);

    popup.focus();
    popup.print();
  });
};

const printFromIframe = async (html: string, printDelayMs: number): Promise<void> => {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.top = "-10000px";
  iframe.style.left = "-10000px";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.opacity = "0";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  const frameDocument = iframe.contentDocument || iframe.contentWindow?.document;
  if (!frameDocument) {
    document.body.removeChild(iframe);
    return;
  }

  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();

  // Actively wait for all images to finish loading in iframe
  await waitForImagesInDocument(frameDocument);
  await wait(printDelayMs);

  const frameWindow = iframe.contentWindow;
  if (!frameWindow) {
    document.body.removeChild(iframe);
    return;
  }

  await new Promise<void>((resolve) => {
    let settled = false;

    const cleanup = () => {
      frameWindow.onafterprint = null;
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    };

    const finalize = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };

    frameWindow.onafterprint = finalize;
    window.setTimeout(finalize, AFTER_PRINT_FALLBACK_MS);
    frameWindow.focus();
    frameWindow.print();
  });
};

export const printHtmlDocument = async ({
  html,
  title,
  printDelayMs = DEFAULT_PRINT_DELAY_MS,
  closeAfterPrint = true,
}: PrintHtmlOptions): Promise<void> => {
  // Automatically pre-inline remote images into Base64 Data URLs so the printed
  // document has zero latency and zero cross-origin omission
  const inlinedHtml = await inlineHtmlImages(html);
  const fullHtml = ensureHtmlDocument(title, inlinedHtml);

  const popup = window.open("", "_blank");

  if (popup) {
    await printFromPopup(popup, fullHtml, printDelayMs, closeAfterPrint);
    return;
  }

  await printFromIframe(fullHtml, printDelayMs);
};

