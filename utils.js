import { EmbedBuilder } from "discord.js";

export function createQuizEmbed({ username, userId, wrongAnswers, passed, avatarUrl, accountAge = null, totalQuestions = 8 }) {
  const descriptionLines = [
    `${username} (${userId}) got **${wrongAnswers} wrong answers**.`,
    passed ? `✅ Rank **25** assigned.` : "❌ Player not ranked."
  ];

  if (accountAge !== null) descriptionLines.push(`Account Age: ${accountAge} days`);

  return new EmbedBuilder()
    .setTitle(passed ? "✅ Quiz Passed" : "❌ Quiz Failed")
    .setDescription(descriptionLines.join("\n"))
    .setThumbnail(avatarUrl)
    .setColor(passed ? 0x2ecc71 : 0xe74c3c)
    .addFields(
      { name: "Quiz Result", value: passed ? "Passed" : "Failed", inline: true },
      { name: "Wrong Answers", value: `${wrongAnswers}`, inline: true },
      { name: "Total Questions", value: `${totalQuestions}`, inline: true }
    )
    .setFooter({ text: "BŌL Staff Ranking System" })
    .setTimestamp();
}
