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
  Archive,
  ArrowsClockwise,
  ArrowUp,
  Bell,
  BellSlash,
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
  Copy,
  Crosshair,
  Desktop,
  DotsSixVertical,
  DotsThree,
  Eye,
  EyeSlash,
  Flag,
  FlagBanner,
  Folder,
  Gear,
  Hash,
  Kanban,
  List,
  MagnifyingGlass,
  Moon,
  MoonStars,
  PaperPlaneTilt,
  Pause,
  PencilSimple,
  Play,
  Plus,
  Prohibit,
  PushPin,
  Question,
  Smiley,
  SidebarSimple,
  SignOut,
  SlidersHorizontal,
  SpeakerHigh,
  SpeakerSlash,
  Sun,
  Tag,
  Trash,
  Tray,
  TrendUp,
  User,
  UserPlus,
  UsersThree,
  Warning,
  X,
} from "@phosphor-icons/react";
