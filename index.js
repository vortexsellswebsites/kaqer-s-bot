const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

const fs = require("fs");
const path = require("path");

// ======================================================
// CLIENT
// ======================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ]
});

const TOKEN = process.env.TOKEN;

if (!TOKEN) {
  console.error("❌ TOKEN environment variable is missing.");
  process.exit(1);
}

// ======================================================
// FILES
// ======================================================

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
  } catch (error) {
    console.error(`Could not load ${file}:`, error);
    return fallback;
  }
}

function saveJSON(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Could not save ${file}:`, error);
  }
}

let economy = loadJSON(ECONOMY_FILE, {});
let backup = loadJSON(BACKUP_FILE, null);

// ======================================================
// CONFIG
// ======================================================

const OWNER_ROLE = "👑 Owner";
const MOD_ROLE = "🛡️ Moderator";
const STAFF_ROLE = "🔨 Staff";

const VERIFIED_ROLE = "Verified";
const MEMBER_ROLE = "Member";

const HONEYPOT_CHANNEL = "🍯・honeypot-security";
const HONEYPOT_CATEGORY = "🍯 HONEYPOT SECURITY";

// ======================================================
// HELPERS
// ======================================================

function money(number) {
  return Number(number || 0).toLocaleString();
}

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

    saveJSON(ECONOMY_FILE, economy);
  }

  return economy[userId];
}

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

function requireLevel(interaction, level) {
  const member = interaction.member;

  if (level === "owner" && !isOwner(member)) {
    return false;
  }

  if (level === "mod" && !isModerator(member)) {
    return false;
  }

  if (level === "staff" && !isStaff(member)) {
    return false;
  }

  return true;
}

async function replyEphemeral(interaction, content) {
  if (interaction.replied || interaction.deferred) {
    return interaction.followUp({
      content,
      ephemeral: true
    });
  }

  return interaction.reply({
    content,
    ephemeral: true
  });
}

// ======================================================
// ANIMALS
// ======================================================

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
  const total = animals.reduce(
    (sum, animal) => sum + animal.chance,
    0
  );

  let roll = Math.random() * total;

  for (const animal of animals) {
    roll -= animal.chance;

    if (roll <= 0) {
      return animal;
    }
  }

  return animals[0];
}

// ======================================================
// BACKUP SYSTEM
// ======================================================

function createBackup(guild) {
  const roles = [];
  const channels = [];

  // ---------- ROLES ----------
  for (const role of guild.roles.cache.values()) {
    if (role.id === guild.id) continue;

    roles.push({
      id: role.id,
      name: String(role.name),
      color: role.hexColor || "#000000",
      hoist: Boolean(role.hoist),
      position: Number(role.position || 0),
      permissions: role.permissions.toArray(),
      mentionable: Boolean(role.mentionable)
    });
  }

  // ---------- CHANNELS ----------
  for (const channel of guild.channels.cache.values()) {
    const overwrites = [];

    for (const overwrite of channel.permissionOverwrites.cache.values()) {
      overwrites.push({
        id: overwrite.id,
        type: overwrite.type,
        allow: overwrite.allow.toArray(),
        deny: overwrite.deny.toArray()
      });
    }

    channels.push({
      id: channel.id,
      name: String(channel.name),
      type: channel.type,
      parentId: channel.parentId || null,
      position: Number(channel.rawPosition || 0),
      topic: channel.topic || null,
      nsfw: Boolean(channel.nsfw),
      rateLimitPerUser: Number(channel.rateLimitPerUser || 0),
      permissionOverwrites: overwrites
    });
  }

  return {
    guildId: guild.id,
    createdAt: Date.now(),
    roles,
    channels
  };
}

async function saveServerBackup(guild) {
  backup = createBackup(guild);
  saveJSON(BACKUP_FILE, backup);
}

async function restoreServerBackup(guild) {
  if (!backup) {
    throw new Error("There is no saved backup.");
  }

  // ------------------------------------------
  // ROLE MAP
  // ------------------------------------------

  const roleMap = new Map();

  // Map old IDs to current roles by ID first
  for (const oldRole of backup.roles) {
    const existing = guild.roles.cache.get(oldRole.id);

    if (existing) {
      roleMap.set(oldRole.id, existing);
    }
  }

  // Then match remaining roles by name
  for (const oldRole of backup.roles) {
    if (roleMap.has(oldRole.id)) continue;

    const existing = guild.roles.cache.find(
      role => role.name === oldRole.name
    );

    if (existing) {
      roleMap.set(oldRole.id, existing);
    }
  }

  // ------------------------------------------
  // CREATE MISSING ROLES
  // ------------------------------------------

  for (const oldRole of backup.roles) {
    if (roleMap.has(oldRole.id)) continue;

    try {
      const newRole = await guild.roles.create({
        name: oldRole.name,
        color: oldRole.color,
        hoist: oldRole.hoist,
        permissions: oldRole.permissions,
        mentionable: oldRole.mentionable,
        reason: "Server backup restore"
      });

      roleMap.set(oldRole.id, newRole);
    } catch (error) {
      console.log(
        `Could not restore role ${oldRole.name}:`,
        error.message
      );
    }
  }

  // ------------------------------------------
  // CHANNELS
  // ------------------------------------------

  const channelMap = new Map();

  // Existing channels by ID
  for (const oldChannel of backup.channels) {
    const existing = guild.channels.cache.get(oldChannel.id);

    if (existing) {
      channelMap.set(oldChannel.id, existing);
    }
  }

  // Existing channels by name
  for (const oldChannel of backup.channels) {
    if (channelMap.has(oldChannel.id)) continue;

    const existing = guild.channels.cache.find(
      channel =>
        channel.name === oldChannel.name &&
        channel.type === oldChannel.type
    );

    if (existing) {
      channelMap.set(oldChannel.id, existing);
    }
  }

  // ------------------------------------------
  // CREATE MISSING CHANNELS
  // ------------------------------------------

  const sortedChannels = [...backup.channels].sort(
    (a, b) => a.position - b.position
  );

  for (const oldChannel of sortedChannels) {
    if (channelMap.has(oldChannel.id)) continue;

    try {
      const parent =
        oldChannel.parentId &&
        channelMap.get(oldChannel.parentId);

      const options = {
        name: oldChannel.name,
        type: oldChannel.type,
        reason: "Server backup restore"
      };

      if (parent) {
        options.parent = parent;
      }

      if (oldChannel.type === ChannelType.GuildText) {
        options.topic = oldChannel.topic || undefined;
        options.nsfw = oldChannel.nsfw;
        options.rateLimitPerUser = oldChannel.rateLimitPerUser;
      }

      const newChannel = await guild.channels.create(options);

      channelMap.set(oldChannel.id, newChannel);
    } catch (error) {
      console.log(
        `Could not restore channel ${oldChannel.name}:`,
        error.message
      );
    }
  }

  // ------------------------------------------
  // RESTORE CHANNEL SETTINGS
  // ------------------------------------------

  for (const oldChannel of backup.channels) {
    const channel = channelMap.get(oldChannel.id);

    if (!channel) continue;

    try {
      if (
        channel.type === ChannelType.GuildText ||
        channel.type === ChannelType.GuildAnnouncement
      ) {
        await channel.edit({
          topic: oldChannel.topic || null,
          nsfw: oldChannel.nsfw,
          rateLimitPerUser: oldChannel.rateLimitPerUser
        });
      }
    } catch {}
  }

  // ------------------------------------------
  // RESTORE PERMISSIONS
  // ------------------------------------------

  for (const oldChannel of backup.channels) {
    const channel = channelMap.get(oldChannel.id);

    if (!channel) continue;

    for (const overwrite of oldChannel.permissionOverwrites || []) {
      let targetId = overwrite.id;

      const mappedRole = roleMap.get(overwrite.id);

      if (mappedRole) {
        targetId = mappedRole.id;
      }

      try {
        await channel.permissionOverwrites.edit(targetId, {
          allow: overwrite.allow || [],
          deny: overwrite.deny || []
        });
      } catch {}
    }
  }

  return true;
}

// ======================================================
// HONEYPOT
// ======================================================

async function ensureHoneypot(guild) {
  let category = guild.channels.cache.find(
    channel =>
      channel.type === ChannelType.GuildCategory &&
      channel.name === HONEYPOT_CATEGORY
  );

  if (!category) {
    category = await guild.channels.create({
      name: HONEYPOT_CATEGORY,
      type: ChannelType.GuildCategory,
      reason: "Create honeypot security category"
    });
  }

  let channel = guild.channels.cache.find(
    ch =>
      ch.type === ChannelType.GuildText &&
      ch.name === HONEYPOT_CHANNEL &&
      ch.parentId === category.id
  );

  if (!channel) {
    channel = await guild.channels.create({
      name: HONEYPOT_CHANNEL,
      type: ChannelType.GuildText,
      parent: category.id,
      topic: "security channel",
      reason: "Create honeypot security channel"
    });
  }

  return channel;
}

// ======================================================
// SLASH COMMANDS
// ======================================================

const commands = [

  // =========================
  // MODERATION
  // =========================

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("ban a member")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("member to ban")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("reason")
        .setDescription("reason")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("unban")
    .setDescription("unban a user")
    .addStringOption(o =>
      o.setName("userid")
        .setDescription("user id")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("kick a member")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("member to kick")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("reason")
        .setDescription("reason")
    ),

  new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("timeout a member")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("member")
        .setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName("minutes")
        .setDescription("minutes")
        .setMinValue(1)
        .setMaxValue(40320)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("untimeout")
    .setDescription("remove a timeout")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("member")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("warn a member")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("member")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("reason")
        .setDescription("reason")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("view warnings")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("member")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("clear")
    .setDescription("delete messages")
    .addIntegerOption(o =>
      o.setName("amount")
        .setDescription("1-100")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("slowmode")
    .setDescription("set channel slowmode")
    .addIntegerOption(o =>
      o.setName("seconds")
        .setDescription("seconds")
        .setMinValue(0)
        .setMaxValue(21600)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("lock")
    .setDescription("lock the channel"),

  new SlashCommandBuilder()
    .setName("unlock")
    .setDescription("unlock the channel"),

  // =========================
  // UTILITY
  // =========================

  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("check bot latency"),

  new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("view user information")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("user")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("view server information"),

  new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("view someone's avatar")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("user")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("botinfo")
    .setDescription("view bot information"),

  // =========================
  // FUN
  // =========================

  new SlashCommandBuilder()
    .setName("8ball")
    .setDescription("ask the magic 8ball")
    .addStringOption(o =>
      o.setName("question")
        .setDescription("question")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("flip a coin"),

  new SlashCommandBuilder()
    .setName("dice")
    .setDescription("roll a dice"),

  new SlashCommandBuilder()
    .setName("roll")
    .setDescription("roll a number")
    .addIntegerOption(o =>
      o.setName("max")
        .setDescription("maximum number")
        .setMinValue(2)
        .setMaxValue(1000000)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("choose")
    .setDescription("choose between options")
    .addStringOption(o =>
      o.setName("options")
        .setDescription("separate options with commas")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("rps")
    .setDescription("rock paper scissors")
    .addStringOption(o =>
      o.setName("choice")
        .setDescription("your choice")
        .setRequired(true)
        .addChoices(
          { name: "rock", value: "rock" },
          { name: "paper", value: "paper" },
          { name: "scissors", value: "scissors" }
        )
    ),

  new SlashCommandBuilder()
    .setName("ship")
    .setDescription("ship two users")
    .addUserOption(o =>
      o.setName("user1")
        .setDescription("first user")
        .setRequired(true)
    )
    .addUserOption(o =>
      o.setName("user2")
        .setDescription("second user")
        .setRequired(true)
    ),

  // =========================
  // ECONOMY
  // =========================

  new SlashCommandBuilder()
    .setName("balance")
    .setDescription("check your balance")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("user")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("daily")
    .setDescription("claim your daily coins"),

  new SlashCommandBuilder()
    .setName("work")
    .setDescription("work for some coins"),

  new SlashCommandBuilder()
    .setName("pay")
    .setDescription("pay another user")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("user")
        .setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName("amount")
        .setDescription("amount")
        .setMinValue(1)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("hunt")
    .setDescription("hunt for an animal"),

  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("view the richest users"),

  new SlashCommandBuilder()
    .setName("deposit")
    .setDescription("deposit coins into your bank")
    .addIntegerOption(o =>
      o.setName("amount")
        .setDescription("amount")
        .setMinValue(1)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("withdraw")
    .setDescription("withdraw coins from your bank")
    .addIntegerOption(o =>
      o.setName("amount")
        .setDescription("amount")
        .setMinValue(1)
        .setRequired(true)
    ),

  // =========================
  // CASINO
  // =========================

  new SlashCommandBuilder()
    .setName("slots")
    .setDescription("play slots")
    .addIntegerOption(o =>
      o.setName("amount")
        .setDescription("bet")
        .setMinValue(1)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("gamble")
    .setDescription("50/50 gamble")
    .addIntegerOption(o =>
      o.setName("amount")
        .setDescription("bet")
        .setMinValue(1)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("dicebet")
    .setDescription("bet on a dice roll")
    .addIntegerOption(o =>
      o.setName("amount")
        .setDescription("bet")
        .setMinValue(1)
        .setRequired(true)
    ),

  // =========================
  // PETS
  // =========================

  new SlashCommandBuilder()
    .setName("pets")
    .setDescription("view your pets"),

  new SlashCommandBuilder()
    .setName("pet")
    .setDescription("turn an animal into a pet")
    .addStringOption(o =>
      o.setName("animal")
        .setDescription("animal name")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("feed")
    .setDescription("feed a pet")
    .addIntegerOption(o =>
      o.setName("number")
        .setDescription("pet number")
        .setMinValue(1)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("play")
    .setDescription("play with a pet")
    .addIntegerOption(o =>
      o.setName("number")
        .setDescription("pet number")
        .setMinValue(1)
        .setRequired(true)
    ),

  // =========================
  // INVENTORY
  // =========================

  new SlashCommandBuilder()
    .setName("inventory")
    .setDescription("view your inventory"),

  new SlashCommandBuilder()
    .setName("shop")
    .setDescription("view the shop"),

  // =========================
  // SERVER
  // =========================

  new SlashCommandBuilder()
    .setName("verify-panel")
    .setDescription("send the verification panel"),

  new SlashCommandBuilder()
    .setName("ticket-panel")
    .setDescription("send the ticket panel"),

  new SlashCommandBuilder()
    .setName("mod-panel")
    .setDescription("send the moderator application panel"),

  new SlashCommandBuilder()
    .setName("rules")
    .setDescription("send the rules"),

  new SlashCommandBuilder()
    .setName("announce")
    .setDescription("send an announcement")
    .addStringOption(o =>
      o.setName("message")
        .setDescription("announcement")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("say")
    .setDescription("make the bot say something")
    .addStringOption(o =>
      o.setName("message")
        .setDescription("message")
        .setRequired(true)
    ),

  // =========================
  // MANAGEMENT
  // =========================

  new SlashCommandBuilder()
    .setName("addrole")
    .setDescription("create a role")
    .addStringOption(o =>
      o.setName("name")
        .setDescription("role name")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("removerole")
    .setDescription("delete a role")
    .addRoleOption(o =>
      o.setName("role")
        .setDescription("role")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("role")
    .setDescription("give or remove a role")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("user")
        .setRequired(true)
    )
    .addRoleOption(o =>
      o.setName("role")
        .setDescription("role")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("action")
        .setDescription("action")
        .setRequired(true)
        .addChoices(
          { name: "give", value: "give" },
          { name: "remove", value: "remove" }
        )
    ),

  new SlashCommandBuilder()
    .setName("nick")
    .setDescription("change a nickname")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("user")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("nickname")
        .setDescription("new nickname")
        .setRequired(true)
    ),

  // =========================
  // BACKUP
  // =========================

  new SlashCommandBuilder()
    .setName("save-backup")
    .setDescription("manually save the server backup"),

  new SlashCommandBuilder()
    .setName("backup")
    .setDescription("restore the manually saved backup")
].map(command => command.toJSON());

// ======================================================
// READY
// ======================================================

client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  try {
    await client.application.commands.set(commands);
    console.log(`✅ Registered ${commands.length} commands`);
  } catch (error) {
    console.error("❌ Command registration failed:", error);
  }

  for (const guild of client.guilds.cache.values()) {
    try {
      await ensureHoneypot(guild);
    } catch (error) {
      console.error(
        `Honeypot error in ${guild.name}:`,
        error.message
      );
    }
  }

  console.log("🟢 Bot is online.");
});

// ======================================================
// HONEYPOT
// ======================================================

client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (!message.guild) return;

  if (message.channel.name !== HONEYPOT_CHANNEL) return;

  // Owner/staff are exempt
  if (isStaff(message.member)) {
    return;
  }

  try {
    await message.delete().catch(() => {});

    await message.guild.members.ban(message.author.id, {
      reason: "Honeypot security trigger"
    });

    setTimeout(async () => {
      try {
        await message.guild.members.unban(
          message.author.id,
          "Honeypot temporary ban"
        );
      } catch {}
    }, 3000);

  } catch (error) {
    console.error("Honeypot error:", error.message);
  }
});

// ======================================================
// MEMBER JOIN
// ======================================================

client.on("guildMemberAdd", async member => {
  try {
    const memberRole = member.guild.roles.cache.find(
      role => role.name === MEMBER_ROLE
    );

    if (memberRole) {
      await member.roles.add(memberRole).catch(() => {});
    }

    const welcomeChannel = member.guild.channels.cache.find(
      channel =>
        channel.type === ChannelType.GuildText &&
        (
          channel.name === "👋・welcome" ||
          channel.name === "welcome"
        )
    );

    if (welcomeChannel) {
      await welcomeChannel.send(
        `👋 welcome ${member} to **${member.guild.name}**`
      );
    }
  } catch (error) {
    console.error("Member join error:", error.message);
  }
});

// ======================================================
// INTERACTIONS
// ======================================================

client.on("interactionCreate", async interaction => {

  // ====================================================
  // BUTTONS
  // ====================================================

  if (interaction.isButton()) {

    // ---------------- VERIFY ----------------

    if (interaction.customId === "verify") {
      const role = interaction.guild.roles.cache.find(
        r => r.name === VERIFIED_ROLE
      );

      if (!role) {
        return replyEphemeral(
          interaction,
          "❌ the `Verified` role doesn't exist."
        );
      }

      try {
        await interaction.member.roles.add(role);

        return replyEphemeral(
          interaction,
          "✅ you're verified."
        );
      } catch {
        return replyEphemeral(
          interaction,
          "❌ i couldn't give you the role."
        );
      }
    }

    // ---------------- TICKET ----------------

    if (interaction.customId === "create_ticket") {
      const existing = interaction.guild.channels.cache.find(
        channel =>
          channel.type === ChannelType.GuildText &&
          channel.name === `ticket-${interaction.user.username
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "")
            .slice(0, 15)}`
      );

      if (existing) {
        return replyEphemeral(
          interaction,
          `you already have a ticket: ${existing}`
        );
      }

      const channel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")
          .slice(0, 15)}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel]
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory
            ]
          }
        ]
      });

      const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("close_ticket")
          .setLabel("close ticket")
          .setEmoji("🔒")
          .setStyle(ButtonStyle.Danger)
      );

      await channel.send({
        content: `${interaction.user}`,
        embeds: [
          new EmbedBuilder()
            .setTitle("🎫 ticket")
            .setDescription(
              "tell us what you need help with.\n\n" +
              "a staff member will be with you soon."
            )
        ],
        components: [closeRow]
      });

      return replyEphemeral(
        interaction,
        `✅ ticket created: ${channel}`
      );
    }

    // ---------------- CLOSE TICKET ----------------

    if (interaction.customId === "close_ticket") {
      if (!isStaff(interaction.member)) {
        return replyEphemeral(
          interaction,
          "❌ staff only."
        );
      }

      await interaction.channel.delete(
        "Ticket closed"
      ).catch(() => {});

      return;
    }

    // ---------------- MOD APPLICATION ----------------

    if (interaction.customId === "moderator_apply") {
      const modal = new ModalBuilder()
        .setCustomId("moderator_application")
        .setTitle("moderator application");

      const age = new TextInputBuilder()
        .setCustomId("age")
        .setLabel("how old are you?")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(3);

      const experience = new TextInputBuilder()
        .setCustomId("experience")
        .setLabel("staff experience?")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(1000);

      const reason = new TextInputBuilder()
        .setCustomId("reason")
        .setLabel("why should we choose you?")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(1000);

      modal.addComponents(
        new ActionRowBuilder().addComponents(age),
        new ActionRowBuilder().addComponents(experience),
        new ActionRowBuilder().addComponents(reason)
      );

      return interaction.showModal(modal);
    }

    // ---------------- APPLICATION ACCEPT ----------------

    if (
      interaction.customId.startsWith(
        "application_accept_"
      )
    ) {
      if (!isModerator(interaction.member)) {
        return replyEphemeral(
          interaction,
          "❌ moderators only."
        );
      }

      const userId =
        interaction.customId.replace(
          "application_accept_",
          ""
        );

      const member =
        await interaction.guild.members
          .fetch(userId)
          .catch(() => null);

      if (!member) {
        return replyEphemeral(
          interaction,
          "❌ user isn't in the server."
        );
      }

      const role =
        interaction.guild.roles.cache.find(
          r => r.name === MOD_ROLE
        );

      if (role) {
        await member.roles.add(role).catch(() => {});
      }

      await interaction.update({
        content: `✅ application accepted for ${member}.`,
        embeds: interaction.message.embeds,
        components: []
      });

      return;
    }

    // ---------------- APPLICATION DENY ----------------

    if (
      interaction.customId.startsWith(
        "application_deny_"
      )
    ) {
      if (!isModerator(interaction.member)) {
        return replyEphemeral(
          interaction,
          "❌ moderators only."
        );
      }

      await interaction.update({
        content: "❌ application denied.",
        embeds: interaction.message.embeds,
        components: []
      });

      return;
    }
  }

  // ====================================================
  // MODAL
  // ====================================================

  if (interaction.isModalSubmit()) {

    if (
      interaction.customId ===
      "moderator_application"
    ) {
      const age =
        interaction.fields.getTextInputValue("age");

      const experience =
        interaction.fields.getTextInputValue(
          "experience"
        );

      const reason =
        interaction.fields.getTextInputValue(
          "reason"
        );

      const applicationChannel =
        interaction.guild.channels.cache.find(
          channel =>
            channel.type === ChannelType.GuildText &&
            (
              channel.name === "mod-applications" ||
              channel.name === "moderator-applications"
            )
        );

      if (!applicationChannel) {
        return replyEphemeral(
          interaction,
          "❌ application channel doesn't exist."
        );
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(
            `application_accept_${interaction.user.id}`
          )
          .setLabel("accept")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId(
            `application_deny_${interaction.user.id}`
          )
          .setLabel("deny")
          .setStyle(ButtonStyle.Danger)
      );

      const embed = new EmbedBuilder()
        .setTitle("🛡️ moderator application")
        .setDescription(
          `**applicant:** ${interaction.user}\n\n` +
          `**age:** ${age}\n\n` +
          `**experience:** ${experience}\n\n` +
          `**why them:** ${reason}`
        )
        .setTimestamp();

      await applicationChannel.send({
        embeds: [embed],
        components: [row]
      });

      return replyEphemeral(
        interaction,
        "✅ your application was submitted."
      );
    }
  }

  // ====================================================
  // SLASH COMMANDS
  // ====================================================

  if (!interaction.isChatInputCommand()) return;

  const command = interaction.commandName;

  // ====================================================
  // MODERATION
  // ====================================================

  if (command === "ban") {
    if (!requireLevel(interaction, "owner")) {
      return replyEphemeral(
        interaction,
        "❌ owner only."
      );
    }

    const user =
      interaction.options.getUser("user");

    const reason =
      interaction.options.getString("reason") ||
      "no reason given";

    const member =
      await interaction.guild.members
        .fetch(user.id)
        .catch(() => null);

    if (!member) {
      return replyEphemeral(
        interaction,
        "❌ that member isn't in the server."
      );
    }

    if (
      member.id === interaction.user.id ||
      member.id === interaction.guild.ownerId
    ) {
      return replyEphemeral(
        interaction,
        "❌ you can't ban that user."
      );
    }

    try {
      await member.ban({ reason });

      return interaction.reply(
        `🔨 ${user.tag} was banned.`
      );
    } catch {
      return replyEphemeral(
        interaction,
        "❌ i couldn't ban that member."
      );
    }
  }

  if (command === "unban") {
    if (!requireLevel(interaction, "owner")) {
      return replyEphemeral(
        interaction,
        "❌ owner only."
      );
    }

    const id =
      interaction.options.getString("userid");

    try {
      await interaction.guild.members.unban(id);

      return interaction.reply(
        `✅ <@${id}> was unbanned.`
      );
    } catch {
      return replyEphemeral(
        interaction,
        "❌ couldn't unban that user."
      );
    }
  }

  if (command === "kick") {
    if (!requireLevel(interaction, "mod")) {
      return replyEphemeral(
        interaction,
        "❌ moderators only."
      );
    }

    const user =
      interaction.options.getUser("user");

    const reason =
      interaction.options.getString("reason") ||
      "no reason given";

    const member =
      await interaction.guild.members
        .fetch(user.id)
        .catch(() => null);

    if (!member) {
      return replyEphemeral(
        interaction,
        "❌ member not found."
      );
    }

    if (
      member.id === interaction.guild.ownerId ||
      member.roles.highest.position >=
        interaction.member.roles.highest.position
    ) {
      return replyEphemeral(
        interaction,
        "❌ you can't moderate that member."
      );
    }

    try {
      await member.kick(reason);

      return interaction.reply(
        `👢 ${user.tag} was kicked.`
      );
    } catch {
      return replyEphemeral(
        interaction,
        "❌ couldn't kick that member."
      );
    }
  }

  if (command === "timeout") {
    if (!requireLevel(interaction, "staff")) {
      return replyEphemeral(
        interaction,
        "❌ staff only."
      );
    }

    const user =
      interaction.options.getUser("user");

    const minutes =
      interaction.options.getInteger("minutes");

    const member =
      await interaction.guild.members
        .fetch(user.id)
        .catch(() => null);

    if (!member) {
      return replyEphemeral(
        interaction,
        "❌ member not found."
      );
    }

    if (
      member.id === interaction.guild.ownerId ||
      member.roles.highest.position >=
        interaction.member.roles.highest.position
    ) {
      return replyEphemeral(
        interaction,
        "❌ you can't timeout that member."
      );
    }

    try {
      await member.timeout(
        minutes * 60 * 1000,
        `Timeout by ${interaction.user.tag}`
      );

      return interaction.reply(
        `⏳ ${user.tag} was timed out for ${minutes} minute(s).`
      );
    } catch {
      return replyEphemeral(
        interaction,
        "❌ couldn't timeout that member."
      );
    }
  }

  if (command === "untimeout") {
    if (!requireLevel(interaction, "staff")) {
      return replyEphemeral(
        interaction,
        "❌ staff only."
      );
    }

    const user =
      interaction.options.getUser("user");

    const member =
      await interaction.guild.members
        .fetch(user.id)
        .catch(() => null);

    if (!member) {
      return replyEphemeral(
        interaction,
        "❌ member not found."
      );
    }

    await member.timeout(null).catch(() => {});

    return interaction.reply(
      `✅ timeout removed from ${user.tag}.`
    );
  }

  if (command === "warn") {
    if (!requireLevel(interaction, "mod")) {
      return replyEphemeral(
        interaction,
        "❌ moderators only."
      );
    }

    const user =
      interaction.options.getUser("user");

    const reason =
      interaction.options.getString("reason");

    const target = getUser(user.id);

    if (!target.warnings) {
      target.warnings = [];
    }

    target.warnings.push({
      reason,
      moderator: interaction.user.id,
      date: Date.now()
    });

    saveJSON(ECONOMY_FILE, economy);

    return interaction.reply(
      `⚠️ ${user.tag} was warned.`
    );
  }

  if (command === "warnings") {
    if (!requireLevel(interaction, "mod")) {
      return replyEphemeral(
        interaction,
        "❌ moderators only."
      );
    }

    const user =
      interaction.options.getUser("user");

    const target = getUser(user.id);
    const warnings = target.warnings || [];

    if (!warnings.length) {
      return interaction.reply(
        `✅ ${user.tag} has no warnings.`
      );
    }

    const text = warnings
      .map(
        (warning, index) =>
          `**${index + 1}.** ${warning.reason}`
      )
      .join("\n");

    return interaction.reply(
      `⚠️ warnings for ${user.tag}\n\n${text}`
    );
  }

  if (command === "clear") {
    if (!requireLevel(interaction, "mod")) {
      return replyEphemeral(
        interaction,
        "❌ moderators only."
      );
    }

    const amount =
      interaction.options.getInteger("amount");

    try {
      const deleted =
        await interaction.channel.bulkDelete(
          amount,
          true
        );

      return interaction.reply({
        content: `🧹 deleted ${deleted.size} messages.`,
        ephemeral: true
      });
    } catch {
      return replyEphemeral(
        interaction,
        "❌ couldn't delete messages."
      );
    }
  }

  if (command === "slowmode") {
    if (!requireLevel(interaction, "mod")) {
      return replyEphemeral(
        interaction,
        "❌ moderators only."
      );
    }

    const seconds =
      interaction.options.getInteger("seconds");

    await interaction.channel.setRateLimitPerUser(
      seconds
    );

    return interaction.reply(
      `🐌 slowmode set to ${seconds}s.`
    );
  }

  if (command === "lock" || command === "unlock") {
    if (!requireLevel(interaction, "mod")) {
      return replyEphemeral(
        interaction,
        "❌ moderators only."
      );
    }

    const everyone =
      interaction.guild.roles.everyone;

    const locked = command === "lock";

    await interaction.channel.permissionOverwrites.edit(
      everyone,
      {
        SendMessages: locked ? false : null
      }
    );

    return interaction.reply(
      locked
        ? "🔒 channel locked."
        : "🔓 channel unlocked."
    );
  }

  // ====================================================
  // UTILITY
  // ====================================================

  if (command === "ping") {
    return interaction.reply(
      `🏓 pong — ${client.ws.ping}ms`
    );
  }

  if (command === "userinfo") {
    const user =
      interaction.options.getUser("user") ||
      interaction.user;

    const member =
      await interaction.guild.members
        .fetch(user.id)
        .catch(() => null);

    const embed = new EmbedBuilder()
      .setTitle(`👤 ${user.username}`)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        {
          name: "user id",
          value: user.id
        },
        {
          name: "created",
          value: `<t:${Math.floor(
            user.createdTimestamp / 1000
          )}:R>`
        },
        {
          name: "joined",
          value: member
            ? `<t:${Math.floor(
                member.joinedTimestamp / 1000
              )}:R>`
            : "unknown"
        }
      );

    return interaction.reply({
      embeds: [embed]
    });
  }

  if (command === "serverinfo") {
    const guild = interaction.guild;

    const embed = new EmbedBuilder()
      .setTitle(`🏠 ${guild.name}`)
      .setThumbnail(
        guild.iconURL({ size: 512 }) || null
      )
      .addFields(
        {
          name: "members",
          value: money(guild.memberCount),
          inline: true
        },
        {
          name: "channels",
          value: money(guild.channels.cache.size),
          inline: true
        },
        {
          name: "roles",
          value: money(guild.roles.cache.size),
          inline: true
        }
      );

    return interaction.reply({
      embeds: [embed]
    });
  }

  if (command === "avatar") {
    const user =
      interaction.options.getUser("user") ||
      interaction.user;

    return interaction.reply(
      user.displayAvatarURL({
        size: 1024,
        extension: "png"
      })
    );
  }

  if (command === "botinfo") {
    return interaction.reply(
      `🤖 **${client.user.username}**\n` +
      `servers: ${client.guilds.cache.size}\n` +
      `users: ${client.users.cache.size}\n` +
      `ping: ${client.ws.ping}ms`
    );
  }

  // ====================================================
  // FUN
  // ====================================================

  if (command === "8ball") {
    const answers = [
      "yes",
      "no",
      "probably",
      "definitely",
      "nah 😭",
      "ask again later",
      "absolutely not",
      "maybe",
      "100%"
    ];

    const question =
      interaction.options.getString("question");

    const answer =
      answers[Math.floor(Math.random() * answers.length)];

    return interaction.reply(
      `🎱 **question:** ${question}\n**answer:** ${answer}`
    );
  }

  if (command === "coinflip") {
    return interaction.reply(
      Math.random() < 0.5
        ? "🪙 heads!"
        : "🪙 tails!"
    );
  }

  if (command === "dice") {
    const result =
      Math.floor(Math.random() * 6) + 1;

    return interaction.reply(
      `🎲 you rolled **${result}**`
    );
  }

  if (command === "roll") {
    const max =
      interaction.options.getInteger("max");

    const result =
      Math.floor(Math.random() * max) + 1;

    return interaction.reply(
      `🎲 **${result}** / ${max}`
    );
  }

  if (command === "choose") {
    const options =
      interaction.options
        .getString("options")
        .split(",")
        .map(x => x.trim())
        .filter(Boolean);

    if (!options.length) {
      return replyEphemeral(
        interaction,
        "❌ give me some options."
      );
    }

    const chosen =
      options[Math.floor(Math.random() * options.length)];

    return interaction.reply(
      `👉 i choose **${chosen}**`
    );
  }

  if (command === "rps") {
    const player =
      interaction.options.getString("choice");

    const choices = [
      "rock",
      "paper",
      "scissors"
    ];

    const bot =
      choices[Math.floor(Math.random() * choices.length)];

    let result;

    if (player === bot) {
      result = "tie 😭";
    } else if (
      (player === "rock" && bot === "scissors") ||
      (player === "paper" && bot === "rock") ||
      (player === "scissors" && bot === "paper")
    ) {
      result = "you win 🏆";
    } else {
      result = "i win 😭";
    }

    return interaction.reply(
      `you: **${player}**\nme: **${bot}**\n\n${result}`
    );
  }

  if (command === "ship") {
    const user1 =
      interaction.options.getUser("user1");

    const user2 =
      interaction.options.getUser("user2");

    const percentage =
      Math.floor(Math.random() * 101);

    return interaction.reply(
      `💗 ${user1} + ${user2} = **${percentage}%**`
    );
  }

  // ====================================================
  // ECONOMY
  // ====================================================

  if (command === "balance") {
    const user =
      interaction.options.getUser("user") ||
      interaction.user;

    const data = getUser(user.id);

    return interaction.reply(
      `💰 **${user.username}**\n\n` +
      `wallet: **${money(data.coins)}** coins\n` +
      `bank: **${money(data.bank)}** coins`
    );
  }

  if (command === "daily") {
    const data = getUser(interaction.user.id);

    const cooldown = 24 * 60 * 60 * 1000;
    const remaining =
      cooldown - (Date.now() - data.lastDaily);

    if (remaining > 0) {
      const hours =
        Math.ceil(remaining / 3600000);

      return replyEphemeral(
        interaction,
        `⏰ come back in about ${hours} hour(s).`
      );
    }

    const reward =
      Math.floor(Math.random() * 1001) + 1000;

    data.coins += reward;
    data.lastDaily = Date.now();

    saveJSON(ECONOMY_FILE, economy);

    return interaction.reply(
      `🎁 daily claimed — **+${money(reward)} coins**`
    );
  }

  if (command === "work") {
    const data = getUser(interaction.user.id);

    const cooldown = 30 * 60 * 1000;
    const remaining =
      cooldown - (Date.now() - data.lastWork);

    if (remaining > 0) {
      const minutes =
        Math.ceil(remaining / 60000);

      return replyEphemeral(
        interaction,
        `⏰ you need to wait ${minutes} minute(s).`
      );
    }

    const jobs = [
      "washed cars",
      "delivered pizzas",
      "walked dogs",
      "coded something",
      "worked at the store",
      "caught some fish",
      "mowed lawns"
    ];

    const job =
      jobs[Math.floor(Math.random() * jobs.length)];

    const reward =
      Math.floor(Math.random() * 501) + 250;

    data.coins += reward;
    data.lastWork = Date.now();

    saveJSON(ECONOMY_FILE, economy);

    return interaction.reply(
      `💼 you ${job} and earned **${money(reward)} coins**.`
    );
  }

  if (command === "pay") {
    const receiver =
      interaction.options.getUser("user");

    const amount =
      interaction.options.getInteger("amount");

    if (receiver.id === interaction.user.id) {
      return replyEphemeral(
        interaction,
        "❌ you can't pay yourself."
      );
    }

    const senderData =
      getUser(interaction.user.id);

    const receiverData =
      getUser(receiver.id);

    if (senderData.coins < amount) {
      return replyEphemeral(
        interaction,
        "❌ you don't have enough coins."
      );
    }

    senderData.coins -= amount;
    receiverData.coins += amount;

    saveJSON(ECONOMY_FILE, economy);

    return interaction.reply(
      `💸 ${interaction.user} paid ${receiver} **${money(amount)} coins**.`
    );
  }

  if (command === "hunt") {
    const data = getUser(interaction.user.id);

    const animal = randomAnimal();

    if (!data.animals[animal.name]) {
      data.animals[animal.name] = 0;
    }

    data.animals[animal.name]++;

    saveJSON(ECONOMY_FILE, economy);

    const embed = new EmbedBuilder()
      .setTitle(`${animal.emoji} you caught a ${animal.name}!`)
      .setDescription(
        `rarity: **${animal.rarity}**\n` +
        `value: **${money(animal.value)} coins**\n\n` +
        `you now have **${data.animals[animal.name]}** ${animal.name}(s).`
      );

    if (animal.image) {
      embed.setImage(animal.image);
    }

    return interaction.reply({
      embeds: [embed]
    });
  }

  if (command === "leaderboard") {
    const entries = Object.entries(economy)
      .sort(
        (a, b) =>
          (b[1].coins + b[1].bank) -
          (a[1].coins + a[1].bank)
      )
      .slice(0, 10);

    if (!entries.length) {
      return interaction.reply(
        "there's nobody on the leaderboard yet 😭"
      );
    }

    const lines = [];

    for (let i = 0; i < entries.length; i++) {
      const [id, data] = entries[i];

      const total =
        data.coins + data.bank;

      lines.push(
        `**${i + 1}.** <@${id}> — **${money(total)}**`
      );
    }

    return interaction.reply(
      `🏆 **richest players**\n\n${lines.join("\n")}`
    );
  }

  if (command === "deposit") {
    const amount =
      interaction.options.getInteger("amount");

    const data =
      getUser(interaction.user.id);

    if (data.coins < amount) {
      return replyEphemeral(
        interaction,
        "❌ you don't have that much."
      );
    }

    data.coins -= amount;
    data.bank += amount;

    saveJSON(ECONOMY_FILE, economy);

    return interaction.reply(
      `🏦 deposited **${money(amount)} coins**.`
    );
  }

  if (command === "withdraw") {
    const amount =
      interaction.options.getInteger("amount");

    const data =
      getUser(interaction.user.id);

    if (data.bank < amount) {
      return replyEphemeral(
        interaction,
        "❌ you don't have that much in your bank."
      );
    }

    data.bank -= amount;
    data.coins += amount;

    saveJSON(ECONOMY_FILE, economy);

    return interaction.reply(
      `🏦 withdrew **${money(amount)} coins**.`
    );
  }

  // ====================================================
  // CASINO
  // ====================================================

  if (
    command === "gamble" ||
    command === "slots" ||
    command === "dicebet"
  ) {
    const amount =
      interaction.options.getInteger("amount");

    const data =
      getUser(interaction.user.id);

    if (data.coins < amount) {
      return replyEphemeral(
        interaction,
        "❌ you don't have enough coins."
      );
    }

    // ---------------- GAMBLE ----------------

    if (command === "gamble") {
      if (Math.random() < 0.5) {
        data.coins += amount;
        data.wins++;

        saveJSON(ECONOMY_FILE, economy);

        return interaction.reply(
          `🎰 **YOU WON**\n\n+${money(amount)} coins`
        );
      }

      data.coins -= amount;
      data.losses++;

      saveJSON(ECONOMY_FILE, economy);

      return interaction.reply(
        `🎰 **you lost** 😭\n\n-${money(amount)} coins`
      );
    }

    // ---------------- SLOTS ----------------

    if (command === "slots") {
      const symbols = [
        "🍒",
        "🍋",
        "🍊",
        "🍉",
        "⭐",
        "💎"
      ];

      const a =
        symbols[Math.floor(Math.random() * symbols.length)];

      const b =
        symbols[Math.floor(Math.random() * symbols.length)];

      const c =
        symbols[Math.floor(Math.random() * symbols.length)];

      let winnings = 0;

      if (a === b && b === c) {
        winnings = amount * 5;
        data.coins += winnings;
        data.wins++;
      } else if (a === b || b === c || a === c) {
        winnings = amount * 2;
        data.coins += winnings;
        data.wins++;
      } else {
        data.coins -= amount;
        data.losses++;
      }

      saveJSON(ECONOMY_FILE, economy);

      if (winnings) {
        return interaction.reply(
          `🎰 **${a} | ${b} | ${c}**\n\n` +
          `🔥 you won **${money(winnings)} coins**!`
        );
      }

      return interaction.reply(
        `🎰 **${a} | ${b} | ${c}**\n\n` +
        `😭 you lost **${money(amount)} coins**.`
      );
    }

    // ---------------- DICE BET ----------------

    if (command === "dicebet") {
      const roll =
        Math.floor(Math.random() * 6) + 1;

      if (roll >= 4) {
        data.coins += amount;
        data.wins++;

        saveJSON(ECONOMY_FILE, economy);

        return interaction.reply(
          `🎲 rolled **${roll}** — you won **${money(amount)} coins**!`
        );
      }

      data.coins -= amount;
      data.losses++;

      saveJSON(ECONOMY_FILE, economy);

      return interaction.reply(
        `🎲 rolled **${roll}** — you lost **${money(amount)} coins** 😭`
      );
    }
  }

  // ====================================================
  // PETS
  // ====================================================

  if (command === "pets") {
    const data =
      getUser(interaction.user.id);

    if (!data.pets.length) {
      return interaction.reply(
        "🐾 you don't have any pets yet.\nuse `/pet` after catching an animal."
      );
    }

    const text = data.pets
      .map(
        (pet, index) =>
          `**${index + 1}.** ${pet.emoji} **${pet.name}** — ${pet.rarity}`
      )
      .join("\n");

    return interaction.reply(
      `🐾 **your pets**\n\n${text}`
    );
  }

  if (command === "pet") {
    const animalName =
      interaction.options
        .getString("animal")
        .toLowerCase();

    const data =
      getUser(interaction.user.id);

    const animal =
      animals.find(a => a.name === animalName);

    if (!animal) {
      return replyEphemeral(
        interaction,
        "❌ i don't know that animal."
      );
    }

    if (!data.animals[animal.name]) {
      return replyEphemeral(
        interaction,
        `❌ you haven't caught a ${animal.name}.`
      );
    }

    data.animals[animal.name]--;

    data.pets.push({
      name: animal.name,
      emoji: animal.emoji,
      rarity: animal.rarity,
      hunger: 100,
      happiness: 100
    });

    saveJSON(ECONOMY_FILE, economy);

    return interaction.reply(
      `${animal.emoji} your **${animal.name}** is now your pet!`
    );
  }

  if (command === "feed") {
    const number =
      interaction.options.getInteger("number");

    const data =
      getUser(interaction.user.id);

    const pet = data.pets[number - 1];

    if (!pet) {
      return replyEphemeral(
        interaction,
        "❌ that pet doesn't exist."
      );
    }

    pet.hunger = Math.min(
      100,
      pet.hunger + 25
    );

    saveJSON(ECONOMY_FILE, economy);

    return interaction.reply(
      `${pet.emoji} you fed **${pet.name}** 🍖`
    );
  }

  if (command === "play") {
    const number =
      interaction.options.getInteger("number");

    const data =
      getUser(interaction.user.id);

    const pet = data.pets[number - 1];

    if (!pet) {
      return replyEphemeral(
        interaction,
        "❌ that pet doesn't exist."
      );
    }

    pet.happiness = Math.min(
      100,
      pet.happiness + 25
    );

    saveJSON(ECONOMY_FILE, economy);

    return interaction.reply(
      `${pet.emoji} you played with **${pet.name}** 🎾`
    );
  }

  // ====================================================
  // INVENTORY
  // ====================================================

  if (command === "inventory") {
    const data =
      getUser(interaction.user.id);

    if (!data.inventory.length) {
      return interaction.reply(
        "🎒 your inventory is empty."
      );
    }

    return interaction.reply(
      `🎒 **inventory**\n\n${data.inventory.join("\n")}`
    );
  }

  if (command === "shop") {
    return interaction.reply(
      `🛒 **shop**\n\n` +
      `🍖 pet food — 100 coins\n` +
      `🎾 pet toy — 250 coins\n\n` +
      `more items coming soon 👀`
    );
  }

  // ====================================================
  // SERVER PANELS
  // ====================================================

  if (command === "verify-panel") {
    if (!requireLevel(interaction, "owner")) {
      return replyEphemeral(
        interaction,
        "❌ owner only."
      );
    }

    const row =
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("verify")
          .setLabel("verify")
          .setEmoji("✅")
          .setStyle(ButtonStyle.Success)
      );

    await interaction.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("✅ verification")
          .setDescription(
            "click the button below to verify yourself."
          )
      ],
      components: [row]
    });

    return replyEphemeral(
      interaction,
      "✅ verification panel sent."
    );
  }

  if (command === "ticket-panel") {
    if (!requireLevel(interaction, "owner")) {
      return replyEphemeral(
        interaction,
        "❌ owner only."
      );
    }

    const row =
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("create_ticket")
          .setLabel("open ticket")
          .setEmoji("🎫")
          .setStyle(ButtonStyle.Primary)
      );

    await interaction.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("🎫 support")
          .setDescription(
            "need help?\n\nclick below to open a private ticket."
          )
      ],
      components: [row]
    });

    return replyEphemeral(
      interaction,
      "✅ ticket panel sent."
    );
  }

  if (command === "mod-panel") {
    if (!requireLevel(interaction, "owner")) {
      return replyEphemeral(
        interaction,
        "❌ owner only."
      );
    }

    const row =
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("moderator_apply")
          .setLabel("apply")
          .setEmoji("🛡️")
          .setStyle(ButtonStyle.Primary)
      );

    await interaction.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("🛡️ moderator applications")
          .setDescription(
            "think you have what it takes?\n\nclick below to apply."
          )
      ],
      components: [row]
    });

    return replyEphemeral(
      interaction,
      "✅ moderator panel sent."
    );
  }

  if (command === "rules") {
    if (!requireLevel(interaction, "owner")) {
      return replyEphemeral(
        interaction,
        "❌ owner only."
      );
    }

    await interaction.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("📜 rules")
          .setDescription(
            "`1.` be respectful\n" +
            "`2.` no spam\n" +
            "`3.` no harassment\n" +
            "`4.` no cheating/scamming\n" +
            "`5.` keep things appropriate\n" +
            "`6.` listen to staff\n" +
            "`7.` don't abuse exploits\n" +
            "`8.` have fun 😭"
          )
      ]
    });

    return replyEphemeral(
      interaction,
      "✅ rules sent."
    );
  }

  if (command === "announce") {
    if (!requireLevel(interaction, "owner")) {
      return replyEphemeral(
        interaction,
        "❌ owner only."
      );
    }

    const message =
      interaction.options.getString("message");

    await interaction.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("📢 announcement")
          .setDescription(message)
          .setTimestamp()
      ]
    });

    return replyEphemeral(
      interaction,
      "✅ announcement sent."
    );
  }

  if (command === "say") {
    if (!requireLevel(interaction, "owner")) {
      return replyEphemeral(
        interaction,
        "❌ owner only."
      );
    }

    const message =
      interaction.options.getString("message");

    await interaction.channel.send(message);

    return replyEphemeral(
      interaction,
      "✅ sent."
    );
  }

  // ====================================================
  // MANAGEMENT
  // ====================================================

  if (command === "addrole") {
    if (!requireLevel(interaction, "owner")) {
      return replyEphemeral(
        interaction,
        "❌ owner only."
      );
    }

    const name =
      interaction.options.getString("name");

    try {
      const role =
        await interaction.guild.roles.create({
          name,
          reason: `Created by ${interaction.user.tag}`
        });

      return interaction.reply(
        `✅ created ${role}`
      );
    } catch {
      return replyEphemeral(
        interaction,
        "❌ couldn't create the role."
      );
    }
  }

  if (command === "removerole") {
    if (!requireLevel(interaction, "owner")) {
      return replyEphemeral(
        interaction,
        "❌ owner only."
      );
    }

    const role =
      interaction.options.getRole("role");

    try {
      await role.delete(
        `Deleted by ${interaction.user.tag}`
      );

      return interaction.reply(
        `🗑️ deleted **${role.name}**.`
      );
    } catch {
      return replyEphemeral(
        interaction,
        "❌ couldn't delete that role."
      );
    }
  }

  if (command === "role") {
    if (!requireLevel(interaction, "owner")) {
      return replyEphemeral(
        interaction,
        "❌ owner only."
      );
    }

    const user =
      interaction.options.getUser("user");

    const role =
      interaction.options.getRole("role");

    const action =
      interaction.options.getString("action");

    const member =
      await interaction.guild.members
        .fetch(user.id)
        .catch(() => null);

    if (!member) {
      return replyEphemeral(
        interaction,
        "❌ member not found."
      );
    }

    try {
      if (action === "give") {
        await member.roles.add(role);

        return interaction.reply(
          `✅ gave ${role} to ${user}.`
        );
      }

      await member.roles.remove(role);

      return interaction.reply(
        `✅ removed ${role} from ${user}.`
      );
    } catch {
      return replyEphemeral(
        interaction,
        "❌ couldn't modify that role."
      );
    }
  }

  if (command === "nick") {
    if (!requireLevel(interaction, "owner")) {
      return replyEphemeral(
        interaction,
        "❌ owner only."
      );
    }

    const user =
      interaction.options.getUser("user");

    const nickname =
      interaction.options.getString("nickname");

    const member =
      await interaction.guild.members
        .fetch(user.id)
        .catch(() => null);

    if (!member) {
      return replyEphemeral(
        interaction,
        "❌ member not found."
      );
    }

    try {
      await member.setNickname(nickname);

      return interaction.reply(
        `✅ nickname changed for ${user}.`
      );
    } catch {
      return replyEphemeral(
        interaction,
        "❌ couldn't change their nickname."
      );
    }
  }

  // ====================================================
  // BACKUP
  // ====================================================

  if (command === "save-backup") {
    if (!requireLevel(interaction, "owner")) {
      return replyEphemeral(
        interaction,
        "❌ owner only."
      );
    }

    await interaction.deferReply({
      ephemeral: true
    });

    try {
      await saveServerBackup(
        interaction.guild
      );

      return interaction.editReply(
        "✅ server backup saved exactly as it is right now."
      );
    } catch (error) {
      console.error("Backup save error:", error);

      return interaction.editReply(
        "❌ couldn't save the backup."
      );
    }
  }

  if (command === "backup") {
    if (!requireLevel(interaction, "owner")) {
      return replyEphemeral(
        interaction,
        "❌ owner only."
      );
    }

    if (!backup) {
      return replyEphemeral(
        interaction,
        "❌ there isn't a saved backup yet."
      );
    }

    await interaction.deferReply({
      ephemeral: true
    });

    try {
      await restoreServerBackup(
        interaction.guild
      );

      return interaction.editReply(
        "✅ backup restored."
      );
    } catch (error) {
      console.error("Backup restore error:", error);

      return interaction.editReply(
        "❌ backup restore failed."
      );
    }
  }
});

// ======================================================
// ERROR HANDLING
// ======================================================

process.on("unhandledRejection", error => {
  console.error("Unhandled rejection:", error);
});

process.on("uncaughtException", error => {
  console.error("Uncaught exception:", error);
});

// ======================================================
// LOGIN
// ======================================================

client.login(TOKEN);