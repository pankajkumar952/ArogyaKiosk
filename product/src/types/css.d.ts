// CSS module type declarations for TypeScript
// Side-effect CSS imports (e.g. import "./globals.css") are valid in Next.js
declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}

// Allow side-effect CSS imports
declare module "*.css";
