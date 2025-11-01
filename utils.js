import { EmbedBuilder } from "discord.js";

export function createQuizEmbed({ username, userId, wrongAnswers, passed, avatarUrl, accountAge, totalQuestions, rank }) {
  return new EmbedBuilder()
    .setTitle(passed ? "✅ Quiz Passed" : "❌ Quiz Failed")
    .setDescription(`${username} (${userId}) got **${wrongAnswers} wrong answers**.\nRank: ${passed ? rank : "None"}`)
    .setColor(passed ? 0x2ecc71 : 0xe74c3c)
    .setThumbnail(avatarUrl)
    .addFields(
      { name: "Account Age", value: accountAge ? `${accountAge} days` : "Unknown", inline: true },
      { name: "Total Questions", value: totalQuestions.toString(), inline: true },
      { name: "Quiz Result", value: passed ? "Passed" : "Failed", inline: true }
    )
    .setTimestamp()
    .setFooter({ text: "BŌL Staff Ranking System" });
}

