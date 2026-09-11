const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder,
  SlashCommandBuilder
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

const profileFile=path.join(DATA,"profiles.json");
const warningFile=path.join(DATA,"warnings.json");
const settingsFile=path.join(DATA,"settings.json");
const backupFile=path.join(DATA,"backup.json");

for(const f of [profileFile,warningFile,settingsFile,backupFile]){
  if(!fs.existsSync(f))fs.writeFileSync(f,"{}");
}

const read=f=>{
  try{return JSON.parse(fs.readFileSync(f,"utf8"))}
  catch{return{}}
};

const write=(f,d)=>fs.writeFileSync(f,JSON.stringify(d,null,2));

const owner=i=>
  i.member?.permissions?.has(PermissionsBitField.Flags.Administrator)||
  i.member?.roles?.cache?.some(r=>r.name==="👑 Owner");

const staff=i=>
  owner(i)||
  i.member?.roles?.cache?.some(r=>
    ["🛡️ Moderator","🔨 Staff"].includes(r.name)
  );

const profiles=read(profileFile);
const warnings=read(warningFile);
const settings=read(settingsFile);

const getProfile=(id)=>{
  if(!profiles[id]){
    profiles[id]={
      bio:"No bio set.",
      interests:[],
      pronouns:"",
      friends:[],
      created:Date.now()
    };
    write(profileFile,profiles);
  }
  return profiles[id];
};

const commands=[
  ["profile","View a member's friend profile",b=>b
    .addUserOption(o=>o.setName("user").setDescription("Member"))],

  ["setbio","Set your profile bio",b=>b
    .addStringOption(o=>o.setName("bio").setDescription("Your bio").setMaxLength(300).setRequired(true))],

  ["interests","Set your interests",b=>b
    .addStringOption(o=>o.setName("interests").setDescription("Example: gaming, music, sports").setMaxLength(200).setRequired(true))],

  ["setpronouns","Set your pronouns",b=>b
    .addStringOption(o=>o.setName("pronouns").setDescription("Your pronouns").setMaxLength(50).setRequired(true))],

  ["match","Find someone with similar interests"],

  ["friend","Add someone to your bot friend list",b=>b
    .addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true))],

  ["unfriend","Remove someone from your friend list",b=>b
    .addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true))],

  ["friends","View your friend list"],

  ["icebreaker","Get a random icebreaker"],

  ["question","Get a random conversation question"],

  ["introduce","Introduce yourself to the server"],

  ["ping","Check bot latency"],
  ["userinfo","View user information",b=>b
    .addUserOption(o=>o.setName("user").setDescription("User"))],
  ["serverinfo","View server information"],
  ["avatar","View a user's avatar",b=>b
    .addUserOption(o=>o.setName("user").setDescription("User"))],
  ["botinfo","View bot information"],

  ["ban","Ban a member",b=>b
    .addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true))
    .addStringOption(o=>o.setName("reason").setDescription("Reason"))],

  ["unban","Unban a user",b=>b
    .addStringOption(o=>o.setName("user").setDescription("User ID").setRequired(true))],

  ["kick","Kick a member",b=>b
    .addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true))
    .addStringOption(o=>o.setName("reason").setDescription("Reason"))],

  ["timeout","Timeout a member",b=>b
    .addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true))
    .addIntegerOption(o=>o.setName("minutes").setDescription("Minutes").setMinValue(1).setMaxValue(40320).setRequired(true))],

  ["untimeout","Remove a timeout",b=>b
    .addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true))],

  ["warn","Warn a member",b=>b
    .addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true))
    .addStringOption(o=>o.setName("reason").setDescription("Reason").setRequired(true))],

  ["warnings","View warnings",b=>b
    .addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true))],

  ["clear","Delete messages",b=>b
    .addIntegerOption(o=>o.setName("amount").setDescription("1-100").setMinValue(1).setMaxValue(100).setRequired(true))],

  ["slowmode","Set channel slowmode",b=>b
    .addIntegerOption(o=>o.setName("seconds").setDescription("0-21600").setMinValue(0).setMaxValue(21600).setRequired(true))],

  ["lock","Lock a channel"],
  ["unlock","Unlock a channel"],

  ["announce","Send an announcement",b=>b
    .addStringOption(o=>o.setName("message").setDescription("Announcement").setRequired(true))],

  ["addrole","Give a role",b=>b
    .addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true))
    .addRoleOption(o=>o.setName("role").setDescription("Role").setRequired(true))],

  ["removerole","Remove a role",b=>b
    .addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true))
    .addRoleOption(o=>o.setName("role").setDescription("Role").setRequired(true))],

  ["role","Add or remove a role",b=>b
    .addUserOption(o=>o.setName("user").setDescription("Member").setRequired(true))
    .addRoleOption(o=>o.setName("role").setDescription("Role").setRequired(true))
    .addStringOption(o=>o.setName("action").setDescription("Action").setRequired(true)
      .addChoices(
        {name:"Add",value:"add"},
        {name:"Remove",value:"remove"}
      ))],

  ["lockdown","Lock all text channels"],
  ["unlockdown","Unlock all text channels"],

  ["setwelcome","Set the welcome channel",b=>b
    .addChannelOption(o=>o.setName("channel").setDescription("Channel").setRequired(true))],

  ["setgoodbye","Set the goodbye channel",b=>b
    .addChannelOption(o=>o.setName("channel").setDescription("Channel").setRequired(true))],

  ["setlogs","Set the logs channel",b=>b
    .addChannelOption(o=>o.setName("channel").setDescription("Channel").setRequired(true))],

  ["channelinfo","View channel information",b=>b
    .addChannelOption(o=>o.setName("channel").setDescription("Channel"))],

  ["roleinfo","View role information",b=>b
    .addRoleOption(o=>o.setName("role").setDescription("Role").setRequired(true))],

  ["save-backup","Save a server backup"],
  ["backup","Restore a server backup"]
].map(x=>{
  let b=new SlashCommandBuilder()
    .setName(x[0])
    .setDescription(x[1]);
  return(x[2]?x[2](b):b).toJSON();
});

const icebreakers=[
  "🎮 What game could you play for hours?",
  "🎵 What's your favorite artist right now?",
  "🍕 What's your favorite food?",
  "🌎 If you could travel anywhere, where would you go?",
  "🎬 What's your favorite movie?",
  "🐶 Cats or dogs?",
  "🌙 Are you more of a night owl or morning person?",
  "⚽ What's a sport you like?",
  "🎨 What's a hobby you have?",
  "😂 What's something that always makes you laugh?"
];

const questions=[
  "What's one thing you want to learn?",
  "What's your dream vacation?",
  "What's your favorite childhood memory?",
  "What music have you been listening to lately?",
  "What's your biggest hobby?",
  "What's a random fact about you?",
  "What's your favorite season?",
  "If you could instantly master one skill, what would it be?",
  "What's your favorite thing to do with friends?",
  "What's one place you really want to visit?"
];

client.once("clientReady",async()=>{
  console.log(`✅ Logged in as ${client.user.tag}`);
  try{
    await client.application.commands.set(commands);
    console.log(`✅ Registered ${commands.length} commands`);
  }catch(e){
    console.error("❌ Command registration error:",e);
  }
});

client.on("guildMemberAdd",async member=>{
  const channelId=settings[member.guild.id]?.welcome;
  const channel=channelId
    ? member.guild.channels.cache.get(channelId)
    : member.guild.systemChannel;

  if(channel)
    channel.send(`👋 Welcome ${member} to **${member.guild.name}**! Meet some people and make some friends!`).catch(()=>{});
});

client.on("guildMemberRemove",async member=>{
  const channelId=settings[member.guild.id]?.goodbye;
  const channel=channelId
    ? member.guild.channels.cache.get(channelId)
    : null;

  if(channel)
    channel.send(`👋 **${member.user?.tag||"A member"}** has left the server.`).catch(()=>{});
});

client.on("interactionCreate",async i=>{
  try{
    if(!i.isChatInputCommand())return;

    await i.deferReply({ephemeral:true});

    const c=i.commandName;

    const ownerOnly=[
      "ban","unban","addrole","removerole","role",
      "lockdown","unlockdown","setwelcome",
      "setgoodbye","setlogs","save-backup","backup"
    ];

    const staffOnly=[
      "kick","timeout","untimeout","warn","warnings",
      "clear","slowmode","lock","unlock","announce",
      "channelinfo","roleinfo"
    ];

    if(ownerOnly.includes(c)&&!owner(i))
      return i.editReply("❌ Owner only.");

    if(staffOnly.includes(c)&&!staff(i))
      return i.editReply("❌ Moderator/Staff only.");

    if(c==="profile"){
      const u=i.options.getUser("user")||i.user;
      const p=getProfile(u.id);

      return i.editReply({
        embeds:[new EmbedBuilder()
          .setTitle(`🤝 ${u.username}'s Profile`)
          .setThumbnail(u.displayAvatarURL())
          .addFields(
            {name:"💬 Bio",value:p.bio||"No bio set."},
            {name:"🎯 Interests",value:p.interests?.length?p.interests.join(", "):"None set."},
            {name:"🗣️ Pronouns",value:p.pronouns||"Not set."},
            {name:"👥 Friends",value:String(p.friends?.length||0)}
          )]
      });
    }

    if(c==="setbio"){
      const p=getProfile(i.user.id);
      p.bio=i.options.getString("bio");
      write(profileFile,profiles);
      return i.editReply("✅ Your bio has been updated!");
    }

    if(c==="interests"){
      const p=getProfile(i.user.id);
      p.interests=i.options.getString("interests")
        .split(",")
        .map(x=>x.trim().toLowerCase())
        .filter(Boolean)
        .slice(0,10);

      write(profileFile,profiles);
      return i.editReply("✅ Your interests have been updated!");
    }

    if(c==="setpronouns"){
      const p=getProfile(i.user.id);
      p.pronouns=i.options.getString("pronouns");
      write(profileFile,profiles);
      return i.editReply("✅ Your pronouns have been updated!");
    }

    if(c==="friend"){
      const u=i.options.getUser("user");

      if(u.id===i.user.id)
        return i.editReply("❌ You can't add yourself.");

      const p=getProfile(i.user.id);
      const other=getProfile(u.id);

      if(!p.friends.includes(u.id))p.friends.push(u.id);
      if(!other.friends.includes(i.user.id))other.friends.push(i.user.id);

      write(profileFile,profiles);
      return i.editReply(`🤝 You and **${u.username}** are now friends!`);
    }

    if(c==="unfriend"){
      const u=i.options.getUser("user");
      const p=getProfile(i.user.id);
      const other=getProfile(u.id);

      p.friends=p.friends.filter(x=>x!==u.id);
      other.friends=other.friends.filter(x=>x!==i.user.id);

      write(profileFile,profiles);
      return i.editReply(`💔 Removed **${u.username}** from your friend list.`);
    }

    if(c==="friends"){
      const p=getProfile(i.user.id);

      if(!p.friends.length)
        return i.editReply("👥 You don't have any friends added yet.");

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

        if(common.length)
          matches.push({m,common});
      }

      matches.sort((a,b)=>b.common.length-a.common.length);

      if(!matches.length)
        return i.editReply("😔 I couldn't find anyone with matching interests yet.");

      const result=matches.slice(0,5)
        .map(x=>`🤝 **${x.m.user.username}** — ${x.common.join(", ")}`)
        .join("\n");

      return i.editReply(`💞 **People you might get along with:**\n\n${result}`);
    }

    if(c==="icebreaker"){
      return i.editReply(
        icebreakers[Math.floor(Math.random()*icebreakers.length)]
      );
    }

    if(c==="question"){
      return i.editReply(
        `💬 **Conversation starter:**\n${questions[Math.floor(Math.random()*questions.length)]}`
      );
    }

    if(c==="introduce"){
      const p=getProfile(i.user.id);

      return i.editReply(
        `👋 **Everyone, meet ${i.user.username}!**\n\n`+
        `💬 ${p.bio||"No bio yet."}\n`+
        `🎯 ${p.interests?.length?p.interests.join(", "):"No interests listed yet."}\n`+
        `🗣️ ${p.pronouns||"Pronouns not set."}`
      );
    }

    if(c==="ping")
      return i.editReply(`🏓 **${client.ws.ping}ms**`);

    if(c==="userinfo"){
      const u=i.options.getUser("user")||i.user;

      return i.editReply({
        embeds:[new EmbedBuilder()
          .setTitle(u.tag)
          .setThumbnail(u.displayAvatarURL())
          .addFields(
            {name:"ID",value:u.id},
            {name:"Created",value:`<t:${Math.floor(u.createdTimestamp/1000)}:R>`}
          )]
      });
    }

    if(c==="serverinfo"){
      return i.editReply({
        embeds:[new EmbedBuilder()
          .setTitle(`🏠 ${i.guild.name}`)
          .addFields(
            {name:"Members",value:String(i.guild.memberCount)},
            {name:"Channels",value:String(i.guild.channels.cache.size)},
            {name:"Roles",value:String(i.guild.roles.cache.size)}
          )]
      });
    }

    if(c==="avatar"){
      const u=i.options.getUser("user")||i.user;
      return i.editReply(u.displayAvatarURL({size:1024}));
    }

    if(c==="botinfo")
      return i.editReply(
        `🤖 **${client.user.tag}**\nServers: ${client.guilds.cache.size}\nCommands: ${commands.length}`
      );

    if(c==="ban"){
      const u=i.options.getUser("user");
      const m=await i.guild.members.fetch(u.id).catch(()=>null);

      if(!m)return i.editReply("❌ Member not found.");

      await m.ban({
        reason:i.options.getString("reason")||"No reason"
      });

      return i.editReply(`🔨 Banned **${u.tag}**.`);
    }

    if(c==="unban"){
      await i.guild.members.unban(i.options.getString("user"));
      return i.editReply("✅ User unbanned.");
    }

    if(c==="kick"){
      const u=i.options.getUser("user");
      const m=await i.guild.members.fetch(u.id).catch(()=>null);

      if(!m)return i.editReply("❌ Member not found.");

      await m.kick(
        i.options.getString("reason")||"No reason"
      );

      return i.editReply(`👢 Kicked **${u.tag}**.`);
    }

    if(c==="timeout"){
      const u=i.options.getUser("user");
      const m=await i.guild.members.fetch(u.id).catch(()=>null);

      if(!m)return i.editReply("❌ Member not found.");

      await m.timeout(
        i.options.getInteger("minutes")*60000,
        "Moderator timeout"
      );

      return i.editReply(`⏱️ Timed out **${u.tag}**.`);
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

      write(warningFile,warnings);

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
      const n=i.options.getInteger("amount");
      await i.channel.bulkDelete(n,true);
      return i.editReply(`🧹 Deleted **${n}** messages.`);
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
        embeds:[new EmbedBuilder()
          .setTitle("📢 Announcement")
          .setDescription(i.options.getString("message"))
          .setTimestamp()]
      });

      return i.editReply("✅ Announcement sent.");
    }

    if(c==="addrole"||c==="removerole"){
      const m=await i.guild.members.fetch(
        i.options.getUser("user").id
      );

      const r=i.options.getRole("role");

      if(c==="addrole")await m.roles.add(r);
      else await m.roles.remove(r);

      return i.editReply("✅ Done.");
    }

    if(c==="role"){
      const m=await i.guild.members.fetch(
        i.options.getUser("user").id
      );

      const r=i.options.getRole("role");
      const action=i.options.getString("action");

      if(action==="add")await m.roles.add(r);
      else await m.roles.remove(r);

      return i.editReply("✅ Done.");
    }

    if(c==="lockdown"){
      for(const ch of i.guild.channels.cache.values()){
        if(ch.isTextBased()){
          await ch.permissionOverwrites.edit(
            i.guild.roles.everyone,
            {SendMessages:false}
          ).catch(()=>{});
        }
      }

      return i.editReply("🚨 Server lockdown enabled.");
    }

    if(c==="unlockdown"){
      for(const ch of i.guild.channels.cache.values()){
        if(ch.isTextBased()){
          await ch.permissionOverwrites.edit(
            i.guild.roles.everyone,
            {SendMessages:null}
          ).catch(()=>{});
        }
      }

      return i.editReply("🔓 Server lockdown disabled.");
    }

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
      write(settingsFile,settings);

      return i.editReply(
        `✅ ${key} channel set to ${channel}.`
      );
    }

    if(c==="channelinfo"){
      const ch=i.options.getChannel("channel")||i.channel;

      return i.editReply(
        `📺 **${ch.name}**\nID: ${ch.id}\nType: ${ch.type}`
      );
    }

    if(c==="roleinfo"){
      const r=i.options.getRole("role");

      return i.editReply(
        `🎭 **${r.name}**\nID: ${r.id}\nMembers: ${r.members.size}\nPosition: ${r.position}`
      );
    }

    if(c==="save-backup"){
      const backup={
        roles:i.guild.roles.cache
          .filter(r=>r.id!==i.guild.id)
          .map(r=>({
            name:r.name,
            color:r.hexColor,
            hoist:r.hoist,
            mentionable:r.mentionable
          })),
        channels:i.guild.channels.cache.map(ch=>({
          name:ch.name,
          type:ch.type,
          parent:ch.parent?.name||null
        }))
      };

      write(backupFile,backup);

      return i.editReply("💾 Server backup saved.");
    }

    if(c==="backup"){
      const b=read(backupFile);

      if(!b.roles&&!b.channels)
        return i.editReply("❌ No backup found.");

      for(const r of b.roles||[]){
        if(!i.guild.roles.cache.some(x=>x.name===r.name)){
          await i.guild.roles.create({
            name:r.name,
            color:r.color,
            hoist:r.hoist,
            mentionable:r.mentionable
          }).catch(()=>{});
        }
      }

      return i.editReply("♻️ Backup restored.");
    }

    return i.editReply("❌ Unknown command.");

  }catch(e){
    console.error("Interaction error:",e);

    if(i.deferred||i.replied){
      return i.editReply(
        "❌ Something went wrong. Check your Railway logs."
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