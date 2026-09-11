const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder,
  SlashCommandBuilder,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
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
    GatewayIntentBits.MessageContent
  ]
});

const DATA=path.join(__dirname,"data");
if(!fs.existsSync(DATA)) fs.mkdirSync(DATA);

const load=(name,def)=>{
  const p=path.join(DATA,name);
  try{return JSON.parse(fs.readFileSync(p,"utf8"))}
  catch{fs.writeFileSync(p,JSON.stringify(def,null,2));return def}
};

const save=(name,data)=>{
  fs.writeFileSync(path.join(DATA,name),JSON.stringify(data,null,2));
};

const profiles=load("profiles.json",{});
const warnings=load("warnings.json",{});
const settings=load("settings.json",{});

const ROLE_DATA=[
  ["Member",0xffffff],
  ["🤝 Friend",0x57d68d],
  ["🌸 Booster",0xff8fc7],
  ["💎 VIP",0x55bfff],
  ["🌱 Level 5",0x77dd77],
  ["✨ Level 10",0xffd166],
  ["💫 Level 20",0x9b59b6],
  ["💎 Level 30",0x55bfff],
  ["🔨 Staff",0x9b59b6],
  ["🛡️ Moderator",0x5865f2],
  ["👑 Owner",0xff69b4]
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

const text={
  "୨୧・rules":{
    title:"୨୧ 𝓡𝓾𝓵𝓮𝓼",
    description:
`♡ Be respectful to everyone.
♡ No harassment, hate, or bullying.
♡ No spam or message flooding.
♡ No inappropriate or illegal content.
♡ No unwanted advertising.
♡ Don't abuse bots or exploits.
♡ Keep arguments out of public chat.
♡ Listen to staff instructions.
♡ Have fun and make friends.

╭──────────────୨୧
Please follow Discord's Terms of Service and Community Guidelines.
╰──────────────୨୧`
  },
  "୨୧・announcements":{
    title:"୨୧ 𝓐𝓷𝓷𝓸𝓾𝓷𝓬𝓮𝓶𝓮𝓷𝓽𝓼",
    description:"♡ Important server updates will be posted here.\n\nOnly staff can send messages in this channel."
  },
  "୨୧・roles":{
    title:"୨୧ 𝓡𝓸𝓵𝓮𝓼",
    description:
`♡ **🤝 Friend** — community role
♡ **🌸 Booster** — automatically given when you boost
♡ **💎 VIP** — special supporter role
♡ **🌱 Level 5** — level reward
♡ **✨ Level 10** — level reward
♡ **💫 Level 20** — level reward
♡ **💎 Level 30** — level reward

More roles can be added later.`
  },
  "୨୧・levels":{
    title:"୨୧ 𝓛𝓮𝓿𝓮𝓵𝓼",
    description:
`♡ Chat in the server to earn XP.
♡ XP has a cooldown to prevent spam.
♡ Level-ups are announced here.
♡ Higher levels unlock reward roles.

**Commands**
\`/rank\` — your level
\`/leaderboard\` — top members`
  },
  "୨୧・starboard":{
    title:"୨୧ 𝓢𝓽𝓪𝓻𝓫𝓸𝓪𝓻𝓭",
    description:"⭐ Messages that receive enough ⭐ reactions will automatically be featured here."
  }
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

function owner(member){
  return member.guild.ownerId===member.id;
}

function staff(member){
  return owner(member)||
    member.roles.cache.some(r=>["🔨 Staff","🛡️ Moderator"].includes(r.name));
}

function moderator(member){
  return owner(member)||
    member.roles.cache.some(r=>["🔨 Staff","🛡️ Moderator"].includes(r.name));
}

async function getChannel(guild,name){
  return guild.channels.cache.find(
    c=>c.name===name&&c.type===ChannelType.GuildText
  );
}

async function getRole(guild,name){
  return guild.roles.cache.find(r=>r.name===name);
}

async function setupRoles(guild){
  const result={};

  for(const [name,color] of ROLE_DATA){
    let role=await getRole(guild,name);

    if(!role){
      role=await guild.roles.create({
        name,
        color,
        reason:"Server setup"
      });
    }

    result[name]=role;
  }

  return result;
}

async function lock(channel){
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

async function unlock(channel){
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
  let category=guild.channels.cache.find(
    c=>c.type===ChannelType.GuildCategory&&c.name===name
  );

  if(!category){
    category=await guild.channels.create({
      name,
      type:ChannelType.GuildCategory
    });
  }

  return category;
}

async function createChannel(guild,category,name,isLocked){
  let channel=guild.channels.cache.find(
    c=>c.type===ChannelType.GuildText&&
      c.name===name&&
      c.parentId===category.id
  );

  if(!channel){
    channel=await guild.channels.create({
      name,
      type:ChannelType.GuildText,
      parent:category.id
    });
  }

  if(isLocked) await lock(channel);
  else await unlock(channel);

  return channel;
}

async function sendPanel(channel,data){
  const messages=await channel.messages.fetch({limit:20}).catch(()=>null);

  if(messages&&messages.some(m=>m.author.id===client.user.id)) return;

  await channel.send({
    embeds:[
      new EmbedBuilder()
        .setTitle(data.title)
        .setDescription(data.description)
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
    .setTitle("୨୧ 𝓢𝓮𝓻𝓿𝓮𝓻 𝓑𝓸𝓸𝓼𝓽𝓼")
    .setDescription(
`╭──────────────୨୧
**♡ Boosts:** ${boosts}
**♡ Server Level:** ${tier}
**♡ Boosters:** ${boosters}
╰──────────────୨୧

Thank you to everyone supporting the server. ♡`
    )
    .setTimestamp();

  if(old) await old.edit({embeds:[embed]}).catch(()=>{});
  else await channel.send({embeds:[embed]}).catch(()=>{});
}

async function updateLevelRoles(member){
  const p=profile(member.id);
  const rewards=[
    [5,"🌱 Level 5"],
    [10,"✨ Level 10"],
    [20,"💫 Level 20"],
    [30,"💎 Level 30"]
  ];

  for(const [level,name] of rewards){
    const role=await getRole(member.guild,name);
    if(!role) continue;

    if(p.level>=level&&!member.roles.cache.has(role.id))
      await member.roles.add(role).catch(()=>{});
  }
}

async function resetServer(guild){
  const oldChannels=[...guild.channels.cache.values()];

  for(const channel of oldChannels){
    await channel.delete("Server reset").catch(()=>{});
  }

  const roles=await setupRoles(guild);

  for(const categoryName of Object.keys(CHANNELS)){
    const category=await createCategory(guild,categoryName);

    for(const [name,isLocked] of CHANNELS[categoryName]){
      const channel=await createChannel(
        guild,
        category,
        name,
        isLocked
      );

      if(text[name])
        await sendPanel(channel,text[name]);
    }
  }

  await updateBoostPanel(guild);

  const roleChannel=await getChannel(guild,"୨୧・roles");

  if(roleChannel){
    const row=new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("friend_role")
        .setLabel("🤝 Friend")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("vip_role")
        .setLabel("💎 VIP")
        .setStyle(ButtonStyle.Primary)
    );

    await roleChannel.send({
      content:"♡ **Choose your community roles**",
      components:[row]
    }).catch(()=>{});
  }

  const support=await getChannel(guild,"୨୧・support");

  if(support){
    const row=new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("support")
        .setLabel("🎫 Create Support Ticket")
        .setStyle(ButtonStyle.Primary)
    );

    await support.send({
      embeds:[
        new EmbedBuilder()
          .setTitle("୨୧ 𝓢𝓾𝓹𝓹𝓸𝓻𝓽")
          .setDescription("Need help? Press the button below to create a private support channel.")
      ],
      components:[row]
    }).catch(()=>{});
  }

  settings[guild.id]={
    setup:true,
    levelChannel:(await getChannel(guild,"୨୧・levels"))?.id,
    boostChannel:(await getChannel(guild,"୨୧・boosts"))?.id,
    starboardChannel:(await getChannel(guild,"୨୧・starboard"))?.id
  };

  save("settings.json",settings);
}

const commands=[
  new SlashCommandBuilder()
    .setName("resetserver")
    .setDescription("Delete the current layout and build the new server"),

  new SlashCommandBuilder()
    .setName("rank")
    .setDescription("View your level"),

  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("View the server XP leaderboard"),

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
       .setDescription("Your bio")
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
    .setName("icebreaker")
    .setDescription("Get an icebreaker"),

  new SlashCommandBuilder()
    .setName("question")
    .setDescription("Get a random question"),

  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check bot latency"),

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member")
    .addUserOption(o=>
      o.setName("user")
       .setDescription("User")
       .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member")
    .addUserOption(o=>
      o.setName("user")
       .setDescription("User")
       .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout a member")
    .addUserOption(o=>
      o.setName("user")
       .setDescription("User")
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
       .setDescription("User")
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
       .setDescription("User")
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
].map(x=>x.toJSON());

client.once("clientReady",async()=>{
  console.log(`♡ ${client.user.tag} is online`);
  await client.application.commands.set(commands);
  console.log("♡ Commands registered");
});

client.on("interactionCreate",async interaction=>{
  try{

    if(interaction.isButton()){

      if(interaction.customId==="friend_role"){
        const role=await getRole(interaction.guild,"🤝 Friend");

        if(!role)
          return interaction.reply({
            content:"❌ Friend role doesn't exist.",
            ephemeral:true
          });

        if(interaction.member.roles.cache.has(role.id)){
          await interaction.member.roles.remove(role);
          return interaction.reply({
            content:"♡ Friend role removed.",
            ephemeral:true
          });
        }

        await interaction.member.roles.add(role);

        return interaction.reply({
          content:"♡ You now have the Friend role!",
          ephemeral:true
        });
      }

      if(interaction.customId==="vip_role"){
        const role=await getRole(interaction.guild,"💎 VIP");

        if(!role)
          return interaction.reply({
            content:"❌ VIP role doesn't exist.",
            ephemeral:true
          });

        if(!interaction.member.roles.cache.has(role.id))
          await interaction.member.roles.add(role).catch(()=>{});

        return interaction.reply({
          content:"💎 VIP role added.",
          ephemeral:true
        });
      }

      if(interaction.customId==="support"){
        const guild=interaction.guild;

        const existing=guild.channels.cache.find(
          c=>c.name===`ticket-${interaction.user.id}`
        );

        if(existing)
          return interaction.reply({
            content:`You already have a ticket: ${existing}`,
            ephemeral:true
          });

        const channel=await guild.channels.create({
          name:`ticket-${interaction.user.id}`,
          type:ChannelType.GuildText,
          permissionOverwrites:[
            {
              id:guild.roles.everyone.id,
              deny:[PermissionsBitField.Flags.ViewChannel]
            },
            {
              id:interaction.user.id,
              allow:[
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages
              ]
            },
            {
              id:client.user.id,
              allow:[
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ManageChannels
              ]
            }
          ]
        });

        await channel.send(
`🎫 **Support Ticket**

♡ Tell us what you need help with.
♡ Please be patient while staff responds.

Only you and staff can see this ticket.`
        );

        return interaction.reply({
          content:`♡ Ticket created: ${channel}`,
          ephemeral:true
        });
      }
    }

    if(!interaction.isChatInputCommand()) return;

    if(interaction.commandName==="resetserver"){

      if(!owner(interaction.member))
        return interaction.reply({
          content:"❌ Only the server owner can reset the server.",
          ephemeral:true
        });

      await interaction.reply({
        content:"୨୧ **𝓡𝓮𝓫𝓾𝓲𝓵𝓭𝓲𝓷𝓰...**\n♡ Deleting the old layout and creating everything.",
        ephemeral:true
      });

      await resetServer(interaction.guild);

      await interaction.editReply({
        content:"♡ **Done!** The new server layout is ready."
      }).catch(()=>{});

      setTimeout(()=>{
        interaction.deleteReply().catch(()=>{});
      },1500);

      return;
    }

    await interaction.deferReply({ephemeral:true});

    const guild=interaction.guild;
    const member=interaction.member;

    if(interaction.commandName==="rank"){
      const p=profile(member.id);
      const required=needed(p.level);
      const percent=Math.min(100,Math.floor((p.xp/required)*100));
      const bars=Math.floor(percent/10);
      const progress="▰".repeat(bars)+"▱".repeat(10-bars);

      return interaction.editReply(
`୨୧ **𝓡𝓪𝓷𝓴**

♡ **${member.user.username}**
✦ Level: **${p.level}**
✦ XP: **${p.xp}/${required}**
${progress} **${percent}%**`
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

      if(!top.length)
        return interaction.editReply("♡ Nobody has earned XP yet.");

      let out="୨୧ **𝓛𝓮𝓪𝓭𝓮𝓻𝓫𝓸𝓪𝓻𝓭**\n\n";

      top.forEach((x,i)=>{
        out+=`**${i+1}.** <@${x[0]}> — Level **${x[1].level}** (${x[1].xp} XP)\n`;
      });

      return interaction.editReply(out);
    }

    if(interaction.commandName==="profile"){
      const user=interaction.options.getUser("user")||interaction.user;
      const p=profile(user.id);

      return interaction.editReply({
        embeds:[
          new EmbedBuilder()
            .setTitle(`୨୧ 𝓟𝓻𝓸𝓯𝓲𝓵𝓮`)
            .setThumbnail(user.displayAvatarURL())
            .setDescription(
`**♡ ${user.username}**

✦ Level: **${p.level}**
✦ XP: **${p.xp}/${needed(p.level)}**
✦ Bio: ${p.bio||"Not set"}
✦ Friends: **${p.friends.length}**`
            )
        ]
      });
    }

    if(interaction.commandName==="setbio"){
      const p=profile(member.id);
      p.bio=interaction.options.getString("text");
      save("profiles.json",profiles);
      return interaction.editReply("♡ Your bio has been updated.");
    }

    if(interaction.commandName==="friend"){
      const user=interaction.options.getUser("user");

      if(user.id===member.id)
        return interaction.editReply("❌ You can't friend yourself.");

      const p=profile(member.id);

      if(!p.friends.includes(user.id))
        p.friends.push(user.id);

      save("profiles.json",profiles);

      return interaction.editReply(`🤝 ${user} was added to your friends.`);
    }

    if(interaction.commandName==="friends"){
      const p=profile(member.id);

      return interaction.editReply(
        p.friends.length
        ? `🤝 **Friends:** ${p.friends.map(x=>`<@${x}>`).join(", ")}`
        : "♡ You don't have any friends added yet."
      );
    }

    if(interaction.commandName==="icebreaker"){
      const questions=[
        "What's your favorite game?",
        "What's your favorite song?",
        "What's your dream vacation?",
        "What's a hobby you want to try?",
        "What's your favorite food?",
        "What's one game you could play forever?"
      ];

      return interaction.editReply(
        `୨୧ **𝓘𝓬𝓮𝓫𝓻𝓮𝓪𝓴𝓮𝓻**\n\n♡ ${questions[Math.floor(Math.random()*questions.length)]}`
      );
    }

    if(interaction.commandName==="question"){
      const questions=[
        "What's your current favorite game?",
        "What's your favorite movie?",
        "What would your perfect day look like?",
        "What's something you're really good at?",
        "What's something you want to learn?"
      ];

      return interaction.editReply(
        `♡ **Question:** ${questions[Math.floor(Math.random()*questions.length)]}`
      );
    }

    if(interaction.commandName==="ping")
      return interaction.editReply(`🏓 Pong! **${client.ws.ping}ms**`);

    if(["ban","kick","timeout","warn","warnings","clear"].includes(interaction.commandName)&&!moderator(member))
      return interaction.editReply("❌ You don't have permission to use this command.");

    if(interaction.commandName==="ban"){
      if(!owner(member))
        return interaction.editReply("❌ Only the owner can ban members.");

      const target=await guild.members.fetch(
        interaction.options.getUser("user").id
      ).catch(()=>null);

      if(!target||!target.bannable)
        return interaction.editReply("❌ I can't ban that member.");

      await target.ban({reason:"Moderator ban"});
      return interaction.editReply(`🔨 Banned **${target.user.tag}**.`);
    }

    if(interaction.commandName==="kick"){
      const target=interaction.options.getMember("user");

      if(!target?.kickable)
        return interaction.editReply("❌ I can't kick that member.");

      await target.kick("Moderator kick");
      return interaction.editReply(`👢 Kicked **${target.user.tag}**.`);
    }

    if(interaction.commandName==="timeout"){
      const target=interaction.options.getMember("user");
      const minutes=interaction.options.getInteger("minutes");

      if(!target?.moderatable)
        return interaction.editReply("❌ I can't timeout that member.");

      await target.timeout(minutes*60000,"Moderator timeout");

      return interaction.editReply(
        `⏱️ Timed out **${target.user.tag}** for **${minutes} minutes**.`
      );
    }

    if(interaction.commandName==="warn"){
      const user=interaction.options.getUser("user");
      const reason=interaction.options.getString("reason");

      if(!warnings[user.id]) warnings[user.id]=[];

      warnings[user.id].push({
        reason,
        moderator:member.id,
        date:Date.now()
      });

      save("warnings.json",warnings);

      return interaction.editReply(
        `⚠️ **${user.tag}** was warned.\nReason: ${reason}`
      );
    }

    if(interaction.commandName==="warnings"){
      const user=interaction.options.getUser("user")||interaction.user;
      const list=warnings[user.id]||[];

      if(!list.length)
        return interaction.editReply(`♡ ${user.username} has no warnings.`);

      return interaction.editReply(
`⚠️ **${user.username}'s Warnings**

${list.map((w,i)=>`**${i+1}.** ${w.reason}`).join("\n")}`
      );
    }

    if(interaction.commandName==="clear"){
      const amount=interaction.options.getInteger("amount");
      await interaction.channel.bulkDelete(amount,true);

      return interaction.editReply(`🧹 Deleted **${amount}** messages.`);
    }

  }catch(error){
    console.error(error);

    if(interaction.deferred||interaction.replied)
      await interaction.editReply("❌ Something went wrong. Check the bot logs.").catch(()=>{});
    else
      await interaction.reply({
        content:"❌ Something went wrong.",
        ephemeral:true
      }).catch(()=>{});
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
      ? message.guild.channels.cache.get(settings[message.guild.id].levelChannel)
      : await getChannel(message.guild,"୨୧・levels");

    if(channel){
      await channel.send(
`╭──────────────୨୧
**✦ 𝓛𝓔𝓥𝓔𝓛 𝓤𝓟 ✦**

♡ ${message.author} reached **Level ${p.level}**!

Keep chatting to reach the next level. ♡
╰──────────────୨୧`
      ).catch(()=>{});
    }
  }
});

client.on("guildMemberUpdate",async(oldMember,newMember)=>{
  const oldBoost=!!oldMember.premiumSince;
  const newBoost=!!newMember.premiumSince;

  if(oldBoost===newBoost) return;

  const booster=await getRole(newMember.guild,"🌸 Booster");

  if(newBoost){
    if(booster&&!newMember.roles.cache.has(booster.id))
      await newMember.roles.add(booster).catch(()=>{});

    await updateBoostPanel(newMember.guild);

    const channel=await getChannel(newMember.guild,"୨୧・boosts");

    if(channel){
      await channel.send(
`╭──────────────୨୧
**♡ 𝓝𝓮𝔀 𝓑𝓸𝓸𝓼𝓽 ♡**

Thank you ${newMember} for boosting the server! 💗

The boost counter has been updated above.
╰──────────────୨୧`
      ).catch(()=>{});
    }
  }else{
    if(booster&&newMember.roles.cache.has(booster.id))
      await newMember.roles.remove(booster).catch(()=>{});

    await updateBoostPanel(newMember.guild);
  }
});

client.on("guildMemberAdd",async member=>{
  const channel=await getChannel(member.guild,"୨୧・introductions");

  if(channel){
    await channel.send(
`♡ **Welcome ${member}!**

We're happy to have you here. ✦

Introduce yourself and make some friends! ୨୧`
    ).catch(()=>{});
  }
});

client.login(TOKEN);