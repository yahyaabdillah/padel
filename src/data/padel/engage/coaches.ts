// PadelHub — Coaching dummy data (coaches, classes/clinics, PT sessions).
// No DB. Pure in-memory mock used by the Coaching module.

export type CoachLevel = "Head Coach" | "Senior" | "Pro" | "Assistant";
export type CoachStatus = "active" | "on_leave";

export interface Coach {
  id: string;
  name: string;
  avatar: string;
  level: CoachLevel;
  status: CoachStatus;
  specialties: string[];
  /** PTAR / national level certifications */
  certifications: string[];
  rating: number; // 0..5
  reviews: number;
  ratePerHour: number; // IDR, for PT
  bio: string;
  /** this-month stats */
  sessionsThisMonth: number;
  hoursThisMonth: number;
  earningsThisMonth: number; // IDR
  activeClients: number;
  joinedAt: string; // ISO
}

export const coaches: Coach[] = [
  {
    id: "coach-001",
    name: "Dimas Pratama",
    avatar: "/images/user/user-03.jpg",
    level: "Head Coach",
    status: "active",
    specialties: ["Bandeja", "Strategy", "Match Play"],
    certifications: ["WPT Level 2", "PTAR Certified"],
    rating: 4.9,
    reviews: 128,
    ratePerHour: 350_000,
    bio: "Former national-team player. 9 years coaching, specializes in transition play and the bandeja-vibora arsenal.",
    sessionsThisMonth: 42,
    hoursThisMonth: 58,
    earningsThisMonth: 20_300_000,
    activeClients: 18,
    joinedAt: "2023-01-15",
  },
  {
    id: "coach-002",
    name: "Larasati Putri",
    avatar: "/images/user/user-05.jpg",
    level: "Senior",
    status: "active",
    specialties: ["Beginner Onboarding", "Footwork", "Volley"],
    certifications: ["WPT Level 1", "First Aid"],
    rating: 4.8,
    reviews: 96,
    ratePerHour: 280_000,
    bio: "Patient, methodical coach loved by first-timers. Builds rock-solid fundamentals from the net out.",
    sessionsThisMonth: 51,
    hoursThisMonth: 64,
    earningsThisMonth: 17_920_000,
    activeClients: 24,
    joinedAt: "2023-06-02",
  },
  {
    id: "coach-003",
    name: "Marco Alvarez",
    avatar: "/images/user/user-06.jpg",
    level: "Pro",
    status: "active",
    specialties: ["Smash", "Power Play", "Doubles Tactics"],
    certifications: ["FEP Spain Level 2"],
    rating: 4.7,
    reviews: 74,
    ratePerHour: 400_000,
    bio: "Spanish pro circuit experience. High-intensity sessions for intermediate-to-advanced players.",
    sessionsThisMonth: 33,
    hoursThisMonth: 41,
    earningsThisMonth: 16_400_000,
    activeClients: 15,
    joinedAt: "2024-02-20",
  },
  {
    id: "coach-004",
    name: "Sinta Rahmawati",
    avatar: "/images/user/user-07.jpg",
    level: "Pro",
    status: "on_leave",
    specialties: ["Women's Clinics", "Defense", "Lob"],
    certifications: ["WPT Level 1"],
    rating: 4.85,
    reviews: 61,
    ratePerHour: 300_000,
    bio: "Runs the popular women-only clinics. Currently on maternity leave, returning next quarter.",
    sessionsThisMonth: 0,
    hoursThisMonth: 0,
    earningsThisMonth: 0,
    activeClients: 11,
    joinedAt: "2023-09-11",
  },
  {
    id: "coach-005",
    name: "Reza Mahendra",
    avatar: "/images/user/user-08.jpg",
    level: "Assistant",
    status: "active",
    specialties: ["Kids Program", "Ball Feeding", "Drills"],
    certifications: ["First Aid"],
    rating: 4.6,
    reviews: 38,
    ratePerHour: 200_000,
    bio: "Energetic assistant coach driving the junior academy and group drill sessions.",
    sessionsThisMonth: 28,
    hoursThisMonth: 36,
    earningsThisMonth: 7_200_000,
    activeClients: 22,
    joinedAt: "2024-08-01",
  },
];

export const coachById = (id: string) => coaches.find((c) => c.id === id);

/* ────────────────────────────────────────────────────────
 * Classes & Clinics
 * ──────────────────────────────────────────────────────── */
export type ClassType = "Clinic" | "Group" | "Academy" | "Bootcamp";
export type ClassLevel = "Beginner" | "Intermediate" | "Advanced" | "All Levels";
export type WeekDay = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export interface PadelClass {
  id: string;
  title: string;
  type: ClassType;
  level: ClassLevel;
  coachId: string;
  day: WeekDay;
  startTime: string; // "18:00"
  endTime: string; // "19:30"
  court: string;
  capacity: number;
  enrolled: number;
  pricePerSession: number; // IDR
  color: string; // tailwind-ish hex for schedule chip
}

export const padelClasses: PadelClass[] = [
  {
    id: "cls-001",
    title: "Beginner Fundamentals",
    type: "Group",
    level: "Beginner",
    coachId: "coach-002",
    day: "Mon",
    startTime: "18:00",
    endTime: "19:30",
    court: "Court 1",
    capacity: 8,
    enrolled: 7,
    pricePerSession: 175_000,
    color: "#6D5BFF",
  },
  {
    id: "cls-002",
    title: "Smash & Power Clinic",
    type: "Clinic",
    level: "Advanced",
    coachId: "coach-003",
    day: "Tue",
    startTime: "19:00",
    endTime: "20:30",
    court: "Court 3",
    capacity: 6,
    enrolled: 6,
    pricePerSession: 250_000,
    color: "#14B8A6",
  },
  {
    id: "cls-003",
    title: "Junior Academy",
    type: "Academy",
    level: "All Levels",
    coachId: "coach-005",
    day: "Wed",
    startTime: "16:00",
    endTime: "17:30",
    court: "Court 2",
    capacity: 10,
    enrolled: 9,
    pricePerSession: 150_000,
    color: "#C6FF3D",
  },
  {
    id: "cls-004",
    title: "Tactics & Match Play",
    type: "Group",
    level: "Intermediate",
    coachId: "coach-001",
    day: "Thu",
    startTime: "20:00",
    endTime: "21:30",
    court: "Court 4",
    capacity: 8,
    enrolled: 5,
    pricePerSession: 220_000,
    color: "#6D5BFF",
  },
  {
    id: "cls-005",
    title: "Weekend Bootcamp",
    type: "Bootcamp",
    level: "Intermediate",
    coachId: "coach-001",
    day: "Sat",
    startTime: "08:00",
    endTime: "10:00",
    court: "Court 1",
    capacity: 12,
    enrolled: 11,
    pricePerSession: 300_000,
    color: "#14B8A6",
  },
  {
    id: "cls-006",
    title: "Women's Clinic",
    type: "Clinic",
    level: "All Levels",
    coachId: "coach-002",
    day: "Sat",
    startTime: "10:30",
    endTime: "12:00",
    court: "Court 2",
    capacity: 8,
    enrolled: 6,
    pricePerSession: 200_000,
    color: "#C6FF3D",
  },
  {
    id: "cls-007",
    title: "Footwork & Conditioning",
    type: "Group",
    level: "All Levels",
    coachId: "coach-005",
    day: "Fri",
    startTime: "18:30",
    endTime: "20:00",
    court: "Court 3",
    capacity: 10,
    enrolled: 8,
    pricePerSession: 180_000,
    color: "#6D5BFF",
  },
];

export const weekDays: WeekDay[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/* ────────────────────────────────────────────────────────
 * Personal Training (1-on-1 / 1-on-2) sessions
 * ──────────────────────────────────────────────────────── */
export type PTStatus = "confirmed" | "pending" | "completed" | "cancelled";

export interface PTSession {
  id: string;
  coachId: string;
  clientName: string;
  clientAvatar: string;
  date: string; // ISO date "2026-06-03"
  startTime: string; // "09:00"
  durationMin: number;
  court: string;
  focus: string;
  players: number; // 1 or 2
  price: number; // IDR
  status: PTStatus;
}

export const ptSessions: PTSession[] = [
  {
    id: "pt-001",
    coachId: "coach-001",
    clientName: "Andi Wijaya",
    clientAvatar: "/images/user/user-04.jpg",
    date: "2026-06-02",
    startTime: "09:00",
    durationMin: 60,
    court: "Court 1",
    focus: "Bandeja technique",
    players: 1,
    price: 350_000,
    status: "confirmed",
  },
  {
    id: "pt-002",
    coachId: "coach-003",
    clientName: "Rina & Bagus",
    clientAvatar: "/images/user/user-09.jpg",
    date: "2026-06-02",
    startTime: "11:00",
    durationMin: 90,
    court: "Court 3",
    focus: "Doubles positioning",
    players: 2,
    price: 600_000,
    status: "confirmed",
  },
  {
    id: "pt-003",
    coachId: "coach-002",
    clientName: "Putri Maharani",
    clientAvatar: "/images/user/user-10.jpg",
    date: "2026-06-03",
    startTime: "08:00",
    durationMin: 60,
    court: "Court 2",
    focus: "Serve & return",
    players: 1,
    price: 280_000,
    status: "pending",
  },
  {
    id: "pt-004",
    coachId: "coach-001",
    clientName: "Yusuf Hakim",
    clientAvatar: "/images/user/user-11.jpg",
    date: "2026-06-01",
    startTime: "18:00",
    durationMin: 60,
    court: "Court 4",
    focus: "Match strategy",
    players: 1,
    price: 350_000,
    status: "completed",
  },
  {
    id: "pt-005",
    coachId: "coach-005",
    clientName: "Citra Lestari",
    clientAvatar: "/images/user/user-12.jpg",
    date: "2026-06-04",
    startTime: "16:30",
    durationMin: 45,
    court: "Court 2",
    focus: "Kids intro",
    players: 1,
    price: 200_000,
    status: "confirmed",
  },
  {
    id: "pt-006",
    coachId: "coach-003",
    clientName: "Galang Pratomo",
    clientAvatar: "/images/user/user-13.jpg",
    date: "2026-05-30",
    startTime: "20:00",
    durationMin: 60,
    court: "Court 3",
    focus: "Smash drills",
    players: 1,
    price: 400_000,
    status: "cancelled",
  },
];

export const ptStatusMeta: Record<
  PTStatus,
  { label: string; tone: "success" | "warning" | "info" | "error" | "neutral" }
> = {
  confirmed: { label: "Confirmed", tone: "success" },
  pending: { label: "Pending", tone: "warning" },
  completed: { label: "Completed", tone: "info" },
  cancelled: { label: "Cancelled", tone: "error" },
};

/** Earnings trend for the coaching dashboard (last 6 months, IDR millions). */
export const coachingEarningsTrend = {
  categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  series: [
    { name: "Classes", data: [38, 41, 44, 47, 52, 58] },
    { name: "Personal Training", data: [22, 25, 24, 29, 31, 34] },
  ],
};
