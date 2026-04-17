// The root page IS the work page — no separate /work route needed.
// (The old scroll-based homepage implementation was replaced by the
// filmstrip + timeline design in /work; this re-export makes the root
// URL serve that instead of requiring /work to be iterated on.)
export { default } from "./work/page";
