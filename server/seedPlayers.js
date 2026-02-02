/**
 * Seed script to add players
 * Run with: node seedPlayers.js (from server folder)
 */
require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cricket-fantasy';

const playerSchema = new mongoose.Schema({
  externalPlayerId: String,
  name: String,
  shortName: String,
  team: String,
  role: String,
  battingStyle: String,
  bowlingStyle: String,
  creditValue: Number,
  image: String,
  stats: { matchesPlayed: Number, runsScored: Number, wicketsTaken: Number, avgFantasyPoints: Number },
  isActive: Boolean
}, { timestamps: true });

const Player = mongoose.model('Player', playerSchema);

// Sample players for India and opponents
const players = [
  // India
  { externalPlayerId: 'ind_1', name: 'Rohit Sharma', shortName: 'R Sharma', team: 'IND', role: 'Batsman', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm offbreak', creditValue: 10.5, isActive: true },
  { externalPlayerId: 'ind_2', name: 'Virat Kohli', shortName: 'V Kohli', team: 'IND', role: 'Batsman', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium', creditValue: 10.5, isActive: true },
  { externalPlayerId: 'ind_3', name: 'Suryakumar Yadav', shortName: 'SK Yadav', team: 'IND', role: 'Batsman', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm offbreak', creditValue: 10.0, isActive: true },
  { externalPlayerId: 'ind_4', name: 'Rishabh Pant', shortName: 'R Pant', team: 'IND', role: 'Wicket-Keeper', battingStyle: 'Left-hand bat', creditValue: 9.5, isActive: true },
  { externalPlayerId: 'ind_5', name: 'Hardik Pandya', shortName: 'H Pandya', team: 'IND', role: 'All-Rounder', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium-fast', creditValue: 9.5, isActive: true },
  { externalPlayerId: 'ind_6', name: 'Ravindra Jadeja', shortName: 'R Jadeja', team: 'IND', role: 'All-Rounder', battingStyle: 'Left-hand bat', bowlingStyle: 'Slow left-arm orthodox', creditValue: 9.0, isActive: true },
  { externalPlayerId: 'ind_7', name: 'Jasprit Bumrah', shortName: 'J Bumrah', team: 'IND', role: 'Bowler', bowlingStyle: 'Right-arm fast', creditValue: 9.5, isActive: true },
  { externalPlayerId: 'ind_8', name: 'Mohammed Shami', shortName: 'M Shami', team: 'IND', role: 'Bowler', bowlingStyle: 'Right-arm fast-medium', creditValue: 9.0, isActive: true },
  { externalPlayerId: 'ind_9', name: 'Kuldeep Yadav', shortName: 'K Yadav', team: 'IND', role: 'Bowler', bowlingStyle: 'Left-arm wrist spin', creditValue: 8.5, isActive: true },
  { externalPlayerId: 'ind_10', name: 'Yuzvendra Chahal', shortName: 'Y Chahal', team: 'IND', role: 'Bowler', bowlingStyle: 'Right-arm leg break', creditValue: 8.5, isActive: true },
  { externalPlayerId: 'ind_11', name: 'Shubman Gill', shortName: 'S Gill', team: 'IND', role: 'Batsman', battingStyle: 'Right-hand bat', creditValue: 9.0, isActive: true },
  { externalPlayerId: 'ind_12', name: 'KL Rahul', shortName: 'KL Rahul', team: 'IND', role: 'Wicket-Keeper', battingStyle: 'Right-hand bat', creditValue: 9.0, isActive: true },
  { externalPlayerId: 'ind_13', name: 'Arshdeep Singh', shortName: 'A Singh', team: 'IND', role: 'Bowler', bowlingStyle: 'Left-arm fast-medium', creditValue: 8.5, isActive: true },
  { externalPlayerId: 'ind_14', name: 'Axar Patel', shortName: 'A Patel', team: 'IND', role: 'All-Rounder', battingStyle: 'Left-hand bat', bowlingStyle: 'Slow left-arm orthodox', creditValue: 8.0, isActive: true },

  // Pakistan
  { externalPlayerId: 'pak_1', name: 'Babar Azam', shortName: 'B Azam', team: 'PAK', role: 'Batsman', battingStyle: 'Right-hand bat', creditValue: 10.5, isActive: true },
  { externalPlayerId: 'pak_2', name: 'Mohammad Rizwan', shortName: 'M Rizwan', team: 'PAK', role: 'Wicket-Keeper', battingStyle: 'Right-hand bat', creditValue: 10.0, isActive: true },
  { externalPlayerId: 'pak_3', name: 'Shaheen Afridi', shortName: 'S Afridi', team: 'PAK', role: 'Bowler', bowlingStyle: 'Left-arm fast', creditValue: 9.5, isActive: true },
  { externalPlayerId: 'pak_4', name: 'Shadab Khan', shortName: 'S Khan', team: 'PAK', role: 'All-Rounder', bowlingStyle: 'Right-arm leg break', creditValue: 8.5, isActive: true },
  { externalPlayerId: 'pak_5', name: 'Fakhar Zaman', shortName: 'F Zaman', team: 'PAK', role: 'Batsman', battingStyle: 'Left-hand bat', creditValue: 9.0, isActive: true },
  { externalPlayerId: 'pak_6', name: 'Haris Rauf', shortName: 'H Rauf', team: 'PAK', role: 'Bowler', bowlingStyle: 'Right-arm fast', creditValue: 8.5, isActive: true },
  { externalPlayerId: 'pak_7', name: 'Iftikhar Ahmed', shortName: 'I Ahmed', team: 'PAK', role: 'All-Rounder', battingStyle: 'Right-hand bat', creditValue: 8.0, isActive: true },
  { externalPlayerId: 'pak_8', name: 'Naseem Shah', shortName: 'N Shah', team: 'PAK', role: 'Bowler', bowlingStyle: 'Right-arm fast', creditValue: 8.5, isActive: true },
  { externalPlayerId: 'pak_9', name: 'Mohammad Nawaz', shortName: 'M Nawaz', team: 'PAK', role: 'All-Rounder', bowlingStyle: 'Slow left-arm orthodox', creditValue: 8.0, isActive: true },
  { externalPlayerId: 'pak_10', name: 'Imam-ul-Haq', shortName: 'I Haq', team: 'PAK', role: 'Batsman', battingStyle: 'Left-hand bat', creditValue: 8.5, isActive: true },
  { externalPlayerId: 'pak_11', name: 'Usama Mir', shortName: 'U Mir', team: 'PAK', role: 'Bowler', bowlingStyle: 'Right-arm leg break', creditValue: 7.5, isActive: true },

  // Australia
  { externalPlayerId: 'aus_1', name: 'Travis Head', shortName: 'T Head', team: 'AUS', role: 'Batsman', battingStyle: 'Left-hand bat', creditValue: 10.0, isActive: true },
  { externalPlayerId: 'aus_2', name: 'David Warner', shortName: 'D Warner', team: 'AUS', role: 'Batsman', battingStyle: 'Left-hand bat', creditValue: 10.0, isActive: true },
  { externalPlayerId: 'aus_3', name: 'Glenn Maxwell', shortName: 'G Maxwell', team: 'AUS', role: 'All-Rounder', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm offbreak', creditValue: 9.5, isActive: true },
  { externalPlayerId: 'aus_4', name: 'Mitchell Starc', shortName: 'M Starc', team: 'AUS', role: 'Bowler', bowlingStyle: 'Left-arm fast', creditValue: 9.5, isActive: true },
  { externalPlayerId: 'aus_5', name: 'Pat Cummins', shortName: 'P Cummins', team: 'AUS', role: 'Bowler', bowlingStyle: 'Right-arm fast', creditValue: 9.5, isActive: true },
  { externalPlayerId: 'aus_6', name: 'Josh Hazlewood', shortName: 'J Hazlewood', team: 'AUS', role: 'Bowler', bowlingStyle: 'Right-arm fast-medium', creditValue: 9.0, isActive: true },
  { externalPlayerId: 'aus_7', name: 'Marcus Stoinis', shortName: 'M Stoinis', team: 'AUS', role: 'All-Rounder', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium', creditValue: 8.5, isActive: true },
  { externalPlayerId: 'aus_8', name: 'Josh Inglis', shortName: 'J Inglis', team: 'AUS', role: 'Wicket-Keeper', battingStyle: 'Right-hand bat', creditValue: 8.5, isActive: true },
  { externalPlayerId: 'aus_9', name: 'Adam Zampa', shortName: 'A Zampa', team: 'AUS', role: 'Bowler', bowlingStyle: 'Right-arm leg break', creditValue: 8.5, isActive: true },
  { externalPlayerId: 'aus_10', name: 'Steve Smith', shortName: 'S Smith', team: 'AUS', role: 'Batsman', battingStyle: 'Right-hand bat', creditValue: 9.0, isActive: true },
  { externalPlayerId: 'aus_11', name: 'Mitchell Marsh', shortName: 'M Marsh', team: 'AUS', role: 'All-Rounder', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium-fast', creditValue: 8.5, isActive: true },

  // Ireland
  { externalPlayerId: 'ire_1', name: 'Paul Stirling', shortName: 'P Stirling', team: 'IRE', role: 'Batsman', battingStyle: 'Right-hand bat', creditValue: 9.0, isActive: true },
  { externalPlayerId: 'ire_2', name: 'Andrew Balbirnie', shortName: 'A Balbirnie', team: 'IRE', role: 'Batsman', battingStyle: 'Right-hand bat', creditValue: 8.5, isActive: true },
  { externalPlayerId: 'ire_3', name: 'Lorcan Tucker', shortName: 'L Tucker', team: 'IRE', role: 'Wicket-Keeper', battingStyle: 'Left-hand bat', creditValue: 8.0, isActive: true },
  { externalPlayerId: 'ire_4', name: 'Josh Little', shortName: 'J Little', team: 'IRE', role: 'Bowler', bowlingStyle: 'Left-arm fast-medium', creditValue: 8.0, isActive: true },
  { externalPlayerId: 'ire_5', name: 'Mark Adair', shortName: 'M Adair', team: 'IRE', role: 'All-Rounder', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium-fast', creditValue: 8.0, isActive: true },
  { externalPlayerId: 'ire_6', name: 'Curtis Campher', shortName: 'C Campher', team: 'IRE', role: 'All-Rounder', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium', creditValue: 7.5, isActive: true },
  { externalPlayerId: 'ire_7', name: 'George Dockrell', shortName: 'G Dockrell', team: 'IRE', role: 'Bowler', bowlingStyle: 'Slow left-arm orthodox', creditValue: 7.5, isActive: true },
  { externalPlayerId: 'ire_8', name: 'Barry McCarthy', shortName: 'B McCarthy', team: 'IRE', role: 'Bowler', bowlingStyle: 'Right-arm medium-fast', creditValue: 7.5, isActive: true },
  { externalPlayerId: 'ire_9', name: 'Harry Tector', shortName: 'H Tector', team: 'IRE', role: 'Batsman', battingStyle: 'Right-hand bat', creditValue: 8.0, isActive: true },
  { externalPlayerId: 'ire_10', name: 'Gareth Delany', shortName: 'G Delany', team: 'IRE', role: 'All-Rounder', battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm leg break', creditValue: 7.5, isActive: true },
  { externalPlayerId: 'ire_11', name: 'Craig Young', shortName: 'C Young', team: 'IRE', role: 'Bowler', bowlingStyle: 'Right-arm medium-fast', creditValue: 7.0, isActive: true },

  // USA
  { externalPlayerId: 'usa_1', name: 'Monank Patel', shortName: 'M Patel', team: 'USA', role: 'Wicket-Keeper', battingStyle: 'Right-hand bat', creditValue: 8.5, isActive: true },
  { externalPlayerId: 'usa_2', name: 'Aaron Jones', shortName: 'A Jones', team: 'USA', role: 'Batsman', battingStyle: 'Right-hand bat', creditValue: 8.5, isActive: true },
  { externalPlayerId: 'usa_3', name: 'Steven Taylor', shortName: 'S Taylor', team: 'USA', role: 'All-Rounder', battingStyle: 'Left-hand bat', creditValue: 8.0, isActive: true },
  { externalPlayerId: 'usa_4', name: 'Saurabh Netravalkar', shortName: 'S Netravalkar', team: 'USA', role: 'Bowler', bowlingStyle: 'Left-arm medium', creditValue: 8.5, isActive: true },
  { externalPlayerId: 'usa_5', name: 'Ali Khan', shortName: 'A Khan', team: 'USA', role: 'Bowler', bowlingStyle: 'Right-arm fast-medium', creditValue: 8.0, isActive: true },
  { externalPlayerId: 'usa_6', name: 'Corey Anderson', shortName: 'C Anderson', team: 'USA', role: 'All-Rounder', battingStyle: 'Left-hand bat', bowlingStyle: 'Left-arm medium-fast', creditValue: 8.0, isActive: true },
  { externalPlayerId: 'usa_7', name: 'Andries Gous', shortName: 'A Gous', team: 'USA', role: 'Batsman', battingStyle: 'Right-hand bat', creditValue: 7.5, isActive: true },
  { externalPlayerId: 'usa_8', name: 'Nitish Kumar', shortName: 'N Kumar', team: 'USA', role: 'All-Rounder', battingStyle: 'Right-hand bat', creditValue: 7.5, isActive: true },
  { externalPlayerId: 'usa_9', name: 'Nosthush Kenjige', shortName: 'N Kenjige', team: 'USA', role: 'Bowler', bowlingStyle: 'Slow left-arm orthodox', creditValue: 7.5, isActive: true },
  { externalPlayerId: 'usa_10', name: 'Jasdeep Singh', shortName: 'J Singh', team: 'USA', role: 'Bowler', bowlingStyle: 'Right-arm fast-medium', creditValue: 7.0, isActive: true },
  { externalPlayerId: 'usa_11', name: 'Shadley van Schalkwyk', shortName: 'S van Schalkwyk', team: 'USA', role: 'Bowler', bowlingStyle: 'Right-arm fast-medium', creditValue: 7.0, isActive: true },

  // Canada
  { externalPlayerId: 'can_1', name: 'Navneet Dhaliwal', shortName: 'N Dhaliwal', team: 'CAN', role: 'Batsman', battingStyle: 'Left-hand bat', creditValue: 8.0, isActive: true },
  { externalPlayerId: 'can_2', name: 'Aaron Johnson', shortName: 'A Johnson', team: 'CAN', role: 'Batsman', battingStyle: 'Right-hand bat', creditValue: 8.0, isActive: true },
  { externalPlayerId: 'can_3', name: 'Nicholas Kirton', shortName: 'N Kirton', team: 'CAN', role: 'Batsman', battingStyle: 'Right-hand bat', creditValue: 7.5, isActive: true },
  { externalPlayerId: 'can_4', name: 'Shreyas Movva', shortName: 'S Movva', team: 'CAN', role: 'Wicket-Keeper', battingStyle: 'Right-hand bat', creditValue: 7.5, isActive: true },
  { externalPlayerId: 'can_5', name: 'Saad Bin Zafar', shortName: 'S Zafar', team: 'CAN', role: 'All-Rounder', bowlingStyle: 'Slow left-arm orthodox', creditValue: 8.0, isActive: true },
  { externalPlayerId: 'can_6', name: 'Dillon Heyliger', shortName: 'D Heyliger', team: 'CAN', role: 'All-Rounder', bowlingStyle: 'Right-arm medium', creditValue: 7.5, isActive: true },
  { externalPlayerId: 'can_7', name: 'Kaleem Sana', shortName: 'K Sana', team: 'CAN', role: 'Bowler', bowlingStyle: 'Left-arm fast-medium', creditValue: 7.5, isActive: true },
  { externalPlayerId: 'can_8', name: 'Jeremy Gordon', shortName: 'J Gordon', team: 'CAN', role: 'Bowler', bowlingStyle: 'Right-arm fast', creditValue: 7.5, isActive: true },
  { externalPlayerId: 'can_9', name: 'Pargat Singh', shortName: 'P Singh', team: 'CAN', role: 'Batsman', battingStyle: 'Right-hand bat', creditValue: 7.0, isActive: true },
  { externalPlayerId: 'can_10', name: 'Junaid Siddiqui', shortName: 'J Siddiqui', team: 'CAN', role: 'Bowler', bowlingStyle: 'Right-arm leg break', creditValue: 7.0, isActive: true },
  { externalPlayerId: 'can_11', name: 'Ravinderpal Singh', shortName: 'R Singh', team: 'CAN', role: 'Bowler', bowlingStyle: 'Right-arm offbreak', creditValue: 7.0, isActive: true }
];

async function seedPlayers() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing players
    await Player.deleteMany({});
    console.log('Cleared existing players');

    // Insert new players
    const result = await Player.insertMany(players);
    console.log(`Inserted ${result.length} players`);

    // Count by team
    const teams = [...new Set(players.map(p => p.team))];
    for (const team of teams) {
      const count = players.filter(p => p.team === team).length;
      console.log(`  ${team}: ${count} players`);
    }

    console.log('\nPlayers seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding players:', error.message);
    process.exit(1);
  }
}

seedPlayers();
