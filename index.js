const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  ChannelType
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ]
});

const TOKEN = process.env.TOKEN;

if (!TOKEN) {
  console.error("❌ TOKEN is missing.");
  process.exit(1);
}

// ==============================
// DATA
// ==============================

const DATA_DIR = path.join(__dirname, "data");
const ECONOMY_FILE = path.join(DATA_DIR, "economy.json");
const BACKUP_FILE = path.join(DATA_DIR, "server-backup.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
      return fallback;
    }

    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    console.error(`Error loading ${file}:`, err);
    return fallback;
  }
}

function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

let economy = loadJSON(ECONOMY_FILE, {});
let backup = loadJSON(BACKUP_FILE, null);

// ==============================
// CONFIG
// ==============================

const OWNER_ROLE = "👑 Owner";
const MOD_ROLE = "🛡️ Moderator";
const STAFF_ROLE = "🔨 Staff";

const VERIFIED_ROLE = "Verified";

const HONEYPOT_CHANNEL = "🍯・honeypot-security";
const HONEYPOT_CATEGORY = "🍯 HONEYPOT SECURITY";

// ==============================
// ANIMALS
// ==============================

const animals = [
  {
    name: "cat",
    rarity: "common",
    chance: 30,
    value: 100,
    emoji: "🐱",
    image: "https://cataas.com/cat"
  },
  {
    name: "dog",
    rarity: "common",
    chance: 25,
    value: 90,
    emoji: "🐶"
  },
  {
    name: "rabbit",
    rarity: "common",
    chance: 18,
    value: 75,
    emoji: "🐰"
  },
  {
    name: "fox",
    rarity: "uncommon",
    chance: 10,
    value: 250,
    emoji: "🦊"
  },
  {
    name: "frog",
    rarity: "uncommon",
    chance: 7,
    value: 300,
    emoji: "🐸"
  },
  {
    name: "panda",
    rarity: "rare",
    chance: 4,
    value: 750,
    emoji: "🐼"
  },
  {
    name: "penguin",
    rarity: "rare",
    chance: 3,
    value: 850,
    emoji: "🐧"
  },
  {
    name: "koala",
    rarity: "epic",
    chance: 1.5,
    value: 1500,
    emoji: "🐨"
  },
  {
    name: "tiger",
    rarity: "epic",
    chance: 0.8,
    value: 3000,
    emoji: "🐯"
  },
  {
    name: "dragon",
    rarity: "legendary",
    chance: 0.5,
    value: 10000,
    emoji: "🐉"
  },
  {
    name: "unicorn",
    rarity: "mythic",
    chance: 0.2,
    value: 25000,
    emoji: "🦄"
  }
];

function randomAnimal() {
  const total = animals.reduce((sum, animal) => sum + animal.chance, 0);
  let roll = Math.random() * total;

  for (const animal of animals) {
    roll -= animal.chance;

    if (roll <= 0) {
      return animal;
    }
  }

  return animals[0];
}

// ==============================
// ECONOMY
// ==============================

function getUser(userId) {
  if (!economy[userId]) {
    economy[userId] = {
      coins: 1000,
      bank: 0,
      animals: {},
      pets: [],
      inventory: [],
      lastDaily: 0,
      lastWork: 0,
      wins: 0,
      losses: 0
    };
  }

  return economy[userId];
}

function money(amount) {
  return amount.toLocaleString();
}

function saveEconomy() {
  saveJSON(ECONOMY_FILE, economy);
}

// ==============================
// PERMISSIONS
// ==============================

function hasRole(member, roleName) {
  return member.roles.cache.some(role => role.name === roleName);
}

function isOwner(member) {
  return (
    member.id === member.guild.ownerId ||
    hasRole(member, OWNER_ROLE)
  );
}

function isModerator(member) {
  return isOwner(member) || hasRole(member, MOD_ROLE);
}

function isStaff(member) {
  return (
    isModerator(member) ||
    hasRole(member, STAFF_ROLE)
  );
}

function canModerate(member, level) {
  if (level === "owner") return isOwner(member);
  if (level === "mod") return isModerator(member);
  if (level === "staff") return isStaff(member);

  return false;
}

// ==============================
// BACKUP SYSTEM
// ==============================

function serializeOverwrites(channel) {
  return channel.permissionOverwrites.cache.map(overwrite => ({
    id: overwrite.id,
    type: overwrite.type,
    allow: overwrite.allow.toArray(),
    deny: overwrite.deny.toArray()
  }));
}

function createBackup(guild) {
  return {
    guildId: guild.id,
    createdAt: Date.now(),

    roles: guild.roles.cache
      .filter(role => role.id !== guild.id)
      .map(role => ({
        id: role.id,
        name: role.name,
        color: role.hexColor,
        hoist: role.hoist,
        position: role.position,
        permissions: role.permissions.toArray(),
        mentionable: role.mentionable