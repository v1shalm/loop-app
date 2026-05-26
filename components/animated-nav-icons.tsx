"use client";

import { motion } from "motion/react";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";

/**
 * Animates a Phosphor nav icon on row hover without changing the glyph.
 * Phosphor icons are single-path SVGs, so the internals can't move
 * independently — instead we keep the exact Phosphor shape and give it
 * a springy pop plus a regular -> fill crossfade on hover.
 *
 * Motion is driven by variant propagation: the NavRow sets
 * `whileHover="hover"` on its root and these motion spans resolve the
 * "rest" / "hover" label from it. `<MotionConfig reducedMotion="user">`
 * in AppShell degrades it to instant for reduced-motion users.
 */
export function AnimatedNavIcon({
  icon: Icon,
  size = 18,
  active,
}: {
  icon: PhosphorIcon;
  size?: number;
  active?: boolean;
}) {
  return (
    <motion.span
      aria-hidden
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
      variants={{ rest: { scale: 1 }, hover: { scale: 1.15 } }}
      transition={{ type: "spring", stiffness: 400, damping: 12 }}
    >
      {/* Base weight. Active rows are already filled, so they stay put
          and only get the spring pop above. Inactive rows fade their
          outline out as the fill fades in. */}
      <motion.span
        className="absolute inset-0 grid place-items-center"
        variants={
          active ? undefined : { rest: { opacity: 1 }, hover: { opacity: 0 } }
        }
        transition={{ duration: 0.16 }}
      >
        <Icon size={size} weight={active ? "fill" : "regular"} />
      </motion.span>

      {!active && (
        <motion.span
          className="absolute inset-0 grid place-items-center"
          variants={{ rest: { opacity: 0 }, hover: { opacity: 1 } }}
          transition={{ duration: 0.16 }}
        >
          <Icon size={size} weight="fill" />
        </motion.span>
      )}
    </motion.span>
  );
}
