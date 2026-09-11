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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ]
});

const TOKEN = process.env.TOKEN;
if (!TOKEN) throw new Error("TOKEN is missing.");

const DATA = path.join(__dirname, "data");
fs.mkdirSync(DATA, { recursive: true });

const ecoFile = path.join(DATA, "economy.json");
const backupFile = path.join(DATA, "server-backup.json");

if (!fs.existsSync(ecoFile)) fs.writeFileSync(ecoFile, "{}");
if (!fs.existsSync(backupFile)) fs.writeFileSync(backupFile, "{}");

const read = f => {
  try {
    return JSON.parse(fs.readFileSync(f, "utf8"));
  } catch {
    return {};
  }
};

const write = (f, d) =>
  fs.writeFileSync(f, JSON.stringify(d, null, 2));

const money = n =>
  `$${Number(n || 0).toLocaleString()}`;

const userData = (db, id) =>
  db[id] ||= {
    cash: 100,
    bank: 0,
    lastDaily: 0,
    lastWork: 0,
    warnings: [],
    pets: [],
    inventory: []
  };

const role = (g, name) =>
  g.roles.cache.find(r => r.name === name);

const owner = i =>
  i.member?.permissions.has(PermissionsBitField.Flags.Administrator) ||
  i.member?.roles.cache.some(r => r.name === "👑 Owner");

const mod = i =>
  owner(i) ||
  i.member?.roles.cache.some(r =>
    ["🛡️ Moderator", "🔨 Staff"].includes(r.name)
  );

const staff = i =>
  owner(i) ||
  i.member?.roles.cache.some(r =>
    ["🛡️ Moderator", "🔨 Staff"].includes(r.name)
  );

const reply = (i, content, ephemeral = true) =>
  i.replied || i.deferred
    ? i.followUp({ content, ephemeral }).catch(() => {})
    : i.reply({ content, ephemeral }).catch(() => {});

const commands = [
  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("member")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("reason")
        .setDescription("reason")
    ),

  new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban a user")
    .addStringOption(o =>
      o.setName("user")
        .setDescription("user ID")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("member")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("reason")
        .setDescription("reason")
    ),

  new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout a member")
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
    .setDescription("Remove a timeout")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("member")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a member")
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
    .setDescription("View warnings")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("member")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Delete messages")
    .addIntegerOption(o =>
      o.setName("amount")
        .setDescription("1-100")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("slowmode")
    .setDescription("Set slowmode")
    .addIntegerOption(o =>
      o.setName("seconds")
        .setDescription("0-21600")
        .setMinValue(0)
        .setMaxValue(21600)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("lock")
    .setDescription("Lock this channel"),

  new SlashCommandBuilder()
    .setName("unlock")
    .setDescription("Unlock this channel"),

  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check bot latency"),

  new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Show user info")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("user")
    ),

  new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("Show server info"),

  new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Show an avatar")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("user")
    ),

  new SlashCommandBuilder()
    .setName("botinfo")
    .setDescription("Show bot info"),

  new SlashCommandBuilder()
    .setName("8ball")
    .setDescription("Ask the magic 8ball")
    .addStringOption(o =>
      o.setName("question")
        .setDescription("question")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Flip a coin"),

  new SlashCommandBuilder()
    .setName("dice")
    .setDescription("Roll a dice"),

  new SlashCommandBuilder()
    .setName("roll")
    .setDescription("Roll a custom dice")
    .addIntegerOption(o =>
      o.setName("sides")
        .setDescription("number of sides")
        .setMinValue(2)
        .setMaxValue(1000)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("choose")
    .setDescription("Choose between options")
    .addStringOption(o =>
      o.setName("options")
        .setDescription("separate with commas")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("rps")
    .setDescription("Play rock paper scissors")
    .addStringOption(o =>
      o.setName("choice")
        .setDescription("choice")
        .setRequired(true)
        .addChoices(
          { name: "rock", value: "rock" },
          { name: "paper", value: "paper" },
          { name: "scissors", value: "scissors" }
        )
    ),

  new SlashCommandBuilder()
    .setName("ship")
    .setDescription("Ship two users")
    .addUserOption(o =>
      o.setName("user1")
        .setDescription("first")
        .setRequired(true)
    )
    .addUserOption(o =>
      o.setName("user2")
        .setDescription("second")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Check balance")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("user")
    ),

  new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Claim daily cash"),

  new SlashCommandBuilder()
    .setName("work")
    .setDescription("Work for cash"),

  new SlashCommandBuilder()
    .setName("pay")
    .setDescription("Pay a user")
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
    .setDescription("Hunt for an animal"),

  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Cash leaderboard"),

  new SlashCommandBuilder()
    .setName("deposit")
    .setDescription("Deposit cash")
    .addIntegerOption(o =>
      o.setName("amount")
        .setDescription("amount")
        .setMinValue(1)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("withdraw")
    .setDescription("Withdraw bank cash")
    .addIntegerOption(o =>
      o.setName("amount")
        .setDescription("amount")
        .setMinValue(1)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("slots")
    .setDescription("Play slots")
    .addIntegerOption(o =>
      o.setName("bet")
        .setDescription("bet")
        .setMinValue(1)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("gamble")
    .setDescription("Gamble cash")
    .addIntegerOption(o =>
      o.setName("amount")
        .setDescription("amount")
        .setMinValue(1)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("dicebet")
    .setDescription("Bet on a dice roll")
    .addIntegerOption(o =>
      o.setName("amount")
        .setDescription("bet")
        .setMinValue(1)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("pets")
    .setDescription("View your pets"),

  new SlashCommandBuilder()
    .setName("pet")
    .setDescription("View your active pet"),

  new SlashCommandBuilder()
    .setName("feed")
    .setDescription("Feed your pet"),

  new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play with your pet"),

  new SlashCommandBuilder()
    .setName("inventory")
    .setDescription("View inventory"),

  new SlashCommandBuilder()
    .setName("shop")
    .setDescription("View shop"),

  new SlashCommandBuilder()
    .setName("verify-panel")
    .setDescription("Send verification panel"),

  new SlashCommandBuilder()
    .setName("ticket-panel")
    .setDescription("Send ticket panel"),

  new SlashCommandBuilder()
    .setName("mod-panel")
    .setDescription("Send moderator application panel"),

  new SlashCommandBuilder()
    .setName("rules")
    .setDescription("Send rules"),

  new SlashCommandBuilder()
    .setName("announce")
    .setDescription("Send announcement")
    .addStringOption(o =>
      o.setName("message")
        .setDescription("announcement")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("say")
    .setDescription("Make bot say something")
    .addStringOption(o =>
      o.setName("message")
        .setDescription("message")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("addrole")
    .setDescription("Add a role")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("member")
        .setRequired(true)
    )
    .addRoleOption(o =>
      o.setName("role")
        .setDescription("role")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("removerole")
    .setDescription("Remove a role")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("member")
        .setRequired(true)
    )
    .addRoleOption(o =>
      o.setName("role")
        .setDescription("role")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("role")
    .setDescription("Manage a role")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("member")
        .setRequired(true)
    )
    .addRoleOption(o =>
      o.setName("role")
        .setDescription("role")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("action")
        .setDescription("add/remove")
        .setRequired(true)
        .addChoices(
          { name: "add", value: "add" },
          { name: "remove", value: "remove" }
        )
    ),

  new SlashCommandBuilder()
    .setName("nick")
    .setDescription("Change nickname")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("member")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("nickname")
        .setDescription("nickname")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("save-backup")
    .setDescription("Save server backup"),

  new SlashCommandBuilder()
    .setName("backup")
    .setDescription("Restore server backup")
].map(c => c.toJSON());

const animals = [
  ["🐱", "Cat", 0.45, 100],
  ["🐶", "Dog", 0.25, 150],
  ["🐰", "Rabbit", 0.15, 200],
  ["🦊", "Fox", 0.08, 350],
  ["🐺", "Wolf", 0.045, 600],
  ["🐉", "Dragon", 0.02, 1500],
  ["🦄", "Unicorn", 0.01, 3000]
];

function pickAnimal() {
  let r = Math.random();
  let s = 0;

  for (const a of animals) {
    s += a[2];
    if (r <= s) return a;
  }

  return animals[0];
}

client.once("clientReady", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  try {
    await client.application.commands.set(commands);
    console.log(`✅ Registered ${commands.length} commands`);
  } catch (e) {
    console.error("Command registration:", e);
  }
});

client.on("guildMemberAdd", async member => {
  const r = role(member.guild, "Member");

  if (r) {
    await member.roles.add(r).catch(() => {});
  }

  const ch = member.guild.systemChannel;

  if (ch) {
    ch.send(
      `👋 Welcome ${member} to **${member.guild.name}**!`
    ).catch(() => {});
  }
});

client.on("messageCreate", async message => {
  if (message.author.bot || !message.guild) return;

  if (
    message.channel.name === "🍯・honeypot-security" &&
    !staff({ member: message.member })
  ) {
    await message.delete().catch(() => {});
    await message.member.ban({
      reason: "Honeypot security channel"
    }).catch(() => {});
  }
});

client.on("interactionCreate", async interaction => {
  try {
    if (interaction.isButton()) {

      if (interaction.customId === "verify") {
        await interaction.deferReply({ ephemeral: true });

        const verifiedRole = role(
          interaction.guild,
          "Verified"
        );

        if (!verifiedRole) {
          return interaction.editReply(
            "❌ The `Verified` role doesn't exist."
          );
        }

        if (
          verifiedRole.position >=
          interaction.guild.members.me.roles.highest.position
        ) {
          return interaction.editReply(
            "❌ Move the Verified role below the bot's highest role."
          );
        }

        await interaction.member.roles.add(verifiedRole);

        return interaction.editReply(
          "✅ You're verified!"
        );
      }

      if (interaction.customId === "create_ticket") {
        await interaction.deferReply({ ephemeral: true });

        const channel =
          await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`
              .toLowerCase()
              .slice(0, 90),
            type: ChannelType.GuildText,
            permissionOverwrites: [
              {
                id: interaction.guild.roles.everyone.id,
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
            ]
          });

        const row =
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("close_ticket")
              .setLabel("Close Ticket")
              .setStyle(ButtonStyle.Danger)
          );

        await channel.send({
          content:
            `🎫 ${interaction.user}, staff will help you soon.`,
          components: [row]
        });

        return interaction.editReply(
          `✅ Ticket created: ${channel}`
        );
      }

      if (interaction.customId === "close_ticket") {
        await interaction.deferReply({ ephemeral: true });

        await interaction.editReply(
          "🔒 Closing ticket..."
        );

        setTimeout(() => {
          interaction.channel.delete().catch(() => {});
        }, 1000);

        return;
      }

      if (interaction.customId === "moderator_apply") {
        const modal =
          new ModalBuilder()
            .setCustomId("moderator_application")
            .setTitle("Moderator Application");

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("age")
              .setLabel("Age")
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("why")
              .setLabel("Why should we choose you?")
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
          )
        );

        return interaction.showModal(modal);
      }

      if (
        interaction.customId.startsWith("application_")
      ) {
        if (!staff(interaction)) {
          return reply(
            interaction,
            "❌ Staff only."
          );
        }

        await interaction.deferReply({
          ephemeral: true
        });

        const parts =
          interaction.customId.split("_");

        const action = parts[1];
        const id = parts[2];

        const member =
          await interaction.guild.members
            .fetch(id)
            .catch(() => null);

        if (!member) {
          return interaction.editReply(
            "❌ Member not found."
          );
        }

        return interaction.editReply(
          `✅ Application ${action}ed for ${member.user.tag}.`
        );
      }
    }

    if (
      interaction.isModalSubmit() &&
      interaction.customId ===
        "moderator_application"
    ) {
      await interaction.deferReply({
        ephemeral: true
      });

      const channel =
        interaction.guild.channels.cache.find(
          c =>
            c.name.includes("staff") &&
            c.isTextBased()
        );

      if (channel) {
        const row =
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(
                `application_accept_${interaction.user.id}`
              )
              .setLabel("Accept")
              .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
              .setCustomId(
                `application_deny_${interaction.user.id}`
              )
              .setLabel("Deny")
              .setStyle(ButtonStyle.Danger)
          );

        await channel.send({
          content:
            `📋 **Moderator Application**\n` +
            `Applicant: ${interaction.user}\n` +
            `Age: ${interaction.fields.getTextInputValue("age")}\n` +
            `Why: ${interaction.fields.getTextInputValue("why")}`,
          components: [row]
        }).catch(() => {});
      }

      return interaction.editReply(
        "✅ Application submitted."
      );
    }

    if (!interaction.isChatInputCommand()) return;

    const command = interaction.commandName;

    if (
      ["ban", "unban"].includes(command) &&
      !owner(interaction)
    ) {
      return reply(
        interaction,
        "❌ Owner only."
      );
    }

    if (
      [
        "kick",
        "timeout",
        "untimeout",
        "warn",
        "warnings",
        "clear",
        "slowmode",
        "lock",
        "unlock"
      ].includes(command) &&
      !mod(interaction)
    ) {
      return reply(
        interaction,
        "❌ Moderator/Staff only."
      );
    }

    if (
      [
        "addrole",
        "removerole",
        "role",
        "nick",
        "save-backup",
        "backup"
      ].includes(command) &&
      !owner(interaction)
    ) {
      return reply(
        interaction,
        "❌ Owner only."
      );
    }

    if (
      [
        "verify-panel",
        "ticket-panel",
        "mod-panel",
        "rules",
        "announce",
        "say"
      ].includes(command) &&
      !staff(interaction)
    ) {
      return reply(
        interaction,
        "❌ Staff only."
      );
    }

    if (
      [
        "ban",
        "kick",
        "timeout",
        "untimeout",
        "warn",
        "clear",
        "slowmode",
        "lock",
        "unlock",
        "addrole",
        "removerole",
        "role",
        "nick",
        "save-backup",
        "backup"
      ].includes(command)
    ) {
      await interaction.deferReply({
        ephemeral: true
      });
    }

    if (command === "ban") {
      const member =
        await interaction.guild.members
          .fetch(
            interaction.options.getUser("user").id
          )
          .catch(() => null);

      if (!member) {
        return interaction.editReply(
          "❌ Member not found."
        );
      }

      await member.ban({
        reason:
          interaction.options.getString("reason") ||
          "No reason"
      });

      return interaction.editReply(
        "🔨 Banned."
      );
    }

    if (command === "unban") {
      await interaction.guild.members.unban(
        interaction.options.getString("user")
      );

      return interaction.reply(
        "✅ Unbanned."
      );
    }

    if (command === "kick") {
      const member =
        await interaction.guild.members
          .fetch(
            interaction.options.getUser("user").id
          )
          .catch(() => null);

      if (!member) {
        return interaction.editReply(
          "❌ Member not found."
        );
      }

      await member.kick(
        interaction.options.getString("reason") ||
        "No reason"
      );

      return interaction.editReply(
        "👢 Kicked."
      );
    }

    if (command === "timeout") {
      const member =
        await interaction.guild.members
          .fetch(
            interaction.options.getUser("user").id
          )
          .catch(() => null);

      if (!member) {
        return interaction.editReply(
          "❌ Member not found."
        );
      }

      await member.timeout(
        interaction.options.getInteger("minutes") *
          60000,
        "Moderator timeout"
      );

      return interaction.editReply(
        "⏱️ Timed out."
      );
    }

    if (command === "untimeout") {
      const member =
        await interaction.guild.members
          .fetch(
            interaction.options.getUser("user").id
          )
          .catch(() => null);

      if (!member) {
        return interaction.editReply(
          "❌ Member not found."
        );
      }

      await member.timeout(
        null,
        "Timeout removed"
      );

      return interaction.editReply(
        "✅ Timeout removed."
      );
    }

    if (command === "warn") {
      const db = read(ecoFile);
      const user =
        interaction.options.getUser("user");

      const data =
        userData(db, user.id);

      data.warnings.push({
        reason:
          interaction.options.getString("reason"),
        by: interaction.user.id,
        at: Date.now()
      });

      write(ecoFile, db);

      return interaction.editReply(
        `⚠️ Warned ${user.tag}.`
      );
    }

    if (command === "warnings") {
      const db = read(ecoFile);
      const user =
        interaction.options.getUser("user");

      const data =
        userData(db, user.id);

      return interaction.editReply(
        data.warnings.length
          ? data.warnings
              .map(
                (w, n) =>
                  `${n + 1}. ${w.reason}`
              )
              .join("\n")
          : "✅ No warnings."
      );
    }

    if (command === "clear") {
      const amount =
        interaction.options.getInteger("amount");

      await interaction.channel.bulkDelete(
        amount,
        true
      );

      return interaction.editReply(
        `🧹 Deleted ${amount} messages.`
      );
    }

    if (command === "slowmode") {
      await interaction.channel.setRateLimitPerUser(
        interaction.options.getInteger("seconds")
      );

      return interaction.editReply(
        "🐢 Slowmode updated."
      );
    }

    if (command === "lock") {
      await interaction.channel.permissionOverwrites
        .edit(
          interaction.guild.roles.everyone,
          { SendMessages: false }
        );

      return interaction.editReply(
        "🔒 Channel locked."
      );
    }

    if (command === "unlock") {
      await interaction.channel.permissionOverwrites
        .edit(
          interaction.guild.roles.everyone,
          { SendMessages: null }
        );

      return interaction.editReply(
        "🔓 Channel unlocked."
      );
    }

    if (
      command === "addrole" ||
      command === "removerole"
    ) {
      const member =
        await interaction.guild.members.fetch(
          interaction.options.getUser("user").id
        );

      const selectedRole =
        interaction.options.getRole("role");

      if (command === "addrole") {
        await member.roles.add(selectedRole);
      } else {
        await member.roles.remove(selectedRole);
      }

      return interaction.editReply(
        "✅ Done."
      );
    }

    if (command === "role") {
      const member =
        await interaction.guild.members.fetch(
          interaction.options.getUser("user").id
        );

      const selectedRole =
        interaction.options.getRole("role");

      const action =
        interaction.options.getString("action");

      if (action === "add") {
        await member.roles.add(selectedRole);
      } else {
        await member.roles.remove(selectedRole);
      }

      return interaction.editReply(
        "✅ Done."
      );
    }

    if (command === "nick") {
      const member =
        await interaction.guild.members.fetch(
          interaction.options.getUser("user").id
        );

      await member.setNickname(
        interaction.options.getString("nickname")
      );

      return interaction.editReply(
        "✅ Nickname changed."
      );
    }

    if (command === "save-backup") {
      const backup = {
        roles:
          interaction.guild.roles.cache
            .filter(r => r.id !== interaction.guild.id)
            .map(r => ({
              name: r.name,
              color: r.hexColor,
              hoist: r.hoist,
              mentionable: r.mentionable,
              permissions:
                r.permissions.bitfield.toString()
            })),

        channels:
          interaction.guild.channels.cache.map(
            channel => ({
              name: channel.name,
              type: channel.type,
              parent:
                channel.parent?.name || null
            })
          )
      };

      write(backupFile, backup);

      return interaction.editReply(
        "💾 Backup saved."
      );
    }

    if (command === "backup") {
      const backup = read(backupFile);

      if (!backup.channels) {
        return interaction.editReply(
          "❌ No backup found."
        );
      }

      for (const r of backup.roles || []) {
        if (!role(interaction.guild, r.name)) {
          await interaction.guild.roles.create({
            name: r.name,
            color: r.color,
            hoist: r.hoist,
            mentionable: r.mentionable,
            permissions: BigInt(
              r.permissions || 0
            )
          }).catch(() => {});
        }
      }

      return interaction.editReply(
        "♻️ Backup restored."
      );
    }

    if (command === "ping") {
      return interaction.reply(
        `🏓 ${client.ws.ping}ms`
      );
    }

    if (command === "userinfo") {
      const user =
        interaction.options.getUser("user") ||
        interaction.user;

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(user.tag)
            .setThumbnail(
              user.displayAvatarURL()
            )
            .addFields(
              {
                name: "ID",
                value: user.id
              },
              {
                name: "Created",
                value:
                  `<t:${Math.floor(
                    user.createdTimestamp / 1000
                  )}:R>`
              }
            )
        ]
      });
    }

    if (command === "serverinfo") {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(interaction.guild.name)
            .addFields(
              {
                name: "Members",
                value:
                  String(
                    interaction.guild.memberCount
                  )
              },
              {
                name: "Channels",
                value:
                  String(
                    interaction.guild.channels.cache.size
                  )
              },
              {
                name: "Roles",
                value:
                  String(
                    interaction.guild.roles.cache.size
                  )
              }
            )
        ]
      });
    }

    if (command === "avatar") {
      const user =
        interaction.options.getUser("user") ||
        interaction.user;

      return interaction.reply(
        user.displayAvatarURL({
          size: 1024
        })
      );
    }

    if (command === "botinfo") {
      return interaction.reply(
        `🤖 ${client.user.tag}\nServers: ${client.guilds.cache.size}`
      );
    }

    if (command === "8ball") {
      const answers = [
        "Yes.",
        "No.",
        "Maybe.",
        "Definitely.",
        "Probably not.",
        "Ask again later.",
        "Absolutely.",
        "I don't know."
      ];

      return interaction.reply(
        `🎱 ${
          answers[
            Math.floor(
              Math.random() * answers.length
            )
          ]
        }`
      );
    }

    if (command === "coinflip") {
      return interaction.reply(
        `🪙 ${
          Math.random() < 0.5
            ? "Heads"
            : "Tails"
        }!`
      );
    }

    if (command === "dice") {
      return interaction.reply(
        `🎲 ${
          1 +
          Math.floor(
            Math.random() * 6
          )
        }`
      );
    }

    if (command === "roll") {
      const sides =
        interaction.options.getInteger(
          "sides"
        );

      return interaction.reply(
        `🎲 ${
          1 +
          Math.floor(
            Math.random() * sides
          )
        }`
      );
    }

    if (command === "choose") {
      const options =
        interaction.options
          .getString("options")
          .split(",")
          .map(x => x.trim())
          .filter(Boolean);

      return interaction.reply(
        `🎯 ${
          options[
            Math.floor(
              Math.random() * options.length
            )
          ] || "Nothing"
        }`
      );
    }

    if (command === "rps") {
      const choices = [
        "rock",
        "paper",
        "scissors"
      ];

      const botChoice =
        choices[
          Math.floor(
            Math.random() * choices.length
          )
        ];

      const userChoice =
        interaction.options.getString(
          "choice"
        );

      let result;

      if (userChoice === botChoice) {
        result = "Tie!";
      } else if (
        (userChoice === "rock" &&
          botChoice === "scissors") ||
        (userChoice === "paper" &&
          botChoice === "rock") ||
        (userChoice === "scissors" &&
          botChoice === "paper")
      ) {
        result = "You win!";
      } else {
        result = "I win!";
      }

      return interaction.reply(
        `✊ You: **${userChoice}**\n` +
        `🤖 Me: **${botChoice}**\n` +
        `${result}`
      );
    }

    if (command === "ship") {
      const user1 =
        interaction.options.getUser("user1");

      const user2 =
        interaction.options.getUser("user2");

      return interaction.reply(
        `💘 ${user1.username} + ${user2.username} = **${
          Math.floor(Math.random() * 101)
        }%**`
      );
    }

    const db = read(ecoFile);

    if (
      [
        "balance",
        "daily",
        "work",
        "pay",
        "hunt",
        "leaderboard",
        "deposit",
        "withdraw",
        "slots",
        "gamble",
        "dicebet",
        "pets",
        "pet",
        "feed",
        "play",
        "inventory",
        "shop"
      ].includes(command)
    ) {
      const data =
        userData(db, interaction.user.id);

      if (command === "balance") {
        const user =
          interaction.options.getUser("user") ||
          interaction.user;

        const target =
          userData(db, user.id);

        return interaction.reply(
          `💰 **${user.username}**\n` +
          `Cash: ${money(target.cash)}\n` +
          `Bank: ${money(target.bank)}`
        );
      }

      if (command === "daily") {
        if (
          Date.now() - data.lastDaily <
          86400000
        ) {
          return interaction.reply(
            "⏳ Daily is on cooldown."
          );
        }

        data.cash += 500;
        data.lastDaily = Date.now();

        write(ecoFile, db);

        return interaction.reply(
          "💵 You got $500!"
        );
      }

      if (command === "work") {
        if (
          Date.now() - data.lastWork <
          3600000
        ) {
          return interaction.reply(
            "⏳ Work is on cooldown."
          );
        }

        const amount =
          100 +
          Math.floor(
            Math.random() * 401
          );

        data.cash += amount;
        data.lastWork = Date.now();

        write(ecoFile, db);

        return interaction.reply(
          `💼 You earned ${money(amount)}!`
        );
      }

      if (command === "pay") {
        const user =
          interaction.options.getUser("user");

        const amount =
          interaction.options.getInteger(
            "amount"
          );

        if (
          user.id === interaction.user.id ||
          data.cash < amount
        ) {
          return interaction.reply(
            "❌ Not enough cash."
          );
        }

        data.cash -= amount;
        userData(db, user.id).cash += amount;

        write(ecoFile, db);

        return interaction.reply(
          `💸 Paid ${money(amount)} to ${user}.`
        );
      }

      if (command === "hunt") {
        const animal = pickAnimal();

        data.cash += animal[3];

        data.pets.push({
          name: animal[1],
          emoji: animal[0],
          value: animal[3]
        });

        write(ecoFile, db);

        return interaction.reply(
          `${animal[0]} **You caught a ${animal[1]}!** +${money(animal[3])}`
        );
      }

      if (command === "leaderboard") {
        const list =
          Object.entries(db)
            .sort(
              (a, b) =>
                (b[1].cash + b[1].bank) -
                (a[1].cash + a[1].bank)
            )
            .slice(0, 10);

        return interaction.reply(
          list.length
            ? list
                .map(
                  (v, n) =>
                    `**${n + 1}.** <@${v[0]}> — ${money(
                      v[1].cash + v[1].bank
                    )}`
                )
                .join("\n")
            : "No data."
        );
      }

      if (command === "deposit") {
        const amount =
          interaction.options.getInteger(
            "amount"
          );

        if (data.cash < amount) {
          return interaction.reply(
            "❌ Not enough cash."
          );
        }

        data.cash -= amount;
        data.bank += amount;

        write(ecoFile, db);

        return interaction.reply(
          `🏦 Deposited ${money(amount)}.`
        );
      }

      if (command === "withdraw") {
        const amount =
          interaction.options.getInteger(
            "amount"
          );

        if (data.bank < amount) {
          return interaction.reply(
            "❌ Not enough bank cash."
          );
        }

        data.bank -= amount;
        data.cash += amount;

        write(ecoFile, db);

        return interaction.reply(
          `🏦 Withdrew ${money(amount)}.`
        );
      }

      if (
        command === "slots" ||
        command === "gamble" ||
        command === "dicebet"
      ) {
        const amount =
          interaction.options.getInteger(
            command === "slots"
              ? "bet"
              : "amount"
          );

        if (data.cash < amount) {
          return interaction.reply(
            "❌ Not enough cash."
          );
        }

        const win =
          Math.random() < 0.45;

        const multiplier =
          command === "slots" &&
          Math.random() < 0.2
            ? 5
            : 2;

        data.cash += win
          ? amount * (multiplier - 1)
          : -amount;

        write(ecoFile, db);

        return interaction.reply(
          win
            ? `🎰 You won ${money(
                amount * multiplier
              )}!`
            : `💀 You lost ${money(amount)}.`
        );
      }

      if (command === "pets") {
        return interaction.reply(
          data.pets.length
            ? data.pets
                .map(
                  (p, n) =>
                    `${n + 1}. ${p.emoji} ${p.name}`
                )
                .join("\n")
            : "🐾 You have no pets. Use `/hunt`!"
        );
      }

      if (command === "pet") {
        return interaction.reply(
          data.pets[0]
            ? `${data.pets[0].emoji} Your pet is **${data.pets[0].name}**.`
            : "🐾 No pet yet."
        );
      }

      if (command === "feed") {
        return interaction.reply(
          data.pets[0]
            ? `🍖 You fed ${data.pets[0].name}!`
            : "🐾 Get a pet with `/hunt`."
        );
      }

      if (command === "play") {
        return interaction.reply(
          data.pets[0]
            ? `🎾 You played with ${data.pets[0].name}!`
            : "🐾 Get a pet with `/hunt`."
        );
      }

      if (command === "inventory") {
        return interaction.reply(
          data.inventory.length
            ? data.inventory.join("\n")
            : "🎒 Inventory is empty."
        );
      }

      if (command === "shop") {
        return interaction.reply(
          "🛒 **Shop**\n" +
          "🍎 Apple — $50\n" +
          "🧸 Toy — $100\n" +
          "🍖 Pet Food — $75"
        );
      }
    }

    if (command === "verify-panel") {
      const row =
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("verify")
            .setLabel("Verify")
            .setStyle(ButtonStyle.Success)
        );

      await interaction.channel.send({
        content:
          "✅ **Verification**\nClick below to verify.",
        components: [row]
      });

      return interaction.reply({
        content: "✅ Panel sent.",
        ephemeral: true
      });
    }

    if (command === "ticket-panel") {
      const row =
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("create_ticket")
            .setLabel("Create Ticket")
            .setStyle(ButtonStyle.Primary)
        );

      await interaction.channel.send({
        content:
          "🎫 **Support Tickets**\nClick below to open a ticket.",
        components: [row]
      });

      return interaction.reply({
        content: "✅ Panel sent.",
        ephemeral: true
      });
    }

    if (command === "mod-panel") {
      const row =
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("moderator_apply")
            .setLabel("Apply")
            .setStyle(ButtonStyle.Primary)
        );

      await interaction.channel.send({
        content:
          "🛡️ **Moderator Applications**\nClick below to apply.",
        components: [row]
      });

      return interaction.reply({
        content: "✅ Panel sent.",
        ephemeral: true
      });
    }

    if (command === "rules") {
      return interaction.reply(
        "📜 **SERVER RULES**\n" +
        "1. Respect everyone.\n" +
        "2. No spam.\n" +
        "3. No harassment.\n" +
        "4. No advertising.\n" +
        "5. Follow Discord's Terms of Service.\n" +
        "6. Listen to staff."
      );
    }

    if (command === "announce") {
      await interaction.channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle("📢 Announcement")
            .setDescription(
              interaction.options.getString(
                "message"
              )
            )
        ]
      });

      return interaction.reply({
        content: "✅ Sent.",
        ephemeral: true
      });
    }

    if (command === "say") {
      await interaction.channel.send(
        interaction.options.getString("message")
      );

      return interaction.reply({
        content: "✅ Sent.",
        ephemeral: true
      });
    }

  } catch (error) {
    console.error(error);

    return reply(
      interaction,
      "❌ Something went wrong. Check Railway logs."
    );
  }
});

process.on(
  "unhandledRejection",
  console.error
);

process.on(
  "uncaughtException",
  console.error
);

client.login(TOKEN);