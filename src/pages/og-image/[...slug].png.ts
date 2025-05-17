import RobotoMonoBold from "@/assets/roboto-mono-700.ttf";
import RobotoMono from "@/assets/roboto-mono-regular.ttf";
import { getAllPosts } from "@/data/post";
import { siteConfig } from "@/site.config";
import { getFormattedDate } from "@/utils/date";
import { Resvg } from "@resvg/resvg-js";
import type { APIContext, InferGetStaticPropsType } from "astro";
import satori, { type SatoriOptions } from "satori";
import { html } from "satori-html";

const ogOptions: SatoriOptions = {
	// debug: true,
	fonts: [
		{
			data: Buffer.from(RobotoMono),
			name: "Roboto Mono",
			style: "normal",
			weight: 400,
		},
		{
			data: Buffer.from(RobotoMonoBold),
			name: "Roboto Mono",
			style: "normal",
			weight: 700,
		},
	],
	height: 630,
	width: 1200,
};

const markup = (title: string, pubDate: string, description: string) =>
	html`<div tw="flex flex-col w-full h-full bg-[#eff1f5] text-[#4c4f69]">
		<div tw="flex flex-col flex-1 w-full p-10 justify-center">
			<p tw="text-2xl mb-6 text-[#7287fd]">${pubDate}</p>
			<h1 tw="text-6xl font-bold leading-snug text-[#4c4f69]">${title}</h1>
			<p tw="text-sm mt-2 text-[#5c5f77] text-justify">${description}</p>
		</div>
		<div tw="flex items-center justify-between w-full p-10 border-t border-[#dce0e8] text-xl">
			<img src="https://blog.king-11.dev/icon.jpeg" width="128" height="128" />
			<div tw="flex flex-col items-end">
				<p tw="font-semibold text-[#4c4f69]">${siteConfig.title}</p>
				<p tw="text-[#5c5f77]">by ${siteConfig.author}</p>
			</div>
		</div>
	</div>`;

type Props = InferGetStaticPropsType<typeof getStaticPaths>;

export async function GET(context: APIContext) {
	const { pubDate, title, description } = context.props as Props;
	console.info(description);

	const postDate = getFormattedDate(pubDate, {
		month: "long",
		weekday: "long",
	});
	const svg = await satori(markup(title, postDate, description), ogOptions);
	const png = new Resvg(svg).render().asPng();
	return new Response(png, {
		headers: {
			"Cache-Control": "public, max-age=31536000, immutable",
			"Content-Type": "image/png",
		},
	});
}

export async function getStaticPaths() {
	const posts = await getAllPosts();
	return posts
		.filter(({ data }) => !data.ogImage)
		.map((post) => ({
			params: { slug: post.id },
			props: {
				pubDate: post.data.updatedDate ?? post.data.publishDate,
				title: post.data.title,
				description: post.data.description ?? "",
			},
		}));
}
