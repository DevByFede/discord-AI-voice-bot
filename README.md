# discord-AI-voice-bot
A Discord bot that repeats what you write with an AI voice

# Pre-requirements
<ul>
  <li> A <a href="https://discord.com/">discord</a> account </li>
  <li> An <a href="https://elevenlabs.io/">ElevenLabs</a> account </li> 
  <li> <a href="https://nodejs.org/">Node.js</a> installed (version 18.0+) </li>
  <li> npm installed </li>
</ul>

# Initialization
Clone tis repository and create a .env file that you'll put your keys (like .env.example file)
```
DISCORD_BOT_TOKEN=INSERT_YOUR_SECRET_DISCORD_BOT_TOKEN
DISCORD_CLIENT_ID=INSERT_YOUR_DISCORD_CLIENT_ID
ELEVENLABS_API_KEY=INSERT_YOUR_SECRET_ELEVENLABS_API_KEY
ELEVENLABS_VOICE_ID=INSERT_ELEVENLABS_VOICE_ID
```
After that, you need to run npm command to install all node-modules.

To get your ElevenLabs API Key, you need to create an account and click on your profile in the menu, so click "Profile + API key" and copy yor API Key. <br />
For the voice, you can choose it in <a href="https://elevenlabs.io/docs/voices/premade-voices"> this link </a>. 

# How it works - Code explanation
```javascript
const { SlashCommandBuilder } = require('discord.js')
```
Using the "SlashCommandBuilder()" function by discord.js for create what commands you want.<br />
I decide to use "speech" command to interact with te bot by a text.
```javascript
const commands = [
    new SlashCommandBuilder()
        .setName('speech')
        .setDescription('Write a text to speech')
        .addStringOption(option => 
            option.setName('text')
                .setDescription('text to speech')
                .setRequired(true)
        ),
].map(command => command.toJSON());
```

Then, send to bot the commands

```javascript
const { REST, Routes } = require('discord.js')

const rest = new REST().setToken(env.DISCORD_BOT_TOKEN);
(async () => {
    try {
        console.log('Start slash commands registration...');

        await rest.put(
            Routes.applicationCommands(env.DISCORD_CLIENT_ID),
            { body: commands }
        );

        console.log('Slash commands registrated succesfully!');
    } catch (error) {
        console.error(error);
    }
})()
```

<br /><br />
After that, it's time to create the client with permission we want:

```javascript
const { Client, GatewayIntentBits } = require('discord.js')

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});
```

Now, we need to manage the interactions:
```javascript
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice')
const fs = require('fs')

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return 

    let textToSpeech = interaction.options.getString('text')
    let wavFilePath = await generateSpeech(textToSpeech); // Function that call ElevenLabs API to generate AI voice by the text you sent

    switch (interaction.commandName)
    {
        case "speech":
            const voiceChannel = interaction.member.voice.channel;
            if (!voiceChannel) {
                interaction.reply('You must be in a vocal channel to run this command!');
                return;
            }
            
            if (!wavFilePath) {
                interaction.reply('Error throw audio file generation.');
                return;
            }

            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            });

            const player = createAudioPlayer();
            const resource = createAudioResource(wavFilePath);

            player.play(resource);
            connection.subscribe(player);

            player.on(AudioPlayerStatus.Idle, () => {
                connection.destroy();
                fs.unlinkSync(wavFilePath); // Delete "output.wav" after the command
            });

            interaction.reply('Text: ' + textToSpeech + '\nI hope was funny! :D')

            break
    }
});
```

The functions we need to get the voice and to convert .mpx3 file into .wav file are:
```javascript
async function generateSpeech(text) { // Function that use ElevenLabsAI API for generate voice by text sent
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${env.ELEVENLABS_VOICE_ID}`;
    const headers = {
        'Content-Type': 'application/json',
        'xi-api-key': env.ELEVENLABS_API_KEY,
    };
    const payload = {
        text: text,
        model_id: "eleven_multilingual_v2", // I use multilingual model, but you can choose what model you want
        voice_settings: {
            stability: 0.75,
            similarity_boost: 0.75,
        },
    };

    try {
        const response = await axios.post(url, payload, { headers, responseType: 'arraybuffer' });
        const audioBuffer = response.data;
        const audioFilePath = 'output.mp3';
        fs.writeFileSync(audioFilePath, audioBuffer);

        // Discord.js support .wav audio file, so we need to convert the file from ElevenLabs from .mp3 to .wav
        const wavFilePath = 'output.wav';
        await convertMp3ToWav(audioFilePath, wavFilePath);
        fs.unlinkSync(audioFilePath); // Delete "output.mp3" file, we don't need it

        return wavFilePath;
    } catch (error) {
        console.error('Errore nella chiamata API:', error);
        return null;
    }
}

function convertMp3ToWav(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .toFormat('wav')
            .on('end', () => resolve(outputPath))
            .on('error', (err) => reject(err))
            .save(outputPath);
    });
}
```

Last but not least, we need to login our bot by his token:

```javascript
client.login(env.DISCORD_BOT_TOKEN);
```

#  How to get Discord client ID and bot ID - Add it into your server!
Create a new bot into <a href="https://discord.com/developers/">Discord developer portal</a>

https://github.com/DevByFede/discord-AI-voice-bot/assets/175064645/4634244d-efd2-4925-b2a2-c1a9bfca36e3

<br /><br />
Get client & bot IDs

https://github.com/DevByFede/discord-AI-voice-bot/assets/175064645/00523d56-91c6-48a1-a880-cec3d1aa65a3

<br /><br />
Set bot's permissions and adding into your discord server where you have the permission to add an app by paste the copied url

https://github.com/DevByFede/discord-AI-voice-bot/assets/175064645/360b4222-775a-427c-80e0-1cd04cc60d1e

https://github.com/DevByFede/discord-AI-voice-bot/assets/175064645/a73ef7cb-1eb5-471c-a396-01dc2471b598

# Conclusion
We just need to open the terminal and inside our project folder run the command:
```
node index.js
```

# Demo - Sound on!🎧
https://github.com/DevByFede/discord-AI-voice-bot/assets/175064645/7688153d-a031-4e11-a34d-b7566d080f0d
