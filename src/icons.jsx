// Apple SF-Symbols-inspired icons (original line-art, 18×18 viewBox)
export const Icon = ({ d, size = 18, fill = "none", stroke = "currentColor", strokeWidth = 1.5, children, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 18 18" fill={fill} stroke={stroke}
       strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...rest}>
    {d ? <path d={d} /> : children}
  </svg>
);

export const IDashboard = (p) => <Icon {...p}><rect x="2.5" y="2.5" width="5.5" height="6.5" rx="1.2"/><rect x="10" y="2.5" width="5.5" height="4" rx="1.2"/><rect x="2.5" y="11" width="5.5" height="4.5" rx="1.2"/><rect x="10" y="8" width="5.5" height="7.5" rx="1.2"/></Icon>;
export const IWBS = (p) => <Icon {...p}><rect x="6" y="2" width="6" height="3.5" rx="1"/><rect x="2" y="11" width="5" height="3.5" rx="1"/><rect x="11" y="11" width="5" height="3.5" rx="1"/><path d="M9 5.5v2M9 7.5H4.5v3.5M9 7.5h4.5v3.5"/></Icon>;
export const ICalendar = (p) => <Icon {...p}><rect x="2.5" y="3.5" width="13" height="11" rx="1.5"/><path d="M2.5 7H15.5M5.5 2v3M12.5 2v3"/></Icon>;
export const ILog = (p) => <Icon {...p}><path d="M4 2.5h7l3 3v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3.5a1 1 0 011-1z"/><path d="M11 2.5v3h3M5.5 9h7M5.5 12h5"/></Icon>;
export const IInventory = (p) => <Icon {...p}><path d="M2.5 5.5L9 2l6.5 3.5v7L9 16l-6.5-3.5v-7z"/><path d="M2.5 5.5L9 9l6.5-3.5M9 9v7"/></Icon>;
export const ISearch = (p) => <Icon {...p}><circle cx="8" cy="8" r="5"/><path d="M12 12l3 3"/></Icon>;
export const IPlus = (p) => <Icon {...p}><path d="M9 3.5v11M3.5 9h11"/></Icon>;
export const IChev = (p) => <Icon {...p}><path d="M7 4l4 5-4 5"/></Icon>;
export const IChevL = (p) => <Icon {...p}><path d="M11 4l-4 5 4 5"/></Icon>;
export const IChevR = (p) => <Icon {...p}><path d="M7 4l4 5-4 5"/></Icon>;
export const IChevD = (p) => <Icon {...p}><path d="M4 7l5 4 5-4"/></Icon>;
export const ICheck = (p) => <Icon {...p}><path d="M3.5 9.5l3.5 3.5L14.5 5"/></Icon>;
export const IBell = (p) => <Icon {...p}><path d="M5 7.5a4 4 0 018 0v2.5l1 2H4l1-2V7.5z"/><path d="M7.5 13a1.5 1.5 0 003 0"/></Icon>;
export const ISun = (p) => <Icon {...p}><circle cx="9" cy="9" r="3"/><path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.5 3.5l1.5 1.5M13 13l1.5 1.5M3.5 14.5L5 13M13 5l1.5-1.5"/></Icon>;
export const IMoon = (p) => <Icon {...p}><path d="M14 11A6 6 0 117 4a5 5 0 007 7z"/></Icon>;
export const ISidebar = (p) => <Icon {...p}><rect x="2.5" y="3.5" width="13" height="11" rx="1.5"/><path d="M7 3.5v11"/></Icon>;
export const ITrend = (p) => <Icon {...p}><path d="M2.5 12L6 8.5l3 3 6.5-7"/><path d="M11.5 4.5h4v4"/></Icon>;
export const ICart = (p) => <Icon {...p}><path d="M2.5 3h2l1.5 8.5h8.5L16 6H6"/><circle cx="7" cy="14" r="1"/><circle cx="13" cy="14" r="1"/></Icon>;
export const IDollar = (p) => <Icon {...p}><path d="M9 2v14M12.5 5.5c0-1.5-1.5-2.5-3.5-2.5s-3.5 1-3.5 2.5S7 8 9 8s3.5.5 3.5 2.5-1.5 2.5-3.5 2.5-3.5-1-3.5-2.5"/></Icon>;
export const IBox = (p) => <Icon {...p}><path d="M2.5 5.5L9 2.5l6.5 3v7L9 15.5l-6.5-3v-7z"/><path d="M2.5 5.5L9 8.5l6.5-3M9 8.5v7"/></Icon>;
export const IFilter = (p) => <Icon {...p}><path d="M2.5 4h13l-5 6v5l-3-1.5v-3.5l-5-6z"/></Icon>;
export const IFlag = (p) => <Icon {...p}><path d="M4 2v14M4 3h10l-2 3 2 3H4"/></Icon>;
export const IPaperclip = (p) => <Icon {...p}><path d="M13.5 7.5l-5 5a3 3 0 01-4-4l6-6a2 2 0 113 3l-6 6a1 1 0 01-1.5-1.5l5-5"/></Icon>;
export const IDots = (p) => <Icon {...p}><circle cx="4" cy="9" r="1"/><circle cx="9" cy="9" r="1"/><circle cx="14" cy="9" r="1"/></Icon>;
export const IList = (p) => <Icon {...p}><path d="M3 5h12M3 9h12M3 13h12"/></Icon>;
export const IGrid = (p) => <Icon {...p}><rect x="2.5" y="2.5" width="5.5" height="5.5" rx="1"/><rect x="10" y="2.5" width="5.5" height="5.5" rx="1"/><rect x="2.5" y="10" width="5.5" height="5.5" rx="1"/><rect x="10" y="10" width="5.5" height="5.5" rx="1"/></Icon>;
export const ISKU = (p) => <Icon {...p}><rect x="2.5" y="3.5" width="13" height="11" rx="1.5"/><path d="M5.5 7h7M5.5 10h4M12.5 10h1"/></Icon>;
export const IPPC = (p) => <Icon {...p}><circle cx="9" cy="9" r="6.5"/><path d="M9 9l3.5-3.5M9 9V4M9 9h5"/></Icon>;
export const IWeek = (p) => <Icon {...p}><rect x="2.5" y="3.5" width="13" height="11" rx="1.5"/><path d="M2.5 7H15.5"/><rect x="5" y="9" width="2" height="2" fill="currentColor" stroke="none"/><rect x="8" y="9" width="2" height="2" fill="currentColor" stroke="none"/><rect x="11" y="9" width="2" height="2" fill="currentColor" stroke="none"/></Icon>;
export const ISettings = (p) => <Icon {...p}><circle cx="9" cy="9" r="2.5"/><path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.5 3.5l1.5 1.5M13 13l1.5 1.5M3.5 14.5L5 13M13 5l1.5-1.5"/></Icon>;
export const IClose = (p) => <Icon {...p}><path d="M5 5l8 8M13 5l-8 8"/></Icon>;
export const ISales = (p) => <Icon {...p}><rect x="2.5" y="3.5" width="13" height="11" rx="1.5"/><path d="M2.5 7.5H15.5M2.5 11H15.5M7 3.5v11"/></Icon>;
export const ITarget = (p) => <Icon {...p}><circle cx="9" cy="9" r="6.5"/><circle cx="9" cy="9" r="3"/><circle cx="9" cy="9" r="1" fill="currentColor" stroke="none"/></Icon>;
export const IEdit = (p) => <Icon {...p}><path d="M13.5 2.5l2 2L5.5 15.5H3.5v-2L13.5 2.5z"/><path d="M11.5 4.5l2 2"/></Icon>;
