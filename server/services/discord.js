/**
 * Discord identity bot — DM OTP to guild members by username.
 * Without DISCORD_BOT_TOKEN, runs in mock mode (logs OTP to console).
 */
let clientPromise = null;

function inviteUrl() {
  return process.env.DISCORD_INVITE_URL || 'https://discord.gg/alivestage';
}

function isConfigured() {
  return Boolean(process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_GUILD_ID);
}

async function getClient() {
  if (!isConfigured()) return null;
  if (clientPromise) return clientPromise;

  clientPromise = (async () => {
    const { Client, GatewayIntentBits, Partials } = require('discord.js');
    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
      ],
      partials: [Partials.Channel],
    });

    await client.login(process.env.DISCORD_BOT_TOKEN);
    await new Promise((resolve, reject) => {
      client.once('ready', resolve);
      client.once('error', reject);
      setTimeout(() => reject(new Error('Discord client ready timeout')), 30000);
    });
    console.log(`[discord] Logged in as ${client.user.tag}`);
    return client;
  })().catch((err) => {
    clientPromise = null;
    throw err;
  });

  return clientPromise;
}

/**
 * Resolve a guild member by Discord username (global name or guild nickname).
 * @returns {Promise<{ ok: true, discordId: string, username: string } | { ok: false, message: string }>}
 */
async function resolveGuildMember(discordUsername) {
  const username = String(discordUsername || '').trim().replace(/^@/, '');
  if (!username) {
    return { ok: false, message: 'Discord username is required' };
  }

  if (!isConfigured()) {
    return {
      ok: true,
      discordId: `mock_${username.toLowerCase()}`,
      username,
      mock: true,
    };
  }

  const client = await getClient();
  const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
  await guild.members.fetch();

  const needle = username.toLowerCase();
  const member = guild.members.cache.find((m) => {
    const uname = (m.user.username || '').toLowerCase();
    const globalName = (m.user.globalName || '').toLowerCase();
    const nick = (m.nickname || '').toLowerCase();
    return uname === needle || globalName === needle || nick === needle;
  });

  if (!member) {
    return {
      ok: false,
      message: `Could not find @${username} in the AliVeStage Discord server. Join first: ${inviteUrl()}`,
    };
  }

  return {
    ok: true,
    discordId: member.user.id,
    username: member.user.username,
  };
}

async function sendDirectMessage(discordId, content) {
  if (!isConfigured() || String(discordId).startsWith('mock_')) {
    console.log(`[discord] (mock) DM to ${discordId}: ${content}`);
    return { mock: true };
  }

  const client = await getClient();
  const user = await client.users.fetch(discordId);
  await user.send(content);
  return { mock: false };
}

async function sendOtpDm({ discordUsername, code }) {
  const resolved = await resolveGuildMember(discordUsername);
  if (!resolved.ok) return resolved;

  const content =
    `Your AliVeStage verification code is **${code}**.\n` +
    `It expires in 5 minutes. If you did not request this, ignore this message.`;

  await sendDirectMessage(resolved.discordId, content);
  return {
    ok: true,
    discordId: resolved.discordId,
    username: resolved.username,
    mock: Boolean(resolved.mock),
  };
}

module.exports = {
  inviteUrl,
  isConfigured,
  resolveGuildMember,
  sendDirectMessage,
  sendOtpDm,
  getClient,
};
