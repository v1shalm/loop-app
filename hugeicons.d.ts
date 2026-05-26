// HugeIcons ships per-icon ESM modules but no per-icon .d.ts files.
// This ambient declaration types every subpath import as the icon data
// array (an array of [tag, attributes] SVG element tuples).
declare module "@hugeicons/core-free-icons/*" {
  const icon: Array<[string, Record<string, string>]>;
  export default icon;
}
