import express from "express";
import bodyParser from "body-parser";
import { Client, GatewayIntentBits } from "discord.js";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

// Load config
const config = JSON.parse(fs.readFileSync("config.json", "utf-8"));

// Discord client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Express server
const app = express();
app.use(bodyParser.json());
const PORT = process.env.PORT || config.port;

// ---- Load commands ----
const commands = new Map();
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
    await command.execute(client, interaction, config);
  } catch (err) {
    console.error(err);
    await interaction.reply({ content: "There was an error executing this command.", ephemeral: true });
  }
});

// ---- Roblox quiz endpoint ----
app.post("/quiz", async (req, res) => {
  try {
    const { username, userId, wrongAnswers, passed, avatarUrl, accountAge } = req.body;
    const { createQuizEmbed } = await import("./utils.js");

    const channel = await client.channels.fetch(config.quizresultschannelId);
    const embed = createQuizEmbed({ username, userId, wrongAnswers, passed, avatarUrl, accountAge, totalQuestions: config.totalQuestions });

    await channel.send({ embeds: [embed] });
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// ---- Start bot & server ----
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});

client.login(process.env.BOT_TOKEN || config.botToken);


