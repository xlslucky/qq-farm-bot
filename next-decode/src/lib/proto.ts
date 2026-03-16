import protobuf from 'protobufjs';
import path from 'path';

const protoDir = path.join(process.cwd(), 'public', 'proto');

let root: any = null;
let loadingPromise: Promise<any> | null = null;
const types: any = {};

export async function loadProto() {
    if (root) return { root, types };
    if (loadingPromise) return loadingPromise;
    
    loadingPromise = (async () => {
        root = new protobuf.Root();
        await root.load([
            path.join(protoDir, 'game.proto'),
            path.join(protoDir, 'userpb.proto'),
            path.join(protoDir, 'plantpb.proto'),
            path.join(protoDir, 'corepb.proto'),
            path.join(protoDir, 'shoppb.proto'),
            path.join(protoDir, 'friendpb.proto'),
            path.join(protoDir, 'visitpb.proto'),
            path.join(protoDir, 'notifypb.proto'),
            path.join(protoDir, 'taskpb.proto'),
            path.join(protoDir, 'itempb.proto'),
        ], { keepCase: true });

        types.GateMessage = root.lookupType('gatepb.Message');
        types.GateMeta = root.lookupType('gatepb.Meta');
        types.EventMessage = root.lookupType('gatepb.EventMessage');
        types.KickoutNotify = root.lookupType('gatepb.KickoutNotify');

        types.LoginRequest = root.lookupType('gamepb.userpb.LoginRequest');
        types.LoginReply = root.lookupType('gamepb.userpb.LoginReply');
        types.HeartbeatRequest = root.lookupType('gamepb.userpb.HeartbeatRequest');
        types.HeartbeatReply = root.lookupType('gamepb.userpb.HeartbeatReply');
        types.ReportArkClickRequest = root.lookupType('gamepb.userpb.ReportArkClickRequest');
        types.ReportArkClickReply = root.lookupType('gamepb.userpb.ReportArkClickReply');
        types.BasicNotify = root.lookupType('gamepb.userpb.BasicNotify');

        types.AllLandsRequest = root.lookupType('gamepb.plantpb.AllLandsRequest');
        types.AllLandsReply = root.lookupType('gamepb.plantpb.AllLandsReply');
        types.HarvestRequest = root.lookupType('gamepb.plantpb.HarvestRequest');
        types.HarvestReply = root.lookupType('gamepb.plantpb.HarvestReply');
        types.WaterLandRequest = root.lookupType('gamepb.plantpb.WaterLandRequest');
        types.WaterLandReply = root.lookupType('gamepb.plantpb.WaterLandReply');
        types.WeedOutRequest = root.lookupType('gamepb.plantpb.WeedOutRequest');
        types.WeedOutReply = root.lookupType('gamepb.plantpb.WeedOutReply');
        types.InsecticideRequest = root.lookupType('gamepb.plantpb.InsecticideRequest');
        types.InsecticideReply = root.lookupType('gamepb.plantpb.InsecticideReply');
        types.RemovePlantRequest = root.lookupType('gamepb.plantpb.RemovePlantRequest');
        types.RemovePlantReply = root.lookupType('gamepb.plantpb.RemovePlantReply');
        types.PutInsectsRequest = root.lookupType('gamepb.plantpb.PutInsectsRequest');
        types.PutInsectsReply = root.lookupType('gamepb.plantpb.PutInsectsReply');
        types.PutWeedsRequest = root.lookupType('gamepb.plantpb.PutWeedsRequest');
        types.PutWeedsReply = root.lookupType('gamepb.plantpb.PutWeedsReply');
        types.FertilizeRequest = root.lookupType('gamepb.plantpb.FertilizeRequest');
        types.FertilizeReply = root.lookupType('gamepb.plantpb.FertilizeReply');
        types.UpgradeLandRequest = root.lookupType('gamepb.plantpb.UpgradeLandRequest');
        types.UpgradeLandReply = root.lookupType('gamepb.plantpb.UpgradeLandReply');
        types.UnlockLandRequest = root.lookupType('gamepb.plantpb.UnlockLandRequest');
        types.UnlockLandReply = root.lookupType('gamepb.plantpb.UnlockLandReply');
        types.PlantRequest = root.lookupType('gamepb.plantpb.PlantRequest');
        types.PlantReply = root.lookupType('gamepb.plantpb.PlantReply');
        types.LandsNotify = root.lookupType('gamepb.plantpb.LandsNotify');

        types.BagRequest = root.lookupType('gamepb.itempb.BagRequest');
        types.BagReply = root.lookupType('gamepb.itempb.BagReply');
        types.SellRequest = root.lookupType('gamepb.itempb.SellRequest');
        types.SellReply = root.lookupType('gamepb.itempb.SellReply');
        types.UseRequest = root.lookupType('gamepb.itempb.UseRequest');
        types.UseReply = root.lookupType('gamepb.itempb.UseReply');
        types.BatchUseRequest = root.lookupType('gamepb.itempb.BatchUseRequest');
        types.BatchUseReply = root.lookupType('gamepb.itempb.BatchUseReply');
        types.ItemNotify = root.lookupType('gamepb.itempb.ItemNotify');

        types.ShopProfilesRequest = root.lookupType('gamepb.shoppb.ShopProfilesRequest');
        types.ShopProfilesReply = root.lookupType('gamepb.shoppb.ShopProfilesReply');
        types.ShopInfoRequest = root.lookupType('gamepb.shoppb.ShopInfoRequest');
        types.ShopInfoReply = root.lookupType('gamepb.shoppb.ShopInfoReply');
        types.BuyGoodsRequest = root.lookupType('gamepb.shoppb.BuyGoodsRequest');
        types.BuyGoodsReply = root.lookupType('gamepb.shoppb.BuyGoodsReply');

        types.GetAllFriendsRequest = root.lookupType('gamepb.friendpb.GetAllRequest');
        types.GetAllFriendsReply = root.lookupType('gamepb.friendpb.GetAllReply');
        types.GetGameFriendsRequest = root.lookupType('gamepb.friendpb.GetGameFriendsRequest');
        types.GetGameFriendsReply = root.lookupType('gamepb.friendpb.GetGameFriendsReply');
        types.GetApplicationsRequest = root.lookupType('gamepb.friendpb.GetApplicationsRequest');
        types.GetApplicationsReply = root.lookupType('gamepb.friendpb.GetApplicationsReply');
        types.AcceptFriendsRequest = root.lookupType('gamepb.friendpb.AcceptFriendsRequest');
        types.AcceptFriendsReply = root.lookupType('gamepb.friendpb.AcceptFriendsReply');
        types.FriendApplicationReceivedNotify = root.lookupType('gamepb.friendpb.FriendApplicationReceivedNotify');
        types.FriendAddedNotify = root.lookupType('gamepb.friendpb.FriendAddedNotify');

        types.VisitEnterRequest = root.lookupType('gamepb.visitpb.EnterRequest');
        types.VisitEnterReply = root.lookupType('gamepb.visitpb.EnterReply');
        types.VisitLeaveRequest = root.lookupType('gamepb.visitpb.LeaveRequest');
        types.VisitLeaveReply = root.lookupType('gamepb.visitpb.LeaveReply');

        types.TaskInfoRequest = root.lookupType('gamepb.taskpb.TaskInfoRequest');
        types.TaskInfoReply = root.lookupType('gamepb.taskpb.TaskInfoReply');
        types.ClaimTaskRewardRequest = root.lookupType('gamepb.taskpb.ClaimTaskRewardRequest');
        types.ClaimTaskRewardReply = root.lookupType('gamepb.taskpb.ClaimTaskRewardReply');
        types.BatchClaimTaskRewardRequest = root.lookupType('gamepb.taskpb.BatchClaimTaskRewardRequest');
        types.BatchClaimTaskRewardReply = root.lookupType('gamepb.taskpb.BatchClaimTaskRewardReply');
        types.TaskInfoNotify = root.lookupType('gamepb.taskpb.TaskInfoNotify');

        return { root, types };
    })();
    
    return loadingPromise;
}

export function getRoot() {
    return root;
}

export { types };