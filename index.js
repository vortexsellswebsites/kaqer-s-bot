const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder,
  SlashCommandBuilder,
  ChannelType
}=require("discord.js");
const fs=require("fs");
const path=require("path");

const client=new Client({
  intents:[
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const TOKEN=process.env.TOKEN;
if(!TOKEN)throw new Error("TOKEN is missing.");

const DATA=path.join(__dirname,"data");
fs.mkdirSync(DATA,{recursive:true});

const files={
  profiles:path.join(DATA,"profiles.json"),
  warnings:path.join(DATA,"warnings.json"),
  settings:path.join(DATA,"settings.json")
};

for(const f of Object.values(files)){
  if(!fs.existsSync(f))fs.writeFileSync(f,"{}");
}

const read=f=>{
  try{return JSON.parse(fs.readFileSync(f,"utf8"))}
  catch{return{}}
};

const write=(f,d)=>fs.writeFileSync(f,JSON.stringify(d,null,2));

const profiles=read(files.profiles);
const warnings=read(files.warnings);
const settings=read(files.settings);

const isOwner=i=>
  i.member?.permissions?.has(PermissionsBitField.Flags.Administrator)||
  i.member?.roles?.cache?.some(r=>r.name==="👑 Owner");

const isStaff=i=>
  isOwner(i)||
  i.member?.roles?.cache?.some(r=>
    ["🛡️ Moderator","🔨 Staff"].includes(r.name)
  );

const getProfile=id=>{
  if(!profiles[id]){
    profiles[id]={
      bio:"No bio set.",
      interests:[],
      pronouns:"",
      friends:[],
      created:Date.now()
    };
    write(files.profiles,profiles);
  }
  return profiles[id];
};

/* =========================
   ROLES
========================= */

const roleList=[
  {name:"Member",color:"#ffffff"},
  {name:"🤝 Friend",color:"#57F287"},
  {name:"🌸 Booster",color:"#F47FFF"},
  {name:"💎 VIP",color:"#00BFFF"},
  {name:"🔨 Staff",color:"#9B59B6"},
  {name:"🛡️ Moderator",color:"#5865F2"},
  {name:"👑 Owner",color:"#FF4FA3"}
];

async function createRoles(guild){
  const created=[];

  for(const r of roleList){
    let role=guild.roles.cache.find(x=>x.name===r.name);

    if(!role){
      role=await guild.roles.create({
        name:r.name,
        color:r.color,
        hoist:false,
        mentionable:false,
        reason:"Community server setup"
      });
      created.push(r.name);
    }
  }

  return created;
}

/* =========================
   CHANNEL LAYOUT
========================= */

const layout=[
  {
    name:"︶୨୧ : ♡♡♡・♬",
    channels:[
      "☑・rules, ୨୧",
      "☆・ωarns",
      "📣・mail °(˘)",
      "silly・(黒色)",
      "❀³・desk"
    ]
  },
  {
    name:"︶୨୧ : ♡♡1・♬",
    channels:[
      "boost・🦨",
      "ʚ・perks"
    ]
  },
  {
    name:"︶୨୧ : ♡♡2・♬",
    channels:[
      "bump・✿",
      "roles・❀",
      "level・🎧"
    ]
  },
  {
    name:"︶୨୧ : ♡♡4・♬",
    channels:[
      "🎬・staff",
      "▦・intro",
      "❔・color"
    ]
  },
  {
    name:"︶୨୧ : ♡♡5・♬",
    channels:[
      "📷・main",
      "chat²・≡",
      "☆・bots"
    ]
  },
  {
    name:"︶୨୧ : ♡♡6・♬",
    channels:[
      "🕯️・media",
      "art・✧",
      "✚・selfie"
    ]
  },
  {
    name:"︶୨୧ : ♡♡7・♬",
    channels:[
      "🦢・confess",
      "starboard・▦",
      "qotd・♡",
      "aotd・👔"
    ]
  },
  {
    name:"︶୨୧ : ♡♡9・♬",
    channels:[
      "fem・intro",
      "male・intro",
      "other・intro"
    ]
  },
  {
    name:"︶୨୧ : ♡10・♬",
    channels:[
      "pair・ticket",
      "template・♡"
    ]
  },
  {
    name:"︶୨୧ : ♡11・♬",
    channels:[
      "pair・annc",
      "pair・rules 🎧"
    ]
  },
  {
    name:"︶୨୧ : ♡12・♬",
    channels:[
      "pair・points",
      "pair・flex・❀"
    ]
  }
];

async function createLayout(guild){
  let made=0;

  for(const group of layout){
    let category=guild.channels.cache.find(
      c=>c.type===ChannelType.GuildCategory&&c.name===group.name
    );

    if(!category){
      category=await guild.channels.create({
        name:group.name,
        type:ChannelType.GuildCategory
      });
      made++;
    }

    for(const name of group.channels){
      const exists=guild.channels.cache.find(
        c=>c.type===ChannelType.GuildText&&
        c.name===name&&
        c.parentId===category.id
      );

      if(exists)continue;

      await guild.channels.create({
        name,
        type:ChannelType.GuildText,
        parent:category.id
      });

      made++;
    }
  }

  return made;
}

/* =========================
   COMMANDS
========================= */

const commands=[
  ["setup","Create the server roles and channel layout"],

  ["profile","View a member profile",b=>
    b.addUserOption(o=>o.setName("user").setDescription("Member"))],

  ["setbio","Set your bio",b=>
    b.addStringOption(o=>o.setName("bio").setDescription("Your bio").setMaxLength(300).setRequired(true))],

  ["interests","Set your interests",b=>
    b.addStringOption(o=>o.setName("interests").setDescription("gaming, music, sports").setMaxLength(200).setRequired(true))],

  ["setpronouns","Set your pronouns",b=>
    b.addStringOption(o=>o.setName("pronouns").setDescription("Your pronouns").setMaxLength(50).setRequired(true))],

  ["match","Find people with similar interests"],

  ["friend","Add someone as a friend",b=>
    b.addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true))],

  ["unfriend","Remove someone from your friends",b=>
    b.addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true))],

  ["friends","View your friends"],

  ["icebreaker","Get an icebreaker"],

  ["question","Get a conversation question"],

  ["introduce","Introduce yourself"],

  ["ping","Check bot latency"],

  ["userinfo","View user information",b=>
    b.addUserOption(o=>o.setName("user").setDescription("User"))],

  ["serverinfo","View server information"],

  ["avatar","View a user's avatar",b=>
    b.addUserOption(o=>o.setName("user").setDescription("User"))],

  ["botinfo","View bot information"],

  ["ban","Ban a member",b=>
    b.addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true))
     .addStringOption(o=>o.setName("reason").setDescription("Reason"))],

  ["unban","Unban a user",b=>
    b.addStringOption(o=>o.setName("user").setDescription("User ID").setRequired(true))],

  ["kick","Kick a member",b=>
    b.addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true))
     .addStringOption(o=>o.setName("reason").setDescription("Reason"))],

  ["timeout","Timeout a member",b=>
    b.addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true))
     .addIntegerOption(o=>o.setName("minutes").setDescription("1-40320").setMinValue(1).setMaxValue(40320).setRequired(true))],

  ["untimeout","Remove a timeout",b=>
    b.addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true))],

  ["warn","Warn a member",b=>
    b.addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true))
     .addStringOption(o=>o.setName("reason").setDescription("Reason").setRequired(true))],

  ["warnings","View member warnings",b=>
    b.addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true))],

  ["clear","Delete messages",b=>
    b.addIntegerOption(o=>o.setName("amount").setDescription("1-100").setMinValue(1).setMaxValue(100).setRequired(true))],

  ["slowmode","Set channel slowmode",b=>
    b.addIntegerOption(o=>o.setName("seconds").setDescription("0-21600").setMinValue(0).setMaxValue(21600).setRequired(true))],

  ["lock","Lock this channel"],

  ["unlock","Unlock this channel"],

  ["announce","Send an announcement",b=>
    b.addStringOption(o=>o.setName("message").setDescription("Announcement").setRequired(true))],

  ["addrole","Give a role",b=>
    b.addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true))
     .addRoleOption(o=>o.setName("role").setDescription("Role").setRequired(true))],

  ["removerole","Remove a role",b=>
    b.addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true))
     .addRoleOption(o=>o.setName("role").setDescription("Role").setRequired(true))],

  ["lockdown","Lock all text channels"],

  ["unlockdown","Unlock all text channels"],

  ["setwelcome","Set welcome channel",b=>
    b.addChannelOption(o=>o.setName("channel").setDescription("Channel").setRequired(true))],

  ["setgoodbye","Set goodbye channel",b=>
    b.addChannelOption(o=>o.setName("channel").setDescription("Channel").setRequired(true))],

  ["setlogs","Set logs channel",b=>
    b.addChannelOption(o=>o.setName("channel").setDescription("Channel").setRequired(true))]
].map(x=>{
  let b=new SlashCommandBuilder()
    .setName(x[0])
    .setDescription(x[1]);

  return(x[2]?x[2](b):b).toJSON();
});

/* =========================
   FUN TEXT
========================= */

const icebreakers=[
  "🎮 What's your favorite game?",
  "🎵 What's your favorite artist?",
  "🍕 What's your favorite food?",
  "🌎 Where would you travel if you could go anywhere?",
  "🎬 What's your favorite movie?",
  "🐶 Cats or dogs?",
  "🌙 Night owl or morning person?",
  "⚽ What sport do you like?",
  "🎨 What's your favorite hobby?",
  "😂 What always makes you laugh?"
];

const questions=[
  "What's something you've always wanted to learn?",
  "What's your dream vacation?",
  "What's your favorite childhood memory?",
  "What song have you been playing lately?",
  "What's your biggest hobby?",
  "What's a random fact about you?",
  "What's your favorite season?",
  "What skill would you instantly master?",
  "What's your favorite thing to do with friends?",
  "What's somewhere you really want to visit?"
];

/* =========================
   READY
========================= */

client.once("clientReady",async()=>{
  console.log(`✅ Logged in as ${client.user.tag}`);

  try{
    await client.application.commands.set(commands);
    console.log(`✅ Registered ${commands.length} commands`);
  }catch(e){
    console.error("❌ Command registration error:",e);
  }
});

/* =========================
   WELCOME
========================= */

client.on("guildMemberAdd",async member=>{
  const data=settings[member.guild.id];
  const channel=data?.welcome
    ?member.guild.channels.cache.get(data.welcome)
    :member.guild.systemChannel;

  if(channel){
    channel.send(
      `👋 Welcome ${member} to **${member.guild.name}**!`
    ).catch(()=>{});
  }
});

client.on("guildMemberRemove",async member=>{
  const data=settings[member.guild.id];
  if(!data?.goodbye)return;

  const channel=member.guild.channels.cache.get(data.goodbye);

  if(channel){
    channel.send(
      `👋 **${member.user?.tag||"A member"}** has left.`
    ).catch(()=>{});
  }
});

/* =========================
   INTERACTIONS
========================= */

client.on("interactionCreate",async i=>{
  try{
    if(!i.isChatInputCommand())return;

    await i.deferReply({ephemeral:true});

    const c=i.commandName;

    const ownerOnly=[
      "setup",
      "ban",
      "unban",
      "addrole",
      "removerole",
      "lockdown",
      "unlockdown",
      "setwelcome",
      "setgoodbye",
      "setlogs"
    ];

    const staffOnly=[
      "kick",
      "timeout",
      "untimeout",
      "warn",
      "warnings",
      "clear",
      "slowmode",
      "lock",
      "unlock",
      "announce"
    ];

    if(ownerOnly.includes(c)&&!isOwner(i))
      return i.editReply("❌ **Owner only.**");

    if(staffOnly.includes(c)&&!isStaff(i))
      return i.editReply("❌ **Staff only.**");

    /* SETUP */

    if(c==="setup"){
      await i.editReply("⏳ Creating the server...");

      const roles=await createRoles(i.guild);
      const channels=await createLayout(i.guild);

      return i.editReply(
        `✅ **Setup complete!**\n\n`+
        `🎭 Roles created: **${roles.length}**\n`+
        `📁 Channels/categories created: **${channels}**`
      );
    }

    /* PROFILE */

    if(c==="profile"){
      const u=i.options.getUser("user")||i.user;
      const p=getProfile(u.id);

      return i.editReply({
        embeds:[
          new EmbedBuilder()
            .setTitle(`🤝 ${u.username}'s Profile`)
            .setThumbnail(u.displayAvatarURL())
            .addFields(
              {name:"💬 Bio",value:p.bio||"No bio set."},
              {name:"🎯 Interests",value:p.interests?.length?p.interests.join(", "):"None"},
              {name:"🗣️ Pronouns",value:p.pronouns||"Not set"},
              {name:"👥 Friends",value:String(p.friends?.length||0)}
            )
        ]
      });
    }

    if(c==="setbio"){
      const p=getProfile(i.user.id);
      p.bio=i.options.getString("bio");
      write(files.profiles,profiles);
      return i.editReply("✅ Bio updated.");
    }

    if(c==="interests"){
      const p=getProfile(i.user.id);

      p.interests=i.options
        .getString("interests")
        .split(",")
        .map(x=>x.trim().toLowerCase())
        .filter(Boolean)
        .slice(0,10);

      write(files.profiles,profiles);

      return i.editReply("✅ Interests updated.");
    }

    if(c==="setpronouns"){
      const p=getProfile(i.user.id);
      p.pronouns=i.options.getString("pronouns");

      write(files.profiles,profiles);

      return i.editReply("✅ Pronouns updated.");
    }

    /* FRIENDS */

    if(c==="friend"){
      const u=i.options.getUser("user");

      if(u.bot)return i.editReply("❌ You can't add a bot.");
      if(u.id===i.user.id)return i.editReply("❌ You can't add yourself.");

      const p=getProfile(i.user.id);
      const other=getProfile(u.id);

      if(!p.friends.includes(u.id))p.friends.push(u.id);
      if(!other.friends.includes(i.user.id))other.friends.push(i.user.id);

      write(files.profiles,profiles);

      return i.editReply(`🤝 You and **${u.username}** are now friends!`);
    }

    if(c==="unfriend"){
      const u=i.options.getUser("user");

      const p=getProfile(i.user.id);
      const other=getProfile(u.id);

      p.friends=p.friends.filter(x=>x!==u.id);
      other.friends=other.friends.filter(x=>x!==i.user.id);

      write(files.profiles,profiles);

      return i.editReply(`💔 Removed **${u.username}**.`);
    }

    if(c==="friends"){
      const p=getProfile(i.user.id);

      if(!p.friends.length)
        return i.editReply("👥 You don't have any friends added.");

      return i.editReply(
        p.friends.map((id,n)=>`**${n+1}.** <@${id}>`).join("\n")
      );
    }

    if(c==="match"){
      const me=getProfile(i.user.id);

      if(!me.interests.length)
        return i.editReply("❌ Set your interests first with `/interests`.");

      const members=await i.guild.members.fetch();
      const matches=[];

      for(const m of members.values()){
        if(m.user.bot||m.id===i.user.id)continue;

        const p=profiles[m.id];

        if(!p?.interests?.length)continue;

        const common=me.interests.filter(x=>p.interests.includes(x));

        if(common.length)matches.push({m,common});
      }

      matches.sort((a,b)=>b.common.length-a.common.length);

      if(!matches.length)
        return i.editReply("😔 No matching interests found yet.");

      return i.editReply(
        `💞 **People you might get along with:**\n\n`+
        matches.slice(0,5)
        .map(x=>`🤝 **${x.m.user.username}** — ${x.common.join(", ")}`)
        .join("\n")
      );
    }

    /* COMMUNITY */

    if(c==="icebreaker")
      return i.editReply(
        icebreakers[Math.floor(Math.random()*icebreakers.length)]
      );

    if(c==="question")
      return i.editReply(
        `💬 **Question:**\n${questions[Math.floor(Math.random()*questions.length)]}`
      );

    if(c==="introduce"){
      const p=getProfile(i.user.id);

      return i.editReply(
        `👋 **Everyone, meet ${i.user.username}!**\n\n`+
        `💬 ${p.bio}\n`+
        `🎯 ${p.interests.length?p.interests.join(", "):"No interests set"}\n`+
        `🗣️ ${p.pronouns||"Pronouns not set"}`
      );
    }

    /* INFO */

    if(c==="ping")
      return i.editReply(`🏓 **${client.ws.ping}ms**`);

    if(c==="userinfo"){
      const u=i.options.getUser("user")||i.user;

      return i.editReply({
        embeds:[
          new EmbedBuilder()
            .setTitle(u.tag)
            .setThumbnail(u.displayAvatarURL())
            .addFields(
              {name:"ID",value:u.id},
              {name:"Created",value:`<t:${Math.floor(u.createdTimestamp/1000)}:R>`}
            )
        ]
      });
    }

    if(c==="serverinfo"){
      return i.editReply({
        embeds:[
          new EmbedBuilder()
            .setTitle(`🏠 ${i.guild.name}`)
            .addFields(
              {name:"Members",value:String(i.guild.memberCount)},
              {name:"Channels",value:String(i.guild.channels.cache.size)},
              {name:"Roles",value:String(i.guild.roles.cache.size)}
            )
        ]
      });
    }

    if(c==="avatar"){
      const u=i.options.getUser("user")||i.user;
      return i.editReply(u.displayAvatarURL({size:1024}));
    }

    if(c==="botinfo"){
      return i.editReply(
        `🤖 **${client.user.tag}**\n`+
        `Servers: **${client.guilds.cache.size}**\n`+
        `Commands: **${commands.length}**`
      );
    }

    /* MODERATION */

    if(c==="ban"){
      const u=i.options.getUser("user");
      const m=await i.guild.members.fetch(u.id).catch(()=>null);

      if(!m)return i.editReply("❌ Member not found.");
      if(m.id===i.user.id)return i.editReply("❌ You can't ban yourself.");
      if(!m.bannable)return i.editReply("❌ I can't ban that member.");

      await m.ban({
        reason:i.options.getString("reason")||"No reason"
      });

      return i.editReply(`🔨 Banned **${u.tag}**.`);
    }

    if(c==="unban"){
      await i.guild.members.unban(
        i.options.getString("user")
      );

      return i.editReply("✅ User unbanned.");
    }

    if(c==="kick"){
      const u=i.options.getUser("user");
      const m=await i.guild.members.fetch(u.id).catch(()=>null);

      if(!m)return i.editReply("❌ Member not found.");
      if(!m.kickable)return i.editReply("❌ I can't kick that member.");

      await m.kick(
        i.options.getString("reason")||"No reason"
      );

      return i.editReply(`👢 Kicked **${u.tag}**.`);
    }

    if(c==="timeout"){
      const u=i.options.getUser("user");
      const m=await i.guild.members.fetch(u.id).catch(()=>null);

      if(!m)return i.editReply("❌ Member not found.");
      if(!m.moderatable)return i.editReply("❌ I can't timeout that member.");

      const minutes=i.options.getInteger("minutes");

      await m.timeout(
        minutes*60000,
        `Timeout by ${i.user.tag}`
      );

      return i.editReply(
        `⏱️ Timed out **${u.tag}** for **${minutes} minutes**.`
      );
    }

    if(c==="untimeout"){
      const u=i.options.getUser("user");
      const m=await i.guild.members.fetch(u.id).catch(()=>null);

      if(!m)return i.editReply("❌ Member not found.");

      await m.timeout(null,"Timeout removed");

      return i.editReply(`✅ Timeout removed from **${u.tag}**.`);
    }

    if(c==="warn"){
      const u=i.options.getUser("user");
      const reason=i.options.getString("reason");

      if(!warnings[u.id])warnings[u.id]=[];

      warnings[u.id].push({
        reason,
        moderator:i.user.id,
        time:Date.now()
      });

      write(files.warnings,warnings);

      return i.editReply(
        `⚠️ **${u.tag}** was warned.\nReason: ${reason}`
      );
    }

    if(c==="warnings"){
      const u=i.options.getUser("user");
      const list=warnings[u.id]||[];

      if(!list.length)
        return i.editReply(`✅ **${u.tag}** has no warnings.`);

      return i.editReply(
        list.map((w,n)=>`**${n+1}.** ${w.reason}`).join("\n")
      );
    }

    if(c==="clear"){
      const amount=i.options.getInteger("amount");

      const deleted=await i.channel.bulkDelete(amount,true);

      return i.editReply(
        `🧹 Deleted **${deleted.size}** messages.`
      );
    }

    if(c==="slowmode"){
      await i.channel.setRateLimitPerUser(
        i.options.getInteger("seconds")
      );

      return i.editReply("🐢 Slowmode updated.");
    }

    if(c==="lock"){
      await i.channel.permissionOverwrites.edit(
        i.guild.roles.everyone,
        {SendMessages:false}
      );

      return i.editReply("🔒 Channel locked.");
    }

    if(c==="unlock"){
      await i.channel.permissionOverwrites.edit(
        i.guild.roles.everyone,
        {SendMessages:null}
      );

      return i.editReply("🔓 Channel unlocked.");
    }

    if(c==="announce"){
      await i.channel.send({
        embeds:[
          new EmbedBuilder()
            .setTitle("📢 Announcement")
            .setDescription(i.options.getString("message"))
            .setTimestamp()
        ]
      });

      return i.editReply("✅ Announcement sent.");
    }

    /* ROLES */

    if(c==="addrole"||c==="removerole"){
      const m=await i.guild.members.fetch(
        i.options.getUser("user").id
      );

      const r=i.options.getRole("role");

      if(r.managed)
        return i.editReply("❌ That role is managed.");

      if(r.position>=i.guild.members.me.roles.highest.position)
        return i.editReply("❌ That role is higher than my role.");

      if(c==="addrole")
        await m.roles.add(r);
      else
        await m.roles.remove(r);

      return i.editReply("✅ Role updated.");
    }

    /* LOCKDOWN */

    if(c==="lockdown"){
      let count=0;

      for(const ch of i.guild.channels.cache.values()){
        if(ch.type===ChannelType.GuildText){
          await ch.permissionOverwrites.edit(
            i.guild.roles.everyone,
            {SendMessages:false}
          ).catch(()=>{});

          count++;
        }
      }

      return i.editReply(`🚨 Locked **${count}** text channels.`);
    }

    if(c==="unlockdown"){
      let count=0;

      for(const ch of i.guild.channels.cache.values()){
        if(ch.type===ChannelType.GuildText){
          await ch.permissionOverwrites.edit(
            i.guild.roles.everyone,
            {SendMessages:null}
          ).catch(()=>{});

          count++;
        }
      }

      return i.editReply(`🔓 Unlocked **${count}** text channels.`);
    }

    /* SETTINGS */

    if(["setwelcome","setgoodbye","setlogs"].includes(c)){
      const channel=i.options.getChannel("channel");

      if(!settings[i.guild.id])
        settings[i.guild.id]={};

      const key={
        setwelcome:"welcome",
        setgoodbye:"goodbye",
        setlogs:"logs"
      }[c];

      settings[i.guild.id][key]=channel.id;

      write(files.settings,settings);

      return i.editReply(
        `✅ **${key}** channel set to ${channel}.`
      );
    }

    return i.editReply("❌ Unknown command.");

  }catch(e){
    console.error("❌ Interaction error:",e);

    if(i.deferred||i.replied){
      return i.editReply(
        "❌ Something went wrong. Check Railway logs."
      ).catch(()=>{});
    }

    return i.reply({
      content:"❌ Something went wrong.",
      ephemeral:true
    }).catch(()=>{});
  }
});

process.on("unhandledRejection",console.error);
process.on("uncaughtException",console.error);

client.login(TOKEN);