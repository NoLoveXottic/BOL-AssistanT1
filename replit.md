# Discord Quiz Bot

## Overview
This is a Discord bot that receives quiz results and posts them to a Discord channel. It includes:
- Express backend with a POST endpoint to receive quiz results
- Discord bot integration with slash commands
- Roblox user avatar integration

## Architecture
- **Backend**: Express server running on port 3000
- **Discord Bot**: Discord.js v14 client with slash commands
- **Commands**: Slash commands in the `/commands` directory
  - `/test` - Send a test quiz result

## Project Structure
```
.
├── commands/          # Discord slash commands
│   └── test.js       # Test command
├── config.json       # Configuration file (non-sensitive)
├── deploy-commands.js # Deploy Discord slash commands to guild
├── index.js          # Main bot & Express server
├── utils.js          # Helper functions (embed creation)
└── logo.jpg          # Bot avatar
```

## Environment Variables
Required secrets (set in Replit Secrets):
- `BOT_TOKEN` - Discord bot token (REQUIRED)

Optional environment variables:
- `QUIZ_CHANNEL_ID` - Override the quiz results channel ID
- `TOTAL_QUESTIONS` - Override total number of quiz questions
- `PORT` - Override server port (default: 3000)

## Configuration
The `config.json` file contains non-sensitive configuration:
- Discord server (guild) ID
- Discord client ID
- Quiz channel ID (can be overridden by env var)
- Bot display settings
- Quiz settings

## Setup Instructions
1. Get your Discord bot token from the Discord Developer Portal
2. Add the bot token to Replit Secrets as `BOT_TOKEN`
3. Run the bot - it will start both the Discord client and Express server
4. Deploy slash commands to your Discord server by running `node deploy-commands.js`

## API Endpoints
### POST /quiz
Receives quiz results and posts them to Discord.

**Request Body:**
```json
{
  "username": "string",
  "userId": "number",
  "wrongAnswers": "number",
  "passed": "boolean",
  "accountAge": "number (optional)"
}
```

## Recent Changes
- 2025-11-16: Initial import and Replit setup
  - Removed exposed bot token from config.json
  - Added environment variable support
  - Fixed channel ID reference bug in test command
  - Added .gitignore to protect sensitive data
  - Created replit.md documentation
