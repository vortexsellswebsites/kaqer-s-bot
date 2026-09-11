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
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder
} = require("discord.js");

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
// SELF ROLES
// ==========================================

const SELF_ROLES = {

  // pronouns
  role_she: "she/her",
  role_he: "he/him",
  role_they: "they/them",
  role_any: "any pronouns",
  role_ask: "ask",

  // interests
  role_gaming: "Gaming",
  role_music: "Music",
  role_art: "Art",
  role_anime: "Anime",
  role_coding: "Coding",
  role_movies: "Movies",
  role_reading: "Reading",
  role_photo: "Photography",

  // vibes
  role_cute: "Cute",
  role_soft: "Soft",
  role_chill: "Chill",
  role_chaotic: "Chaotic",
  role_social: "Social",
  role_quiet: "Quiet",
  role_funny: "Funny",

  // notifications
  role_announcements: "Announcements",
  role_events: "Events",
  role_giveaways: "Giveaways",
  role_updates: "Updates"
};

// ==========================================
// COMMANDS
// ONLY FUN + CHANNEL COMMANDS
// ==========================================

const commands = [

  // ========================================
  // FUN
  // ========================================

  new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("flip a coin"),

  new SlashCommandBuilder()
    .setName("8ball")
    .setDescription("ask the magic 8-ball")
    .addStringOption(option =>
      option
        .setName("question")
        .setDescription("your question")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("rps")
    .setDescription("play rock paper scissors")
    .addStringOption(option =>
      option
        .setName("choice")
        .setDescription("your move")
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
    .setDescription("get a random would-you-rather"),

  new SlashCommandBuilder()
    .setName("trivia")
    .setDescription("get a random trivia question"),

  // ========================================
  // CHANNEL STUFF
  // ========================================

  new SlashCommandBuilder()
    .setName("suggest")
    .setDescription("send a suggestion")
    .addStringOption(option =>
      option
        .setName("suggestion")
        .setDescription("your suggestion")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("confess")
    .setDescription("send an anonymous confession")
    .addStringOption(option =>
      option
        .setName("message")
        .setDescription("your confession")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("create a support ticket"),

  new SlashCommandBuilder()
    .setName("partner")
    .setDescription("apply for a partnership")
    .addStringOption(option =>
      option
        .setName("server")
        .setDescription("server name")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("invite")
        .setDescription("discord invite")
        .setRequired(true)
    )

].map(command => command.toJSON());

// ==========================================
// HELPERS
// ==========================================

function findChannel(guild, names) {
  return guild.channels.cache.find(channel =>
    names.includes(channel.name)
  );
}

// ==========================================
// READY
// ==========================================

client.once("clientReady", async () => {

  console.log("================================");
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log("================================");

  try {

    const guild =
      await client.guilds.fetch(GUILD_ID);

    if (!guild) {
      console.error("❌ Guild not found.");
      return;
    }

    // ======================================
    // CLEAR OLD GLOBAL COMMANDS
    // ======================================

    try {

      await client.application.commands.set([]);

      console.log(
        "🗑️ Old global commands cleared."
      );

    } catch (error) {

      console.error(
        "⚠️ Could not clear global commands:"
      );

      console.error(error);

    }

    // ======================================
    // REPLACE ALL COMMANDS IN THIS SERVER
    // ======================================

    await guild.commands.set(commands);

    console.log(
      `✅ Registered ${commands.length} commands in ${guild.name}`
    );

    console.log(
      "🎮 Commands: coinflip, 8ball, rps, wouldyourather, trivia, suggest, confess, ticket, partner"
    );

    // ======================================
    // BOT STATUS
    // ======================================

    client.user.setActivity(
      "the server ♡",
      {
        type: 0
      }
    );

  } catch (error) {

    console.error(
      "❌ Command registration error:"
    );

    console.error(error);

  }

});

// ==========================================
// WELCOME
// ==========================================

client.on("guildMemberAdd", async member => {

  const channel =
    findChannel(member.guild, [
      "welcome",
      "୨୧・welcome"
    ]);

  if (!channel) return;

  const embed =
    new EmbedBuilder()
      .setTitle("♡ welcome!")
      .setDescription(
        `hii ${member} ♡\n\n` +
        `welcome to **${member.guild.name}**!\n` +
        `make yourself comfy and have fun!`
      )
      .setThumbnail(
        member.user.displayAvatarURL()
      )
      .setTimestamp();

  await channel.send({
    embeds: [embed]
  }).catch(() => {});

});

// ==========================================
// GOODBYE
// ==========================================

client.on("guildMemberRemove", async member => {

  const channel =
    findChannel(member.guild, [
      "goodbye",
      "୨୧・goodbye"
    ]);

  if (!channel) return;

  const embed =
    new EmbedBuilder()
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

const xp = {};
const xpCooldown = new Set();

client.on("messageCreate", async message => {

  if (message.author.bot) return;
  if (!message.guild) return;

  const userId =
    message.author.id;

  if (xpCooldown.has(userId)) return;

  xpCooldown.add(userId);

  xp[userId] =
    (xp[userId] || 0) +
    Math.floor(Math.random() * 8) + 5;

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
    // BUTTONS
    // ======================================

    if (interaction.isButton()) {

      // ====================================
      // SELF ROLES
      // ====================================

      if (
        interaction.customId.startsWith("role_")
      ) {

        const roleName =
          SELF_ROLES[
            interaction.customId
          ];

        if (!roleName) {

          return interaction.reply({
            content:
              "❌ that role button doesn't work anymore.",
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
              `❌ the **${roleName}** role doesn't exist.`,
            ephemeral: true
          });

        }

        const member =
          await interaction.guild.members.fetch(
            interaction.user.id
          );

        // ==================================
        // PRONOUNS
        // ONLY ONE PRONOUN ROLE
        // ==================================

        const pronounIds = [
          "role_she",
          "role_he",
          "role_they",
          "role_any",
          "role_ask"
        ];

        if (
          pronounIds.includes(
            interaction.customId
          )
        ) {

          for (const id of pronounIds) {

            const otherName =
              SELF_ROLES[id];

            const otherRole =
              interaction.guild.roles.cache.find(
                r => r.name === otherName
              );

            if (
              otherRole &&
              otherRole.id !== role.id &&
              member.roles.cache.has(
                otherRole.id
              )
            ) {

              await member.roles
                .remove(otherRole)
                .catch(() => {});

            }

          }

        }

        // ==================================
        // TOGGLE ROLE
        // ==================================

        if (
          member.roles.cache.has(role.id)
        ) {

          await member.roles
            .remove(role);

          return interaction.reply({
            content:
              `♡ removed **${roleName}**`,
            ephemeral: true
          });

        }

        await member.roles.add(role);

        return interaction.reply({
          content:
            `♡ added **${roleName}**`,
          ephemeral: true
        });

      }

      // ====================================
      // CLOSE TICKET
      // ====================================

      if (
        interaction.customId ===
        "close_ticket"
      ) {

        await interaction.reply(
          "🔒 closing this ticket..."
        );

        setTimeout(() => {

          interaction.channel
            .delete()
            .catch(() => {});

        }, 1500);

        return;
      }

    }

    // ======================================
    // SLASH COMMANDS
    // ======================================

    if (!interaction.isChatInputCommand()) {
      return;
    }

    const command =
      interaction.commandName;

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
        interaction.options.getString(
          "question"
        );

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
        "i wouldn't count on it",
        "100% 😭",
        "nahhh 💀"

      ];

      const answer =
        answers[
          Math.floor(
            Math.random() *
            answers.length
          )
        ];

      const embed =
        new EmbedBuilder()
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
        interaction.options.getString(
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
            Math.random() *
            choices.length
          )
        ];

      let result;

      if (player === bot) {

        result =
          "it's a tie! 🤝";

      } else if (

        (player === "rock" &&
          bot === "scissors") ||

        (player === "paper" &&
          bot === "rock") ||

        (player === "scissors" &&
          bot === "paper")

      ) {

        result =
          "you win! 🎉";

      } else {

        result =
          "i win 😼";

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

    if (
      command === "wouldyourather"
    ) {

      const questions = [

        "would you rather fly or be invisible?",

        "would you rather have unlimited money or unlimited free time?",

        "would you rather live in the city or countryside?",

        "would you rather always be early or always be late?",

        "would you rather have a cat or a dog?",

        "would you rather be famous or rich?",

        "would you rather travel everywhere for free or eat everywhere for free?",

        "would you rather never use TikTok again or never use Discord again?",

        "would you rather have your dream car or dream house?",

        "would you rather be able to teleport or time travel?",

        "would you rather have unlimited V-Bucks or unlimited Robux?",

        "would you rather never sleep or never eat?"

      ];

      const question =
        questions[
          Math.floor(
            Math.random() *
            questions.length
          )
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
          q: "what is the largest planet?",
          a: "Jupiter"
        },

        {
          q: "how many continents are there?",
          a: "7"
        },

        {
          q: "what is the capital of Japan?",
          a: "Tokyo"
        },

        {
          q: "how many sides does a hexagon have?",
          a: "6"
        },

        {
          q: "what is the fastest land animal?",
          a: "Cheetah"
        },

        {
          q: "what planet is known as the red planet?",
          a: "Mars"
        },

        {
          q: "how many days are in a leap year?",
          a: "366"
        },

        {
          q: "what is the largest ocean?",
          a: "Pacific Ocean"
        },

        {
          q: "what animal is known as the king of the jungle?",
          a: "Lion"
        }

      ];

      const question =
        trivia[
          Math.floor(
            Math.random() *
            trivia.length
          )
        ];

      const embed =
        new EmbedBuilder()
          .setTitle("🧠 trivia")
          .setDescription(
            `**${question.q}**`
          )
          .setFooter({
            text:
              `answer: ${question.a}`
          });

      return interaction.reply({
        embeds: [embed]
      });

    }

    // ======================================
    // SUGGESTION
    // ======================================

    if (command === "suggest") {

      const suggestion =
        interaction.options.getString(
          "suggestion"
        );

      const channel =
        findChannel(
          interaction.guild,
          [
            "suggestions",
            "୨୧・suggestions"
          ]
        );

      if (!channel) {

        return interaction.reply({
          content:
            "❌ i couldn't find the suggestions channel.",
          ephemeral: true
        });

      }

      const embed =
        new EmbedBuilder()
          .setTitle("💡 new suggestion")
          .setDescription(
            suggestion
          )
          .setFooter({
            text:
              `suggested by ${interaction.user.username}`
          })
          .setTimestamp();

      const sent =
        await channel.send({
          embeds: [embed]
        });

      await sent.react("👍")
        .catch(() => {});

      await sent.react("👎")
        .catch(() => {});

      return interaction.reply({
        content:
          "♡ your suggestion was sent!",
        ephemeral: true
      });

    }

    // ======================================
    // CONFESSION
    // ======================================

    if (command === "confess") {

      const message =
        interaction.options.getString(
          "message"
        );

      const channel =
        findChannel(
          interaction.guild,
          [
            "confessions",
            "୨୧・confessions"
          ]
        );

      if (!channel) {

        return interaction.reply({
          content:
            "❌ i couldn't find the confessions channel.",
          ephemeral: true
        });

      }

      const confessionNumber =
        Date.now()
          .toString()
          .slice(-6);

      const embed =
        new EmbedBuilder()
          .setTitle(
            `♡ anonymous confession #${confessionNumber}`
          )
          .setDescription(
            message
          )
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
        findChannel(
          interaction.guild,
          [
            "004・tickets",
            "004・TICKETS",
            "tickets"
          ]
        );

      const channel =
        await interaction.guild.channels.create({

          name:
            `ticket-${interaction.user.id}`,

          type:
            ChannelType.GuildText,

          parent:
            category?.id || null,

          permissionOverwrites: [

            {
              id:
                interaction.guild.roles.everyone.id,

              deny: [
                PermissionFlagsBits.ViewChannel
              ]
            },

            {
              id:
                interaction.user.id,

              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory
              ]
            },

            {
              id:
                OWNER_ID,

              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.ManageChannels
              ]
            }

          ]

        });

      const closeButton =
        new ButtonBuilder()
          .setCustomId(
            "close_ticket"
          )
          .setLabel(
            "close ticket"
          )
          .setEmoji("🔒")
          .setStyle(
            ButtonStyle.Danger
          );

      const row =
        new ActionRowBuilder()
          .addComponents(
            closeButton
          );

      await channel.send({

        content:
          `${interaction.user} ♡ welcome to your ticket!\n\n` +
          `tell us what you need help with.`,

        components: [
          row
        ]

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
        interaction.options.getString(
          "server"
        );

      const invite =
        interaction.options.getString(
          "invite"
        );

      const channel =
        findChannel(
          interaction.guild,
          [
            "partnerships",
            "୨୧・partnerships"
          ]
        );

      if (!channel) {

        return interaction.reply({
          content:
            "❌ i couldn't find the partnerships channel.",
          ephemeral: true
        });

      }

      const embed =
        new EmbedBuilder()
          .setTitle(
            "🤝 partnership application"
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
              name: "applicant",
              value:
                `${interaction.user}`
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

  } catch (error) {

    console.error(
      "❌ Interaction error:"
    );

    console.error(error);

    try {

      if (
        interaction.replied ||
        interaction.deferred
      ) {

        await interaction.followUp({
          content:
            "❌ something went wrong.",
          ephemeral: true
        });

      } else {

        await interaction.reply({
          content:
            "❌ something went wrong.",
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

  console.error(
    "❌ Discord client error:",
    error
  );

});

process.on(
  "unhandledRejection",
  error => {

    console.error(
      "❌ Unhandled rejection:",
      error
    );

  }
);

process.on(
  "uncaughtException",
  error => {

    console.error(
      "❌ Uncaught exception:",
      error
    );

  }
);

// ==========================================
// LOGIN
// ==========================================

client.login(TOKEN);