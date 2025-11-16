# Discord Quiz Bot

A Discord bot that receives quiz results via a web API and posts them to a Discord channel with formatted embeds.

## Features

- **Quiz Results Posting**: Receives quiz results via POST endpoint and posts formatted embeds to Discord
- **Roblox Integration**: Fetches user avatars from Roblox
- **Slash Commands**: Includes `/test` command for testing the bot functionality
- **Express Backend**: HTTP server to receive quiz results from external services

## Setup

### 1. Discord Bot Setup
1. Go to the [Discord Developer Portal](https://discord.dev)
2. Create a new application
3. Navigate to the "Bot" section and create a bot
4. Copy the bot token and add it to Replit Secrets as `BOT_TOKEN`
5. Enable the required intents in the bot settings
6. Invite the bot to your Discord server

### 2. Configuration
Edit `config.json` to set:
- `clientId`: Your Discord application client ID
- `guildId`: Your Discord server (guild) ID
- `QUIZ_CHANNEL_ID`: The channel ID where quiz results will be posted
- `totalQuestions`: Number of questions in your quiz (default: 8)

### 3. Deploy Slash Commands
Run the deploy script to register slash commands with your Discord server:
```bash
node deploy-commands.js
```

### 4. Run the Bot
The bot starts automatically in Replit. It will:
- Connect to Discord
- Start an Express server on port 3000
- Listen for quiz results on the `/quiz` endpoint

## API Usage

### POST /quiz
Submit quiz results to be posted in Discord.

**Endpoint**: `https://your-replit-url.repl.co/quiz`

**Request Body**:
```json
{
  "username": "PlayerName",
  "userId": 123456789,
  "wrongAnswers": 2,
  "passed": true,
  "accountAge": 365
}
```

**Response**: 
- `200 OK` - Quiz result posted successfully
- `400 Bad Request` - Missing required fields
- `500 Internal Server Error` - Server error

## Slash Commands

- `/test` - Sends a test quiz result to verify the bot is working

## Environment Variables

Required:
- `BOT_TOKEN` - Discord bot token (stored in Replit Secrets)

Optional:
- `QUIZ_CHANNEL_ID` - Override quiz channel ID from config
- `TOTAL_QUESTIONS` - Override total questions from config
- `PORT` - Override server port (default: 3000)

## Project Structure

```
├── commands/           # Discord slash commands
│   └── test.js        # Test command
├── config.json        # Bot configuration
├── deploy-commands.js # Script to deploy slash commands
├── index.js           # Main bot and server
├── utils.js           # Helper functions
└── logo.jpg           # Bot avatar image
```

## Security Notes

- The bot token is stored securely in Replit Secrets
- Never commit `config.json` with sensitive tokens to git
- The `.gitignore` file protects sensitive data
