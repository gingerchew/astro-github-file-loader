# Astro Github File Loader

> Load files stored in a Github Repository into your Astro Content Layer

## How to use

Check out the example in src/pages/[...name].astro to see it in action.

```ts
import { defineCollection } from 'astro:content';
import { githubFileLoader } from 'astro-github-file-loader';

export const collections = {
    policies: defineCollection({
        loader: githubFileLoader({
            username: 'your-username',
            repo: 'your-repo',
            processors: {
                md: yourMarkdownProcessor
            }
        })
    })
}
```

### How do processors work?

Since GitHub can store any file, the processor object is passed in to be more flexible. For example, you could have a `frequent-configs` repo that has a mix of `.yaml`, `.toml`, and `.md` files.

The GithubFileLoader fetches each file from the repo as text and then passes it to the processors to generate things like html, headings, image paths, etc. The object that it returns is then used in [the `rendered` field of the data store.](https://docs.astro.build/en/reference/content-loader-reference/#rendered) This makes it possible to use Astro to render the final content. Here is an example for how a markdown processor might look.

```ts
import { yourMarkdownEngineOfChoice } from '...';

const engine = new yourMarkdownEngineOfChoice()
/**
 * @param {string} text - The text of the file from the GitHub repo
 * @param {AstroConfig} config - The AstroConfig available in the LoaderContext
 */
async function myMarkdownProcessor(text: string, config: AstroConfig): Promise<RenderedContent> {
    const html = engine.render(text);
    const headings: MarkdownHeading[] = engine.getHeadings(text);
    const frontmatter: Record<string, any> = engine.getFrontMatter(text);
    const imagePaths: string[] = engine.images(text);

    return {
        html,
        metadata: {
            headings,
            frontmatter,
            imagePaths,
        }
    }
}
```

The metadata object contains things like headings, frontmatter, imagePaths, and anything else you want. If you try to render a file without adding the appropriate processor, then it GithubFileLoader will return a RenderedContent object that looks like this:

```ts
{
    html: '',
    metadata: {
        error: 'No processor was found for the extension: .'+extension+', Did you forget to add one?'
    }
}
```

The text fetched from GitHub is used as the body in the data store, meaning the raw result is always available to you.

## Example:

```astro
---
import { getEntry, render } from 'astro:content';
import TableOfContents from '../your/components/TableOfContents.astro';

// The collection name is defined by you
// The entry name is the path to the file without the extension
const entry = await getEntry('ghfiles', 'legal/privacy-policy');

const { username, repo, extension, id } = entry.data;
const { Content, headings } = await render(entry);
---

<Layout>
    <div>
        A file from the {repo} by GitHub user {username}: {id}.{extension}
    </div>
    <TableOfContents headings={headings}>
    <Content />
</Layout>
```