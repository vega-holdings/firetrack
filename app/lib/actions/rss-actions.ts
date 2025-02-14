"use server";

import { revalidatePath } from "next/cache";
import Parser from "rss-parser";
import { z } from "zod";

const parser = new Parser();

// Zod schema for RSS feed
const rssFeedSchema = z.object({
  url: z.string().url(),
  name: z.string().optional(),
  description: z.string().optional(),
});

export type RSSFeed = z.infer<typeof rssFeedSchema>;

// Type for RSS feed items
export type RSSItem = {
  title: string;
  link: string;
  content?: string;
  contentSnippet?: string;
  pubDate?: string;
  categories?: string[];
};

// Server action to fetch and parse RSS feed
export async function fetchRSSFeed(formData: FormData) {
  try {
    const url = formData.get("url");
    const result = rssFeedSchema.safeParse({ url });

    if (!result.success) {
      return { error: "Invalid RSS feed URL" };
    }

    const feed = await parser.parseURL(result.data.url);
    
    // Transform feed items to our format
    const items = feed.items.map(item => ({
      title: item.title || "",
      link: item.link || "",
      content: item.content,
      contentSnippet: item.contentSnippet,
      pubDate: item.pubDate,
      categories: item.categories,
    }));

    return {
      success: true,
      data: {
        title: feed.title,
        description: feed.description,
        link: feed.link,
        items,
      },
    };
  } catch (error) {
    console.error("Failed to fetch RSS feed:", error);
    return { error: "Failed to fetch RSS feed" };
  }
}

// Mock function to analyze RSS content with LLM
async function analyzeRSSContent(content: string): Promise<string> {
  // In production, this would call a real LLM API
  return "This article discusses proposed firearm legislation...";
}

// Server action to analyze RSS feed item
export async function analyzeRSSItem(formData: FormData) {
  try {
    const content = formData.get("content");
    if (!content || typeof content !== "string") {
      return { error: "No content provided" };
    }

    const analysis = await analyzeRSSContent(content);

    return {
      success: true,
      data: {
        analysis,
      },
    };
  } catch (error) {
    console.error("Failed to analyze RSS content:", error);
    return { error: "Failed to analyze RSS content" };
  }
}

// Server action to fetch multiple RSS feeds
export async function fetchMultipleRSSFeeds(feeds: RSSFeed[]) {
  try {
    const results = await Promise.allSettled(
      feeds.map(async (feed) => {
        try {
          const parsedFeed = await parser.parseURL(feed.url);
          return {
            url: feed.url,
            name: feed.name,
            items: parsedFeed.items.map(item => ({
              title: item.title || "",
              link: item.link || "",
              content: item.content,
              contentSnippet: item.contentSnippet,
              pubDate: item.pubDate,
              categories: item.categories,
            })),
          };
        } catch (error) {
          console.error(`Failed to fetch RSS feed ${feed.url}:`, error);
          return null;
        }
      })
    );

    const successfulFeeds = results
      .map((result, index) => {
        if (result.status === "fulfilled" && result.value) {
          return result.value;
        }
        console.error(`Failed to fetch RSS feed ${feeds[index].url}`);
        return null;
      })
      .filter((feed): feed is NonNullable<typeof feed> => feed !== null);

    return {
      success: true,
      data: {
        feeds: successfulFeeds,
      },
    };
  } catch (error) {
    console.error("Failed to fetch RSS feeds:", error);
    return { error: "Failed to fetch RSS feeds" };
  }
}
