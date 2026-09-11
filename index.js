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

/* =========================================================
   CLIENT
========================================================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction
  ]
});

/* =========================================================
   DATA
========================================================= */

const DATA_FILE = "./data.json";

let data = {
  xp: {},
  warnings: {},
  bios: {},
  friends: {},
  tickets: {},
  channels: {}
};

if (fs.existsSync(DATA_FILE)) {
  try {
    data = {
      ...data,
      ...JSON.parse(fs.readFileSync(DATA_FILE, "utf8"))
    };
  } catch {
    console.log("Starting with fresh data.");
  }
}

function saveData() {
  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify(data, null, 2)
  );
}

/* =========================================================
   ROLES
========================================================= */

const ROLES = [
  {
    name: "Member",
    color: 0xffdce8
  },

  // PRONOUNS
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

  // AGE
  {
    name: "୨୧・minor",
    color: 0xffe0b5
  },

  // INTERESTS
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

  // VIBES
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

  // NOTIFICATIONS
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

  // SERVER
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

  // STAFF
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

/* =========================================================
   CHANNEL STRUCTURE
========================================================= */

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

/* =========================================================
   HELPERS
========================================================= */

function getRole(guild, name) {
  return guild.roles.cache.find(
    role => role.name === name
  );
}

function getChannel(guild, name) {
  return guild.channels.cache.find(
    channel => channel.name === name &&
      channel.type === ChannelType.GuildText
  );
}

function getCategory(guild, name) {
  return guild.channels.cache.find(
    channel =>
      channel.name === name &&
      channel.type === ChannelType.GuildCategory
  );
}

function isOwner(member) {
  return (
    member.id === member.guild.ownerId ||
    member.roles.cache.some(
      role => role.name === "👑・owner"
    )
  );
}

function isStaff(member) {
  return (
    member.permissions.has(
      PermissionsBitField.Flags.Administrator
    ) ||
    member.roles.cache.some(role =>
      [
        "🔨・staff",
        "🛡️・mod",
        "⚡・admin",
        "👑・owner"
      ].includes(role.name)
    )
  );
}

function canModerate(member, target) {
  if (!target) return false;

  if (target.id === member.id) return false;

  if (target.id === target.guild.ownerId) {
    return false;
  }

  return (
    member.roles.highest.position >
    target.roles.highest.position
  );
}

function makeRoleButton(role, emoji) {
  return new ButtonBuilder()
    .setCustomId(`selfrole_${role.id}`)
    .setLabel(
      role.name.replace("୨୧・", "")
    )
    .setEmoji(emoji)
    .setStyle(ButtonStyle.Secondary);
}

/* =========================================================
   SEND CHANNEL CONTENT
========================================================= */

async function clearChannel(channel) {
  try {
    const messages =
      await channel.messages.fetch({
        limit: 100
      });

    if (messages.size > 0) {
      await channel.bulkDelete(
        messages,
        true
      );
    }
  } catch {}
}

async function sendChannel(channel, payload) {
  if (!channel) return;

  await clearChannel(channel);

  try {
    await channel.send(payload);
  } catch (err) {
    console.log(
      `Could not send to ${channel.name}:`,
      err.message
    );
  }
}

/* =========================================================
   CHANNEL CONTENT
========================================================= */

async function setupRules(guild) {
  const channel =
    getChannel(guild, "୨୧・rules");

  await sendChannel(channel, {
    embeds: [
      new EmbedBuilder()
        .setTitle("♡・server rules")
        .setDescription(
          [
            "welcome to the server ♡",
            "",
            "୨୧ **be respectful**",
            "treat everyone nicely.",
            "",
            "୨୧ **no harassment**",
            "no bullying, hate, or targeted harassment.",
            "",
            "୨୧ **no spam**",
            "don't flood chats or spam mentions.",
            "",
            "୨୧ **no unwanted advertising**",
            "don't advertise without permission.",
            "",
            "୨୧ **keep things appropriate**",
            "keep content suitable for the community.",
            "",
            "୨୧ **respect privacy**",
            "don't share private information.",
            "",
            "୨୧ **listen to staff**",
            "staff decisions are made to keep the server safe.",
            "",
            "♡ have fun and make some friends!"
          ].join("\n")
        )
        .setFooter({
          text: "♡ read the rules before chatting"
        })
    ]
  });
}

async function setupAnnouncements(guild) {
  const channel =
    getChannel(guild, "୨୧・announcements");

  await sendChannel(channel, {
    embeds: [
      new EmbedBuilder()
        .setTitle("୨୧・announcements")
        .setDescription(
          [
            "♡ **server announcements**",
            "",
            "important updates from the owner and staff",
            "will be posted here.",
            "",
            "make sure you have the",
            "`୨୧・announcements` role if you want notifications."
          ].join("\n")
        )
    ]
  });
}

async function setupServerInfo(guild) {
  const channel =
    getChannel(guild, "୨୧・server-info");

  await sendChannel(channel, {
    embeds: [
      new EmbedBuilder()
        .setTitle("୨୧・server info")
        .setDescription(
          [
            "♡ **welcome!**",
            "",
            "this server is a chill community",
            "for meeting people, talking, sharing",
            "media and having fun.",
            "",
            "♡ `/profile` — view a profile",
            "♡ `/setbio` — set your bio",
            "♡ `/rank` — view your level",
            "♡ `/leaderboard` — XP leaderboard",
            "♡ `/friend` — add a friend",
            "♡ `/friends` — view friends",
            "",
            "need help?",
            "visit **୨୧・support**."
          ].join("\n")
        )
    ]
  });
}

async function setupWelcome(guild) {
  const channel =
    getChannel(guild, "୨୧・welcome");

  await sendChannel(channel, {
    embeds: [
      new EmbedBuilder()
        .setTitle("🌸・welcome")
        .setDescription(
          [
            "♡ new members will be welcomed here!",
            "",
            "when someone joins, the bot will automatically",
            "send them a welcome message.",
            "",
            "after joining, check out:",
            "୨୧・rules",
            "୨୧・introductions",
            "୨୧・roles",
            "୨୧・chat"
          ].join("\n")
        )
    ]
  });
}

async function setupGoodbye(guild) {
  const channel =
    getChannel(guild, "୨୧・goodbye");

  await sendChannel(channel, {
    embeds: [
      new EmbedBuilder()
        .setTitle("☁・goodbye")
        .setDescription(
          [
            "♡ this is the goodbye channel.",
            "",
            "when a member leaves the server,",
            "the bot will automatically post here.",
            "",
            "we'll miss them ♡"
          ].join("\n")
        )
    ]
  });
}

async function setupIntroductions(guild) {
  const channel =
    getChannel(guild, "୨୧・introductions");

  await sendChannel(channel, {
    embeds: [
      new EmbedBuilder()
        .setTitle("♡・introductions")
        .setDescription(
          [
            "introduce yourself!",
            "",
            "♡ name / nickname",
            "♡ age if you want",
            "♡ interests",
            "♡ favorite music",
            "♡ hobbies",
            "♡ anything you'd like people to know",
            "",
            "say hi to people and make some friends ♡"
          ].join("\n")
        )
    ]
  });
}

async function setupRoles(guild) {
  const channel =
    getChannel(guild, "୨୧・roles");

  if (!channel) {
    console.log("ROLES CHANNEL WAS NOT FOUND");
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle("୨୧・choose your roles")
    .setDescription(
      [
        "click a button to **add or remove** a role ♡",
        "",
        "🌸 **PRONOUNS**",
        "choose whichever pronouns fit you.",
        "",
        "🧸 **AGE**",
        "optional age role.",
        "",
        "🎀 **INTERESTS**",
        "show people what you're into.",
        "",
        "☁️ **VIBES**",
        "choose your personality vibe.",
        "",
        "☆ **NOTIFICATIONS**",
        "choose the things you want pings for.",
        "",
        "♡ you can change these whenever you want."
      ].join("\n")
    )
    .setFooter({
      text: "♡ click again to remove a role"
    });

  const rows = [];

  const groups = [
    [
      ["୨୧・she/her", "🌸"],
      ["୨୧・he/him", "💙"],
      ["୨୧・they/them", "💜"],
      ["୨୧・any pronouns", "🎀"]
    ],

    [
      ["୨୧・minor", "🧸"]
    ],

    [
      ["୨୧・artist", "🎨"],
      ["୨୧・music", "🎵"],
      ["୨୧・anime", "🌸"],
      ["୨୧・creator", "✨"],
      ["୨୧・developer", "💻"]
    ],

    [
      ["୨୧・social", "💬"],
      ["୨୧・introvert", "☁️"],
      ["୨୧・extrovert", "💗"],
      ["୨୧・active", "⭐"]
    ],

    [
      ["୨୧・announcements", "📢"],
      ["୨୧・events", "🎉"],
      ["୨୧・giveaways", "🎁"],
      ["୨୧・polls", "📊"],
      ["୨୧・vc", "🎙️"]
    ]
  ];

  for (const group of groups) {
    const row =
      new ActionRowBuilder();

    for (const [name, emoji] of group) {
      const role =
        getRole(guild, name);

      if (role) {
        row.addComponents(
          makeRoleButton(role, emoji)
        );
      } else {
        console.log(
          `ROLE MISSING: ${name}`
        );
      }
    }

    if (row.components.length > 0) {
      rows.push(row);
    }
  }

  await sendChannel(channel, {
    embeds: [embed],
    components: rows
  });
}

async function setupBoosts(guild) {
  const channel =
    getChannel(guild, "୨୧・boosts");

  await sendChannel(channel, {
    embeds: [
      new EmbedBuilder()
        .setTitle("🌸・server boosts")
        .setDescription(
          [
            "thank you to everyone who boosts the server ♡",
            "",
            "boosters may receive:",
            "🌸・booster",
            "",
            "your support helps keep the server going!"
          ].join("\n")
        )
    ]
  });
}

async function setupPartnerships(guild) {
  const channel =
    getChannel(guild, "୨୧・partnerships");

  const button =
    new ButtonBuilder()
      .setCustomId("partnership")
      .setLabel("partnership application")
      .setEmoji("💜")
      .setStyle(ButtonStyle.Secondary);

  await sendChannel(channel, {
    embeds: [
      new EmbedBuilder()
        .setTitle("💜・partnerships")
        .setDescription(
          [
            "want to partner with us?",
            "",
            "click the button below to submit",
            "a partnership application.",
            "",
            "please only submit serious applications ♡"
          ].join("\n")
        )
    ],
    components: [
      new ActionRowBuilder()
        .addComponents(button)
    ]
  });
}

async function setupChat(guild) {
  const channel =
    getChannel(guild, "୨୧・chat");

  await sendChannel(channel, {
    embeds: [
      new EmbedBuilder()
        .setTitle("♡・general chat")
        .setDescription(
          [
            "this is the main chat!",
            "",
            "talk about whatever you're into.",
            "meet people, tell jokes, talk about your day",
            "and just hang out ♡",
            "",
            "please keep conversations respectful."
          ].join("\n")
        )
    ]
  });
}

async function setupMakeFriends(guild) {
  const channel =
    getChannel(guild, "୨୧・make-friends");

  await sendChannel(channel, {
    embeds: [
      new EmbedBuilder()
        .setTitle("୨୧・make friends")
        .setDescription(
          [
            "looking for new people to talk to? ♡",
            "",
            "tell everyone:",
            "♡ your interests",
            "♡ favorite music",
            "♡ hobbies",
            "♡ what you're into",
            "♡ what kind of friends you're looking for",
            "",
            "example:",
            "> hi! i'm looking for people who like music",
            "> and anime! feel free to talk to me ♡",
            "",
            "respect boundaries and don't pressure anyone."
          ].join("\n")
        )
    ]
  });
}

async function setupMedia(guild) {
  const channel =
    getChannel(guild, "୨୧・media");

  await sendChannel(channel, {
    embeds: [
      new EmbedBuilder()
        .setTitle("📸・media")
        .setDescription(
          [
            "share your favorite pictures, edits,",
            "art, screenshots and other media here ♡",
            "",
            "please keep everything appropriate",
            "for the community."
          ].join("\n")
        )
    ]
  });
}

async function setupMemes(guild) {
  const channel =
    getChannel(guild, "୨୧・memes");

  await sendChannel(channel, {
    embeds: [
      new EmbedBuilder()
        .setTitle("😭・memes")
        .setDescription(
          [
            "post your funniest memes here.",
            "",
            "reaction spam is encouraged.",
            "actual spam isn't 😭",
            "",
            "♡ have fun"
          ].join("\n")
        )
    ]
  });
}

async function setupSuggestions(guild) {
  const channel =
    getChannel(guild, "୨୧・suggestions");

  await sendChannel(channel, {
    embeds: [
      new EmbedBuilder()
        .setTitle("୨୧・suggestions")
        .setDescription(
          [
            "have an idea for the server?",
            "",
            "use:",
            "`/suggest suggestion: your idea`",
            "",
            "the bot will post it here automatically.",
            "",
            "👍 = support",
            "👎 = don't support"
          ].join("\n")
        )
    ]
  });
}

async function setupLevels(guild) {
  const channel =
    getChannel(guild, "୨୧・levels");

  await sendChannel(channel, {
    embeds: [
      new EmbedBuilder()
        .setTitle("⭐・levels")
        .setDescription(
          [
            "chat to earn XP!",
            "",
            "use `/rank` to see your level.",
            "use `/leaderboard` to see the top members.",
            "",
            "level up by being active in the community ♡"
          ].join("\n")
        )
    ]
  });
}

async function setupStarboard(guild) {
  const channel =
    getChannel(guild, "୨୧・starboard");

  await sendChannel(channel, {
    embeds: [
      new EmbedBuilder()
        .setTitle("⭐・starboard")
        .setDescription(
          [
            "the best messages from the community",
            "can be featured here.",
            "",
            "say something funny, helpful or memorable ♡"
          ].join("\n")
        )
    ]
  });
}

async function setupConfessions(guild) {
  const channel =
    getChannel(guild, "୨୧・confessions");

  await sendChannel(channel, {
    embeds: [
      new EmbedBuilder()
        .setTitle("♡・anonymous confessions")
        .setDescription(
          [
            "want to say something anonymously?",
            "",
            "use `/confess`.",
            "",
            "your username will not be shown",
            "in the confession message."
          ].join("\n")
        )
    ]
  });
}

async function setupSupport(guild) {
  const channel =
    getChannel(guild, "୨୧・support");

  const button =
    new ButtonBuilder()
      .setCustomId("support_ticket")
      .setLabel("open support ticket")
      .setEmoji("🫶")
      .setStyle(ButtonStyle.Secondary);

  await sendChannel(channel, {
    embeds: [
      new EmbedBuilder()
        .setTitle("🫶・support")
        .setDescription(
          [
            "need help?",
            "",
            "click the button below to create",
            "a private support ticket.",
            "",
            "only you and staff will be able to see it."
          ].join("\n")
        )
    ],
    components: [
      new ActionRowBuilder()
        .addComponents(button)
    ]
  });
}

async function setupStaffChat(guild) {
  const channel =
    getChannel(guild, "୨୧・staff-chat");

  await sendChannel(channel, {
    embeds: [
      new EmbedBuilder()
        .setTitle("🛡️・staff chat")
        .setDescription(
          [
            "private staff channel.",
            "",
            "use this channel for:",
            "♡ moderation discussions",
            "♡ member reports",
            "♡ server planning",
            "♡ staff announcements",
            "♡ anything staff-only",
            "",
            "please keep private member information",
            "inside this channel."
          ].join("\n")
        )
    ]
  });
}

/* =========================================================
   CREATE ROLES
========================================================= */

async function createRoles(guild) {
  const created = {};

  for (const roleInfo of ROLES) {
    let role =
      guild.roles.cache.find(
        r =>
          r.name === roleInfo.name &&
          !r.managed
      );

    if (!role) {
      try {
        role =
          await guild.roles.create({
            name: roleInfo.name,
            color: roleInfo.color,
            reason: "Server setup"
          });
      } catch (err) {
        console.log(
          `Could not create role ${roleInfo.name}:`,
          err.message
        );
        continue;
      }
    }

    created[roleInfo.name] = role;
  }

  return created;
}

/* =========================================================
   CREATE CHANNELS
========================================================= */

async function createChannels(guild) {
  data.channels = {};

  for (const section of STRUCTURE) {

    let category =
      getCategory(
        guild,
        section.category
      );

    if (!category) {
      category =
        await guild.channels.create({
          name: section.category,
          type: ChannelType.GuildCategory
        });
    }

    for (const channelName of section.channels) {

      let channel =
        getChannel(
          guild,
          channelName
        );

      if (!channel) {
        channel =
          await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: category.id
          });
      } else if (
        channel.parentId !== category.id
      ) {
        try {
          await channel.setParent(
            category.id
          );
        } catch {}
      }

      data.channels[channelName] =
        channel.id;
    }
  }

  saveData();
}

/* =========================================================
   STAFF PERMISSIONS
========================================================= */

async function setupStaffPermissions(guild) {
  const channel =
    getChannel(
      guild,
      "୨୧・staff-chat"
    );

  if (!channel) return;

  try {
    await channel.permissionOverwrites.edit(
      guild.roles.everyone,
      {
        ViewChannel: false
      }
    );
  } catch {}

  const staffNames = [
    "🔨・staff",
    "🛡️・mod",
    "⚡・admin",
    "👑・owner"
  ];

  for (const name of staffNames) {
    const role =
      getRole(guild, name);

    if (!role) continue;

    try {
      await channel.permissionOverwrites.edit(
        role,
        {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true
        }
      );
    } catch {}
  }
}

/* =========================================================
   READ ONLY
========================================================= */

async function setupReadOnly(guild) {
  const channels = [
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

  for (const name of channels) {
    const channel =
      getChannel(guild, name);

    if (!channel) continue;

    try {
      await channel.permissionOverwrites.edit(
        guild.roles.everyone,
        {
          SendMessages: false
        }
      );
    } catch {}
  }

  /*
    Suggestions is intentionally NOT
    completely locked because members
    need to be able to react to suggestions.
  */

  const suggestions =
    getChannel(
      guild,
      "୨୧・suggestions"
    );

  if (suggestions) {
    try {
      await suggestions.permissionOverwrites.edit(
        guild.roles.everyone,
        {
          SendMessages: false,
          AddReactions: true
        }
      );
    } catch {}
  }
}

/* =========================================================
   RESET SERVER
========================================================= */

let resetting = false;

async function resetServer(guild) {
  if (resetting) {
    throw new Error(
      "A reset is already running."
    );
  }

  resetting = true;

  try {
    console.log("Starting reset...");

    data.channels = {};
    saveData();

    /*
      DELETE CHANNELS
    */

    const channels =
      [...guild.channels.cache.values()];

    for (const channel of channels) {
      try {
        await channel.delete(
          "Complete server reset"
        );
      } catch (err) {
        console.log(
          `Could not delete ${channel.name}`
        );
      }
    }

    /*
      DELETE ROLES

      We skip:
      - @everyone
      - managed roles
      - bot role
      - roles above the bot
    */

    const botMember =
      guild.members.me;

    const botPosition =
      botMember?.roles?.highest?.position ?? 0;

    const roles =
      [...guild.roles.cache.values()];

    for (const role of roles) {

      if (role.id === guild.id) {
        continue;
      }

      if (role.managed) {
        continue;
      }

      if (role.position >= botPosition) {
        continue;
      }

      try {
        await role.delete(
          "Complete server reset"
        );
      } catch {}
    }

    await new Promise(
      resolve => setTimeout(resolve, 1000)
    );

    /*
      CREATE ROLES
    */

    await createRoles(guild);

    /*
      CREATE CHANNELS
    */

    await createChannels(guild);

    /*
      PERMISSIONS
    */

    await setupReadOnly(guild);
    await setupStaffPermissions(guild);

    /*
      EVERY CHANNEL GETS CONTENT
    */

    await setupRules(guild);
    await setupAnnouncements(guild);
    await setupServerInfo(guild);
    await setupWelcome(guild);
    await setupGoodbye(guild);
    await setupIntroductions(guild);
    await setupRoles(guild);
    await setupBoosts(guild);
    await setupPartnerships(guild);

    await setupChat(guild);
    await setupMakeFriends(guild);
    await setupMedia(guild);
    await setupMemes(guild);
    await setupSuggestions(guild);

    await setupLevels(guild);
    await setupStarboard(guild);
    await setupConfessions(guild);
    await setupSupport(guild);

    await setupStaffChat(guild);

    saveData();

    console.log(
      "SERVER RESET COMPLETED SUCCESSFULLY"
    );
  } finally {
    resetting = false;
  }
}

/* =========================================================
   COMMANDS
========================================================= */

const commands = [

  new SlashCommandBuilder()
    .setName("resetserver")
    .setDescription(
      "Completely rebuild the server"
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
        .setDescription("Your question")
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
        .setDescription("Your choice")
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
      "Get a would-you-rather question"
    ),

  new SlashCommandBuilder()
    .setName("trivia")
    .setDescription(
      "Get a trivia question"
    ),

  new SlashCommandBuilder()
    .setName("rank")
    .setDescription(
      "Check your level"
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
        .setDescription(
          "User to view"
        )
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("setbio")
    .setDescription(
      "Set your profile bio"
    )
    .addStringOption(option =>
      option
        .setName("bio")
        .setDescription(
          "Your bio"
        )
        .setRequired(true)
        .setMaxLength(200)
    ),

  new SlashCommandBuilder()
    .setName("friend")
    .setDescription(
      "Add someone as a friend"
    )
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription(
          "Friend"
        )
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("friends")
    .setDescription(
      "View your friends"
    ),

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription(
      "Ban a member"
    )
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription(
          "Member"
        )
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("reason")
        .setDescription(
          "Reason"
        )
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription(
      "Kick a member"
    )
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription(
          "Member"
        )
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("reason")
        .setDescription(
          "Reason"
        )
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("timeout")
    .setDescription(
      "Timeout a member"
    )
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription(
          "Member"
        )
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName("minutes")
        .setDescription(
          "Minutes"
        )
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(40320)
    ),

  new SlashCommandBuilder()
    .setName("warn")
    .setDescription(
      "Warn a member"
    )
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription(
          "Member"
        )
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("reason")
        .setDescription(
          "Reason"
        )
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
        .setDescription(
          "Member"
        )
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("clear")
    .setDescription(
      "Delete messages"
    )
    .addIntegerOption(option =>
      option
        .setName("amount")
        .setDescription(
          "Number of messages"
        )
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    ),

  new SlashCommandBuilder()
    .setName("confess")
    .setDescription(
      "Send an anonymous confession"
    ),

  new SlashCommandBuilder()
    .setName("suggest")
    .setDescription(
      "Make a suggestion"
    )
    .addStringOption(option =>
      option
        .setName("suggestion")
        .setDescription(
          "Your suggestion"
        )
        .setRequired(true)
        .setMaxLength(1000)
    )
];

/* =========================================================
   READY
========================================================= */

client.once("ready", async () => {
  console.log(
    `Logged in as ${client.user.tag}`
  );

  try {
    await client.application.commands.set(
      commands.map(
        command => command.toJSON()
      )
    );

    console.log(
      "Slash commands registered."
    );
  } catch (err) {
    console.error(
      "Command registration error:",
      err
    );
  }
});

/* =========================================================
   BUTTONS
========================================================= */

client.on(
  "interactionCreate",
  async interaction => {

    if (!interaction.isButton()) {
      return;
    }

    /* -----------------------------------------
       SELF ROLE BUTTON
    ----------------------------------------- */

    if (
      interaction.customId.startsWith(
        "selfrole_"
      )
    ) {
      const roleId =
        interaction.customId.replace(
          "selfrole_",
          ""
        );

      const role =
        interaction.guild.roles.cache.get(
          roleId
        );

      if (!role) {
        return interaction.reply({
          content:
            "❌ That role doesn't exist anymore.",
          ephemeral: true
        });
      }

      try {
        if (
          interaction.member.roles.cache.has(
            role.id
          )
        ) {
          await interaction.member.roles.remove(
            role
          );

          return interaction.reply({
            content:
              `♡ Removed **${role.name}**`,
            ephemeral: true
          });
        }

        await interaction.member.roles.add(
          role
        );

        return interaction.reply({
          content:
            `♡ Added **${role.name}**`,
          ephemeral: true
        });

      } catch (err) {
        console.error(err);

        return interaction.reply({
          content:
            "❌ I couldn't change that role. Make sure my bot role is above the role.",
          ephemeral: true
        });
      }
    }

    /* -----------------------------------------
       SUPPORT TICKET
    ----------------------------------------- */

    if (
      interaction.customId ===
      "support_ticket"
    ) {
      const guild =
        interaction.guild;

      const existing =
        guild.channels.cache.find(
          channel =>
            channel.name ===
              `support-${interaction.user.id}` &&
            channel.type ===
              ChannelType.GuildText
        );

      if (existing) {
        return interaction.reply({
          content:
            `You already have a ticket: ${existing}`,
          ephemeral: true
        });
      }

      const category =
        getCategory(
          guild,
          "004・TICKETS"
        );

      const overwrites = [
        {
          id: guild.roles.everyone.id,
          deny: [
            PermissionsBitField.Flags.ViewChannel
          ]
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

      for (const name of [
        "🔨・staff",
        "🛡️・mod",
        "⚡・admin",
        "👑・owner"
      ]) {
        const role =
          getRole(guild, name);

        if (!role) continue;

        overwrites.push({
          id: role.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        });
      }

      const ticket =
        await guild.channels.create({
          name:
            `support-${interaction.user.id}`,
          type: ChannelType.GuildText,
          parent: category?.id,
          permissionOverwrites:
            overwrites
        });

      const close =
        new ButtonBuilder()
          .setCustomId(
            "close_ticket"
          )
          .setLabel("close ticket")
          .setEmoji("🔒")
          .setStyle(
            ButtonStyle.Danger
          );

      await ticket.send({
        content:
          `${interaction.user}`,
        embeds: [
          new EmbedBuilder()
            .setTitle(
              "🫶・support ticket"
            )
            .setDescription(
              [
                "tell staff what you need help with.",
                "",
                "someone will help you as soon as possible ♡"
              ].join("\n")
            )
        ],
        components: [
          new ActionRowBuilder()
            .addComponents(close)
        ]
      });

      return interaction.reply({
        content:
          `♡ Ticket created: ${ticket}`,
        ephemeral: true
      });
    }

    /* -----------------------------------------
       CLOSE TICKET
    ----------------------------------------- */

    if (
      interaction.customId ===
      "close_ticket"
    ) {
      if (
        !isStaff(interaction.member)
      ) {
        return interaction.reply({
          content:
            "🛡️ Only staff can close tickets.",
          ephemeral: true
        });
      }

      await interaction.reply(
        "🔒 Closing ticket..."
      );

      setTimeout(() => {
        interaction.channel
          .delete()
          .catch(() => {});
      }, 1500);

      return;
    }

    /* -----------------------------------------
       PARTNERSHIP
    ----------------------------------------- */

    if (
      interaction.customId ===
      "partnership"
    ) {
      const modal =
        new ModalBuilder()
          .setCustomId(
            "partnership_modal"
          )
          .setTitle(
            "partnership application"
          );

      const server =
        new TextInputBuilder()
          .setCustomId(
            "server_name"
          )
          .setLabel(
            "server name"
          )
          .setStyle(
            TextInputStyle.Short
          )
          .setRequired(true);

      const invite =
        new TextInputBuilder()
          .setCustomId(
            "server_invite"
          )
          .setLabel(
            "server invite"
          )
          .setStyle(
            TextInputStyle.Short
          )
          .setRequired(true);

      const members =
        new TextInputBuilder()
          .setCustomId(
            "member_count"
          )
          .setLabel(
            "member count"
          )
          .setStyle(
            TextInputStyle.Short
          )
          .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder()
          .addComponents(server),
        new ActionRowBuilder()
          .addComponents(invite),
        new ActionRowBuilder()
          .addComponents(members)
      );

      return interaction.showModal(
        modal
      );
    }
  }
);

/* =========================================================
   MODALS
========================================================= */

client.on(
  "interactionCreate",
  async interaction => {

    if (!interaction.isModalSubmit()) {
      return;
    }

    /* -----------------------------------------
       CONFESSION
    ----------------------------------------- */

    if (
      interaction.customId ===
      "confession_modal"
    ) {
      const text =
        interaction.fields.getTextInputValue(
          "confession"
        );

      const channel =
        getChannel(
          interaction.guild,
          "୨୧・confessions"
        );

      if (!channel) {
        return interaction.reply({
          content:
            "❌ Confession channel doesn't exist.",
          ephemeral: true
        });
      }

      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle(
              "♡・anonymous confession"
            )
            .setDescription(text)
            .setFooter({
              text: "anonymous"
            })
        ]
      });

      return interaction.reply({
        content:
          "♡ Your confession was posted anonymously.",
        ephemeral: true
      });
    }

    /* -----------------------------------------
       PARTNERSHIP
    ----------------------------------------- */

    if (
      interaction.customId ===
      "partnership_modal"
    ) {
      const guild =
        interaction.guild;

      const server =
        interaction.fields.getTextInputValue(
          "server_name"
        );

      const invite =
        interaction.fields.getTextInputValue(
          "server_invite"
        );

      const members =
        interaction.fields.getTextInputValue(
          "member_count"
        );

      const category =
        getCategory(
          guild,
          "004・TICKETS"
        );

      const overwrites = [
        {
          id: guild.roles.everyone.id,
          deny: [
            PermissionsBitField.Flags.ViewChannel
          ]
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

      for (const name of [
        "🔨・staff",
        "🛡️・mod",
        "⚡・admin",
        "👑・owner"
      ]) {
        const role =
          getRole(guild, name);

        if (!role) continue;

        overwrites.push({
          id: role.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        });
      }

      const ticket =
        await guild.channels.create({
          name:
            `partner-${interaction.user.id}`,
          type: ChannelType.GuildText,
          parent: category?.id,
          permissionOverwrites:
            overwrites
        });

      await ticket.send({
        content:
          `${interaction.user}`,
        embeds: [
          new EmbedBuilder()
            .setTitle(
              "💜・partnership application"
            )
            .addFields(
              {
                name: "server",
                value: server
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
        content:
          `♡ Application submitted: ${ticket}`,
        ephemeral: true
      });
    }
  }
);

/* =========================================================
   CHAT COMMANDS
========================================================= */

client.on(
  "interactionCreate",
  async interaction => {

    if (!interaction.isChatInputCommand()) {
      return;
    }

    const command =
      interaction.commandName;

    /* ========================================
       RESET
    ======================================== */

    if (command === "resetserver") {

      if (!isOwner(interaction.member)) {
        return interaction.reply({
          content:
            "👑 Only the owner can use this command.",
          ephemeral: true
        });
      }

      await interaction.deferReply({
        ephemeral: true
      });

      try {
        await resetServer(
          interaction.guild
        );

        await interaction.editReply(
          [
            "✅ **Server rebuilt successfully!**",
            "",
            "♡ every category created",
            "♡ every channel created",
            "♡ every channel populated",
            "♡ roles created",
            "♡ role buttons installed",
            "♡ welcome system enabled",
            "♡ goodbye system enabled",
            "♡ staff chat created",
            "♡ tickets enabled",
            "",
            "No games channel.",
            "No 18+ role."
          ].join("\n")
        );

      } catch (err) {
        console.error(err);

        await interaction.editReply(
          "❌ The reset failed. Check the Railway logs."
        );
      }

      return;
    }

    /* ========================================
       COINFLIP
    ======================================== */

    if (command === "coinflip") {
      const result =
        Math.random() < 0.5
          ? "heads"
          : "tails";

      return interaction.reply(
        `🪙 **${result}**`
      );
    }

    /* ========================================
       ROLL
    ======================================== */

    if (command === "roll") {
      const number =
        Math.floor(
          Math.random() * 100
        ) + 1;

      return interaction.reply(
        `🎲 You rolled **${number}**!`
      );
    }

    /* ========================================
       8BALL
    ======================================== */

    if (command === "8ball") {
      const answers = [
        "yes ♡",
        "no 😭",
        "probably",
        "probably not",
        "definitely",
        "maybe",
        "ask again later",
        "100%",
        "not looking good..."
      ];

      const answer =
        answers[
          Math.floor(
            Math.random() *
            answers.length
          )
        ];

      return interaction.reply(
        `🎱 **${answer}**`
      );
    }

    /* ========================================
       RPS
    ======================================== */

    if (command === "rps") {
      const choices = [
        "rock",
        "paper",
        "scissors"
      ];

      const userChoice =
        interaction.options.getString(
          "choice"
        );

      const botChoice =
        choices[
          Math.floor(
            Math.random() *
            choices.length
          )
        ];

      let result;

      if (
        userChoice === botChoice
      ) {
        result = "it's a tie!";
      } else if (
        (
          userChoice === "rock" &&
          botChoice === "scissors"
        ) ||
        (
          userChoice === "paper" &&
          botChoice === "rock"
        ) ||
        (
          userChoice === "scissors" &&
          botChoice === "paper"
        )
      ) {
        result = "you win! ♡";
      } else {
        result = "I win 😭";
      }

      return interaction.reply(
        `✊ **${userChoice}** vs **${botChoice}**\n${result}`
      );
    }

    /* ========================================
       WOULD YOU RATHER
    ======================================== */

    if (
      command ===
      "wouldyourather"
    ) {
      const questions = [
        "Would you rather be able to fly or become invisible?",
        "Would you rather have unlimited money or unlimited free time?",
        "Would you rather live in the future or the past?",
        "Would you rather never use social media again or never watch TV again?",
        "Would you rather always be 10 minutes late or 20 minutes early?"
      ];

      return interaction.reply(
        `♡ **Would you rather...**\n\n${
          questions[
            Math.floor(
              Math.random() *
              questions.length
            )
          ]
        }`
      );
    }

    /* ========================================
       TRIVIA
    ======================================== */

    if (command === "trivia") {
      const questions = [
        [
          "What planet is known as the Red Planet?",
          "Mars"
        ],
        [
          "How many sides does a hexagon have?",
          "6"
        ],
        [
          "What is the largest ocean?",
          "Pacific Ocean"
        ],
        [
          "How many continents are there?",
          "7"
        ],
        [
          "What gas do humans need to breathe?",
          "Oxygen"
        ]
      ];

      const item =
        questions[
          Math.floor(
            Math.random() *
            questions.length
          )
        ];

      return interaction.reply(
        `🧠 **Trivia**\n\n${item[0]}\n\nAnswer: ||${item[1]}||`
      );
    }

    /* ========================================
       XP
    ======================================== */

    if (command === "rank") {
      const id =
        interaction.user.id;

      if (!data.xp[id]) {
        data.xp[id] = {
          xp: 0,
          level: 1
        };
      }

      return interaction.reply(
        [
          `⭐ **${interaction.user.username}**`,
          "",
          `Level: **${data.xp[id].level}**`,
          `XP: **${data.xp[id].xp}**`
        ].join("\n")
      );
    }

    if (
      command === "leaderboard"
    ) {
      const entries =
        Object.entries(data.xp)
          .sort(
            (a, b) =>
              b[1].xp - a[1].xp
          )
          .slice(0, 10);

      if (!entries.length) {
        return interaction.reply(
          "Nobody has XP yet 😭"
        );
      }

      let text = "";

      for (
        let i = 0;
        i < entries.length;
        i++
      ) {
        const user =
          await client.users.fetch(
            entries[i][0]
          ).catch(() => null);

        if (!user) continue;

        text +=
          `${i + 1}. **${user.username}** — ${entries[i][1].xp} XP\n`;
      }

      return interaction.reply(
        `🏆 **XP Leaderboard**\n\n${text}`
      );
    }

    /* ========================================
       PROFILE
    ======================================== */

    if (command === "profile") {
      const user =
        interaction.options.getUser(
          "user"
        ) ||
        interaction.user;

      if (!data.xp[user.id]) {
        data.xp[user.id] = {
          xp: 0,
          level: 1
        };
      }

      const embed =
        new EmbedBuilder()
          .setTitle(
            `♡ ${user.username}`
          )
          .setThumbnail(
            user.displayAvatarURL()
          )
          .addFields(
            {
              name: "bio",
              value:
                data.bios[user.id] ||
                "No bio set."
            },
            {
              name: "level",
              value:
                `${data.xp[user.id].level}`
            },
            {
              name: "xp",
              value:
                `${data.xp[user.id].xp}`
            }
          );

      return interaction.reply({
        embeds: [embed]
      });
    }

    /* ========================================
       SET BIO
    ======================================== */

    if (command === "setbio") {
      const bio =
        interaction.options.getString(
          "bio"
        );

      data.bios[
        interaction.user.id
      ] = bio;

      saveData();

      return interaction.reply({
        content:
          "♡ Your bio was updated!",
        ephemeral: true
      });
    }

    /* ========================================
       FRIEND
    ======================================== */

    if (command === "friend") {
      const user =
        interaction.options.getUser(
          "user"
        );

      if (
        user.id ===
        interaction.user.id
      ) {
        return interaction.reply({
          content:
            "You can't add yourself 😭",
          ephemeral: true
        });
      }

      if (
        !data.friends[
          interaction.user.id
        ]
      ) {
        data.friends[
          interaction.user.id
        ] = [];
      }

      if (
        !data.friends[
          interaction.user.id
        ].includes(user.id)
      ) {
        data.friends[
          interaction.user.id
        ].push(user.id);
      }

      saveData();

      return interaction.reply(
        `🫶 Added **${user.username}** to your friends!`
      );
    }

    if (command === "friends") {
      const friends =
        data.friends[
          interaction.user.id
        ] || [];

      if (!friends.length) {
        return interaction.reply(
          "You don't have any saved friends yet ♡"
        );
      }

      const names = [];

      for (const id of friends) {
        const user =
          await client.users.fetch(
            id
          ).catch(() => null);

        if (user) {
          names.push(
            `♡ ${user.username}`
          );
        }
      }

      return interaction.reply(
        `🫶 **Your friends**\n\n${names.join("\n")}`
      );
    }

    /* ========================================
       MODERATION PERMISSIONS
    ======================================== */

    if (
      [
        "kick",
        "timeout",
        "warn",
        "warnings",
        "clear"
      ].includes(command)
    ) {
      if (
        !isStaff(
          interaction.member
        )
      ) {
        return interaction.reply({
          content:
            "🛡️ You need a staff role to use this.",
          ephemeral: true
        });
      }
    }

    /* ========================================
       BAN — OWNER ONLY
    ======================================== */

    if (command === "ban") {
      if (
        !isOwner(
          interaction.member
        )
      ) {
        return interaction.reply({
          content:
            "👑 Only the owner can ban members.",
          ephemeral: true
        });
      }

      const user =
        interaction.options.getUser(
          "user"
        );

      const reason =
        interaction.options.getString(
          "reason"
        ) ||
        "No reason provided";

      const member =
        await interaction.guild.members
          .fetch(user.id)
          .catch(() => null);

      if (
        !member ||
        !canModerate(
          interaction.member,
          member
        )
      ) {
        return interaction.reply({
          content:
            "❌ You can't ban that member.",
          ephemeral: true
        });
      }

      await member.ban({
        reason
      });

      return interaction.reply(
        `🔨 Banned **${user.username}**\nReason: ${reason}`
      );
    }

    /* ========================================
       KICK
    ======================================== */

    if (command === "kick") {
      const user =
        interaction.options.getUser(
          "user"
        );

      const reason =
        interaction.options.getString(
          "reason"
        ) ||
        "No reason provided";

      const member =
        await interaction.guild.members
          .fetch(user.id)
          .catch(() => null);

      if (
        !member ||
        !canModerate(
          interaction.member,
          member
        )
      ) {
        return interaction.reply({
          content:
            "❌ You can't kick that member.",
          ephemeral: true
        });
      }

      await member.kick(
        reason
      );

      return interaction.reply(
        `👢 Kicked **${user.username}**\nReason: ${reason}`
      );
    }

    /* ========================================
       TIMEOUT
    ======================================== */

    if (
      command === "timeout"
    ) {
      const user =
        interaction.options.getUser(
          "user"
        );

      const minutes =
        interaction.options.getInteger(
          "minutes"
        );

      const member =
        await interaction.guild.members
          .fetch(user.id)
          .catch(() => null);

      if (
        !member ||
        !canModerate(
          interaction.member,
          member
        )
      ) {
        return interaction.reply({
          content:
            "❌ You can't timeout that member.",
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

    /* ========================================
       WARN
    ======================================== */

    if (command === "warn") {
      const user =
        interaction.options.getUser(
          "user"
        );

      const reason =
        interaction.options.getString(
          "reason"
        );

      const member =
        await interaction.guild.members
          .fetch(user.id)
          .catch(() => null);

      if (
        !member ||
        !canModerate(
          interaction.member,
          member
        )
      ) {
        return interaction.reply({
          content:
            "❌ You can't warn that member.",
          ephemeral: true
        });
      }

      if (
        !data.warnings[user.id]
      ) {
        data.warnings[user.id] =
          [];
      }

      data.warnings[
        user.id
      ].push({
        reason,
        moderator:
          interaction.user.id,
        date: Date.now()
      });

      saveData();

      return interaction.reply(
        `⚠️ **${user.username}** was warned.\nReason: ${reason}`
      );
    }

    /* ========================================
       WARNINGS
    ======================================== */

    if (
      command === "warnings"
    ) {
      const user =
        interaction.options.getUser(
          "user"
        );

      const warnings =
        data.warnings[user.id] ||
        [];

      if (!warnings.length) {
        return interaction.reply(
          `♡ **${user.username}** has no warnings.`
        );
      }

      const text =
        warnings
          .map(
            (warning, index) =>
              `**${index + 1}.** ${warning.reason}`
          )
          .join("\n");

      return interaction.reply(
        `⚠️ **Warnings for ${user.username}**\n\n${text}`
      );
    }

    /* ========================================
       CLEAR
    ======================================== */

    if (command === "clear") {
      const amount =
        interaction.options.getInteger(
          "amount"
        );

      await interaction.channel.bulkDelete(
        amount,
        true
      );

      return interaction.reply({
        content:
          `🧹 Deleted ${amount} messages.`,
        ephemeral: true
      });
    }

    /* ========================================
       CONFESS
    ======================================== */

    if (command === "confess") {
      const modal =
        new ModalBuilder()
          .setCustomId(
            "confession_modal"
          )
          .setTitle(
            "♡ anonymous confession"
          );

      const input =
        new TextInputBuilder()
          .setCustomId(
            "confession"
          )
          .setLabel(
            "your confession"
          )
          .setPlaceholder(
            "write your confession..."
          )
          .setStyle(
            TextInputStyle.Paragraph
          )
          .setMaxLength(1000)
          .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder()
          .addComponents(input)
      );

      return interaction.showModal(
        modal
      );
    }

    /* ========================================
       SUGGEST
    ======================================== */

    if (command === "suggest") {
      const suggestion =
        interaction.options.getString(
          "suggestion"
        );

      const channel =
        getChannel(
          interaction.guild,
          "୨୧・suggestions"
        );

      if (!channel) {
        return interaction.reply({
          content:
            "❌ Suggestion channel doesn't exist.",
          ephemeral: true
        });
      }

      const message =
        await channel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle(
                "୨୧・suggestion"
              )
              .setDescription(
                suggestion
              )
              .setFooter({
                text:
                  `Suggested by ${interaction.user.username}`
              })
          ]
        });

      await message.react("👍");
      await message.react("👎");

      return interaction.reply({
        content:
          "♡ Your suggestion was posted!",
        ephemeral: true
      });
    }
  }
);

/* =========================================================
   WELCOME
========================================================= */

client.on(
  "guildMemberAdd",
  async member => {

    const role =
      getRole(
        member.guild,
        "Member"
      );

    if (role) {
      await member.roles
        .add(role)
        .catch(() => {});
    }

    const channel =
      getChannel(
        member.guild,
        "୨୧・welcome"
      );

    if (!channel) return;

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(
            "🌸・welcome!"
          )
          .setDescription(
            [
              `welcome ${member} ♡`,
              "",
              "we're happy to have you here!",
              "",
              "start with:",
              "୨୧・rules",
              "୨୧・introductions",
              "୨୧・roles",
              "୨୧・chat"
            ].join("\n")
          )
          .setThumbnail(
            member.user.displayAvatarURL()
          )
      ]
    });
  }
);

/* =========================================================
   GOODBYE
========================================================= */

client.on(
  "guildMemberRemove",
  async member => {

    const channel =
      getChannel(
        member.guild,
        "୨୧・goodbye"
      );

    if (!channel) return;

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(
            "☁・goodbye"
          )
          .setDescription(
            `**${member.user.username}** has left the server.`
          )
      ]
    });
  }
);

/* =========================================================
   BOOSTS
========================================================= */

client.on(
  "guildMemberUpdate",
  async (
    oldMember,
    newMember
  ) => {

    if (
      !oldMember.premiumSince &&
      newMember.premiumSince
    ) {
      const role =
        getRole(
          newMember.guild,
          "🌸・booster"
        );

      if (role) {
        await newMember.roles
          .add(role)
          .catch(() => {});
      }

      const channel =
        getChannel(
          newMember.guild,
          "୨୧・boosts"
        );

      if (channel) {
        await channel.send(
          `🌸 ${newMember} just boosted the server! thank you ♡`
        );
      }
    }

    if (
      oldMember.premiumSince &&
      !newMember.premiumSince
    ) {
      const role =
        getRole(
          newMember.guild,
          "🌸・booster"
        );

      if (role) {
        await newMember.roles
          .remove(role)
          .catch(() => {});
      }
    }
  }
);

/* =========================================================
   XP SYSTEM
========================================================= */

const xpCooldown =
  new Map();

client.on(
  "messageCreate",
  async message => {

    if (message.author.bot) {
      return;
    }

    const now =
      Date.now();

    const last =
      xpCooldown.get(
        message.author.id
      ) || 0;

    if (
      now - last <
      60000
    ) {
      return;
    }

    xpCooldown.set(
      message.author.id,
      now
    );

    if (
      !data.xp[
        message.author.id
      ]
    ) {
      data.xp[
        message.author.id
      ] = {
        xp: 0,
        level: 1
      };
    }

    const userData =
      data.xp[
        message.author.id
      ];

    userData.xp +=
      Math.floor(
        Math.random() * 10
      ) + 5;

    const needed =
      userData.level * 100;

    if (
      userData.xp >= needed
    ) {
      userData.xp -= needed;
      userData.level++;

      const levelChannel =
        getChannel(
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
  }
);

/* =========================================================
   LOGIN
========================================================= */

client.login(
  process.env.TOKEN
);