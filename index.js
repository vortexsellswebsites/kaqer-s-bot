const {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  SlashCommandBuilder
} = require("discord.js");

const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const DATA_FILE = "./data.json";

let data = {
  xp: {},
  warnings: {},
  bios: {},
  friends: {},
  tickets: {},
  channels: {},
  sendUsed: false
};

if (fs.existsSync(DATA_FILE)) {
  try {
    data = {
      ...data,
      ...JSON.parse(fs.readFileSync(DATA_FILE, "utf8"))
    };
  } catch {
    console.log("Could not read data.json, using fresh data.");
  }
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

/* =========================
   ROLES
========================= */

const ROLES = [
  // Basic
  {
    name: "Member",
    color: 0xffdce8
  },

  // Self roles
  {
    name: "୨୧・she/her",
    color: 0xffb6d5
  },
  {
    name: "୨୧・he/him",
    color: 0xaecbff
  },
  {
    name: "୨୧・they/them",
    color: 0xcdb4ff
  },
  {
    name: "୨୧・any pronouns",
    color: 0xffd6a5
  },

  {
    name: "୨୧・minor",
    color: 0xffe0b5
  },

  // Interests
  {
    name: "୨୧・artist",
    color: 0xffbde0
  },
  {
    name: "୨୧・music",
    color: 0xd9c2ff
  },
  {
    name: "୨୧・anime",
    color: 0xffc7ce
  },
  {
    name: "୨୧・creator",
    color: 0xc7e9ff
  },
  {
    name: "୨୧・developer",
    color: 0xc8f7dc
  },

  // Vibes
  {
    name: "୨୧・social",
    color: 0xffc6e0
  },
  {
    name: "୨୧・introvert",
    color: 0xd9d2ff
  },
  {
    name: "୨୧・extrovert",
    color: 0xffd1b8
  },
  {
    name: "୨୧・active",
    color: 0xffefb5
  },

  // Notification roles
  {
    name: "୨୧・announcements",
    color: 0xffc8dd
  },
  {
    name: "୨୧・events",
    color: 0xffd0f0
  },
  {
    name: "୨୧・giveaways",
    color: 0xfff1c7
  },
  {
    name: "୨୧・polls",
    color: 0xcde7ff
  },
  {
    name: "୨୧・vc",
    color: 0xd5f5e3
  },

  // Server roles
  {
    name: "🌸・booster",
    color: 0xff9fbe
  },
  {
    name: "💎・vip",
    color: 0x9dbbff
  },
  {
    name: "🎀・friend",
    color: 0xffa8c8
  },
  {
    name: "💜・partner",
    color: 0xc7a5ff
  },
  {
    name: "💫・supporter",
    color: 0xffd48a
  },
  {
    name: "🫶・trusted",
    color: 0xffc4d6
  },
  {
    name: "⭐・active",
    color: 0xffe18a
  },
  {
    name: "🕰️・og",
    color: 0xb9a8ff
  },

  // Staff
  {
    name: "🔨・staff",
    color: 0x8c9eff
  },
  {
    name: "🛡️・mod",
    color: 0x7289da
  },
  {
    name: "⚡・admin",
    color: 0xffc857
  },
  {
    name: "👑・owner",
    color: 0xff7eb6
  }
];

/* =========================
   CHANNEL STRUCTURE
========================= */

const STRUCTURE = [
  {
    category: "001・INFO",
    channels: [
      "୨୧・rules",
      "୨୧・announcements",
      "୨୧・server-info",
      "୨୧・welcome",
      "୨୧・goodbye",
      "୨୧・introductions",
      "୨୧・roles",
      "୨୧・boosts",
      "୨୧・partnerships"
    ]
  },

  {
    category: "002・COMMUNITY",
    channels: [
      "୨୧・chat",
      "୨୧・make-friends",
      "୨୧・media",
      "୨୧・memes",
      "୨୧・suggestions"
    ]
  },

  {
    category: "003・EXTRAS",
    channels: [
      "୨୧・levels",
      "୨୧・starboard",
      "୨୧・confessions",
      "୨୧・support"
    ]
  },

  {
    category: "004・TICKETS",
    channels: []
  },

  {
    category: "005・STAFF",
    channels: [
      "୨୧・staff-chat"
    ]
  }
];

/* =========================
   HELPERS
========================= */

function getRole(guild, name) {
  return guild.roles.cache.find(r => r.name === name);
}

function getChannel(guild, name) {
  return guild.channels.cache.find(c => c.name === name);
}

function getStaffRoles(guild) {
  return [
    getRole(guild, "🔨・staff"),
    getRole(guild, "🛡️・mod"),
    getRole(guild, "⚡・admin"),
    getRole(guild, "👑・owner")
  ].filter(Boolean);
}

function isOwner(member) {
  return (
    member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    member.roles.cache.some(r => r.name === "👑・owner")
  );
}

function isStaff(member) {
  return (
    member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    member.roles.cache.some(r =>
      [
        "🔨・staff",
        "🛡️・mod",
        "⚡・admin",
        "👑・owner"
      ].includes(r.name)
    )
  );
}

function canModerate(member, target) {
  if (!target) return false;
  if (target.id === member.id) return false;
  if (target.id === target.guild.ownerId) return false;

  return member.roles.highest.position > target.roles.highest.position;
}

function roleButton(role, emoji) {
  return new ButtonBuilder()
    .setCustomId(`selfrole_${role.id}`)
    .setLabel(role.name.replace("୨୧・", ""))
    .setEmoji(emoji)
    .setStyle(ButtonStyle.Secondary);
}

/* =========================
   RESET
========================= */

let resetting = false;

async function resetServer(guild) {
  if (resetting) return;

  resetting = true;

  try {
    data.channels = {};
    saveData();

    console.log("Starting server reset...");

    /* Delete channels */

    for (const channel of [...guild.channels.cache.values()]) {
      try {
        await channel.delete("Server reset");
      } catch {}
    }

    /* Delete roles */

    const botMember = guild.members.me;
    const botPosition = botMember?.roles?.highest?.position ?? 0;

    for (const role of [...guild.roles.cache.values()]) {
      if (
        role.id === guild.id ||
        role.managed ||
        role.position >= botPosition
      ) {
        continue;
      }

      try {
        await role.delete("Server reset");
      } catch {}
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    /* Create/reuse roles */

    const createdRoles = {};

    for (const roleInfo of ROLES) {
      let role = guild.roles.cache.find(
        r => r.name === roleInfo.name && !r.managed
      );

      if (!role) {
        try {
          role = await guild.roles.create({
            name: roleInfo.name,
            color: roleInfo.color,
            reason: "Server setup"
          });
        } catch (err) {
          console.log(`Could not create role ${roleInfo.name}:`, err.message);
          continue;
        }
      }

      createdRoles[roleInfo.name] = role;
    }

    /* Create categories and channels */

    const categories = {};

    for (const section of STRUCTURE) {
      let category = guild.channels.cache.find(
        c =>
          c.name === section.category &&
          c.type === ChannelType.GuildCategory
      );

      if (!category) {
        category = await guild.channels.create({
          name: section.category,
          type: ChannelType.GuildCategory
        });
      }

      categories[section.category] = category;

      for (const channelName of section.channels) {
        let channel = guild.channels.cache.find(
          c =>
            c.name === channelName &&
            c.type === ChannelType.GuildText
        );

        if (!channel) {
          channel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: category.id
          });
        } else if (channel.parentId !== category.id) {
          try {
            await channel.setParent(category.id);
          } catch {}
        }

        data.channels[channelName] = channel.id;
      }
    }

    saveData();

    /* Lock informational channels */

    const readOnly = [
      "୨୧・rules",
      "୨୧・announcements",
      "୨୧・server-info",
      "୨୧・welcome",
      "୨୧・goodbye",
      "୨୧・roles",
      "୨୧・boosts",
      "୨୧・partnerships",
      "୨୧・levels",
      "୨୧・starboard",
      "୨୧・confessions",
      "୨୧・support"
    ];

    for (const name of readOnly) {
      const channel = getChannel(guild, name);
      if (!channel) continue;

      try {
        await channel.permissionOverwrites.edit(guild.roles.everyone, {
          SendMessages: false
        });
      } catch {}
    }

    /* Staff chat permissions */

    const staffChat = getChannel(guild, "୨୧・staff-chat");

    if (staffChat) {
      try {
        await staffChat.permissionOverwrites.edit(
          guild.roles.everyone,
          {
            ViewChannel: false
          }
        );

        for (const role of getStaffRoles(guild)) {
          await staffChat.permissionOverwrites.edit(role, {
            ViewChannel: true,
            SendMessages: true
          });
        }
      } catch {}
    }

    /* Panels */

    await setupRules(guild);
    await setupServerInfo(guild);
    await setupRoles(guild);
    await setupIntroductions(guild);
    await setupAnnouncements(guild);
    await setupWelcome(guild);
    await setupGoodbye(guild);
    await setupBoosts(guild);
    await setupPartnerships(guild);
    await setupMakeFriends(guild);
    await setupSuggestions(guild);
    await setupConfessions(guild);
    await setupSupport(guild);
    await setupStaffChat(guild);

    console.log("Server reset complete.");
  } finally {
    resetting = false;
  }
}

/* =========================
   PANELS
========================= */

async function clearAndSend(channel, message) {
  if (!channel) return;

  try {
    const messages = await channel.messages.fetch({ limit: 50 });

    if (messages.size) {
      await channel.bulkDelete(messages, true);
    }
  } catch {}

  await channel.send(message);
}

async function setupRules(guild) {
  const channel = getChannel(guild, "୨୧・rules");
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle("♡ server rules")
    .setDescription(
      [
        "welcome to the server ♡",
        "",
        "୨୧ be respectful",
        "୨୧ no harassment or bullying",
        "୨୧ no spam or flooding",
        "୨୧ no unwanted advertising",
        "୨୧ keep things appropriate",
        "୨୧ respect staff decisions",
        "୨୧ don't share private information",
        "୨୧ use channels for their intended purpose",
        "",
        "have fun and be nice to everyone ♡"
      ].join("\n")
    )
    .setFooter({ text: "♡ thank you for keeping the server comfy" });

  await clearAndSend(channel, { embeds: [embed] });
}

async function setupServerInfo(guild) {
  const channel = getChannel(guild, "୨୧・server-info");
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle("୨୧ server info")
    .setDescription(
      [
        "♡ welcome to our little community!",
        "",
        "use `/profile` to view your profile.",
        "use `/setbio` to set your bio.",
        "",
        "need help?",
        "use the support panel or contact staff.",
        "",
        "make friends, chat, share media and have fun ♡"
      ].join("\n")
    );

  await clearAndSend(channel, { embeds: [embed] });
}

async function setupRoles(guild) {
  const channel = getChannel(guild, "୨୧・roles");
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle("୨୧ choose your roles")
    .setDescription(
      [
        "click a button to get or remove a role.",
        "",
        "♡ **PRONOUNS**",
        "choose whichever fits you.",
        "",
        "✿ **AGE**",
        "minor role only — no adult/18+ roles.",
        "",
        "୨୧ **INTERESTS**",
        "show people what you're into.",
        "",
        "☁ **VIBES**",
        "pick the vibe that fits you.",
        "",
        "☆ **NOTIFICATIONS**",
        "choose which notifications you want."
      ].join("\n")
    );

  const pronouns = [
    ["୨୧・she/her", "🌸"],
    ["୨୧・he/him", "💙"],
    ["୨୧・they/them", "💜"],
    ["୨୧・any pronouns", "🎀"]
  ];

  const interests = [
    ["୨୧・artist", "🎨"],
    ["୨୧・music", "🎵"],
    ["୨୧・anime", "🌸"],
    ["୨୧・creator", "✨"],
    ["୨୧・developer", "💻"]
  ];

  const vibes = [
    ["୨୧・social", "💬"],
    ["୨୧・introvert", "☁️"],
    ["୨୧・extrovert", "💗"],
    ["୨୧・active", "⭐"]
  ];

  const notifications = [
    ["୨୧・announcements", "📢"],
    ["୨୧・events", "🎉"],
    ["୨୧・giveaways", "🎁"],
    ["୨୧・polls", "📊"],
    ["୨୧・vc", "🎙️"]
  ];

  const makeRow = list => {
    return new ActionRowBuilder().addComponents(
      list
        .map(([name, emoji]) => {
          const role = getRole(guild, name);
          return role ? roleButton(role, emoji) : null;
        })
        .filter(Boolean)
    );
  };

  const minor = getRole(guild, "୨୧・minor");

  await clearAndSend(channel, {
    embeds: [embed],
    components: [
      makeRow(pronouns),
      new ActionRowBuilder().addComponents(
        minor
          ? roleButton(minor, "🧸")
          : new ButtonBuilder()
              .setCustomId("unused")
              .setLabel("minor")
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true)
      ),
      makeRow(interests),
      makeRow(vibes),
      makeRow(notifications)
    ]
  });
}

async function setupIntroductions(guild) {
  const channel = getChannel(guild, "୨୧・introductions");
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle("♡ introduce yourself")
    .setDescription(
      "tell everyone a little about yourself!\n\n" +
      "♡ name / nickname\n" +
      "♡ interests\n" +
      "♡ favorite music\n" +
      "♡ games or hobbies\n" +
      "♡ anything else you want people to know"
    );

  await clearAndSend(channel, { embeds: [embed] });
}

async function setupAnnouncements(guild) {
  const channel = getChannel(guild, "୨୧・announcements");
  if (!channel) return;

  await clearAndSend(channel, {
    embeds: [
      new EmbedBuilder()
        .setTitle("୨୧ announcements")
        .setDescription("official server announcements will appear here ♡")
    ]
  });
}

async function setupWelcome(guild) {
  const channel = getChannel(guild, "୨୧・welcome");
  if (!channel) return;

  await clearAndSend(channel, {
    embeds: [
      new EmbedBuilder()
        .setTitle("🌸 welcome")
        .setDescription("new members will be welcomed here automatically ♡")
    ]
  });
}

async function setupGoodbye(guild) {
  const channel = getChannel(guild, "୨୧・goodbye");
  if (!channel) return;

  await clearAndSend(channel, {
    embeds: [
      new EmbedBuilder()
        .setTitle("☁ goodbye")
        .setDescription("member departures will appear here.")
    ]
  });
}

async function setupBoosts(guild) {
  const channel = getChannel(guild, "୨୧・boosts");
  if (!channel) return;

  await clearAndSend(channel, {
    embeds: [
      new EmbedBuilder()
        .setTitle("🌸 server boosters")
        .setDescription("thank you to everyone who supports the server ♡")
    ]
  });
}

async function setupPartnerships(guild) {
  const channel = getChannel(guild, "୨୧・partnerships");
  if (!channel) return;

  const button = new ButtonBuilder()
    .setCustomId("partnership")
    .setLabel("apply for partnership")
    .setEmoji("💜")
    .setStyle(ButtonStyle.Secondary);

  await clearAndSend(channel, {
    embeds: [
      new EmbedBuilder()
        .setTitle("💜 partnerships")
        .setDescription(
          "want to partner with the server?\n\n" +
          "click the button below to submit an application."
        )
    ],
    components: [
      new ActionRowBuilder().addComponents(button)
    ]
  });
}

async function setupMakeFriends(guild) {
  const channel = getChannel(guild, "୨୧・make-friends");
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle("୨୧ make friends")
    .setDescription(
      [
        "looking for new people to talk to? ♡",
        "",
        "tell everyone:",
        "♡ what you're into",
        "♡ your favorite music",
        "♡ your hobbies",
        "♡ what kind of people you'd like to meet",
        "",
        "please don't spam or pressure anyone to respond.",
        "respect boundaries and keep things friendly ♡"
      ].join("\n")
    );

  await clearAndSend(channel, { embeds: [embed] });
}

async function setupSuggestions(guild) {
  const channel = getChannel(guild, "୨୧・suggestions");
  if (!channel) return;

  await clearAndSend(channel, {
    embeds: [
      new EmbedBuilder()
        .setTitle("୨୧ suggestions")
        .setDescription(
          "have an idea for the server?\n\n" +
          "use `/suggest` and your suggestion will appear here.\n\n" +
          "react with 👍 or 👎 to vote."
        )
    ]
  });
}

async function setupConfessions(guild) {
  const channel = getChannel(guild, "୨୧・confessions");
  if (!channel) return;

  await clearAndSend(channel, {
    embeds: [
      new EmbedBuilder()
        .setTitle("♡ anonymous confessions")
        .setDescription(
          "use `/confess` to anonymously send a confession."
        )
    ]
  });
}

async function setupSupport(guild) {
  const channel = getChannel(guild, "୨୧・support");
  if (!channel) return;

  const button = new ButtonBuilder()
    .setCustomId("support_ticket")
    .setLabel("open support ticket")
    .setEmoji("🫶")
    .setStyle(ButtonStyle.Secondary);

  await clearAndSend(channel, {
    embeds: [
      new EmbedBuilder()
        .setTitle("🫶 support")
        .setDescription(
          "need help with something?\n\n" +
          "open a private ticket and staff will help you."
        )
    ],
    components: [
      new ActionRowBuilder().addComponents(button)
    ]
  });
}

async function setupStaffChat(guild) {
  const channel = getChannel(guild, "୨୧・staff-chat");
  if (!channel) return;

  await clearAndSend(channel, {
    embeds: [
      new EmbedBuilder()
        .setTitle("🛡️ staff chat")
        .setDescription(
          "private staff discussion channel.\n\n" +
          "staff, moderators, admins and the owner can see this channel."
        )
    ]
  });
}

/* =========================
   COMMANDS
========================= */

const commands = [

  new SlashCommandBuilder()
    .setName("resetserver")
    .setDescription("Completely rebuild the server")
    .setDefaultMemberPermissions(
      PermissionsBitField.Flags.Administrator
    ),

  new SlashCommandBuilder()
    .setName("send")
    .setDescription("Send a message to a channel — one time only")
    .addChannelOption(option =>
      option
        .setName("channel")
        .setDescription("Channel to send the message in")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("message")
        .setDescription("Message to send")
        .setRequired(true)
        .setMaxLength(2000)
    ),

  new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Flip a coin"),

  new SlashCommandBuilder()
    .setName("roll")
    .setDescription("Roll a dice"),

  new SlashCommandBuilder()
    .setName("8ball")
    .setDescription("Ask the magic 8ball")
    .addStringOption(option =>
      option
        .setName("question")
        .setDescription("Your question")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("rps")
    .setDescription("Play rock paper scissors")
    .addStringOption(option =>
      option
        .setName("choice")
        .setDescription("Your choice")
        .setRequired(true)
        .addChoices(
          { name: "rock", value: "rock" },
          { name: "paper", value: "paper" },
          { name: "scissors", value: "scissors" }
        )
    ),

  new SlashCommandBuilder()
    .setName("wouldyourather")
    .setDescription("Get a would-you-rather question"),

  new SlashCommandBuilder()
    .setName("trivia")
    .setDescription("Get a trivia question"),

  new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Check your level"),

  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("View the XP leaderboard"),

  new SlashCommandBuilder()
    .setName("profile")
    .setDescription("View your profile")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("User to view")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("setbio")
    .setDescription("Set your profile bio")
    .addStringOption(option =>
      option
        .setName("bio")
        .setDescription("Your bio")
        .setRequired(true)
        .setMaxLength(200)
    ),

  new SlashCommandBuilder()
    .setName("friend")
    .setDescription("Add someone as a friend")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Friend")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("friends")
    .setDescription("View your friends"),

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member")
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
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member")
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
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout a member")
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
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(40320)
    ),

  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a member")
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
    .setDescription("View member warnings")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Member")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Delete messages")
    .addIntegerOption(option =>
      option
        .setName("amount")
        .setDescription("Number of messages")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    ),

  new SlashCommandBuilder()
    .setName("confess")
    .setDescription("Send an anonymous confession"),

  new SlashCommandBuilder()
    .setName("suggest")
    .setDescription("Make a server suggestion")
    .addStringOption(option =>
      option
        .setName("suggestion")
        .setDescription("Your suggestion")
        .setRequired(true)
        .setMaxLength(1000)
    )

];

/* =========================
   READY
========================= */

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    const existingCommands =
      await client.application.commands.fetch();

    const sendCommand = existingCommands.find(
      c => c.name === "send"
    );

    /*
      If /send has already been used, don't register it again.
    */

    const commandsToRegister = commands.filter(command => {
      if (command.name === "send" && data.sendUsed) {
        return false;
      }

      return true;
    });

    await client.application.commands.set(
      commandsToRegister.map(c => c.toJSON())
    );

    console.log("Slash commands registered.");

  } catch (err) {
    console.error("Command registration error:", err);
  }
});

/* =========================
   INTERACTIONS
========================= */

client.on("interactionCreate", async interaction => {

  if (interaction.isButton()) {

    /* Self roles */

    if (interaction.customId.startsWith("selfrole_")) {
      const roleId = interaction.customId.replace(
        "selfrole_",
        ""
      );

      const role = interaction.guild.roles.cache.get(roleId);

      if (!role) {
        return interaction.reply({
          content: "That role no longer exists.",
          ephemeral: true
        });
      }

      if (interaction.member.roles.cache.has(role.id)) {
        await interaction.member.roles.remove(role);

        return interaction.reply({
          content: `Removed **${role.name}** ♡`,
          ephemeral: true
        });
      }

      await interaction.member.roles.add(role);

      return interaction.reply({
        content: `Added **${role.name}** ♡`,
        ephemeral: true
      });
    }

    /* Support ticket */

    if (interaction.customId === "support_ticket") {
      const guild = interaction.guild;

      const existing = guild.channels.cache.find(
        c =>
          c.name === `support-${interaction.user.id}` &&
          c.type === ChannelType.GuildText
      );

      if (existing) {
        return interaction.reply({
          content: `You already have a ticket: ${existing}`,
          ephemeral: true
        });
      }

      const staffRoles = getStaffRoles(guild);

      const overwrites = [
        {
          id: guild.roles.everyone.id,
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
      ];

      for (const role of staffRoles) {
        overwrites.push({
          id: role.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        });
      }

      const category = getChannel(guild, "004・TICKETS");

      const ticket = await guild.channels.create({
        name: `support-${interaction.user.username}`
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "")
          .slice(0, 20),
        type: ChannelType.GuildText,
        parent: category?.id,
        permissionOverwrites: overwrites
      });

      const closeButton = new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("close ticket")
        .setEmoji("🔒")
        .setStyle(ButtonStyle.Danger);

      await ticket.send({
        content: `${interaction.user}`,
        embeds: [
          new EmbedBuilder()
            .setTitle("🫶 support ticket")
            .setDescription(
              "tell staff what you need help with.\n\n" +
              "a staff member will be with you soon ♡"
            )
        ],
        components: [
          new ActionRowBuilder().addComponents(closeButton)
        ]
      });

      return interaction.reply({
        content: `Your ticket has been created: ${ticket}`,
        ephemeral: true
      });
    }

    /* Close ticket */

    if (interaction.customId === "close_ticket") {
      if (!isStaff(interaction.member)) {
        return interaction.reply({
          content: "You need a staff role to close tickets.",
          ephemeral: true
        });
      }

      await interaction.reply({
        content: "🔒 Closing ticket..."
      });

      setTimeout(() => {
        interaction.channel.delete().catch(() => {});
      }, 1500);

      return;
    }

    /* Partnership */

    if (interaction.customId === "partnership") {
      const modal = new ModalBuilder()
        .setCustomId("partnership_modal")
        .setTitle("partnership application");

      const serverName = new TextInputBuilder()
        .setCustomId("server_name")
        .setLabel("server name")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const serverInvite = new TextInputBuilder()
        .setCustomId("server_invite")
        .setLabel("server invite")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const members = new TextInputBuilder()
        .setCustomId("member_count")
        .setLabel("member count")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(serverName),
        new ActionRowBuilder().addComponents(serverInvite),
        new ActionRowBuilder().addComponents(members)
      );

      return interaction.showModal(modal);
    }
  }

  if (interaction.isModalSubmit()) {

    if (interaction.customId === "partnership_modal") {
      const guild = interaction.guild;

      const category = getChannel(guild, "004・TICKETS");

      const name = interaction.fields.getTextInputValue("server_name");
      const invite = interaction.fields.getTextInputValue("server_invite");
      const members = interaction.fields.getTextInputValue("member_count");

      const overwrites = [
        {
          id: guild.roles.everyone.id,
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
      ];

      for (const role of getStaffRoles(guild)) {
        overwrites.push({
          id: role.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        });
      }

      const ticket = await guild.channels.create({
        name: `partner-${interaction.user.username}`
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "")
          .slice(0, 20),
        type: ChannelType.GuildText,
        parent: category?.id,
        permissionOverwrites: overwrites
      });

      await ticket.send({
        content: `${interaction.user}`,
        embeds: [
          new EmbedBuilder()
            .setTitle("💜 partnership application")
            .addFields(
              {
                name: "server",
                value: name
              },
              {
                name: "invite",
                value: invite
              },
              {
                name: "members",
                value: members
              }
            )
        ]
      });

      return interaction.reply({
        content: `Partnership ticket created: ${ticket}`,
        ephemeral: true
      });
    }

    if (interaction.customId === "confession_modal") {
      const confession =
        interaction.fields.getTextInputValue("confession");

      const channel = getChannel(
        interaction.guild,
        "୨୧・confessions"
      );

      if (!channel) {
        return interaction.reply({
          content: "The confession channel doesn't exist.",
          ephemeral: true
        });
      }

      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle("♡ anonymous confession")
            .setDescription(confession)
            .setFooter({ text: "anonymous" })
        ]
      });

      return interaction.reply({
        content: "Your confession was sent anonymously ♡",
        ephemeral: true
      });
    }
  }

  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  /* =========================
     /SEND — ONE TIME ONLY
  ========================= */

  if (commandName === "send") {

    if (!isOwner(interaction.member)) {
      return interaction.reply({
        content: "👑 Only the owner can use this command.",
        ephemeral: true
      });
    }

    if (data.sendUsed) {
      return interaction.reply({
        content: "❌ `/send` has already been used.",
        ephemeral: true
      });
    }

    const channel = interaction.options.getChannel("channel");
    const message = interaction.options.getString("message");

    if (!channel || channel.type !== ChannelType.GuildText) {
      return interaction.reply({
        content: "❌ Choose a text channel.",
        ephemeral: true
      });
    }

    try {
      await channel.send(message);

      data.sendUsed = true;
      saveData();

      /*
        Delete /send from Discord's command list.
      */

      try {
        const command =
          await client.application.commands.fetch();

        const sendCommand = command.find(
          c => c.name === "send"
        );

        if (sendCommand) {
          await sendCommand.delete();
        }
      } catch (err) {
        console.log(
          "Could not remove /send:",
          err.message
        );
      }

      return interaction.reply({
        content:
          `✅ Sent the message to ${channel}.\n` +
          `🔒 `/send` has now been permanently used and removed.`,
        ephemeral: true
      });

    } catch (err) {
      console.error(err);

      return interaction.reply({
        content: "❌ I couldn't send the message there.",
        ephemeral: true
      });
    }
  }

  /* =========================
     RESET
  ========================= */

  if (commandName === "resetserver") {

    if (!isOwner(interaction.member)) {
      return interaction.reply({
        content: "👑 Only the owner can reset the server.",
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      await resetServer(interaction.guild);

      await interaction.editReply(
        "✅ Server completely rebuilt.\n\n" +
        "♡ channels created\n" +
        "♡ roles created\n" +
        "♡ welcome/goodbye enabled\n" +
        "♡ staff chat created\n" +
        "♡ role menu installed\n" +
        "♡ no games channel\n" +
        "♡ no 18+ role"
      );
    } catch (err) {
      console.error(err);

      await interaction.editReply(
        "❌ Something went wrong while rebuilding the server."
      );
    }

    return;
  }

  /* =========================
     FUN COMMANDS
  ========================= */

  if (commandName === "coinflip") {
    const result = Math.random() < 0.5 ? "heads" : "tails";

    return interaction.reply(
      `🪙 You flipped **${result}**!`
    );
  }

  if (commandName === "roll") {
    const number = Math.floor(Math.random() * 100) + 1;

    return interaction.reply(
      `🎲 You rolled **${number}**!`
    );
  }

  if (commandName === "8ball") {
    const answers = [
      "yes ♡",
      "no 😭",
      "probably",
      "probably not",
      "definitely",
      "not looking good...",
      "ask again later",
      "maybe",
      "100%"
    ];

    const answer =
      answers[Math.floor(Math.random() * answers.length)];

    return interaction.reply(
      `🎱 **${answer}**`
    );
  }

  if (commandName === "rps") {
    const choices = ["rock", "paper", "scissors"];

    const userChoice =
      interaction.options.getString("choice");

    const botChoice =
      choices[Math.floor(Math.random() * choices.length)];

    let result;

    if (userChoice === botChoice) {
      result = "tie!";
    } else if (
      (userChoice === "rock" && botChoice === "scissors") ||
      (userChoice === "paper" && botChoice === "rock") ||
      (userChoice === "scissors" && botChoice === "paper")
    ) {
      result = "you win! ♡";
    } else {
      result = "I win 😭";
    }

    return interaction.reply(
      `✊ **${userChoice}** vs **${botChoice}**\n${result}`
    );
  }

  if (commandName === "wouldyourather") {
    const questions = [
      "Would you rather be able to fly or become invisible?",
      "Would you rather have unlimited money or unlimited free time?",
      "Would you rather live in the future or the past?",
      "Would you rather never use social media again or never watch TV again?",
      "Would you rather always be 10 minutes late or 20 minutes early?"
    ];

    return interaction.reply(
      `♡ **Would you rather...**\n\n${
        questions[Math.floor(Math.random() * questions.length)]
      }`
    );
  }

  if (commandName === "trivia") {
    const trivia = [
      ["What planet is known as the Red Planet?", "Mars"],
      ["How many sides does a hexagon have?", "6"],
      ["What is the largest ocean?", "Pacific Ocean"],
      ["What animal is known as the king of the jungle?", "Lion"],
      ["How many continents are there?", "7"]
    ];

    const [question, answer] =
      trivia[Math.floor(Math.random() * trivia.length)];

    return interaction.reply(
      `🧠 **Trivia:** ${question}\n\nAnswer: ||${answer}||`
    );
  }

  /* =========================
     XP
  ========================= */

  if (commandName === "rank") {
    const id = interaction.user.id;

    if (!data.xp[id]) {
      data.xp[id] = {
        xp: 0,
        level: 1
      };
    }

    const userData = data.xp[id];

    return interaction.reply(
      `⭐ **${interaction.user.username}**\n` +
      `Level: **${userData.level}**\n` +
      `XP: **${userData.xp}**`
    );
  }

  if (commandName === "leaderboard") {
    const entries = Object.entries(data.xp)
      .sort((a, b) => b[1].xp - a[1].xp)
      .slice(0, 10);

    if (!entries.length) {
      return interaction.reply("Nobody has XP yet 😭");
    }

    let text = "";

    for (let i = 0; i < entries.length; i++) {
      const user = await client.users.fetch(entries[i][0])
        .catch(() => null);

      if (!user) continue;

      text += `${i + 1}. **${user.username}** — ${entries[i][1].xp} XP\n`;
    }

    return interaction.reply(
      `🏆 **XP Leaderboard**\n\n${text}`
    );
  }

  /* =========================
     PROFILE
  ========================= */

  if (commandName === "profile") {
    const user =
      interaction.options.getUser("user") ||
      interaction.user;

    if (!data.xp[user.id]) {
      data.xp[user.id] = {
        xp: 0,
        level: 1
      };
    }

    const userData = data.xp[user.id];

    const embed = new EmbedBuilder()
      .setTitle(`♡ ${user.username}`)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        {
          name: "bio",
          value: data.bios[user.id] || "No bio set."
        },
        {
          name: "level",
          value: `${userData.level}`
        },
        {
          name: "xp",
          value: `${userData.xp}`
        }
      );

    return interaction.reply({
      embeds: [embed]
    });
  }

  if (commandName === "setbio") {
    const bio = interaction.options.getString("bio");

    data.bios[interaction.user.id] = bio;
    saveData();

    return interaction.reply({
      content: "♡ Your bio has been updated!",
      ephemeral: true
    });
  }

  /* =========================
     FRIENDS
  ========================= */

  if (commandName === "friend") {
    const user = interaction.options.getUser("user");

    if (user.id === interaction.user.id) {
      return interaction.reply({
        content: "You can't add yourself 😭",
        ephemeral: true
      });
    }

    if (!data.friends[interaction.user.id]) {
      data.friends[interaction.user.id] = [];
    }

    if (!data.friends[interaction.user.id].includes(user.id)) {
      data.friends[interaction.user.id].push(user.id);
    }

    saveData();

    return interaction.reply(
      `🫶 Added **${user.username}** to your friends!`
    );
  }

  if (commandName === "friends") {
    const friends = data.friends[interaction.user.id] || [];

    if (!friends.length) {
      return interaction.reply(
        "You don't have any saved friends yet ♡"
      );
    }

    const names = [];

    for (const id of friends) {
      const user = await client.users.fetch(id)
        .catch(() => null);

      if (user) names.push(`♡ ${user.username}`);
    }

    return interaction.reply(
      `🫶 **Your friends**\n\n${names.join("\n")}`
    );
  }

  /* =========================
     MODERATION
  ========================= */

  if (
    ["kick", "timeout", "warn", "warnings", "clear"].includes(
      commandName
    )
  ) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({
        content: "🛡️ You need a staff role to use this.",
        ephemeral: true
      });
    }
  }

  if (commandName === "ban") {
    if (!isOwner(interaction.member)) {
      return interaction.reply({
        content: "👑 Only the owner can ban members.",
        ephemeral: true
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

    if (!member) {
      return interaction.reply({
        content: "That member isn't in the server.",
        ephemeral: true
      });
    }

    if (!canModerate(interaction.member, member)) {
      return interaction.reply({
        content: "You can't ban someone with an equal/higher role.",
        ephemeral: true
      });
    }

    await member.ban({ reason });

    return interaction.reply(
      `🔨 Banned **${user.username}**\nReason: ${reason}`
    );
  }

  if (commandName === "kick") {
    const user = interaction.options.getUser("user");
    const reason =
      interaction.options.getString("reason") ||
      "No reason provided";

    const member =
      await interaction.guild.members
        .fetch(user.id)
        .catch(() => null);

    if (!member || !canModerate(interaction.member, member)) {
      return interaction.reply({
        content: "You can't kick that member.",
        ephemeral: true
      });
    }

    await member.kick(reason);

    return interaction.reply(
      `👢 Kicked **${user.username}**\nReason: ${reason}`
    );
  }

  if (commandName === "timeout") {
    const user = interaction.options.getUser("user");
    const minutes =
      interaction.options.getInteger("minutes");

    const member =
      await interaction.guild.members
        .fetch(user.id)
        .catch(() => null);

    if (!member || !canModerate(interaction.member, member)) {
      return interaction.reply({
        content: "You can't timeout that member.",
        ephemeral: true
      });
    }

    await member.timeout(
      minutes * 60 * 1000,
      `Timeout by ${interaction.user.username}`
    );

    return interaction.reply(
      `⏰ Timed out **${user.username}** for **${minutes} minutes**.`
    );
  }

  if (commandName === "warn") {
    const user = interaction.options.getUser("user");
    const reason =
      interaction.options.getString("reason");

    const member =
      await interaction.guild.members
        .fetch(user.id)
        .catch(() => null);

    if (!member || !canModerate(interaction.member, member)) {
      return interaction.reply({
        content: "You can't warn that member.",
        ephemeral: true
      });
    }

    if (!data.warnings[user.id]) {
      data.warnings[user.id] = [];
    }

    data.warnings[user.id].push({
      reason,
      moderator: interaction.user.id,
      date: Date.now()
    });

    saveData();

    return interaction.reply(
      `⚠️ **${user.username}** has been warned.\nReason: ${reason}`
    );
  }

  if (commandName === "warnings") {
    const user = interaction.options.getUser("user");

    const warnings = data.warnings[user.id] || [];

    if (!warnings.length) {
      return interaction.reply(
        `♡ ${user.username} has no warnings.`
      );
    }

    const text = warnings
      .map(
        (w, i) =>
          `**${i + 1}.** ${w.reason}`
      )
      .join("\n");

    return interaction.reply(
      `⚠️ **Warnings for ${user.username}**\n\n${text}`
    );
  }

  if (commandName === "clear") {
    const amount =
      interaction.options.getInteger("amount");

    await interaction.channel.bulkDelete(amount, true);

    return interaction.reply({
      content: `🧹 Deleted ${amount} messages.`,
      ephemeral: true
    });
  }

  /* =========================
     CONFESS
  ========================= */

  if (commandName === "confess") {
    const modal = new ModalBuilder()
      .setCustomId("confession_modal")
      .setTitle("♡ anonymous confession");

    const input = new TextInputBuilder()
      .setCustomId("confession")
      .setLabel("your confession")
      .setPlaceholder("write anything...")
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(1000)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(input)
    );

    return interaction.showModal(modal);
  }

  /* =========================
     SUGGESTIONS
  ========================= */

  if (commandName === "suggest") {
    const suggestion =
      interaction.options.getString("suggestion");

    const channel = getChannel(
      interaction.guild,
      "୨୧・suggestions"
    );

    if (!channel) {
      return interaction.reply({
        content: "Suggestion channel doesn't exist.",
        ephemeral: true
      });
    }

    const message = await channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("୨୧ suggestion")
          .setDescription(suggestion)
          .setFooter({
            text: `Suggested by ${interaction.user.username}`
          })
      ]
    });

    await message.react("👍");
    await message.react("👎");

    return interaction.reply({
      content: "♡ Your suggestion was posted!",
      ephemeral: true
    });
  }
});

/* =========================
   WELCOME
========================= */

client.on("guildMemberAdd", async member => {
  const memberRole = getRole(member.guild, "Member");

  if (memberRole) {
    await member.roles.add(memberRole).catch(() => {});
  }

  const channel = getChannel(
    member.guild,
    "୨୧・welcome"
  );

  if (!channel) return;

  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("🌸 welcome!")
        .setDescription(
          `welcome ${member} ♡\n\n` +
          "make yourself comfortable and say hi!"
        )
        .setThumbnail(member.user.displayAvatarURL())
    ]
  });
});

/* =========================
   GOODBYE
========================= */

client.on("guildMemberRemove", async member => {
  const channel = getChannel(
    member.guild,
    "୨୧・goodbye"
  );

  if (!channel) return;

  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("☁ goodbye")
        .setDescription(
          `**${member.user.username}** has left the server.`
        )
    ]
  });
});

/* =========================
   BOOSTS
========================= */

client.on("guildMemberUpdate", async (oldMember, newMember) => {
  const oldBoost = oldMember.premiumSince;
  const newBoost = newMember.premiumSince;

  if (!oldBoost && newBoost) {
    const channel = getChannel(
      newMember.guild,
      "୨୧・boosts"
    );

    const boosterRole = getRole(
      newMember.guild,
      "🌸・booster"
    );

    if (boosterRole) {
      await newMember.roles.add(boosterRole).catch(() => {});
    }

    if (channel) {
      await channel.send(
        `🌸 ${newMember} just boosted the server! thank you ♡`
      );
    }
  }

  if (oldBoost && !newBoost) {
    const boosterRole = getRole(
      newMember.guild,
      "🌸・booster"
    );

    if (boosterRole) {
      await newMember.roles.remove(boosterRole).catch(() => {});
    }
  }
});

/* =========================
   XP
========================= */

const xpCooldown = new Map();

client.on("messageCreate", async message => {
  if (message.author.bot) return;

  const now = Date.now();
  const last = xpCooldown.get(message.author.id) || 0;

  if (now - last < 60000) return;

  xpCooldown.set(message.author.id, now);

  if (!data.xp[message.author.id]) {
    data.xp[message.author.id] = {
      xp: 0,
      level: 1
    };
  }

  const userData = data.xp[message.author.id];

  userData.xp += Math.floor(Math.random() * 10) + 5;

  const needed = userData.level * 100;

  if (userData.xp >= needed) {
    userData.xp -= needed;
    userData.level++;

    const levelChannel = getChannel(
      message.guild,
      "୨୧・levels"
    );

    if (levelChannel) {
      await levelChannel.send(
        `⭐ ${message.author} reached **level ${userData.level}**! ♡`
      );
    }
  }

  saveData();
});

/* =========================
   LOGIN
========================= */

client.login(process.env.TOKEN);