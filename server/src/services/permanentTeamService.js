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

// Fixed team fixtures (Team vs Team matchups)
const TEAM_FIXTURES = [
  { team1: 'Team 1', team2: 'Team 14' },
  { team1: 'Team 2', team2: 'Team 13' },
  { team1: 'Team 3', team2: 'Team 12' },
  { team1: 'Team 4', team2: 'Team 11' },
  { team1: 'Team 5', team2: 'Team 10' },
  { team1: 'Team 6', team2: 'Team 9' },
  { team1: 'Team 7', team2: 'Team 8' }
];

// Fixture-based bonus scoring
const FIXTURE_WIN_BONUS = 50;  // Points awarded to winning team members

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

// Award team bonuses after match completion (fixture-based)
const awardTeamBonuses = async (matchId) => {
  // Only process teams that haven't had bonuses awarded yet (status: 'active')
  // This prevents double-awarding if scoring runs multiple times
  const performances = await TeamMatchPerformance.find({
    matchId,
    status: 'active'
  }).populate('teamId', 'teamName');

  if (performances.length === 0) {
    console.log('No active team performances to award bonuses for match:', matchId);
    return [];
  }

  console.log(`Awarding fixture-based bonuses for ${performances.length} teams in match ${matchId}`);

  // Create a map of team name -> performance for quick lookup
  const teamPerformanceMap = new Map();
  performances.forEach(perf => {
    if (perf.teamId && perf.teamId.teamName) {
      teamPerformanceMap.set(perf.teamId.teamName, perf);
    }
  });

  // Track which teams have been processed
  const processedTeamIds = new Set();

  // Process each fixture
  for (const fixture of TEAM_FIXTURES) {
    const team1Perf = teamPerformanceMap.get(fixture.team1);
    const team2Perf = teamPerformanceMap.get(fixture.team2);

    // Skip if neither team participated
    if (!team1Perf && !team2Perf) {
      console.log(`Fixture ${fixture.team1} vs ${fixture.team2}: Neither team participated`);
      continue;
    }

    let team1Bonus = 0;
    let team2Bonus = 0;

    // Case 1: Only team1 participated (winner by default)
    if (team1Perf && !team2Perf) {
      team1Bonus = FIXTURE_WIN_BONUS;
      console.log(`Fixture ${fixture.team1} vs ${fixture.team2}: ${fixture.team1} wins by default (${team1Perf.teamTotalPoints} pts)`);
    }
    // Case 2: Only team2 participated (winner by default)
    else if (!team1Perf && team2Perf) {
      team2Bonus = FIXTURE_WIN_BONUS;
      console.log(`Fixture ${fixture.team1} vs ${fixture.team2}: ${fixture.team2} wins by default (${team2Perf.teamTotalPoints} pts)`);
    }
    // Case 3: Both teams participated
    else {
      const team1Points = team1Perf.teamTotalPoints;
      const team2Points = team2Perf.teamTotalPoints;

      if (team1Points > team2Points) {
        // Team 1 wins
        team1Bonus = FIXTURE_WIN_BONUS;
        console.log(`Fixture ${fixture.team1} vs ${fixture.team2}: ${fixture.team1} wins (${team1Points} vs ${team2Points})`);
      } else if (team2Points > team1Points) {
        // Team 2 wins
        team2Bonus = FIXTURE_WIN_BONUS;
        console.log(`Fixture ${fixture.team1} vs ${fixture.team2}: ${fixture.team2} wins (${team2Points} vs ${team1Points})`);
      } else {
        // Tie - split the bonus
        team1Bonus = FIXTURE_WIN_BONUS / 2;
        team2Bonus = FIXTURE_WIN_BONUS / 2;
        console.log(`Fixture ${fixture.team1} vs ${fixture.team2}: Tie (${team1Points} pts each) - split bonus`);
      }
    }

    // Award bonus to team1 if they participated
    if (team1Perf) {
      await awardBonusToTeam(team1Perf, team1Bonus, matchId);
      processedTeamIds.add(team1Perf.teamId._id.toString());
    }

    // Award bonus to team2 if they participated
    if (team2Perf) {
      await awardBonusToTeam(team2Perf, team2Bonus, matchId);
      processedTeamIds.add(team2Perf.teamId._id.toString());
    }
  }

  // Process teams not in fixtures (they get 0 bonus)
  for (const perf of performances) {
    const teamIdStr = perf.teamId._id.toString();
    if (!processedTeamIds.has(teamIdStr)) {
      console.log(`Team ${perf.teamId.teamName} not in fixtures - awarding 0 bonus`);
      await awardBonusToTeam(perf, 0, matchId);
    }
  }

  // Update team overall stats (fixture-based)
  for (const perf of performances) {
    const team = await PermanentTeam.findById(perf.teamId._id);
    if (!team) {
      console.error('Team not found for performance:', perf._id);
      continue;
    }

    const isWin = perf.bonusAwarded === FIXTURE_WIN_BONUS;

    await PermanentTeam.findByIdAndUpdate(perf.teamId._id, {
      $inc: {
        'stats.totalPoints': perf.teamTotalPoints + (perf.bonusAwarded * 4),
        'stats.matchesPlayed': 1,
        'stats.wins': isWin ? 1 : 0
      }
    });

    console.log(`Updated team ${team.teamName} stats: totalPoints +${perf.teamTotalPoints + (perf.bonusAwarded * 4)}, fixtureWin: ${isWin}`);
  }

  return performances;
};

// Helper function to award bonus to a team
const awardBonusToTeam = async (performance, bonus, matchId) => {
  performance.bonusAwarded = bonus;
  performance.rank = null; // No longer using rank

  const memberUserIds = [];

  // Award bonus to each member
  for (const member of performance.memberPerformances) {
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
    console.log(`  Awarded ${bonus} bonus points to user ${member.userId}`);
  }

  // Notify team members of bonus (if any)
  if (bonus > 0) {
    broadcastTeamBonusAwarded(memberUserIds, {
      matchId,
      teamId: performance.teamId._id,
      bonus,
      fixtureWin: bonus === FIXTURE_WIN_BONUS,
      fixtureTie: bonus === FIXTURE_WIN_BONUS / 2
    });
  }

  performance.status = 'completed';
  await performance.save();
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
  TEAM_FIXTURES,
  FIXTURE_WIN_BONUS
};
