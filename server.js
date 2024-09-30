const axios = require('axios');
const cheerio = require('cheerio');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

async function downloadVideo(link) {
    try {
        const response = await axios.post('https://ssstik.io/abc', new URLSearchParams({
            id: link,
            locale: 'en',
            tt: 'cndESzJk'
        }), {
            params: { url: 'dl' },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Origin': 'https://ssstik.io',
                'Referer': 'https://ssstik.io/en'
            },
            timeout: 30000
        });

        const $ = cheerio.load(response.data);
        return $('.splide__list').length
            ? $('ul.splide__list li.splide__slide a.download_link').map((i, el) => $(el).attr('href')).get()
            : $('a').attr('href');
    } catch (error) {
        console.error(`Error downloading video: ${error.message}`);
        return null;
    }
}

const bot = new TelegramBot('7400198184:AAFW9rcw6wVhne9DZHdfp78G6JeWkN_2jLY', { polling: true });
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "Welcome! send a TikTok URL to download.");
});

bot.on('message', async (msg) => {
    if (msg.text === '/start') return;
    const videoUrl = msg.text;
    if (!videoUrl.startsWith('https://www.tiktok.com/') && !videoUrl.startsWith('https://vt.tiktok.com/')) {
        await bot.sendMessage(msg.chat.id, "Please send a valid TikTok video URL.");
        return;
    }
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
    };
    const downloadLinks = await downloadVideo(videoUrl);
    if (!downloadLinks) {
        await bot.sendMessage(msg.chat.id, "Sorry, I couldn't download the media. Please try again later.");
        return;
    }
    try {
        if (typeof downloadLinks === 'string') {
            await bot.sendMessage(msg.chat.id, `Here's your video:\n${downloadLinks}`);
            const videoData = await axios.get(downloadLinks, { headers, responseType: 'arraybuffer' });
            await bot.sendVideo(msg.chat.id, videoData.data);
            await bot.deleteMessage(msg.chat.id, msg.message_id);
        } else if (Array.isArray(downloadLinks)) {
            await bot.sendMessage(msg.chat.id, "Here are the images from the TikTok post:");
            for (const link of downloadLinks) {
                const imageData = await axios.get(link, { headers, responseType: 'arraybuffer' });
                await bot.sendPhoto(msg.chat.id, imageData.data);
            }
            await bot.deleteMessage(msg.chat.id, msg.message_id);
        }
    } catch (error) {
        await bot.sendMessage(msg.chat.id, "We're having trouble sending your media. Please try again later.");
    }
});

const app = express();
const PORT = 3003;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});