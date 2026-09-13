// Type shim for globals.css side-effect import
// Required when allowArbitraryExtensions is true in tsconfig
declare const styles: Record<string, never>;
export default styles;
