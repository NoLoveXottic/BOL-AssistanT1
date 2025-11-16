// commands/embed.js
import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Build and preview one or more Discord embeds")

    // ---------- EMBED 1 ----------
    .addSubcommand(sub =>
      sub
        .setName("add")
        .setDescription("Add an embed to the preview chain")
        .addStringOption(opt =>
          opt
            .setName("title")
            .setDescription("Embed title")
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt
            .setName("description")
            .setDescription("Embed description (supports markdown)")
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt
            .setName("color")
            .setDescription("Hex color, e.g. #ff6ec7")
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt
            .setName("image")
            .setDescription("Large image URL")
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt
            .setName("thumbnail")
            .setDescription("Thumbnail URL")
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt
            .setName("author_name")
            .setDescription("Author name")
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt
            .setName("author_icon")
            .setDescription("Author icon URL")
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt
            .setName("footer_text")
            .setDescription("Footer text")
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt
            .setName("footer_icon")
            .setDescription("Footer icon URL")
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt
            .setName("fields")
            .setDescription(
              "Fields in format: name1|value1|inline1,name2|value2|inline2... (inline = true/false)"
            )
            .setRequired(false)
        )
    )

    // ---------- PREVIEW ----------
    .addSubcommand(sub =>
      sub
        .setName("preview")
        .setDescription("Show all embeds you've added so far")
    )

    // ---------- CLEAR ----------
    .addSubcommand(sub =>
      sub.setName("clear").setDescription("Reset the embed chain")
    ),

  // In-memory storage per user (cleared on bot restart)
  embeds: new Map(), // userId -> EmbedBuilder[]

  /** -------------------------------------------------
   *  execute()
   *  ------------------------------------------------- */
  async execute(client, interaction, config) {
    const userId = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    // Initialize user storage
    if (!this.embeds.has(userId)) this.embeds.set(userId, []);

    const userEmbeds = this.embeds.get(userId);

    // --------------------------------------------------
    // 1. ADD EMBED
    // --------------------------------------------------
    if (sub === "add") {
      const embed = new EmbedBuilder();

      const title = interaction.options.getString("title");
      const desc = interaction.options.getString("description");
      const color = interaction.options.getString("color");
      const image = interaction.options.getString("image");
      const thumb = interaction.options.getString("thumbnail");
      const authorName = interaction.options.getString("author_name");
      const authorIcon = interaction.options.getString("author_icon");
      const footerText = interaction.options.getString("footer_text");
      const footerIcon = interaction.options.getString("footer_icon");
      const fieldsRaw = interaction.options.getString("fields");

      // Apply options
      if (title) embed.setTitle(title.slice(0, 256));
      if (desc) embed.setDescription(desc.slice(0, 4096));
      if (color) {
        const clean = color.replace(/[^0-9a-fA-F]/g, "");
        if (clean.length === 6) embed.setColor(`#${clean}`);
      }
      if (image) embed.setImage(image);
      if (thumb) embed.setThumbnail(thumb);
      if (authorName || authorIcon) {
        embed.setAuthor({
          name: authorName?.slice(0, 256) || " ",
          iconURL: authorIcon,
        });
      }
      if (footerText || footerIcon) {
        embed.setFooter({
          text: footerText?.slice(0, 2048) || " ",
          iconURL: footerIcon,
        });
      }

      // Parse fields: name|value|inline,name2|value2|...
      if (fieldsRaw) {
        const fieldGroups = fieldsRaw.split(",");
        for (const group of fieldGroups) {
          const [name, value, inlineStr] = group.split("|");
          if (name && value) {
            const inline = inlineStr?.toLowerCase() === "true";
            embed.addFields({
              name: name.slice(0, 256),
              value: value.slice(0, 1024),
              inline,
            });
          }
        }
      }

      // Default fallback if completely empty
      if (
        !title &&
        !desc &&
        !image &&
        !thumb &&
        !authorName &&
        !footerText &&
        !fieldsRaw
      ) {
        embed
          .setTitle("Empty Embed")
          .setDescription("*Add options to see content!*")
          .setColor("#5865F2");
      }

      userEmbeds.push(embed);
      await interaction.reply({
        content: `Embed added! Total: **${userEmbeds.length}** | Use \`/embed preview\` to see all.`,
        ephemeral: true,
      });
      return;
    }

    // --------------------------------------------------
    // 2. PREVIEW
    // --------------------------------------------------
    if (sub === "preview") {
      if (userEmbeds.length === 0) {
        return interaction.reply({
          content: "No embeds in chain. Use `/embed add` first.",
          ephemeral: true,
        });
      }

      // Discord allows up to 10 embeds per message
      const toSend = userEmbeds.slice(0, 10);
      await interaction.reply({
        content: userEmbeds.length > 10
          ? `Showing first 10 of **${userEmbeds.length}** embeds:`
          : `Previewing **${userEmbeds.length}** embed(s):`,
        embeds: toSend,
        ephemeral: false,
      });
      return;
    }

    // --------------------------------------------------
    // 3. CLEAR
    // --------------------------------------------------
    if (sub === "clear") {
      userEmbeds.length = 0;
      await interaction.reply({
        content: "Embed chain cleared!",
        ephemeral: true,
      });
      return;
    }
  },
};