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

const fs = require("fs");
const path = require("path");

// ======================================================
// BOT
// ======================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const TOKEN = process.env.TOKEN;

if (!TOKEN) {
  console.error("❌ TOKEN is missing from Railway variables.");
  process.exit(1);
}

// ======================================================
// BACKUP STORAGE
// ======================================================

const DATA_DIR = path.join(process.cwd(), "data");
const BACKUP_FILE = path.join(DATA_DIR, "server-backup.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ======================================================
// ROLE NAMES
// ======================================================

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

// ======================================================
// HELPERS
// ======================================================

function findRole(guild, name) {
  return guild.roles.cache.find((role) => role.name === name);
}

function findChannel(guild, name) {
  return guild.channels.cache.find((channel) => channel.name === name);
}

function isStaff(member) {
  if (!member) return false;

  return member.roles.cache.some((role) =>
    STAFF_ROLES.includes(role.name)
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeName(name) {
  return name.replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 90);
}

// ======================================================
// BACKUP
// ======================================================

async function saveBackup(guild) {
  await guild.roles.fetch();
  await guild.channels.fetch();

  const roles = guild.roles.cache
    .filter((role) => !role.managed && role.id !== guild.id)
    .sort((a, b) => a.position - b.position)
    .map((role) => ({
      name: role.name,
      color: role.hexColor,
      hoist: role.hoist,
      mentionable: role.mentionable,
      permissions: role.permissions.bitfield.toString(),
      position: role.position,
    }));

  const categories = guild.channels.cache
    .filter((channel) => channel.type === ChannelType.GuildCategory)
    .sort((a, b) => a.position - b.position)
    .map((channel) => ({
      name: channel.name,
      position: channel.position,
      permissionOverwrites: channel.permissionOverwrites.cache.map(
        (overwrite) => ({
          id: overwrite.id,
          type: overwrite.type,
          allow: overwrite.allow.bitfield.toString(),
          deny: overwrite.deny.bitfield.toString(),
        })
      ),
    }));

  const channels = guild.channels.cache
    .filter((channel) => channel.type !== ChannelType.GuildCategory)
    .sort((a, b) => a.position - b.position)
    .map((channel) => ({
      name: channel.name,
      type: channel.type,
      parentName: channel.parent?.name || null,
      position: channel.position,
      topic: channel.topic || null,
      nsfw: channel.nsfw || false,
      rateLimitPerUser: channel.rateLimitPerUser || 0,
      permissionOverwrites: channel.permissionOverwrites.cache.map(
        (overwrite) => ({
          id: overwrite.id,
          type: overwrite.type,
          allow: overwrite.allow.bitfield.toString(),
          deny: overwrite.deny.bitfield.toString(),
        })
      ),
    }));

  const backup = {
    guildId: guild.id,
    guildName: guild.name,
    savedAt: new Date().toISOString(),
    roles,
    categories,
    channels,
  };

  fs.writeFileSync(
    BACKUP_FILE,
    JSON.stringify(backup, null, 2),
    "utf8"
  );

  return backup;
}

function loadBackup() {
  if (!fs.existsSync(BACKUP_FILE)) {
    return null;
  }

  try {
    return JSON.parse(
      fs.readFileSync(BACKUP_FILE, "utf8")
    );
  } catch (error) {
    console.error("❌ Could not read backup:", error);
    return null;
  }
}

// ======================================================
// RESTORE BACKUP
// ======================================================

async function restoreBackup(guild) {
  const backup = loadBackup();

  if (!backup) {
    throw new Error(
      "No backup exists. Use /save-backup first."
    );
  }

  if (backup.guildId !== guild.id) {
    throw new Error(
      "This backup belongs to a different server."
    );
  }

  await guild.roles.fetch();
  await guild.channels.fetch();

  // ----------------------------------------------------
  // RESTORE ROLES
  // ----------------------------------------------------

  const roleMap = new Map();

  for (const savedRole of backup.roles) {
    let role = findRole(guild, savedRole.name);

    if (!role) {
      role = await guild.roles.create({
        name: savedRole.name,
        color: savedRole.color === "#000000" ? undefined : savedRole.color,
        hoist: savedRole.hoist,
        mentionable: savedRole.mentionable,
        permissions: BigInt(savedRole.permissions),
        reason: "Emergency server backup restore",
      });
    }

    roleMap.set(savedRole.name, role);
  }

  // ----------------------------------------------------
  // RESTORE CATEGORIES
  // ----------------------------------------------------

  const categoryMap = new Map();

  for (const savedCategory of backup.categories) {
    let category = findChannel(guild, savedCategory.name);

    if (!category || category.type !== ChannelType.GuildCategory) {
      category = await guild.channels.create({
        name: savedCategory.name,
        type: ChannelType.GuildCategory,
        reason: "Emergency server backup restore",
      });
    }

    categoryMap.set(savedCategory.name, category);

    // Restore permission overwrites
    for (const overwrite of savedCategory.permissionOverwrites) {
      try {
        await category.permissionOverwrites.edit(
          overwrite.id,
          {
            allow: BigInt(overwrite.allow),
            deny: BigInt(overwrite.deny),
          }
        );
      } catch (error) {
        console.log(
          `Could not restore category permission for ${savedCategory.name}`
        );
      }
    }
  }

  // ----------------------------------------------------
  // RESTORE CHANNELS
  // ----------------------------------------------------

  for (const savedChannel of backup.channels) {
    let channel = findChannel(guild, savedChannel.name);

    const parent = savedChannel.parentName
      ? categoryMap.get(savedChannel.parentName)
      : null;

    if (!channel || channel.type !== savedChannel.type) {
      const options = {
        name: savedChannel.name,
        type: savedChannel.type,
        reason: "Emergency server backup restore",
      };

      if (parent) {
        options.parent = parent.id;
      }

      if (
        savedChannel.type === ChannelType.GuildText ||
        savedChannel.type === ChannelType.GuildAnnouncement
      ) {
        options.topic = savedChannel.topic || undefined;
        options.nsfw = savedChannel.nsfw;
        options.rateLimitPerUser =
          savedChannel.rateLimitPerUser || 0;
      }

      channel = await guild.channels.create(options);
    } else if (parent) {
      try {
        await channel.setParent(parent.id, {
          lockPermissions: false,
        });
      } catch (error) {
        console.log(
          `Could not move ${savedChannel.name} into category`
        );
      }
    }

    // Restore permissions
    for (const overwrite of savedChannel.permissionOverwrites) {
      try {
        await channel.permissionOverwrites.edit(
          overwrite.id,
          {
            allow: BigInt(overwrite.allow),
            deny: BigInt(overwrite.deny),
          }
        );
      } catch (error) {
        console.log(
          `Could not restore permissions for ${savedChannel.name}`
        );
      }
    }
  }

  return backup;
}

// ======================================================
// HONEYPOT
// ======================================================

async function ensureHoneypot(guild) {
  let category = findChannel(
    guild,
    "🍯 HONEYPOT SECURITY"
  );

  if (!category) {
    category = await guild.channels.create({
      name: "🍯 HONEYPOT SECURITY",
      type: ChannelType.GuildCategory,
      reason: "Create honeypot security system",
    });
  }

  let honeypot = findChannel(
    guild,
    "🍯・honeypot-security"
  );

  if (!honeypot) {
    honeypot = await guild.channels.create({
      name: "🍯・honeypot-security",
      type: ChannelType.GuildText,
      parent: category.id,
      reason: "Create honeypot security system",
    });

    const embed = new EmbedBuilder()
      .setTitle("🍯 honeypot security")
      .setDescription(
        "this channel is monitored by the server security system.\n\n" +
        "do **not** send messages here unless you're staff."
      );

    await honeypot.send({
      embeds: [embed],
    });
  }

  return honeypot;
}

// ======================================================
// BOT READY
// ======================================================

client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const commands = [
    {
      name: "save-backup",
      description:
        "save the current server as an emergency backup",
    },
    {
      name: "backup",
      description:
        "restore the saved emergency backup",
    },
  ];

  try {
    const rest = new REST({ version: "10" }).setToken(
      TOKEN
    );

    await rest.put(
      Routes.applicationCommands(client.user.id),
      {
        body: commands,
      }
    );

    console.log("✅ Slash commands registered.");
  } catch (error) {
    console.error(
      "❌ Failed to register slash commands:",
      error
    );
  }

  // IMPORTANT:
  // This only creates the honeypot if it doesn't exist.
  // It does NOT create/rebuild your server layout.
  for (const guild of client.guilds.cache.values()) {
    try {
      await ensureHoneypot(guild);
    } catch (error) {
      console.error(
        `❌ Honeypot setup failed in ${guild.name}:`,
        error
      );
    }
  }
});

// ======================================================
// HONEYPOT MESSAGE DETECTION
// ======================================================

client.on("messageCreate", async (message) => {
  if (!message.guild) return;
  if (message.author.bot) return;

  if (message.channel.name !== "🍯・honeypot-security") {
    return;
  }

  const member = message.member;

  if (!member) return;

  // Staff is exempt
  if (isStaff(member)) {
    return;
  }

  // Server owner is exempt
  if (message.guild.ownerId === member.id) {
    return;
  }

  try {
    await message.delete().catch(() => {});

    await message.guild.members.ban(member.id, {
      deleteMessageSeconds: 0,
      reason: "Honeypot security trigger",
    });

    console.log(
      `🍯 Honeypot triggered by ${member.user.tag}`
    );

    await sleep(3000);

    await message.guild.members.unban(
      member.id,
      "Honeypot soft-ban completed"
    );

    const modChannel = findChannel(
      message.guild,
      "🛡️・moderation"
    );

    if (modChannel) {
      await modChannel.send(
        `🍯 honeypot triggered by **${member.user.tag}** — soft-banned and unbanned.`
      );
    }
  } catch (error) {
    console.error(
      "❌ Honeypot error:",
      error
    );
  }
});

// ======================================================
// MEMBER JOIN
// ======================================================

client.on("guildMemberAdd", async (member) => {
  try {
    const role = member.user.bot
      ? findRole(member.guild, ROLES.bots)
      : findRole(member.guild, ROLES.member);

    if (role) {
      await member.roles.add(role);
    }

    const welcomeChannel = findChannel(
      member.guild,
      "👋・welcome"
    );

    if (welcomeChannel) {
      const embed = new EmbedBuilder()
        .setTitle("👋 welcome!")
        .setDescription(
          `welcome ${member} to **${member.guild.name}**!\n\n` +
          `make sure to check the rules and verify.`
        )
        .setThumbnail(member.user.displayAvatarURL());

      await welcomeChannel.send({
        embeds: [embed],
      });
    }
  } catch (error) {
    console.error(
      "❌ Member join error:",
      error
    );
  }
});

// ======================================================
// INTERACTIONS
// ======================================================

client.on("interactionCreate", async (interaction) => {
  // ====================================================
  // SLASH COMMANDS
  // ====================================================

  if (interaction.isChatInputCommand()) {

    // --------------------------------------------------
    // SAVE BACKUP
    // --------------------------------------------------

    if (interaction.commandName === "save-backup") {
      if (
        !interaction.memberPermissions?.has(
          PermissionFlagsBits.Administrator
        )
      ) {
        return interaction.reply({
          content:
            "❌ you need Administrator to use this.",
          ephemeral: true,
        });
      }

      await interaction.deferReply({
        ephemeral: true,
      });

      try {
        await saveBackup(interaction.guild);

        await interaction.editReply(
          "✅ **backup saved.**\n\n" +
          "this is now the server snapshot that `/backup` will restore."
        );
      } catch (error) {
        console.error(
          "❌ Backup save error:",
          error
        );

        await interaction.editReply(
          "❌ failed to save the backup."
        );
      }

      return;
    }

    // --------------------------------------------------
    // RESTORE BACKUP
    // --------------------------------------------------

    if (interaction.commandName === "backup") {
      if (
        !interaction.memberPermissions?.has(
          PermissionFlagsBits.Administrator
        )
      ) {
        return interaction.reply({
          content:
            "❌ you need Administrator to use this.",
          ephemeral: true,
        });
      }

      await interaction.deferReply({
        ephemeral: true,
      });

      try {
        const backup = loadBackup();

        if (!backup) {
          return interaction.editReply(
            "❌ no backup exists yet.\n\n" +
            "use `/save-backup` first."
          );
        }

        await restoreBackup(interaction.guild);
        await ensureHoneypot(interaction.guild);

        await interaction.editReply(
          "✅ **backup restored.**\n\n" +
          `backup from ${new Date(
            backup.savedAt
          ).toLocaleString()} was restored.`
        );
      } catch (error) {
        console.error(
          "❌ Backup restore error:",
          error
        );

        await interaction.editReply(
          "❌ backup restore failed.\n\n" +
          `error: ${error.message}`
        );
      }

      return;
    }
  }

  // ====================================================
  // BUTTONS
  // ====================================================

  if (interaction.isButton()) {

    // --------------------------------------------------
    // VERIFY
    // --------------------------------------------------

    if (interaction.customId === "verify") {
      const role = findRole(
        interaction.guild,
        ROLES.verified
      );

      if (!role) {
        return interaction.reply({
          content:
            "❌ the verified role doesn't exist.",
          ephemeral: true,
        });
      }

      if (interaction.member.roles.cache.has(role.id)) {
        return interaction.reply({
          content:
            "✅ you're already verified.",
          ephemeral: true,
        });
      }

      try {
        await interaction.member.roles.add(role);

        return interaction.reply({
          content:
            "✅ you're verified!",
          ephemeral: true,
        });
      } catch (error) {
        return interaction.reply({
          content:
            "❌ i couldn't give you the verified role.",
          ephemeral: true,
        });
      }
    }

    // --------------------------------------------------
    // CREATE TICKET
    // --------------------------------------------------

    if (interaction.customId === "create_ticket") {
      const existing = interaction.guild.channels.cache.find(
        (channel) =>
          channel.name ===
          `ticket-${safeName(
            interaction.user.username
          )}`
      );

      if (existing) {
        return interaction.reply({
          content:
            `🎫 you already have a ticket: ${existing}`,
          ephemeral: true,
        });
      }

      const supportRole = findRole(
        interaction.guild,
        ROLES.support
      );

      const staffRole = findRole(
        interaction.guild,
        ROLES.staff
      );

      const overwrites = [
        {
          id: interaction.guild.id,
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
          ],
        },
      ];

      if (supportRole) {
        overwrites.push({
          id: supportRole.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        });
      }

      if (staffRole) {
        overwrites.push({
          id: staffRole.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        });
      }

      const ticket = await interaction.guild.channels.create({
        name: `ticket-${safeName(
          interaction.user.username
        )}`,
        type: ChannelType.GuildText,
        permissionOverwrites: overwrites,
      });

      const embed = new EmbedBuilder()
        .setTitle("🎫 support ticket")
        .setDescription(
          `${interaction.user}, staff will be with you shortly.\n\n` +
          "please explain what you need help with."
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("close_ticket")
          .setLabel("close ticket")
          .setStyle(ButtonStyle.Danger)
      );

      await ticket.send({
        content: `${interaction.user}`,
        embeds: [embed],
        components: [row],
      });

      return interaction.reply({
        content: `🎫 ticket created: ${ticket}`,
        ephemeral: true,
      });
    }

    // --------------------------------------------------
    // CLOSE TICKET
    // --------------------------------------------------

    if (interaction.customId === "close_ticket") {
      if (!isStaff(interaction.member)) {
        return interaction.reply({
          content:
            "❌ staff only.",
          ephemeral: true,
        });
      }

      await interaction.reply(
        "🔒 closing ticket..."
      );

      await sleep(2000);

      await interaction.channel.delete(
        "Ticket closed by staff"
      );

      return;
    }

    // --------------------------------------------------
    // MODERATOR APPLICATION
    // --------------------------------------------------

    if (interaction.customId === "moderator_apply") {
      const modal = new ModalBuilder()
        .setCustomId("moderator_application")
        .setTitle("moderator application");

      const age = new TextInputBuilder()
        .setCustomId("age")
        .setLabel("age")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const timezone = new TextInputBuilder()
        .setCustomId("timezone")
        .setLabel("timezone")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const experience = new TextInputBuilder()
        .setCustomId("experience")
        .setLabel("staff experience")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const why = new TextInputBuilder()
        .setCustomId("why")
        .setLabel("why should we choose you?")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const activity = new TextInputBuilder()
        .setCustomId("activity")
        .setLabel("how active can you be?")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(age),
        new ActionRowBuilder().addComponents(timezone),
        new ActionRowBuilder().addComponents(experience),
        new ActionRowBuilder().addComponents(why),
        new ActionRowBuilder().addComponents(activity)
      );

      return interaction.showModal(modal);
    }

    // --------------------------------------------------
    // APPLICATION ACCEPT
    // --------------------------------------------------

    if (interaction.customId.startsWith("application_accept_")) {
      if (
        !interaction.memberPermissions?.has(
          PermissionFlagsBits.ManageGuild
        )
      ) {
        return interaction.reply({
          content:
            "❌ staff only.",
          ephemeral: true,
        });
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
        return interaction.reply({
          content:
            "❌ that member is no longer in the server.",
          ephemeral: true,
        });
      }

      const moderatorRole = findRole(
        interaction.guild,
        ROLES.moderator
      );

      if (moderatorRole) {
        await member.roles.add(moderatorRole);
      }

      await interaction.update({
        content: `✅ accepted ${member}`,
        embeds: interaction.message.embeds,
        components: [],
      });

      await member
        .send(
          `🎉 your moderator application for **${interaction.guild.name}** was accepted!`
        )
        .catch(() => {});

      return;
    }

    // --------------------------------------------------
    // APPLICATION DENY
    // --------------------------------------------------

    if (interaction.customId.startsWith("application_deny_")) {
      if (
        !interaction.memberPermissions?.has(
          PermissionFlagsBits.ManageGuild
        )
      ) {
        return interaction.reply({
          content:
            "❌ staff only.",
          ephemeral: true,
        });
      }

      const userId =
        interaction.customId.replace(
          "application_deny_",
          ""
        );

      const member =
        await interaction.guild.members
          .fetch(userId)
          .catch(() => null);

      await interaction.update({
        content: `❌ application denied${member ? ` for ${member}` : ""}`,
        embeds: interaction.message.embeds,
        components: [],
      });

      if (member) {
        await member
          .send(
            `your moderator application for **${interaction.guild.name}** was denied.`
          )
          .catch(() => {});
      }

      return;
    }
  }

  // ====================================================
  // MODERATOR APPLICATION SUBMISSION
  // ====================================================

  if (
    interaction.isModalSubmit() &&
    interaction.customId === "moderator_application"
  ) {
    const pendingChannel = findChannel(
      interaction.guild,
      "⏳・pending"
    );

    if (!pendingChannel) {
      return interaction.reply({
        content:
          "❌ the pending applications channel doesn't exist.",
        ephemeral: true,
      });
    }

    const age =
      interaction.fields.getTextInputValue("age");

    const timezone =
      interaction.fields.getTextInputValue(
        "timezone"
      );

    const experience =
      interaction.fields.getTextInputValue(
        "experience"
      );

    const why =
      interaction.fields.getTextInputValue("why");

    const activity =
      interaction.fields.getTextInputValue(
        "activity"
      );

    const embed = new EmbedBuilder()
      .setTitle("🛡️ new moderator application")
      .setDescription(
        `applicant: ${interaction.user}\n\n` +
        `**age**\n${age}\n\n` +
        `**timezone**\n${timezone}\n\n` +
        `**experience**\n${experience}\n\n` +
        `**why**\n${why}\n\n` +
        `**activity**\n${activity}`
      )
      .setFooter({
        text: `user id: ${interaction.user.id}`,
      });

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

    await pendingChannel.send({
      embeds: [embed],
      components: [row],
    });

    return interaction.reply({
      content:
        "✅ application submitted!",
      ephemeral: true,
    });
  }
});

// ======================================================
// LOGIN
// ======================================================

client.login(TOKEN);