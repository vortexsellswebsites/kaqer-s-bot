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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

const TOKEN = process.env.TOKEN;

if (!TOKEN) {
  console.error("❌ TOKEN is missing.");
  process.exit(1);
}

const VERIFIED_ROLE = "✅ Verified";
const MEMBER_ROLE = "👤 Member";
const BOT_ROLE = "🤖 Bots";

const STAFF_ROLES = [
  "👑 Owner",
  "🔴 Admin",
  "🛡️ Moderator",
  "🔨 Staff",
  "🎫 Support",
];

const STRUCTURE = [
  {
    category: "✨ START HERE",
    channels: [
      ["welcome", "👋・welcome"],
      ["rules", "📜・rules"],
      ["verify", "✅・verify"],
      ["announcements", "📢・announcements"],
    ],
  },
  {
    category: "💬 THE LOUNGE",
    channels: [
      ["chat", "💬・chat"],
      ["media", "🖼️・media"],
      ["lfg", "🎮・looking-for-group"],
      ["commands", "🤖・bot-commands"],
    ],
  },
  {
    category: "🎨 CREATOR SPACE",
    channels: [
      ["clips", "🎬・clips"],
      ["creations", "🎨・creations"],
      ["screenshots", "📸・screenshots"],
      ["ideas", "💡・ideas"],
    ],
  },
  {
    category: "🌐 COMMUNITY",
    channels: [
      ["socials", "📱・socials"],
      ["milestones", "🏆・milestones"],
      ["suggestions", "💭・suggestions"],
      ["polls", "🗳️・polls"],
    ],
  },
  {
    category: "ℹ️ DISCOVER",
    channels: [
      ["about", "❔・about"],
      ["updates", "📰・updates"],
      ["links", "🔗・links"],
    ],
  },
  {
    category: "🆘 SUPPORT",
    channels: [
      ["tickets", "🎫・tickets"],
      ["moderatorApplications", "📝・moderator-applications"],
    ],
  },
  {
    category: "🔐 STAFF HQ",
    channels: [
      ["staffChat", "🔒・staff-chat"],
      ["moderation", "🛡️・moderation"],
      ["staffLounge", "🔊・staff-lounge"],
    ],
  },
  {
    category: "📝 APPLICATIONS",
    channels: [
      ["pending", "⏳・pending"],
      ["accepted", "✅・accepted"],
      ["denied", "❌・denied"],
    ],
  },
];

async function getOrCreateRole(guild, name, color) {
  let role = guild.roles.cache.find((r) => r.name === name);

  if (!role) {
    role = await guild.roles.create({
      name,
      color,
      reason: "Automatic community server setup",
    });
  }

  return role;
}

async function setupRoles(guild) {
  return {
    verified: await getOrCreateRole(guild, VERIFIED_ROLE, 0x57f287),
    member: await getOrCreateRole(guild, MEMBER_ROLE, 0x5865f2),
    bots: await getOrCreateRole(guild, BOT_ROLE, 0x7289da),
    owner: await getOrCreateRole(guild, "👑 Owner", 0xf1c40f),
    admin: await getOrCreateRole(guild, "🔴 Admin", 0xe74c3c),
    moderator: await getOrCreateRole(guild, "🛡️ Moderator", 0x3498db),
    staff: await getOrCreateRole(guild, "🔨 Staff", 0x95a5a6),
    support: await getOrCreateRole(guild, "🎫 Support", 0x9b59b6),
  };
}

async function getOrCreateCategory(guild, name) {
  let category = guild.channels.cache.find(
    (channel) =>
      channel.type === ChannelType.GuildCategory &&
      channel.name === name
  );

  if (!category) {
    category = await guild.channels.create({
      name,
      type: ChannelType.GuildCategory,
    });
  }

  return category;
}

async function getOrCreateChannel(guild, category, name) {
  let channel = guild.channels.cache.find(
    (channel) =>
      channel.type === ChannelType.GuildText &&
      channel.name === name &&
      channel.parentId === category.id
  );

  if (!channel) {
    channel = await guild.channels.create({
      name,
      type: ChannelType.GuildText,
      parent: category.id,
    });
  }

  return channel;
}

async function configurePermissions(guild, categories, channels, roles) {
  for (const category of Object.values(categories)) {
    const isStartHere = category.name === "✨ START HERE";

    await category.permissionOverwrites.edit(guild.roles.everyone, {
      ViewChannel: isStartHere,
      SendMessages: false,
      AttachFiles: false,
      EmbedLinks: false,
    });

    await category.permissionOverwrites.edit(roles.verified, {
      ViewChannel: true,
      SendMessages: true,
      AttachFiles: false,
      EmbedLinks: true,
    });

    for (const staffName of STAFF_ROLES) {
      const staffRole = guild.roles.cache.find(
        (role) => role.name === staffName
      );

      if (staffRole) {
        await category.permissionOverwrites.edit(staffRole, {
          ViewChannel: true,
          SendMessages: true,
          AttachFiles: true,
          EmbedLinks: true,
        });
      }
    }
  }

  const publicChannels = [
    channels.welcome,
    channels.rules,
    channels.verify,
    channels.announcements,
  ];

  for (const channel of publicChannels) {
    await channel.permissionOverwrites.edit(guild.roles.everyone, {
      ViewChannel: true,
      SendMessages: false,
      AttachFiles: false,
      EmbedLinks: false,
    });
  }

  for (const channel of Object.values(channels)) {
    if (!channel || !channel.permissionOverwrites) continue;
    if (publicChannels.includes(channel)) continue;

    await channel.permissionOverwrites.edit(guild.roles.everyone, {
      ViewChannel: false,
    });

    await channel.permissionOverwrites.edit(roles.verified, {
      ViewChannel: true,
      SendMessages: true,
      AttachFiles: false,
      EmbedLinks: true,
    });
  }

  for (const staffName of STAFF_ROLES) {
    const staffRole = guild.roles.cache.find(
      (role) => role.name === staffName
    );

    if (!staffRole) continue;

    for (const channel of Object.values(channels)) {
      if (!channel || !channel.permissionOverwrites) continue;

      await channel.permissionOverwrites.edit(staffRole, {
        ViewChannel: true,
        SendMessages: true,
        AttachFiles: true,
        EmbedLinks: true,
      });
    }
  }
}

async function sendOnce(channel, content, marker) {
  const messages = await channel.messages.fetch({ limit: 50 });

  if (messages.some((message) => message.content.includes(marker))) {
    return;
  }

  await channel.send(content);
}

async function setupMessages(channels) {
  await sendOnce(
    channels.welcome,
    `👋 **WELCOME**

Welcome to the community!

Before accessing the server:

1. Read <#${channels.rules.id}>
2. Go to <#${channels.verify.id}>
3. Click the **✅ Verify** button

Once verified, you'll unlock the rest of the server.

<AUTO_WELCOME>`,
    "<AUTO_WELCOME>"
  );

  await sendOnce(
    channels.rules,
    `📜 **SERVER RULES**

Please read these rules before verifying.

**1. Be respectful**
Treat everyone with respect.

**2. No harassment**
Bullying, threats, targeted harassment, or unnecessary drama are not allowed.

**3. No spam**
Don't spam messages, mentions, emojis, or commands.

**4. Keep it appropriate**
No NSFW, sexual, graphic, or otherwise inappropriate content.

**5. No hate speech**
Discrimination or hateful content is not allowed.

**6. No advertising**
Don't advertise servers, products, accounts, or services without permission.

**7. Don't exploit the server**
Do not abuse bots, permissions, bugs, or server features.

**8. Follow Discord's rules**
You must follow Discord's Terms of Service and Community Guidelines.

**9. Listen to staff**
Staff may take action when necessary.

**10. Use common sense**
If you wouldn't want it done to you, don't do it to someone else.

━━━━━━━━━━━━━━━━━━

✅ **By clicking Verify, you confirm that you have read and agree to follow these rules.**

<AUTO_RULES>`,
    "<AUTO_RULES>"
  );

  const verifyButton = new ButtonBuilder()
    .setCustomId("verify_member")
    .setLabel("✅ Verify")
    .setStyle(ButtonStyle.Success);

  const verifyRow = new ActionRowBuilder().addComponents(verifyButton);

  await sendOnce(
    channels.verify,
    `🔐 **VERIFY TO ENTER**

Read the rules first.

When you're ready, click the button below.

You will receive the \`✅ Verified\` role and gain access to the rest of the server.

<AUTO_VERIFY>`,
    "<AUTO_VERIFY>"
  );

  const verifyMessages = await channels.verify.messages.fetch({
    limit: 50,
  });

  const verifyPanelExists = verifyMessages.some(
    (message) =>
      message.content.includes("<AUTO_VERIFY_BUTTON>") &&
      message.components.length > 0
  );

  if (!verifyPanelExists) {
    await channels.verify.send({
      content:
        "🔘 **Click below to verify**\n\n<AUTO_VERIFY_BUTTON>",
      components: [verifyRow],
    });
  }

  await sendOnce(
    channels.announcements,
    `📢 **ANNOUNCEMENTS**

Important server news and announcements will appear here.

<AUTO_ANNOUNCEMENTS>`,
    "<AUTO_ANNOUNCEMENTS>"
  );

  const messages = {
    chat: `💬 **COMMUNITY CHAT**

Talk, meet people and enjoy the community.

Please keep conversations respectful.

<AUTO_CHAT>`,

    media: `🖼️ **MEDIA**

Share your favorite moments and media here!

**Note:** Regular members cannot upload files/images.

<AUTO_MEDIA>`,

    lfg: `🎮 **LOOKING FOR GROUP**

Looking for people to play with?

🎮 Game:
🎯 What you're doing:
👥 How many players:
🎤 Voice chat:

<AUTO_LFG>`,

    commands: `🤖 **BOT COMMANDS**

Use bot commands here.

Available:

\`/setup\`

<AUTO_COMMANDS>`,

    clips: `🎬 **CLIPS**

Share your best gaming clips and highlights!

<AUTO_CLIPS>`,

    creations: `🎨 **CREATIONS**

Show off your edits, artwork, designs, and other creations.

<AUTO_CREATIONS>`,

    screenshots: `📸 **SCREENSHOTS**

Share your favorite screenshots!

<AUTO_SCREENSHOTS>`,

    ideas: `💡 **IDEAS**

Have an idea for the server?

Drop it here.

<AUTO_IDEAS>`,

    socials: `📱 **SOCIALS**

Share your socials and discover other creators.

No spam.

<AUTO_SOCIALS>`,

    milestones: `🏆 **MILESTONES**

Celebrate community achievements here!

<AUTO_MILESTONES>`,

    suggestions: `💭 **SUGGESTIONS**

Have an idea that could improve the server?

Send it here.

<AUTO_SUGGESTIONS>`,

    polls: `🗳️ **POLLS**

Community polls will be posted here.

<AUTO_POLLS>`,

    about: `❔ **ABOUT**

Welcome to our community.

This server is built for gaming, creators, friends, and community events.

<AUTO_ABOUT>`,

    updates: `📰 **UPDATES**

Server updates and important changes will be posted here.

<AUTO_UPDATES>`,

    links: `🔗 **IMPORTANT LINKS**

Official links will be posted here.

<AUTO_LINKS>`,

    staffChat: `🔒 **STAFF CHAT**

Private staff discussion.

<AUTO_STAFF_CHAT>`,

    moderation: `🛡️ **MODERATION**

Private moderation channel.

<AUTO_MODERATION>`,

    pending: `⏳ **PENDING APPLICATIONS**

New moderator applications will appear here.

<AUTO_PENDING>`,

    accepted: `✅ **ACCEPTED**

Accepted applications will be archived here.

<AUTO_ACCEPTED>`,

    denied: `❌ **DENIED**

Denied applications will be archived here.

<AUTO_DENIED>`,
  };

  for (const [key, content] of Object.entries(messages)) {
    await sendOnce(channels[key], content, content.match(/<AUTO_[A-Z_]+>/)?.[0]);
  }
}

async function setupTicketPanel(channels) {
  const button = new ButtonBuilder()
    .setCustomId("create_ticket")
    .setLabel("🎫 Create Ticket")
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(button);

  const messages = await channels.tickets.messages.fetch({
    limit: 50,
  });

  if (
    messages.some((message) =>
      message.content.includes("<AUTO_TICKET_PANEL>")
    )
  ) {
    return;
  }

  await channels.tickets.send({
    content: `🎫 **SUPPORT TICKETS**

Need help from staff?

Click below to create a private ticket.

<AUTO_TICKET_PANEL>`,
    components: [row],
  });
}

async function setupApplicationPanel(channels) {
  const button = new ButtonBuilder()
    .setCustomId("moderator_apply")
    .setLabel("📝 Apply for Moderator")
    .setStyle(ButtonStyle.Success);

  const row = new ActionRowBuilder().addComponents(button);

  const messages = await channels.moderatorApplications.messages.fetch({
    limit: 50,
  });

  if (
    messages.some((message) =>
      message.content.includes("<AUTO_APPLICATION_PANEL>")
    )
  ) {
    return;
  }

  await channels.moderatorApplications.send({
    content: `📝 **MODERATOR APPLICATIONS**

Think you'd be a good moderator?

Click below to apply.

**We're looking for people who are:**
• Active
• Respectful
• Responsible
• Helpful
• Familiar with the server rules

<AUTO_APPLICATION_PANEL>`,
    components: [row],
  });
}

async function setupServer(guild) {
  console.log(`🔧 Setting up ${guild.name}`);

  const roles = await setupRoles(guild);
  const categories = {};
  const channels = {};

  for (const section of STRUCTURE) {
    categories[section.category] = await getOrCreateCategory(
      guild,
      section.category
    );

    for (const [key, channelName] of section.channels) {
      channels[key] = await getOrCreateChannel(
        guild,
        categories[section.category],
        channelName
      );
    }
  }

  await configurePermissions(guild, categories, channels, roles);
  await setupMessages(channels);
  await setupTicketPanel(channels);
  await setupApplicationPanel(channels);

  console.log(`✅ Setup complete for ${guild.name}`);
}

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  try {
    await rest.put(Routes.applicationCommands(client.user.id), {
      body: [
        {
          name: "setup",
          description: "Create or repair the server setup.",
        },
      ],
    });

    console.log("✅ /setup registered");
  } catch (error) {
    console.error("❌ Slash command error:", error);
  }
}

client.once("ready", async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);

  await registerCommands();

  for (const guild of client.guilds.cache.values()) {
    try {
      await setupServer(guild);
    } catch (error) {
      console.error(`❌ Setup failed for ${guild.name}`, error);
    }
  }

  console.log("🚀 BOT ONLINE");
});

client.on("guildCreate", async (guild) => {
  try {
    await setupServer(guild);
  } catch (error) {
    console.error(error);
  }
});

client.on("guildMemberAdd", async (member) => {
  try {
    const roleName = member.user.bot ? BOT_ROLE : MEMBER_ROLE;

    const role = member.guild.roles.cache.find(
      (r) => r.name === roleName
    );

    if (role) {
      await member.roles.add(role);
    }
  } catch (error) {
    console.error("❌ Join role error:", error);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "setup") {
      if (
        !interaction.member.permissions.has(
          PermissionFlagsBits.ManageGuild
        )
      ) {
        return interaction.reply({
          content: "❌ You need **Manage Server** permission.",
          ephemeral: true,
        });
      }

      await interaction.deferReply({ ephemeral: true });

      try {
        await setupServer(interaction.guild);
        await interaction.editReply("✅ Server setup repaired!");
      } catch (error) {
        console.error(error);

        await interaction.editReply(
          "❌ Setup failed. Check the bot's permissions and role position."
        );
      }
    }

    return;
  }

  if (
    interaction.isButton() &&
    interaction.customId === "verify_member"
  ) {
    const verifiedRole = interaction.guild.roles.cache.find(
      (role) => role.name === VERIFIED_ROLE
    );

    if (!verifiedRole) {
      return interaction.reply({
        content: "❌ Verified role doesn't exist. Run `/setup`.",
        ephemeral: true,
      });
    }

    if (interaction.member.roles.cache.has(verifiedRole.id)) {
      return interaction.reply({
        content: "✅ You're already verified!",
        ephemeral: true,
      });
    }

    try {
      await interaction.member.roles.add(verifiedRole);

      await interaction.reply({
        content:
          "✅ **You're verified!** You now have access to the server. Welcome! 🎉",
        ephemeral: true,
      });
    } catch (error) {
      console.error(error);

      await interaction.reply({
        content:
          "❌ I couldn't verify you. Move the bot's role higher.",
        ephemeral: true,
      });
    }

    return;
  }

  if (
    interaction.isButton() &&
    interaction.customId === "create_ticket"
  ) {
    const guild = interaction.guild;

    const category = guild.channels.cache.find(
      (channel) =>
        channel.type === ChannelType.GuildCategory &&
        channel.name === "🆘 SUPPORT"
    );

    if (!category) {
      return interaction.reply({
        content: "❌ Support category doesn't exist. Run `/setup`.",
        ephemeral: true,
      });
    }

    const existing = guild.channels.cache.find(
      (channel) =>
        channel.name === `ticket-${interaction.user.id}` &&
        channel.parentId === category.id
    );

    if (existing) {
      return interaction.reply({
        content: `❌ You already have a ticket: ${existing}`,
        ephemeral: true,
      });
    }

    const overwrites = [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
    ];

    for (const roleName of STAFF_ROLES) {
      const role = guild.roles.cache.find(
        (r) => r.name === roleName
      );

      if (role) {
        overwrites.push({
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

    const ticket = await guild.channels.create({
      name: `ticket-${interaction.user.id}`,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: overwrites,
    });

    const closeButton = new ButtonBuilder()
      .setCustomId("close_ticket")
      .setLabel("🔒 Close Ticket")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(closeButton);

    await ticket.send({
      content: `🎫 **TICKET OPENED**

Welcome ${interaction.user}!

Tell us what you need help with.

A staff member will respond shortly.`,
      components: [row],
    });

    await interaction.reply({
      content: `✅ Ticket created: ${ticket}`,
      ephemeral: true,
    });

    return;
  }

  if (
    interaction.isButton() &&
    interaction.customId === "close_ticket"
  ) {
    await interaction.reply("🔒 Closing this ticket in 3 seconds...");

    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 3000);

    return;
  }

  if (
    interaction.isButton() &&
    interaction.customId === "moderator_apply"
  ) {
    const modal = new ModalBuilder()
      .setCustomId("moderator_application")
      .setTitle("Moderator Application");

    const age = new TextInputBuilder()
      .setCustomId("age")
      .setLabel("How old are you?")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const timezone = new TextInputBuilder()
      .setCustomId("timezone")
      .setLabel("What is your timezone?")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const experience = new TextInputBuilder()
      .setCustomId("experience")
      .setLabel("Previous moderation experience?")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const why = new TextInputBuilder()
      .setCustomId("why")
      .setLabel("Why should we choose you?")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const activity = new TextInputBuilder()
      .setCustomId("activity")
      .setLabel("How active are you?")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(age),
      new ActionRowBuilder().addComponents(timezone),
      new ActionRowBuilder().addComponents(experience),
      new ActionRowBuilder().addComponents(why),
      new ActionRowBuilder().addComponents(activity)
    );

    await interaction.showModal(modal);
    return;
  }

  if (
    interaction.isModalSubmit() &&
    interaction.customId === "moderator_application"
  ) {
    const pending = interaction.guild.channels.cache.find(
      (channel) => channel.name === "⏳・pending"
    );

    if (!pending) {
      return interaction.reply({
        content: "❌ Pending channel doesn't exist.",
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle("📝 Moderator Application")
      .setDescription(
        `Applicant: ${interaction.user}\nID: ${interaction.user.id}`
      )
      .addFields(
        {
          name: "Age",
          value: interaction.fields.getTextInputValue("age"),
        },
        {
          name: "Timezone",
          value: interaction.fields.getTextInputValue("timezone"),
        },
        {
          name: "Experience",
          value: interaction.fields.getTextInputValue("experience"),
        },
        {
          name: "Why should we choose you?",
          value: interaction.fields.getTextInputValue("why"),
        },
        {
          name: "Activity",
          value: interaction.fields.getTextInputValue("activity"),
        }
      );

    const accept = new ButtonBuilder()
      .setCustomId(`accept_${interaction.user.id}`)
      .setLabel("✅ Accept")
      .setStyle(ButtonStyle.Success);

    const deny = new ButtonBuilder()
      .setCustomId(`deny_${interaction.user.id}`)
      .setLabel("❌ Deny")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(accept, deny);

    await pending.send({
      embeds: [embed],
      components: [row],
    });

    await interaction.reply({
      content: "✅ Your application has been submitted!",
      ephemeral: true,
    });

    return;
  }

  if (
    interaction.isButton() &&
    (interaction.customId.startsWith("accept_") ||
      interaction.customId.startsWith("deny_"))
  ) {
    if (
      !interaction.member.permissions.has(
        PermissionFlagsBits.ManageGuild
      )
    ) {
      return interaction.reply({
        content: "❌ You need **Manage Server** permission.",
        ephemeral: true,
      });
    }

    const accepted = interaction.customId.startsWith("accept_");
    const applicantId = interaction.customId.split("_")[1];

    const applicant = await interaction.guild.members
      .fetch(applicantId)
      .catch(() => null);

    if (accepted && applicant) {
      const moderatorRole = interaction.guild.roles.cache.find(
        (role) => role.name === "🛡️ Moderator"
      );

      if (moderatorRole) {
        await applicant.roles.add(moderatorRole);
      }

      try {
        await applicant.send(
          `🎉 Your moderator application for **${interaction.guild.name}** was accepted!`
        );
      } catch (error) {}
    } else if (!accepted && applicant) {
      try {
        await applicant.send(
          `❌ Your moderator application for **${interaction.guild.name}** was denied.`
        );
      } catch (error) {}
    }

    const destinationName = accepted
      ? "✅・accepted"
      : "❌・denied";

    const destination = interaction.guild.channels.cache.find(
      (channel) => channel.name === destinationName
    );

    if (destination) {
      await destination.send(
        `${accepted ? "✅" : "❌"} <@${applicantId}>'s application was **${
          accepted ? "accepted" : "denied"
        }** by ${interaction.user}.`
      );
    }

    await interaction.update({
      content: `${
        accepted ? "✅ Application accepted" : "❌ Application denied"
      } by ${interaction.user}`,
      components: [],
    });
  }
});

client.login(TOKEN);