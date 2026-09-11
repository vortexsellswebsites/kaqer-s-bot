// ==========================================
// Kaqer Community Bot
// Discord.js v14
// ==========================================

const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits
} = require("discord.js");

const fs = require("fs");

// ==========================================
// CONFIG
// ==========================================

const TOKEN = process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const OWNER_ID = process.env.OWNER_ID;

if (!TOKEN) {
  console.error("❌ TOKEN is missing.");
  process.exit(1);
}

if (!GUILD_ID) {
  console.error("❌ GUILD_ID is missing.");
  process.exit(1);
}

if (!OWNER_ID) {
  console.error("❌ OWNER_ID is missing.");
  process.exit(1);
}

// ==========================================
// CLIENT
// ==========================================

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

// ==========================================
// DATA
// ==========================================

const DATA_FILE = "./data.json";

let data = {
  xp: {},
  bios: {},
  friends: {},
  confessions: 0
};

if (fs.existsSync(DATA_FILE)) {
  try {
    const saved = JSON.parse(
      fs.readFileSync(DATA_FILE, "utf8")
    );

    data = {
      ...data,
      ...saved
    };
  } catch (error) {
    console.log("⚠️ data.json could not be loaded.");
  }
}

function saveData() {
  try {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(data, null, 2)
    );
  } catch (error) {
    console.error("❌ Could not save data:", error);
  }
}

// ==========================================
// HELPERS
// ==========================================

function findChannel(guild, names) {
  return guild.channels.cache.find(channel =>
    names.includes(channel.name)
  );
}

function getXP(userId) {
  return data.xp[userId] || 0;
}

function getLevel(xp) {
  return Math.floor(xp / 100);
}

function addXP(userId, amount) {
  data.xp[userId] = getXP(userId) + amount;
  saveData();
}

// ==========================================
// SELF ROLES
// NO AGE ROLES
// ==========================================

const SELF_ROLES = {
  // Pronouns
  "role_she": "she/her",
  "role_he": "he/him",
  "role_they": "they/them",
  "role_any": "any pronouns",
  "role_ask": "ask",

  // Interests
  "role_gaming": "Gaming",
  "role_music": "Music",
  "role_art": "Art",
  "role_anime": "Anime",
  "role_coding": "Coding",
  "role_movies": "Movies",
  "role_reading": "Reading",
  "role_photo": "Photography",

  // Vibes
  "role_cute": "Cute",
  "role_soft": "Soft",
  "role_chill": "Chill",
  "role_chaotic": "Chaotic",
  "role_social": "Social",
  "role_quiet": "Quiet",
  "role_funny": "Funny",

  // Notifications
  "role_announcements": "Announcements",
  "role_events": "Events",
  "role_giveaways": "Giveaways",
  "role_updates": "Updates"
};

// ==========================================
// COMMANDS
// ==========================================

const commands = [

  new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Flip a coin"),

  new SlashCommandBuilder()
    .setName("8ball")
    .setDescription("Ask the magic 8-ball")
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
        .setDescription("Choose your move")
        .setRequired(true)
        .addChoices(
          { name: "Rock", value: "rock" },
          { name: "Paper", value: "paper" },
          { name: "Scissors", value: "scissors" }
        )
    ),

  new SlashCommandBuilder()
    .setName("wouldyourather")
    .setDescription("Get a random would-you-rather"),

  new SlashCommandBuilder()
    .setName("trivia")
    .setDescription("Get a random trivia question"),

  new SlashCommandBuilder()
    .setName("profile")
    .setDescription("View a profile")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("User to view")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("bio")
    .setDescription("Edit your profile bio"),

  new SlashCommandBuilder()
    .setName("friends")
    .setDescription("View your friends"),

  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("View the XP leaderboard"),

  new SlashCommandBuilder()
    .setName("suggest")
    .setDescription("Send a suggestion")
    .addStringOption(option =>
      option
        .setName("suggestion")
        .setDescription("Your suggestion")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("confess")
    .setDescription("Send an anonymous confession")
    .addStringOption(option =>
      option
        .setName("message")
        .setDescription("Your confession")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Create a support ticket"),

  new SlashCommandBuilder()
    .setName("partner")
    .setDescription("Apply for a partnership")
    .addStringOption(option =>
      option
        .setName("server")
        .setDescription("Server name")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("invite")
        .setDescription("Discord invite")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("restart")
    .setDescription("Restart the bot")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

].map(command => command.toJSON());

// ==========================================
// READY + COMMAND REGISTRATION
// ==========================================

client.once("ready", async () => {

  console.log("================================");
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log("================================");

  try {

    const guild = await client.guilds.fetch(GUILD_ID);

    if (!guild) {
      console.error("❌ Guild not found.");
      return;
    }

    // Register commands directly to THIS server.
    // This makes them appear immediately instead
    // of waiting for global Discord command sync.

    await guild.commands.set(commands);

    console.log(
      `✅ Registered ${commands.length} commands in ${guild.name}`
    );

    client.user.setActivity("the server ♡", {
      type: 0
    });

  } catch (error) {
    console.error("❌ Command registration error:");
    console.error(error);
  }

});

// ==========================================
// WELCOME
// ==========================================

client.on("guildMemberAdd", async member => {

  const channel = findChannel(member.guild, [
    "welcome",
    "୨୧・welcome"
  ]);

  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle("♡ welcome!")
    .setDescription(
      `hii ${member} ♡\n\n` +
      `welcome to **${member.guild.name}**!\n` +
      `make yourself comfy and have fun!`
    )
    .setThumbnail(member.user.displayAvatarURL())
    .setTimestamp();

  await channel.send({
    embeds: [embed]
  }).catch(() => {});

});

// ==========================================
// GOODBYE
// ==========================================

client.on("guildMemberRemove", async member => {

  const channel = findChannel(member.guild, [
    "goodbye",
    "୨୧・goodbye"
  ]);

  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle("♡ goodbye!")
    .setDescription(
      `**${member.user.username}** left the server ♡\n` +
      `we'll miss you!`
    )
    .setTimestamp();

  await channel.send({
    embeds: [embed]
  }).catch(() => {});

});

// ==========================================
// XP
// ==========================================

const xpCooldown = new Set();

client.on("messageCreate", async message => {

  if (message.author.bot) return;
  if (!message.guild) return;

  const userId = message.author.id;

  if (xpCooldown.has(userId)) return;

  xpCooldown.add(userId);

  const amount =
    Math.floor(Math.random() * 8) + 5;

  addXP(userId, amount);

  setTimeout(() => {
    xpCooldown.delete(userId);
  }, 60000);

});

// ==========================================
// INTERACTIONS
// ==========================================

client.on("interactionCreate", async interaction => {

  try {

    // ======================================
    // SELF ROLE BUTTONS
    // ======================================

    if (interaction.isButton()) {

      if (interaction.customId.startsWith("role_")) {

        const roleName =
          SELF_ROLES[interaction.customId];

        if (!roleName) {
          return interaction.reply({
            content: "❌ That role no longer exists.",
            ephemeral: true
          });
        }

        const role =
          interaction.guild.roles.cache.find(
            r => r.name === roleName
          );

        if (!role) {
          return interaction.reply({
            content:
              `❌ The **${roleName}** role doesn't exist yet.`,
            ephemeral: true
          });
        }

        const member =
          await interaction.guild.members.fetch(
            interaction.user.id
          );

        // Pronouns are exclusive.
        if (
          [
            "role_she",
            "role_he",
            "role_they",
            "role_any",
            "role_ask"
          ].includes(interaction.customId)
        ) {

          const pronounIds = [
            "role_she",
            "role_he",
            "role_they",
            "role_any",
            "role_ask"
          ];

          for (const id of pronounIds) {

            const otherName = SELF_ROLES[id];

            const otherRole =
              interaction.guild.roles.cache.find(
                r => r.name === otherName
              );

            if (
              otherRole &&
              otherRole.id !== role.id &&
              member.roles.cache.has(otherRole.id)
            ) {
              await member.roles.remove(otherRole);
            }
          }
        }

        // Toggle selected role.
        if (member.roles.cache.has(role.id)) {

          await member.roles.remove(role);

          return interaction.reply({
            content: `♡ removed **${roleName}**`,
            ephemeral: true
          });

        } else {

          await member.roles.add(role);

          return interaction.reply({
            content: `♡ added **${roleName}**`,
            ephemeral: true
          });

        }
      }

      // ====================================
      // CLOSE TICKET
      // ====================================

      if (interaction.customId === "close_ticket") {

        await interaction.reply(
          "♡ closing this ticket..."
        );

        setTimeout(() => {
          interaction.channel.delete().catch(() => {});
        }, 1500);

        return;
      }
    }

    // ======================================
    // MODAL
    // ======================================

    if (interaction.isModalSubmit()) {

      if (interaction.customId === "bio_modal") {

        const bio =
          interaction.fields.getTextInputValue(
            "bio_input"
          );

        data.bios[interaction.user.id] =
          bio || "no bio yet ♡";

        saveData();

        return interaction.reply({
          content: "♡ your bio was updated!",
          ephemeral: true
        });
      }
    }

    // ======================================
    // SLASH COMMANDS
    // ======================================

    if (!interaction.isChatInputCommand()) return;

    const command = interaction.commandName;

    // ======================================
    // COINFLIP
    // ======================================

    if (command === "coinflip") {

      const result =
        Math.random() < 0.5
          ? "heads 🪙"
          : "tails 🪙";

      return interaction.reply(
        `♡ the coin landed on **${result}**!`
      );
    }

    // ======================================
    // 8BALL
    // ======================================

    if (command === "8ball") {

      const question =
        interaction.options.getString("question");

      const answers = [
        "yes ♡",
        "no 💔",
        "maybe...",
        "definitely!",
        "probably not",
        "ask again later",
        "i think so ♡",
        "not looking good 😭",
        "absolutely!",
        "i wouldn't count on it"
      ];

      const answer =
        answers[
          Math.floor(Math.random() * answers.length)
        ];

      const embed = new EmbedBuilder()
        .setTitle("🎱 magic 8-ball")
        .addFields(
          {
            name: "question",
            value: question
          },
          {
            name: "answer",
            value: answer
          }
        );

      return interaction.reply({
        embeds: [embed]
      });
    }

    // ======================================
    // RPS
    // ======================================

    if (command === "rps") {

      const player =
        interaction.options.getString("choice");

      const choices = [
        "rock",
        "paper",
        "scissors"
      ];

      const bot =
        choices[
          Math.floor(Math.random() * choices.length)
        ];

      let result;

      if (player === bot) {
        result = "it's a tie! 🤝";
      } else if (
        (player === "rock" && bot === "scissors") ||
        (player === "paper" && bot === "rock") ||
        (player === "scissors" && bot === "paper")
      ) {
        result = "you win! 🎉";
      } else {
        result = "i win 😼";
      }

      return interaction.reply(
        `♡ you chose **${player}**\n` +
        `♡ i chose **${bot}**\n\n` +
        `**${result}**`
      );
    }

    // ======================================
    // WOULD YOU RATHER
    // ======================================

    if (command === "wouldyourather") {

      const questions = [
        "Would you rather fly or be invisible?",
        "Would you rather have unlimited money or unlimited free time?",
        "Would you rather live in the city or countryside?",
        "Would you rather always be early or always be late?",
        "Would you rather have a cat or a dog?",
        "Would you rather be famous or rich?",
        "Would you rather travel everywhere for free or eat everywhere for free?",
        "Would you rather never use TikTok again or never use Discord again?"
      ];

      const question =
        questions[
          Math.floor(Math.random() * questions.length)
        ];

      return interaction.reply(
        `♡ **would you rather...**\n\n${question}`
      );
    }

    // ======================================
    // TRIVIA
    // ======================================

    if (command === "trivia") {

      const trivia = [
        {
          q: "What is the largest planet?",
          a: "Jupiter"
        },
        {
          q: "How many continents are there?",
          a: "7"
        },
        {
          q: "What is the capital of Japan?",
          a: "Tokyo"
        },
        {
          q: "How many sides does a hexagon have?",
          a: "6"
        },
        {
          q: "What is the fastest land animal?",
          a: "Cheetah"
        }
      ];

      const question =
        trivia[
          Math.floor(Math.random() * trivia.length)
        ];

      const embed = new EmbedBuilder()
        .setTitle("🧠 trivia")
        .setDescription(question.q)
        .setFooter({
          text: `answer: ${question.a}`
        });

      return interaction.reply({
        embeds: [embed]
      });
    }

    // ======================================
    // PROFILE
    // ======================================

    if (command === "profile") {

      const user =
        interaction.options.getUser("user") ||
        interaction.user;

      const xp = getXP(user.id);
      const level = getLevel(xp);

      const bio =
        data.bios[user.id] ||
        "no bio yet ♡";

      const embed = new EmbedBuilder()
        .setTitle(`♡ ${user.username}'s profile`)
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          {
            name: "level",
            value: `${level}`,
            inline: true
          },
          {
            name: "XP",
            value: `${xp}`,
            inline: true
          },
          {
            name: "bio",
            value: bio
          }
        );

      return interaction.reply({
        embeds: [embed]
      });
    }

    // ======================================
    // BIO
    // ======================================

    if (command === "bio") {

      const modal = new ModalBuilder()
        .setCustomId("bio_modal")
        .setTitle("♡ edit your bio");

      const input = new TextInputBuilder()
        .setCustomId("bio_input")
        .setLabel("your bio")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder(
          "tell everyone about yourself ♡"
        )
        .setMaxLength(200)
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder().addComponents(input)
      );

      return interaction.showModal(modal);
    }

    // ======================================
    // FRIENDS
    // ======================================

    if (command === "friends") {

      const friends =
        data.friends[interaction.user.id] || [];

      if (!friends.length) {
        return interaction.reply(
          "♡ you don't have any friends added yet!"
        );
      }

      const names = [];

      for (const id of friends) {

        const user =
          await client.users.fetch(id).catch(() => null);

        if (user) {
          names.push(`♡ ${user.username}`);
        }
      }

      return interaction.reply(
        `**your friends ♡**\n\n${names.join("\n")}`
      );
    }

    // ======================================
    // LEADERBOARD
    // ======================================

    if (command === "leaderboard") {

      const sorted =
        Object.entries(data.xp)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10);

      if (!sorted.length) {
        return interaction.reply(
          "♡ nobody has earned XP yet!"
        );
      }

      const lines = [];

      for (let i = 0; i < sorted.length; i++) {

        const [id, xp] = sorted[i];

        const user =
          await client.users.fetch(id).catch(() => null);

        if (!user) continue;

        lines.push(
          `**${i + 1}.** ${user.username} — ${xp} XP`
        );
      }

      return interaction.reply(
        `🏆 **XP leaderboard**\n\n${lines.join("\n")}`
      );
    }

    // ======================================
    // SUGGEST
    // ======================================

    if (command === "suggest") {

      const suggestion =
        interaction.options.getString("suggestion");

      const channel =
        findChannel(interaction.guild, [
          "suggestions",
          "୨୧・suggestions"
        ]);

      if (!channel) {
        return interaction.reply({
          content:
            "❌ I couldn't find the suggestions channel.",
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setTitle("💡 new suggestion")
        .setDescription(suggestion)
        .setFooter({
          text:
            `suggested by ${interaction.user.username}`
        })
        .setTimestamp();

      const message =
        await channel.send({
          embeds: [embed]
        });

      await message.react("👍").catch(() => {});
      await message.react("👎").catch(() => {});

      return interaction.reply({
        content: "♡ your suggestion was sent!",
        ephemeral: true
      });
    }

    // ======================================
    // CONFESSION
    // ======================================

    if (command === "confess") {

      const message =
        interaction.options.getString("message");

      const channel =
        findChannel(interaction.guild, [
          "confessions",
          "୨୧・confessions"
        ]);

      if (!channel) {
        return interaction.reply({
          content:
            "❌ I couldn't find the confessions channel.",
          ephemeral: true
        });
      }

      data.confessions++;

      saveData();

      const embed = new EmbedBuilder()
        .setTitle(
          `♡ anonymous confession #${data.confessions}`
        )
        .setDescription(message)
        .setTimestamp();

      await channel.send({
        embeds: [embed]
      });

      return interaction.reply({
        content:
          "♡ your confession was posted anonymously!",
        ephemeral: true
      });
    }

    // ======================================
    // TICKET
    // ======================================

    if (command === "ticket") {

      const existing =
        interaction.guild.channels.cache.find(
          channel =>
            channel.name ===
            `ticket-${interaction.user.id}`
        );

      if (existing) {
        return interaction.reply({
          content:
            `♡ you already have a ticket: ${existing}`,
          ephemeral: true
        });
      }

      const category =
        findChannel(interaction.guild, [
          "004・tickets",
          "004・TICKETS",
          "tickets"
        ]);

      const channel =
        await interaction.guild.channels.create({
          name: `ticket-${interaction.user.id}`,
          type: ChannelType.GuildText,
          parent: category?.id || null,
          permissionOverwrites: [
            {
              id: interaction.guild.roles.everyone.id,
              deny: [
                PermissionFlagsBits.ViewChannel
              ]
            },
            {
              id: interaction.user.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory
              ]
            }
          ]
        });

      const closeButton =
        new ButtonBuilder()
          .setCustomId("close_ticket")
          .setLabel("Close Ticket")
          .setEmoji("🔒")
          .setStyle(ButtonStyle.Danger);

      const row =
        new ActionRowBuilder()
          .addComponents(closeButton);

      await channel.send({
        content:
          `${interaction.user} ♡ welcome to your ticket!\n\n` +
          `Tell us what you need help with.`,
        components: [row]
      });

      return interaction.reply({
        content:
          `♡ your ticket has been created: ${channel}`,
        ephemeral: true
      });
    }

    // ======================================
    // PARTNERSHIP
    // ======================================

    if (command === "partner") {

      const server =
        interaction.options.getString("server");

      const invite =
        interaction.options.getString("invite");

      const channel =
        findChannel(interaction.guild, [
          "partnerships",
          "୨୧・partnerships"
        ]);

      if (!channel) {
        return interaction.reply({
          content:
            "❌ I couldn't find the partnerships channel.",
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setTitle("🤝 partnership application")
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
            name: "applicant",
            value: `${interaction.user}`
          }
        )
        .setTimestamp();

      await channel.send({
        embeds: [embed]
      });

      return interaction.reply({
        content:
          "♡ your partnership application was sent!",
        ephemeral: true
      });
    }

    // ======================================
    // RESTART
    // ======================================

    if (command === "restart") {

      if (interaction.user.id !== OWNER_ID) {
        return interaction.reply({
          content:
            "❌ Only the bot owner can use this command.",
          ephemeral: true
        });
      }

      await interaction.reply(
        "🔄 restarting the bot..."
      );

      console.log(
        `🔄 Restart requested by ${interaction.user.tag}`
      );

      setTimeout(() => {
        client.destroy();

        // Railway will restart the process.
        process.exit(0);
      }, 1500);

      return;
    }

  } catch (error) {

    console.error("❌ Interaction error:");
    console.error(error);

    try {

      if (interaction.replied || interaction.deferred) {

        await interaction.followUp({
          content:
            "❌ Something went wrong while running that.",
          ephemeral: true
        });

      } else {

        await interaction.reply({
          content:
            "❌ Something went wrong while running that.",
          ephemeral: true
        });

      }

    } catch {}

  }

});

// ==========================================
// ERROR HANDLERS
// ==========================================

client.on("error", error => {
  console.error("❌ Discord client error:", error);
});

process.on("unhandledRejection", error => {
  console.error("❌ Unhandled rejection:", error);
});

process.on("uncaughtException", error => {
  console.error("❌ Uncaught exception:", error);
});

// ==========================================
// LOGIN
// ==========================================

client.login(TOKEN);