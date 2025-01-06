import { defineCollection } from "astro:content";
import type { RenderedContent } from '../loader';
import { githubFileLoader } from "../loader";
import { createMarkdownProcessor } from "@astrojs/markdown-remark";
import type { MarkdownProcessor } from '@astrojs/markdown-remark';
import type { AstroConfig } from "astro";


const mdProcessors = new Map<AstroConfig, MarkdownProcessor>()
const md = async (text: string, config: AstroConfig): Promise<RenderedContent> => {
    const processor = (mdProcessors.has(config) ? mdProcessors.get(config) : mdProcessors.set(config, await createMarkdownProcessor(config.markdown)).get(config))!;

    const { code: html, metadata } = await processor.render(text);

    return {
        html,
        metadata
    }
}

export const collections = {
    gh: defineCollection({
        loader: githubFileLoader({
            username: 'namesakefyi',
            repo: 'policies',
            processors: {
                md
            }
        })
    })
}