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
  MessageFlags,
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const TOKEN = process.env.TOKEN;

if (!TOKEN) {
  throw new Error("TOKEN environment variable is missing.");
}

/* =========================
   CLIENT
========================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

/* =========================
   DATA
========================= */

const DATA_FILE = path.join(__dirname, "data.json");

let data = {
  xp: {},
  warnings: {},
  bios: {},
  friends: {},
};

if (fs.existsSync(DATA_FILE)) {
  try {
    data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    console.log("Could not read data.json. Creating fresh data.");
  }
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

/* =========================
   CONFIG
========================= */

const CATEGORY_NAMES = {
  INFO: "001・INFO",
  COMMUNITY: "002・COMMUNITY",
  EXTRAS: "003・EXTRAS",
  TICKETS: "004・TICKETS",
};

const CHANNELS = {
  rules: "୨୧・rules",
  announcements: "୨୧・announcements",
  serverInfo: "୨୧・server-info",
  introductions: "୨୧・introductions",
  roles: "୨୧・roles",
  boosts: "୨୧・boosts",
  partnerships: "୨୧・partnerships",

  chat: "୨୧・chat",
  media: "୨୧・media",
  memes: "୨୧・memes",
  games: "୨୧・games",
  suggestions: "୨୧・suggestions",

  levels: "୨୧・levels",
  starboard: "୨୧・starboard",
  confessions: "୨୧・confessions",
  support: "୨୧・support",
};

const STAFF_ROLES = [
  "👑・owner",
  "⚡・admin",
  "🛡️・mod",
  "🔨・staff",
];

const BOOSTER_ROLE = "🌸・booster";
const MEMBER_ROLE = "Member";

/* Safe self-assignable roles */
const SELF_ROLES = [
  "୨୧・woman",
  "୨୧・man",
  "୨୧・they/them",
  "୨୧・she/her",
  "୨୧・he/him",
  "୨୧・minor",
  "୨୧・adult",
  "୨୧・single",
  "୨୧・taken",
];

/* =========================
   HELPERS
========================= */

function findRole(guild, name) {
  return guild.roles.cache.find((r) => r.name === name);
}

function findChannel(guild, name) {
  return guild.channels.cache.find((c) => c.name === name);
}

function isStaff(member) {
  if (!member) return false;

  if (member.id === member.guild.ownerId) {
    return true;
  }

  return member.roles.cache.some((role) =>
    STAFF_ROLES.includes(role.name)
  );
}

function getStaffRoleIds(guild) {
  return guild.roles.cache
    .filter((role) => STAFF_ROLES.includes(role.name))
    .map((role) => role.id);
}

function botMember(guild) {
  return guild.members.me;
}

function canModerateTarget(actor, target) {
  if (!actor || !target) return false;

  if (target.id === actor.id) return false;
  if (target.id === actor.guild.ownerId) return false;

  if (actor.id !== actor.guild.ownerId) {
    if (
      target.roles.highest.position >=
      actor.roles.highest.position
    ) {
      return false;
    }
  }

  return true;
}

function getXP(userId) {
  return data.xp[userId] || { xp: 0, level: 0 };
}

function calculateLevel(xp) {
  return Math.floor(Math.sqrt(xp / 100));
}

function xpNeeded(level) {
  return (level + 1) * (level + 1) * 100;
}

/* =========================
   EMBEDS
========================= */

function baseEmbed(title, description) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

/* =========================
   CHANNEL PERMISSIONS
========================= */

function readOnlyOverwrites(guild) {
  return [
    {
      id: guild.roles.everyone.id,
      deny: [
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.AddReactions,
      ],
    },
  ];
}

function staffOnlyOverwrites(guild) {
  const overwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionsBitField.Flags.ViewChannel],
    },
  ];

  for (const roleName of STAFF_ROLES) {
    const role = findRole(guild, roleName);

    if (role) {
      overwrites.push({
        id: role.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
        ],
      });
    }
  }

  return overwrites;
}

/* =========================
   RESET SERVER
========================= */

async function resetServer(guild) {
  console.log(`Resetting ${guild.name}...`);

  /* Delete channels */
  for (const channel of [...guild.channels.cache.values()]) {
    try {
      await channel.delete("Server reset");
    } catch {}
  }

  /* Delete removable roles */
  for (const role of [...guild.roles.cache.values()]) {
    if (role.id === guild.id) continue;
    if (role.managed) continue;

    try {
      await role.delete("Server reset");
    } catch {}
  }

  await new Promise((r) => setTimeout(r, 1500));

  /* =========================
     CATEGORIES
  ========================= */

  const info = await guild.channels.create({
    name: CATEGORY_NAMES.INFO,
    type: ChannelType.GuildCategory,
  });

  const community = await guild.channels.create({
    name: CATEGORY_NAMES.COMMUNITY,
    type: ChannelType.GuildCategory,
  });

  const extras = await guild.channels.create({
    name: CATEGORY_NAMES.EXTRAS,
    type: ChannelType.GuildCategory,
  });

  const tickets = await guild.channels.create({
    name: CATEGORY_NAMES.TICKETS,
    type: ChannelType.GuildCategory,
  });

  /* =========================
     CREATE CHANNEL HELPER
  ========================= */

  async function makeChannel(
    name,
    parent,
    options = {}
  ) {
    return guild.channels.create({
      name,
      type: ChannelType.GuildText,
      parent,
      ...options,
    });
  }

  /* =========================
     INFO
  ========================= */

  const rules = await makeChannel(
    CHANNELS.rules,
    info,
    {
      permissionOverwrites: readOnlyOverwrites(guild),
    }
  );

  const announcements = await makeChannel(
    CHANNELS.announcements,
    info,
    {
      permissionOverwrites: readOnlyOverwrites(guild),
    }
  );

  const serverInfo = await makeChannel(
    CHANNELS.serverInfo,
    info,
    {
      permissionOverwrites: readOnlyOverwrites(guild),
    }
  );

  const introductions = await makeChannel(
    CHANNELS.introductions,
    info
  );

  const roles = await makeChannel(
    CHANNELS.roles,
    info,
    {
      permissionOverwrites: readOnlyOverwrites(guild),
    }
  );

  const boosts = await makeChannel(
    CHANNELS.boosts,
    info,
    {
      permissionOverwrites: readOnlyOverwrites(guild),
    }
  );

  const partnerships = await makeChannel(
    CHANNELS.partnerships,
    info,
    {
      permissionOverwrites: readOnlyOverwrites(guild),
    }
  );

  /* =========================
     COMMUNITY
  ========================= */

  const chat = await makeChannel(
    CHANNELS.chat,
    community
  );

  const media = await makeChannel(
    CHANNELS.media,
    community
  );

  const memes = await makeChannel(
    CHANNELS.memes,
    community
  );

  const games = await makeChannel(
    CHANNELS.games,
    community
  );

  const suggestions = await makeChannel(
    CHANNELS.suggestions,
    community,
    {
      permissionOverwrites: readOnlyOverwrites(guild),
    }
  );

  /* =========================
     EXTRAS
  ========================= */

  const levels = await makeChannel(
    CHANNELS.levels,
    extras,
    {
      permissionOverwrites: readOnlyOverwrites(guild),
    }
  );

  const starboard = await makeChannel(
    CHANNELS.starboard,
    extras,
    {
      permissionOverwrites: readOnlyOverwrites(guild),
    }
  );

  const confessions = await makeChannel(
    CHANNELS.confessions,
    extras,
    {
      permissionOverwrites: readOnlyOverwrites(guild),
    }
  );

  const support = await makeChannel(
    CHANNELS.support,
    extras,
    {
      permissionOverwrites: readOnlyOverwrites(guild),
    }
  );

  /* =========================
     RULES
  ========================= */

  await rules.send({
    embeds: [
      baseEmbed(
        "୨୧・server rules",
        [
          "**01 — Be respectful**",
          "No harassment, bullying, or unnecessary drama.",
          "",
          "**02 — No spam**",
          "Don't flood chats, mentions, or reactions.",
          "",
          "**03 — No NSFW**",
          "Keep the server appropriate for everyone.",
          "",
          "**04 — No advertising**",
          "Don't advertise without permission.",
          "",
          "**05 — Listen to staff**",
          "Staff decisions are made to keep the server comfortable.",
          "",
          "**06 — Use channels correctly**",
          "Keep conversations where they belong.",
          "",
          "**07 — Don't abuse bots**",
          "No command spam or exploiting bot features.",
          "",
          "**08 — Have fun**",
          "Meet people, talk, play games, and enjoy the server ♡",
        ].join("\n")
      ),
    ],
  });

  /* =========================
     ANNOUNCEMENTS
  ========================= */

  await announcements.send({
    embeds: [
      baseEmbed(
        "୨୧・announcements",
        "Important server updates, events, and announcements will be posted here.\n\n♡ Keep notifications on if you don't want to miss anything."
      ),
    ],
  });

  /* =========================
     SERVER INFO
  ========================= */

  await serverInfo.send({
    embeds: [
      baseEmbed(
        "୨୧・server info",
        [
          `**Server:** ${guild.name}`,
          `**Members:** ${guild.memberCount}`,
          "",
          "♡ Be active",
          "♡ Meet new people",
          "♡ Use the role panel",
          "♡ Participate in games",
          "♡ Earn XP by chatting",
          "♡ Open a ticket when you need help",
        ].join("\n")
      ),
    ],
  });

  /* =========================
     ROLES
  ========================= */

  const roleButtons = [];

  for (const roleName of SELF_ROLES) {
    roleButtons.push(
      new ButtonBuilder()
        .setCustomId(
          `role_${Buffer.from(roleName).toString("base64").slice(0, 70)}`
        )
        .setLabel(roleName)
        .setStyle(ButtonStyle.Secondary)
    );
  }

  const roleRows = [];

  for (let i = 0; i < roleButtons.length; i += 5) {
    roleRows.push(
      new ActionRowBuilder().addComponents(
        roleButtons.slice(i, i + 5)
      )
    );
  }

  await roles.send({
    embeds: [
      baseEmbed(
        "୨୧・roles",
        "Choose the roles that fit you ♡\n\nClick a role to add it. Click it again to remove it.\n\n**If a role doesn't work, ask the owner to create it.**"
      ),
    ],
    components: roleRows,
  });

  /* =========================
     BOOSTS
  ========================= */

  await boosts.send({
    embeds: [
      baseEmbed(
        "🌸・server boosts",
        [
          `Current boosts: **${guild.premiumSubscriptionCount || 0}**`,
          `Boost level: **${guild.premiumTier || 0}**`,
          "",
          "Thank you to everyone who supports the server ♡",
        ].join("\n")
      ),
    ],
  });

  /* =========================
     PARTNERSHIPS
  ========================= */

  await partnerships.send({
    embeds: [
      baseEmbed(
        "୨୧・partnerships",
        "Interested in partnering with the server?\n\nClick the button below to open a private partnership application."
      ),
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("open_partnership")
          .setLabel("Apply for Partnership")
          .setEmoji("🤝")
          .setStyle(ButtonStyle.Primary)
      ),
    ],
  });

  /* =========================
     SUGGESTIONS
  ========================= */

  await suggestions.send({
    embeds: [
      baseEmbed(
        "୨୧・suggestions",
        "Have an idea that could make the server better?\n\nClick below and send your suggestion."
      ),
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("open_suggestion")
          .setLabel("Make a Suggestion")
          .setEmoji("💡")
          .setStyle(ButtonStyle.Primary)
      ),
    ],
  });

  /* =========================
     CONFESSIONS
  ========================= */

  await confessions.send({
    embeds: [
      baseEmbed(
        "୨୧・confessions",
        "Want to say something anonymously?\n\nClick below to submit an anonymous confession."
      ),
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("open_confession")
          .setLabel("Send Confession")
          .setEmoji("🤫")
          .setStyle(ButtonStyle.Secondary)
      ),
    ],
  });

  /* =========================
     SUPPORT
  ========================= */

  await support.send({
    embeds: [
      baseEmbed(
        "୨୧・support",
        "Need help with something?\n\nOpen a private support ticket and staff will help you."
      ),
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("open_support")
          .setLabel("Open Support Ticket")
          .setEmoji("🎫")
          .setStyle(ButtonStyle.Primary)
      ),
    ],
  });

  /* =========================
     GAMES
  ========================= */

  await games.send({
    embeds: [
      baseEmbed(
        "🎮・games",
        [
          "**Fun commands**",
          "",
          "`/coinflip` — Flip a coin",
          "`/roll` — Roll a dice",
          "`/8ball` — Ask the magic 8-ball",
          "`/rps` — Rock paper scissors",
          "`/wouldyourather` — Would you rather?",
          "`/trivia` — Answer trivia",
        ].join("\n")
      ),
    ],
  });

  /* =========================
     SAVE SETTINGS
  ========================= */

  data.ticketCategory = tickets.id;
  data.levelChannel = levels.id;
  data.starboardChannel = starboard.id;
  data.introductionsChannel = introductions.id;
  data.boostChannel = boosts.id;

  saveData();

  return {
    rules,
    announcements,
    serverInfo,
    introductions,
    roles,
    boosts,
    partnerships,
    chat,
    media,
    memes,
    games,
    suggestions,
    levels,
    starboard,
    confessions,
    support,
    tickets,
  };
}

/* =========================
   SLASH COMMANDS
========================= */

const commands = [
  new SlashCommandBuilder()
    .setName("resetserver")
    .setDescription("Completely rebuild the server.")
    .setDefaultMemberPermissions(
      PermissionsBitField.Flags.Administrator.toString()
    ),

  new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Flip a coin."),

  new SlashCommandBuilder()
    .setName("roll")
    .setDescription("Roll a dice."),

  new SlashCommandBuilder()
    .setName("8ball")
    .setDescription("Ask the magic 8-ball.")
    .addStringOption((o) =>
      o
        .setName("question")
        .setDescription("Your question")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("rps")
    .setDescription("Play rock paper scissors.")
    .addStringOption((o) =>
      o
        .setName("choice")
        .setDescription("Your choice")
        .setRequired(true)
        .addChoices(
          { name: "Rock", value: "rock" },
          { name: "Paper", value: "paper" },
          { name: "Scissors", value: "scissors" }
        )
    ),

  new SlashCommandBuilder()
    .setName("wouldyourather")
    .setDescription("Get a random would-you-rather question."),

  new SlashCommandBuilder()
    .setName("trivia")
    .setDescription("Get a random trivia question."),

  new SlashCommandBuilder()
    .setName("rank")
    .setDescription("View your XP rank.")
    .addUserOption((o) =>
      o
        .setName("user")
        .setDescription("User to check")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("View the XP leaderboard."),

  new SlashCommandBuilder()
    .setName("profile")
    .setDescription("View a profile.")
    .addUserOption((o) =>
      o
        .setName("user")
        .setDescription("User to view")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("setbio")
    .setDescription("Set your profile bio.")
    .addStringOption((o) =>
      o
        .setName("bio")
        .setDescription("Your bio")
        .setRequired(true)
        .setMaxLength(200)
    ),

  new SlashCommandBuilder()
    .setName("friend")
    .setDescription("Add someone as a friend.")
    .addUserOption((o) =>
      o
        .setName("user")
        .setDescription("User")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("friends")
    .setDescription("View your friends."),

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member.")
    .addUserOption((o) =>
      o
        .setName("user")
        .setDescription("Member to ban")
        .setRequired(true)
    )
    .addStringOption((o) =>
      o
        .setName("reason")
        .setDescription("Reason")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member.")
    .addUserOption((o) =>
      o
        .setName("user")
        .setDescription("Member to kick")
        .setRequired(true)
    )
    .addStringOption((o) =>
      o
        .setName("reason")
        .setDescription("Reason")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout a member.")
    .addUserOption((o) =>
      o
        .setName("user")
        .setDescription("Member to timeout")
        .setRequired(true)
    )
    .addIntegerOption((o) =>
      o
        .setName("minutes")
        .setDescription("Timeout length")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(40320)
    )
    .addStringOption((o) =>
      o
        .setName("reason")
        .setDescription("Reason")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a member.")
    .addUserOption((o) =>
      o
        .setName("user")
        .setDescription("Member")
        .setRequired(true)
    )
    .addStringOption((o) =>
      o
        .setName("reason")
        .setDescription("Reason")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("View warnings.")
    .addUserOption((o) =>
      o
        .setName("user")
        .setDescription("Member")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Delete messages.")
    .addIntegerOption((o) =>
      o
        .setName("amount")
        .setDescription("Number of messages")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    ),

  new SlashCommandBuilder()
    .setName("confess")
    .setDescription("Send an anonymous confession.")
    .addStringOption((o) =>
      o
        .setName("message")
        .setDescription("Your confession")
        .setRequired(true)
        .setMaxLength(1000)
    ),

  new SlashCommandBuilder()
    .setName("suggest")
    .setDescription("Send a suggestion.")
    .addStringOption((o) =>
      o
        .setName("suggestion")
        .setDescription("Your suggestion")
        .setRequired(true)
        .setMaxLength(1000)
    ),
].map((command) => command.toJSON());

/* =========================
   READY
========================= */

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  await client.application.commands.set(commands);

  console.log("Slash commands registered.");
});

/* =========================
   INTERACTIONS
========================= */

client.on("interactionCreate", async (interaction) => {
  try {
    /* =========================
       BUTTONS
    ========================= */

    if (interaction.isButton()) {
      /* ROLE BUTTON */
      if (interaction.customId.startsWith("role_")) {
        const encoded = interaction.customId.replace("role_", "");

        let roleName;

        try {
          roleName = Buffer.from(encoded, "base64").toString("utf8");
        } catch {
          return interaction.reply({
            content: "❌ Invalid role button.",
            flags: MessageFlags.Ephemeral,
          });
        }

        if (!SELF_ROLES.includes(roleName)) {
          return interaction.reply({
            content: "❌ That role isn't selectable.",
            flags: MessageFlags.Ephemeral,
          });
        }

        const role = findRole(interaction.guild, roleName);

        if (!role) {
          return interaction.reply({
            content: `❌ The role \`${roleName}\` doesn't exist yet. Ask the owner to create it.`,
            flags: MessageFlags.Ephemeral,
          });
        }

        if (interaction.member.roles.cache.has(role.id)) {
          await interaction.member.roles.remove(role);

          return interaction.reply({
            content: `Removed **${roleName}**.`,
            flags: MessageFlags.Ephemeral,
          });
        }

        await interaction.member.roles.add(role);

        return interaction.reply({
          content: `Added **${roleName}** ♡`,
          flags: MessageFlags.Ephemeral,
        });
      }

      /* =========================
         SUPPORT TICKET
      ========================= */

      if (interaction.customId === "open_support") {
        const existing = interaction.guild.channels.cache.find(
          (c) =>
            c.name === `ticket-${interaction.user.id}` ||
            c.name === `support-${interaction.user.id}`
        );

        if (existing) {
          return interaction.reply({
            content: `❌ You already have a ticket: ${existing}`,
            flags: MessageFlags.Ephemeral,
          });
        }

        const category = interaction.guild.channels.cache.find(
          (c) =>
            c.type === ChannelType.GuildCategory &&
            c.name === CATEGORY_NAMES.TICKETS
        );

        if (!category) {
          return interaction.reply({
            content: "❌ Ticket category doesn't exist. Run `/resetserver`.",
            flags: MessageFlags.Ephemeral,
          });
        }

        const overwrites = [
          {
            id: interaction.guild.roles.everyone.id,
            deny: [PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.AttachFiles,
            ],
          },
        ];

        for (const roleId of getStaffRoleIds(interaction.guild)) {
          overwrites.push({
            id: roleId,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
            ],
          });
        }

        const channel = await interaction.guild.channels.create({
          name: `ticket-${interaction.user.id}`,
          type: ChannelType.GuildText,
          parent: category.id,
          permissionOverwrites: overwrites,
          topic: `Support ticket | ${interaction.user.id}`,
        });

        await channel.send({
          content: `<@${interaction.user.id}>`,
          embeds: [
            baseEmbed(
              "🎫・support ticket",
              "Thanks for opening a ticket!\n\nPlease explain what you need help with. A staff member will respond as soon as possible."
            ),
          ],
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("close_ticket")
                .setLabel("Close Ticket")
                .setEmoji("🔒")
                .setStyle(ButtonStyle.Danger)
            ),
          ],
        });

        return interaction.reply({
          content: `🎫 Your ticket has been created: ${channel}`,
          flags: MessageFlags.Ephemeral,
        });
      }

      /* =========================
         PARTNERSHIP TICKET
      ========================= */

      if (interaction.customId === "open_partnership") {
        const existing = interaction.guild.channels.cache.find(
          (c) => c.name === `partner-${interaction.user.id}`
        );

        if (existing) {
          return interaction.reply({
            content: `❌ You already have a partnership ticket: ${existing}`,
            flags: MessageFlags.Ephemeral,
          });
        }

        const category = interaction.guild.channels.cache.find(
          (c) =>
            c.type === ChannelType.GuildCategory &&
            c.name === CATEGORY_NAMES.TICKETS
        );

        if (!category) {
          return interaction.reply({
            content: "❌ Ticket category doesn't exist. Run `/resetserver`.",
            flags: MessageFlags.Ephemeral,
          });
        }

        const overwrites = [
          {
            id: interaction.guild.roles.everyone.id,
            deny: [PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.AttachFiles,
            ],
          },
        ];

        for (const roleId of getStaffRoleIds(interaction.guild)) {
          overwrites.push({
            id: roleId,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
            ],
          });
        }

        const channel = await interaction.guild.channels.create({
          name: `partner-${interaction.user.id}`,
          type: ChannelType.GuildText,
          parent: category.id,
          permissionOverwrites: overwrites,
          topic: `Partnership application | ${interaction.user.id}`,
        });

        await channel.send({
          content: `<@${interaction.user.id}>`,
          embeds: [
            baseEmbed(
              "🤝・partnership application",
              [
                "Please send the following information:",
                "",
                "**Server name:**",
                "**Server invite:**",
                "**Member count:**",
                "**What is your server about?**",
                "**Why should we partner?**",
                "",
                "A staff member will review your application.",
              ].join("\n")
            ),
          ],
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("close_partnership")
                .setLabel("Close Application")
                .setEmoji("🔒")
                .setStyle(ButtonStyle.Danger)
            ),
          ],
        });

        return interaction.reply({
          content: `🤝 Your partnership ticket has been created: ${channel}`,
          flags: MessageFlags.Ephemeral,
        });
      }

      /* =========================
         CLOSE TICKET
      ========================= */

      if (
        interaction.customId === "close_ticket" ||
        interaction.customId === "close_partnership"
      ) {
        if (!isStaff(interaction.member)) {
          if (
            interaction.channel.topic &&
            !interaction.channel.topic.includes(
              interaction.user.id
            )
          ) {
            return interaction.reply({
              content: "❌ You cannot close this ticket.",
              flags: MessageFlags.Ephemeral,
            });
          }
        }

        await interaction.reply({
          content: "🔒 Closing ticket...",
        });

        setTimeout(async () => {
          try {
            await interaction.channel.delete("Ticket closed");
          } catch {}
        }, 1000);

        return;
      }

      /* =========================
         CONFESSION MODAL
      ========================= */

      if (interaction.customId === "open_confession") {
        const modal = new ModalBuilder()
          .setCustomId("confession_modal")
          .setTitle("Anonymous Confession");

        const input = new TextInputBuilder()
          .setCustomId("confession")
          .setLabel("Your confession")
          .setPlaceholder("Say something anonymously...")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(1000);

        modal.addComponents(
          new ActionRowBuilder().addComponents(input)
        );

        return interaction.showModal(modal);
      }

      /* =========================
         SUGGESTION MODAL
      ========================= */

      if (interaction.customId === "open_suggestion") {
        const modal = new ModalBuilder()
          .setCustomId("suggestion_modal")
          .setTitle("Server Suggestion");

        const input = new TextInputBuilder()
          .setCustomId("suggestion")
          .setLabel("Your suggestion")
          .setPlaceholder("What should we add or change?")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(1000);

        modal.addComponents(
          new ActionRowBuilder().addComponents(input)
        );

        return interaction.showModal(modal);
      }
    }

    /* =========================
       MODALS
    ========================= */

    if (interaction.isModalSubmit()) {
      if (interaction.customId === "confession_modal") {
        const message =
          interaction.fields.getTextInputValue("confession");

        const channel =
          findChannel(
            interaction.guild,
            CHANNELS.confessions
          );

        if (!channel) {
          return interaction.reply({
            content: "❌ Confessions channel doesn't exist.",
            flags: MessageFlags.Ephemeral,
          });
        }

        await channel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle("🤫・anonymous confession")
              .setDescription(message)
              .setFooter({ text: "Anonymous" })
              .setTimestamp(),
          ],
        });

        return interaction.reply({
          content: "♡ Your confession was sent anonymously.",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (interaction.customId === "suggestion_modal") {
        const message =
          interaction.fields.getTextInputValue("suggestion");

        const channel =
          findChannel(
            interaction.guild,
            CHANNELS.suggestions
          );

        if (!channel) {
          return interaction.reply({
            content: "❌ Suggestions channel doesn't exist.",
            flags: MessageFlags.Ephemeral,
          });
        }

        const sent = await channel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle("💡・new suggestion")
              .setDescription(message)
              .setFooter({
                text: `Suggested by ${interaction.user.username}`,
              })
              .setTimestamp(),
          ],
        });

        await sent.react("👍");
        await sent.react("👎");

        return interaction.reply({
          content: "💡 Your suggestion was posted.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    /* =========================
       CHAT COMMANDS
    ========================= */

    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "resetserver") {
      if (interaction.user.id !== interaction.guild.ownerId) {
        return interaction.reply({
          content: "❌ Only the server owner can use this.",
          flags: MessageFlags.Ephemeral,
        });
      }

      await interaction.deferReply({
        flags: MessageFlags.Ephemeral,
      });

      await resetServer(interaction.guild);

      await interaction.editReply(
        "✅ Server completely rebuilt.\n\n♡ Channels created\n♡ Tickets configured\n♡ Panels installed\n♡ Permissions configured"
      );

      setTimeout(async () => {
        try {
          await interaction.deleteReply();
        } catch {}
      }, 3000);

      return;
    }

    /* =========================
       MODERATION CHECK
    ========================= */

    const moderationCommands = [
      "kick",
      "timeout",
      "warn",
      "warnings",
      "clear",
    ];

    if (moderationCommands.includes(interaction.commandName)) {
      if (!isStaff(interaction.member)) {
        return interaction.reply({
          content: "❌ You need a staff role to use this.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    /* =========================
       BAN
    ========================= */

    if (interaction.commandName === "ban") {
      if (interaction.user.id !== interaction.guild.ownerId) {
        return interaction.reply({
          content: "❌ Only the server owner can ban members.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const user = interaction.options.getUser("user");
      const reason =
        interaction.options.getString("reason") ||
        "No reason provided";

      const member =
        await interaction.guild.members
          .fetch(user.id)
          .catch(() => null);

      if (member && !canModerateTarget(interaction.member, member)) {
        return interaction.reply({
          content: "❌ You cannot ban that member.",
          flags: MessageFlags.Ephemeral,
        });
      }

      await interaction.guild.members.ban(user.id, {
        reason,
      });

      return interaction.reply(
        `🔨 **${user.tag}** has been banned.\nReason: ${reason}`
      );
    }

    /* =========================
       KICK
    ========================= */

    if (interaction.commandName === "kick") {
      const user = interaction.options.getUser("user");
      const reason =
        interaction.options.getString("reason") ||
        "No reason provided";

      const member =
        await interaction.guild.members
          .fetch(user.id)
          .catch(() => null);

      if (!member) {
        return interaction.reply({
          content: "❌ That member isn't in the server.",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (!canModerateTarget(interaction.member, member)) {
        return interaction.reply({
          content: "❌ You cannot kick that member.",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (!member.kickable) {
        return interaction.reply({
          content: "❌ My role is not high enough to kick them.",
          flags: MessageFlags.Ephemeral,
        });
      }

      await member.kick(reason);

      return interaction.reply(
        `👢 **${user.tag}** has been kicked.\nReason: ${reason}`
      );
    }

    /* =========================
       TIMEOUT
    ========================= */

    if (interaction.commandName === "timeout") {
      const user = interaction.options.getUser("user");
      const minutes =
        interaction.options.getInteger("minutes");

      const reason =
        interaction.options.getString("reason") ||
        "No reason provided";

      const member =
        await interaction.guild.members
          .fetch(user.id)
          .catch(() => null);

      if (!member) {
        return interaction.reply({
          content: "❌ That member isn't in the server.",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (!canModerateTarget(interaction.member, member)) {
        return interaction.reply({
          content: "❌ You cannot timeout that member.",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (!member.moderatable) {
        return interaction.reply({
          content: "❌ My role is not high enough to timeout them.",
          flags: MessageFlags.Ephemeral,
        });
      }

      await member.timeout(minutes * 60 * 1000, reason);

      return interaction.reply(
        `⏱️ **${user.tag}** was timed out for **${minutes} minutes**.\nReason: ${reason}`
      );
    }

    /* =========================
       WARN
    ========================= */

    if (interaction.commandName === "warn") {
      const user = interaction.options.getUser("user");
      const reason =
        interaction.options.getString("reason");

      const member =
        await interaction.guild.members
          .fetch(user.id)
          .catch(() => null);

      if (member && !canModerateTarget(interaction.member, member)) {
        return interaction.reply({
          content: "❌ You cannot warn that member.",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (!data.warnings[user.id]) {
        data.warnings[user.id] = [];
      }

      data.warnings[user.id].push({
        reason,
        moderator: interaction.user.id,
        date: new Date().toISOString(),
      });

      saveData();

      return interaction.reply(
        `⚠️ **${user.tag}** has been warned.\nReason: ${reason}`
      );
    }

    /* =========================
       WARNINGS
    ========================= */

    if (interaction.commandName === "warnings") {
      const user =
        interaction.options.getUser("user");

      const warnings = data.warnings[user.id] || [];

      if (!warnings.length) {
        return interaction.reply(
          `**${user.tag}** has no warnings.`
        );
      }

      const text = warnings
        .map(
          (w, i) =>
            `**${i + 1}.** ${w.reason}\nModerator: <@${w.moderator}>`
        )
        .join("\n\n");

      return interaction.reply({
        embeds: [
          baseEmbed(
            `⚠️・warnings for ${user.username}`,
            text
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    /* =========================
       CLEAR
    ========================= */

    if (interaction.commandName === "clear") {
      if (
        !interaction.member.permissions.has(
          PermissionsBitField.Flags.ManageMessages
        )
      ) {
        return interaction.reply({
          content: "❌ You need Manage Messages.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const amount =
        interaction.options.getInteger("amount");

      await interaction.channel.bulkDelete(amount, true);

      return interaction.reply({
        content: `🧹 Deleted **${amount}** messages.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    /* =========================
       COINFLIP
    ========================= */

    if (interaction.commandName === "coinflip") {
      const result =
        Math.random() < 0.5 ? "Heads 🪙" : "Tails 🪙";

      return interaction.reply(
        `🪙 The coin landed on **${result}**!`
      );
    }

    /* =========================
       ROLL
    ========================= */

    if (interaction.commandName === "roll") {
      const number =
        Math.floor(Math.random() * 6) + 1;

      return interaction.reply(
        `🎲 You rolled **${number}**!`
      );
    }

    /* =========================
       8BALL
    ========================= */

    if (interaction.commandName === "8ball") {
      const answers = [
        "Yes.",
        "Definitely.",
        "Probably.",
        "Maybe.",
        "Ask again later.",
        "I don't think so.",
        "No.",
        "Absolutely not.",
      ];

      const answer =
        answers[Math.floor(Math.random() * answers.length)];

      return interaction.reply(
        `🎱 **8ball:** ${answer}`
      );
    }

    /* =========================
       RPS
    ========================= */

    if (interaction.commandName === "rps") {
      const choice =
        interaction.options.getString("choice");

      const choices = ["rock", "paper", "scissors"];

      const botChoice =
        choices[Math.floor(Math.random() * choices.length)];

      let result;

      if (choice === botChoice) {
        result = "It's a tie! 🤝";
      } else if (
        (choice === "rock" && botChoice === "scissors") ||
        (choice === "paper" && botChoice === "rock") ||
        (choice === "scissors" && botChoice === "paper")
      ) {
        result = "You win! 🎉";
      } else {
        result = "I win! 😼";
      }

      return interaction.reply(
        `You chose **${choice}**.\nI chose **${botChoice}**.\n\n${result}`
      );
    }

    /* =========================
       WOULD YOU RATHER
    ========================= */

    if (interaction.commandName === "wouldyourather") {
      const questions = [
        "Would you rather be able to fly or become invisible?",
        "Would you rather never use TikTok again or never use Discord again?",
        "Would you rather have unlimited money or unlimited free time?",
        "Would you rather live at the beach or in the mountains?",
        "Would you rather always be early or always be late?",
      ];

      return interaction.reply(
        `💭 **Would you rather...**\n\n${
          questions[Math.floor(Math.random() * questions.length)]
        }`
      );
    }

    /* =========================
       TRIVIA
    ========================= */

    if (interaction.commandName === "trivia") {
      const questions = [
        {
          q: "What planet is known as the Red Planet?",
          a: "Mars",
        },
        {
          q: "How many continents are there?",
          a: "7",
        },
        {
          q: "What is the largest ocean?",
          a: "Pacific Ocean",
        },
        {
          q: "What is the fastest land animal?",
          a: "Cheetah",
        },
      ];

      const question =
        questions[
          Math.floor(Math.random() * questions.length)
        ];

      return interaction.reply({
        embeds: [
          baseEmbed(
            "🧠・trivia",
            `${question.q}\n\nAnswer: **${question.a}**`
          ),
        ],
      });
    }

    /* =========================
       RANK
    ========================= */

    if (interaction.commandName === "rank") {
      const user =
        interaction.options.getUser("user") ||
        interaction.user;

      const stats = getXP(user.id);

      return interaction.reply({
        embeds: [
          baseEmbed(
            `⭐・${user.username}'s rank`,
            [
              `**Level:** ${stats.level}`,
              `**XP:** ${stats.xp}`,
              `**Next level:** ${xpNeeded(stats.level)} XP`,
            ].join("\n")
          ),
        ],
      });
    }

    /* =========================
       LEADERBOARD
    ========================= */

    if (interaction.commandName === "leaderboard") {
      const sorted = Object.entries(data.xp)
        .sort((a, b) => b[1].xp - a[1].xp)
        .slice(0, 10);

      if (!sorted.length) {
        return interaction.reply(
          "⭐ Nobody has earned XP yet."
        );
      }

      const lines = [];

      for (let i = 0; i < sorted.length; i++) {
        const [userId, stats] = sorted[i];

        lines.push(
          `**${i + 1}.** <@${userId}> — Level ${stats.level} • ${stats.xp} XP`
        );
      }

      return interaction.reply({
        embeds: [
          baseEmbed(
            "🏆・leaderboard",
            lines.join("\n")
          ),
        ],
      });
    }

    /* =========================
       PROFILE
    ========================= */

    if (interaction.commandName === "profile") {
      const user =
        interaction.options.getUser("user") ||
        interaction.user;

      const stats = getXP(user.id);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(`♡ ${user.username}`)
            .setThumbnail(user.displayAvatarURL())
            .setDescription(
              data.bios[user.id] ||
                "No bio set yet."
            )
            .addFields(
              {
                name: "Level",
                value: `${stats.level}`,
                inline: true,
              },
              {
                name: "XP",
                value: `${stats.xp}`,
                inline: true,
              },
              {
                name: "Friends",
                value: `${(data.friends[user.id] || []).length}`,
                inline: true,
              }
            )
            .setTimestamp(),
        ],
      });
    }

    /* =========================
       SET BIO
    ========================= */

    if (interaction.commandName === "setbio") {
      const bio =
        interaction.options.getString("bio");

      data.bios[interaction.user.id] = bio;

      saveData();

      return interaction.reply({
        content: "♡ Your bio has been updated.",
        flags: MessageFlags.Ephemeral,
      });
    }

    /* =========================
       FRIEND
    ========================= */

    if (interaction.commandName === "friend") {
      const user =
        interaction.options.getUser("user");

      if (user.id === interaction.user.id) {
        return interaction.reply({
          content: "❌ You can't add yourself.",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (!data.friends[interaction.user.id]) {
        data.friends[interaction.user.id] = [];
      }

      if (
        data.friends[interaction.user.id].includes(
          user.id
        )
      ) {
        return interaction.reply({
          content: "❌ They're already on your friends list.",
          flags: MessageFlags.Ephemeral,
        });
      }

      data.friends[interaction.user.id].push(user.id);

      saveData();

      return interaction.reply(
        `♡ Added **${user.username}** to your friends list!`
      );
    }

    /* =========================
       FRIENDS
    ========================= */

    if (interaction.commandName === "friends") {
      const friends =
        data.friends[interaction.user.id] || [];

      if (!friends.length) {
        return interaction.reply(
          "♡ You don't have any friends added yet."
        );
      }

      return interaction.reply({
        embeds: [
          baseEmbed(
            "🫶・friends",
            friends
              .map((id) => `♡ <@${id}>`)
              .join("\n")
          ),
        ],
      });
    }

    /* =========================
       CONFESS
    ========================= */

    if (interaction.commandName === "confess") {
      const message =
        interaction.options.getString("message");

      const channel =
        findChannel(
          interaction.guild,
          CHANNELS.confessions
        );

      if (!channel) {
        return interaction.reply({
          content: "❌ Confessions channel doesn't exist.",
          flags: MessageFlags.Ephemeral,
        });
      }

      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle("🤫・anonymous confession")
            .setDescription(message)
            .setFooter({ text: "Anonymous" })
            .setTimestamp(),
        ],
      });

      return interaction.reply({
        content: "♡ Your confession was sent anonymously.",
        flags: MessageFlags.Ephemeral,
      });
    }

    /* =========================
       SUGGEST
    ========================= */

    if (interaction.commandName === "suggest") {
      const message =
        interaction.options.getString("suggestion");

      const channel =
        findChannel(
          interaction.guild,
          CHANNELS.suggestions
        );

      if (!channel) {
        return interaction.reply({
          content: "❌ Suggestions channel doesn't exist.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const sent = await channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle("💡・new suggestion")
            .setDescription(message)
            .setFooter({
              text: `Suggested by ${interaction.user.username}`,
            })
            .setTimestamp(),
        ],
      });

      await sent.react("👍");
      await sent.react("👎");

      return interaction.reply({
        content: "💡 Your suggestion was posted.",
        flags: MessageFlags.Ephemeral,
      });
    }
  } catch (error) {
    console.error("Interaction error:", error);

    if (interaction.isRepliable()) {
      try {
        if (interaction.deferred) {
          await interaction.editReply(
            "❌ Something went wrong while running that."
          );
        } else if (!interaction.replied) {
          await interaction.reply({
            content: "❌ Something went wrong.",
            flags: MessageFlags.Ephemeral,
          });
        }
      } catch {}
    }
  }
});

/* =========================
   XP SYSTEM
========================= */

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  if (!data.xp[message.author.id]) {
    data.xp[message.author.id] = {
      xp: 0,
      level: 0,
      lastXP: 0,
    };
  }

  const stats = data.xp[message.author.id];

  const now = Date.now();

  if (now - (stats.lastXP || 0) < 60000) {
    return;
  }

  stats.lastXP = now;

  const oldLevel = calculateLevel(stats.xp);

  stats.xp += Math.floor(Math.random() * 11) + 10;

  const newLevel = calculateLevel(stats.xp);

  stats.level = newLevel;

  saveData();

  if (newLevel > oldLevel) {
    const levelChannel =
      client.channels.cache.get(data.levelChannel);

    if (levelChannel) {
      await levelChannel.send(
        `🎉 <@${message.author.id}> just reached **Level ${newLevel}**!`
      );
    }

    const levelRole = findRole(
      message.guild,
      `Level ${newLevel}`
    );

    if (levelRole) {
      try {
        await message.member.roles.add(levelRole);
      } catch {}
    }
  }
});

/* =========================
   STARBOARD
========================= */

client.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot) return;

  try {
    if (reaction.partial) {
      await reaction.fetch();
    }

    if (reaction.emoji.name !== "⭐") return;

    if (reaction.count < 3) return;

    const message = reaction.message;

    if (message.partial) {
      await message.fetch();
    }

    const starboard =
      client.channels.cache.get(
        data.starboardChannel
      );

    if (!starboard) return;

    const key = `star_${message.id}`;

    if (data[key]) return;

    data[key] = true;
    saveData();

    await starboard.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("⭐・starboard")
          .setDescription(message.content || "*No text*")
          .addFields({
            name: "Message",
            value: `[Jump to message](${message.url})`,
          })
          .setAuthor({
            name: message.author.username,
            iconURL: message.author.displayAvatarURL(),
          })
          .setTimestamp(),
      ],
    });
  } catch (error) {
    console.error("Starboard error:", error);
  }
});

/* =========================
   MEMBER JOIN
========================= */

client.on("guildMemberAdd", async (member) => {
  try {
    const role = findRole(member.guild, MEMBER_ROLE);

    if (role) {
      await member.roles.add(role);
    }

    const channel =
      findChannel(
        member.guild,
        CHANNELS.introductions
      );

    if (channel) {
      await channel.send(
        `♡ Welcome <@${member.id}> to **${member.guild.name}**!\n\nIntroduce yourself and say hi!`
      );
    }
  } catch (error) {
    console.error("Welcome error:", error);
  }
});

/* =========================
   BOOST SYSTEM
========================= */

client.on("guildMemberUpdate", async (oldMember, newMember) => {
  try {
    const boosterRole =
      findRole(newMember.guild, BOOSTER_ROLE);

    if (!boosterRole) return;

    const wasBoosting = Boolean(oldMember.premiumSince);
    const isBoosting = Boolean(newMember.premiumSince);

    if (!wasBoosting && isBoosting) {
      await newMember.roles.add(boosterRole);

      const channel =
        findChannel(
          newMember.guild,
          CHANNELS.boosts
        );

      if (channel) {
        await channel.send(
          `🌸 Thank you <@${newMember.id}> for boosting the server! ♡`
        );
      }
    }

    if (wasBoosting && !isBoosting) {
      await newMember.roles.remove(boosterRole);
    }
  } catch (error) {
    console.error("Boost error:", error);
  }
});

/* =========================
   LOGIN
========================= */

client.login(TOKEN);