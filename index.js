import express from "express";
import bodyParser from "body-parser";
import { Client, GatewayIntentBits } from "discord.js";
import path from "path";
import { pathToFileURL } from "url";
import fetch from "node-fetch";

// ---- Environment variables ----
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const QUIZ_CHANNEL_ID = process.env.QUIZRESULTSCHANNELID;
const TOTAL_QUESTIONS = Number(process.env.TOTAL_QUESTIONS) || 8;

// ---- Discord client ----
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ---- Express server ----
const app = express();
app.use(bodyParser.json());

// ---- Load commands ----
const commands = new Map();
import fs from "fs";
const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = pathToFileURL(path.join("./commands", file)).href;
  const { default: command } = await import(filePath);
  commands.set(command.data.name, command);
}

// ---- Interaction handler ----
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const command = commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(client, interaction, { QUIZ_CHANNEL_ID, TOTAL_QUESTIONS });
  } catch (err) {
    console.error(err);
    await interaction.reply({ content: "There was an error executing this command.", ephemeral: true });
  }
});

// ---- Helper: fetch Roblox headshot ----
async function getRobloxHeadshot(userId) {
  try {
    const res = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`);
    const data = await res.json();
    return data.data[0].imageUrl || "https://www.roblox.com/asset/?id=0";
  } catch {
    return "https://www.roblox.com/asset/?id=0";
  }
}

import fetch from "node-fetch"; // make sure this is installed

// Helper: fetch Roblox headshot
async function fetchRobloxHeadshot(userId) {
  try {
    const res = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`
    );
    const data = await res.json();
    return data.data[0]?.imageUrl || "https://www.roblox.com/asset/?id=0";
  } catch (err) {
    console.error("Failed to fetch Roblox headshot:", err);
    return "https://www.roblox.com/asset/?id=0";
  }
}


app.post("/quiz", async (req, res) => {
  try {
    const { username, userId, wrongAnswers = 0, passed = false, accountAge = null } = req.body;

    if (!username || !userId) {
      console.warn("Missing username or userId");
      return res.status(400).send("Missing username or userId");
    }

    // Fetch avatar inside the bot
    const avatarUrl = await fetchRobloxHeadshot(userId);

    const { createQuizEmbed } = await import("./utils.js");

    const rank = passed ? Math.max(0, 25 - wrongAnswers) : 0;

    const embed = createQuizEmbed({
      username,
      userId,
      wrongAnswers,
      passed,
      avatarUrl,
      accountAge,
      totalQuestions: TOTAL_QUESTIONS,
      rank
    });

    const channel = await client.channels.fetch(QUIZ_CHANNEL_ID);
    if (!channel) throw new Error("Quiz channel not found");

    await channel.send({ embeds: [embed] });
    res.sendStatus(200);

  } catch (err) {
    console.error("Error in /quiz endpoint:", err);
    res.sendStatus(500);
  }
});


    const channel = await client.channels.fetch(QUIZ_CHANNEL_ID);
    if (!channel) throw new Error("Quiz channel not found");

    await channel.send({ embeds: [embed] });
    res.sendStatus(200);

  } catch (err) {
    console.error("Error in /quiz endpoint:", err);
    res.sendStatus(500);
  }
});

// ---- Start bot & server ----
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});

client.login(BOT_TOKEN);
