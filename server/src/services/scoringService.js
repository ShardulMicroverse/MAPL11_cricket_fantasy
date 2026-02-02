// Dream11-style Fantasy Points Calculation

const SCORING_RULES = {
  batting: {
    run: 1,
    boundaryBonus: 1,
    sixBonus: 2,
    thirtyBonus: 4,
    halfCentury: 8,
    century: 16,
    duck: -2,
    strikeRate: {
      below70: -6,
      between70_80: -4,
      between80_90: -2,
      between130_150: 2,
      between150_170: 4,
      above170: 6
    },
    minBallsForSR: 10
  },
  bowling: {
    wicket: 25,
    lbwBowledBonus: 8,
    threeWicketHaul: 4,
    fourWicketHaul: 8,
    fiveWicketHaul: 16,
    maiden: 12,
    economy: {
      below5: 6,
      between5_6: 4,
      between6_7: 2,
      between10_11: -2,
      between11_12: -4,
      above12: -6
    },
    minOversForEconomy: 2
  },
  fielding: {
    catch: 8,
    stumping: 12,
    runOutDirect: 12,
    runOutIndirect: 6
  },
  multipliers: {
    captain: 2,
    viceCaptain: 1.5
  }
};

// Calculate batting points
const calculateBattingPoints = (stats) => {
  let points = 0;

  // Runs
  points += stats.runs * SCORING_RULES.batting.run;

  // Boundaries
  points += stats.fours * SCORING_RULES.batting.boundaryBonus;
  points += stats.sixes * SCORING_RULES.batting.sixBonus;

  // Milestones
  if (stats.runs >= 100) {
    points += SCORING_RULES.batting.century;
  } else if (stats.runs >= 50) {
    points += SCORING_RULES.batting.halfCentury;
  } else if (stats.runs >= 30) {
    points += SCORING_RULES.batting.thirtyBonus;
  }

  // Duck
  if (stats.runs === 0 && stats.isOut) {
    points += SCORING_RULES.batting.duck;
  }

  // Strike rate (only if faced minimum balls)
  if (stats.ballsFaced >= SCORING_RULES.batting.minBallsForSR) {
    const sr = (stats.runs / stats.ballsFaced) * 100;

    if (sr < 70) {
      points += SCORING_RULES.batting.strikeRate.below70;
    } else if (sr < 80) {
      points += SCORING_RULES.batting.strikeRate.between70_80;
    } else if (sr < 90) {
      points += SCORING_RULES.batting.strikeRate.between80_90;
    } else if (sr >= 170) {
      points += SCORING_RULES.batting.strikeRate.above170;
    } else if (sr >= 150) {
      points += SCORING_RULES.batting.strikeRate.between150_170;
    } else if (sr >= 130) {
      points += SCORING_RULES.batting.strikeRate.between130_150;
    }
  }

  return points;
};

// Calculate bowling points
const calculateBowlingPoints = (stats) => {
  let points = 0;

  // Wickets
  points += stats.wickets * SCORING_RULES.bowling.wicket;

  // LBW/Bowled bonus
  points += (stats.lbwWickets || 0) * SCORING_RULES.bowling.lbwBowledBonus;
  points += (stats.bowledWickets || 0) * SCORING_RULES.bowling.lbwBowledBonus;

  // Wicket hauls
  if (stats.wickets >= 5) {
    points += SCORING_RULES.bowling.fiveWicketHaul;
  } else if (stats.wickets >= 4) {
    points += SCORING_RULES.bowling.fourWicketHaul;
  } else if (stats.wickets >= 3) {
    points += SCORING_RULES.bowling.threeWicketHaul;
  }

  // Maidens
  points += (stats.maidens || 0) * SCORING_RULES.bowling.maiden;

  // Economy rate (only if bowled minimum overs)
  if (stats.overs >= SCORING_RULES.bowling.minOversForEconomy) {
    const economy = stats.runsConceded / stats.overs;

    if (economy < 5) {
      points += SCORING_RULES.bowling.economy.below5;
    } else if (economy < 6) {
      points += SCORING_RULES.bowling.economy.between5_6;
    } else if (economy < 7) {
      points += SCORING_RULES.bowling.economy.between6_7;
    } else if (economy >= 12) {
      points += SCORING_RULES.bowling.economy.above12;
    } else if (economy >= 11) {
      points += SCORING_RULES.bowling.economy.between11_12;
    } else if (economy >= 10) {
      points += SCORING_RULES.bowling.economy.between10_11;
    }
  }

  return points;
};

// Calculate fielding points
const calculateFieldingPoints = (stats) => {
  let points = 0;

  points += (stats.catches || 0) * SCORING_RULES.fielding.catch;
  points += (stats.stumpings || 0) * SCORING_RULES.fielding.stumping;
  points += (stats.runOutsDirect || 0) * SCORING_RULES.fielding.runOutDirect;
  points += (stats.runOutsIndirect || 0) * SCORING_RULES.fielding.runOutIndirect;

  return points;
};

// Calculate total player points
const calculatePlayerPoints = (playerStats) => {
  const battingPoints = calculateBattingPoints(playerStats.batting || {});
  const bowlingPoints = calculateBowlingPoints(playerStats.bowling || {});
  const fieldingPoints = calculateFieldingPoints(playerStats.fielding || {});

  return battingPoints + bowlingPoints + fieldingPoints;
};

// Calculate fantasy team points
const calculateFantasyTeamPoints = (fantasyTeam, playerPointsMap) => {
  let totalPoints = 0;

  for (const player of fantasyTeam.players) {
    // Handle both populated (object with _id) and non-populated (ObjectId) cases
    const playerId = player.playerId?._id
      ? player.playerId._id.toString()
      : player.playerId?.toString();

    if (!playerId) continue;

    let playerPoints = playerPointsMap[playerId] || 0;

    // Apply captain/vice-captain multipliers
    if (player.isCaptain) {
      playerPoints *= SCORING_RULES.multipliers.captain;
    } else if (player.isViceCaptain) {
      playerPoints *= SCORING_RULES.multipliers.viceCaptain;
    }

    totalPoints += playerPoints;
  }

  return Math.round(totalPoints);
};

// Prediction scoring
const PREDICTION_SCORING = {
  totalScore: { correct: 50, close: 25, closeRange: 15, wrong: -10 },
  mostSixes: { correct: 40, wrong: -10 },
  mostFours: { correct: 40, wrong: -10 },
  mostWickets: { correct: 40, wrong: -10 },
  powerplayScore: { correct: 35, close: 15, closeRange: 10, wrong: -10 },
  fiftiesCount: { correct: 30, wrong: -10 }
};

// Calculate prediction points
const calculatePredictionPoints = (prediction, actualStats) => {
  let totalPoints = 0;
  const results = {};

  // Total Score
  const totalScoreDiff = Math.abs(prediction.totalScore.answer - actualStats.totalScore);
  if (totalScoreDiff === 0) {
    results.totalScore = { points: PREDICTION_SCORING.totalScore.correct, isCorrect: true };
  } else if (totalScoreDiff <= PREDICTION_SCORING.totalScore.closeRange) {
    results.totalScore = { points: PREDICTION_SCORING.totalScore.close, isCorrect: false, isClose: true };
  } else {
    results.totalScore = { points: PREDICTION_SCORING.totalScore.wrong, isCorrect: false };
  }
  totalPoints += results.totalScore.points;

  // Most Sixes
  if (prediction.mostSixes.answer?.toString() === actualStats.mostSixes?.playerId?.toString()) {
    results.mostSixes = { points: PREDICTION_SCORING.mostSixes.correct, isCorrect: true };
  } else {
    results.mostSixes = { points: PREDICTION_SCORING.mostSixes.wrong, isCorrect: false };
  }
  totalPoints += results.mostSixes.points;

  // Most Fours
  if (prediction.mostFours.answer?.toString() === actualStats.mostFours?.playerId?.toString()) {
    results.mostFours = { points: PREDICTION_SCORING.mostFours.correct, isCorrect: true };
  } else {
    results.mostFours = { points: PREDICTION_SCORING.mostFours.wrong, isCorrect: false };
  }
  totalPoints += results.mostFours.points;

  // Most Wickets
  if (prediction.mostWickets.answer?.toString() === actualStats.mostWickets?.playerId?.toString()) {
    results.mostWickets = { points: PREDICTION_SCORING.mostWickets.correct, isCorrect: true };
  } else {
    results.mostWickets = { points: PREDICTION_SCORING.mostWickets.wrong, isCorrect: false };
  }
  totalPoints += results.mostWickets.points;

  // Powerplay Score
  const powerplayDiff = Math.abs(prediction.powerplayScore.answer - actualStats.powerplayScore);
  if (powerplayDiff === 0) {
    results.powerplayScore = { points: PREDICTION_SCORING.powerplayScore.correct, isCorrect: true };
  } else if (powerplayDiff <= PREDICTION_SCORING.powerplayScore.closeRange) {
    results.powerplayScore = { points: PREDICTION_SCORING.powerplayScore.close, isCorrect: false, isClose: true };
  } else {
    results.powerplayScore = { points: PREDICTION_SCORING.powerplayScore.wrong, isCorrect: false };
  }
  totalPoints += results.powerplayScore.points;

  // Fifties Count
  if (prediction.fiftiesCount.answer === actualStats.fiftiesCount) {
    results.fiftiesCount = { points: PREDICTION_SCORING.fiftiesCount.correct, isCorrect: true };
  } else {
    results.fiftiesCount = { points: PREDICTION_SCORING.fiftiesCount.wrong, isCorrect: false };
  }
  totalPoints += results.fiftiesCount.points;

  return { totalPoints, results };
};

module.exports = {
  SCORING_RULES,
  PREDICTION_SCORING,
  calculateBattingPoints,
  calculateBowlingPoints,
  calculateFieldingPoints,
  calculatePlayerPoints,
  calculateFantasyTeamPoints,
  calculatePredictionPoints
};
