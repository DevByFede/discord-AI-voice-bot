const { REST, Routes, Client, GatewayIntentBits, SlashCommandBuilder } = require('discord.js')
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice')
const axios = require('axios')
const fs = require('fs')
const ffmpeg = require('fluent-ffmpeg')
const ffmpegStatic = require('ffmpeg-static')
const dotenv = require('dotenv')

const env = dotenv.config().parsed
ffmpeg.setFfmpegPath(ffmpegStatic) // Set ffmpeg path

// Bot's commands initialization
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

// Send commands to a discord client 
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
})();

// Bot initialization
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Manage bot interactions throw commands
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
        fs.unlinkSync(audioFilePath); // Delete "output.mp3" file

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

client.login(env.DISCORD_BOT_TOKEN);