export interface User {
  gid: number;
  name: string;
  level: number;
  gold: number;
  exp: number;
}

export interface PlantPhaseInfo {
  phase: number;
  begin_time: number;
  phase_id: number;
  dry_time: number;
  weeds_time: number;
  insect_time: number;
}

export interface PlantInfo {
  id: number;
  name: string;
  phases: PlantPhaseInfo[];
  season: number;
  dry_num: number;
  stole_num: number;
  fruit_id: number;
  fruit_num: number;
  weed_owners: number[];
  insect_owners: number[];
  stealers: number[];
  grow_sec: number;
  stealable: boolean;
  left_inorc_fert_times: number;
  left_fruit_num: number;
}

export interface LandInfo {
  id: number;
  unlocked: boolean;
  level: number;
  max_level: number;
  could_unlock: boolean;
  could_upgrade: boolean;
  plant?: PlantInfo;
  is_shared: boolean;
  can_share: boolean;
  master_land_id: number;
  land_size: number;
}

export interface OperationLimit {
  id: number;
  day_times: number;
  day_times_lt: number;
  day_exp_times: number;
  day_ex_times_lt: number;
}

export interface FriendPlant {
  dry_time_sec: number;
  weed_time_sec: number;
  insect_time_sec: number;
  ripe_time_sec: number;
  ripe_fruit_id: number;
  steal_plant_num: number;
  dry_num: number;
  weed_num: number;
  insect_num: number;
}

export interface GameFriend {
  gid: number;
  open_id: string;
  name: string;
  avatar_url: string;
  remark: string;
  level: number;
  gold: number;
  tags: {
    is_new: boolean;
    is_follow: boolean;
  };
  plant: FriendPlant;
  authorized_status: number;
}

export interface LogEntry {
  level: string;
  tag: string;
  message: string;
  timestamp: number;
}

export interface Settings {
  farmCheckInterval: number;
  friendCheckInterval: number;
  forceLowestLevelCrop: boolean;
  platform: string;
  autoHarvest: boolean;
  autoRemove: boolean;
  autoPlant: boolean;
  autoFertilize: boolean;
  autoWeed: boolean;
  autoPest: boolean;
  autoWater: boolean;
  autoUpgrade: boolean;
  autoUnlock: boolean;
  autoFriendVisit: boolean;
  autoHelp: boolean;
  autoSteal: boolean;
  autoSell: boolean;
}

export interface BackpackItem {
  id: number;
  count: number;
  uid: number;
  name: string;
  icon: string;
  type: number;
  mutant_types: string[];
}

export interface FarmState {
  user: User | null;
  lands: LandInfo[];
  friends: GameFriend[];
  logs: LogEntry[];
  operationLimits: OperationLimit[];
  backpack: BackpackItem[];
  isConnected: boolean;
  serverTime: number;
  settings: Settings;
}
