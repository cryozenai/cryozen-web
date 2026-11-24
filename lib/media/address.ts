/**
 * The address the desktop app serves on, shown in the frame around every
 * capture. It restates `install.desktop_port` from `lib/release-facts.json`
 * rather than importing it, because the frame is also rendered inside client
 * components and the whole facts file would follow it into the bundle;
 * `scripts/product.test.mjs` fails if the two ever disagree.
 */
export const desktopAddress = "127.0.0.1:7860";
