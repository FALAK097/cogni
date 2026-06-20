import * as HugeIconsList from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { SVGProps, ComponentType } from "react";

const DEFAULT_ICON_STROKE_WIDTH = 0.8;

export type Hugeicon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

// Create a wrapper component for Hugeicons that mimics standard React SVG component behavior
const createIcon = (icon: any, displayName: string) => {
  const IconComponent = ({
    className,
    size,
    strokeWidth,
    ...props
  }: SVGProps<SVGSVGElement> & { size?: number }) => {
    const parsedStrokeWidth =
      typeof strokeWidth === "string" ? parseFloat(strokeWidth) : strokeWidth;
    return (
      <HugeiconsIcon
        icon={icon}
        className={className}
        size={size || 16}
        strokeWidth={parsedStrokeWidth ?? DEFAULT_ICON_STROKE_WIDTH}
        {...props}
      />
    );
  };
  IconComponent.displayName = displayName;
  return IconComponent;
};

export const AlertCircle = createIcon(HugeIconsList.AlertCircleIcon, "AlertCircle");
export const AlertTriangle = createIcon(HugeIconsList.Alert01Icon, "AlertTriangle");
export const ArrowLeft = createIcon(HugeIconsList.ArrowLeft01Icon, "ArrowLeft");
export const ArrowRight = createIcon(HugeIconsList.ArrowRight01Icon, "ArrowRight");
export const ArrowUpDown = createIcon(HugeIconsList.ArrowUpDownIcon, "ArrowUpDown");
export const ArrowUpRight = createIcon(HugeIconsList.ArrowUpRight01Icon, "ArrowUpRight");
export const BarChart = createIcon(HugeIconsList.BarChartIcon, "BarChart");
export const BarChart3 = createIcon(HugeIconsList.BarChartIcon, "BarChart3");
export const Book = createIcon(HugeIconsList.Book01Icon, "Book");
export const BookOpen = createIcon(HugeIconsList.BookOpen01Icon, "BookOpen");
export const BookOpenCheck = createIcon(HugeIconsList.BookOpen01Icon, "BookOpenCheck");
export const Bot = createIcon(HugeIconsList.BotIcon, "Bot");
export const BotMessageSquare = createIcon(HugeIconsList.ChatBotIcon, "BotMessageSquare");
export const Brain = createIcon(HugeIconsList.Brain01Icon, "Brain");
export const Briefcase = createIcon(HugeIconsList.Briefcase01Icon, "Briefcase");
export const Building2 = createIcon(HugeIconsList.Building02Icon, "Building2");
export const Calendar = createIcon(HugeIconsList.Calendar01Icon, "Calendar");
export const CalendarClock = createIcon(HugeIconsList.Calendar01Icon, "CalendarClock");
export const CalendarMinus2 = createIcon(HugeIconsList.Calendar01Icon, "CalendarMinus2");
export const ChartNoAxesCombined = createIcon(HugeIconsList.Chart01Icon, "ChartNoAxesCombined");
export const Check = createIcon(HugeIconsList.CheckmarkCircle01Icon, "Check");
export const CheckCircle = createIcon(HugeIconsList.CheckmarkCircle01Icon, "CheckCircle");
export const CheckCircle2 = createIcon(HugeIconsList.CheckmarkCircle02Icon, "CheckCircle2");
export const CheckIcon = createIcon(HugeIconsList.CheckmarkCircle01Icon, "CheckIcon");
export const ChevronDown = createIcon(HugeIconsList.ArrowDown01Icon, "ChevronDown");
export const ChevronDownIcon = createIcon(HugeIconsList.ArrowDown01Icon, "ChevronDownIcon");
export const ChevronLeft = createIcon(HugeIconsList.ArrowLeft01Icon, "ChevronLeft");
export const ChevronLeftIcon = createIcon(HugeIconsList.ArrowLeft01Icon, "ChevronLeftIcon");
export const ChevronRight = createIcon(HugeIconsList.ArrowRight01Icon, "ChevronRight");
export const ChevronRightIcon = createIcon(HugeIconsList.ArrowRight01Icon, "ChevronRightIcon");
export const ChevronUp = createIcon(HugeIconsList.ArrowUp01Icon, "ChevronUp");
export const ChevronUpIcon = createIcon(HugeIconsList.ArrowUp01Icon, "ChevronUpIcon");
export const ChevronsUpDown = createIcon(HugeIconsList.ArrowUpDownIcon, "ChevronsUpDown");
export const Clipboard = createIcon(HugeIconsList.ClipboardIcon, "Clipboard");
export const ClipboardList = createIcon(HugeIconsList.ClipboardIcon, "ClipboardList");
export const Clock = createIcon(HugeIconsList.Clock01Icon, "Clock");
export const Code = createIcon(HugeIconsList.CodeIcon, "Code");
export const CookieIcon = createIcon(HugeIconsList.CookieIcon, "CookieIcon");
export const Copy = createIcon(HugeIconsList.CopyIcon, "Copy");
export const CopyIcon = createIcon(HugeIconsList.CopyIcon, "CopyIcon");
export const CreditCard = createIcon(HugeIconsList.CreditCardIcon, "CreditCard");
export const Dot = createIcon(HugeIconsList.AddCircleHalfDotIcon, "Dot");
export const Download = createIcon(HugeIconsList.Download01Icon, "Download");
export const DownloadIcon = createIcon(HugeIconsList.Download01Icon, "DownloadIcon");
export const Ellipsis = createIcon(HugeIconsList.MoreHorizontalIcon, "Ellipsis");
export const ExternalLink = createIcon(HugeIconsList.ArrowUpRight01Icon, "ExternalLink");
export const ExternalLinkIcon = createIcon(HugeIconsList.ArrowUpRight01Icon, "ExternalLinkIcon");
export const Eye = createIcon(HugeIconsList.EyeIcon, "Eye");
export const EyeOff = createIcon(HugeIconsList.EyeIcon, "EyeOff");
export const FastForwardIcon = createIcon(HugeIconsList.Forward01Icon, "FastForwardIcon");
export const File = createIcon(HugeIconsList.File01Icon, "File");
export const FileCode = createIcon(HugeIconsList.File01Icon, "FileCode");
export const FileDown = createIcon(HugeIconsList.FileDownIcon, "FileDown");
export const FileSpreadsheet = createIcon(HugeIconsList.File01Icon, "FileSpreadsheet");
export const FileText = createIcon(HugeIconsList.File01Icon, "FileText");
export const FileUp = createIcon(HugeIconsList.FileUpIcon, "FileUp");
export const Filter = createIcon(HugeIconsList.FilterIcon, "Filter");
export const FilterX = createIcon(HugeIconsList.FilterIcon, "FilterX");
export const FolderKanban = createIcon(HugeIconsList.Folder01Icon, "FolderKanban");
export const GitBranch = createIcon(HugeIconsList.GitBranchIcon, "GitBranch");
export const Globe = createIcon(HugeIconsList.Globe02Icon, "Globe");
export const HelpCircle = createIcon(HugeIconsList.HelpCircleIcon, "HelpCircle");
export const History = createIcon(HugeIconsList.Rotate01Icon, "History");
export const Home = createIcon(HugeIconsList.Home01Icon, "Home");
export const Image = createIcon(HugeIconsList.Image01Icon, "Image");
export const Info = createIcon(HugeIconsList.InformationCircleIcon, "Info");
export const Instagram = createIcon(HugeIconsList.InstagramIcon, "Instagram");
export const Key = createIcon(HugeIconsList.Key01Icon, "Key");
export const KeyRound = createIcon(HugeIconsList.Key02Icon, "KeyRound");
export const Laptop = createIcon(HugeIconsList.LaptopIcon, "Laptop");
export const LayoutGrid = createIcon(HugeIconsList.DashboardSquare01Icon, "LayoutGrid");
export const LinkIcon = createIcon(HugeIconsList.Link01Icon, "LinkIcon");
export const Linkedin = createIcon(HugeIconsList.LinkedinIcon, "Linkedin");
export const LinkedinIcon = createIcon(HugeIconsList.LinkedinIcon, "LinkedinIcon");
export const Loader2 = createIcon(HugeIconsList.Loading02Icon, "Loader2");
export const Loader2Icon = createIcon(HugeIconsList.Loading02Icon, "Loader2Icon");
export const LoaderIcon = createIcon(HugeIconsList.Loading02Icon, "LoaderIcon");
export const Lock = createIcon(HugeIconsList.LockIcon, "Lock");
export const LogOut = createIcon(HugeIconsList.LogoutIcon, "LogOut");
export const Mail = createIcon(HugeIconsList.Mail01Icon, "Mail");
export const MailCheck = createIcon(HugeIconsList.MailValidationIcon, "MailCheck");
export const MapPin = createIcon(HugeIconsList.Location01Icon, "MapPin");
export const Menu = createIcon(HugeIconsList.Menu01Icon, "Menu");
export const MenuIcon = createIcon(HugeIconsList.Menu01Icon, "MenuIcon");
export const MessageCircle = createIcon(HugeIconsList.MessageCircleCodeIcon, "MessageCircle");
export const MessageCircleIcon = createIcon(HugeIconsList.Message01Icon, "MessageCircleIcon");
export const MessageSquare = createIcon(HugeIconsList.Message01Icon, "MessageSquare");
export const Mic = createIcon(HugeIconsList.MicIcon, "Mic");
export const MicOff = createIcon(HugeIconsList.MicOffIcon, "MicOff");
export const MinusCircle = createIcon(HugeIconsList.RemoveCircleIcon, "MinusCircle");
export const Monitor = createIcon(HugeIconsList.ComputerIcon, "Monitor");
export const Moon = createIcon(HugeIconsList.MoonIcon, "Moon");
export const MoreHorizontal = createIcon(HugeIconsList.MoreHorizontalIcon, "MoreHorizontal");
export const MoreVertical = createIcon(HugeIconsList.MoreVerticalIcon, "MoreVertical");
export const PanelLeft = createIcon(HugeIconsList.SidebarLeftIcon, "PanelLeft");
export const Pause = createIcon(HugeIconsList.PauseIcon, "Pause");
export const PauseIcon = createIcon(HugeIconsList.PauseIcon, "PauseIcon");
export const Pencil = createIcon(HugeIconsList.PencilIcon, "Pencil");
export const Phone = createIcon(HugeIconsList.Call02Icon, "Phone");
export const PhoneCall = createIcon(HugeIconsList.Call02Icon, "PhoneCall");
export const PhoneIncoming = createIcon(HugeIconsList.CallIncoming01Icon, "PhoneIncoming");
export const PhoneOff = createIcon(HugeIconsList.PhoneOffIcon, "PhoneOff");
export const PhoneOutgoing = createIcon(HugeIconsList.CallOutgoing01Icon, "PhoneOutgoing");
export const Pizza = createIcon(HugeIconsList.PizzaIcon, "Pizza");
export const Play = createIcon(HugeIconsList.PlayIcon, "Play");
export const PlayIcon = createIcon(HugeIconsList.PlayIcon, "PlayIcon");
export const Plug = createIcon(HugeIconsList.Plug01Icon, "Plug");
export const Plus = createIcon(HugeIconsList.Add01Icon, "Plus");
export const PlusCircle = createIcon(HugeIconsList.AddCircleIcon, "PlusCircle");
export const Puzzle = createIcon(HugeIconsList.PuzzleIcon, "Puzzle");
export const Radio = createIcon(HugeIconsList.RadioIcon, "Radio");
export const Receipt = createIcon(HugeIconsList.Invoice01Icon, "Receipt");
export const RefreshCw = createIcon(HugeIconsList.Refresh01Icon, "RefreshCw");
export const RefreshCwIcon = createIcon(HugeIconsList.Refresh01Icon, "RefreshCwIcon");
export const RewindIcon = createIcon(HugeIconsList.Backward01Icon, "RewindIcon");
export const RotateCcw = createIcon(HugeIconsList.Rotate01Icon, "RotateCcw");
export const Save = createIcon(HugeIconsList.SaveIcon, "Save");
export const ScrollText = createIcon(HugeIconsList.ScrollIcon, "ScrollText");
export const Search = createIcon(HugeIconsList.Search01Icon, "Search");
export const Send = createIcon(HugeIconsList.SentIcon, "Send");
export const Settings = createIcon(HugeIconsList.Settings01Icon, "Settings");
export const Share2 = createIcon(HugeIconsList.Share01Icon, "Share2");
export const Shield = createIcon(HugeIconsList.ShieldIcon, "Shield");
export const ShieldCheck = createIcon(HugeIconsList.Shield01Icon, "ShieldCheck");
export const Sliders = createIcon(HugeIconsList.SlidersVerticalIcon, "Sliders");
export const Smartphone = createIcon(HugeIconsList.SmartPhone01Icon, "Smartphone");
export const Sparkles = createIcon(HugeIconsList.SparklesIcon, "Sparkles");
export const SparklesIcon = createIcon(HugeIconsList.SparklesIcon, "SparklesIcon");
export const Speech = createIcon(HugeIconsList.SpeechToTextIcon, "Speech");
export const Square = createIcon(HugeIconsList.SquareIcon, "Square");
export const Star = createIcon(HugeIconsList.StarIcon, "Star");
export const Sun = createIcon(HugeIconsList.Sun01Icon, "Sun");
export const SunMedium = createIcon(HugeIconsList.Sun01Icon, "SunMedium");
export const Table = createIcon(HugeIconsList.TableIcon, "Table");
export const Tablet = createIcon(HugeIconsList.Tablet01Icon, "Tablet");
export const Target = createIcon(HugeIconsList.Target01Icon, "Target");
export const ThumbsDown = createIcon(HugeIconsList.ThumbsDownIcon, "ThumbsDown");
export const ThumbsUp = createIcon(HugeIconsList.ThumbsUpIcon, "ThumbsUp");
export const Trash = createIcon(HugeIconsList.Delete01Icon, "Trash");
export const Trash2 = createIcon(HugeIconsList.Delete02Icon, "Trash2");
export const TrendingUp = createIcon(HugeIconsList.Chart01Icon, "TrendingUp");
export const Twitter = createIcon(HugeIconsList.TwitterIcon, "Twitter");
export const Upload = createIcon(HugeIconsList.Upload01Icon, "Upload");
export const User = createIcon(HugeIconsList.UserIcon, "User");
export const UserCheck = createIcon(HugeIconsList.UserCheck01Icon, "UserCheck");
export const UserCog = createIcon(HugeIconsList.UserSettings01Icon, "UserCog");
export const UserMinus = createIcon(HugeIconsList.UserRemove01Icon, "UserMinus");
export const UserPlus = createIcon(HugeIconsList.UserAdd01Icon, "UserPlus");
export const Users = createIcon(HugeIconsList.UserGroupIcon, "Users");
export const Video = createIcon(HugeIconsList.VideoReplayIcon, "Video");
export const Volume2 = createIcon(HugeIconsList.VolumeHighIcon, "Volume2");
export const Volume2Icon = createIcon(HugeIconsList.VolumeHighIcon, "Volume2Icon");
export const VolumeIcon = createIcon(HugeIconsList.VolumeHighIcon, "VolumeIcon");
export const VolumeXIcon = createIcon(HugeIconsList.VolumeMuteIcon, "VolumeXIcon");
export const X = createIcon(HugeIconsList.Cancel01Icon, "X");
export const XCircle = createIcon(HugeIconsList.CancelCircleIcon, "XCircle");
export const XIcon = createIcon(HugeIconsList.Cancel01Icon, "XIcon");
export const Zap = createIcon(HugeIconsList.FlashIcon, "Zap");
export const icons = createIcon(HugeIconsList.GridIcon, "icons");

// Global Icons registry object supporting camelCase and PascalCase mappings
export const Icons = {
  GET: (props: SVGProps<SVGSVGElement>) => (
    <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 mr-1.5 select-none font-mono">
      GET
    </span>
  ),
  POST: (props: SVGProps<SVGSVGElement>) => (
    <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider rounded bg-blue-500/10 text-blue-500 border border-blue-500/20 mr-1.5 select-none font-mono">
      POST
    </span>
  ),
  PUT: (props: SVGProps<SVGSVGElement>) => (
    <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 mr-1.5 select-none font-mono">
      PUT
    </span>
  ),
  PATCH: (props: SVGProps<SVGSVGElement>) => (
    <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 mr-1.5 select-none font-mono">
      PATCH
    </span>
  ),
  DELETE: (props: SVGProps<SVGSVGElement>) => (
    <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider rounded bg-rose-500/10 text-rose-500 border border-rose-500/20 mr-1.5 select-none font-mono">
      DEL
    </span>
  ),
  DEL: (props: SVGProps<SVGSVGElement>) => (
    <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider rounded bg-rose-500/10 text-rose-500 border border-rose-500/20 mr-1.5 select-none font-mono">
      DEL
    </span>
  ),
  facebook: (props: SVGProps<SVGSVGElement>) => (
    <svg
      aria-hidden="true"
      focusable="false"
      data-prefix="fab"
      data-icon="facebook"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      viewBox="0 0 16 16"
      {...props}
    >
      <path d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951z" />
    </svg>
  ),
  gitHub: (props: SVGProps<SVGSVGElement>) => (
    <svg
      aria-hidden="true"
      focusable="false"
      data-prefix="fab"
      data-icon="github"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 496 512"
      {...props}
    >
      <path
        fill="currentColor"
        d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3 .3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5 .3-6.2 2.3zm44.2-1.7c-2.9 .7-4.9 2.6-4.6 4.9 .3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8zM97.2 352.9c-1.3 1-1 3.3 .7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1zm-10.8-8.1c-.7 1.3 .3 2.9 2.3 3.9 1.6 1 3.6 .7 4.3-.7 .7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3 .7zm32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3 .7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1zm-11.4-14.7c-1.6 1-1.6 3.6 0 5.9 1.6 2.3 4.3 3.3 5.6 2.3 1.6-1.3 1.6-3.9 0-6.2-1.4-2.3-4-3.3-5.6-2z"
      />
    </svg>
  ),
  gmail: (props: SVGProps<SVGSVGElement>) => (
    <svg
      aria-hidden="true"
      focusable="false"
      data-prefix="fab"
      data-icon="gmail"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
    </svg>
  ),
  alertCircle: AlertCircle,
  AlertCircle: AlertCircle,
  alertTriangle: AlertTriangle,
  AlertTriangle: AlertTriangle,
  arrowLeft: ArrowLeft,
  ArrowLeft: ArrowLeft,
  arrowRight: ArrowRight,
  ArrowRight: ArrowRight,
  arrowUpDown: ArrowUpDown,
  ArrowUpDown: ArrowUpDown,
  arrowUpRight: ArrowUpRight,
  ArrowUpRight: ArrowUpRight,
  barChart: BarChart,
  BarChart: BarChart,
  barChart3: BarChart3,
  BarChart3: BarChart3,
  book: Book,
  Book: Book,
  bookOpen: BookOpen,
  BookOpen: BookOpen,
  bookOpenCheck: BookOpenCheck,
  BookOpenCheck: BookOpenCheck,
  bot: Bot,
  Bot: Bot,
  botMessageSquare: BotMessageSquare,
  BotMessageSquare: BotMessageSquare,
  brain: Brain,
  Brain: Brain,
  briefcase: Briefcase,
  Briefcase: Briefcase,
  building2: Building2,
  Building2: Building2,
  calendar: Calendar,
  Calendar: Calendar,
  calendarClock: CalendarClock,
  CalendarClock: CalendarClock,
  calendarMinus2: CalendarMinus2,
  CalendarMinus2: CalendarMinus2,
  chartNoAxesCombined: ChartNoAxesCombined,
  ChartNoAxesCombined: ChartNoAxesCombined,
  check: Check,
  Check: Check,
  checkCircle: CheckCircle,
  CheckCircle: CheckCircle,
  checkCircle2: CheckCircle2,
  CheckCircle2: CheckCircle2,
  checkIcon: CheckIcon,
  CheckIcon: CheckIcon,
  chevronDown: ChevronDown,
  ChevronDown: ChevronDown,
  chevronDownIcon: ChevronDownIcon,
  ChevronDownIcon: ChevronDownIcon,
  chevronLeft: ChevronLeft,
  ChevronLeft: ChevronLeft,
  chevronLeftIcon: ChevronLeftIcon,
  ChevronLeftIcon: ChevronLeftIcon,
  chevronRight: ChevronRight,
  ChevronRight: ChevronRight,
  chevronRightIcon: ChevronRightIcon,
  ChevronRightIcon: ChevronRightIcon,
  chevronUp: ChevronUp,
  ChevronUp: ChevronUp,
  chevronUpIcon: ChevronUpIcon,
  ChevronUpIcon: ChevronUpIcon,
  chevronsUpDown: ChevronsUpDown,
  ChevronsUpDown: ChevronsUpDown,
  clipboard: Clipboard,
  Clipboard: Clipboard,
  clipboardList: ClipboardList,
  ClipboardList: ClipboardList,
  clock: Clock,
  Clock: Clock,
  code: Code,
  Code: Code,
  cookieIcon: CookieIcon,
  CookieIcon: CookieIcon,
  copy: Copy,
  Copy: Copy,
  copyIcon: CopyIcon,
  CopyIcon: CopyIcon,
  creditCard: CreditCard,
  CreditCard: CreditCard,
  dot: Dot,
  Dot: Dot,
  download: Download,
  Download: Download,
  downloadIcon: DownloadIcon,
  DownloadIcon: DownloadIcon,
  ellipsis: Ellipsis,
  Ellipsis: Ellipsis,
  externalLink: ExternalLink,
  ExternalLink: ExternalLink,
  externalLinkIcon: ExternalLinkIcon,
  ExternalLinkIcon: ExternalLinkIcon,
  eye: Eye,
  Eye: Eye,
  eyeOff: EyeOff,
  EyeOff: EyeOff,
  fastForwardIcon: FastForwardIcon,
  FastForwardIcon: FastForwardIcon,
  file: File,
  File: File,
  fileCode: FileCode,
  FileCode: FileCode,
  fileDown: FileDown,
  FileDown: FileDown,
  fileSpreadsheet: FileSpreadsheet,
  FileSpreadsheet: FileSpreadsheet,
  fileText: FileText,
  FileText: FileText,
  fileUp: FileUp,
  FileUp: FileUp,
  filter: Filter,
  Filter: Filter,
  filterX: FilterX,
  FilterX: FilterX,
  folderKanban: FolderKanban,
  FolderKanban: FolderKanban,
  gitBranch: GitBranch,
  GitBranch: GitBranch,
  globe: Globe,
  Globe: Globe,
  helpCircle: HelpCircle,
  HelpCircle: HelpCircle,
  history: History,
  History: History,
  home: Home,
  Home: Home,
  image: Image,
  Image: Image,
  info: Info,
  Info: Info,
  instagram: Instagram,
  Instagram: Instagram,
  key: Key,
  Key: Key,
  keyRound: KeyRound,
  KeyRound: KeyRound,
  laptop: Laptop,
  Laptop: Laptop,
  layoutGrid: LayoutGrid,
  LayoutGrid: LayoutGrid,
  linkIcon: LinkIcon,
  LinkIcon: LinkIcon,
  linkedin: Linkedin,
  Linkedin: Linkedin,
  linkedinIcon: LinkedinIcon,
  LinkedinIcon: LinkedinIcon,
  loader2: Loader2,
  Loader2: Loader2,
  loader2Icon: Loader2Icon,
  Loader2Icon: Loader2Icon,
  loaderIcon: LoaderIcon,
  LoaderIcon: LoaderIcon,
  lock: Lock,
  Lock: Lock,
  logOut: LogOut,
  LogOut: LogOut,
  mail: Mail,
  Mail: Mail,
  mailCheck: MailCheck,
  MailCheck: MailCheck,
  mapPin: MapPin,
  MapPin: MapPin,
  menu: Menu,
  Menu: Menu,
  menuIcon: MenuIcon,
  MenuIcon: MenuIcon,
  messageCircle: MessageCircle,
  MessageCircle: MessageCircle,
  messageCircleIcon: MessageCircleIcon,
  MessageCircleIcon: MessageCircleIcon,
  messageSquare: MessageSquare,
  MessageSquare: MessageSquare,
  mic: Mic,
  Mic: Mic,
  micOff: MicOff,
  MicOff: MicOff,
  minusCircle: MinusCircle,
  MinusCircle: MinusCircle,
  monitor: Monitor,
  Monitor: Monitor,
  moon: Moon,
  Moon: Moon,
  moreHorizontal: MoreHorizontal,
  MoreHorizontal: MoreHorizontal,
  moreVertical: MoreVertical,
  MoreVertical: MoreVertical,
  panelLeft: PanelLeft,
  PanelLeft: PanelLeft,
  pause: Pause,
  Pause: Pause,
  pauseIcon: PauseIcon,
  PauseIcon: PauseIcon,
  pencil: Pencil,
  Pencil: Pencil,
  phone: Phone,
  Phone: Phone,
  phoneCall: PhoneCall,
  PhoneCall: PhoneCall,
  phoneIncoming: PhoneIncoming,
  PhoneIncoming: PhoneIncoming,
  phoneOff: PhoneOff,
  PhoneOff: PhoneOff,
  phoneOutgoing: PhoneOutgoing,
  PhoneOutgoing: PhoneOutgoing,
  pizza: Pizza,
  Pizza: Pizza,
  play: Play,
  Play: Play,
  playIcon: PlayIcon,
  PlayIcon: PlayIcon,
  plug: Plug,
  Plug: Plug,
  plus: Plus,
  Plus: Plus,
  plusCircle: PlusCircle,
  PlusCircle: PlusCircle,
  puzzle: Puzzle,
  Puzzle: Puzzle,
  radio: Radio,
  Radio: Radio,
  receipt: Receipt,
  Receipt: Receipt,
  refreshCw: RefreshCw,
  RefreshCw: RefreshCw,
  refreshCwIcon: RefreshCwIcon,
  RefreshCwIcon: RefreshCwIcon,
  rewindIcon: RewindIcon,
  RewindIcon: RewindIcon,
  rotateCcw: RotateCcw,
  RotateCcw: RotateCcw,
  save: Save,
  Save: Save,
  scrollText: ScrollText,
  ScrollText: ScrollText,
  search: Search,
  Search: Search,
  send: Send,
  Send: Send,
  settings: Settings,
  Settings: Settings,
  share2: Share2,
  Share2: Share2,
  shield: Shield,
  Shield: Shield,
  shieldCheck: ShieldCheck,
  ShieldCheck: ShieldCheck,
  sliders: Sliders,
  Sliders: Sliders,
  smartphone: Smartphone,
  Smartphone: Smartphone,
  sparkles: Sparkles,
  Sparkles: Sparkles,
  sparklesIcon: SparklesIcon,
  SparklesIcon: SparklesIcon,
  speech: Speech,
  Speech: Speech,
  square: Square,
  Square: Square,
  star: Star,
  Star: Star,
  sun: Sun,
  Sun: Sun,
  sunMedium: SunMedium,
  SunMedium: SunMedium,
  table: Table,
  Table: Table,
  tablet: Tablet,
  Tablet: Tablet,
  target: Target,
  Target: Target,
  thumbsDown: ThumbsDown,
  ThumbsDown: ThumbsDown,
  thumbsUp: ThumbsUp,
  ThumbsUp: ThumbsUp,
  trash: Trash,
  Trash: Trash,
  trash2: Trash2,
  Trash2: Trash2,
  trendingUp: TrendingUp,
  TrendingUp: TrendingUp,
  twitter: Twitter,
  Twitter: Twitter,
  upload: Upload,
  Upload: Upload,
  user: User,
  User: User,
  userCheck: UserCheck,
  UserCheck: UserCheck,
  userCog: UserCog,
  UserCog: UserCog,
  userMinus: UserMinus,
  UserMinus: UserMinus,
  userPlus: UserPlus,
  UserPlus: UserPlus,
  users: Users,
  Users: Users,
  video: Video,
  Video: Video,
  volume2: Volume2,
  Volume2: Volume2,
  volume2Icon: Volume2Icon,
  Volume2Icon: Volume2Icon,
  volumeIcon: VolumeIcon,
  VolumeIcon: VolumeIcon,
  volumeXIcon: VolumeXIcon,
  VolumeXIcon: VolumeXIcon,
  x: X,
  X: X,
  xCircle: XCircle,
  XCircle: XCircle,
  xIcon: XIcon,
  XIcon: XIcon,
  zap: Zap,
  Zap: Zap,
  icons: icons,
  close: X,
  spinner: Loader2,
  post: FileText,
  page: File,
  spreadsheet: FileSpreadsheet,
  media: Image,
  billing: CreditCard,
  ellipsisVertical: MoreVertical,
  add: Plus,
  warning: AlertTriangle,
  help: HelpCircle,
  botSquareMessage: BotMessageSquare,
  edit: Pencil,
  branch: GitBranch,
  incoming: PhoneIncoming,
  outgoing: PhoneOutgoing,
  aiBot: Bot,
  automation: Zap,
  analytics: BarChart,
  security: Shield,
  intelligence: Brain,
  targeting: Target,
  performance: Speech,
  communication: MessageCircle,
  scheduling: CalendarClock,
  engagement: UserCheck,
};
