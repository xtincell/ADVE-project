/* Shared inline icon set for the UPgraders dashboard kit.
   Rounded 2px stroke (Lucide-style) to match the brand iconography. */
const _i = (paths, fill) => (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill={fill ? "currentColor" : "none"}
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    {paths}
  </svg>
);

const UPIcons = {
  Home: _i(<><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/></>),
  Grid: _i(<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>),
  Message: _i(<path d="M21 11.5a8 8 0 0 1-11.6 7.1L3 21l2.3-6.4A8 8 0 1 1 21 11.5Z"/>),
  Calendar: _i(<><rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9h18M8 2.5v4M16 2.5v4"/></>),
  Content: _i(<><rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 8h8M8 12h8M8 16h5"/></>),
  Chart: _i(<><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>),
  Megaphone: _i(<><path d="m3 11 16-6v14L3 13v-2Z"/><path d="M11.6 17.6a3 3 0 0 1-5.6-1.6V13"/></>),
  Billing: _i(<><rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20"/></>),
  Settings: _i(<><circle cx="12" cy="12" r="3"/><path d="M19.5 13.6a2 2 0 0 0 .4 2.2l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a2 2 0 0 0-3.4 1.4V22a2 2 0 1 1-4 0v-.2a2 2 0 0 0-3.4-1.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a2 2 0 0 0 .4-2.2 2 2 0 0 0-1.8-1.2H2a2 2 0 1 1 0-4h.2A2 2 0 0 0 4 8.4a2 2 0 0 0-.4-2.2l-.1-.1A2 2 0 1 1 6.3 3.3l.1.1A2 2 0 0 0 9.8 2H10a2 2 0 1 1 4 0v.2a2 2 0 0 0 3.4 1.4l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a2 2 0 0 0-.4 2.2V8a2 2 0 0 0 1.8 1.2h.2a2 2 0 1 1 0 4h-.2a2 2 0 0 0-1.9 1.4Z"/></>),
  Search: _i(<><circle cx="11" cy="11" r="7"/><path d="m21 21-4-4"/></>),
  Bell: _i(<><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></>),
  Plus: _i(<><path d="M12 5v14M5 12h14"/></>),
  ArrowR: _i(<><path d="M5 12h14M13 6l6 6-6 6"/></>),
  ArrowUpR: _i(<><path d="M7 17 17 7M9 7h8v8"/></>),
  ChevD: _i(<path d="m6 9 6 6 6-6"/>),
  ChevR: _i(<path d="m9 6 6 6-6 6"/>),
  Rocket: _i(<><path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.9.7-2.2-.2-3a2.2 2.2 0 0 0-2.8 0Z"/><path d="M12 15 9 12a14 14 0 0 1 3-7c1.6-2.3 4-3.8 7-4 .2 3-1.3 5.4-3.6 7A14 14 0 0 1 12 15Z"/><path d="M9 12H4s.5-2.8 2-4c1.5-1.4 5-1 5-1M12 15v5s2.8-.5 4-2c1.4-1.5 1-5 1-5"/></>),
  Star: _i(<path d="m12 2 2.9 6.26 6.84.62-5.16 4.54 1.54 6.7L12 16.9 5.88 20.6l1.54-6.7L2.26 8.88l6.84-.62Z"/>, true),
  Heart: _i(<path d="M12 20s-7-4.4-9.3-8.5C1 8.5 2.4 5 5.7 5c2 0 3.3 1.3 4.3 2.6C11 6.3 12.3 5 14.3 5 17.6 5 19 8.5 17.3 11.5 15 15.6 12 20 12 20Z"/>, true),
  Check: _i(<path d="m5 12 5 5 9-11"/>),
  Send: _i(<><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></>),
  Target: _i(<><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></>),
  Users: _i(<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/></>),
  Trophy: _i(<><path d="M6 9a6 6 0 0 0 12 0V4H6Z"/><path d="M6 5H3v2a3 3 0 0 0 3 3M18 5h3v2a3 3 0 0 1-3 3M9 20h6M12 15v5"/></>),
  Coins: _i(<><circle cx="8" cy="8" r="6"/><path d="M18.1 6.3A6 6 0 1 1 16 17.7M7 6h1v4M16.7 14H18"/></>),
  Gift: _i(<><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13M12 8S11 3 8 3a2.5 2.5 0 0 0 0 5h4ZM12 8s1-5 4-5a2.5 2.5 0 0 1 0 5h-4Z"/></>),
  Instagram: _i(<><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></>),
  Image: _i(<><rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></>),
  Bolt: _i(<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>, true),
  X: _i(<path d="M18 6 6 18M6 6l12 12"/>),
  Sun: _i(<><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></>),
  Moon: _i(<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>),
};

Object.assign(window, { UPIcons });
