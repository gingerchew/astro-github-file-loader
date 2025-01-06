import type { AstroConfig, MarkdownHeading } from "astro";
import type { Loader, LoaderContext } from "astro/loaders";

type GithubTreeLeaf = {
    path: string;
    mode: string;
    type: "tree" | "blob"; // tree is a directory, blob is a file
    sha: string;
    url: string;
}

type GithubTreeData = {
    url: string;
    hash: string;
    tree: GithubTreeLeaf[];
}
// Taken from astro content.d.ts
export interface RenderedContent {
	html: string;
	metadata?: {
		headings?: MarkdownHeading[];
		frontmatter?: Record<string, any>;
		imagePaths?: Array<string>;
		[key: string]: unknown;
	};
}

type ProcessorFileExtension = string;

type Processors = Record<ProcessorFileExtension, (str: string, config: AstroConfig) => Promise<RenderedContent>> 

interface PolicyLoaderConfig {
	username: string;
	repo: string;
	processors: Processors
}

function createProcessors(processors: Processors) {
	return new Proxy(processors, {
		get(target, key: keyof Processors) {
			return key in target ? async (str: string, c: AstroConfig) => await target[key](str, c) : (_str: string, _c: AstroConfig) => ({
				html: '',
				metadata: {
					error: `Could not find procesor for extension: .${key}, are you sure you passed one in?`
				}
			})
		}
	})
}

export function githubFileLoader({ username, repo, processors }: PolicyLoaderConfig): Loader {
    const gitTreeUrl =
        `https://api.github.com/repos/${username}/${repo}/git/trees/main?recursive=1`;
    const url = `https://raw.githubusercontent.com/${username}/${repo}/main/`;

    const get = async <T>(url: string, type: "json" | "text"): Promise<T> => {
        const result = await fetch(url);
        const final = await result[type]();
        return final;
    };

    return {
		name: "github-file-loader",
        load: async ({ generateDigest, store, config }: LoaderContext) => {
			
			const { tree } = await get<GithubTreeData>(gitTreeUrl, "json");
			console.log(tree);
			let $ = createProcessors(processors);
            for await (const leaf of tree) {
                // Can't do anything with a directory
                if (leaf.type === "tree") continue;
				// Get whatever the file is as text
                const body = await get<string>(url + leaf.path, "text");				
                const digest = generateDigest(body);
				
                const [id, extension] = leaf.path.split(".");
				const { html, metadata } = await $[extension as keyof Processors](body, config);
				console.log({ html, metadata, id, extension });
                store.set({
                    id,
                    // Need to pass an empty object to appease the typescript gods
                    data: {
						id,
						extension,
						username,
						repo,
					},
                    body,
                    rendered: {
                        html,
                        metadata,
                    },
                    digest,
                });
            }
        },
    };
}
