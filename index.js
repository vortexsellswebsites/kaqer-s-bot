const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder,
  SlashCommandBuilder,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
}=require("discord.js");
const fs=require("fs");
const path=require("path");

const TOKEN=process.env.TOKEN;
if(!TOKEN) throw new Error("TOKEN variable is missing.");

const client=new Client({
  intents:[
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ]
});

const DATA=path.join(__dirname,"data");
if(!fs.existsSync(DATA)) fs.mkdirSync(DATA);

function load(name,def){
  const file=path.join(DATA,name);
  try{
    return JSON.parse(fs.readFileSync(file,"utf8"));
  }catch{
    fs.writeFileSync(file,JSON.stringify(def,null,2));
    return def;
  }
}

function save(name,data){
  fs.writeFileSync(path.join(DATA,name),JSON.stringify(data,null,2));
}

const profiles=load("profiles.json",{});
const warnings=load("warnings.json",{});
const settings=load("settings.json",{});
const confessions=load("confessions.json",{});
const starboard=load("starboard.json",{});

const SELF_ROLES=[
  ["୨୧・woman",0xff9acb],
  ["୨୧・man",0x6fa8dc],
  ["୨୧・they/them",0xb39ddb],
  ["୨୧・she/her",0xffb6c1],
  ["୨୧・he/him",0x87ceeb],
  ["୨୧・minor",0x77dd77],
  ["୨୧・adult",0xffd166],
  ["୨୧・single",0x9b59b6],
  ["୨୧・taken",0xe75480],
  ["୨୧・spectator",0x95a5a6],
  ["୨୧・participant",0x3498db]
];

const STAFF_ROLES=[
  ["Member",0xffffff],
  ["🌸 Booster",0xff8fc7],
  ["🔨 Staff",0x9b59b6],
  ["🛡️ Moderator",0x5865f2],
  ["👑 Owner",0xff69b4]
];

const LEVEL_ROLES=[
  ["୨୧・level 5",0x77dd77],
  ["୨୧・level 10",0xffd166],
  ["୨୧・level 20",0x9b59b6],
  ["୨୧・level 30",0x55bfff]
];

const allRoleData=[
  ...STAFF_ROLES,
  ...SELF_ROLES,
  ...LEVEL_ROLES
];

const CHANNELS={
  "001":[
    ["୨୧・rules",true],
    ["୨୧・announcements",true],
    ["୨୧・boosts",true],
    ["୨୧・roles",true]
  ],
  "002":[
    ["୨୧・chat",false],
    ["୨୧・introductions",false],
    ["୨୧・media",false],
    ["୨୧・games",false],
    ["୨୧・bots",false]
  ],
  "003":[
    ["୨୧・levels",true],
    ["୨୧・starboard",true],
    ["୨୧・confessions",false],
    ["୨୧・support",false]
  ]
};

function profile(id){
  if(!profiles[id]){
    profiles[id]={
      xp:0,
      level:0,
      lastXP:0,
      bio:"",
      friends:[]
    };
  }
  return profiles[id];
}

function needed(level){
  return 100+(level*50);
}

function isOwner(member){
  return member.guild.ownerId===member.id;
}

function isStaff(member){
  return isOwner(member)||
    member.roles.cache.some(r=>[
      "🔨 Staff",
      "🛡️ Moderator"
    ].includes(r.name));
}

function isModerator(member){
  return isOwner(member)||
    member.roles.cache.some(r=>[
      "🔨 Staff",
      "🛡️ Moderator"
    ].includes(r.name));
}

async function getRole(guild,name){
  return guild.roles.cache.find(r=>r.name===name);
}

async function getChannel(guild,name){
  return guild.channels.cache.find(
    c=>c.type===ChannelType.GuildText&&c.name===name
  );
}

async function createRoles(guild){
  const roles={};

  for(const [name,color] of allRoleData){
    let role=await getRole(guild,name);

    if(!role){
      role=await guild.roles.create({
        name:name,
        color:color,
        reason:"Community server setup"
      });
    }

    roles[name]=role;
  }

  return roles;
}

async function lockChannel(channel){
  await channel.permissionOverwrites.edit(
    channel.guild.roles.everyone,
    {
      SendMessages:false,
      AddReactions:false,
      CreatePublicThreads:false,
      CreatePrivateThreads:false
    }
  ).catch(()=>{});
}

async function unlockChannel(channel){
  await channel.permissionOverwrites.edit(
    channel.guild.roles.everyone,
    {
      SendMessages:true,
      AddReactions:true,
      CreatePublicThreads:true,
      CreatePrivateThreads:true
    }
  ).catch(()=>{});
}

async function createCategory(guild,name){
  return await guild.channels.create({
    name:name,
    type:ChannelType.GuildCategory
  });
}

async function createChannel(guild,category,name,locked){
  const channel=await guild.channels.create({
    name:name,
    type:ChannelType.GuildText,
    parent:category.id
  });

  if(locked) await lockChannel(channel);
  else await unlockChannel(channel);

  return channel;
}

async function sendPanel(channel,title,description){
  await channel.send({
    embeds:[
      new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setTimestamp()
    ]
  }).catch(()=>{});
}

async function updateBoostPanel(guild){
  const channel=await getChannel(guild,"୨୧・boosts");
  if(!channel) return;

  const boosts=guild.premiumSubscriptionCount||0;
  const tier=guild.premiumTier||0;
  const boosters=guild.members.cache.filter(m=>m.premiumSince).size;

  const messages=await channel.messages.fetch({limit:20}).catch(()=>null);
  const old=messages?.find(m=>m.author.id===client.user.id);

  const embed=new EmbedBuilder()
    .setTitle("୨୧・boosts")
    .setDescription(
`╭──────────────୨୧
**Boosts:** ${boosts}
**Server Level:** ${tier}
**Boosters:** ${boosters}
╰──────────────୨୧

Thank you to everyone supporting the server.`
    )
    .setTimestamp();

  if(old){
    await old.edit({embeds:[embed]}).catch(()=>{});
  }else{
    await channel.send({embeds:[embed]}).catch(()=>{});
  }
}

async function updateLevelRoles(member){
  const p=profile(member.id);

  for(const [name] of LEVEL_ROLES){
    const level=parseInt(name.split(" ")[1]);
    const role=await getRole(member.guild,name);

    if(!role) continue;

    if(p.level>=level&&!member.roles.cache.has(role.id)){
      await member.roles.add(role).catch(()=>{});
    }
  }
}

async function sendRolePanel(channel){
  const rows=[];

  for(let i=0;i<SELF_ROLES.length;i+=5){
    const row=new ActionRowBuilder();

    for(const [name] of SELF_ROLES.slice(i,i+5)){
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`selfrole:${name}`)
          .setLabel(name)
          .setStyle(ButtonStyle.Secondary)
      );
    }

    rows.push(row);
  }

  await channel.send({
    embeds:[
      new EmbedBuilder()
        .setTitle("୨୧・roles")
        .setDescription(
`Choose the roles you want.

Click a role to add it.
Click it again to remove it.

**Gender**
୨୧・woman
୨୧・man

**Pronouns**
୨୧・they/them
୨୧・she/her
୨୧・he/him

**Age**
୨୧・minor
୨୧・adult

**Relationship**
୨୧・single
୨୧・taken

**Server**
୨୧・spectator
୨୧・participant`
        )
    ],
    components:rows
  }).catch(()=>{});
}

async function sendGamePanel(channel){
  await channel.send({
    embeds:[
      new EmbedBuilder()
        .setTitle("୨୧・games")
        .setDescription(
`Have fun with the server.

**Games**
\`/coinflip\`
\`/roll\`
\`/8ball\`
\`/rps\`
\`/wouldyourather\`
\`/trivia\``
        )
    ]
  }).catch(()=>{});
}

async function sendBotPanel(channel){
  await channel.send({
    embeds:[
      new EmbedBuilder()
        .setTitle("୨୧・bots")
        .setDescription(
`Use the bot commands here.

**Community**
\`/profile\`
\`/setbio\`
\`/rank\`
\`/leaderboard\`
\`/friend\`
\`/friends\`

**Games**
\`/coinflip\`
\`/roll\`
\`/8ball\`
\`/rps\`
\`/wouldyourather\`
\`/trivia\`

**Anonymous**
\`/confess\`

**Moderation**
\`/warn\`
\`/warnings\`
\`/clear\`
\`/kick\`
\`/timeout\`
\`/ban\``
        )
    ]
  }).catch(()=>{});
}

async function sendLevelPanel(channel){
  await channel.send({
    embeds:[
      new EmbedBuilder()
        .setTitle("୨୧・levels")
        .setDescription(
`Chat to earn XP.

You receive XP from chatting with a cooldown to prevent spam.

**Commands**
\`/rank\`
\`/leaderboard\`

**Level Rewards**
୨୧・level 5
୨୧・level 10
୨୧・level 20
୨୧・level 30`
        )
    ]
  }).catch(()=>{});
}

async function sendStarboardPanel(channel){
  await channel.send({
    embeds:[
      new EmbedBuilder()
        .setTitle("୨୧・starboard")
        .setDescription(
          "Messages that receive **3 ⭐ reactions** will be featured here."
        )
    ]
  }).catch(()=>{});
}

async function sendConfessionPanel(channel){
  const row=new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("confess")
      .setLabel("Send Confession")
      .setStyle(ButtonStyle.Secondary)
  );

  await channel.send({
    embeds:[
      new EmbedBuilder()
        .setTitle("୨୧・confessions")
        .setDescription(
          "Send an anonymous confession with `/confess` or the button below."
        )
    ],
    components:[row]
  }).catch(()=>{});
}

async function sendSupportPanel(channel){
  const row=new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("support")
      .setLabel("Create Support Ticket")
      .setStyle(ButtonStyle.Secondary)
  );

  await channel.send({
    embeds:[
      new EmbedBuilder()
        .setTitle("୨୧・support")
        .setDescription(
          "Need help? Create a private support ticket."
        )
    ],
    components:[row]
  }).catch(()=>{});
}

async function resetServer(guild){
  const channels=[...guild.channels.cache.values()];

  for(const channel of channels){
    await channel.delete("Server reset").catch(()=>{});
  }

  await createRoles(guild);

  for(const categoryName of Object.keys(CHANNELS)){
    const category=await createCategory(guild,categoryName);

    for(const [name,locked] of CHANNELS[categoryName]){
      const channel=await createChannel(
        guild,
        category,
        name,
        locked
      );

      if(name==="୨୧・rules"){
        await sendPanel(
          channel,
          "୨୧・rules",
`Please follow the rules.

1. Be respectful.
2. No harassment or bullying.
3. No spam.
4. No inappropriate content.
5. No unwanted advertising.
6. Don't abuse bots.
7. Listen to staff.
8. Follow Discord's Terms of Service and Community Guidelines.`
        );
      }

      if(name==="୨୧・announcements"){
        await sendPanel(
          channel,
          "୨୧・announcements",
          "Important server updates will be posted here."
        );
      }

      if(name==="୨୧・roles"){
        await sendRolePanel(channel);
      }

      if(name==="୨୧・games"){
        await sendGamePanel(channel);
      }

      if(name==="୨୧・bots"){
        await sendBotPanel(channel);
      }

      if(name==="୨୧・levels"){
        await sendLevelPanel(channel);
      }

      if(name==="୨୧・starboard"){
        await sendStarboardPanel(channel);
      }

      if(name==="୨୧・confessions"){
        await sendConfessionPanel(channel);
      }

      if(name==="୨୧・support"){
        await sendSupportPanel(channel);
      }
    }
  }

  const levels=await getChannel(guild,"୨୧・levels");
  const star=await getChannel(guild,"୨୧・starboard");
  const boosts=await getChannel(guild,"୨୧・boosts");

  settings[guild.id]={
    levelChannel:levels?.id||null,
    starboardChannel:star?.id||null,
    boostChannel:boosts?.id||null
  };

  save("settings.json",settings);

  await updateBoostPanel(guild);
}

const commands=[
  new SlashCommandBuilder()
    .setName("resetserver")
    .setDescription("Rebuild the entire server"),

  new SlashCommandBuilder()
    .setName("rank")
    .setDescription("View your level"),

  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("View the XP leaderboard"),

  new SlashCommandBuilder()
    .setName("profile")
    .setDescription("View a profile")
    .addUserOption(o=>
      o.setName("user")
       .setDescription("User")
    ),

  new SlashCommandBuilder()
    .setName("setbio")
    .setDescription("Set your profile bio")
    .addStringOption(o=>
      o.setName("text")
       .setDescription("Bio")
       .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("friend")
    .setDescription("Add a friend")
    .addUserOption(o=>
      o.setName("user")
       .setDescription("User")
       .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("friends")
    .setDescription("View your friends"),

  new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Flip a coin"),

  new SlashCommandBuilder()
    .setName("roll")
    .setDescription("Roll a dice"),

  new SlashCommandBuilder()
    .setName("8ball")
    .setDescription("Ask the magic 8ball")
    .addStringOption(o=>
      o.setName("question")
       .setDescription("Question")
       .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("rps")
    .setDescription("Play rock paper scissors")
    .addStringOption(o=>
      o.setName("choice")
       .setDescription("Your choice")
       .setRequired(true)
       .addChoices(
         {name:"rock",value:"rock"},
         {name:"paper",value:"paper"},
         {name:"scissors",value:"scissors"}
       )
    ),

  new SlashCommandBuilder()
    .setName("wouldyourather")
    .setDescription("Get a random would-you-rather"),

  new SlashCommandBuilder()
    .setName("trivia")
    .setDescription("Get a random trivia question"),

  new SlashCommandBuilder()
    .setName("confess")
    .setDescription("Send an anonymous confession")
    .addStringOption(o=>
      o.setName("message")
       .setDescription("Your anonymous confession")
       .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check bot latency"),

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member")
    .addUserOption(o=>
      o.setName("user")
       .setDescription("Member")
       .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member")
    .addUserOption(o=>
      o.setName("user")
       .setDescription("Member")
       .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout a member")
    .addUserOption(o=>
      o.setName("user")
       .setDescription("Member")
       .setRequired(true)
    )
    .addIntegerOption(o=>
      o.setName("minutes")
       .setDescription("Minutes")
       .setMinValue(1)
       .setMaxValue(40320)
       .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a member")
    .addUserOption(o=>
      o.setName("user")
       .setDescription("Member")
       .setRequired(true)
    )
    .addStringOption(o=>
      o.setName("reason")
       .setDescription("Reason")
       .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("View warnings")
    .addUserOption(o=>
      o.setName("user")
       .setDescription("Member")
    ),

  new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Delete messages")
    .addIntegerOption(o=>
      o.setName("amount")
       .setDescription("Amount")
       .setMinValue(1)
       .setMaxValue(100)
       .setRequired(true)
    )
].map(c=>c.toJSON());

client.once("clientReady",async()=>{
  console.log(`♡ ${client.user.username} | ${client.user.tag} is online`);

  try{
    await client.application.commands.set(commands);
    console.log("♡ Commands registered");
  }catch(error){
    console.error("Command registration error:",error);
  }

  for(const guild of client.guilds.cache.values()){
    await updateBoostPanel(guild).catch(()=>{});
  }
});

client.on("interactionCreate",async interaction=>{
  try{
    if(interaction.isButton()){

      if(interaction.customId.startsWith("selfrole:")){
        const roleName=interaction.customId.slice(9);
        const role=await getRole(interaction.guild,roleName);

        if(!role){
          return interaction.reply({
            content:"That role doesn't exist.",
            flags:MessageFlags.Ephemeral
          });
        }

        if(interaction.member.roles.cache.has(role.id)){
          await interaction.member.roles.remove(role);

          return interaction.reply({
            content:`Removed ${roleName}.`,
            flags:MessageFlags.Ephemeral
          });
        }

        await interaction.member.roles.add(role);

        return interaction.reply({
          content:`Added ${roleName}.`,
          flags:MessageFlags.Ephemeral
        });
      }

      if(interaction.customId==="confess"){
        return interaction.reply({
          content:"Use `/confess` to send an anonymous confession.",
          flags:MessageFlags.Ephemeral
        });
      }

      if(interaction.customId==="support"){
        const guild=interaction.guild;

        const existing=guild.channels.cache.find(
          c=>c.name===`ticket-${interaction.user.id}`
        );

        if(existing){
          return interaction.reply({
            content:`You already have a ticket: ${existing}`,
            flags:MessageFlags.Ephemeral
          });
        }

        const staffRole=await getRole(guild,"🔨 Staff");
        const modRole=await getRole(guild,"🛡️ Moderator");

        const overwrites=[
          {
            id:guild.roles.everyone.id,
            deny:[PermissionsBitField.Flags.ViewChannel]
          },
          {
            id:interaction.user.id,
            allow:[
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory
            ]
          },
          {
            id:client.user.id,
            allow:[
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ManageChannels,
              PermissionsBitField.Flags.ReadMessageHistory
            ]
          }
        ];

        if(staffRole){
          overwrites.push({
            id:staffRole.id,
            allow:[
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory
            ]
          });
        }

        if(modRole){
          overwrites.push({
            id:modRole.id,
            allow:[
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory
            ]
          });
        }

        const channel=await guild.channels.create({
          name:`ticket-${interaction.user.id}`,
          type:ChannelType.GuildText,
          permissionOverwrites:overwrites
        });

        await channel.send(
`୨୧・support ticket

Tell us what you need help with.

Staff will respond when available.`
        );

        return interaction.reply({
          content:`Ticket created: ${channel}`,
          flags:MessageFlags.Ephemeral
        });
      }

      return;
    }

    if(!interaction.isChatInputCommand()) return;

    if(interaction.commandName==="resetserver"){
      if(!isOwner(interaction.member)){
        return interaction.reply({
          content:"Only the server owner can use this command.",
          flags:MessageFlags.Ephemeral
        });
      }

      await interaction.reply({
        content:"Rebuilding the server...",
        flags:MessageFlags.Ephemeral
      });

      await resetServer(interaction.guild);

      await interaction.editReply("Server rebuilt successfully.");

      setTimeout(()=>{
        interaction.deleteReply().catch(()=>{});
      },1500);

      return;
    }

    await interaction.deferReply({
      flags:MessageFlags.Ephemeral
    });

    const guild=interaction.guild;
    const member=interaction.member;

    if(interaction.commandName==="rank"){
      const p=profile(member.id);
      const required=needed(p.level);
      const percent=Math.min(
        100,
        Math.floor((p.xp/required)*100)
      );
      const bars=Math.floor(percent/10);

      return interaction.editReply(
`୨୧・rank

**${member.user.username}**
Level: **${p.level}**
XP: **${p.xp}/${required}**

${"▰".repeat(bars)}${"▱".repeat(10-bars)} ${percent}%`
      );
    }

    if(interaction.commandName==="leaderboard"){
      const top=Object.entries(profiles)
        .sort((a,b)=>{
          if(b[1].level!==a[1].level)
            return b[1].level-a[1].level;

          return b[1].xp-a[1].xp;
        })
        .slice(0,10);

      if(!top.length){
        return interaction.editReply(
          "Nobody has earned XP yet."
        );
      }

      let out="୨୧・leaderboard\n\n";

      top.forEach((x,i)=>{
        out+=`**${i+1}.** <@${x[0]}> — Level **${x[1].level}** (${x[1].xp} XP)\n`;
      });

      return interaction.editReply(out);
    }

    if(interaction.commandName==="profile"){
      const user=
        interaction.options.getUser("user")||
        interaction.user;

      const p=profile(user.id);

      return interaction.editReply({
        embeds:[
          new EmbedBuilder()
            .setTitle("୨୧・profile")
            .setThumbnail(user.displayAvatarURL())
            .setDescription(
`**${user.username}**

Level: **${p.level}**
XP: **${p.xp}/${needed(p.level)}**
Bio: ${p.bio||"Not set"}
Friends: **${p.friends.length}**`
            )
        ]
      });
    }

    if(interaction.commandName==="setbio"){
      const p=profile(member.id);
      p.bio=interaction.options
        .getString("text")
        .slice(0,500);

      save("profiles.json",profiles);

      return interaction.editReply(
        "Your bio has been updated."
      );
    }

    if(interaction.commandName==="friend"){
      const user=interaction.options.getUser("user");

      if(user.id===member.id){
        return interaction.editReply(
          "You can't add yourself."
        );
      }

      const p=profile(member.id);

      if(!p.friends.includes(user.id)){
        p.friends.push(user.id);
      }

      save("profiles.json",profiles);

      return interaction.editReply(
        `${user} was added to your friends.`
      );
    }

    if(interaction.commandName==="friends"){
      const p=profile(member.id);

      return interaction.editReply(
        p.friends.length
        ? `Friends: ${p.friends.map(id=>`<@${id}>`).join(", ")}`
        : "You don't have any friends added."
      );
    }

    if(interaction.commandName==="coinflip"){
      return interaction.editReply(
        `୨୧・coinflip\n\n**${Math.random()<0.5?"Heads":"Tails"}**`
      );
    }

    if(interaction.commandName==="roll"){
      return interaction.editReply(
        `୨୧・roll\n\nYou rolled **${Math.floor(Math.random()*6)+1}**.`
      );
    }

    if(interaction.commandName==="8ball"){
      const answers=[
        "Yes.",
        "No.",
        "Maybe.",
        "Definitely.",
        "Probably.",
        "Ask again later.",
        "I don't think so.",
        "Absolutely."
      ];

      return interaction.editReply(
        `୨୧・8ball\n\n${answers[Math.floor(Math.random()*answers.length)]}`
      );
    }

    if(interaction.commandName==="rps"){
      const choice=interaction.options.getString("choice");
      const choices=["rock","paper","scissors"];
      const bot=choices[Math.floor(Math.random()*3)];

      let result="Tie.";

      if(
        (choice==="rock"&&bot==="scissors")||
        (choice==="paper"&&bot==="rock")||
        (choice==="scissors"&&bot==="paper")
      ){
        result="You win.";
      }else if(choice!==bot){
        result="You lose.";
      }

      return interaction.editReply(
`୨୧・rps

You: **${choice}**
Bot: **${bot}**

**${result}**`
      );
    }

    if(interaction.commandName==="wouldyourather"){
      const questions=[
        "Would you rather have unlimited money or unlimited free time?",
        "Would you rather live in the city or the countryside?",
        "Would you rather never use social media again or never play games again?",
        "Would you rather be able to fly or teleport?",
        "Would you rather always be early or always be late?"
      ];

      return interaction.editReply(
        `୨୧・would you rather\n\n${questions[Math.floor(Math.random()*questions.length)]}`
      );
    }

    if(interaction.commandName==="trivia"){
      const questions=[
        ["What planet is known as the Red Planet?","Mars"],
        ["How many continents are there?","7"],
        ["What is the largest ocean?","Pacific Ocean"],
        ["What gas do humans need to breathe?","Oxygen"],
        ["How many sides does a hexagon have?","6"]
      ];

      const q=questions[Math.floor(Math.random()*questions.length)];

      return interaction.editReply(
`୨୧・trivia

**Question:** ${q[0]}

**Answer:** ||${q[1]}||`
      );
    }

    if(interaction.commandName==="confess"){
      const message=interaction.options
        .getString("message")
        .slice(0,1000);

      const channel=await getChannel(
        guild,
        "୨୧・confessions"
      );

      if(!channel){
        return interaction.editReply(
          "The confession channel doesn't exist."
        );
      }

      const id=(confessions[guild.id]||0)+1;

      confessions[guild.id]=id;
      save("confessions.json",confessions);

      await channel.send({
        embeds:[
          new EmbedBuilder()
            .setTitle(`୨୧・confession #${id}`)
            .setDescription(message)
            .setFooter({
              text:"Anonymous confession"
            })
            .setTimestamp()
        ]
      });

      return interaction.editReply(
        "Your confession was posted anonymously."
      );
    }

    if(interaction.commandName==="ping"){
      return interaction.editReply(
        `Pong! ${client.ws.ping}ms`
      );
    }

    if([
      "ban",
      "kick",
      "timeout",
      "warn",
      "warnings",
      "clear"
    ].includes(interaction.commandName)){

      if(!isModerator(member)){
        return interaction.editReply(
          "You don't have permission to use this command."
        );
      }
    }

    if(interaction.commandName==="ban"){
      if(!isOwner(member)){
        return interaction.editReply(
          "Only the server owner can ban members."
        );
      }

      const target=await guild.members.fetch(
        interaction.options.getUser("user").id
      ).catch(()=>null);

      if(!target||!target.bannable){
        return interaction.editReply(
          "I can't ban that member."
        );
      }

      await target.ban({
        reason:`Owner ban by ${member.user.tag}`
      });

      return interaction.editReply(
        `Banned **${target.user.tag}**.`
      );
    }

    if(interaction.commandName==="kick"){
      const target=interaction.options.getMember("user");

      if(!target?.kickable){
        return interaction.editReply(
          "I can't kick that member."
        );
      }

      await target.kick(
        `Moderator kick by ${member.user.tag}`
      );

      return interaction.editReply(
        `Kicked **${target.user.tag}**.`
      );
    }

    if(interaction.commandName==="timeout"){
      const target=interaction.options.getMember("user");
      const minutes=interaction.options.getInteger("minutes");

      if(!target?.moderatable){
        return interaction.editReply(
          "I can't timeout that member."
        );
      }

      await target.timeout(
        minutes*60000,
        `Timeout by ${member.user.tag}`
      );

      return interaction.editReply(
        `Timed out **${target.user.tag}** for **${minutes} minutes**.`
      );
    }

    if(interaction.commandName==="warn"){
      const user=interaction.options.getUser("user");
      const reason=interaction.options.getString("reason");

      if(!warnings[user.id]){
        warnings[user.id]=[];
      }

      warnings[user.id].push({
        reason:reason,
        moderator:member.id,
        date:Date.now()
      });

      save("warnings.json",warnings);

      return interaction.editReply(
`Warned **${user.tag}**.

Reason: ${reason}`
      );
    }

    if(interaction.commandName==="warnings"){
      const user=
        interaction.options.getUser("user")||
        interaction.user;

      const list=warnings[user.id]||[];

      if(!list.length){
        return interaction.editReply(
          `${user.username} has no warnings.`
        );
      }

      return interaction.editReply(
`୨୧・warnings

${list.map((w,i)=>`**${i+1}.** ${w.reason}`).join("\n")}`
      );
    }

    if(interaction.commandName==="clear"){
      const amount=interaction.options.getInteger("amount");

      await interaction.channel.bulkDelete(
        amount,
        true
      );

      return interaction.editReply(
        `Deleted **${amount}** messages.`
      );
    }

  }catch(error){
    console.error(error);

    if(interaction.deferred||interaction.replied){
      await interaction.editReply(
        "Something went wrong. Check the bot logs."
      ).catch(()=>{});
    }else{
      await interaction.reply({
        content:"Something went wrong.",
        flags:MessageFlags.Ephemeral
      }).catch(()=>{});
    }
  }
});

client.on("messageCreate",async message=>{
  if(message.author.bot||!message.guild) return;

  const p=profile(message.author.id);
  const now=Date.now();

  if(now-p.lastXP<60000) return;

  p.lastXP=now;
  p.xp+=Math.floor(Math.random()*11)+10;

  let leveled=false;

  while(p.xp>=needed(p.level)){
    p.xp-=needed(p.level);
    p.level++;
    leveled=true;
  }

  save("profiles.json",profiles);

  if(leveled){
    await updateLevelRoles(message.member);

    const channel=
      settings[message.guild.id]?.levelChannel
      ? message.guild.channels.cache.get(
          settings[message.guild.id].levelChannel
        )
      : await getChannel(
          message.guild,
          "୨୧・levels"
        );

    if(channel){
      await channel.send(
`୨୧・level up

${message.author} reached **Level ${p.level}**!`
      ).catch(()=>{});
    }
  }
});

client.on("messageReactionAdd",async(reaction,user)=>{
  try{
    if(user.bot) return;

    if(reaction.partial){
      await reaction.fetch().catch(()=>{});
    }

    if(reaction.message.partial){
      await reaction.message.fetch().catch(()=>{});
    }

    if(reaction.emoji.name!=="⭐") return;
    if(reaction.count<3) return;

    const guild=reaction.message.guild;
    if(!guild) return;

    const channel=await getChannel(
      guild,
      "୨୧・starboard"
    );

    if(!channel) return;

    const key=reaction.message.id;

    if(starboard[key]) return;

    starboard[key]=true;
    save("starboard.json",starboard);

    const embed=new EmbedBuilder()
      .setAuthor({
        name:reaction.message.author.tag,
        iconURL:reaction.message.author.displayAvatarURL()
      })
      .setDescription(
`${reaction.message.content||"*No text content*"}

[Jump to message](${reaction.message.url})`
      )
      .setFooter({
        text:`${reaction.count} ⭐`
      })
      .setTimestamp();

    await channel.send({
      embeds:[embed]
    }).catch(()=>{});

  }catch(error){
    console.error("Starboard error:",error);
  }
});

client.on("guildMemberUpdate",async(oldMember,newMember)=>{
  try{
    const oldBoost=!!oldMember.premiumSince;
    const newBoost=!!newMember.premiumSince;

    if(oldBoost===newBoost) return;

    const booster=await getRole(
      newMember.guild,
      "🌸 Booster"
    );

    if(newBoost){
      if(
        booster&&
        !newMember.roles.cache.has(booster.id)
      ){
        await newMember.roles.add(booster).catch(()=>{});
      }

      await updateBoostPanel(
        newMember.guild
      );

      const channel=await getChannel(
        newMember.guild,
        "୨୧・boosts"
      );

      if(channel){
        await channel.send(
          `Thank you ${newMember} for boosting the server! ♡`
        ).catch(()=>{});
      }
    }else{
      if(
        booster&&
        newMember.roles.cache.has(booster.id)
      ){
        await newMember.roles.remove(booster).catch(()=>{});
      }

      await updateBoostPanel(
        newMember.guild
      );
    }
  }catch(error){
    console.error("Boost error:",error);
  }
});

client.on("guildMemberAdd",async member=>{
  try{
    const memberRole=await getRole(
      member.guild,
      "Member"
    );

    if(memberRole){
      await member.roles.add(memberRole).catch(()=>{});
    }

    const channel=await getChannel(
      member.guild,
      "୨୧・introductions"
    );

    if(channel){
      await channel.send(
`Welcome ${member}! ♡

Introduce yourself and make some friends.`
      ).catch(()=>{});
    }
  }catch(error){
    console.error("Welcome error:",error);
  }
});

client.login(TOKEN);