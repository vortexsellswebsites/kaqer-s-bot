const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder,
  SlashCommandBuilder,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const TOKEN = process.env.TOKEN;

if (!TOKEN) {
  throw new Error("TOKEN variable is missing.");
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ]
});

/* =========================
   DATA
========================= */

const DATA = path.join(__dirname, "data");

if (!fs.existsSync(DATA)) {
  fs.mkdirSync(DATA);
}

function load(name, fallback) {
  const file = path.join(DATA, name);

  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    fs.writeFileSync(
      file,
      JSON.stringify(fallback, null, 2)
    );

    return fallback;
  }
}

function save(name, data) {
  fs.writeFileSync(
    path.join(DATA, name),
    JSON.stringify(data, null, 2)
  );
}

const profiles = load("profiles.json", {});
const warnings = load("warnings.json", {});
const settings = load("settings.json", {});
const confessions = load("confessions.json", {});
const suggestions = load("suggestions.json", {});
const starboard = load("starboard.json", {});

/* =========================
   ROLES
   YOU CREATE THESE YOURSELF
========================= */

const STAFF_ROLES = [
  "👑・owner",
  "⚡・admin",
  "🛡️・mod",
  "🔨・staff"
];

const SELF_ROLES = [
  "🌸・booster",
  "💎・vip",
  "🎀・friend",
  "💜・partner",
  "💫・supporter",
  "🫶・trusted",
  "⭐・active",
  "🕰️・og",

  "♀・woman",
  "♂・man",
  "♡・they/them",
  "♡・she/her",
  "♡・he/him",
  "🧸・minor",
  "🔞・adult",
  "💔・single",
  "💞・taken"
];

const LEVEL_ROLES = [
  "୨୧・level 5",
  "୨୧・level 10",
  "୨୧・level 20",
  "୨୧・level 30",
  "୨୧・level 50"
];

/* =========================
   CHANNELS
========================= */

const CHANNELS = {
  "001": [
    ["୨୧・rules", true],
    ["୨୧・announcements", true],
    ["୨୧・boosts", true],
    ["୨୧・roles", true],
    ["୨୧・partnerships", true],
    ["୨୧・server-info", true]
  ],

  "002": [
    ["୨୧・chat", false],
    ["୨୧・introductions", false],
    ["୨୧・media", false],
    ["୨୧・memes", false],
    ["୨୧・games", false],
    ["୨୧・bots", false],
    ["୨୧・suggestions", true],
    ["୨୧・confessions", true]
  ],

  "003": [
    ["୨୧・levels", true],
    ["୨୧・starboard", true],
    ["୨୧・support", true]
  ]
};

/* =========================
   HELPERS
========================= */

function profile(id) {
  if (!profiles[id]) {
    profiles[id] = {
      xp: 0,
      level: 0,
      lastXP: 0,
      bio: "",
      friends: []
    };
  }

  return profiles[id];
}

function needed(level) {
  return 100 + level * 50;
}

function hasRole(member, roleNames) {
  return member.roles.cache.some(
    role => roleNames.includes(role.name)
  );
}

function isOwner(member) {
  return member.guild.ownerId === member.id;
}

function isAdmin(member) {
  return (
    isOwner(member) ||
    hasRole(member, ["⚡・admin"])
  );
}

function isModerator(member) {
  return (
    isAdmin(member) ||
    hasRole(member, ["🛡️・mod"])
  );
}

function isStaff(member) {
  return (
    isModerator(member) ||
    hasRole(member, ["🔨・staff"])
  );
}

async function getRole(guild, name) {
  return guild.roles.cache.find(
    role => role.name === name
  );
}

async function getChannel(guild, name) {
  return guild.channels.cache.find(
    channel =>
      channel.type === ChannelType.GuildText &&
      channel.name === name
  );
}

/* =========================
   CHANNEL PERMISSIONS
========================= */

async function lockChannel(channel) {
  await channel.permissionOverwrites.edit(
    channel.guild.roles.everyone,
    {
      SendMessages: false,
      AddReactions: false,
      CreatePublicThreads: false,
      CreatePrivateThreads: false
    }
  ).catch(() => {});
}

async function unlockChannel(channel) {
  await channel.permissionOverwrites.edit(
    channel.guild.roles.everyone,
    {
      SendMessages: true,
      AddReactions: true,
      CreatePublicThreads: true,
      CreatePrivateThreads: true
    }
  ).catch(() => {});
}

/* =========================
   DELETE EVERYTHING
========================= */

async function deleteAllChannels(guild) {
  const channels = [...guild.channels.cache.values()];

  for (const channel of channels) {
    await channel.delete(
      "Complete server rebuild"
    ).catch(() => {});
  }
}

async function deleteAllRoles(guild) {
  const roles = [...guild.roles.cache.values()];

  for (const role of roles) {
    if (role.id === guild.id) continue;
    if (role.managed) continue;

    await role.delete(
      "Complete server rebuild"
    ).catch(() => {});
  }
}

/* =========================
   CREATE CHANNELS
========================= */

async function createCategory(guild, name) {
  return guild.channels.create({
    name,
    type: ChannelType.GuildCategory
  });
}

async function createChannel(
  guild,
  category,
  name,
  locked
) {
  const channel = await guild.channels.create({
    name,
    type: ChannelType.GuildText,
    parent: category.id
  });

  if (locked) {
    await lockChannel(channel);
  } else {
    await unlockChannel(channel);
  }

  return channel;
}

/* =========================
   PANELS
========================= */

async function sendPanel(
  channel,
  title,
  description
) {
  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setTimestamp()
    ]
  }).catch(() => {});
}

/* =========================
   RULES
========================= */

async function sendRules(channel) {
  await sendPanel(
    channel,
    "୨୧・rules",
`♡ **server rules**

**01** — respect everyone.

**02** — no harassment, bullying, or serious drama.

**03** — no spam or flooding.

**04** — no NSFW or inappropriate content.

**05** — no unwanted advertising.

**06** — don't abuse bots or exploits.

**07** — don't impersonate members or staff.

**08** — listen to staff decisions.

**09** — use the correct channels.

**10** — follow Discord's Terms of Service and Community Guidelines.

have fun & don't be weird ♡`
  );
}

/* =========================
   ROLE PANEL
========================= */

async function sendRolePanel(channel) {
  const rows = [];

  for (let i = 0; i < SELF_ROLES.length; i += 5) {
    const row = new ActionRowBuilder();

    for (const roleName of SELF_ROLES.slice(i, i + 5)) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(
            `selfrole:${roleName}`
          )
          .setLabel(roleName)
          .setStyle(ButtonStyle.Secondary)
      );
    }

    rows.push(row);
  }

  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("୨୧・roles")
        .setDescription(
`pick the roles you want ♡

click once to add.
click again to remove.

**server**
🌸・booster
💎・vip
🎀・friend
💜・partner
💫・supporter
🫶・trusted
⭐・active
🕰️・og

**self**
♀・woman
♂・man
♡・they/them
♡・she/her
♡・he/him
🧸・minor
🔞・adult
💔・single
💞・taken

if a role isn't available, it hasn't been created yet.`
        )
    ],
    components: rows
  }).catch(() => {});
}

/* =========================
   BOOSTS
========================= */

async function updateBoostPanel(guild) {
  const channel =
    await getChannel(
      guild,
      "୨୧・boosts"
    );

  if (!channel) return;

  const boosts =
    guild.premiumSubscriptionCount || 0;

  const tier =
    guild.premiumTier || 0;

  const boosters =
    guild.members.cache.filter(
      member => member.premiumSince
    ).size;

  const messages =
    await channel.messages.fetch({
      limit: 20
    }).catch(() => null);

  const old =
    messages?.find(
      message =>
        message.author.id === client.user.id
    );

  const embed =
    new EmbedBuilder()
      .setTitle("୨୧・boosts")
      .setDescription(
`╭──────────────୨୧

**boosts:** ${boosts}
**server level:** ${tier}
**boosters:** ${boosters}

thank you for supporting the server ♡

╰──────────────୨୧`
      )
      .setTimestamp();

  if (old) {
    await old.edit({
      embeds: [embed]
    }).catch(() => {});
  } else {
    await channel.send({
      embeds: [embed]
    }).catch(() => {});
  }
}

/* =========================
   SERVER INFO
========================= */

async function updateServerInfo(guild) {
  const channel =
    await getChannel(
      guild,
      "୨୧・server-info"
    );

  if (!channel) return;

  const members =
    guild.memberCount;

  const bots =
    guild.members.cache.filter(
      member => member.user.bot
    ).size;

  const humans =
    members - bots;

  const messages =
    await channel.messages.fetch({
      limit: 20
    }).catch(() => null);

  const old =
    messages?.find(
      message =>
        message.author.id === client.user.id
    );

  const embed =
    new EmbedBuilder()
      .setTitle("୨୧・server info")
      .setDescription(
`♡ **${guild.name}**

**members:** ${members}
**humans:** ${humans}
**bots:** ${bots}
**channels:** ${guild.channels.cache.size}
**created:** <t:${Math.floor(
          guild.createdTimestamp / 1000
        )}:D>

**owner:** <@${guild.ownerId}>

bot: **${client.user.username}**`
      )
      .setTimestamp();

  if (old) {
    await old.edit({
      embeds: [embed]
    }).catch(() => {});
  } else {
    await channel.send({
      embeds: [embed]
    }).catch(() => {});
  }
}

/* =========================
   PARTNERSHIPS
========================= */

async function sendPartnershipPanel(channel) {
  const row =
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("partnership_apply")
        .setLabel("Apply for Partnership")
        .setStyle(ButtonStyle.Secondary)
    );

  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("୨୧・partnerships")
        .setDescription(
`♡ **server partnerships**

want to partner with us?

click the button below and fill out the application.

staff will review it privately.`
        )
    ],
    components: [row]
  }).catch(() => {});
}

/* =========================
   SUPPORT
========================= */

async function sendSupportPanel(channel) {
  const row =
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("support_create")
        .setLabel("Open Support Ticket")
        .setStyle(ButtonStyle.Secondary)
    );

  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("୨୧・support")
        .setDescription(
`need help?

click below to open a private support ticket.

your ticket will only be visible to you and staff.`
        )
    ],
    components: [row]
  }).catch(() => {});
}

/* =========================
   CONFESSIONS
========================= */

async function sendConfessionPanel(channel) {
  const row =
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("confession_create")
        .setLabel("Send Confession")
        .setStyle(ButtonStyle.Secondary)
    );

  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("୨୧・confessions")
        .setDescription(
`♡ **anonymous confessions**

want to say something without attaching your name?

click below and send it anonymously.`
        )
    ],
    components: [row]
  }).catch(() => {});
}

/* =========================
   SUGGESTIONS
========================= */

async function sendSuggestionPanel(channel) {
  const row =
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("suggestion_create")
        .setLabel("Make a Suggestion")
        .setStyle(ButtonStyle.Secondary)
    );

  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("୨୧・suggestions")
        .setDescription(
`have an idea for the server?

click below and send it.

staff can review suggestions and members can react to them.`
        )
    ],
    components: [row]
  }).catch(() => {});
}

/* =========================
   LEVELS
========================= */

async function sendLevelPanel(channel) {
  await sendPanel(
    channel,
    "୨୧・levels",
`♡ **level system**

talk in the server to earn XP.

you can earn XP once every minute.

**commands**

\`/rank\`
\`/leaderboard\`
\`/profile\`

**level rewards**

୨୧・level 5
୨୧・level 10
୨୧・level 20
୨୧・level 30
୨୧・level 50`
  );
}

async function updateLevelRoles(member) {
  const p = profile(member.id);

  for (const roleName of LEVEL_ROLES) {
    const level =
      parseInt(
        roleName.match(/\d+/)?.[0] || "0"
      );

    const role =
      await getRole(
        member.guild,
        roleName
      );

    if (!role) continue;

    if (
      p.level >= level &&
      !member.roles.cache.has(role.id)
    ) {
      await member.roles.add(role)
        .catch(() => {});
    }
  }
}

/* =========================
   STARBOARD
========================= */

async function sendStarboardPanel(channel) {
  await sendPanel(
    channel,
    "୨୧・starboard",
    "messages that reach **3 ⭐ reactions** get featured here."
  );
}

/* =========================
   GAMES
========================= */

async function sendGamePanel(channel) {
  await sendPanel(
    channel,
    "୨୧・games",
`♡ **games**

\`/coinflip\`
\`/roll\`
\`/8ball\`
\`/rps\`
\`/wouldyourather\`
\`/trivia\`

have fun ♡`
  );
}

/* =========================
   BOT COMMANDS PANEL
========================= */

async function sendBotPanel(channel) {
  await sendPanel(
    channel,
    "୨୧・bots",
`**social**

\`/profile\`
\`/setbio\`
\`/rank\`
\`/leaderboard\`
\`/friend\`
\`/friends\`

**games**

\`/coinflip\`
\`/roll\`
\`/8ball\`
\`/rps\`
\`/wouldyourather\`
\`/trivia\`

**server**

\`/suggest\`
\`/confess\`

**staff**

\`/warn\`
\`/warnings\`
\`/clear\`
\`/kick\`
\`/timeout\`

**owner**

\`/ban\`
\`/resetserver\``
  );
}

/* =========================
   RESET SERVER
========================= */

async function resetServer(guild) {
  await deleteAllChannels(guild);

  await deleteAllRoles(guild);

  for (const categoryName of Object.keys(CHANNELS)) {
    const category =
      await createCategory(
        guild,
        categoryName
      );

    for (
      const [name, locked]
      of CHANNELS[categoryName]
    ) {
      const channel =
        await createChannel(
          guild,
          category,
          name,
          locked
        );

      if (name === "୨୧・rules") {
        await sendRules(channel);
      }

      if (name === "୨୧・announcements") {
        await sendPanel(
          channel,
          "୨୧・announcements",
          "important server updates will be posted here ♡"
        );
      }

      if (name === "୨୧・boosts") {
        await updateBoostPanel(guild);
      }

      if (name === "୨୧・roles") {
        await sendRolePanel(channel);
      }

      if (name === "୨୧・partnerships") {
        await sendPartnershipPanel(channel);
      }

      if (name === "୨୧・server-info") {
        await updateServerInfo(guild);
      }

      if (name === "୨୧・games") {
        await sendGamePanel(channel);
      }

      if (name === "୨୧・bots") {
        await sendBotPanel(channel);
      }

      if (name === "୨୧・suggestions") {
        await sendSuggestionPanel(channel);
      }

      if (name === "୨୧・confessions") {
        await sendConfessionPanel(channel);
      }

      if (name === "୨୧・levels") {
        await sendLevelPanel(channel);
      }

      if (name === "୨୧・starboard") {
        await sendStarboardPanel(channel);
      }

      if (name === "୨୧・support") {
        await sendSupportPanel(channel);
      }
    }
  }

  const levels =
    await getChannel(
      guild,
      "୨୧・levels"
    );

  const starboardChannel =
    await getChannel(
      guild,
      "୨୧・starboard"
    );

  const boosts =
    await getChannel(
      guild,
      "୨୧・boosts"
    );

  settings[guild.id] = {
    levelChannel:
      levels?.id || null,

    starboardChannel:
      starboardChannel?.id || null,

    boostChannel:
      boosts?.id || null
  };

  save(
    "settings.json",
    settings
  );

  await updateBoostPanel(guild);
  await updateServerInfo(guild);
}

/* =========================
   COMMANDS
========================= */

const commands = [

  new SlashCommandBuilder()
    .setName("resetserver")
    .setDescription(
      "Delete and rebuild the entire server"
    ),

  new SlashCommandBuilder()
    .setName("rank")
    .setDescription(
      "View your level"
    ),

  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription(
      "View the XP leaderboard"
    ),

  new SlashCommandBuilder()
    .setName("profile")
    .setDescription(
      "View a profile"
    )
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("User")
    ),

  new SlashCommandBuilder()
    .setName("setbio")
    .setDescription(
      "Set your bio"
    )
    .addStringOption(option =>
      option
        .setName("text")
        .setDescription("Bio")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("friend")
    .setDescription(
      "Add a friend"
    )
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("User")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("friends")
    .setDescription(
      "View your friends"
    ),

  new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription(
      "Flip a coin"
    ),

  new SlashCommandBuilder()
    .setName("roll")
    .setDescription(
      "Roll a dice"
    ),

  new SlashCommandBuilder()
    .setName("8ball")
    .setDescription(
      "Ask the magic 8ball"
    )
    .addStringOption(option =>
      option
        .setName("question")
        .setDescription("Question")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("rps")
    .setDescription(
      "Play rock paper scissors"
    )
    .addStringOption(option =>
      option
        .setName("choice")
        .setDescription("Choice")
        .setRequired(true)
        .addChoices(
          {
            name: "rock",
            value: "rock"
          },
          {
            name: "paper",
            value: "paper"
          },
          {
            name: "scissors",
            value: "scissors"
          }
        )
    ),

  new SlashCommandBuilder()
    .setName("wouldyourather")
    .setDescription(
      "Get a random question"
    ),

  new SlashCommandBuilder()
    .setName("trivia")
    .setDescription(
      "Get a trivia question"
    ),

  new SlashCommandBuilder()
    .setName("confess")
    .setDescription(
      "Send an anonymous confession"
    )
    .addStringOption(option =>
      option
        .setName("message")
        .setDescription("Confession")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("suggest")
    .setDescription(
      "Send a server suggestion"
    )
    .addStringOption(option =>
      option
        .setName("message")
        .setDescription("Suggestion")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("ping")
    .setDescription(
      "Check bot latency"
    ),

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription(
      "Ban a member"
    )
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Member")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription(
      "Kick a member"
    )
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Member")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("timeout")
    .setDescription(
      "Timeout a member"
    )
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Member")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName("minutes")
        .setDescription("Minutes")
        .setMinValue(1)
        .setMaxValue(40320)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("warn")
    .setDescription(
      "Warn a member"
    )
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Member")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("reason")
        .setDescription("Reason")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("warnings")
    .setDescription(
      "View warnings"
    )
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Member")
    ),

  new SlashCommandBuilder()
    .setName("clear")
    .setDescription(
      "Delete messages"
    )
    .addIntegerOption(option =>
      option
        .setName("amount")
        .setDescription("Amount")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    )

].map(command => command.toJSON());

/* =========================
   READY
========================= */

client.once(
  "clientReady",
  async () => {
    console.log(
      `♡ ${client.user.tag} is online`
    );

    try {
      await client.application.commands.set(
        commands
      );

      console.log(
        "♡ Commands registered"
      );
    } catch (error) {
      console.error(
        "Command registration error:",
        error
      );
    }

    for (
      const guild
      of client.guilds.cache.values()
    ) {
      await updateBoostPanel(guild)
        .catch(() => {});

      await updateServerInfo(guild)
        .catch(() => {});
    }
  }
);

/* =========================
   BUTTONS
========================= */

client.on(
  "interactionCreate",
  async interaction => {

    try {

      if (interaction.isButton()) {

        /* SELF ROLES */

        if (
          interaction.customId
            .startsWith("selfrole:")
        ) {

          const roleName =
            interaction.customId.slice(9);

          const role =
            await getRole(
              interaction.guild,
              roleName
            );

          if (!role) {
            return interaction.reply({
              content:
                `Create the role **${roleName}** first.`,
              flags:
                MessageFlags.Ephemeral
            });
          }

          if (
            interaction.member.roles.cache
              .has(role.id)
          ) {

            await interaction.member.roles
              .remove(role)
              .catch(() => {});

            return interaction.reply({
              content:
                `Removed **${roleName}**.`,
              flags:
                MessageFlags.Ephemeral
            });
          }

          await interaction.member.roles
            .add(role)
            .catch(() => {});

          return interaction.reply({
            content:
              `Added **${roleName}**.`,
            flags:
              MessageFlags.Ephemeral
          });
        }

        /* CONFESSION */

        if (
          interaction.customId ===
          "confession_create"
        ) {

          const modal =
            new ModalBuilder()
              .setCustomId(
                "confession_modal"
              )
              .setTitle(
                "Anonymous Confession"
              );

          const input =
            new TextInputBuilder()
              .setCustomId(
                "confession_text"
              )
              .setLabel(
                "Your confession"
              )
              .setStyle(
                TextInputStyle.Paragraph
              )
              .setRequired(true)
              .setMaxLength(1000);

          modal.addComponents(
            new ActionRowBuilder()
              .addComponents(input)
          );

          return interaction.showModal(
            modal
          );
        }

        /* SUGGESTION */

        if (
          interaction.customId ===
          "suggestion_create"
        ) {

          const modal =
            new ModalBuilder()
              .setCustomId(
                "suggestion_modal"
              )
              .setTitle(
                "Server Suggestion"
              );

          const input =
            new TextInputBuilder()
              .setCustomId(
                "suggestion_text"
              )
              .setLabel(
                "Your suggestion"
              )
              .setStyle(
                TextInputStyle.Paragraph
              )
              .setRequired(true)
              .setMaxLength(1000);

          modal.addComponents(
            new ActionRowBuilder()
              .addComponents(input)
          );

          return interaction.showModal(
            modal
          );
        }

        /* PARTNERSHIP */

        if (
          interaction.customId ===
          "partnership_apply"
        ) {

          const modal =
            new ModalBuilder()
              .setCustomId(
                "partnership_modal"
              )
              .setTitle(
                "Partnership Application"
              );

          const server =
            new TextInputBuilder()
              .setCustomId(
                "server"
              )
              .setLabel(
                "Server name"
              )
              .setStyle(
                TextInputStyle.Short
              )
              .setRequired(true)
              .setMaxLength(100);

          const invite =
            new TextInputBuilder()
              .setCustomId(
                "invite"
              )
              .setLabel(
                "Server invite"
              )
              .setStyle(
                TextInputStyle.Short
              )
              .setRequired(true)
              .setMaxLength(200);

          const description =
            new TextInputBuilder()
              .setCustomId(
                "description"
              )
              .setLabel(
                "Tell us about the server"
              )
              .setStyle(
                TextInputStyle.Paragraph
              )
              .setRequired(true)
              .setMaxLength(1000);

          modal.addComponents(
            new ActionRowBuilder()
              .addComponents(server),

            new ActionRowBuilder()
              .addComponents(invite),

            new ActionRowBuilder()
              .addComponents(description)
          );

          return interaction.showModal(
            modal
          );
        }

        /* SUPPORT */

        if (
          interaction.customId ===
          "support_create"
        ) {

          const guild =
            interaction.guild;

          const existing =
            guild.channels.cache.find(
              channel =>
                channel.name ===
                `ticket-${interaction.user.id}`
            );

          if (existing) {
            return interaction.reply({
              content:
                `You already have a ticket: ${existing}`,
              flags:
                MessageFlags.Ephemeral
            });
          }

          const overwrites = [
            {
              id:
                guild.roles.everyone.id,

              deny: [
                PermissionsBitField.Flags
                  .ViewChannel
              ]
            },

            {
              id:
                interaction.user.id,

              allow: [
                PermissionsBitField.Flags
                  .ViewChannel,

                PermissionsBitField.Flags
                  .SendMessages,

                PermissionsBitField.Flags
                  .ReadMessageHistory
              ]
            },

            {
              id:
                client.user.id,

              allow: [
                PermissionsBitField.Flags
                  .ViewChannel,

                PermissionsBitField.Flags
                  .SendMessages,

                PermissionsBitField.Flags
                  .ManageChannels,

                PermissionsBitField.Flags
                  .ReadMessageHistory
              ]
            }
          ];

          for (
            const roleName
            of STAFF_ROLES
          ) {

            const role =
              await getRole(
                guild,
                roleName
              );

            if (!role) continue;

            overwrites.push({
              id: role.id,

              allow: [
                PermissionsBitField.Flags
                  .ViewChannel,

                PermissionsBitField.Flags
                  .SendMessages,

                PermissionsBitField.Flags
                  .ReadMessageHistory
              ]
            });
          }

          const channel =
            await guild.channels.create({
              name:
                `ticket-${interaction.user.id}`,

              type:
                ChannelType.GuildText,

              topic:
                `ticket-owner:${interaction.user.id}`,

              permissionOverwrites:
                overwrites
            });

          const closeRow =
            new ActionRowBuilder()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId(
                    "close_ticket"
                  )
                  .setLabel(
                    "Close Ticket"
                  )
                  .setStyle(
                    ButtonStyle.Danger
                  )
              );

          await channel.send({
            embeds: [
              new EmbedBuilder()
                .setTitle(
                  "୨୧・support ticket"
                )
                .setDescription(
`welcome ${interaction.user} ♡

tell us what you need help with.

a staff member will respond when available.

press **Close Ticket** when finished.`
                )
                .setTimestamp()
            ],

            components: [
              closeRow
            ]
          });

          return interaction.reply({
            content:
              `Ticket created: ${channel}`,
            flags:
              MessageFlags.Ephemeral
          });
        }

        /* CLOSE TICKET */

        if (
          interaction.customId ===
          "close_ticket"
        ) {

          const channel =
            interaction.channel;

          const member =
            interaction.member;

          const ownerId =
            channel.topic
              ?.startsWith(
                "ticket-owner:"
              )
              ? channel.topic.split(":")[1]
              : null;

          if (
            !isStaff(member) &&
            ownerId !== interaction.user.id
          ) {
            return interaction.reply({
              content:
                "You can't close this ticket.",
              flags:
                MessageFlags.Ephemeral
            });
          }

          await interaction.reply({
            content:
              "🔒 Closing ticket..."
          });

          setTimeout(() => {
            channel.delete(
              "Support ticket closed"
            ).catch(() => {});
          }, 1500);

          return;
        }

        return;
      }

      /* =========================
         MODALS
      ========================= */

      if (interaction.isModalSubmit()) {

        /* CONFESSION */

        if (
          interaction.customId ===
          "confession_modal"
        ) {

          const message =
            interaction.fields
              .getTextInputValue(
                "confession_text"
              );

          const channel =
            await getChannel(
              interaction.guild,
              "୨୧・confessions"
            );

          if (!channel) {
            return interaction.reply({
              content:
                "The confession channel doesn't exist.",
              flags:
                MessageFlags.Ephemeral
            });
          }

          const id =
            (confessions[
              interaction.guild.id
            ] || 0) + 1;

          confessions[
            interaction.guild.id
          ] = id;

          save(
            "confessions.json",
            confessions
          );

          await channel.send({
            embeds: [
              new EmbedBuilder()
                .setTitle(
                  `୨୧・confession #${id}`
                )
                .setDescription(
                  message
                )
                .setFooter({
                  text:
                    "Anonymous confession"
                })
                .setTimestamp()
            ]
          });

          return interaction.reply({
            content:
              "Your confession was posted anonymously. ♡",
            flags:
              MessageFlags.Ephemeral
          });
        }

        /* SUGGESTION */

        if (
          interaction.customId ===
          "suggestion_modal"
        ) {

          const message =
            interaction.fields
              .getTextInputValue(
                "suggestion_text"
              );

          const channel =
            await getChannel(
              interaction.guild,
              "୨୧・suggestions"
            );

          if (!channel) {
            return interaction.reply({
              content:
                "The suggestions channel doesn't exist.",
              flags:
                MessageFlags.Ephemeral
            });
          }

          const id =
            (suggestions[
              interaction.guild.id
            ] || 0) + 1;

          suggestions[
            interaction.guild.id
          ] = id;

          save(
            "suggestions.json",
            suggestions
          );

          const msg =
            await channel.send({
              embeds: [
                new EmbedBuilder()
                  .setTitle(
                    `୨୧・suggestion #${id}`
                  )
                  .setDescription(
                    message
                  )
                  .setFooter({
                    text:
                      `Submitted by ${interaction.user.tag}`
                  })
                  .setTimestamp()
              ]
            });

          await msg.react("👍")
            .catch(() => {});

          await msg.react("👎")
            .catch(() => {});

          return interaction.reply({
            content:
              "Suggestion submitted. ♡",
            flags:
              MessageFlags.Ephemeral
          });
        }

        /* PARTNERSHIP */

        if (
          interaction.customId ===
          "partnership_modal"
        ) {

          const server =
            interaction.fields
              .getTextInputValue(
                "server"
              );

          const invite =
            interaction.fields
              .getTextInputValue(
                "invite"
              );

          const description =
            interaction.fields
              .getTextInputValue(
                "description"
              );

          const staffChannel =
            await getChannel(
              interaction.guild,
              "୨୧・partnerships"
            );

          if (!staffChannel) {
            return interaction.reply({
              content:
                "The partnerships channel doesn't exist.",
              flags:
                MessageFlags.Ephemeral
            });
          }

          const staffRoles =
            STAFF_ROLES
              .map(name =>
                interaction.guild.roles.cache
                  .find(
                    role =>
                      role.name === name
                  )
              )
              .filter(Boolean);

          const mention =
            staffRoles.length
              ? staffRoles
                  .map(
                    role =>
                      `<@&${role.id}>`
                  )
                  .join(" ")
              : "";

          await staffChannel.send({
            content: mention,

            embeds: [
              new EmbedBuilder()
                .setTitle(
                  "♡ New Partnership Application"
                )
                .setDescription(
`**Server:** ${server}

**Invite:** ${invite}

**Description:**
${description}

**Applicant:** ${interaction.user}`
                )
                .setTimestamp()
            ]
          });

          return interaction.reply({
            content:
              "Partnership application sent to staff. ♡",
            flags:
              MessageFlags.Ephemeral
          });
        }
      }

      /* =========================
         SLASH COMMANDS
      ========================= */

      if (
        !interaction.isChatInputCommand()
      ) {
        return;
      }

      /* RESET */

      if (
        interaction.commandName ===
        "resetserver"
      ) {

        if (
          !isOwner(
            interaction.member
          )
        ) {
          return interaction.reply({
            content:
              "Only the server owner can use this command.",
            flags:
              MessageFlags.Ephemeral
          });
        }

        await interaction.reply({
          content:
            "🔄 Rebuilding the server...",
          flags:
            MessageFlags.Ephemeral
        });

        try {

          await resetServer(
            interaction.guild
          );

          await interaction.editReply(
            "✅ Server rebuilt successfully."
          );

          setTimeout(() => {
            interaction.deleteReply()
              .catch(() => {});
          }, 2000);

        } catch (error) {

          console.error(
            "RESET ERROR:",
            error
          );

          await interaction.editReply(
`❌ Reset failed.

\`${error.message}\``
          );
        }

        return;
      }

      await interaction.deferReply({
        flags:
          MessageFlags.Ephemeral
      });

      const guild =
        interaction.guild;

      const member =
        interaction.member;

      /* RANK */

      if (
        interaction.commandName ===
        "rank"
      ) {

        const p =
          profile(member.id);

        const required =
          needed(p.level);

        const percent =
          Math.min(
            100,
            Math.floor(
              (p.xp / required) * 100
            )
          );

        const bars =
          Math.floor(
            percent / 10
          );

        return interaction.editReply(
`୨୧・rank

**${member.user.username}**

Level: **${p.level}**
XP: **${p.xp}/${required}**

${"▰".repeat(bars)}${"▱".repeat(10 - bars)} ${percent}%`
        );
      }

      /* LEADERBOARD */

      if (
        interaction.commandName ===
        "leaderboard"
      ) {

        const top =
          Object.entries(profiles)
            .sort((a, b) => {

              if (
                b[1].level !==
                a[1].level
              ) {
                return (
                  b[1].level -
                  a[1].level
                );
              }

              return (
                b[1].xp -
                a[1].xp
              );
            })
            .slice(0, 10);

        if (!top.length) {
          return interaction.editReply(
            "Nobody has earned XP yet."
          );
        }

        let output =
          "୨୧・leaderboard\n\n";

        top.forEach(
          (entry, index) => {

            output +=
              `**${index + 1}.** <@${entry[0]}> — Level **${entry[1].level}** (${entry[1].xp} XP)\n`;
          }
        );

        return interaction.editReply(
          output
        );
      }

      /* PROFILE */

      if (
        interaction.commandName ===
        "profile"
      ) {

        const user =
          interaction.options
            .getUser("user") ||
          interaction.user;

        const p =
          profile(user.id);

        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle(
                "୨୧・profile"
              )
              .setThumbnail(
                user.displayAvatarURL()
              )
              .setDescription(
`**${user.username}**

Level: **${p.level}**
XP: **${p.xp}/${needed(p.level)}**
Bio: ${p.bio || "Not set"}
Friends: **${p.friends.length}**`
              )
          ]
        });
      }

      /* BIO */

      if (
        interaction.commandName ===
        "setbio"
      ) {

        const p =
          profile(member.id);

        p.bio =
          interaction.options
            .getString("text")
            .slice(0, 500);

        save(
          "profiles.json",
          profiles
        );

        return interaction.editReply(
          "Your bio has been updated. ♡"
        );
      }

      /* FRIEND */

      if (
        interaction.commandName ===
        "friend"
      ) {

        const user =
          interaction.options
            .getUser("user");

        if (
          user.id === member.id
        ) {
          return interaction.editReply(
            "You can't add yourself."
          );
        }

        const p =
          profile(member.id);

        if (
          !p.friends.includes(
            user.id
          )
        ) {
          p.friends.push(
            user.id
          );
        }

        save(
          "profiles.json",
          profiles
        );

        return interaction.editReply(
          `${user} was added to your friends. ♡`
        );
      }

      /* FRIENDS */

      if (
        interaction.commandName ===
        "friends"
      ) {

        const p =
          profile(member.id);

        return interaction.editReply(
          p.friends.length
            ? `Friends: ${p.friends.map(id => `<@${id}>`).join(", ")}`
            : "You don't have any friends added."
        );
      }

      /* COINFLIP */

      if (
        interaction.commandName ===
        "coinflip"
      ) {

        return interaction.editReply(
`୨୧・coinflip

**${
          Math.random() < 0.5
            ? "Heads"
            : "Tails"
        }**`
        );
      }

      /* ROLL */

      if (
        interaction.commandName ===
        "roll"
      ) {

        return interaction.editReply(
`୨୧・roll

You rolled **${
          Math.floor(
            Math.random() * 6
          ) + 1
        }**.`
        );
      }

      /* 8BALL */

      if (
        interaction.commandName ===
        "8ball"
      ) {

        const answers = [
          "yes.",
          "no.",
          "maybe.",
          "definitely.",
          "probably.",
          "ask again later.",
          "i don't think so.",
          "absolutely."
        ];

        return interaction.editReply(
`୨୧・8ball

${
          answers[
            Math.floor(
              Math.random() *
              answers.length
            )
          ]
        }`
        );
      }

      /* RPS */

      if (
        interaction.commandName ===
        "rps"
      ) {

        const choice =
          interaction.options
            .getString(
              "choice"
            );

        const choices = [
          "rock",
          "paper",
          "scissors"
        ];

        const bot =
          choices[
            Math.floor(
              Math.random() * 3
            )
          ];

        let result =
          "Tie.";

        if (
          (
            choice === "rock" &&
            bot === "scissors"
          ) ||
          (
            choice === "paper" &&
            bot === "rock"
          ) ||
          (
            choice === "scissors" &&
            bot === "paper"
          )
        ) {
          result =
            "You win.";
        } else if (
          choice !== bot
        ) {
          result =
            "You lose.";
        }

        return interaction.editReply(
`୨୧・rps

You: **${choice}**
Bot: **${bot}**

**${result}**`
        );
      }

      /* WOULD YOU RATHER */

      if (
        interaction.commandName ===
        "wouldyourather"
      ) {

        const questions = [
          "Would you rather fly or teleport?",
          "Would you rather be rich or famous?",
          "Would you rather never sleep or never eat?",
          "Would you rather live in the city or countryside?",
          "Would you rather always be early or always be late?"
        ];

        return interaction.editReply(
`୨୧・would you rather

${
          questions[
            Math.floor(
              Math.random() *
              questions.length
            )
          ]
        }`
        );
      }

      /* TRIVIA */

      if (
        interaction.commandName ===
        "trivia"
      ) {

        const questions = [
          [
            "What planet is known as the Red Planet?",
            "Mars"
          ],
          [
            "How many continents are there?",
            "7"
          ],
          [
            "What is the largest ocean?",
            "Pacific Ocean"
          ],
          [
            "What gas do humans need to breathe?",
            "Oxygen"
          ],
          [
            "How many sides does a hexagon have?",
            "6"
          ]
        ];

        const q =
          questions[
            Math.floor(
              Math.random() *
              questions.length
            )
          ];

        return interaction.editReply(
`୨୧・trivia

**Question:** ${q[0]}

**Answer:** ||${q[1]}||`
        );
      }

      /* CONFESS */

      if (
        interaction.commandName ===
        "confess"
      ) {

        const message =
          interaction.options
            .getString(
              "message"
            )
            .slice(0, 1000);

        const channel =
          await getChannel(
            guild,
            "୨୧・confessions"
          );

        if (!channel) {
          return interaction.editReply(
            "The confession channel doesn't exist."
          );
        }

        const id =
          (confessions[
            guild.id
          ] || 0) + 1;

        confessions[
          guild.id
        ] = id;

        save(
          "confessions.json",
          confessions
        );

        await channel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle(
                `୨୧・confession #${id}`
              )
              .setDescription(
                message
              )
              .setFooter({
                text:
                  "Anonymous confession"
              })
              .setTimestamp()
          ]
        });

        return interaction.editReply(
          "Your confession was posted anonymously. ♡"
        );
      }

      /* SUGGEST */

      if (
        interaction.commandName ===
        "suggest"
      ) {

        const message =
          interaction.options
            .getString(
              "message"
            )
            .slice(0, 1000);

        const channel =
          await getChannel(
            guild,
            "୨୧・suggestions"
          );

        if (!channel) {
          return interaction.editReply(
            "The suggestions channel doesn't exist."
          );
        }

        const id =
          (suggestions[
            guild.id
          ] || 0) + 1;

        suggestions[
          guild.id
        ] = id;

        save(
          "suggestions.json",
          suggestions
        );

        const msg =
          await channel.send({
            embeds: [
              new EmbedBuilder()
                .setTitle(
                  `୨୧・suggestion #${id}`
                )
                .setDescription(
                  message
                )
                .setFooter({
                  text:
                    `Submitted by ${member.user.tag}`
                })
                .setTimestamp()
            ]
          });

        await msg.react("👍")
          .catch(() => {});

        await msg.react("👎")
          .catch(() => {});

        return interaction.editReply(
          "Suggestion submitted. ♡"
        );
      }

      /* PING */

      if (
        interaction.commandName ===
        "ping"
      ) {

        return interaction.editReply(
          `Pong! ${client.ws.ping}ms`
        );
      }

      /* =========================
         MODERATION PERMISSIONS
      ========================= */

      if (
        [
          "kick",
          "timeout",
          "warn",
          "warnings",
          "clear"
        ].includes(
          interaction.commandName
        )
      ) {

        if (!isStaff(member)) {
          return interaction.editReply(
            "You don't have permission to use this command."
          );
        }
      }

      /* BAN = OWNER ONLY */

      if (
        interaction.commandName ===
        "ban"
      ) {

        if (!isOwner(member)) {
          return interaction.editReply(
            "Only the server owner can ban members."
          );
        }

        const target =
          await guild.members.fetch(
            interaction.options
              .getUser("user")
              .id
          ).catch(() => null);

        if (
          !target ||
          !target.bannable
        ) {
          return interaction.editReply(
            "I can't ban that member."
          );
        }

        await target.ban({
          reason:
            `Owner ban by ${member.user.tag}`
        });

        return interaction.editReply(
          `Banned **${target.user.tag}**.`
        );
      }

      /* KICK */

      if (
        interaction.commandName ===
        "kick"
      ) {

        const target =
          interaction.options
            .getMember("user");

        if (
          !target?.kickable
        ) {
          return interaction.editReply(
            "I can't kick that member."
          );
        }

        await target.kick(
          `Kick by ${member.user.tag}`
        );

        return interaction.editReply(
          `Kicked **${target.user.tag}**.`
        );
      }

      /* TIMEOUT */

      if (
        interaction.commandName ===
        "timeout"
      ) {

        const target =
          interaction.options
            .getMember("user");

        const minutes =
          interaction.options
            .getInteger(
              "minutes"
            );

        if (
          !target?.moderatable
        ) {
          return interaction.editReply(
            "I can't timeout that member."
          );
        }

        await target.timeout(
          minutes * 60000,
          `Timeout by ${member.user.tag}`
        );

        return interaction.editReply(
          `Timed out **${target.user.tag}** for **${minutes} minutes**.`
        );
      }

      /* WARN */

      if (
        interaction.commandName ===
        "warn"
      ) {

        const user =
          interaction.options
            .getUser("user");

        const reason =
          interaction.options
            .getString("reason");

        if (!warnings[user.id]) {
          warnings[user.id] = [];
        }

        warnings[user.id].push({
          reason,
          moderator: member.id,
          date: Date.now()
        });

        save(
          "warnings.json",
          warnings
        );

        return interaction.editReply(
`Warned **${user.tag}**.

Reason: ${reason}`
        );
      }

      /* WARNINGS */

      if (
        interaction.commandName ===
        "warnings"
      ) {

        const user =
          interaction.options
            .getUser("user") ||
          interaction.user;

        const list =
          warnings[user.id] || [];

        if (!list.length) {
          return interaction.editReply(
            `${user.username} has no warnings.`
          );
        }

        return interaction.editReply(
`୨୧・warnings

${list.map(
  (warning, index) =>
    `**${index + 1}.** ${warning.reason}`
).join("\n")}`
        );
      }

      /* CLEAR */

      if (
        interaction.commandName ===
        "clear"
      ) {

        if (
          !interaction.channel
        ) {
          return interaction.editReply(
            "This command can't be used here."
          );
        }

        const amount =
          interaction.options
            .getInteger(
              "amount"
            );

        const deleted =
          await interaction.channel
            .bulkDelete(
              amount,
              true
            );

        return interaction.editReply(
          `Deleted **${deleted.size}** messages.`
        );
      }

    } catch (error) {

      console.error(
        "Interaction error:",
        error
      );

      if (
        interaction.deferred ||
        interaction.replied
      ) {

        await interaction.editReply(
          "Something went wrong. Check the Railway logs."
        ).catch(() => {});

      } else {

        await interaction.reply({
          content:
            "Something went wrong.",
          flags:
            MessageFlags.Ephemeral
        }).catch(() => {});
      }
    }
  }
);

/* =========================
   XP
========================= */

client.on(
  "messageCreate",
  async message => {

    if (
      message.author.bot ||
      !message.guild
    ) {
      return;
    }

    const p =
      profile(
        message.author.id
      );

    const now =
      Date.now();

    if (
      now - p.lastXP <
      60000
    ) {
      return;
    }

    p.lastXP = now;

    p.xp +=
      Math.floor(
        Math.random() * 11
      ) + 10;

    let leveled = false;

    while (
      p.xp >=
      needed(p.level)
    ) {

      p.xp -=
        needed(p.level);

      p.level++;

      leveled = true;
    }

    save(
      "profiles.json",
      profiles
    );

    if (leveled) {

      await updateLevelRoles(
        message.member
      );

      const channel =
        settings[
          message.guild.id
        ]?.levelChannel
          ? message.guild.channels.cache.get(
              settings[
                message.guild.id
              ].levelChannel
            )
          : await getChannel(
              message.guild,
              "୨୧・levels"
            );

      if (channel) {

        await channel.send(
`୨୧・level up

${message.author} reached **Level ${p.level}**! ♡`
        ).catch(() => {});
      }
    }
  }
);

/* =========================
   STARBOARD
========================= */

client.on(
  "messageReactionAdd",
  async (reaction, user) => {

    try {

      if (user.bot) return;

      if (reaction.partial) {
        await reaction.fetch()
          .catch(() => {});
      }

      if (
        reaction.message.partial
      ) {
        await reaction.message
          .fetch()
          .catch(() => {});
      }

      if (
        reaction.emoji.name !==
        "⭐"
      ) {
        return;
      }

      if (
        reaction.count < 3
      ) {
        return;
      }

      const guild =
        reaction.message.guild;

      if (!guild) return;

      const channel =
        await getChannel(
          guild,
          "୨୧・starboard"
        );

      if (!channel) return;

      const key =
        reaction.message.id;

      if (starboard[key]) {
        return;
      }

      starboard[key] = true;

      save(
        "starboard.json",
        starboard
      );

      const embed =
        new EmbedBuilder()
          .setAuthor({
            name:
              reaction.message.author.tag,

            iconURL:
              reaction.message.author
                .displayAvatarURL()
          })
          .setDescription(
`${reaction.message.content || "*No text content*"}

[Jump to message](${reaction.message.url})`
          )
          .setFooter({
            text:
              `${reaction.count} ⭐`
          })
          .setTimestamp();

      await channel.send({
        embeds: [embed]
      }).catch(() => {});

    } catch (error) {

      console.error(
        "Starboard error:",
        error
      );
    }
  }
);

/* =========================
   BOOSTS
========================= */

client.on(
  "guildMemberUpdate",
  async (oldMember, newMember) => {

    try {

      const oldBoost =
        !!oldMember.premiumSince;

      const newBoost =
        !!newMember.premiumSince;

      if (
        oldBoost ===
        newBoost
      ) {
        return;
      }

      const booster =
        await getRole(
          newMember.guild,
          "🌸・booster"
        );

      if (newBoost) {

        if (
          booster &&
          !newMember.roles.cache
            .has(booster.id)
        ) {

          await newMember.roles
            .add(booster)
            .catch(() => {});
        }

        const channel =
          await getChannel(
            newMember.guild,
            "୨୧・boosts"
          );

        if (channel) {

          await channel.send(
            `♡ Thank you ${newMember} for boosting the server!`
          ).catch(() => {});
        }

      } else {

        if (
          booster &&
          newMember.roles.cache
            .has(booster.id)
        ) {

          await newMember.roles
            .remove(booster)
            .catch(() => {});
        }
      }

      await updateBoostPanel(
        newMember.guild
      );

    } catch (error) {

      console.error(
        "Boost error:",
        error
      );
    }
  }
);

/* =========================
   NEW MEMBERS
========================= */

client.on(
  "guildMemberAdd",
  async member => {

    try {

      const role =
        await getRole(
          member.guild,
          "Member"
        );

      if (role) {
        await member.roles
          .add(role)
          .catch(() => {});
      }

      const channel =
        await getChannel(
          member.guild,
          "୨୧・introductions"
        );

      if (channel) {

        await channel.send(
`♡ welcome ${member}

introduce yourself and make some friends.`
        ).catch(() => {});
      }

      await updateServerInfo(
        member.guild
      );

    } catch (error) {

      console.error(
        "Welcome error:",
        error
      );
    }
  }
);

/* =========================
   START
========================= */

client.login(TOKEN);