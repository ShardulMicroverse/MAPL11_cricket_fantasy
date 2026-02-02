// Shared scoring rules for client display

const SCORING_RULES = {
  batting: {
    run: { points: 1, description: 'Per run scored' },
    boundaryBonus: { points: 1, description: 'Boundary bonus (4)' },
    sixBonus: { points: 2, description: 'Six bonus' },
    thirtyBonus: { points: 4, description: '30 run bonus' },
    halfCentury: { points: 8, description: 'Half century bonus' },
    century: { points: 16, description: 'Century bonus' },
    duck: { points: -2, description: 'Duck (dismissed on 0)' },
    strikeRate: {
      below70: { points: -6, description: 'SR < 70 (min 10 balls)' },
      between70_80: { points: -4, description: 'SR 70-79.99' },
      between80_90: { points: -2, description: 'SR 80-89.99' },
      between130_150: { points: 2, description: 'SR 130-149.99' },
      between150_170: { points: 4, description: 'SR 150-169.99' },
      above170: { points: 6, description: 'SR 170+' }
    }
  },
  bowling: {
    wicket: { points: 25, description: 'Per wicket (excl. run-out)' },
    lbwBowledBonus: { points: 8, description: 'LBW/Bowled bonus' },
    threeWicketHaul: { points: 4, description: '3 wicket haul' },
    fourWicketHaul: { points: 8, description: '4 wicket haul' },
    fiveWicketHaul: { points: 16, description: '5 wicket haul' },
    maiden: { points: 12, description: 'Maiden over' },
    economy: {
      below5: { points: 6, description: 'Economy < 5 (min 2 overs)' },
      between5_6: { points: 4, description: 'Economy 5-5.99' },
      between6_7: { points: 2, description: 'Economy 6-6.99' },
      between10_11: { points: -2, description: 'Economy 10-10.99' },
      between11_12: { points: -4, description: 'Economy 11-11.99' },
      above12: { points: -6, description: 'Economy 12+' }
    }
  },
  fielding: {
    catch: { points: 8, description: 'Catch taken' },
    stumping: { points: 12, description: 'Stumping' },
    runOutDirect: { points: 12, description: 'Run-out (direct hit)' },
    runOutIndirect: { points: 6, description: 'Run-out (thrower/catcher)' }
  }
};

const PREDICTION_RULES = {
  totalScore: {
    correct: { points: 50, description: 'Exact total match runs' },
    close: { points: 25, description: 'Within 15 runs', range: 15 },
    wrong: { points: -10, description: 'Wrong prediction' }
  },
  mostSixes: {
    correct: { points: 40, description: 'Correct player' },
    wrong: { points: -10, description: 'Wrong prediction' }
  },
  mostFours: {
    correct: { points: 40, description: 'Correct player' },
    wrong: { points: -10, description: 'Wrong prediction' }
  },
  mostWickets: {
    correct: { points: 40, description: 'Correct player' },
    wrong: { points: -10, description: 'Wrong prediction' }
  },
  powerplayScore: {
    correct: { points: 35, description: 'Exact powerplay runs' },
    close: { points: 15, description: 'Within 10 runs', range: 10 },
    wrong: { points: -10, description: 'Wrong prediction' }
  },
  fiftiesCount: {
    correct: { points: 30, description: 'Exact fifties count' },
    wrong: { points: -10, description: 'Wrong prediction' }
  }
};

const TEAM_COMPOSITION = {
  TOTAL_PLAYERS: 11,
  MAX_CREDITS: 100,
  ROLE_REQUIREMENTS: {
    'Wicket-Keeper': { min: 1, max: 4 },
    'Batsman': { min: 3, max: 6 },
    'All-Rounder': { min: 1, max: 4 },
    'Bowler': { min: 3, max: 6 }
  },
  MAX_PLAYERS_PER_TEAM: 7,
  CAPTAIN_MULTIPLIER: 2,
  VICE_CAPTAIN_MULTIPLIER: 1.5
};

module.exports = {
  SCORING_RULES,
  PREDICTION_RULES,
  TEAM_COMPOSITION
};
