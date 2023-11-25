import { Routes } from 'discord-api-types/v10';

import { autoRetry } from "@grammyjs/auto-retry";
import { Bot, InputMediaBuilder } from "grammy";
import MarkdownIt from 'markdown-it';

const disable = ["replacements", "smartquotes", "table", "fence", "blockquote", "hr", "list", "reference", "heading", "lheading", "html_block", "escape", "strikethrough", "image", "html_inline", "entity"];
const enable = ["normalize", "block", "inline", "linkify", "autolink", 'link', 'backticks', 'emphasis', "paragraph", "text", "newline"]

const md = new MarkdownIt({ linkify: true, breaks: false, })
	.enable(enable)
	.disable(disable)

const customRender = (tokens, idx, options, env, self) => {
	// Check if it's an opening paragraph tag
	if (tokens[idx].type === 'paragraph_open') {
		// Return an empty string for the opening tag
		return '';
	}

	// Check if it's a closing paragraph tag
	if (tokens[idx].type === 'paragraph_close') {
		// Return an empty string for the closing tag
		return '\n\n';
	}

	// Use the default rendering for other tokens
	return self.renderToken(tokens, idx, options, env, self);
};

// Add the custom render function to the renderer
md.renderer.rules['paragraph_open'] = customRender;
md.renderer.rules['paragraph_close'] = customRender;




const parseData = (discordApi, env) => [
	{
		type: 'mention',
		regExp: /<@(\d+)>/g,
		process: async (id) => {
			const data = await discordApi(Routes.user(id), { authPrefix: '' })
			return data.global_name
		}
	},
	{
		type: 'role',
		regExp: /<@&(\S+)>/g,
		process: async (roleID) => {
			return discordApi(Routes.guild(env.DISCORD_GUILD_ID))
				.then((data) => {
					const role = data.roles.find(r => r.id === roleID)
					return `[${role.name}]`
				})
				.catch(() => "[unknown_role]")

		},
	},
	{
		type: 'channel',
		regExp: /<#(\d+)>/g,
		process: (id) => {
			return discordApi(Routes.channel(id))
				.then((data) => {
					return `[#${data.name}](https://discord.com/channels/${env.DISCORD_GUILD_ID}/${id})`
				})
				.catch((errr) => {
					return `[no_access]((https://discord.com/channels/${env.DISCORD_GUILD_ID}/${id})`;
				})
		},
	},
	{
		type: 'namadaEmoji',
		regExp: /<:Namada.*?:(\d+)>/g,
		process: () => '🟡'
	}
]
async function constructMessage(message, dsApi, env) {
	for (const pr of parseData(dsApi, env)) {
		const matches = message.match(pr.regExp);
		if (matches) {
			for (const match of matches) {
				const [id] = match.match(/\d+/)
				const text = await pr.process(id)
				message = message.replace(match, text);
			}
		}
	}
	return message
}
function DiscordApi(token) {
	return (url) => fetch(`https://discord.com/api/v10/${url}`, { headers: { "Authorization": token } }).then(res => res.json())
}

export default async function main(CACHE, env) {

	const discordApi = DiscordApi(env.DISCORD_API_TOKEN)

	const bot = new Bot(env.TELEGRAM_TOKEN);
	bot.api.config.use(autoRetry());
	const messages = await discordApi(Routes.channelMessages(env.DISCORD_CHAT_ID))

	for (const message of messages.reverse()) {
		try {
			if (await CACHE.get(`message:${message.id}`)) {
				continue
			}
			let parsedMsg = await constructMessage(message.content, discordApi, env);
			const images = [];

			message.attachments.forEach((attachment) => {
				if (attachment.content_type.startsWith("image"))
					return images.push(attachment.url);
			});

			if (images.length) {
				await bot.api.sendMediaGroup(
					env.TELEGRAM_CHAT_ID,
					images.map((image) => InputMediaBuilder.photo(image))
				).catch(error => console.error(`Can not send image, ${JSON.stringify(error)}`));
			}

			if (parsedMsg.length) {
				const formatedData = new Date(message.timestamp).toLocaleDateString('en-US', {
					day: 'numeric',
					month: 'long',
					year: 'numeric'
				})
				parsedMsg += `\n\nAuthor: ${message.author.global_name}`
				parsedMsg += `\nDate: ${formatedData} `
				parsedMsg += `\n[Original discord message](https://discord.com/${env.GUILD_ID}/${env.CHAT_ID}/${message.id})`

				parsedMsg = parsedMsg.replace(/@(\w+)/g, '`@$1`');

				const parsedDiscordMsg = parsedMsg

				const html = md.render(parsedDiscordMsg)


				try {
					await bot.api.sendMessage(env.TELEGRAM_CHAT_ID, html, { parse_mode: 'HTML' });
					console.log(`message:${message.id} sent`)
				} catch (e) {
					console.log(e)
					console.log('send raw message')
					await bot.api.sendMessage(env.TELEGRAM_CHAT_ID, parsedMsg);
					console.log(`message:${message.id} sent`)
				}
			}
			await CACHE.put(`message:${message.id}`, true)
			await new Promise(resolve => setTimeout(resolve, 5000))

		} catch (e) {
			console.log('error')
			console.error(e)
		}
	}
}
