import Nat "mo:core/Nat";
import Text "mo:core/Text";
import List "mo:core/List";
import Runtime "mo:core/Runtime";
import Map "mo:core/Map";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import OutCall "http-outcalls/outcall";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  type Priority = {
    #Low;
    #Medium;
    #High;
    #Urgent;
  };

  type TaskState = {
    #NotStarted;
    #InProgress;
    #Completed;
    #Overtime;
  };

  type Task = {
    name : Text;
    effortTracks : Nat;
    priority : Priority;
    deadline : ?Int;
    state : TaskState;
    createdAt : Int;
    notes : ?Text;
  };

  type Session = {
    taskId : Nat;
    playlistId : Text;
    playlistName : Text;
    totalTracks : Nat;
    tracksCompleted : Nat;
    pauseCount : Nat;
    startedAt : Int;
    endedAt : ?Int;
    completedWithinSession : Bool;
    score : Nat;
  };

  type SpotifyTokens = {
    accessToken : Text;
    refreshToken : Text;
    expiresAt : Int;
    spotifyUserId : Text;
    displayName : Text;
  };

  type WorkloadConfig = {
    dailyTrackCapacity : Nat;
    workStartHour : Nat;
    workEndHour : Nat;
  };

  type BlockType = {
    #Single;
    #Playlist;
  };

  type CalendarEvent = {
    taskId : Nat;
    scheduledDate : Int;
    trackPosition : Nat;
    blockType : BlockType;
  };

  type DayReview = {
    plannedTracks : Nat;
    completedTracks : Nat;
    overtimeCount : Nat;
    avgScore : Nat;
  };

  public type UserProfile = {
    name : Text;
    spotifyConnected : Bool;
  };

  let tasks = Map.empty<Principal, Map.Map<Nat, Task>>();
  let sessions = Map.empty<Principal, Map.Map<Nat, Session>>();
  let userTokens = Map.empty<Principal, SpotifyTokens>();
  let workloadConfigs = Map.empty<Principal, WorkloadConfig>();
  let calendarEvents = Map.empty<Principal, Map.Map<Nat, CalendarEvent>>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  let taskIdCounters = Map.empty<Principal, Nat>();
  let sessionIdCounters = Map.empty<Principal, Nat>();
  let eventIdCounters = Map.empty<Principal, Nat>();

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  // User Profile Management
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Task Management
  public query ({ caller }) func getAllTasks() : async [Task] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view tasks");
    };
    switch (tasks.get(caller)) {
      case (?userTasks) {
        userTasks.values().toArray();
      };
      case (null) {
        [];
      };
    };
  };

  public shared ({ caller }) func createTask(task : Task) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create tasks");
    };
    
    let userTasks = switch (tasks.get(caller)) {
      case (?existing) { existing };
      case (null) {
        let newMap = Map.empty<Nat, Task>();
        tasks.add(caller, newMap);
        newMap;
      };
    };

    let counter = switch (taskIdCounters.get(caller)) {
      case (?c) { c };
      case (null) { 0 };
    };
    
    let id = counter;
    taskIdCounters.add(caller, counter + 1);
    
    let newTask : Task = {
      task with
      createdAt = Time.now();
      state = #NotStarted;
    };
    userTasks.add(id, newTask);
    id;
  };

  public shared ({ caller }) func updateTask(id : Nat, task : Task) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update tasks");
    };
    
    switch (tasks.get(caller)) {
      case (?userTasks) {
        if (not userTasks.containsKey(id)) { 
          Runtime.trap("Task not found");
        };
        userTasks.add(id, task);
      };
      case (null) {
        Runtime.trap("Task not found");
      };
    };
  };

  public shared ({ caller }) func deleteTask(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete tasks");
    };
    
    switch (tasks.get(caller)) {
      case (?userTasks) {
        if (not userTasks.containsKey(id)) { 
          Runtime.trap("Task not found");
        };
        userTasks.remove(id);
      };
      case (null) {
        Runtime.trap("Task not found");
      };
    };
  };

  // Session Management
  public query ({ caller }) func getAllSessions() : async [Session] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view sessions");
    };
    switch (sessions.get(caller)) {
      case (?userSessions) {
        userSessions.values().toArray();
      };
      case (null) {
        [];
      };
    };
  };

  public shared ({ caller }) func createSession(session : Session) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create session");
    };
    
    let userSessions = switch (sessions.get(caller)) {
      case (?existing) { existing };
      case (null) {
        let newMap = Map.empty<Nat, Session>();
        sessions.add(caller, newMap);
        newMap;
      };
    };

    let counter = switch (sessionIdCounters.get(caller)) {
      case (?c) { c };
      case (null) { 0 };
    };
    
    let id = counter;
    sessionIdCounters.add(caller, counter + 1);
    
    let newSession : Session = {
      session with
      tracksCompleted = 0;
      pauseCount = 0;
      startedAt = Time.now();
      completedWithinSession = false;
      score = 0;
    };
    userSessions.add(id, newSession);
    id;
  };

  public shared ({ caller }) func updateSession(id : Nat, session : Session) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update session");
    };
    
    switch (sessions.get(caller)) {
      case (?userSessions) {
        if (not userSessions.containsKey(id)) { 
          Runtime.trap("Session not found");
        };
        userSessions.add(id, session);
      };
      case (null) {
        Runtime.trap("Session not found");
      };
    };
  };

  // Spotify Token Management
  public shared ({ caller }) func updateUserTokens(tokens : SpotifyTokens) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update tokens");
    };
    userTokens.add(caller, tokens);
  };

  public query ({ caller }) func getUserTokens() : async ?SpotifyTokens {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get tokens");
    };
    userTokens.get(caller);
  };

  // Workload Configuration
  public shared ({ caller }) func updateWorkloadConfig(config : WorkloadConfig) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update config");
    };
    workloadConfigs.add(caller, config);
  };

  public query ({ caller }) func getWorkloadConfig() : async WorkloadConfig {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get config");
    };
    switch (workloadConfigs.get(caller)) {
      case (?config) {
        config;
      };
      case (null) {
        {
          dailyTrackCapacity = 30;
          workStartHour = 9;
          workEndHour = 18;
        };
      };
    };
  };

  // Calendar Event Management
  public shared ({ caller }) func createCalendarEvent(event : CalendarEvent) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create calendar events");
    };
    
    let userEvents = switch (calendarEvents.get(caller)) {
      case (?existing) { existing };
      case (null) {
        let newMap = Map.empty<Nat, CalendarEvent>();
        calendarEvents.add(caller, newMap);
        newMap;
      };
    };

    let counter = switch (eventIdCounters.get(caller)) {
      case (?c) { c };
      case (null) { 0 };
    };
    
    let id = counter;
    eventIdCounters.add(caller, counter + 1);
    
    userEvents.add(id, event);
    id;
  };

  // Spotify API Integration
  public shared ({ caller }) func startPlayback() : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can start playback");
    };
    await OutCall.httpPostRequest(
      "https://api.spotify.com/v1/me/player/play",
      [],
      "",
      transform
    );
  };

  public shared ({ caller }) func pausePlayback() : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can pause playback");
    };
    await OutCall.httpPostRequest(
      "https://api.spotify.com/v1/me/player/pause",
      [],
      "",
      transform
    );
  };

  public shared ({ caller }) func getCurrentlyPlaying() : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get currently playing");
    };
    await OutCall.httpGetRequest(
      "https://api.spotify.com/v1/me/player/currently-playing",
      [],
      transform
    );
  };

  public shared ({ caller }) func getUserPlaylists() : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get playlists");
    };
    await OutCall.httpGetRequest(
      "https://api.spotify.com/v1/me/playlists",
      [],
      transform
    );
  };

  public shared ({ caller }) func getPlaybackState() : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get playback state");
    };
    await OutCall.httpGetRequest(
      "https://api.spotify.com/v1/me/player",
      [],
      transform
    );
  };
};
