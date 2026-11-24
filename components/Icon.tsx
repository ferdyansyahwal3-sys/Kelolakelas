const paths: Record<string, React.ReactNode> = {
  home: <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />,
  cal: (<><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></>),
  users: (<><circle cx="9" cy="8.5" r="3.2" /><path d="M3 19.5c.7-3 3.1-4.8 6-4.8s5.3 1.8 6 4.8M15.5 5.6a3.2 3.2 0 0 1 0 6M17.6 14.9c1.8.6 3 2.2 3.4 4.6" /></>),
  bill: (<><rect x="3" y="5.5" width="18" height="13" rx="3" /><path d="M3 10h18M7 14.5h4" /></>),
  grid: (<><rect x="4" y="4" width="6.5" height="6.5" rx="2" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="2" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="2" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2" /></>),
  bell: (<><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></>),
  inbox: (<><path d="M4 13.5 6.5 5h11L20 13.5V19H4z" /><path d="M4 13.5h4.5l1 2h5l1-2H20" /></>),
  ne: <path d="M8 16 16 8M9 8h7v7" />,
  wa: <path d="M4 20l1.2-3.6A8 8 0 1 1 8 19z" />,
  arrow: <path d="m9 6 6 6-6 6" />,
  link: (<><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>),
  search: (<><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4-4" /></>),
  doc: (<><path d="M6 3.5h8l4 4V20.5H6z" /><path d="M14 3.5v4h4M9 12.5h6M9 16h4" /></>),
  tag: (<><path d="M4 12.5V4h8.5L20 11.5 11.5 20z" /><circle cx="8.5" cy="8.5" r="1.4" /></>),
  chart: <path d="M4 20V10M10 20V4M16 20v-7M21 20H3" />,
  coach: (<><circle cx="12" cy="7.5" r="3.5" /><path d="M5 20c1-4 3.8-6 7-6s6 2 7 6" /></>),
  x: <path d="M6 6l12 12M18 6 6 18" />,
  back: <path d="m15 6-6 6 6 6" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  sun: (<><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" /></>),
  moon: <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z" />,
  eye: (<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>),
  eyeoff: (<><path d="M4 4l16 16" /><path d="M10.6 6A9.7 9.7 0 0 1 12 5.5C18 5.5 21.5 12 21.5 12a17 17 0 0 1-3 3.9M6.6 7.6A17 17 0 0 0 2.5 12S6 18.5 12 18.5a9.6 9.6 0 0 0 4.2-1" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>),
};

export function Icon({ name, className = "ic" }: { name: keyof typeof paths | string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
