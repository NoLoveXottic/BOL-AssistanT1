import { SlashCommandBuilder } from "discord.js";
import { createQuizEmbed } from "../utils.js";
import fetch from "node-fetch"; // Make sure to install: npm install node-fetch

const ROBLOX_USERID = 2669516091; // <-- Put your Roblox UserId here

// Helper to get Roblox headshot URL
async function getRobloxHeadshot(userId) {
  try {
    const response = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`);
    const data = await response.json();
    return data.data[0].imageUrl || "https://www.roblox.com/asset/?id=0"; // fallback
  } catch (err) {
    console.error("Failed to fetch Roblox headshot:", err);
    return "https://www.roblox.com/asset/?id=0";
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName("test")
    .setDescription("Send a test quiz result as Hannah with your avatar"),
  async execute(client, interaction, config) {
    const avatarUrl = await getRobloxHeadshot(ROBLOX_USERID);
    const wrongAnswers = 2;
    const passed = true;
    const rank = passed ? Math.max(0, 25 - wrongAnswers) : 0;

    const embed = createQuizEmbed({
      username: "Hannah",
      userId: ROBLOX_USERID,
      wrongAnswers,
      passed,
      avatarUrl,
      accountAge: 100,
      totalQuestions: config.totalQuestions,
      rank
    });

    const quizChannelId = process.env.QUIZ_CHANNEL_ID || config.QUIZ_CHANNEL_ID;
    const channel = await client.channels.fetch(quizChannelId);
    await channel.send({ embeds: [embed] });
    await interaction.reply({ content: "Test quiz result sent as Hannah with your headshot!", ephemeral: true });
  }
};
