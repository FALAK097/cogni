import {
  Add01Icon,
  AddCircleHalfDotIcon,
  AddCircleIcon,
  Alert01Icon,
  AlertCircleIcon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  ArrowUpDownIcon,
  ArrowUpRight01Icon,
  Backward01Icon,
  BarChartIcon,
  Book01Icon,
  BookOpen01Icon,
  BotIcon,
  Brain01Icon,
  Briefcase01Icon,
  Building02Icon,
  Calendar01Icon,
  Call02Icon,
  CallIncoming01Icon,
  CallOutgoing01Icon,
  Cancel01Icon,
  CancelCircleIcon,
  Chart01Icon,
  ChatBotIcon,
  CheckmarkCircle01Icon,
  CheckmarkCircle02Icon,
  ClipboardIcon,
  Clock01Icon,
  CodeIcon,
  ComputerIcon,
  CookieIcon as CookieHugeIcon,
  CopyIcon as CopyHugeIcon,
  CreditCardIcon,
  DashboardSquare01Icon,
  Delete01Icon,
  Delete02Icon,
  Download01Icon,
  EyeIcon,
  File01Icon,
  FileDownIcon,
  FileUpIcon,
  FilterIcon,
  FlashIcon,
  Folder01Icon,
  Forward01Icon,
  GitBranchIcon,
  Globe02Icon,
  HelpCircleIcon,
  Home01Icon,
  Image01Icon,
  InboxIcon,
  InformationCircleIcon,
  InstagramIcon,
  Invoice01Icon,
  Key01Icon,
  Key02Icon,
  LaptopIcon,
  Link01Icon,
  LinkedinIcon as LinkedinHugeIcon,
  ListTreeIcon,
  Loading02Icon,
  Location01Icon,
  LockIcon,
  LogoutIcon,
  Mail01Icon,
  MailValidationIcon,
  Menu01Icon,
  Message01Icon,
  MessageCircleCodeIcon,
  MoonIcon,
  MoreHorizontalIcon,
  MoreVerticalIcon,
  PauseIcon as PauseHugeIcon,
  PencilIcon,
  PhoneOffIcon,
  PizzaIcon,
  PlayIcon as PlayHugeIcon,
  Plug01Icon,
  PuzzleIcon,
  RadioIcon,
  Refresh01Icon,
  RemoveCircleIcon,
  Rocket01Icon,
  Rotate01Icon,
  SaveIcon,
  ScrollIcon,
  Search01Icon,
  SentIcon,
  Settings01Icon,
  Share01Icon,
  Shield01Icon,
  ShieldIcon,
  SidebarLeftIcon,
  SlidersVerticalIcon,
  SmartPhone01Icon,
  SparklesIcon as SparklesHugeIcon,
  SpeechToTextIcon,
  SquareIcon,
  StarIcon,
  Sun01Icon,
  TableIcon,
  Tablet01Icon,
  Target01Icon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  TwitterIcon,
  Upload01Icon,
  UserAdd01Icon,
  UserCheck01Icon,
  UserGroupIcon,
  UserIcon,
  UserRemove01Icon,
  UserSettings01Icon,
  VideoReplayIcon,
  VolumeHighIcon,
  VolumeMuteIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { SVGProps, ComponentType, ComponentProps } from "react";

const DEFAULT_ICON_STROKE_WIDTH = 0.8;

export type Hugeicon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

// Create a wrapper component for Hugeicons that mimics standard React SVG component behavior
type HugeiconsIconData = ComponentProps<typeof HugeiconsIcon>["icon"];

const createIcon = (icon: HugeiconsIconData, displayName: string) => {
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

export const AlertCircle = createIcon(AlertCircleIcon, "AlertCircle");
export const AlertTriangle = createIcon(Alert01Icon, "AlertTriangle");
export const ArrowLeft = createIcon(ArrowLeft01Icon, "ArrowLeft");
export const ArrowRight = createIcon(ArrowRight01Icon, "ArrowRight");
export const ArrowUpDown = createIcon(ArrowUpDownIcon, "ArrowUpDown");
export const ArrowUpRight = createIcon(ArrowUpRight01Icon, "ArrowUpRight");
export const BarChart = createIcon(BarChartIcon, "BarChart");
export const BarChart3 = createIcon(BarChartIcon, "BarChart3");
export const Book = createIcon(Book01Icon, "Book");
export const BookOpen = createIcon(BookOpen01Icon, "BookOpen");
export const BookOpenCheck = createIcon(BookOpen01Icon, "BookOpenCheck");
export const Bot = createIcon(BotIcon, "Bot");
export const BotMessageSquare = createIcon(ChatBotIcon, "BotMessageSquare");
export const Brain = createIcon(Brain01Icon, "Brain");
export const Briefcase = createIcon(Briefcase01Icon, "Briefcase");
export const Building2 = createIcon(Building02Icon, "Building2");
export const Calendar = createIcon(Calendar01Icon, "Calendar");
export const CalendarClock = createIcon(Calendar01Icon, "CalendarClock");
export const CalendarMinus2 = createIcon(Calendar01Icon, "CalendarMinus2");
export const ChartNoAxesCombined = createIcon(Chart01Icon, "ChartNoAxesCombined");
export const Check = createIcon(CheckmarkCircle01Icon, "Check");
export const CheckCircle = createIcon(CheckmarkCircle01Icon, "CheckCircle");
export const CheckCircle2 = createIcon(CheckmarkCircle02Icon, "CheckCircle2");
export const CheckIcon = createIcon(CheckmarkCircle01Icon, "CheckIcon");
export const ChevronDown = createIcon(ArrowDown01Icon, "ChevronDown");
export const ChevronDownIcon = createIcon(ArrowDown01Icon, "ChevronDownIcon");
export const ChevronLeft = createIcon(ArrowLeft01Icon, "ChevronLeft");
export const ChevronLeftIcon = createIcon(ArrowLeft01Icon, "ChevronLeftIcon");
export const ChevronRight = createIcon(ArrowRight01Icon, "ChevronRight");
export const ChevronRightIcon = createIcon(ArrowRight01Icon, "ChevronRightIcon");
export const ChevronUp = createIcon(ArrowUp01Icon, "ChevronUp");
export const ChevronUpIcon = createIcon(ArrowUp01Icon, "ChevronUpIcon");
export const ChevronsUpDown = createIcon(ArrowUpDownIcon, "ChevronsUpDown");
export const Clipboard = createIcon(ClipboardIcon, "Clipboard");
export const ClipboardList = createIcon(ClipboardIcon, "ClipboardList");
export const Clock = createIcon(Clock01Icon, "Clock");
export const Code = createIcon(CodeIcon, "Code");
export const CookieIcon = createIcon(CookieHugeIcon, "CookieIcon");
export const Copy = createIcon(CopyHugeIcon, "Copy");
export const CopyIcon = createIcon(CopyHugeIcon, "CopyIcon");
export const CreditCard = createIcon(CreditCardIcon, "CreditCard");
export const Dot = createIcon(AddCircleHalfDotIcon, "Dot");
export const Download = createIcon(Download01Icon, "Download");
export const DownloadIcon = createIcon(Download01Icon, "DownloadIcon");
export const Ellipsis = createIcon(MoreHorizontalIcon, "Ellipsis");
export const ExternalLink = createIcon(ArrowUpRight01Icon, "ExternalLink");
export const ExternalLinkIcon = createIcon(ArrowUpRight01Icon, "ExternalLinkIcon");
export const Eye = createIcon(EyeIcon, "Eye");
export const EyeOff = createIcon(EyeIcon, "EyeOff");
export const FastForwardIcon = createIcon(Forward01Icon, "FastForwardIcon");
export const File = createIcon(File01Icon, "File");
export const FileCode = createIcon(File01Icon, "FileCode");
export const FileDown = createIcon(FileDownIcon, "FileDown");
export const FileSpreadsheet = createIcon(File01Icon, "FileSpreadsheet");
export const FileText = createIcon(File01Icon, "FileText");
export const FileUp = createIcon(FileUpIcon, "FileUp");
export const Filter = createIcon(FilterIcon, "Filter");
export const FilterX = createIcon(FilterIcon, "FilterX");
export const FolderKanban = createIcon(Folder01Icon, "FolderKanban");
export const GitBranch = createIcon(GitBranchIcon, "GitBranch");
export const Globe = createIcon(Globe02Icon, "Globe");
export const HelpCircle = createIcon(HelpCircleIcon, "HelpCircle");
export const History = createIcon(Rotate01Icon, "History");
export const Home = createIcon(Home01Icon, "Home");
export const Image = createIcon(Image01Icon, "Image");
export const Info = createIcon(InformationCircleIcon, "Info");
export const Instagram = createIcon(InstagramIcon, "Instagram");
export const Key = createIcon(Key01Icon, "Key");
export const KeyRound = createIcon(Key02Icon, "KeyRound");
export const Laptop = createIcon(LaptopIcon, "Laptop");
export const LayoutGrid = createIcon(DashboardSquare01Icon, "LayoutGrid");
export const LinkIcon = createIcon(Link01Icon, "LinkIcon");
export const Linkedin = createIcon(LinkedinHugeIcon, "Linkedin");
export const LinkedinIcon = createIcon(LinkedinHugeIcon, "LinkedinIcon");
export const Loader2 = createIcon(Loading02Icon, "Loader2");
export const Loader2Icon = createIcon(Loading02Icon, "Loader2Icon");
export const LoaderIcon = createIcon(Loading02Icon, "LoaderIcon");
export const Lock = createIcon(LockIcon, "Lock");
export const LogOut = createIcon(LogoutIcon, "LogOut");
export const Mail = createIcon(Mail01Icon, "Mail");
export const MailCheck = createIcon(MailValidationIcon, "MailCheck");
export const MapPin = createIcon(Location01Icon, "MapPin");
export const Menu = createIcon(Menu01Icon, "Menu");
export const MenuIcon = createIcon(Menu01Icon, "MenuIcon");
export const MessageCircle = createIcon(MessageCircleCodeIcon, "MessageCircle");
export const Inbox = createIcon(InboxIcon, "Inbox");
export const ListTree = createIcon(ListTreeIcon, "ListTree");
export const MessageCircleIcon = createIcon(Message01Icon, "MessageCircleIcon");
export const MessageSquare = createIcon(Message01Icon, "MessageSquare");
export const MinusCircle = createIcon(RemoveCircleIcon, "MinusCircle");
export const Monitor = createIcon(ComputerIcon, "Monitor");
export const Moon = createIcon(MoonIcon, "Moon");
export const MoreHorizontal = createIcon(MoreHorizontalIcon, "MoreHorizontal");
export const MoreVertical = createIcon(MoreVerticalIcon, "MoreVertical");
export const PanelLeft = createIcon(SidebarLeftIcon, "PanelLeft");
export const Pause = createIcon(PauseHugeIcon, "Pause");
export const PauseIcon = createIcon(PauseHugeIcon, "PauseIcon");
export const Pencil = createIcon(PencilIcon, "Pencil");
export const Phone = createIcon(Call02Icon, "Phone");
export const PhoneCall = createIcon(Call02Icon, "PhoneCall");
export const PhoneIncoming = createIcon(CallIncoming01Icon, "PhoneIncoming");
export const PhoneOff = createIcon(PhoneOffIcon, "PhoneOff");
export const PhoneOutgoing = createIcon(CallOutgoing01Icon, "PhoneOutgoing");
export const Pizza = createIcon(PizzaIcon, "Pizza");
export const Play = createIcon(PlayHugeIcon, "Play");
export const PlayIcon = createIcon(PlayHugeIcon, "PlayIcon");
export const Plug = createIcon(Plug01Icon, "Plug");
export const Plus = createIcon(Add01Icon, "Plus");
export const PlusCircle = createIcon(AddCircleIcon, "PlusCircle");
export const Puzzle = createIcon(PuzzleIcon, "Puzzle");
export const Radio = createIcon(RadioIcon, "Radio");
export const Receipt = createIcon(Invoice01Icon, "Receipt");
export const RefreshCw = createIcon(Refresh01Icon, "RefreshCw");
export const RefreshCwIcon = createIcon(Refresh01Icon, "RefreshCwIcon");
export const RewindIcon = createIcon(Backward01Icon, "RewindIcon");
export const RotateCcw = createIcon(Rotate01Icon, "RotateCcw");
export const Rocket = createIcon(Rocket01Icon, "Rocket");
export const Save = createIcon(SaveIcon, "Save");
export const ScrollText = createIcon(ScrollIcon, "ScrollText");
export const Search = createIcon(Search01Icon, "Search");
export const Send = createIcon(SentIcon, "Send");
export const Settings = createIcon(Settings01Icon, "Settings");
export const Share2 = createIcon(Share01Icon, "Share2");
export const Shield = createIcon(ShieldIcon, "Shield");
export const ShieldCheck = createIcon(Shield01Icon, "ShieldCheck");
export const Sliders = createIcon(SlidersVerticalIcon, "Sliders");
export const Smartphone = createIcon(SmartPhone01Icon, "Smartphone");
export const Sparkles = createIcon(SparklesHugeIcon, "Sparkles");
export const SparklesIcon = createIcon(SparklesHugeIcon, "SparklesIcon");
export const Speech = createIcon(SpeechToTextIcon, "Speech");
export const Square = createIcon(SquareIcon, "Square");
export const Star = createIcon(StarIcon, "Star");
export const Sun = createIcon(Sun01Icon, "Sun");
export const SunMedium = createIcon(Sun01Icon, "SunMedium");
export const Table = createIcon(TableIcon, "Table");
export const Tablet = createIcon(Tablet01Icon, "Tablet");
export const Target = createIcon(Target01Icon, "Target");
export const ThumbsDown = createIcon(ThumbsDownIcon, "ThumbsDown");
export const ThumbsUp = createIcon(ThumbsUpIcon, "ThumbsUp");
export const Trash = createIcon(Delete01Icon, "Trash");
export const Trash2 = createIcon(Delete02Icon, "Trash2");
export const TrendingUp = createIcon(Chart01Icon, "TrendingUp");
export const Twitter = createIcon(TwitterIcon, "Twitter");
export const Upload = createIcon(Upload01Icon, "Upload");
export const User = createIcon(UserIcon, "User");
export const UserCheck = createIcon(UserCheck01Icon, "UserCheck");
export const UserCog = createIcon(UserSettings01Icon, "UserCog");
export const UserMinus = createIcon(UserRemove01Icon, "UserMinus");
export const UserPlus = createIcon(UserAdd01Icon, "UserPlus");
export const Users = createIcon(UserGroupIcon, "Users");
export const Video = createIcon(VideoReplayIcon, "Video");
export const Volume2 = createIcon(VolumeHighIcon, "Volume2");
export const Volume2Icon = createIcon(VolumeHighIcon, "Volume2Icon");
export const VolumeIcon = createIcon(VolumeHighIcon, "VolumeIcon");
export const VolumeXIcon = createIcon(VolumeMuteIcon, "VolumeXIcon");
export const X = createIcon(Cancel01Icon, "X");
export const XCircle = createIcon(CancelCircleIcon, "XCircle");
export const XIcon = createIcon(Cancel01Icon, "XIcon");
export const Zap = createIcon(FlashIcon, "Zap");
