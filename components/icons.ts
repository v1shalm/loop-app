"use client";

/**
 * Client-marked re-export of Phosphor icons.
 *
 * @phosphor-icons/react calls React.createContext at module top-level for its
 * internal IconContext provider but doesn't ship its own "use client" directive.
 * Importing it directly from a server component (e.g. a /today page that does
 * server-side data fetching) crashes at module evaluation with
 * "createContext only works in Client Components". Re-exporting from this
 * file routes the phosphor module into the client bundle only.
 *
 * Add icons you use across the app to the list below.
 */

export {
  Bell,
  CalendarBlank,
  CalendarDots,
  CaretDown,
  CaretLeft,
  CaretRight,
  ChatCircle,
  Check,
  CheckCircle,
  Circle,
  CircleNotch,
  Clock,
  Crosshair,
  DotsThree,
  Flag,
  Folder,
  Gear,
  Hash,
  MagnifyingGlass,
  PaperPlaneTilt,
  Plus,
  Question,
  SidebarSimple,
  SignOut,
  SlidersHorizontal,
  SpeakerHigh,
  SpeakerSlash,
  Trash,
  Tray,
  TrendUp,
  User,
  UserPlus,
  UsersThree,
  X,
} from "@phosphor-icons/react";
