/**
 * Seed script to add T20 World Cup India matches
 * Run with: node seedMatches.js (from server folder)
 */
require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cricket-fantasy';

const matchSchema = new mongoose.Schema({
  externalMatchId: String,
  team1: { name: String, shortName: String, logo: String },
  team2: { name: String, shortName: String, logo: String },
  venue: String,
  matchDate: Date,
  startTime: Date,
  status: String,
  lockTime: Date,
  result: { winner: String, summary: String, team1Score: String, team2Score: String },
  liveData: { currentInnings: Number, currentScore: String, currentOver: String, battingTeam: String, lastUpdated: Date },
  statsSnapshot: { totalScore: Number, mostSixes: Object, mostFours: Object, mostWickets: Object, powerplayScore: Number, fiftiesCount: Number },
  isTeamSelectionOpen: Boolean
}, { timestamps: true });

const Match = mongoose.model('Match', matchSchema);

// T20 World Cup 2026 India matches (sample data)
const indiaMatches = [
  {
    externalMatchId: 'wc2026_ind_ire',
    team1: { name: 'India', shortName: 'IND', logo: '' },
    team2: { name: 'Ireland', shortName: 'IRE', logo: '' },
    venue: 'Nassau County International Cricket Stadium, New York',
    matchDate: new Date('2026-02-08T14:30:00Z'),
    startTime: new Date('2026-02-08T14:30:00Z'),
    status: 'upcoming',
    lockTime: new Date('2026-02-08T14:15:00Z'),
    isTeamSelectionOpen: true
  },
  {
    externalMatchId: 'wc2026_ind_pak',
    team1: { name: 'India', shortName: 'IND', logo: '' },
    team2: { name: 'Pakistan', shortName: 'PAK', logo: '' },
    venue: 'Nassau County International Cricket Stadium, New York',
    matchDate: new Date('2026-02-12T14:30:00Z'),
    startTime: new Date('2026-02-12T14:30:00Z'),
    status: 'upcoming',
    lockTime: new Date('2026-02-12T14:15:00Z'),
    isTeamSelectionOpen: true
  },
  {
    externalMatchId: 'wc2026_ind_usa',
    team1: { name: 'India', shortName: 'IND', logo: '' },
    team2: { name: 'USA', shortName: 'USA', logo: '' },
    venue: 'Nassau County International Cricket Stadium, New York',
    matchDate: new Date('2026-02-15T19:00:00Z'),
    startTime: new Date('2026-02-15T19:00:00Z'),
    status: 'upcoming',
    lockTime: new Date('2026-02-15T18:45:00Z'),
    isTeamSelectionOpen: true
  },
  {
    externalMatchId: 'wc2026_ind_can',
    team1: { name: 'India', shortName: 'IND', logo: '' },
    team2: { name: 'Canada', shortName: 'CAN', logo: '' },
    venue: 'Central Broward Regional Park, Florida',
    matchDate: new Date('2026-02-18T19:00:00Z'),
    startTime: new Date('2026-02-18T19:00:00Z'),
    status: 'upcoming',
    lockTime: new Date('2026-02-18T18:45:00Z'),
    isTeamSelectionOpen: true
  },
  {
    externalMatchId: 'wc2026_ind_aus',
    team1: { name: 'India', shortName: 'IND', logo: '' },
    team2: { name: 'Australia', shortName: 'AUS', logo: '' },
    venue: 'Kensington Oval, Barbados',
    matchDate: new Date('2026-02-24T19:00:00Z'),
    startTime: new Date('2026-02-24T19:00:00Z'),
    status: 'upcoming',
    lockTime: new Date('2026-02-24T18:45:00Z'),
    isTeamSelectionOpen: true
  }
];

async function seedMatches() {
  try {
    console.log('Connecting to MongoDB...');
    console.log('URI:', MONGODB_URI.replace(/\/\/.*:.*@/, '//***:***@')); // Hide credentials
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing matches
    await Match.deleteMany({});
    console.log('Cleared existing matches');

    // Insert new matches
    const result = await Match.insertMany(indiaMatches);
    console.log(`Inserted ${result.length} matches`);

    console.log('\nMatches seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding matches:', error.message);
    process.exit(1);
  }
}

seedMatches();
