import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface WorkloadConfig {
    workEndHour: bigint;
    workStartHour: bigint;
    dailyTrackCapacity: bigint;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface SpotifyTokens {
    expiresAt: bigint;
    refreshToken: string;
    displayName: string;
    spotifyUserId: string;
    accessToken: string;
}
export interface Task {
    effortTracks: bigint;
    name: string;
    createdAt: bigint;
    deadline?: bigint;
    state: TaskState;
    notes?: string;
    priority: Priority;
}
export interface http_header {
    value: string;
    name: string;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface Session {
    totalTracks: bigint;
    startedAt: bigint;
    pauseCount: bigint;
    endedAt?: bigint;
    tracksCompleted: bigint;
    playlistId: string;
    score: bigint;
    taskId: bigint;
    playlistName: string;
    completedWithinSession: boolean;
}
export interface CalendarEvent {
    scheduledDate: bigint;
    blockType: BlockType;
    taskId: bigint;
    trackPosition: bigint;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface UserProfile {
    spotifyConnected: boolean;
    name: string;
}
export enum BlockType {
    Playlist = "Playlist",
    Single = "Single"
}
export enum Priority {
    Low = "Low",
    High = "High",
    Medium = "Medium",
    Urgent = "Urgent"
}
export enum TaskState {
    Overtime = "Overtime",
    InProgress = "InProgress",
    Completed = "Completed",
    NotStarted = "NotStarted"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createCalendarEvent(event: CalendarEvent): Promise<bigint>;
    createSession(session: Session): Promise<bigint>;
    createTask(task: Task): Promise<bigint>;
    deleteTask(id: bigint): Promise<void>;
    getAllSessions(): Promise<Array<Session>>;
    getAllTasks(): Promise<Array<Task>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCurrentlyPlaying(): Promise<string>;
    getPlaybackState(): Promise<string>;
    getUserPlaylists(): Promise<string>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUserTokens(): Promise<SpotifyTokens | null>;
    getWorkloadConfig(): Promise<WorkloadConfig>;
    isCallerAdmin(): Promise<boolean>;
    pausePlayback(): Promise<string>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    startPlayback(): Promise<string>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    updateSession(id: bigint, session: Session): Promise<void>;
    updateTask(id: bigint, task: Task): Promise<void>;
    updateUserTokens(tokens: SpotifyTokens): Promise<void>;
    updateWorkloadConfig(config: WorkloadConfig): Promise<void>;
}
