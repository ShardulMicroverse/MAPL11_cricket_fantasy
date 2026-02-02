const MatchQueue = require('../models/MatchQueue');
const AutoMatchedTeam = require('../models/AutoMatchedTeam');
const FantasyTeam = require('../models/FantasyTeam');
const Match = require('../models/Match');
const { broadcastTeamMatched } = require('../sockets/socketServer');

const TEAM_SIZE = 4;
const TEAM_NAME_ADJECTIVES = ['Mighty', 'Swift', 'Royal', 'Thunder', 'Golden', 'Storm', 'Brave', 'Fierce'];
const TEAM_NAME_NOUNS = ['Warriors', 'Strikers', 'Challengers', 'Titans', 'Lions', 'Eagles', 'Panthers', 'Kings'];

const generateTeamName = () => {
  const adj = TEAM_NAME_ADJECTIVES[Math.floor(Math.random() * TEAM_NAME_ADJECTIVES.length)];
  const noun = TEAM_NAME_NOUNS[Math.floor(Math.random() * TEAM_NAME_NOUNS.length)];
  return `${adj} ${noun}`;
};

// Join the auto-match queue
const joinQueue = async (userId, matchId, fantasyTeamId) => {
  // Check if already in queue or matched
  const existing = await MatchQueue.findOne({
    userId,
    matchId,
    status: { $in: ['waiting', 'matched'] }
  });

  if (existing) {
    if (existing.status === 'matched') {
      const team = await AutoMatchedTeam.findById(existing.assignedTeamId)
        .populate('members.userId', 'displayName avatar');
      return { alreadyMatched: true, team };
    }
    return { alreadyInQueue: true };
  }

  // Verify fantasy team exists
  const fantasyTeam = await FantasyTeam.findOne({
    _id: fantasyTeamId,
    userId,
    matchId
  });

  if (!fantasyTeam) {
    throw new Error('Fantasy team not found. Create your team first.');
  }

  // Add to queue
  const queueEntry = await MatchQueue.create({
    matchId,
    userId,
    fantasyTeamId
  });

  // Try to match immediately
  await processMatchQueue(matchId);

  // Check if matched
  const updatedEntry = await MatchQueue.findById(queueEntry._id);
  if (updatedEntry.status === 'matched') {
    const team = await AutoMatchedTeam.findById(updatedEntry.assignedTeamId)
      .populate('members.userId', 'displayName avatar');
    return { matched: true, team };
  }

  return { inQueue: true, position: await getQueuePosition(matchId, userId) };
};

// Get queue position
const getQueuePosition = async (matchId, userId) => {
  const waitingUsers = await MatchQueue.find({
    matchId,
    status: 'waiting'
  }).sort({ joinedAt: 1 }).lean();

  const position = waitingUsers.findIndex(u => u.userId.toString() === userId.toString());
  return position + 1;
};

// Leave the queue
const leaveQueue = async (userId, matchId) => {
  const entry = await MatchQueue.findOne({
    userId,
    matchId,
    status: 'waiting'
  });

  if (!entry) {
    throw new Error('Not in queue');
  }

  await entry.deleteOne();
  return true;
};

// Process the match queue - create teams of 4
const processMatchQueue = async (matchId) => {
  const waitingUsers = await MatchQueue.find({
    matchId,
    status: 'waiting'
  }).sort({ joinedAt: 1 });

  // Create teams of TEAM_SIZE
  while (waitingUsers.length >= TEAM_SIZE) {
    const teamMembers = waitingUsers.splice(0, TEAM_SIZE);
    await createTeam(matchId, teamMembers);
  }
};

// Create a matched team
const createTeam = async (matchId, members) => {
  const teamName = generateTeamName();

  const team = await AutoMatchedTeam.create({
    matchId,
    teamName,
    members: members.map(m => ({
      userId: m.userId,
      fantasyTeamId: m.fantasyTeamId,
      contributedPoints: 0
    })),
    status: 'locked',
    totalPoints: 0
  });

  // Update queue status
  await MatchQueue.updateMany(
    { _id: { $in: members.map(m => m._id) } },
    { status: 'matched', assignedTeamId: team._id }
  );

  // Get populated team for notification
  const populatedTeam = await AutoMatchedTeam.findById(team._id)
    .populate('members.userId', 'displayName avatar');

  // Notify users via WebSocket
  const userIds = members.map(m => m.userId);
  broadcastTeamMatched(userIds, matchId.toString(), {
    teamId: team._id,
    teamName,
    members: populatedTeam.members
  });

  return team;
};

// Force match remaining users close to match start
const handleLastMinuteMatching = async (matchId) => {
  const remainingUsers = await MatchQueue.find({
    matchId,
    status: 'waiting'
  }).sort({ joinedAt: 1 });

  if (remainingUsers.length >= 2) {
    // Create smaller team (2-3 members)
    await createTeam(matchId, remainingUsers);
  } else if (remainingUsers.length === 1) {
    // Single user - mark as expired (couldn't match)
    await MatchQueue.updateOne(
      { _id: remainingUsers[0]._id },
      { status: 'expired' }
    );
  }
};

// Get user's assigned team
const getUserTeam = async (userId, matchId) => {
  const queueEntry = await MatchQueue.findOne({
    userId,
    matchId,
    status: 'matched'
  });

  if (!queueEntry || !queueEntry.assignedTeamId) {
    return null;
  }

  const team = await AutoMatchedTeam.findById(queueEntry.assignedTeamId)
    .populate('members.userId', 'displayName avatar virtualPoints');

  return team;
};

// Get queue status
const getQueueStatus = async (userId, matchId) => {
  const entry = await MatchQueue.findOne({ userId, matchId });

  if (!entry) {
    return { status: 'not_joined' };
  }

  if (entry.status === 'matched') {
    const team = await getUserTeam(userId, matchId);
    return { status: 'matched', team };
  }

  if (entry.status === 'expired') {
    return { status: 'expired' };
  }

  const position = await getQueuePosition(matchId, userId);
  const totalWaiting = await MatchQueue.countDocuments({ matchId, status: 'waiting' });

  return {
    status: 'waiting',
    position,
    totalWaiting,
    needMore: TEAM_SIZE - totalWaiting
  };
};

// Rename team
const renameTeam = async (userId, matchId, newTeamName) => {
  const team = await AutoMatchedTeam.findOne({
    matchId,
    'members.userId': userId
  });

  if (!team) {
    throw new Error('Team not found');
  }

  // Check if match is still upcoming (not locked)
  const match = await Match.findById(matchId);
  if (match && match.status !== 'upcoming') {
    throw new Error('Cannot rename team after match has started');
  }

  team.teamName = newTeamName.trim();
  await team.save();

  return team;
};

module.exports = {
  joinQueue,
  leaveQueue,
  processMatchQueue,
  handleLastMinuteMatching,
  getUserTeam,
  getQueueStatus,
  renameTeam,
  TEAM_SIZE
};
