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
} = require('discord.js');

const fs = require('fs');

const TOKEN = process.env.TOKEN;

if (!TOKEN) {
  console.error('❌ TOKEN is missing from Railway variables.');
  process.exit(1);
}

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

const DATA_FILE = './data.json';

let data = {
  xp: {},
  warnings: {},
  bios: {},
  friends: {},
  tickets: {}
};

if (fs.existsSync(DATA_FILE)) {
  try {
    data = {
      ...data,
      ...JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
    };
  } catch {
    console.log('⚠️ Could not read data.json, using fresh data.');
  }
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

/* =========================
   ROLES
========================= */

const ROLES = [
  // STAFF
  { name: '👑・owner', color: 0xff69b4 },
  { name: '⚡・admin', color: 0xff8fab },
  { name: '🛡️・mod', color: 0xc77dff },
  { name: '🔨・staff', color: 0x9d4edd },

  // SERVER
  { name: '🌸・booster', color: 0xffb6d9 },
  { name: '💎・vip', color: 0x74c0fc },
  { name: '🎀・friend', color: 0xffc8dd },
  { name: '💜・partner', color: 0xb197fc },
  { name: '💫・supporter', color: 0xffd166 },
  { name: '🫶・trusted', color: 0xffa8dad },
  { name: '⭐・active', color: 0xffd43b },
  { name: '🕰️・og', color: 0xadb5bd },

  // SELF ROLES
  { name: '୨୧・she/her', color: 0xffb6d9 },
  { name: '୨୧・he/him', color: 0x9ec5fe },
  { name: '୨୧・they/them', color: 0xcdb4db },

  { name: '୨୧・minor', color: 0xffc8dd },
  { name: '୨୧・adult', color: 0xcdb4db },

  { name: '୨୧・artist', color: 0xffadad },
  { name: '୨୧・music', color: 0xbde0fe },
  { name: '୨୧・anime', color: 0xffc8dd },

  { name: '୨୧・social', color: 0xa2d2ff },
  { name: '୨୧・introvert', color: 0xbdb2ff },
  { name: '୨୧・extrovert', color: 0xffd6a5 }
];

/* =========================
   CHANNEL STRUCTURE
========================= */

const STRUCTURE = {
  '001・INFO': [
    ['୨୧・rules', 'rules'],
    ['୨୧・announcements', 'announcements'],
    ['୨୧・server-info', 'info'],
    ['୨୧・introductions', 'introductions'],
    ['୨୧・roles', 'roles'],
    ['୨୧・boosts', 'boosts'],
    ['୨୧・partnerships', 'partnerships']
  ],

  '002・COMMUNITY': [
    ['୨୧・chat', 'chat'],
    ['୨୧・media', 'media'],
    ['୨୧・memes', 'memes'],
    ['୨୧・games', 'games'],
    ['୨୧・suggestions', 'suggestions']
  ],

  '003・EXTRAS': [
    ['୨୧・levels', 'levels'],
    ['୨୧・starboard', 'starboard'],
    ['୨୧・confessions', 'confessions'],
    ['୨୧・support', 'support']
  ],

  '004・TICKETS': []
};

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
    getRole(guild, '👑・owner'),
    getRole(guild, '⚡・admin'),
    getRole(guild, '🛡️・mod'),
    getRole(guild, '🔨・staff')
  ].filter(Boolean);
}

function isStaff(member) {
  if (!member) return false;

  return (
    member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    getStaffRoles(member.guild).some(role =>
      member.roles.cache.has(role.id)
    )
  );
}

function isOwner(member) {
  return (
    member.id === member.guild.ownerId ||
    member.roles.cache.has(
      getRole(member.guild, '👑・owner')?.id
    )
  );
}

function roleButton(roleName, emoji) {
  const key = Buffer.from(roleName).toString('base64');

  return new ButtonBuilder()
    .setCustomId(`selfrole_${key}`)
    .setLabel(roleName.replace('୨୧・', ''))
    .setEmoji(emoji)
    .setStyle(ButtonStyle.Secondary);
}

/* =========================
   RESET SERVER
========================= */

async function resetServer(guild) {
  console.log(`🔄 Resetting ${guild.name}...`);

  /* DELETE CHANNELS */

  for (const channel of [...guild.channels.cache.values()]) {
    try {
      await channel.delete('Server reset');
    } catch {}
  }

  /* DELETE REMOVABLE ROLES */

  for (const role of [...guild.roles.cache.values()]) {
    if (
      role.id === guild.id ||
      role.managed ||
      role.position >= guild.members.me.roles.highest.position
    ) {
      continue;
    }

    try {
      await role.delete('Server reset');
    } catch {}
  }

  /* CREATE ROLES */

  const createdRoles = {};

  for (const roleInfo of ROLES) {
    try {
      const role = await guild.roles.create({
        name: roleInfo.name,
        color: roleInfo.color,
        reason: 'Server reset'
      });

      createdRoles[roleInfo.name] = role;
    } catch (err) {
      console.log(`Could not create ${roleInfo.name}`);
    }
  }

  /* CREATE CATEGORIES + CHANNELS */

  const channels = {};

  for (const [categoryName, channelList] of Object.entries(STRUCTURE)) {
    const category = await guild.channels.create({
      name: categoryName,
      type: ChannelType.GuildCategory
    });

    channels[categoryName] = category;

    for (const [channelName, type] of channelList) {
      const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: category.id
      });

      channels[type] = channel;
    }
  }

  /* =========================
     LOCK INFO CHANNELS
  ========================= */

  const readOnly = [
    'rules',
    'announcements',
    'info',
    'roles',
    'boosts',
    'partnerships',
    'levels',
    'starboard',
    'confessions',
    'support'
  ];

  for (const type of readOnly) {
    const channel = channels[type];
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

  /* =========================
     RULES
  ========================= */

  await channels.rules.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0xffb6d9)
        .setTitle('୨୧・ server rules')
        .setDescription(
          '**01** be respectful ♡\n' +
          '**02** no harassment or bullying\n' +
          '**03** no spam or flooding\n' +
          '**04** no NSFW content\n' +
          '**05** no slurs or hateful behavior\n' +
          '**06** no advertising without permission\n' +
          '**07** listen to staff\n' +
          '**08** use channels correctly\n\n' +
          'breaking the rules may result in a warning, timeout, kick, or ban.'
        )
        .setFooter({
          text: '୨୧ enjoy your stay!'
        })
    ]
  });

  /* =========================
     SERVER INFO
  ========================= */

  await channels.info.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0xffb6d9)
        .setTitle('୨୧・ server info')
        .setDescription(
          `welcome to **${guild.name}** ♡\n\n` +
          'read the rules before chatting.\n' +
          'grab your self roles in the roles channel.\n' +
          'introduce yourself and meet everyone!\n\n' +
          '**community**\n' +
          'chat • media • memes • games\n\n' +
          '**extras**\n' +
          'levels • starboard • confessions • support'
        )
    ]
  });

  /* =========================
     ROLE PANEL
  ========================= */

  const rows = [
    new ActionRowBuilder().addComponents(
      roleButton('୨୧・she/her', '♡'),
      roleButton('୨୧・he/him', '♡'),
      roleButton('୨୧・they/them', '♡')
    ),

    new ActionRowBuilder().addComponents(
      roleButton('୨୧・minor', '🌷'),
      roleButton('୨୧・adult', '🌸')
    ),

    new ActionRowBuilder().addComponents(
      roleButton('୨୧・artist', '🎨'),
      roleButton('୨୧・music', '🎵'),
      roleButton('୨୧・anime', '🎀')
    ),

    new ActionRowBuilder().addComponents(
      roleButton('୨୧・social', '💬'),
      roleButton('୨୧・introvert', '🌙'),
      roleButton('୨୧・extrovert', '☀️')
    )
  ];

  await channels.roles.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0xffb6d9)
        .setTitle('୨୧・ choose your roles')
        .setDescription(
          'pick whatever fits you ♡\n' +
          'click a role to add it or remove it.\n\n' +
          '**♡ PRONOUNS**\n' +
          'choose your pronouns.\n\n' +
          '**🌷 AGE**\n' +
          'choose your age group.\n\n' +
          '**🎀 INTERESTS**\n' +
          'show everyone what you enjoy.\n\n' +
          '**🌸 VIBES**\n' +
          'choose your social style.'
        )
        .setFooter({
          text: '୨୧ you can change these anytime'
        })
    ],
    components: rows
  });

  /* =========================
     INTRODUCTIONS
  ========================= */

  await channels.introductions.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0xffb6d9)
        .setTitle('୨୧・ introduce yourself')
        .setDescription(
          'new here? tell everyone a little about yourself ♡\n\n' +
          '・ name / nickname\n' +
          '・ age\n' +
          '・ pronouns\n' +
          '・ hobbies\n' +
          '・ favorite games / music / shows\n' +
          '・ anything else!'
        )
    ]
  });

  /* =========================
     ANNOUNCEMENTS
  ========================= */

  await channels.announcements.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0xffb6d9)
        .setTitle('୨୧・ announcements')
        .setDescription('server announcements will appear here ♡')
    ]
  });

  /* =========================
     BOOSTS
  ========================= */

  await channels.boosts.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0xffb6d9)
        .setTitle('୨୧・ server boosts')
        .setDescription(
          'thank you to everyone who boosts the server! ♡\n\n' +
          'boosters may receive special perks and recognition.'
        )
    ]
  });

  /* =========================
     PARTNERSHIPS
  ========================= */

  const partnershipButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('open_partnership')
      .setLabel('apply for partnership')
      .setEmoji('💜')
      .setStyle(ButtonStyle.Secondary)
  );

  await channels.partnerships.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0xffb6d9)
        .setTitle('୨୧・ partnerships')
        .setDescription(
          'want to partner with us? ♡\n\n' +
          'click the button below to open a private partnership application.'
        )
    ],
    components: [partnershipButton]
  });

  /* =========================
     SUGGESTIONS
  ========================= */

  const suggestionButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('open_suggestion')
      .setLabel('make a suggestion')
      .setEmoji('💡')
      .setStyle(ButtonStyle.Secondary)
  );

  await channels.suggestions.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0xffb6d9)
        .setTitle('୨୧・ suggestions')
        .setDescription(
          'have an idea for the server? ♡\n\n' +
          'click below to submit one.'
        )
    ],
    components: [suggestionButton]
  });

  /* =========================
     CONFESSIONS
  ========================= */

  const confessionButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('open_confession')
      .setLabel('send a confession')
      .setEmoji('💌')
      .setStyle(ButtonStyle.Secondary)
  );

  await channels.confessions.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0xffb6d9)
        .setTitle('୨୧・ confessions')
        .setDescription(
          'say something anonymously ♡\n\n' +
          'click the button below to send a confession.'
        )
    ],
    components: [confessionButton]
  });

  /* =========================
     SUPPORT
  ========================= */

  const supportButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('open_support')
      .setLabel('open support ticket')
      .setEmoji('🎫')
      .setStyle(ButtonStyle.Secondary)
  );

  await channels.support.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0xffb6d9)
        .setTitle('୨୧・ support')
        .setDescription(
          'need help with something? ♡\n\n' +
          'open a private ticket and staff will help you.'
        )
    ],
    components: [supportButton]
  });

  /* =========================
     SAVE CHANNEL IDS
  ========================= */

  data.channels = {
    levels: channels.levels?.id,
    starboard: channels.starboard?.id,
    ticketCategory: channels['004・TICKETS']?.id
  };

  saveData();

  return channels;
}

/* =========================
   COMMANDS
========================= */

const commands = [
  new SlashCommandBuilder()
    .setName('resetserver')
    .setDescription('Completely rebuild the server')
    .setDefaultMemberPermissions(
      PermissionsBitField.Flags.Administrator
    ),

  new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Flip a coin'),

  new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Roll a dice'),

  new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Ask the magic 8ball')
    .addStringOption(o =>
      o.setName('question')
        .setDescription('Your question')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('rps')
    .setDescription('Play rock paper scissors')
    .addStringOption(o =>
      o.setName('choice')
        .setDescription('Your choice')
        .setRequired(true)
        .addChoices(
          { name: 'rock', value: 'rock' },
          { name: 'paper', value: 'paper' },
          { name: 'scissors', value: 'scissors' }
        )
    ),

  new SlashCommandBuilder()
    .setName('wouldyourather')
    .setDescription('Get a would you rather question'),

  new SlashCommandBuilder()
    .setName('trivia')
    .setDescription('Get a random trivia question'),

  new SlashCommandBuilder()
    .setName('rank')
    .setDescription('See your level'),

  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('See the XP leaderboard'),

  new SlashCommandBuilder()
    .setName('profile')
    .setDescription('See your profile'),

  new SlashCommandBuilder()
    .setName('setbio')
    .setDescription('Set your profile bio')
    .addStringOption(o =>
      o.setName('bio')
        .setDescription('Your bio')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('friend')
    .setDescription('Add someone as a friend')
    .addUserOption(o =>
      o.setName('user')
        .setDescription('User')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('friends')
    .setDescription('See your friends'),

  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member')
    .addUserOption(o =>
      o.setName('user')
        .setDescription('Member')
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName('reason')
        .setDescription('Reason')
    ),

  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member')
    .addUserOption(o =>
      o.setName('user')
        .setDescription('Member')
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName('reason')
        .setDescription('Reason')
    ),

  new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout a member')
    .addUserOption(o =>
      o.setName('user')
        .setDescription('Member')
        .setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName('minutes')
        .setDescription('Timeout length')
        .setMinValue(1)
        .setMaxValue(40320)
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName('reason')
        .setDescription('Reason')
    ),

  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member')
    .addUserOption(o =>
      o.setName('user')
        .setDescription('Member')
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName('reason')
        .setDescription('Reason')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('See member warnings')
    .addUserOption(o =>
      o.setName('user')
        .setDescription('Member')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Delete messages')
    .addIntegerOption(o =>
      o.setName('amount')
        .setDescription('1-100 messages')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('confess')
    .setDescription('Send an anonymous confession'),

  new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Make a suggestion')
];

/* =========================
   READY
========================= */

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  try {
    await client.application.commands.set(
      commands.map(c => c.toJSON())
    );

    console.log('✅ Slash commands registered.');
  } catch (err) {
    console.error('Command registration error:', err);
  }
});

/* =========================
   INTERACTIONS
========================= */

client.on('interactionCreate', async interaction => {
  try {

    /* =====================
       SELF ROLES
    ===================== */

    if (
      interaction.isButton() &&
      interaction.customId.startsWith('selfrole_')
    ) {
      const encoded = interaction.customId.replace(
        'selfrole_',
        ''
      );

      const roleName = Buffer.from(
        encoded,
        'base64'
      ).toString('utf8');

      const role = getRole(interaction.guild, roleName);

      if (!role) {
        return interaction.reply({
          content: '❌ That role does not exist.',
          ephemeral: true
        });
      }

      if (interaction.member.roles.cache.has(role.id)) {
        await interaction.member.roles.remove(role);

        return interaction.reply({
          content: `♡ Removed **${role.name}**`,
          ephemeral: true
        });
      }

      await interaction.member.roles.add(role);

      return interaction.reply({
        content: `♡ Added **${role.name}**`,
        ephemeral: true
      });
    }

    /* =====================
       SUPPORT TICKET
    ===================== */

    if (
      interaction.isButton() &&
      interaction.customId === 'open_support'
    ) {
      const category = interaction.guild.channels.cache.get(
        data.channels?.ticketCategory
      );

      if (!category) {
        return interaction.reply({
          content: '❌ Ticket category is missing.',
          ephemeral: true
        });
      }

      const existing = interaction.guild.channels.cache.find(
        c => c.name === `ticket-${interaction.user.id}`
      );

      if (existing) {
        return interaction.reply({
          content: `You already have a ticket: ${existing}`,
          ephemeral: true
        });
      }

      const overwrites = [
        {
          id: interaction.guild.roles.everyone.id,
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

      for (const role of getStaffRoles(interaction.guild)) {
        overwrites.push({
          id: role.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        });
      }

      const ticket = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.id}`,
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: overwrites
      });

      const close = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel('close ticket')
          .setEmoji('🔒')
          .setStyle(ButtonStyle.Danger)
      );

      await ticket.send({
        content: `${interaction.user}`,
        embeds: [
          new EmbedBuilder()
            .setColor(0xffb6d9)
            .setTitle('୨୧・ support ticket')
            .setDescription(
              'tell staff what you need help with ♡\n\n' +
              'please be patient while someone responds.'
            )
        ],
        components: [close]
      });

      return interaction.reply({
        content: `🎫 Your ticket has been created: ${ticket}`,
        ephemeral: true
      });
    }

    /* =====================
       CLOSE TICKET
    ===================== */

    if (
      interaction.isButton() &&
      interaction.customId === 'close_ticket'
    ) {
      if (!isStaff(interaction.member)) {
        return interaction.reply({
          content: '❌ Only staff can close tickets.',
          ephemeral: true
        });
      }

      await interaction.reply({
        content: '🔒 Closing ticket...'
      });

      setTimeout(() => {
        interaction.channel.delete().catch(() => {});
      }, 1500);

      return;
    }

    /* =====================
       PARTNERSHIP
    ===================== */

    if (
      interaction.isButton() &&
      interaction.customId === 'open_partnership'
    ) {
      const modal = new ModalBuilder()
        .setCustomId('partnership_modal')
        .setTitle('Partnership Application');

      const server = new TextInputBuilder()
        .setCustomId('server')
        .setLabel('Server name')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const members = new TextInputBuilder()
        .setCustomId('members')
        .setLabel('Member count')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const invite = new TextInputBuilder()
        .setCustomId('invite')
        .setLabel('Invite link')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(server),
        new ActionRowBuilder().addComponents(members),
        new ActionRowBuilder().addComponents(invite)
      );

      return interaction.showModal(modal);
    }

    if (
      interaction.isModalSubmit() &&
      interaction.customId === 'partnership_modal'
    ) {
      const category = interaction.guild.channels.cache.get(
        data.channels?.ticketCategory
      );

      if (!category) {
        return interaction.reply({
          content: '❌ Ticket category is missing.',
          ephemeral: true
        });
      }

      const channel = await interaction.guild.channels.create({
        name: `partner-${interaction.user.id}`,
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: [
          {
            id: interaction.guild.roles.everyone.id,
            deny: [PermissionsBitField.Flags.ViewChannel]
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages
            ]
          },
          ...getStaffRoles(interaction.guild).map(role => ({
            id: role.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages
            ]
          }))
        ]
      });

      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffb6d9)
            .setTitle('୨୧・ partnership application')
            .setDescription(
              `**Server:** ${interaction.fields.getTextInputValue('server')}\n` +
              `**Members:** ${interaction.fields.getTextInputValue('members')}\n` +
              `**Invite:** ${interaction.fields.getTextInputValue('invite')}\n\n` +
              `**Applicant:** ${interaction.user}`
            )
        ]
      });

      return interaction.reply({
        content: `💜 Application created: ${channel}`,
        ephemeral: true
      });
    }

    /* =====================
       CONFESSION BUTTON
    ===================== */

    if (
      interaction.isButton() &&
      interaction.customId === 'open_confession'
    ) {
      const modal = new ModalBuilder()
        .setCustomId('confession_modal')
        .setTitle('Anonymous Confession');

      const input = new TextInputBuilder()
        .setCustomId('confession')
        .setLabel('Your confession')
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(1000)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(input)
      );

      return interaction.showModal(modal);
    }

    /* =====================
       SUGGESTION BUTTON
    ===================== */

    if (
      interaction.isButton() &&
      interaction.customId === 'open_suggestion'
    ) {
      const modal = new ModalBuilder()
        .setCustomId('suggestion_modal')
        .setTitle('Server Suggestion');

      const input = new TextInputBuilder()
        .setCustomId('suggestion')
        .setLabel('Your suggestion')
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(1000)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(input)
      );

      return interaction.showModal(modal);
    }

    /* =====================
       MODALS
    ===================== */

    if (
      interaction.isModalSubmit() &&
      interaction.customId === 'confession_modal'
    ) {
      const channel = getChannel(
        interaction.guild,
        '୨୧・confessions'
      );

      if (channel) {
        await channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0xffb6d9)
              .setTitle('💌・ anonymous confession')
              .setDescription(
                interaction.fields.getTextInputValue(
                  'confession'
                )
              )
          ]
        });
      }

      return interaction.reply({
        content: '💌 Your confession was sent anonymously.',
        ephemeral: true
      });
    }

    if (
      interaction.isModalSubmit() &&
      interaction.customId === 'suggestion_modal'
    ) {
      const channel = getChannel(
        interaction.guild,
        '୨୧・suggestions'
      );

      if (channel) {
        const message = await channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0xffb6d9)
              .setTitle('💡・ suggestion')
              .setDescription(
                interaction.fields.getTextInputValue(
                  'suggestion'
                )
              )
              .setFooter({
                text: `suggested by ${interaction.user.tag}`
              })
          ]
        });

        await message.react('👍');
        await message.react('👎');
      }

      return interaction.reply({
        content: '💡 Suggestion submitted!',
        ephemeral: true
      });
    }

    /* =====================
       SLASH COMMANDS
    ===================== */

    if (!interaction.isChatInputCommand()) return;

    const command = interaction.commandName;

    /* RESET */

    if (command === 'resetserver') {
      if (!isOwner(interaction.member)) {
        return interaction.reply({
          content: '❌ Only the server owner can use this.',
          ephemeral: true
        });
      }

      await interaction.deferReply({
        ephemeral: true
      });

      await resetServer(interaction.guild);

      await interaction.editReply(
        '✅ Server completely rebuilt!'
      );

      return;
    }

    /* COINFLIP */

    if (command === 'coinflip') {
      return interaction.reply(
        Math.random() < 0.5
          ? '🪙 **Heads!**'
          : '🪙 **Tails!**'
      );
    }

    /* ROLL */

    if (command === 'roll') {
      return interaction.reply(
        `🎲 You rolled **${Math.floor(Math.random() * 6) + 1}**!`
      );
    }

    /* 8BALL */

    if (command === '8ball') {
      const answers = [
        'yes ♡',
        'no 😭',
        'probably',
        'probably not',
        'absolutely',
        'ask again later',
        'i have no idea 💀'
      ];

      return interaction.reply(
        `🎱 ${answers[Math.floor(Math.random() * answers.length)]}`
      );
    }

    /* RPS */

    if (command === 'rps') {
      const userChoice = interaction.options.getString('choice');

      const choices = ['rock', 'paper', 'scissors'];
      const botChoice =
        choices[Math.floor(Math.random() * choices.length)];

      let result;

      if (userChoice === botChoice) {
        result = 'tie 😭';
      } else if (
        (userChoice === 'rock' && botChoice === 'scissors') ||
        (userChoice === 'paper' && botChoice === 'rock') ||
        (userChoice === 'scissors' && botChoice === 'paper')
      ) {
        result = 'you win! ♡';
      } else {
        result = 'i win 😼';
      }

      return interaction.reply(
        `🪨📄✂️ You chose **${userChoice}**.\n` +
        `I chose **${botChoice}**.\n\n` +
        `**${result}**`
      );
    }

    /* WOULD YOU RATHER */

    if (command === 'wouldyourather') {
      const questions = [
        'Would you rather be able to fly or become invisible?',
        'Would you rather have unlimited money or unlimited free time?',
        'Would you rather live in the city or the countryside?',
        'Would you rather never use TikTok again or never use Discord again?',
        'Would you rather always be 10 minutes late or 20 minutes early?'
      ];

      return interaction.reply(
        `🤔 **Would you rather...**\n\n${
          questions[Math.floor(Math.random() * questions.length)]
        }`
      );
    }

    /* TRIVIA */

    if (command === 'trivia') {
      const trivia = [
        ['What planet is known as the Red Planet?', 'Mars'],
        ['How many continents are there?', '7'],
        ['What is the largest ocean?', 'Pacific Ocean'],
        ['What animal is known as the king of the jungle?', 'Lion']
      ];

      const q =
        trivia[Math.floor(Math.random() * trivia.length)];

      return interaction.reply(
        `🧠 **Trivia:** ${q[0]}\n\nAnswer: ||${q[1]}||`
      );
    }

    /* RANK */

    if (command === 'rank') {
      const xp = data.xp[interaction.user.id] || 0;
      const level = Math.floor(xp / 100) + 1;
      const progress = xp % 100;

      return interaction.reply(
        `⭐ **${interaction.user.username}**\n\n` +
        `Level: **${level}**\n` +
        `XP: **${progress}/100**`
      );
    }

    /* LEADERBOARD */

    if (command === 'leaderboard') {
      const entries = Object.entries(data.xp)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      let text = '';

      for (let i = 0; i < entries.length; i++) {
        const [id, xp] = entries[i];
        const member = interaction.guild.members.cache.get(id);

        text += `**${i + 1}.** ${
          member?.user.username || 'Unknown'
        } — ${xp} XP\n`;
      }

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffb6d9)
            .setTitle('୨୧・ leaderboard')
            .setDescription(text || 'Nobody has XP yet!')
        ]
      });
    }

    /* PROFILE */

    if (command === 'profile') {
      const xp = data.xp[interaction.user.id] || 0;
      const level = Math.floor(xp / 100) + 1;
      const bio = data.bios[interaction.user.id] || 'No bio set.';

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffb6d9)
            .setTitle(`୨୧・ ${interaction.user.username}`)
            .setDescription(
              `**Bio**\n${bio}\n\n` +
              `⭐ **Level:** ${level}\n` +
              `✨ **XP:** ${xp}`
            )
        ]
      });
    }

    /* SET BIO */

    if (command === 'setbio') {
      const bio = interaction.options.getString('bio');

      data.bios[interaction.user.id] = bio;
      saveData();

      return interaction.reply({
        content: '♡ Bio updated!',
        ephemeral: true
      });
    }

    /* FRIEND */

    if (command === 'friend') {
      const user = interaction.options.getUser('user');

      if (!data.friends[interaction.user.id]) {
        data.friends[interaction.user.id] = [];
      }

      if (!data.friends[interaction.user.id].includes(user.id)) {
        data.friends[interaction.user.id].push(user.id);
      }

      saveData();

      return interaction.reply(
        `🫶 **${user.username}** was added to your friends!`
      );
    }

    /* FRIENDS */

    if (command === 'friends') {
      const friends =
        data.friends[interaction.user.id] || [];

      if (!friends.length) {
        return interaction.reply(
          'You don't have any friends added yet 😭'
        );
      }

      const names = friends
        .map(id => interaction.guild.members.cache.get(id)?.user.username)
        .filter(Boolean);

      return interaction.reply(
        `🫶 **Your friends:**\n${names.join('\n')}`
      );
    }

    /* =====================
       MODERATION
    ===================== */

    if (
      ['ban', 'kick', 'timeout', 'warn', 'warnings', 'clear']
        .includes(command)
    ) {
      if (!isStaff(interaction.member)) {
        return interaction.reply({
          content: '❌ You need a staff role to use this.',
          ephemeral: true
        });
      }
    }

    /* BAN */

    if (command === 'ban') {
      if (!isOwner(interaction.member)) {
        return interaction.reply({
          content: '❌ Only the owner can ban members.',
          ephemeral: true
        });
      }

      const user = interaction.options.getUser('user');
      const reason =
        interaction.options.getString('reason') ||
        'No reason provided';

      const member =
        await interaction.guild.members
          .fetch(user.id)
          .catch(() => null);

      if (member && member.id === interaction.guild.ownerId) {
        return interaction.reply({
          content: '❌ You cannot ban the server owner.',
          ephemeral: true
        });
      }

      await interaction.guild.members.ban(user.id, {
        reason
      });

      return interaction.reply(
        `🔨 Banned **${user.tag}**`
      );
    }

    /* KICK */

    if (command === 'kick') {
      const user = interaction.options.getUser('user');
      const member =
        await interaction.guild.members
          .fetch(user.id)
          .catch(() => null);

      if (!member) {
        return interaction.reply({
          content: '❌ Member not found.',
          ephemeral: true
        });
      }

      if (
        member.roles.highest.position >=
        interaction.member.roles.highest.position
      ) {
        return interaction.reply({
          content: '❌ You cannot moderate this member.',
          ephemeral: true
        });
      }

      await member.kick(
        interaction.options.getString('reason') ||
        'No reason provided'
      );

      return interaction.reply(
        `👢 Kicked **${user.tag}**`
      );
    }

    /* TIMEOUT */

    if (command === 'timeout') {
      const user = interaction.options.getUser('user');
      const minutes =
        interaction.options.getInteger('minutes');

      const member =
        await interaction.guild.members
          .fetch(user.id)
          .catch(() => null);

      if (!member) {
        return interaction.reply({
          content: '❌ Member not found.',
          ephemeral: true
        });
      }

      if (
        member.roles.highest.position >=
        interaction.member.roles.highest.position
      ) {
        return interaction.reply({
          content: '❌ You cannot timeout this member.',
          ephemeral: true
        });
      }

      await member.timeout(
        minutes * 60 * 1000,
        interaction.options.getString('reason') ||
        'No reason provided'
      );

      return interaction.reply(
        `⏰ Timed out **${user.tag}** for **${minutes} minutes**.`
      );
    }

    /* WARN */

    if (command === 'warn') {
      const user = interaction.options.getUser('user');
      const reason =
        interaction.options.getString('reason');

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
        `⚠️ Warned **${user.tag}**\nReason: ${reason}`
      );
    }

    /* WARNINGS */

    if (command === 'warnings') {
      const user = interaction.options.getUser('user');

      const warnings = data.warnings[user.id] || [];

      if (!warnings.length) {
        return interaction.reply(
          `✅ **${user.tag}** has no warnings.`
        );
      }

      const text = warnings
        .map(
          (w, i) =>
            `**${i + 1}.** ${w.reason}`
        )
        .join('\n');

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffb6d9)
            .setTitle(`⚠️・ ${user.tag}'s warnings`)
            .setDescription(text)
        ]
      });
    }

    /* CLEAR */

    if (command === 'clear') {
      const amount =
        interaction.options.getInteger('amount');

      await interaction.channel.bulkDelete(
        amount,
        true
      );

      return interaction.reply({
        content: `🧹 Deleted **${amount} messages**.`,
        ephemeral: true
      });
    }

    /* CONFESS COMMAND */

    if (command === 'confess') {
      const modal = new ModalBuilder()
        .setCustomId('confession_modal')
        .setTitle('Anonymous Confession');

      const input = new TextInputBuilder()
        .setCustomId('confession')
        .setLabel('Your confession')
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(1000)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(input)
      );

      return interaction.showModal(modal);
    }

    /* SUGGEST COMMAND */

    if (command === 'suggest') {
      const modal = new ModalBuilder()
        .setCustomId('suggestion_modal')
        .setTitle('Server Suggestion');

      const input = new TextInputBuilder()
        .setCustomId('suggestion')
        .setLabel('Your suggestion')
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(1000)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(input)
      );

      return interaction.showModal(modal);
    }

  } catch (err) {
    console.error('Interaction error:', err);

    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({
        content: '❌ Something went wrong.'
      }).catch(() => {});
    } else {
      await interaction.reply({
        content: '❌ Something went wrong.',
        ephemeral: true
      }).catch(() => {});
    }
  }
});

/* =========================
   XP SYSTEM
========================= */

const xpCooldown = new Map();

client.on('messageCreate', async message => {
  if (
    message.author.bot ||
    !message.guild
  ) return;

  const now = Date.now();
  const last = xpCooldown.get(message.author.id) || 0;

  if (now - last < 60000) return;

  xpCooldown.set(message.author.id, now);

  data.xp[message.author.id] =
    (data.xp[message.author.id] || 0) +
    Math.floor(Math.random() * 11) + 10;

  saveData();

  const xp = data.xp[message.author.id];
  const oldLevel =
    Math.floor((xp - 10) / 100) + 1;
  const newLevel =
    Math.floor(xp / 100) + 1;

  if (newLevel > oldLevel) {
    const levelChannel =
      getChannel(message.guild, '୨୧・levels');

    if (levelChannel) {
      levelChannel.send(
        `🎉 ${message.author} reached **Level ${newLevel}**! ♡`
      );
    }
  }
});

/* =========================
   WELCOME
========================= */

client.on('guildMemberAdd', async member => {
  const role = getRole(member.guild, 'Member');

  if (role) {
    await member.roles.add(role).catch(() => {});
  }

  const channel =
    getChannel(member.guild, '୨୧・introductions');

  if (channel) {
    channel.send(
      `🌸 Welcome ${member} to **${member.guild.name}**! ♡`
    );
  }
});

/* =========================
   BOOST
========================= */

client.on('guildMemberUpdate', async (oldMember, newMember) => {
  if (!oldMember.premiumSince && newMember.premiumSince) {
    const booster =
      getRole(newMember.guild, '🌸・booster');

    if (booster) {
      await newMember.roles.add(booster).catch(() => {});
    }

    const channel =
      getChannel(newMember.guild, '୨୧・boosts');

    if (channel) {
      channel.send(
        `🌸 ${newMember} just boosted the server! Thank you ♡`
      );
    }
  }

  if (oldMember.premiumSince && !newMember.premiumSince) {
    const booster =
      getRole(newMember.guild, '🌸・booster');

    if (booster) {
      await newMember.roles.remove(booster).catch(() => {});
    }
  }
});

/* =========================
   LOGIN
========================= */

client.login(TOKEN);