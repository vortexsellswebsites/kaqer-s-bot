const {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  REST,
  Routes,
} = require("discord.js");

// =====================================================
// bot
// =====================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ],
});

const TOKEN = process.env.TOKEN;

if (!TOKEN) {
  console.error("❌ TOKEN is missing.");
  process.exit(1);
}

// =====================================================
// roles
// =====================================================

const ROLES = {
  owner: "👑 Owner",
  admin: "🔴 Admin",
  moderator: "🛡️ Moderator",
  staff: "🔨 Staff",
  support: "🎫 Support",
  member: "👤 Member",
  bots: "🤖 Bots",
  verified: "✅ Verified",
};

const STAFF_ROLES = [
  ROLES.owner,
  ROLES.admin,
  ROLES.moderator,
  ROLES.staff,
  ROLES.support,
];

// =====================================================
// layout
// =====================================================

const LAYOUT = [
  {
    category: "✨ START HERE",
    type: "public",
    channels: [
      ["welcome", "👋・welcome"],
      ["rules", "📜・rules"],
      ["verify", "✅・verify"],
      ["announcements", "📢・announcements"],
    ],
  },

  {
    category: "💬 COMMUNITY",
    type: "member",
    channels: [
      ["chat", "💬・chat"],
      ["media", "🖼️・media"],
      ["lfg", "🎮・looking-for-group"],
      ["botCommands", "🤖・bot-commands"],
    ],
  },

  {
    category: "🎨 CREATIVE",
    type: "member",
    channels: [
      ["clips", "🎬・clips"],
      ["creations", "🎨・creations"],
      ["screenshots", "📸・screenshots"],
      ["ideas", "💡・ideas"],
    ],
  },

  {
    category: "🌐 SOCIAL",
    type: "member",
    channels: [
      ["socials", "📱・socials"],
      ["milestones", "🏆・milestones"],
      ["suggestions", "💭・suggestions"],
      ["polls", "🗳️・polls"],
    ],
  },

  {
    category: "ℹ️ INFO",
    type: "member",
    channels: [
      ["about", "❔・about"],
      ["updates", "📰・updates"],
      ["links", "🔗・links"],
    ],
  },

  {
    category: "🆘 SUPPORT",
    type: "member",
    channels: [
      ["tickets", "🎫・tickets"],
      ["applications", "📝・moderator-applications"],
    ],
  },

  {
    category: "🔐 STAFF HQ",
    type: "staff",
    channels: [
      ["staffChat", "🔒・staff-chat"],
      ["moderation", "🛡️・moderation"],
      ["staffLounge", "🔊・staff-lounge"],
    ],
  },

  {
    category: "📝 APPLICATIONS",
    type: "staff",
    channels: [
      ["pending", "⏳・pending"],
      ["accepted", "✅・accepted"],
      ["denied", "❌・denied"],
    ],
  },
];

// =====================================================
// helpers
// =====================================================

function findRole(guild, name) {
  return guild.roles.cache.find(
    (role) => role.name === name
  );
}

function findChannel(guild, name) {
  return guild.channels.cache.find(
    (channel) => channel.name === name
  );
}

function isStaff(member) {
  if (!member) return false;

  return member.roles.cache.some((role) =>
    STAFF_ROLES.includes(role.name)
  );
}

// =====================================================
// roles
// =====================================================

async function createRoles(guild) {
  const roles = {};

  const roleData = [
    [ROLES.owner, 0xf1c40f],
    [ROLES.admin, 0xe74c3c],
    [ROLES.moderator, 0x3498db],
    [ROLES.staff, 0x95a5a6],
    [ROLES.support, 0x9b59b6],
    [ROLES.member, 0x5865f2],
    [ROLES.bots, 0x7289da],
    [ROLES.verified, 0x57f287],
  ];

  for (const [name, color] of roleData) {
    let role = findRole(guild, name);

    if (!role) {
      role = await guild.roles.create({
        name,
        color,
        reason: "server rebuild",
      });
    }

    roles[name] = role;
  }

  return {
    owner: roles[ROLES.owner],
    admin: roles[ROLES.admin],
    moderator: roles[ROLES.moderator],
    staff: roles[ROLES.staff],
    support: roles[ROLES.support],
    member: roles[ROLES.member],
    bots: roles[ROLES.bots],
    verified: roles[ROLES.verified],
  };
}

// =====================================================
// DELETE EVERYTHING
// =====================================================

async function deleteEveryChannel(guild) {
  console.log(
    `🗑️ deleting every channel in ${guild.name}...`
  );

  // Fetch again so nothing is missed.
  await guild.channels.fetch();

  const channels = [...guild.channels.cache.values()];

  for (const channel of channels) {
    try {
      await channel.delete(
        "complete server rebuild"
      );

      console.log(
        `🗑️ deleted: ${channel.name}`
      );
    } catch (error) {
      console.error(
        `couldn't delete ${channel.name}:`,
        error.message
      );
    }
  }

  console.log("✅ all channels deleted.");
}

// =====================================================
// category
// =====================================================

async function createCategory(
  guild,
  name,
  type,
  roles
) {
  const category = await guild.channels.create({
    name,
    type: ChannelType.GuildCategory,
    reason: "server rebuild",
  });

  // -----------------------------------------------
  // public
  // -----------------------------------------------

  if (type === "public") {
    await category.permissionOverwrites.edit(
      guild.roles.everyone,
      {
        ViewChannel: true,
        SendMessages: false,
        AttachFiles: false,
      }
    );

    await category.permissionOverwrites.edit(
      roles.verified,
      {
        ViewChannel: true,
        SendMessages: false,
      }
    );
  }

  // -----------------------------------------------
  // member
  // -----------------------------------------------

  if (type === "member") {
    await category.permissionOverwrites.edit(
      guild.roles.everyone,
      {
        ViewChannel: false,
        SendMessages: false,
      }
    );

    await category.permissionOverwrites.edit(
      roles.verified,
      {
        ViewChannel: true,
        SendMessages: true,
        AttachFiles: false,
        ReadMessageHistory: true,
      }
    );
  }

  // -----------------------------------------------
  // staff
  // -----------------------------------------------

  if (type === "staff") {
    await category.permissionOverwrites.edit(
      guild.roles.everyone,
      {
        ViewChannel: false,
        SendMessages: false,
      }
    );

    // Explicitly hide from verified members.
    await category.permissionOverwrites.edit(
      roles.verified,
      {
        ViewChannel: false,
        SendMessages: false,
      }
    );
  }

  // -----------------------------------------------
  // staff roles
  // -----------------------------------------------

  for (const role of Object.values(roles)) {
    if (!role) continue;

    if (
      [
        roles.owner,
        roles.admin,
        roles.moderator,
        roles.staff,
        roles.support,
      ].includes(role)
    ) {
      await category.permissionOverwrites.edit(
        role,
        {
          ViewChannel: true,
          SendMessages: true,
          AttachFiles: true,
          EmbedLinks: true,
          ReadMessageHistory: true,
        }
      );
    }
  }

  return category;
}

// =====================================================
// channel
// =====================================================

async function createChannel(
  guild,
  category,
  key,
  name,
  type,
  roles
) {
  const channel = await guild.channels.create({
    name,
    type: ChannelType.GuildText,
    parent: category.id,
    reason: "server rebuild",
  });

  // -----------------------------------------------
  // public channels
  // -----------------------------------------------

  if (type === "public") {
    await channel.permissionOverwrites.edit(
      guild.roles.everyone,
      {
        ViewChannel: true,
        SendMessages: false,
        AttachFiles: false,
      }
    );

    await channel.permissionOverwrites.edit(
      roles.verified,
      {
        ViewChannel: true,
        SendMessages: false,
        AttachFiles: false,
      }
    );
  }

  // -----------------------------------------------
  // member channels
  // -----------------------------------------------

  if (type === "member") {
    await channel.permissionOverwrites.edit(
      guild.roles.everyone,
      {
        ViewChannel: false,
        SendMessages: false,
        AttachFiles: false,
      }
    );

    await channel.permissionOverwrites.edit(
      roles.verified,
      {
        ViewChannel: true,
        SendMessages: true,
        AttachFiles: false,
        EmbedLinks: true,
        ReadMessageHistory: true,
      }
    );
  }

  // -----------------------------------------------
  // staff channels
  // -----------------------------------------------

  if (type === "staff") {
    await channel.permissionOverwrites.edit(
      guild.roles.everyone,
      {
        ViewChannel: false,
        SendMessages: false,
      }
    );

    // Important:
    // verified members CANNOT see staff channels.
    await channel.permissionOverwrites.edit(
      roles.verified,
      {
        ViewChannel: false,
        SendMessages: false,
      }
    );
  }

  // -----------------------------------------------
  // staff access
  // -----------------------------------------------

  for (const role of [
    roles.owner,
    roles.admin,
    roles.moderator,
    roles.staff,
    roles.support,
  ]) {
    if (!role) continue;

    await channel.permissionOverwrites.edit(
      role,
      {
        ViewChannel: true,
        SendMessages: true,
        AttachFiles: true,
        EmbedLinks: true,
        ReadMessageHistory: true,
      }
    );
  }

  return channel;
}

// =====================================================
// honeypot
// =====================================================

async function createHoneypot(guild) {
  const category =
    await guild.channels.create({
      name: "🍯 HONEYPOT SECURITY",
      type: ChannelType.GuildCategory,
      reason: "security honeypot",
    });

  const channel =
    await guild.channels.create({
      name: "🍯・honeypot-security",
      type: ChannelType.GuildText,
      parent: category.id,
      reason: "security honeypot",
    });

  await category.permissionOverwrites.edit(
    guild.roles.everyone,
    {
      ViewChannel: true,
      SendMessages: true,
      AttachFiles: true,
      EmbedLinks: true,
    }
  );

  await channel.permissionOverwrites.edit(
    guild.roles.everyone,
    {
      ViewChannel: true,
      SendMessages: true,
      AttachFiles: true,
      EmbedLinks: true,
    }
  );

  // Keep it at the very top.
  await category.setPosition(0);

  const embed = new EmbedBuilder()
    .setTitle("🍯 security")
    .setDescription(
      [
        "`security channel`",
        "",
        "this channel is monitored.",
        "",
        "if you somehow ended up here and you're not staff, don't send anything.",
        "",
        "`messages from regular members trigger the security system.`",
      ].join("\n")
    );

  await channel.send({
    embeds: [embed],
  });

  return channel;
}

// =====================================================
// create layout
// =====================================================

async function buildLayout(
  guild,
  roles
) {
  const channels = {};

  // Honeypot first.
  await createHoneypot(guild);

  for (const section of LAYOUT) {
    const category =
      await createCategory(
        guild,
        section.category,
        section.type,
        roles
      );

    for (const [key, name] of section.channels) {
      channels[key] =
        await createChannel(
          guild,
          category,
          key,
          name,
          section.type,
          roles
        );
    }
  }

  return channels;
}

// =====================================================
// welcome
// =====================================================

async function sendWelcome(channels) {
  await channels.welcome.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("👋 welcome")
        .setDescription(
          [
            "yo! welcome to the server :)",
            "",
            "`1.` read the rules",
            "`2.` head over to verify",
            "`3.` hit the ✅ button",
            "",
            "that's it. once you're verified, you're in.",
          ].join("\n")
        ),
    ],
  });
}

// =====================================================
// rules
// =====================================================

async function sendRules(channels) {
  await channels.rules.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("📜 rules")
        .setDescription(
          [
            "`1.` don't be weird",
            "`2.` respect everyone",
            "`3.` no spam",
            "`4.` no nsfw",
            "`5.` no hate speech",
            "`6.` no advertising",
            "`7.` don't abuse bots or bugs",
            "`8.` listen to staff",
            "`9.` follow discord's rules",
            "`10.` use common sense",
            "",
            "pretty simple. don't ruin it for everyone else.",
          ].join("\n")
        ),
    ],
  });
}

// =====================================================
// verify
// =====================================================

async function sendVerify(channels) {
  const button =
    new ButtonBuilder()
      .setCustomId("verify_member")
      .setLabel("✅ Verify")
      .setStyle(ButtonStyle.Success);

  const row =
    new ActionRowBuilder().addComponents(
      button
    );

  await channels.verify.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("✅ verify")
        .setDescription(
          [
            "read the rules first.",
            "",
            "when you're ready, hit the button below.",
            "",
            "you'll get access to the rest of the server after verifying.",
          ].join("\n")
        ),
    ],
    components: [row],
  });
}

// =====================================================
// announcements
// =====================================================

async function sendAnnouncements(channels) {
  await channels.announcements.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("📢 announcements")
        .setDescription(
          "important server stuff will go here."
        ),
    ],
  });
}

// =====================================================
// community messages
// =====================================================

async function sendCommunityMessages(channels) {
  await channels.chat.send(
    "💬 **chat**\n\njust talk. have fun. don't be weird."
  );

  await channels.media.send(
    "🖼️ **media**\n\npost your favorite stuff here.\n\n`note:` regular members can't upload files in normal channels."
  );

  await channels.lfg.send(
    "🎮 **looking for group**\n\n`game:`\n`activity:`\n`players needed:`\n`mic:`"
  );

  await channels.botCommands.send(
    "🤖 **bot commands**\n\nrun your bot commands here."
  );
}

// =====================================================
// creative
// =====================================================

async function sendCreativeMessages(channels) {
  await channels.clips.send(
    "🎬 **clips**\n\nshow off your best clips."
  );

  await channels.creations.send(
    "🎨 **creations**\n\nart, edits, designs, whatever you make."
  );

  await channels.screenshots.send(
    "📸 **screenshots**\n\npost your favorite screenshots."
  );

  await channels.ideas.send(
    "💡 **ideas**\n\nhave an idea? drop it here."
  );
}

// =====================================================
// social
// =====================================================

async function sendSocialMessages(channels) {
  await channels.socials.send(
    "📱 **socials**\n\nshare your socials here."
  );

  await channels.milestones.send(
    "🏆 **milestones**\n\nshow off your achievements."
  );

  await channels.suggestions.send(
    "💭 **suggestions**\n\nsomething we should add or change?\n\ntell us."
  );

  await channels.polls.send(
    "🗳️ **polls**\n\ncommunity polls go here."
  );
}

// =====================================================
// info
// =====================================================

async function sendInfoMessages(channels) {
  await channels.about.send(
    "❔ **about**\n\nwelcome to the community.\n\nthis is where you can find basic info about the server."
  );

  await channels.updates.send(
    "📰 **updates**\n\nserver updates will be posted here."
  );

  await channels.links.send(
    "🔗 **links**\n\nimportant links will go here."
  );
}

// =====================================================
// ticket panel
// =====================================================

async function sendTicketPanel(channels) {
  const button =
    new ButtonBuilder()
      .setCustomId("create_ticket")
      .setLabel("🎫 Create Ticket")
      .setStyle(ButtonStyle.Primary);

  const row =
    new ActionRowBuilder().addComponents(
      button
    );

  await channels.tickets.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("🎫 support")
        .setDescription(
          [
            "need help?",
            "",
            "make a ticket and someone from staff will help you.",
            "",
            "`please don't make tickets for no reason.`",
          ].join("\n")
        ),
    ],
    components: [row],
  });
}

// =====================================================
// application panel
// =====================================================

async function sendApplicationPanel(
  channels
) {
  const button =
    new ButtonBuilder()
      .setCustomId("moderator_apply")
      .setLabel("📝 Apply for Moderator")
      .setStyle(ButtonStyle.Success);

  const row =
    new ActionRowBuilder().addComponents(
      button
    );

  await channels.applications.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("📝 moderator applications")
        .setDescription(
          [
            "think you'd make a good mod?",
            "",
            "hit the button below and fill out the application.",
            "",
            "`be honest. don't apply just because you want the role.`",
          ].join("\n")
        ),
    ],
    components: [row],
  });
}

// =====================================================
// staff messages
// =====================================================

async function sendStaffMessages(channels) {
  await channels.staffChat.send(
    "🔒 **staff chat**\n\nprivate staff chat."
  );

  await channels.moderation.send(
    "🛡️ **moderation**\n\nsecurity and moderation logs will show here."
  );

  await channels.staffLounge.send(
    "🔊 **staff lounge**\n\nstaff only."
  );

  await channels.pending.send(
    "⏳ **pending**\n\nnew moderator applications will show here."
  );

  await channels.accepted.send(
    "✅ **accepted**\n\naccepted applications."
  );

  await channels.denied.send(
    "❌ **denied**\n\ndenied applications."
  );
}

// =====================================================
// full setup
// =====================================================

async function setupServer(guild) {
  console.log(
    `🔧 rebuilding ${guild.name}...`
  );

  // IMPORTANT:
  // DELETE EVERY CHANNEL FIRST.
  await deleteEveryChannel(guild);

  // Roles stay because Discord roles are separate
  // from channels.
  const roles =
    await createRoles(guild);

  const channels =
    await buildLayout(
      guild,
      roles
    );

  await sendWelcome(channels);
  await sendRules(channels);
  await sendVerify(channels);
  await sendAnnouncements(channels);

  await sendCommunityMessages(channels);
  await sendCreativeMessages(channels);
  await sendSocialMessages(channels);
  await sendInfoMessages(channels);

  await sendTicketPanel(channels);
  await sendApplicationPanel(channels);

  await sendStaffMessages(channels);

  console.log(
    `✅ ${guild.name} rebuilt successfully.`
  );
}

// =====================================================
// register /setup
// =====================================================

async function registerCommands() {
  const rest =
    new REST({ version: "10" })
      .setToken(TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(
        client.user.id
      ),
      {
        body: [
          {
            name: "setup",
            description:
              "delete everything and rebuild the server",
          },
        ],
      }
    );

    console.log("✅ /setup registered.");
  } catch (error) {
    console.error(
      "❌ command registration failed:",
      error
    );
  }
}

// =====================================================
// ready
// =====================================================

client.once("ready", async () => {
  console.log(
    `🤖 ${client.user.tag} is online`
  );

  await registerCommands();

  console.log(
    "💚 bot is ready"
  );
});

// =====================================================
// NEW SERVER
// =====================================================

client.on(
  "guildCreate",
  async (guild) => {
    try {
      // New server = automatically build it.
      await setupServer(guild);
    } catch (error) {
      console.error(
        "❌ automatic setup failed:",
        error
      );
    }
  }
);

// =====================================================
// MEMBER JOIN
// =====================================================

client.on(
  "guildMemberAdd",
  async (member) => {
    try {
      const roleName = member.user.bot
        ? ROLES.bots
        : ROLES.member;

      const role =
        findRole(
          member.guild,
          roleName
        );

      if (role) {
        await member.roles.add(role);
      }

      // Don't send welcome messages for bots.
      if (member.user.bot) return;

      const welcome =
        findChannel(
          member.guild,
          "👋・welcome"
        );

      const rules =
        findChannel(
          member.guild,
          "📜・rules"
        );

      const verify =
        findChannel(
          member.guild,
          "✅・verify"
        );

      if (!welcome) return;

      await welcome.send({
        content: `${member}`,
        embeds: [
          new EmbedBuilder()
            .setTitle("👋 welcome")
            .setDescription(
              [
                `yo ${member}! welcome :)`,
                "",
                "`1.` read the rules",
                `\`2.\` go to ${rules ? `<#${rules.id}>` : "rules"}`,
                `\`3.\` hit ${verify ? `<#${verify.id}>` : "verify"}`,
                "",
                "once you're verified, you're good.",
              ].join("\n")
            ),
        ],
        allowedMentions: {
          users: [member.id],
        },
      });
    } catch (error) {
      console.error(
        "❌ member join error:",
        error
      );
    }
  }
);

// =====================================================
// 🍯 HONEYPOT
// =====================================================

client.on(
  "messageCreate",
  async (message) => {
    try {
      if (!message.guild) return;
      if (message.author.bot) return;

      if (
        message.channel.name !==
        "🍯・honeypot-security"
      ) {
        return;
      }

      const member = message.member;

      if (!member) return;

      // Owner can't be banned.
      if (
        member.id ===
        message.guild.ownerId
      ) {
        return;
      }

      // Staff are safe.
      if (isStaff(member)) {
        return;
      }

      console.log(
        `🍯 honeypot triggered by ${message.author.tag}`
      );

      await message.delete().catch(() => {});

      // Ban.
      await member.ban({
        deleteMessageSeconds: 0,
        reason:
          "honeypot security trigger",
      });

      // Immediately unban.
      await message.guild.members.unban(
        member.id,
        "honeypot soft-ban"
      );

      const moderation =
        findChannel(
          message.guild,
          "🛡️・moderation"
        );

      if (moderation) {
        await moderation.send({
          embeds: [
            new EmbedBuilder()
              .setTitle("🍯 honeypot triggered")
              .setDescription(
                [
                  `user: ${message.author}`,
                  `id: \`${message.author.id}\``,
                  "",
                  "action: `soft-ban`",
                ].join("\n")
              ),
          ],
        });
      }

      console.log(
        `🚨 soft-banned ${message.author.tag}`
      );
    } catch (error) {
      console.error(
        "❌ honeypot error:",
        error.message
      );
    }
  }
);

// =====================================================
// INTERACTIONS
// =====================================================

client.on(
  "interactionCreate",
  async (interaction) => {

    // =================================================
    // /setup
    // =================================================

    if (
      interaction.isChatInputCommand() &&
      interaction.commandName === "setup"
    ) {
      if (
        !interaction.member.permissions.has(
          PermissionFlagsBits.ManageGuild
        )
      ) {
        return interaction.reply({
          content:
            "`❌` you need **Manage Server** to do this.",
          ephemeral: true,
        });
      }

      await interaction.deferReply({
        ephemeral: true,
      });

      try {
        await setupServer(
          interaction.guild
        );

        await interaction.editReply(
          "`✅` done. every channel was deleted and the server was rebuilt."
        );
      } catch (error) {
        console.error(
          "❌ setup failed:",
          error
        );

        await interaction.editReply(
          "`❌` something went wrong while rebuilding the server.\n\ncheck the bot's permissions and role position."
        );
      }

      return;
    }

    // =================================================
    // VERIFY
    // =================================================

    if (
      interaction.isButton() &&
      interaction.customId ===
        "verify_member"
    ) {
      const role =
        findRole(
          interaction.guild,
          ROLES.verified
        );

      if (!role) {
        return interaction.reply({
          content:
            "`❌` the verified role doesn't exist. run `/setup`.",
          ephemeral: true,
        });
      }

      if (
        interaction.member.roles.cache.has(
          role.id
        )
      ) {
        return interaction.reply({
          content:
            "`✅` you're already verified.",
          ephemeral: true,
        });
      }

      try {
        await interaction.member.roles.add(
          role
        );

        await interaction.reply({
          content:
            "`✅` verified. welcome :)",
          ephemeral: true,
        });
      } catch (error) {
        console.error(
          "❌ verify error:",
          error
        );

        await interaction.reply({
          content:
            "`❌` couldn't give you the role. make sure my role is above `✅ Verified`.",
          ephemeral: true,
        });
      }

      return;
    }

    // =================================================
    // CREATE TICKET
    // =================================================

    if (
      interaction.isButton() &&
      interaction.customId ===
        "create_ticket"
    ) {
      const existing =
        interaction.guild.channels.cache.find(
          (channel) =>
            channel.name ===
              `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20)}` &&
            channel.type ===
              ChannelType.GuildText
        );

      if (existing) {
        return interaction.reply({
          content:
            `\`🎫\` you already have a ticket: ${existing}`,
          ephemeral: true,
        });
      }

      const supportCategory =
        findChannel(
          interaction.guild,
          "🎫・tickets"
        )?.parent;

      const staffOverwrites = [];

      for (const staffName of STAFF_ROLES) {
        const role =
          findRole(
            interaction.guild,
            staffName
          );

        if (role) {
          staffOverwrites.push({
            id: role.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.AttachFiles,
            ],
          });
        }
      }

      const ticketName =
        `ticket-${interaction.user.username
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")
          .slice(0, 20)}`;

      const ticket =
        await interaction.guild.channels.create({
          name: ticketName,
          type: ChannelType.GuildText,
          parent:
            supportCategory?.id || null,
          permissionOverwrites: [
            {
              id: interaction.guild.roles
                .everyone.id,
              deny: [
                PermissionFlagsBits.ViewChannel,
              ],
            },

            {
              id: interaction.user.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.AttachFiles,
              ],
            },

            ...staffOverwrites,
          ],
        });

      const closeButton =
        new ButtonBuilder()
          .setCustomId("close_ticket")
          .setLabel("🔒 Close Ticket")
          .setStyle(ButtonStyle.Danger);

      const row =
        new ActionRowBuilder().addComponents(
          closeButton
        );

      await ticket.send({
        content: `${interaction.user}`,
        embeds: [
          new EmbedBuilder()
            .setTitle("🎫 ticket")
            .setDescription(
              [
                "yo! staff will be with you soon.",
                "",
                "tell us what you need help with.",
                "",
                "`🔒` close the ticket when you're done.",
              ].join("\n")
            ),
        ],
        components: [row],
      });

      await interaction.reply({
        content:
          `\`🎫\` ticket created: ${ticket}`,
        ephemeral: true,
      });

      return;
    }

    // =================================================
    // CLOSE TICKET
    // =================================================

    if (
      interaction.isButton() &&
      interaction.customId ===
        "close_ticket"
    ) {
      if (
        !isStaff(interaction.member)
      ) {
        return interaction.reply({
          content:
            "`❌` only staff can close tickets.",
          ephemeral: true,
        });
      }

      await interaction.reply(
        "`🔒` closing ticket..."
      );

      setTimeout(async () => {
        await interaction.channel
          .delete(
            "ticket closed"
          )
          .catch(() => {});
      }, 1500);

      return;
    }

    // =================================================
    // MOD APPLICATION
    // =================================================

    if (
      interaction.isButton() &&
      interaction.customId ===
        "moderator_apply"
    ) {
      const modal =
        new ModalBuilder()
          .setCustomId(
            "moderator_application"
          )
          .setTitle(
            "moderator application"
          );

      const age =
        new TextInputBuilder()
          .setCustomId("age")
          .setLabel("age")
          .setStyle(
            TextInputStyle.Short
          )
          .setRequired(true)
          .setMaxLength(3);

      const timezone =
        new TextInputBuilder()
          .setCustomId("timezone")
          .setLabel("timezone")
          .setStyle(
            TextInputStyle.Short
          )
          .setRequired(true);

      const experience =
        new TextInputBuilder()
          .setCustomId("experience")
          .setLabel("previous moderation experience")
          .setStyle(
            TextInputStyle.Paragraph
          )
          .setRequired(true)
          .setMaxLength(1000);

      const why =
        new TextInputBuilder()
          .setCustomId("why")
          .setLabel("why should we choose you?")
          .setStyle(
            TextInputStyle.Paragraph
          )
          .setRequired(true)
          .setMaxLength(1500);

      const activity =
        new TextInputBuilder()
          .setCustomId("activity")
          .setLabel("how active are you?")
          .setStyle(
            TextInputStyle.Paragraph
          )
          .setRequired(true)
          .setMaxLength(1000);

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          age
        ),
        new ActionRowBuilder().addComponents(
          timezone
        ),
        new ActionRowBuilder().addComponents(
          experience
        ),
        new ActionRowBuilder().addComponents(
          why
        ),
        new ActionRowBuilder().addComponents(
          activity
        )
      );

      await interaction.showModal(
        modal
      );

      return;
    }

    // =================================================
    // APPLICATION SUBMITTED
    // =================================================

    if (
      interaction.isModalSubmit() &&
      interaction.customId ===
        "moderator_application"
    ) {
      const pending =
        findChannel(
          interaction.guild,
          "⏳・pending"
        );

      if (!pending) {
        return interaction.reply({
          content:
            "`❌` application channel is missing. run `/setup`.",
          ephemeral: true,
        });
      }

      const age =
        interaction.fields.getTextInputValue(
          "age"
        );

      const timezone =
        interaction.fields.getTextInputValue(
          "timezone"
        );

      const experience =
        interaction.fields.getTextInputValue(
          "experience"
        );

      const why =
        interaction.fields.getTextInputValue(
          "why"
        );

      const activity =
        interaction.fields.getTextInputValue(
          "activity"
        );

      const application =
        new EmbedBuilder()
          .setTitle("📝 moderator application")
          .setDescription(
            [
              `applicant: ${interaction.user}`,
              `id: \`${interaction.user.id}\``,
              "",
              `**age**\n${age}`,
              "",
              `**timezone**\n${timezone}`,
              "",
              `**experience**\n${experience}`,
              "",
              `**why them**\n${why}`,
              "",
              `**activity**\n${activity}`,
            ].join("\n")
          );

      const accept =
        new ButtonBuilder()
          .setCustomId(
            `app_accept_${interaction.user.id}`
          )
          .setLabel("✅ Accept")
          .setStyle(
            ButtonStyle.Success
          );

      const deny =
        new ButtonBuilder()
          .setCustomId(
            `app_deny_${interaction.user.id}`
          )
          .setLabel("❌ Deny")
          .setStyle(
            ButtonStyle.Danger
          );

      const row =
        new ActionRowBuilder().addComponents(
          accept,
          deny
        );

      await pending.send({
        embeds: [application],
        components: [row],
      });

      await interaction.reply({
        content:
          "`✅` application sent. good luck :)",
        ephemeral: true,
      });

      return;
    }

    // =================================================
    // ACCEPT APPLICATION
    // =================================================

    if (
      interaction.isButton() &&
      interaction.customId.startsWith(
        "app_accept_"
      )
    ) {
      if (
        !interaction.member.permissions.has(
          PermissionFlagsBits.ManageGuild
        )
      ) {
        return interaction.reply({
          content:
            "`❌` you can't manage applications.",
          ephemeral: true,
        });
      }

      const userId =
        interaction.customId.replace(
          "app_accept_",
          ""
        );

      const member =
        await interaction.guild.members
          .fetch(userId)
          .catch(() => null);

      if (!member) {
        return interaction.reply({
          content:
            "`❌` that member isn't in the server anymore.",
          ephemeral: true,
        });
      }

      const moderator =
        findRole(
          interaction.guild,
          ROLES.moderator
        );

      if (moderator) {
        await member.roles.add(
          moderator
        );
      }

      const accepted =
        findChannel(
          interaction.guild,
          "✅・accepted"
        );

      if (accepted) {
        await accepted.send(
          `✅ ${member} was accepted as a moderator.`
        );
      }

      await interaction.message.edit({
        components: [],
      });

      await interaction.reply(
        "`✅` application accepted."
      );

      await member
        .send(
          `✅ **your moderator application was accepted!**\n\nwelcome to the staff team :)`
        )
        .catch(() => {});

      return;
    }

    // =================================================
    // DENY APPLICATION
    // =================================================

    if (
      interaction.isButton() &&
      interaction.customId.startsWith(
        "app_deny_"
      )
    ) {
      if (
        !interaction.member.permissions.has(
          PermissionFlagsBits.ManageGuild
        )
      ) {
        return interaction.reply({
          content:
            "`❌` you can't manage applications.",
          ephemeral: true,
        });
      }

      const userId =
        interaction.customId.replace(
          "app_deny_",
          ""
        );

      const member =
        await interaction.guild.members
          .fetch(userId)
          .catch(() => null);

      const denied =
        findChannel(
          interaction.guild,
          "❌・denied"
        );

      if (denied) {
        await denied.send(
          `❌ application denied for <@${userId}>.`
        );
      }

      await interaction.message.edit({
        components: [],
      });

      await interaction.reply(
        "`❌` application denied."
      );

      if (member) {
        await member
          .send(
            `❌ **your moderator application was denied.**\n\nthanks for applying. you can always try again later.`
          )
          .catch(() => {});
      }

      return;
    }
  }
);

// =====================================================
// login
// =====================================================

client.login(TOKEN);