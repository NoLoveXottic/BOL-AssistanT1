// commands/embed.js
import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChannelType,
} from "discord.js";
import fs from "fs";
import path from "path";

const STORAGE_FILE = path.resolve("./data/embeds.json");

// Auto-create data folder and file
if (!fs.existsSync("./data")) fs.mkdirSync("./data", { recursive: true });
if (!fs.existsSync(STORAGE_FILE)) fs.writeFileSync(STORAGE_FILE, "{}");

const load = () => JSON.parse(fs.readFileSync(STORAGE_FILE, "utf-8"));
const save = (data) => fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2));

export default {
  data: new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Ultimate embed builder — JSON paste, edit, chain, send")

    // BUILD: add / edit / remove
    .addSubcommandGroup((g) =>
      g.setName("build").setDescription("Manage your embed chain")
        .addSubcommand((s) =>
          s.setName("add").setDescription("Add embed(s) — supports raw JSON")
            .addStringOption((o) => o.setName("json").setDescription("Full embed JSON (array or single)").setRequired(false))
            .addStringOption((o) => o.setName("title").setDescription("Title"))
            .addStringOption((o) => o.setName("description").setDescription("Description"))
            .addStringOption((o) => o.setName("color").setDescription("#ff6ec7"))
            .addStringOption((o) => o.setName("image").setDescription("Image URL"))
            .addStringOption((o) => o.setName("thumbnail").setDescription("Thumbnail URL"))
            .addStringOption((o) => o.setName("author").setDescription("Author name"))
            .addStringOption((o) => o.setName("author_icon").setDescription("Author icon URL"))
            .addStringOption((o) => o.setName("footer").setDescription("Footer text"))
            .addStringOption((o) => o.setName("footer_icon").setDescription("Footer icon URL"))
            .addStringOption((o) => o.setName("fields").setDescription("name|value|true,name2|value2|false"))
        )
        .addSubcommand((s) =>
          s.setName("edit").setDescription("Edit any field of an embed")
            .addIntegerOption((o) => o.setName("index").setDescription("Embed # (1 = first)").setRequired(true).setMinValue(1))
            .addStringOption((o) => o.setName("title"))
            .addStringOption((o) => o.setName("description"))
            .addStringOption((o) => o.setName("color"))
            .addStringOption((o) => o.setName("image"))
            .addStringOption((o) => o.setName("thumbnail"))
            .addStringOption((o) => o.setName("author"))
            .addStringOption((o) => o.setName("author_icon"))
            .addStringOption((o) => o.setName("footer"))
            .addStringOption((o) => o.setName("footer_icon"))
            .addStringOption((o) => o.setName("fields").setDescription("Replace all fields"))
        )
        .addSubcommand((s) =>
          s.setName("remove").setDescription("Delete an embed")
            .addIntegerOption((o) => o.setName("index").setDescription("Embed #").setRequired(true).setMinValue(1))
        )
    )

    // Other actions
    .addSubcommand((s) => s.setName("preview").setDescription("Show current embed chain"))
    .addSubcommand((s) =>
      s.setName("send").setDescription("Send embeds to a channel")
        .addChannelOption((o) =>
          o.setName("channel").setRequired(true).addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand((s) => s.setName("clear").setDescription("Delete all embeds"))
    .addSubcommand((s) => s.setName("export").setDescription("Download your embeds as JSON"))
    .addSubcommand((s) =>
      s.setName("import").setDescription("Upload embeds.json")
        .addAttachmentOption((o) => o.setName("file").setDescription("embeds.json").setRequired(true))
    ),

  // In-memory cache
  cache: new Map(),

  async execute(client, interaction) {
    await interaction.deferReply({ ephemeral: true });

    const userId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    // Load user data
    let userData = this.cache.get(userId);
    if (!userData) {
      const all = load();
      userData = all[userId] || { embeds: [] };
      this.cache.set(userId, userData);
    }

    const persist = () => {
      const all = load();
      all[userId] = userData;
      save(all);
    };

    // ADD — JSON has priority
    if (sub === "add") {
      const rawJson = interaction.options.getString("json");

      if (rawJson) {
        try {
          const parsed = JSON.parse(rawJson);
          const embeds = Array.isArray(parsed)
            ? parsed.map(e => EmbedBuilder.from(e))
            : [EmbedBuilder.from(parsed)];

          if (embeds.length > 50) throw new Error("Max 50 embeds");

          userData.embeds.push(...embeds);
          persist();

          return interaction.editReply({
            content: `Added **${embeds.length}** embed(s) from JSON!\nTotal: **${userData.embeds.length}**`,
          });
        } catch (e) {
          return interaction.editReply({ content: `Invalid JSON!\n\`\`\`js\n${e.message}\n\`\`\`` });
        }
      }

      // Manual creation
      const embed = new EmbedBuilder();
      let filled = false;

      const set = (opt, fn) => {
        const val = interaction.options.getString(opt);
        if (val) { fn(val); filled = true; }
      };

      set("title", v => embed.setTitle(v.slice(0, 256)));
      set("description", v => embed.setDescription(v.slice(0, 4096)));
      set("color", v => {
        const c = v.replace(/[^0-9a-fA-F]/g, "");
        if (c.length === 6) embed.setColor("#" + c);
      });
      set("image", v => embed.setImage(v));
      set("thumbnail", v => embed.setThumbnail(v));
      set("author", v => embed.setAuthor({ name: v.slice(0, 256) }));
      set("author_icon", v => {
        const a = embed.data.author || {};
        embed.setAuthor({ ...a, iconURL: v });
      });
      set("footer", v => embed.setFooter({ text: v.slice(0, 2048) }));
      set("footer_icon", v => {
        const f = embed.data.footer || {};
        embed.setFooter({ ...f, iconURL: v });
      });

      const fields = interaction.options.getString("fields");
      if (fields) {
        fields.split(",").forEach(part => {
          const [n, v, i] = part.split("|");
          if (n && v) {
            embed.addFields({
              name: n.slice(0, 256),
              value: v.slice(0, 1024),
              inline: i?.toLowerCase() === "true"
            });
            filled = true;
          }
        });
      }

      if (!filled) {
        embed.setTitle("Empty Embed").setDescription("Add some content!").setColor("#00ff88");
      }

      userData.embeds.push(embed);
      persist();

      return interaction.editReply({
        content: `Embed added! Total: **${userData.embeds.length}**\nUse \`/embed preview\` to see it.`,
      });
    }

    // EDIT
    if (sub === "edit") {
      const idx = interaction.options.getInteger("index") - 1;
      if (idx < 0 || idx >= userData.embeds.length)
        return interaction.editReply({ content: "Invalid index." });

      const embed = userData.embeds[idx];
      let changed = false;

      const update = (opt, fn) => {
        const val = interaction.options.getString(opt);
        if (val !== null) { fn(val); changed = true; }
      };

      update("title", v => embed.setTitle(v.slice(0, 256)));
      update("description", v => embed.setDescription(v.slice(0, 4096)));
      update("color", v => {
        const c = v.replace(/[^0-9a-fA-F]/g, "");
        if (c.length === 6) embed.setColor("#" + c);
      });
      update("image", v => embed.setImage(v));
      update("thumbnail", v => embed.setThumbnail(v));
      update("author", v => embed.setAuthor({ name: v.slice(0, 256), iconURL: embed.data.author?.icon_url }));
      update("author_icon", v => embed.setAuthor({ name: embed.data.author?.name || " ", iconURL: v }));
      update("footer", v => embed.setFooter({ text: v.slice(0, 2048), iconURL: embed.data.footer?.icon_url }));
      update("footer_icon", v => embed.setFooter({ text: embed.data.footer?.text || " ", iconURL: v }));
      update("fields", v => {
        embed.spliceFields(0, embed.data.fields?.length || 0);
        v.split(",").forEach(p => {
          const [n, val, i] = p.split("|");
          if (n && val) embed.addFields({ name: n.slice(0, 256), value: val.slice(0, 1024), inline: i?.toLowerCase() === "true" });
        });
      });

      if (!changed) return interaction.editReply({ content: "No changes made." });

      persist();
      return interaction.editReply({ content: `Embed #${idx + 1} updated!` });
    }

    // REMOVE
    if (sub === "remove") {
      const idx = interaction.options.getInteger("index") - 1;
      if (idx < 0 || idx >= userData.embeds.length)
        return interaction.editReply({ content: "Invalid index." });

      userData.embeds.splice(idx, 1);
      persist();
      return interaction.editReply({ content: `Embed #${idx + 1} removed.` });
    }

    // PREVIEW
    if (sub === "preview") {
      if (!userData.embeds.length)
        return interaction.editReply({ content: "Your embed chain is empty." });

      await interaction.editReply({ content: "Preview below:", embeds: [] });
      return interaction.followUp({
        content: `**${userData.embeds.length}** embed(s) in chain:`,
        embeds: userData.embeds.slice(0, 10),
        ephemeral: false,
      });
    }

    // SEND
    if (sub === "send") {
      if (!userData.embeds.length)
        return interaction.editReply({ content: "Nothing to send." });

      const channel = interaction.options.getChannel("channel");
      await channel.send({ embeds: userData.embeds.slice(0, 10) });
      return interaction.editReply({ content: `Sent ${userData.embeds.length} embed(s) to ${channel}!` });
    }

    // CLEAR
    if (sub === "clear") {
      userData.embeds = [];
      persist();
      return interaction.editReply({ content: "All embeds cleared!" });
    }

    // EXPORT
    if (sub === "export") {
      const buffer = Buffer.from(JSON.stringify(userData.embeds, null, 2));
      return interaction.editReply({
        content: "Here’s your full embed chain:",
        files: [{ attachment: buffer, name: "embeds.json" }],
      });
    }

    // IMPORT
    if (sub === "import") {
      const file = interaction.options.getAttachment("file");
      if (!file.name.endsWith(".json"))
        return interaction.editReply({ content: "Please upload a .json file." });

      try {
        const res = await fetch(file.url);
        const json = await res.json();
        if (!Array.isArray(json)) throw 0;

        userData.embeds = json.map(e => EmbedBuilder.from(e)).slice(0, 100);
        persist();

        return interaction.editReply({ content: `Imported **${userData.embeds.length}** embed(s)!` });
      } catch {
        return interaction.editReply({ content: "Invalid or corrupted JSON file." });
      }
    }
  },
};