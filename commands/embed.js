// commands/embed.js
import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
} from "discord.js";
import fs from "fs";
import path from "path";

const STORAGE_FILE = path.resolve("./data/embeds.json");

// Ensure storage exists
if (!fs.existsSync(path.dirname(STORAGE_FILE))) {
  fs.mkdirSync(path.dirname(STORAGE_FILE), { recursive: true });
}
if (!fs.existsSync(STORAGE_FILE)) {
  fs.writeFileSync(STORAGE_FILE, JSON.stringify({}, null, 2));
}

// Load/Save helpers
const loadEmbeds = () => JSON.parse(fs.readFileSync(STORAGE_FILE, "utf-8"));
const saveEmbeds = (data) =>
  fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2));

export default {
  data: new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Advanced embed builder with chain, edit, and send")

    // === ADD ===
    .addSubcommandGroup((group) =>
      group
        .setName("build")
        .setDescription("Build and manage embeds")
        .addSubcommand((sub) =>
          sub
            .setName("add")
            .setDescription("Add a new embed")
            .addStringOption((opt) =>
              opt.setName("title").setDescription("Title").setRequired(false)
            )
            .addStringOption((opt) =>
              opt
                .setName("description")
                .setDescription("Description")
                .setRequired(false)
            )
            .addStringOption((opt) =>
              opt
                .setName("color")
                .setDescription("Hex color (#ff6ec7)")
                .setRequired(false)
            )
            .addStringOption((opt) =>
              opt.setName("image").setDescription("Image URL").setRequired(false)
            )
            .addStringOption((opt) =>
              opt
                .setName("thumbnail")
                .setDescription("Thumbnail URL")
                .setRequired(false)
            )
            .addStringOption((opt) =>
              opt
                .setName("author")
                .setDescription("Author name")
                .setRequired(false)
            )
            .addStringOption((opt) =>
              opt
                .setName("author_icon")
                .setDescription("Author icon URL")
                .setRequired(false)
            )
            .addStringOption((opt) =>
              opt
                .setName("footer")
                .setDescription("Footer text")
                .setRequired(false)
            )
            .addStringOption((opt) =>
              opt
                .setName("footer_icon")
                .setDescription("Footer icon URL")
                .setRequired(false)
            )
            .addStringOption((opt) =>
              opt
                .setName("fields")
                .setDescription(
                  "Fields: name|value|inline,name2|value2 (inline = true/false)"
                )
                .setRequired(false)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName("edit")
            .setDescription("Edit an existing embed")
            .addIntegerOption((opt) =>
              opt
                .setName("index")
                .setDescription("Embed # to edit (1 = first)")
                .setRequired(true)
                .setMinValue(1)
            )
            .addStringOption((opt) =>
              opt.setName("title").setDescription("New title").setRequired(false)
            )
            // ... repeat other options as needed
        )
        .addSubcommand((sub) =>
          sub
            .setName("remove")
            .setDescription("Remove an embed")
            .addIntegerOption((opt) =>
              opt
                .setName("index")
                .setDescription("Embed # to remove (1 = first)")
                .setRequired(true)
                .setMinValue(1)
            )
        )
    )

    // === PREVIEW & SEND ===
    .addSubcommand((sub) =>
      sub
        .setName("preview")
        .setDescription("Preview all embeds")
    )
    .addSubcommand((sub) =>
      sub
        .setName("send")
        .setDescription("Send embeds to a channel")
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Target channel")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("clear").setDescription("Clear all embeds")
    )
    .addSubcommand((sub) =>
      sub
        .setName("export")
        .setDescription("Export embeds as JSON (for backup)")
    )
    .addSubcommand((sub) =>
      sub
        .setName("import")
        .setDescription("Import embeds from JSON (attach file)")
        .addAttachmentOption((opt) =>
          opt
            .setName("file")
            .setDescription("embeds.json file")
            .setRequired(true)
        )
    ),

  // In-memory cache for speed
  cache: new Map(),

  async execute(client, interaction, config) {
    const userId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    // Load user data
    let data = this.cache.get(userId);
    if (!data) {
      const all = loadEmbeds();
      data = all[userId] || { embeds: [] };
      this.cache.set(userId, data);
    }

    const save = () => {
      const all = loadEmbeds();
      all[userId] = data;
      saveEmbeds(all);
      this.cache.set(userId, data);
    };

    // === BUILD: ADD ===
    if (sub === "add") {
      const embed = new EmbedBuilder();
      let hasContent = false;

      const apply = (opt, setter) => {
        const val = interaction.options.getString(opt);
        if (val) {
          setter(val);
          hasContent = true;
        }
      };

      apply("title", (v) => embed.setTitle(v.slice(0, 256)));
      apply("description", (v) => embed.setDescription(v.slice(0, 4096)));
      apply("color", (v) => {
        const c = v.replace(/[^0-9a-fA-F]/g, "");
        if (c.length === 6) embed.setColor(`#${c}`);
      });
      apply("image", (v) => embed.setImage(v));
      apply("thumbnail", (v) => embed.setThumbnail(v));
      apply("author", (v) => embed.setAuthor({ name: v.slice(0, 256) }));
      apply("author_icon", (v) => {
        const auth = embed.data.author || {};
        auth.icon_url = v;
        embed.setAuthor(auth);
      });
      apply("footer", (v) => embed.setFooter({ text: v.slice(0, 2048) }));
      apply("footer_icon", (v) => {
        const foot = embed.data.footer || {};
        foot.icon_url = v;
        embed.setFooter(foot);
      });

      // Fields
      const fieldsRaw = interaction.options.getString("fields");
      if (fieldsRaw) {
        const parts = fieldsRaw.split(",");
        for (const part of parts) {
          const [name, value, inlineStr] = part.split("|");
          if (name && value) {
            embed.addFields({
              name: name.slice(0, 256),
              value: value.slice(0, 1024),
              inline: inlineStr?.toLowerCase() === "true",
            });
            hasContent = true;
          }
        }
      }

      if (!hasContent) {
        embed
          .setTitle("Empty Embed")
          .setDescription("*Add fields to see content!*")
          .setColor("#5865F2");
      }

      data.embeds.push(embed);
      save();

      await interaction.reply({
        content: `Embed added! Total: **${data.embeds.length}**`,
        ephemeral: true,
      });
      return;
    }

    // === BUILD: EDIT (simplified – add more fields as needed) ===
    if (sub === "edit") {
      const index = interaction.options.getInteger("index") - 1;
      if (index < 0 || index >= data.embeds.length) {
        return interaction.reply({
          content: "Invalid index.",
          ephemeral: true,
        });
      }

      const embed = data.embeds[index];
      const title = interaction.options.getString("title");
      if (title) embed.setTitle(title.slice(0, 256));

      save();
      await interaction.reply({
        content: `Embed #${index + 1} updated!`,
        ephemeral: true,
      });
      return;
    }

    // === BUILD: REMOVE ===
    if (sub === "remove") {
      const index = interaction.options.getInteger("index") - 1;
      if (index < 0 || index >= data.embeds.length) {
        return interaction.reply({
          content: "Invalid index.",
          ephemeral: true,
        });
      }
      data.embeds.splice(index, 1);
      save();
      await interaction.reply({
        content: `Embed #${index + 1} removed!`,
        ephemeral: true,
      });
      return;
    }

    // === PREVIEW ===
    if (sub === "preview") {
      if (data.embeds.length === 0) {
        return interaction.reply({
          content: "No embeds. Use `/embed build add` first.",
          ephemeral: true,
        });
      }
      const toSend = data.embeds.slice(0, 10);
      await interaction.reply({
        content:
          data.embeds.length > 10
            ? `Previewing first 10 of **${data.embeds.length}** embeds:`
            : `Previewing **${data.embeds.length}** embed(s):`,
        embeds: toSend,
        ephemeral: false,
      });
      return;
    }

    // === SEND ===
    if (sub === "send") {
      if (data.embeds.length === 0) {
        return interaction.reply({
          content: "No embeds to send.",
          ephemeral: true,
        });
      }
      const channel = interaction.options.getChannel("channel");
      const toSend = data.embeds.slice(0, 10);
      await channel.send({ embeds: toSend });
      await interaction.reply({
        content: `Sent ${toSend.length} embed(s) to ${channel}!`,
        ephemeral: true,
      });
      return;
    }

    // === CLEAR ===
    if (sub === "clear") {
      data.embeds = [];
      save();
      await interaction.reply({ content: "All embeds cleared!", ephemeral: true });
      return;
    }

    // === EXPORT ===
    if (sub === "export") {
      const buffer = Buffer.from(JSON.stringify(data.embeds, null, 2));
      await interaction.reply({
        content: "Here is your embed chain (JSON):",
        files: [{ attachment: buffer, name: "embeds.json" }],
        ephemeral: true,
      });
      return;
    }

    // === IMPORT ===
    if (sub === "import") {
      const attachment = interaction.options.getAttachment("file");
      if (!attachment.name.endsWith(".json")) {
        return interaction.reply({
          content: "Please upload a `.json` file.",
          ephemeral: true,
        });
      }
      try {
        const res = await fetch(attachment.url);
        const json = await res.json();
        if (!Array.isArray(json)) throw new Error("Invalid format");
        data.embeds = json.map((e) => EmbedBuilder.from(e)).slice(0, 50);
        save();
        await interaction.reply({
          content: `Imported ${data.embeds.length} embed(s)!`,
          ephemeral: true,
        });
      } catch (err) {
        await interaction.reply({
          content: "Failed to import: invalid JSON.",
          ephemeral: true,
        });
      }
      return;
    }
  },
};