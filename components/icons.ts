import { createElement, type CSSProperties } from "react";

/** HugeIcons icon data: an array of [tag, attributes] SVG element tuples. */
type IconSvgObject = Array<[string, Record<string, string>]>;

import Archive02 from "@hugeicons/core-free-icons/Archive02Icon";
import ArrowReloadHorizontal from "@hugeicons/core-free-icons/ArrowReloadHorizontalIcon";
import ArrowUp02 from "@hugeicons/core-free-icons/ArrowUp02Icon";
import Notification02 from "@hugeicons/core-free-icons/Notification02Icon";
import NotificationOff02 from "@hugeicons/core-free-icons/NotificationOff02Icon";
import Calendar03 from "@hugeicons/core-free-icons/Calendar03Icon";
import Calendar01 from "@hugeicons/core-free-icons/Calendar01Icon";
import ArrowDown01 from "@hugeicons/core-free-icons/ArrowDown01Icon";
import ArrowLeft01 from "@hugeicons/core-free-icons/ArrowLeft01Icon";
import ArrowRight01 from "@hugeicons/core-free-icons/ArrowRight01Icon";
import BubbleChat from "@hugeicons/core-free-icons/BubbleChatIcon";
import Tick02 from "@hugeicons/core-free-icons/Tick02Icon";
import CheckmarkCircle02 from "@hugeicons/core-free-icons/CheckmarkCircle02Icon";
import CircleData from "@hugeicons/core-free-icons/CircleIcon";
import Loading03 from "@hugeicons/core-free-icons/Loading03Icon";
import Clock01 from "@hugeicons/core-free-icons/Clock01Icon";
import Copy01 from "@hugeicons/core-free-icons/Copy01Icon";
import Target02 from "@hugeicons/core-free-icons/Target02Icon";
import Computer from "@hugeicons/core-free-icons/ComputerIcon";
import DragDropVertical from "@hugeicons/core-free-icons/DragDropVerticalIcon";
import MoreHorizontal from "@hugeicons/core-free-icons/MoreHorizontalIcon";
import ViewData from "@hugeicons/core-free-icons/ViewIcon";
import ViewOff from "@hugeicons/core-free-icons/ViewOffIcon";
import Doc01 from "@hugeicons/core-free-icons/Doc01Icon";
import HtmlFile01 from "@hugeicons/core-free-icons/HtmlFile01Icon";
import Pdf01 from "@hugeicons/core-free-icons/Pdf01Icon";
import Flag02 from "@hugeicons/core-free-icons/Flag02Icon";
import Flag03 from "@hugeicons/core-free-icons/Flag03Icon";
import Folder01 from "@hugeicons/core-free-icons/Folder01Icon";
import Image02 from "@hugeicons/core-free-icons/Image02Icon";
import FilterData from "@hugeicons/core-free-icons/FilterIcon";
import Settings01 from "@hugeicons/core-free-icons/Settings01Icon";
import Hashtag from "@hugeicons/core-free-icons/HashtagIcon";
import KanbanData from "@hugeicons/core-free-icons/KanbanIcon";
import Link01 from "@hugeicons/core-free-icons/Link01Icon";
import ListView from "@hugeicons/core-free-icons/ListViewIcon";
import Search01 from "@hugeicons/core-free-icons/Search01Icon";
import Moon02 from "@hugeicons/core-free-icons/Moon02Icon";
import Moon01 from "@hugeicons/core-free-icons/Moon01Icon";
import Attachment01 from "@hugeicons/core-free-icons/Attachment01Icon";
import Sent02 from "@hugeicons/core-free-icons/Sent02Icon";
import PauseData from "@hugeicons/core-free-icons/PauseIcon";
import Edit02 from "@hugeicons/core-free-icons/Edit02Icon";
import PlayData from "@hugeicons/core-free-icons/PlayIcon";
import PlusSign from "@hugeicons/core-free-icons/PlusSignIcon";
import Unavailable from "@hugeicons/core-free-icons/UnavailableIcon";
import PinData from "@hugeicons/core-free-icons/PinIcon";
import HelpCircle from "@hugeicons/core-free-icons/HelpCircleIcon";
import Smile from "@hugeicons/core-free-icons/SmileIcon";
import SidebarLeft01 from "@hugeicons/core-free-icons/SidebarLeft01Icon";
import Logout01 from "@hugeicons/core-free-icons/Logout01Icon";
import FilterHorizontal from "@hugeicons/core-free-icons/FilterHorizontalIcon";
import ShieldUser from "@hugeicons/core-free-icons/ShieldUserIcon";
import SparklesData from "@hugeicons/core-free-icons/SparklesIcon";
import VolumeHigh from "@hugeicons/core-free-icons/VolumeHighIcon";
import VolumeMute01 from "@hugeicons/core-free-icons/VolumeMute01Icon";
import Sun01 from "@hugeicons/core-free-icons/Sun01Icon";
import Tag01 from "@hugeicons/core-free-icons/Tag01Icon";
import Delete02 from "@hugeicons/core-free-icons/Delete02Icon";
import InboxData from "@hugeicons/core-free-icons/InboxIcon";
import ChartUp from "@hugeicons/core-free-icons/ChartUpIcon";
import UserData from "@hugeicons/core-free-icons/UserIcon";
import UserAdd01 from "@hugeicons/core-free-icons/UserAdd01Icon";
import UserGroup from "@hugeicons/core-free-icons/UserGroupIcon";
import Alert02 from "@hugeicons/core-free-icons/Alert02Icon";
import Cancel01 from "@hugeicons/core-free-icons/Cancel01Icon";

/**
 * Icon system, backed by HugeIcons (stroke-based, multi-element SVGs).
 *
 * Replaced Phosphor wholesale. The names and the `size`/`weight`/
 * `className` API are kept identical so the ~hundreds of call sites
 * didn't have to change. HugeIcons free is stroke-only (no fill
 * variants), so `weight` maps to stroke thickness: regular = 1.5,
 * bold/fill/duotone = 2 — preserving the "active is heavier" emphasis
 * the app leaned on Phosphor weights for.
 *
 * Three-size design system: every size snaps to the nearest of
 * 14 / 16 / 20 so icons stay visually consistent across the app.
 * Sizes above 24 (empty-state and decorative glyphs) pass through.
 */

export type IconWeight =
  | "thin"
  | "light"
  | "regular"
  | "bold"
  | "fill"
  | "duotone";

export interface IconProps {
  size?: number;
  weight?: IconWeight;
  color?: string;
  className?: string;
  style?: CSSProperties;
  "aria-hidden"?: boolean;
  "aria-label"?: string;
}

export type Icon = (props: IconProps) => ReturnType<typeof createElement>;

const SIZE = { sm: 14, md: 16, lg: 20 } as const;

function snapSize(size: number): number {
  if (size > 24) return size; // decorative / empty-state glyphs
  if (size <= 15) return SIZE.sm;
  if (size <= 18) return SIZE.md;
  return SIZE.lg;
}

function strokeWidthFor(weight?: IconWeight): number {
  return weight === "bold" || weight === "fill" || weight === "duotone"
    ? 2
    : 1.5;
}

function makeIcon(data: IconSvgObject): Icon {
  function IconComponent({
    size = SIZE.md,
    weight,
    color,
    className,
    style,
    ...rest
  }: IconProps) {
    const px = snapSize(size);
    const sw = strokeWidthFor(weight);
    return createElement(
      "svg",
      {
        width: px,
        height: px,
        viewBox: "0 0 24 24",
        fill: "none",
        className,
        style,
        ...rest,
      },
      data.map(([tag, attrs], i) =>
        createElement(tag, {
          ...attrs,
          key: i,
          ...(attrs.stroke ? { stroke: color ?? "currentColor" } : null),
          ...(attrs.strokeWidth ? { strokeWidth: sw } : null),
          ...(attrs.fill && attrs.fill !== "none"
            ? { fill: color ?? "currentColor" }
            : null),
        })
      )
    );
  }
  return IconComponent;
}

export const Archive = makeIcon(Archive02);
export const ArrowsClockwise = makeIcon(ArrowReloadHorizontal);
export const ArrowUp = makeIcon(ArrowUp02);
export const Bell = makeIcon(Notification02);
export const BellSlash = makeIcon(NotificationOff02);
export const CalendarBlank = makeIcon(Calendar03);
export const CalendarDots = makeIcon(Calendar01);
export const CaretDown = makeIcon(ArrowDown01);
export const CaretLeft = makeIcon(ArrowLeft01);
export const CaretRight = makeIcon(ArrowRight01);
export const ChatCircle = makeIcon(BubbleChat);
export const Check = makeIcon(Tick02);
export const CheckCircle = makeIcon(CheckmarkCircle02);
export const Circle = makeIcon(CircleData);
export const CircleNotch = makeIcon(Loading03);
export const Clock = makeIcon(Clock01);
export const Copy = makeIcon(Copy01);
export const Crosshair = makeIcon(Target02);
export const Desktop = makeIcon(Computer);
export const DotsSixVertical = makeIcon(DragDropVertical);
export const DotsThree = makeIcon(MoreHorizontal);
export const Eye = makeIcon(ViewData);
export const EyeSlash = makeIcon(ViewOff);
export const FileDoc = makeIcon(Doc01);
export const FileHtml = makeIcon(HtmlFile01);
export const FilePdf = makeIcon(Pdf01);
export const Flag = makeIcon(Flag02);
export const FlagBanner = makeIcon(Flag03);
export const Folder = makeIcon(Folder01);
export const Image = makeIcon(Image02);
export const FunnelSimple = makeIcon(FilterData);
export const Gear = makeIcon(Settings01);
export const Hash = makeIcon(Hashtag);
export const Kanban = makeIcon(KanbanData);
export const LinkSimple = makeIcon(Link01);
export const List = makeIcon(ListView);
export const MagnifyingGlass = makeIcon(Search01);
export const Moon = makeIcon(Moon02);
export const MoonStars = makeIcon(Moon01);
export const Paperclip = makeIcon(Attachment01);
export const PaperPlaneTilt = makeIcon(Sent02);
export const Pause = makeIcon(PauseData);
export const PencilSimple = makeIcon(Edit02);
export const Play = makeIcon(PlayData);
export const Plus = makeIcon(PlusSign);
export const Prohibit = makeIcon(Unavailable);
export const PushPin = makeIcon(PinData);
export const Question = makeIcon(HelpCircle);
export const Smiley = makeIcon(Smile);
export const ShieldCheck = makeIcon(ShieldUser);
export const Sparkles = makeIcon(SparklesData);
export const SidebarSimple = makeIcon(SidebarLeft01);
export const SignOut = makeIcon(Logout01);
export const SlidersHorizontal = makeIcon(FilterHorizontal);
export const SpeakerHigh = makeIcon(VolumeHigh);
export const SpeakerSlash = makeIcon(VolumeMute01);
export const Sun = makeIcon(Sun01);
export const Tag = makeIcon(Tag01);
export const Trash = makeIcon(Delete02);
export const Tray = makeIcon(InboxData);
export const TrendUp = makeIcon(ChartUp);
export const User = makeIcon(UserData);
export const UserPlus = makeIcon(UserAdd01);
export const UsersThree = makeIcon(UserGroup);
export const Warning = makeIcon(Alert02);
export const X = makeIcon(Cancel01);
