const PermanentTeam = require('../models/PermanentTeam');
const TeamFormationQueue = require('../models/TeamFormationQueue');
const TeamMatchPerformance = require('../models/TeamMatchPerformance');
const FantasyTeam = require('../models/FantasyTeam');
const Prediction = require('../models/Prediction');
const User = require('../models/User');
const { broadcastPermanentTeamFormed, broadcastTeamBonusAwarded } = require('../sockets/socketServer');

const TEAM_SIZE = 4;

const TEAM_NAME_ADJECTIVES = [
  'Mighty', 'Swift', 'Royal', 'Thunder', 'Golden', 'Storm', 'Brave', 'Fierce',
  'Shadow', 'Phoenix', 'Crimson', 'Silver', 'Iron', 'Electric', 'Blazing', 'Mystic'
];

const TEAM_NAME_NOUNS = [
  'Warriors', 'Strikers', 'Challengers', 'Titans', 'Lions', 'Eagles', 'Panthers', 'Kings',
  'Dragons', 'Legends', 'Falcons', 'Wolves', 'Hawks', 'Knights', 'Spartans', 'Gladiators'
];

// Team bonus scoring based on rank
const TEAM_BONUS_SCORING = {
  rank1: 50,   // +50 bonus to each member
  rank2: 30,   // +30 bonus to each member
  rank3: 20,   // +20 bonus to each member
  top5: 10    // +10 bonus to each member (ranks 4-5)
};

// Generate unique team name
const generateTeamName = async () => {
  let attempts = 0;
  while (attempts < 20) {
    const adj = TEAM_NAME_ADJECTIVES[Math.floor(Math.random() * TEAM_NAME_ADJECTIVES.length)];
    const noun = TEAM_NAME_NOUNS[Math.floor(Math.random() * TEAM_NAME_NOUNS.length)];
    const name = `${adj} ${noun}`;

    const existing = await PermanentTeam.findOne({ teamName: name });
    if (!existing) return name;
    attempts++;
  }
  // Fallback with random suffix
  return `Team ${Date.now().toString(36).toUpperCase()}`;
};

// Calculate team bonus based on rank
const calculateTeamBonus = (rank, totalTeams) => {
  if (rank === 1) return TEAM_BONUS_SCORING.rank1;
  if (rank === 2) return TEAM_BONUS_SCORING.rank2;
  if (rank === 3) return TEAM_BONUS_SCORING.rank3;
  if (rank <= 5 && totalTeams >= 5) return TEAM_BONUS_SCORING.top5;
  return 0;
};

// Join the permanent team formation queue
const joinFormationQueue = async (userId) => {
  // Check if user already has a permanent team
  const user = await User.findById(userId);
  if (user.permanentTeamId) {
    const team = await PermanentTeam.findById(user.permanentTeamId)
      .populate('members.userId', 'displayName avatar');
    return { alreadyInTeam: true, team };
  }

  // Check if already in queue
  const existing = await TeamFormationQueue.findOne({
    userId,
    status: 'waiting'
  });

  if (existing) {
    return { alreadyInQueue: true };
  }

  // Check if was matched but needs update
  const matchedEntry = await TeamFormationQueue.findOne({
    userId,
    status: 'matched'
  });

  if (matchedEntry && matchedEntry.assignedTeamId) {
    const team = await PermanentTeam.findById(matchedEntry.assignedTeamId)
      .populate('members.userId', 'displayName avatar');
    return { alreadyInTeam: true, team };
  }

  // Add to queue
  const queueEntry = await TeamFormationQueue.create({
    userId
  });

  // Try to match immediately
  await processFormationQueue();

  // Check if matched
  const updatedEntry = await TeamFormationQueue.findById(queueEntry._id);
  if (updatedEntry.status === 'matched') {
    const team = await PermanentTeam.findById(updatedEntry.assignedTeamId)
      .populate('members.userId', 'displayName avatar');
    return { matched: true, team };
  }

  return { inQueue: true, position: await getQueuePosition(userId) };
};

// Get queue position
const getQueuePosition = async (userId) => {
  const waitingUsers = await TeamFormationQueue.find({
    status: 'waiting'
  }).sort({ joinedAt: 1 }).lean();

  const position = waitingUsers.findIndex(u => u.userId.toString() === userId.toString());
  return position + 1;
};

// Leave the queue
const leaveFormationQueue = async (userId) => {
  const entry = await TeamFormationQueue.findOne({
    userId,
    status: 'waiting'
  });

  if (!entry) {
    throw new Error('Not in queue');
  }

  await entry.deleteOne();
  return true;
};

// Get queue status
const getQueueStatus = async (userId) => {
  // First check if user has a permanent team
  const user = await User.findById(userId);
  if (user.permanentTeamId) {
    const team = await getUserTeam(userId);
    return { status: 'in_team', team };
  }

  const entry = await TeamFormationQueue.findOne({ userId });

  if (!entry) {
    return { status: 'not_joined' };
  }

  if (entry.status === 'matched') {
    const team = await PermanentTeam.findById(entry.assignedTeamId)
      .populate('members.userId', 'displayName avatar');
    return { status: 'matched', team };
  }

  const position = await getQueuePosition(userId);
  const totalWaiting = await TeamFormationQueue.countDocuments({ status: 'waiting' });

  return {
    status: 'waiting',
    position,
    totalWaiting,
    needMore: TEAM_SIZE - totalWaiting
  };
};

// Process the formation queue - create teams of 4
const processFormationQueue = async () => {
  const waitingUsers = await TeamFormationQueue.find({
    status: 'waiting'
  }).sort({ joinedAt: 1 });

  // Create teams of TEAM_SIZE
  while (waitingUsers.length >= TEAM_SIZE) {
    const teamMembers = waitingUsers.splice(0, TEAM_SIZE);
    await createPermanentTeam(teamMembers);
  }
};

// Create a permanent team
const createPermanentTeam = async (members) => {
  const teamName = await generateTeamName();
  const memberIds = members.map(m => m.userId);

  const team = await PermanentTeam.create({
    teamName,
    members: memberIds.map((userId, index) => ({
      userId,
      role: index === 0 ? 'leader' : 'member'  // First user is leader
    })),
    stats: {
      totalPoints: 0,
      matchesPlayed: 0,
      wins: 0,
      podiums: 0,
      topFives: 0
    }
  });

  // Update queue status
  await TeamFormationQueue.updateMany(
    { _id: { $in: members.map(m => m._id) } },
    { status: 'matched', assignedTeamId: team._id }
  );

  // Update users with team reference
  await User.updateMany(
    { _id: { $in: memberIds } },
    { permanentTeamId: team._id }
  );

  // Get populated team for notification
  const populatedTeam = await PermanentTeam.findById(team._id)
    .populate('members.userId', 'displayName avatar');

  // Notify users via WebSocket
  broadcastPermanentTeamFormed(memberIds, {
    teamId: team._id,
    teamName,
    members: populatedTeam.members
  });

  return team;
};

// Get user's permanent team
const getUserTeam = async (userId) => {
  const user = await User.findById(userId);
  if (!user || !user.permanentTeamId) {
    return null;
  }

  const team = await PermanentTeam.findById(user.permanentTeamId)
    .populate('members.userId', 'displayName avatar stats.totalFantasyPoints');

  return team;
};

// Get team by ID (public view)
const getTeamById = async (teamId) => {
  const team = await PermanentTeam.findById(teamId)
    .populate('members.userId', 'displayName avatar stats.totalFantasyPoints');

  return team;
};

// Rename team (leader only)
const renameTeam = async (teamId, userId, newTeamName) => {
  const team = await PermanentTeam.findById(teamId);

  if (!team) {
    throw new Error('Team not found');
  }

  // Check if user is the leader
  const member = team.members.find(m => m.userId.toString() === userId.toString());
  if (!member || member.role !== 'leader') {
    throw new Error('Only the team leader can rename the team');
  }

  // Check if name is already taken
  const existing = await PermanentTeam.findOne({
    teamName: newTeamName.trim(),
    _id: { $ne: teamId }
  });
  if (existing) {
    throw new Error('Team name already taken');
  }

  team.teamName = newTeamName.trim();
  await team.save();

  return team;
};

// Get all teams (paginated, searchable)
const getAllTeams = async (page = 1, limit = 20, search = '') => {
  const skip = (page - 1) * limit;

  let query = { isActive: true };
  if (search) {
    query.teamName = { $regex: search, $options: 'i' };
  }

  const [teams, total] = await Promise.all([
    PermanentTeam.find(query)
      .populate('members.userId', 'displayName avatar')
      .sort({ 'stats.totalPoints': -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    PermanentTeam.countDocuments(query)
  ]);

  // Add rank to each team
  const teamsWithRank = teams.map((team, index) => ({
    ...team,
    rank: skip + index + 1
  }));

  return {
    teams: teamsWithRank,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

// Get team leaderboard
const getTeamLeaderboard = async (page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const [teams, total] = await Promise.all([
    PermanentTeam.find({ isActive: true })
      .populate('members.userId', 'displayName avatar')
      .sort({ 'stats.totalPoints': -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    PermanentTeam.countDocuments({ isActive: true })
  ]);

  const teamsWithRank = teams.map((team, index) => ({
    ...team,
    rank: skip + index + 1
  }));

  return {
    teams: teamsWithRank,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

// Get team match history
const getTeamMatchHistory = async (teamId, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  const [performances, total] = await Promise.all([
    TeamMatchPerformance.find({ teamId, status: 'completed' })
      .populate('matchId', 'matchNumber team1 team2 date status')
      .populate('memberPerformances.userId', 'displayName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    TeamMatchPerformance.countDocuments({ teamId, status: 'completed' })
  ]);

  return {
    performances,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

// Register team for a match (called when any member creates fantasy team)
const registerTeamForMatch = async (teamId, matchId) => {
  // Check if already registered
  let performance = await TeamMatchPerformance.findOne({ teamId, matchId });

  if (performance) {
    return performance;
  }

  // Get team members
  const team = await PermanentTeam.findById(teamId);
  if (!team) {
    throw new Error('Team not found');
  }

  // Create performance record
  performance = await TeamMatchPerformance.create({
    teamId,
    matchId,
    memberPerformances: team.members.map(m => ({
      userId: m.userId,
      fantasyPoints: 0,
      predictionPoints: 0,
      totalPoints: 0,
      bonusPoints: 0
    })),
    status: 'pending'
  });

  return performance;
};

// Calculate team points for a match
const calculateTeamPointsForMatch = async (matchId) => {
  // Only calculate for pending or active teams (not completed ones)
  const performances = await TeamMatchPerformance.find({
    matchId,
    status: { $in: ['pending', 'active'] }
  });

  console.log(`Calculating team points for ${performances.length} teams in match ${matchId}`);

  for (const perf of performances) {
    let teamTotal = 0;

    for (const member of perf.memberPerformances) {
      // Get fantasy team points
      const fantasyTeam = await FantasyTeam.findOne({
        userId: member.userId,
        matchId
      });

      // Get prediction points
      const prediction = await Prediction.findOne({
        userId: member.userId,
        matchId
      });

      member.fantasyPoints = fantasyTeam?.fantasyPoints || 0;
      member.predictionPoints = prediction?.totalPredictionPoints || 0;
      member.totalPoints = member.fantasyPoints + member.predictionPoints;

      // Also update fantasyTeamId if available
      if (fantasyTeam) {
        member.fantasyTeamId = fantasyTeam._id;
      }

      teamTotal += member.totalPoints;
      console.log(`  Member ${member.userId}: fantasy=${member.fantasyPoints}, prediction=${member.predictionPoints}, total=${member.totalPoints}`);
    }

    perf.teamTotalPoints = teamTotal;
    perf.status = 'active';
    await perf.save();

    console.log(`  Team ${perf.teamId} total points: ${teamTotal}`);
  }
};

// Award team bonuses after match completion
const awardTeamBonuses = async (matchId) => {
  // Only process teams that haven't had bonuses awarded yet (status: 'active')
  // This prevents double-awarding if scoring runs multiple times
  const performances = await TeamMatchPerformance.find({
    matchId,
    status: 'active'
  }).sort({ teamTotalPoints: -1 });

  if (performances.length === 0) {
    console.log('No active team performances to award bonuses for match:', matchId);
    return [];
  }

  const totalTeams = performances.length;
  console.log(`Awarding bonuses for ${totalTeams} teams in match ${matchId}`);

  for (let i = 0; i < performances.length; i++) {
    const rank = i + 1;
    const perf = performances[i];

    perf.rank = rank;
    const bonus = calculateTeamBonus(rank, totalTeams);
    perf.bonusAwarded = bonus;

    // Award bonus to each member
    if (bonus > 0) {
      const memberUserIds = [];
      for (const member of perf.memberPerformances) {
        member.bonusPoints = bonus;
        memberUserIds.push(member.userId);

        // Update user's bonus points
        await User.findByIdAndUpdate(member.userId, {
          $inc: {
            'teamStats.teamBonusPointsEarned': bonus,
            'stats.totalFantasyPoints': bonus,
            'teamStats.teamMatchesPlayed': 1
          }
        });
        console.log(`Awarded ${bonus} bonus points to user ${member.userId}`);
      }

      // Notify team members of bonus
      broadcastTeamBonusAwarded(memberUserIds, {
        matchId,
        teamId: perf.teamId,
        rank,
        bonus
      });
    } else {
      // Update match count for non-bonus teams
      for (const member of perf.memberPerformances) {
        await User.findByIdAndUpdate(member.userId, {
          $inc: {
            'teamStats.teamMatchesPlayed': 1
          }
        });
      }
    }

    perf.status = 'completed';
    await perf.save();
  }

  // Update team overall stats
  for (const perf of performances) {
    const isWin = perf.rank === 1;
    const isPodium = perf.rank <= 3;
    const isTopFive = perf.rank <= 5;

    const team = await PermanentTeam.findById(perf.teamId);
    if (!team) {
      console.error('Team not found for performance:', perf._id);
      continue;
    }

    const currentMatchesPlayed = team.stats.matchesPlayed || 0;
    const currentAvgRank = team.stats.averageRank || 0;

    // Calculate new average rank
    const newAvgRank = currentMatchesPlayed > 0
      ? ((currentAvgRank * currentMatchesPlayed) + perf.rank) / (currentMatchesPlayed + 1)
      : perf.rank;

    await PermanentTeam.findByIdAndUpdate(perf.teamId, {
      $inc: {
        'stats.totalPoints': perf.teamTotalPoints + (perf.bonusAwarded * 4),
        'stats.matchesPlayed': 1,
        'stats.wins': isWin ? 1 : 0,
        'stats.podiums': isPodium ? 1 : 0,
        'stats.topFives': isTopFive ? 1 : 0
      },
      $min: { 'stats.bestRank': perf.rank },
      $set: { 'stats.averageRank': Math.round(newAvgRank * 10) / 10 }
    });

    console.log(`Updated team ${team.teamName} stats: totalPoints +${perf.teamTotalPoints + (perf.bonusAwarded * 4)}, rank ${perf.rank}`);
  }

  return performances;
};

// Auto-register all permanent teams that have members with fantasy teams for this match
const autoRegisterTeamsForMatch = async (matchId) => {
  // Get all fantasy teams for this match
  const fantasyTeams = await FantasyTeam.find({ matchId }).lean();

  if (fantasyTeams.length === 0) {
    console.log('No fantasy teams found for match:', matchId);
    return;
  }

  // Get user IDs that have fantasy teams
  const userIdsWithFantasyTeams = fantasyTeams.map(ft => ft.userId.toString());

  // Find all permanent teams
  const permanentTeams = await PermanentTeam.find({ isActive: true }).lean();

  for (const team of permanentTeams) {
    // Check if any member of this team has a fantasy team for this match
    const memberIds = team.members.map(m => m.userId.toString());
    const hasParticipatingMember = memberIds.some(memberId =>
      userIdsWithFantasyTeams.includes(memberId)
    );

    if (hasParticipatingMember) {
      // Register this team for the match (will skip if already registered)
      try {
        await registerTeamForMatch(team._id, matchId);
      } catch (err) {
        console.error(`Error auto-registering team ${team._id}:`, err);
      }
    }
  }
};

// Complete match scoring - call after individual points calculated
const completeMatchTeamScoring = async (matchId) => {
  // Auto-register all eligible teams first (handles teams not registered during fantasy team creation)
  await autoRegisterTeamsForMatch(matchId);

  // Calculate team points
  await calculateTeamPointsForMatch(matchId);

  // Award bonuses
  await awardTeamBonuses(matchId);
};

module.exports = {
  joinFormationQueue,
  leaveFormationQueue,
  getQueueStatus,
  processFormationQueue,
  getUserTeam,
  getTeamById,
  renameTeam,
  getAllTeams,
  getTeamLeaderboard,
  getTeamMatchHistory,
  registerTeamForMatch,
  calculateTeamPointsForMatch,
  awardTeamBonuses,
  completeMatchTeamScoring,
  TEAM_SIZE,
  TEAM_BONUS_SCORING
};
