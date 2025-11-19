// commands/embed.js
import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChannelType,
} from "discord.js";
import fs from "fs";
import path from "path";

const STORAGE_FILE = path.resolve("./data/embeds.json");

// Create data folder + file if missing
if (!fs.existsSync(path.dirname(STORAGE_FILE))) {
  fs.mkdirSync(path.dirname(STORAGE_FILE), { recursive: true });
}
if (!fs.existsSync(STORAGE_FILE)) {
  fs.writeFileSync(STORAGE_FILE, JSON.stringify({}, null, 2));
}

const loadEmbeds = () => JSON.parse(fs.readFileSync(STORAGE_FILE, "utf-8"));
const saveEmbeds = (data) => fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2));

export default {
  data: new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Ultimate embed builder — build, edit, preview, send, import/export")

    // BUILD GROUP
    .addSubcommandGroup((group) =>
      group
        .setName("build")
        .setDescription("Create and manage embeds")
        .addSubcommand((sub) =>
          sub
            .setName("add")
            .setDescription("Add embed via fields OR paste full JSON")
            .addStringOption((opt) =>
              opt
                .setName("json")
                .setDescription("Paste full embed JSON (overrides all other fields)")
                .setRequired(false)
            )
            .addStringOption((opt) => opt.setName("title").setDescription("Title"))
            .addStringOption((opt) => opt.setName("description").setDescription("Description"))
            .addStringOption((opt) => opt.setName("color").setDescription("Hex color (#ff6ec7)"))
            .addStringOption((opt) => opt.setName("image").setDescription("Image URL"))
            .addStringOption((opt) => opt.setName("thumbnail").setDescription("Thumbnail URL"))
            .addStringOption((opt) => opt.setName("author").setDescription("Author name"))
            .addStringOption((opt) => opt.setName("author_icon").setDescription("Author icon URL"))
            .addStringOption((opt) => opt.setName("footer").setDescription("Footer text"))
            .addStringOption((opt) => opt.setName("footer_icon").setDescription("Footer icon URL"))
            .addStringOption((opt) =>
              opt
                .setName("fields")
                .setDescription("name|value|inline,name2|value2|true")
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName("edit")
            .setDescription("Edit any field of an existing embed")
            .addIntegerOption((opt) =>
              opt
                .setName("index")
                .setDescription("Embed number (1 = first)")
                .setRequired(true)
                .setMinValue(1)
            )
            .addStringOption((opt) => opt.setName("title").setDescription("New title"))
            .addStringOption((opt) => opt.setName("description").setDescription("New description"))
            .addStringOption((opt) => opt.setName("color").setDescription("New hex color"))
            .addStringOption((opt) => opt.setName("image").setDescription("New image URL"))
            .addStringOption((opt) => opt.setName("thumbnail").setDescription("New thumbnail"))
            .addStringOption((opt) => opt.setName("author").setDescription("New author name"))
            .addStringOption((opt) => opt.setName("author_icon").setDescription("New author icon"))
            .addStringOption((opt) => opt.setName("footer").setDescription("New footer text"))
            .addStringOption((opt) => opt.setName("footer_icon").setDescription("New footer icon"))
            .addStringOption((opt) =>
              opt.setName("fields").setDescription("Replace all fields (same format as add)")
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName("remove")
            .setDescription("Delete an embed")
            .addIntegerOption((opt) =>
              opt.setName("index").setDescription("Embed to delete").setRequired(true).setMinValue(1)
            )
        )
    )

    // OTHER COMMANDS
    .addSubcommand((sub) => sub.setName("preview").setDescription("Preview current chain"))
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
    .addSubcommand((sub) => sub.setName("clear").setDescription("Delete all embeds"))
    .addSubcommand((sub) => sub.setName("export").setDescription("Download your embeds as JSON"))
    .addSubcommand((sub) =>
      sub
        .setName("import")
        .setDescription("Upload embeds.json to replace current chain")
        .addAttachmentOption((opt) =>
          opt.setName("file").setDescription("embeds.json").setRequired(true)
        )
    ),

  cache: new Map(),

  async execute(client, interaction) {
    const userId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    // Load user data
    let userData = this.cache.get(userId);
    if (!userData) {
      const all = loadEmbeds();
      userData = all[userId] || { embeds: [] };
      this.cache.set(userId, userData);
    }

    const save = () => {
      const all = loadEmbeds();
      all[userId] = userData;
      saveEmbeds(all);
      this.cache.set(userId, userData);
    };

    // Helper: apply field safely
    const applyField = (embed, field, value, setter) => {
      if (value !== null) setter(value);
    };

    // ADD (with JSON priority)
    if (sub === "add") {
      let embed;

      const rawJson = interaction.options.getString("json");
      if (rawJson) {
        try {
          const obj = JSON.parse(rawJson);
          embed = Array.isArray(obj)
            ? obj.map((e) => EmbedBuilder.from(e))
            : [EmbedBuilder.from(obj)];
          userData.embeds.push(...embed);
          save();
          await interaction.reply({
            content: `Added **${embed.length}** embed(s) from JSON! Total: ${userData.embeds.length}`,
            ephemeral: true,
          });
          return;
        } catch (e) {
          await interaction.reply({ content: "Invalid JSON!", ephemeral: true });
          return;
        }
      }

      // Normal field-based creation
      embed = new EmbedBuilder();
      let hasContent = false;

      const title = interaction.options.getString("title");
      const desc = interaction.options.getString("description");
      const color = interaction.options.getString("color");
      const image = interaction.options.getString("image");
      const thumb = interaction.options.getString("thumbnail");
      const author = interaction.options.getString("author");
      const authorIcon = interaction.options.getString("author_icon");
      const footer = interaction.options.getString("footer");
      const footerIcon = interaction.options.getString("footer_icon");
      const fields = interaction.options.getString("fields");

      if (title) { embed.setTitle(title.slice(0, 256)); hasContent = true; }
      if (desc) { embed.setDescription(desc.slice(0, 4096)); hasContent = true; }
      if (color) {
        const c = color.replace(/[^0-9a-fA-F]/g, "");
        if (c.length === 6) embed.setColor(`#${c}`);
      }
      if (image) embed.setImage(image);
      if (thumb) embed.setThumbnail(thumb);
      if (author) embed.setAuthor({ name: author.slice(0, 256), iconURL: authorIcon });
      if (footer) embed.setFooter({ text: footer.slice(0, 2048), iconURL: footerIcon });

      if (fields) {
        fields.split(",").forEach((part) => {
          const [n, v, i] = part.split("|");
          if (n && v) {
            embed.addFields({
              name: n.slice(0, 256),
              value: v.slice(0, 1024),
              inline: i?.toLowerCase() === "true",
            });
            hasContent = true;
          }
        });
      }

      if (!hasContent) {
        embed.setTitle("Empty Embed").setDescription("Add content!").setColor("#5865F2");
      }

      userData.embeds.push(embed);
      save();

      await interaction.reply({
        content: `Embed added! Total: **${userData.embeds.length}** | Use \`/embed preview\``,
        ephemeral: true,
      });
      return;
    }

    // FULL EDIT SUPPORT
    if (sub === "edit") {
      const index = interaction.options.getInteger("index") - 1;
      if (index < 0 || index >= userData.embeds.length) {
        return interaction.reply({ content: "Invalid index.", ephemeral: true });
      }

      const embed = userData.embeds[index];

      const updates = [
        [interaction.options.getString("title"), (v) => embed.setTitle(v.slice(0, 256))],
        [interaction.options.getString("description"), (v) => embed.setDescription(v.slice(0, 4096))],
        [interaction.options.getString("color"), (v) => {
          const c = v.replace(/[^0-9a-fA-F]/g, "");
          if (c.length === 6) embed.setColor(`#${c}`);
        }],
        [interaction.options.getString("image"), (v) => embed.setImage(v)],
        [interaction.options.getString("thumbnail"), (v) => embed.setThumbnail(v)],
        [interaction.options.getString("author"), (v) => embed.setAuthor({ name: v.slice(0, 256), iconURL: embed.data.author?.icon_url })],
        [interaction.options.getString("author_icon"), (v) => embed.setAuthor({ name: embed.data.author?.name || " ", iconURL: v })],
        [interaction.options.getString("footer"), (v) => embed.setFooter({ text: v.slice(0, 2048), iconURL: embed.data.footer?.icon_url })],
        [interaction.options.getString("footer_icon"), (v) => embed.setFooter({ text: embed.data.footer?.text || " ", iconURL: v })],
        [interaction.options.getString("fields"), (v) => {
          embed.spliceFields(0, embed.data.fields?.length || 0);
          v.split(",").forEach((p) => {
            const [n, val, i] = p.split("|");
            if (n && val) {
              embed.addFields({ name: n.slice(0, 256), value: val.slice(0, 1024), inline: i?.toLowerCase() === "true" });
            }
          });
        }],
      ];

      let changed = false;
      for (const [value, setter] of updates) {
        if (value !== null) {
          setter(value);
          changed = true;
        }
      }

      if (!changed) {
        return interaction.reply({ content: "No changes made.", ephemeral: true });
      }

      save();
      await interaction.reply({ content: `Embed #${index + 1} updated!`, ephemeral: true });
      return;
    }

    // Other commands (preview, send, clear, export, import) remain the same as before
    // (just copied with minor cleanup)

    if (sub === "preview") {
      if (userData.embeds.length === 0) return interaction.reply({ content: "No embeds yet!", ephemeral: true });
      await interaction.reply({
        content: `Previewing **${userData.embeds.length}** embed(s):`,
        embeds: userData.embeds.slice(0, 10),
        ephemeral: false,
      });
      return;
    }

    if (sub === "send") {
      if (userData.embeds.length === 0) return interaction.reply({ content: "Nothing to send.", ephemeral: true });
      const channel = interaction.options.getChannel("channel");
      await channel.send({ embeds: userData.embeds.slice(0, 10) });
      await interaction.reply({ content: `Sent to ${channel}!`, ephemeral: true });
      return;
    }

    if (sub === "clear") {
      userData.embeds = [];
      save();
      await interaction.reply({ content: "Cleared!", ephemeral: true });
      return;
    }

    if (sub === "export") {
      const file = Buffer.from(JSON.stringify(userData.embeds, null, 2));
      await interaction.reply({
        content: "Your embed chain:",
        files: [{ attachment: file, name: "embeds.json" }],
        ephemeral: true,
      });
      return;
    }

    if (sub === "import") {
      const att = interaction.options.getAttachment("file");
      if (!att.name.endsWith(".json")) return interaction.reply({ content: "Must be .json", ephemeral: true });
      try {
        const res = await fetch(att.url);
        const json = await res.json();
        if (!Array.isArray(json)) throw "";
        userData.embeds = json.map(e => EmbedBuilder.from(e)).slice(0, 50);
        save();
        await interaction.reply({ content: `Imported ${userData.embeds.length} embeds!`, ephemeral: true });
      } catch {
        await interaction.reply({ content: "Invalid JSON file.", ephemeral: true });
      }
    }
  },
};