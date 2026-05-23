"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { sileo } from "sileo";
import { Smiley } from "@/components/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toggleCommentReaction } from "@/lib/actions";
import { playSound } from "@/lib/sounds";
import { cn } from "@/lib/utils";

// One row in the picker. Eight is enough for variety, few enough to fit
// in a single popover row at this size. Order matches Slack/Linear muscle
// memory so first-time users find the one they want without scanning.
const QUICK_EMOJIS = ["👍", "❤️", "🎉", "🚀", "👀", "🙏", "🔥", "💯"];

interface RawReaction {
  emoji: string;
  user_id: string;
}

interface ReactionGroup {
  emoji: string;
  count: number;
  byMe: boolean;
}

function groupReactions(
  rows: RawReaction[],
  currentUserId: string
): ReactionGroup[] {
  const byEmoji = new Map<string, { count: number; byMe: boolean }>();
  for (const r of rows) {
    const cur = byEmoji.get(r.emoji) ?? { count: 0, byMe: false };
    byEmoji.set(r.emoji, {
      count: cur.count + 1,
      byMe: cur.byMe || r.user_id === currentUserId,
    });
  }
  return [...byEmoji.entries()].map(([emoji, v]) => ({
    emoji,
    count: v.count,
    byMe: v.byMe,
  }));
}

/**
 * Reactions on a single comment. Server state is the raw rows joined in;
 * the client keeps an optimistic mirror so a tap registers before the
 * network round-trip. Motion handles the entrance and the count tick.
 *
 * The animation budget here is small on purpose: a quick scale-from-0.7
 * with a low-bounce spring on add, a fade-and-shrink on remove, and a
 * y-tween on the count digit when it changes. Nothing elastic, nothing
 * bouncy. Reactions are used dozens of times a session so the motion has
 * to feel light, not theatrical.
 */
export function CommentReactions({
  commentId,
  reactions: serverReactions,
  currentUserId,
}: {
  commentId: string;
  reactions: RawReaction[];
  currentUserId: string;
}) {
  // Local state so the optimistic update survives across the round-trip.
  // useOptimistic snaps back to props the moment the transition settles,
  // and the task drawer doesn't re-fetch comments after a reaction toggle,
  // so the reaction would visibly disappear. Plain state owns the source
  // of truth for the lifetime of the open drawer; we still sync from
  // props once on mount and again if the comment id changes (different
  // comment, different reaction list).
  const [reactions, setReactions] = useState<RawReaction[]>(serverReactions);
  const lastCommentId = useRef(commentId);
  useEffect(() => {
    if (lastCommentId.current !== commentId) {
      lastCommentId.current = commentId;
      setReactions(serverReactions);
    }
  }, [commentId, serverReactions]);

  const toggle = async (emoji: string) => {
    const has = reactions.some(
      (r) => r.emoji === emoji && r.user_id === currentUserId
    );
    const next = has
      ? reactions.filter(
          (r) => !(r.emoji === emoji && r.user_id === currentUserId)
        )
      : [...reactions, { emoji, user_id: currentUserId }];
    const previous = reactions;
    setReactions(next);
    // Bright pop on add, soft tuck on remove — same patch, different feel.
    playSound(has ? "uncomplete" : "reaction");
    const res = await toggleCommentReaction(commentId, emoji);
    if (res.error) {
      setReactions(previous);
      sileo.error({ title: res.error });
    }
  };

  const groups = groupReactions(reactions, currentUserId);
  if (groups.length === 0) {
    return (
      <div className="mt-1.5">
        <AddReactionButton onPick={toggle} subtle />
      </div>
    );
  }

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1">
      <AnimatePresence initial={false}>
        {groups.map((g) => (
          <ReactionChip
            key={g.emoji}
            group={g}
            onToggle={() => toggle(g.emoji)}
          />
        ))}
      </AnimatePresence>
      <AddReactionButton onPick={toggle} />
    </div>
  );
}

function ReactionChip({
  group,
  onToggle,
}: {
  group: ReactionGroup;
  onToggle: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      aria-pressed={group.byMe}
      aria-label={`${group.emoji} (${group.count}) — ${
        group.byMe ? "you reacted, click to remove" : "click to react"
      }`}
      layout
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.7, opacity: 0 }}
      transition={{ type: "spring", duration: 0.32, bounce: 0.22 }}
      whileTap={{ scale: 0.94 }}
      className={cn(
        "focus-ring inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[11.5px] leading-none transition-colors duration-150 ease-[var(--ease-out)]",
        group.byMe
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground hover:bg-accent/40 hover:text-foreground"
      )}
    >
      <span className="text-[13px] leading-none">{group.emoji}</span>
      {/* Count animates as a sliding digit when it changes — key on the
          numeric value so AnimatePresence treats each count as a fresh
          mount and runs the entrance. */}
      <span className="relative inline-block h-[14px] min-w-[8px] overflow-hidden tabular-nums">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={group.count}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ type: "spring", duration: 0.28, bounce: 0.15 }}
            className="absolute inset-0 flex items-center justify-center font-semibold"
          >
            {group.count}
          </motion.span>
        </AnimatePresence>
      </span>
    </motion.button>
  );
}

function AddReactionButton({
  onPick,
  subtle = false,
}: {
  onPick: (emoji: string) => void;
  subtle?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const handle = (e: string) => {
    onPick(e);
    setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label="Add reaction"
        className={cn(
          "focus-ring grid size-6 place-items-center rounded-full transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.92]",
          subtle
            ? "text-muted-foreground/60 hover:bg-accent/40 hover:text-foreground"
            : "text-muted-foreground/80 hover:bg-accent/40 hover:text-foreground"
        )}
      >
        <Smiley size={14} weight="regular" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-auto gap-0 p-1.5"
      >
        <div className="flex items-center gap-0.5">
          {QUICK_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => handle(e)}
              aria-label={`React with ${e}`}
              className="focus-ring grid size-8 place-items-center rounded-md text-[16px] leading-none transition-[background-color,transform] duration-150 ease-[var(--ease-out)] hover:bg-accent/60 active:scale-[0.88]"
            >
              {e}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
