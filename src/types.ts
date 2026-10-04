export interface AgendaTopic {
  title: string;
  duration: number; // in minutes
  description: string;
  startTime?: string; // e.g., "10:00 AM"
}

export interface MeetingAgenda {
  title: string;
  stakeholders: string[];
  topics: AgendaTopic[];
  totalDuration: number; // in minutes
}

export interface UploadedFile {
  name: string;
  type: string;
  data: string; // base64
}

export interface ChatMessage {
  id?: string;
  role: 'user' | 'model';
  text: string;
  timestamp?: Date;
  status?: 'sent' | 'delivered' | 'read';
  sources?: { title: string; uri: string }[];
}
