import fs from "fs";
import path from "path";
import { REST, Routes } from "discord.js";
import { pathToFileURL } from "url";

const config = JSON.parse(fs.readFileSync("config.json", "utf-8"));
const commands = [];

const commandFiles = fs.readdirSync("./commands").filter(f => f.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = pathToFileURL(path.join("./commands", file)).href;
  const { default: command } = await import(filePath);
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: "10" }).setToken(config.botToken);

(async () => {
  try {
    console.log("Registering commands for guild:", config.guildId);
    await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: commands }
    );
    console.log("Commands registered!");
  } catch (err) {
    console.error(err);
  }
})();
