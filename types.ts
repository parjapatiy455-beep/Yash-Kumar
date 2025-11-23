
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  enrolledCourses: string[];
  lastActive: string;
  watchedHours: number;
}

export interface Material {
  id: string;
  filename: string;
  url: string;
  storagePath: string;
  category?: 'Class Notes' | 'DPP' | 'DPP PDF';
  chapterTitle?: string; // Helper for display
}

export interface Lecture {
  id: string;
  title: string;
  youtubeId?: string | null; 
  videoUrl?: string | null;  // For Telegram or other sources
  thumbnail?: string | null; // Custom thumbnail for the video
  videoType?: 'youtube' | 'telegram' | 'live';
  isLive?: boolean;
  duration: string;
  order: number;
  date?: string;
  materials?: Record<string, Material>;
}

export interface Question {
    id: string;
    text: string;
    options: string[];
    correctOptionIndex: number;
    marks: number;
}

export interface Quiz {
    id: string;
    title: string;
    questions: Record<string, Question>;
}

export interface Chapter {
  id: string;
  title: string;
  order: number;
  lectures?: Record<string, Lecture>;
  materials?: Record<string, Material>;
  quiz?: Quiz;
}

export interface Subject {
  id: string;
  title: string;
  order: number;
  icon: string; // 'Ma', 'Ph', etc.
  chapters?: Record<string, Chapter>;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  instructor: string;
  instructorImage?: string;
  price: number;
  originalPrice?: number;
  tags: string[];
  language?: string;
  targetAudience?: string;
  startDate?: string;
  status?: 'Ongoing' | 'Upcoming' | 'Completed';
  publishStatus?: 'published' | 'draft';
  specialOffer?: string;
  planInfo?: string;
  subjects?: Record<string, Subject>;
}


export interface VideoProgress {
  userId: string;
  videoId: string;
  lastTime: number; // in seconds
}

export interface Note {
  id: string; // Firebase push key
  userId: string;
  videoId: string;
  courseId: string;
  text: string;
  timestamp?: number; // Time in seconds when note was taken
  updatedAt: string;
}

export interface Reply {
  id: string;
  author: 'student' | 'admin';
  authorName: string;
  text: string;
  createdAt: string;
}

export interface Doubt {
    id: string;
    userId: string;
    userName: string;
    lectureId: string;
    text: string;
    createdAt: string;
    replies?: Record<string, Reply>;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  message: string;
  status: 'Open' | 'In Progress' | 'Closed';
  createdAt: string;
  updatedAt: string;
  replies?: Record<string, Reply>;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  status: 'Published';
}