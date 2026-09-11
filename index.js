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

// =====================================================
// BOT
// =====================================================

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
  console.error("❌ TOKEN is missing.");
  process.exit(1);
}

// =====================================================
// BACKUP STORAGE
// =====================================================

const DATA_DIR = path.join(process.cwd(), "data");
const BACKUP_FILE = path.join(
  DATA_DIR,
  "server-backup.json"
);

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, {
    recursive: true,
  });
}

// =====================================================
// ROLES
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
// HELPERS
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
// SAVE CURRENT SERVER
// =====================================================

async function saveBackup(guild) {
  await guild.roles.fetch();
  await guild.channels.fetch();

  const roles = guild.roles.cache
    .filter(
      (role) =>
        role.id !== guild.id &&
        !role.managed
    )
    .map((role) => ({
      name: role.name,
      color: role.hexColor,
      hoist: role.hoist,
      mentionable: role.mentionable,
      position: role.position,
      permissions:
        role.permissions.bitfield.toString(),
    }));

  const categories = guild.channels.cache
    .filter(
      (channel) =>
        channel.type ===
        ChannelType.GuildCategory
    )
    .sort(
      (a, b) =>
        a.position - b.position
    )
    .map((category) => ({
      name: category.name,
      position: category.position,

      permissionOverwrites:
        category.permissionOverwrites.cache.map(
          (overwrite) => ({
            id: overwrite.id,
            type: overwrite.type,
            allow:
              overwrite.allow.bitfield.toString(),
            deny:
              overwrite.deny.bitfield.toString(),
          })
        ),
    }));

  const channels = guild.channels.cache
    .filter(
      (channel) =>
        channel.type ===
          ChannelType.GuildText ||
        channel.type ===
          ChannelType.GuildVoice ||
        channel.type ===
          ChannelType.GuildAnnouncement
    )
    .sort(
      (a, b) =>
        a.position - b.position
    )
    .map((channel) => ({
      name: channel.name,
      type: channel.type,
      parentName:
        channel.parent?.name || null,
      position: channel.position,
      topic: channel.topic || null,
      nsfw: channel.nsfw || false,
      rateLimitPerUser:
        channel.rateLimitPerUser || 0,

      permissionOverwrites:
        channel.permissionOverwrites.cache.map(
          (overwrite) => ({
            id: overwrite.id,
            type: overwrite.type,
            allow:
              overwrite.allow.bitfield.toString(),
            deny:
              overwrite.deny.bitfield.toString(),
          })
        ),
    }));

  const backup = {
    guildId: guild.id,
    guildName: guild.name,
    savedAt:
      new Date().toISOString(),

    roles,
    categories,
    channels,
  };

  fs.writeFileSync(
    BACKUP_FILE,
    JSON.stringify(
      backup,
      null,
      2
    )
  );

  console.log(
    `💾 backup saved for ${guild.name}`
  );
}

// =====================================================
// LOAD BACKUP
// =====================================================

function loadBackup() {
  if (!fs.existsSync(BACKUP_FILE)) {
    return null;
  }

  try {
    return JSON.parse(
      fs.readFileSync(
        BACKUP_FILE,
        "utf8"
      )
    );
  } catch (error) {
    console.error(
      "❌ backup file is invalid:",
      error
    );

    return null;
  }
}

// =====================================================
// RESTORE BACKUP
// =====================================================

async function restoreBackup(guild) {
  const backup = loadBackup();

  if (!backup) {
    throw new Error(
      "No backup has been saved yet."
    );
  }

  if (
    backup.guildId !== guild.id
  ) {
    throw new Error(
      "Backup belongs to another server."
    );
  }

  await guild.roles.fetch();
  await guild.channels.fetch();

  console.log(
    `🛡️ restoring ${guild.name}...`
  );

  // ===================================================
  // ROLES
  // ===================================================

  for (const savedRole of backup.roles) {
    let role = guild.roles.cache.find(
      (r) =>
        r.name === savedRole.name &&
        !r.managed
    );

    if (!role) {
      try {
        role =
          await guild.roles.create({
            name: savedRole.name,
            color:
              savedRole.color,
            hoist:
              savedRole.hoist,
            mentionable:
              savedRole.mentionable,
            permissions:
              BigInt(
                savedRole.permissions
              ),
            reason:
              "emergency backup recovery",
          });
      } catch (error) {
        console.error(
          `❌ couldn't restore role ${savedRole.name}:`,
          error.message
        );
      }
    }
  }

  // ===================================================
  // CATEGORIES
  // ===================================================

  const categoryMap =
    new Map();

  for (const savedCategory of
    backup.categories) {
    let category =
      guild.channels.cache.find(
        (channel) =>
          channel.type ===
            ChannelType.GuildCategory &&
          channel.name ===
            savedCategory.name
      );

    if (!category) {
      try {
        category =
          await guild.channels.create({
            name:
              savedCategory.name,
            type:
              ChannelType.GuildCategory,
            reason:
              "emergency backup recovery",
          });
      } catch (error) {
        console.error(
          `❌ couldn't restore category ${savedCategory.name}:`,
          error.message
        );

        continue;
      }
    }

    categoryMap.set(
      savedCategory.name,
      category
    );

    for (const overwrite of
      savedCategory.permissionOverwrites) {
      try {
        await category.permissionOverwrites.edit(
          overwrite.id,
          {
            allow:
              BigInt(
                overwrite.allow
              ),
            deny:
              BigInt(
                overwrite.deny
              ),
          }
        );
      } catch {}
    }
  }

  // ===================================================
  // CHANNELS
  // ===================================================

  for (const savedChannel of
    backup.channels) {
    let channel =
      guild.channels.cache.find(
        (c) =>
          c.name ===
            savedChannel.name &&
          c.type ===
            savedChannel.type
      );

    const parent =
      savedChannel.parentName
        ? categoryMap.get(
            savedChannel.parentName
          )
        : null;

    if (!channel) {
      try {
        channel =
          await guild.channels.create({
            name:
              savedChannel.name,
            type:
              savedChannel.type,
            parent:
              parent?.id || null,
            topic:
              savedChannel.topic ||
              undefined,
            nsfw:
              savedChannel.nsfw,
            rateLimitPerUser:
              savedChannel.rateLimitPerUser,
            reason:
              "emergency backup recovery",
          });
      } catch (error) {
        console.error(
          `❌ couldn't restore channel ${savedChannel.name}:`,
          error.message
        );

        continue;
      }
    } else if (parent) {
      try {
        await channel.setParent(
          parent.id,
          {
            lockPermissions: false,
          }
        );
      } catch {}
    }

    for (const overwrite of
      savedChannel.permissionOverwrites) {
      try {
        await channel.permissionOverwrites.edit(
          overwrite.id,
          {
            allow:
              BigInt(
                overwrite.allow
              ),
            deny:
              BigInt(
                overwrite.deny
              ),
          }
        );
      } catch {}
    }
  }

  console.log(
    "✅ backup restored."
  );
}

// =====================================================
// HONEYPOT
// =====================================================

async function ensureHoneypot(guild) {
  let category =
    findChannel(
      guild,
      "🍯 HONEYPOT SECURITY"
    );

  if (
    !category ||
    category.type !==
      ChannelType.GuildCategory
  ) {
    category =
      await guild.channels.create({
        name:
          "🍯 HONEYPOT SECURITY",
        type:
          ChannelType.GuildCategory,
        reason:
          "honeypot security",
      });
  }

  let channel =
    findChannel(
      guild,
      "🍯・honeypot-security"
    );

  if (!channel) {
    channel =
      await guild.channels.create({
        name:
          "🍯・honeypot-security",
        type:
          ChannelType.GuildText,
        parent:
          category.id,
        reason:
          "honeypot security",
      });

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("🍯 security")
          .setDescription(
            [
              "`security channel`",
              "",
              "this channel is monitored.",
              "",
              "if you're not staff, don't send anything here.",
              "",
              "`messages from regular members trigger the security system.`",
            ].join("\n")
          ),
      ],
    });
  }

  return channel;
}

// =====================================================
// HONEYPOT TRIGGER
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

      const member =
        message.member;

      if (!member) return;

      if (
        member.id ===
        message.guild.ownerId
      ) {
        return;
      }

      if (isStaff(member)) {
        return;
      }

      console.log(
        `🍯 HONEYPOT TRIGGERED: ${message.author.tag}`
      );

      await message.delete()
        .catch(() => {});

      // =================================================
      // BAN
      // =================================================

      try {
        await message.guild.members.ban(
          member.id,
          {
            deleteMessageSeconds: 0,
            reason:
              "honeypot security trigger",
          }
        );
      } catch (error) {
        console.error(
          "❌ honeypot ban failed:",
          error
        );

        return;
      }

      console.log(
        `🔨 ${message.author.tag} banned`
      );

      // =================================================
      // WAIT
      // =================================================

      await new Promise(
        (resolve) =>
          setTimeout(resolve, 3000)
      );

      // =================================================
      // UNBAN
      // =================================================

      try {
        await message.guild.members.unban(
          member.id,
          "honeypot soft-ban"
        );
      } catch (error) {
        console.error(
          "❌ honeypot unban failed:",
          error
        );

        return;
      }

      console.log(
        `🍯 ${message.author.tag} soft-banned`
      );

      // =================================================
      // LOG
      // =================================================

      const moderation =
        findChannel(
          message.guild,
          "🛡️・moderation"
        );

      if (moderation) {
        await moderation.send({
          embeds: [
            new EmbedBuilder()
              .setTitle(
                "🍯 honeypot triggered"
              )
              .setDescription(
                [
                  `user: ${message.author}`,
                  `id: \`${member.id}\``,
                  "",
                  "message deleted: `✅`",
                  "ban: `✅`",
                  "unban: `✅`",
                  "",
                  "action: `soft-ban`",
                ].join("\n")
              ),
          ],
        });
      }
    } catch (error) {
      console.error(
        "❌ honeypot error:",
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
      const roleName =
        member.user.bot
          ? ROLES.bots
          : ROLES.member;

      const role =
        findRole(
          member.guild,
          roleName
        );

      if (role) {
        await member.roles.add(
          role
        );
      }

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
        content:
          `${member}`,

        embeds: [
          new EmbedBuilder()
            .setTitle(
              "👋 welcome"
            )
            .setDescription(
              [
                `yo ${member}! welcome :)`,
                "",
                "`1.` read the rules",
                `\`2.\` go to ${
                  rules
                    ? `<#${rules.id}>`
                    : "rules"
                }`,
                `\`3.\` hit ${
                  verify
                    ? `<#${verify.id}>`
                    : "verify"
                }`,
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
// INTERACTIONS
// =====================================================

client.on(
  "interactionCreate",
  async (interaction) => {

    // =================================================
    // /SAVE-BACKUP
    // =================================================

    if (
      interaction.isChatInputCommand() &&
      interaction.commandName ===
        "save-backup"
    ) {
      if (
        !interaction.member.permissions.has(
          PermissionFlagsBits.Administrator
        )
      ) {
        return interaction.reply({
          content:
            "`❌` you need **Administrator** to use this.",
          ephemeral: true,
        });
      }

      await interaction.deferReply({
        ephemeral: true,
      });

      try {
        await saveBackup(
          interaction.guild
        );

        await interaction.editReply(
          [
            "`💾` **backup saved**",
            "",
            "your server's current roles, categories, channels, and permissions are now saved.",
            "",
            "this backup will **not** be automatically overwritten.",
          ].join("\n")
        );
      } catch (error) {
        console.error(
          "❌ save-backup failed:",
          error
        );

        await interaction.editReply(
          "`❌` couldn't save the backup. check the bot's permissions."
        );
      }

      return;
    }

    // =================================================
    // /BACKUP
    // =================================================

    if (
      interaction.isChatInputCommand() &&
      interaction.commandName ===
        "backup"
    ) {
      if (
        !interaction.member.permissions.has(
          PermissionFlagsBits.Administrator
        )
      ) {
        return interaction.reply({
          content:
            "`❌` you need **Administrator** to use this.",
          ephemeral: true,
        });
      }

      await interaction.deferReply({
        ephemeral: true,
      });

      try {
        const backup =
          loadBackup();

        if (!backup) {
          return interaction.editReply(
            "`❌` no backup exists. use `/save-backup` first."
          );
        }

        if (
          backup.guildId !==
          interaction.guild.id
        ) {
          return interaction.editReply(
            "`❌` this backup belongs to another server."
          );
        }

        await restoreBackup(
          interaction.guild
        );

        await ensureHoneypot(
          interaction.guild
        );

        await interaction.editReply(
          [
            "`🛡️` **backup restored**",
            "",
            "your saved server structure and permissions have been restored.",
            "",
            "🍯 honeypot is active.",
          ].join("\n")
        );
      } catch (error) {
        console.error(
          "❌ backup restore failed:",
          error
        );

        await interaction.editReply(
          "`❌` restore failed. make sure the bot has Administrator and its role is high enough."
        );
      }

      return;
    }

    // =================================================
    // /TEST-HONEYPOT
    // =================================================

    if (
      interaction.isChatInputCommand() &&
      interaction.commandName ===
        "test-honeypot"
    ) {
      if (
        !interaction.member.permissions.has(
          PermissionFlagsBits.Administrator
        )
      ) {
        return interaction.reply({
          content:
            "`❌` you need **Administrator** to use this.",
          ephemeral: true,
        });
      }

      if (
        interaction.user.id ===
        interaction.guild.ownerId
      ) {
        return interaction.reply({
          content:
            "`❌` the server owner can't be used for this test.",
          ephemeral: true,
        });
      }

      await interaction.deferReply({
        ephemeral: true,
      });

      try {
        const member =
          await interaction.guild.members.fetch(
            interaction.user.id
          );

        // BAN
        await member.ban({
          deleteMessageSeconds: 0,
          reason:
            "honeypot test",
        });

        console.log(
          `🍯 TEST: ${interaction.user.tag} banned`
        );

        // WAIT
        await new Promise(
          (resolve) =>
            setTimeout(resolve, 3000)
        );

        // UNBAN
        await interaction.guild.members.unban(
          interaction.user.id,
          "honeypot test soft-ban"
        );

        console.log(
          `🍯 TEST: ${interaction.user.tag} unbanned`
        );

        const moderation =
          findChannel(
            interaction.guild,
            "🛡️・moderation"
          );

        if (moderation) {
          await moderation.send({
            embeds: [
              new EmbedBuilder()
                .setTitle(
                  "🍯 honeypot test"
                )
                .setDescription(
                  [
                    `user: ${interaction.user}`,
                    `id: \`${interaction.user.id}\``,
                    "",
                    "ban: `✅`",
                    "unban: `✅`",
                    "",
                    "result: `soft-ban successful`",
                  ].join("\n")
                ),
            ],
          });
        }

        await interaction.editReply(
          "`✅` honeypot works — you were banned and automatically unbanned."
        );
      } catch (error) {
        console.error(
          "❌ honeypot test failed:",
          error
        );

        await interaction.editReply(
          "`❌` honeypot test failed. make sure the bot has **Ban Members** and its role is above the account being tested."
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
            "`❌` verified role doesn't exist.",
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
      } catch {
        await interaction.reply({
          content:
            "`❌` couldn't give you the verified role.",
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
      const safeUsername =
        interaction.user.username
          .toLowerCase()
          .replace(
            /[^a-z0-9]/g,
            ""
          )
          .slice(0, 20);

      const ticketName =
        `ticket-${safeUsername}`;

      const existing =
        interaction.guild.channels.cache.find(
          (channel) =>
            channel.name ===
            ticketName
        );

      if (existing) {
        return interaction.reply({
          content:
            `\`🎫\` you already have a ticket: ${existing}`,
          ephemeral: true,
        });
      }

      const ticketsPanel =
        findChannel(
          interaction.guild,
          "🎫・tickets"
        );

      const supportCategory =
        ticketsPanel?.parent;

      const staffOverwrites = [];

      for (const staffName of
        STAFF_ROLES) {
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

      const ticket =
        await interaction.guild.channels.create(
          {
            name: ticketName,
            type:
              ChannelType.GuildText,
            parent:
              supportCategory?.id ||
              null,

            permissionOverwrites: [
              {
                id:
                  interaction.guild.roles
                    .everyone.id,

                deny: [
                  PermissionFlagsBits.ViewChannel,
                ],
              },

              {
                id:
                  interaction.user.id,

                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.ReadMessageHistory,
                  PermissionFlagsBits.AttachFiles,
                ],
              },

              ...staffOverwrites,
            ],
          }
        );

      const closeButton =
        new ButtonBuilder()
          .setCustomId(
            "close_ticket"
          )
          .setLabel(
            "🔒 Close Ticket"
          )
          .setStyle(
            ButtonStyle.Danger
          );

      await ticket.send({
        content:
          `${interaction.user}`,

        embeds: [
          new EmbedBuilder()
            .setTitle(
              "🎫 ticket"
            )
            .setDescription(
              [
                "yo! staff will be with you soon.",
                "",
                "tell us what's up and we'll help.",
                "",
                "`🔒` close the ticket when you're done.",
              ].join("\n")
            ),
        ],

        components: [
          new ActionRowBuilder()
            .addComponents(
              closeButton
            ),
        ],
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
        !isStaff(
          interaction.member
        )
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

      setTimeout(
        async () => {
          await interaction.channel
            .delete(
              "ticket closed"
            )
            .catch(() => {});
        },
        1500
      );

      return;
    }

    // =================================================
    // MODERATOR APPLICATION
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
          .setCustomId(
            "timezone"
          )
          .setLabel(
            "timezone"
          )
          .setStyle(
            TextInputStyle.Short
          )
          .setRequired(true);

      const experience =
        new TextInputBuilder()
          .setCustomId(
            "experience"
          )
          .setLabel(
            "previous moderation experience"
          )
          .setStyle(
            TextInputStyle.Paragraph
          )
          .setRequired(true)
          .setMaxLength(1000);

      const why =
        new TextInputBuilder()
          .setCustomId("why")
          .setLabel(
            "why should we choose you?"
          )
          .setStyle(
            TextInputStyle.Paragraph
          )
          .setRequired(true)
          .setMaxLength(1500);

      const activity =
        new TextInputBuilder()
          .setCustomId(
            "activity"
          )
          .setLabel(
            "how active are you?"
          )
          .setStyle(
            TextInputStyle.Paragraph
          )
          .setRequired(true)
          .setMaxLength(1000);

      modal.addComponents(
        new ActionRowBuilder()
          .addComponents(age),

        new ActionRowBuilder()
          .addComponents(timezone),

        new ActionRowBuilder()
          .addComponents(
            experience
          ),

        new ActionRowBuilder()
          .addComponents(why),

        new ActionRowBuilder()
          .addComponents(
            activity
          )
      );

      await interaction.showModal(
        modal
      );

      return;
    }

    // =================================================
    // APPLICATION SUBMIT
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
            "`❌` application channel is missing.",
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
          .setTitle(
            "📝 moderator application"
          )
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
          .setLabel(
            "✅ Accept"
          )
          .setStyle(
            ButtonStyle.Success
          );

      const deny =
        new ButtonBuilder()
          .setCustomId(
            `app_deny_${interaction.user.id}`
          )
          .setLabel(
            "❌ Deny"
          )
          .setStyle(
            ButtonStyle.Danger
          );

      await pending.send({
        embeds: [application],

        components: [
          new ActionRowBuilder()
            .addComponents(
              accept,
              deny
            ),
        ],
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
          "`✅` your moderator application was accepted!\n\nwelcome to the staff team :)"
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
            "`❌` your moderator application was denied.\n\nthanks for applying. you can always try again later."
          )
          .catch(() => {});
      }

      return;
    }
  }
);

// =====================================================
// READY
// =====================================================

client.once(
  "ready",
  async () => {
    console.log(
      `🤖 ${client.user.tag} is online`
    );

    const rest =
      new REST({
        version: "10",
      }).setToken(TOKEN);

    try {
      await rest.put(
        Routes.applicationCommands(
          client.user.id
        ),
        {
          body: [
            {
              name:
                "save-backup",
              description:
                "save the current server as an emergency backup",
            },
            {
              name:
                "backup",
              description:
                "restore the saved emergency backup",
            },
            {
              name:
                "test-honeypot",
              description:
                "test the honeypot soft-ban",
            },
          ],
        }
      );

      console.log(
        "✅ commands registered."
      );
    } catch (error) {
      console.error(
        "❌ command registration failed:",
        error
      );
    }

    // IMPORTANT:
    // We DO NOT save automatically here.
    // Your backup stays exactly as you saved it.

    console.log(
      "💚 bot is ready."
    );
  }
);

// =====================================================
// LOGIN
// =====================================================

client.login(TOKEN);