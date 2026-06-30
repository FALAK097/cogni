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
  GridIcon,
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
  MicOffIcon,
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
export const Mic = createIcon(MicOffIcon, "MicOff");
export const MicOff = createIcon(MicOffIcon, "MicOff");
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
export const icons = createIcon(GridIcon, "icons");

// Global Icons registry object supporting camelCase and PascalCase mappings
export const Icons = {
  GET: () => (
    <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 mr-1.5 select-none font-mono">
      GET
    </span>
  ),
  POST: () => (
    <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider rounded bg-blue-500/10 text-blue-500 border border-blue-500/20 mr-1.5 select-none font-mono">
      POST
    </span>
  ),
  PUT: () => (
    <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 mr-1.5 select-none font-mono">
      PUT
    </span>
  ),
  PATCH: () => (
    <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 mr-1.5 select-none font-mono">
      PATCH
    </span>
  ),
  DELETE: () => (
    <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider rounded bg-rose-500/10 text-rose-500 border border-rose-500/20 mr-1.5 select-none font-mono">
      DEL
    </span>
  ),
  DEL: () => (
    <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider rounded bg-rose-500/10 text-rose-500 border border-rose-500/20 mr-1.5 select-none font-mono">
      DEL
    </span>
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
