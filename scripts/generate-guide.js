const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// File paths
const TOPICS_FILE = path.join(__dirname, '..', 'topics.json');
const GENERATED_TOPICS_FILE = path.join(__dirname, '..', 'generated-topics.json');
const GUIDES_DIR = path.join(__dirname, '..', '_guides');
const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images', 'guides');

// Ensure directories exist
if (!fs.existsSync(GUIDES_DIR)) {
  fs.mkdirSync(GUIDES_DIR, { recursive: true });
}
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Read topics and generated topics
function loadTopics() {
  const topics = JSON.parse(fs.readFileSync(TOPICS_FILE, 'utf-8'));
  const generatedTopics = JSON.parse(fs.readFileSync(GENERATED_TOPICS_FILE, 'utf-8'));
  return { topics, generatedTopics };
}

// Save generated topics
function saveGeneratedTopics(generatedTopics) {
  fs.writeFileSync(GENERATED_TOPICS_FILE, JSON.stringify(generatedTopics, null, 2));
}

// Select next topic
function selectNextTopic(topics, generatedTopics) {
  const unusedTopics = topics.filter(
    topic => !generatedTopics.includes(topic.title)
  );

  if (unusedTopics.length === 0) {
    // All topics used, reset and start over
    console.log('All topics have been used. Resetting...');
    return topics[Math.floor(Math.random() * topics.length)];
  }

  return unusedTopics[Math.floor(Math.random() * unusedTopics.length)];
}

// Generate guide content using Claude
async function generateGuideContent(topic) {
  const prompt = `Create an educational guide about "${topic.title}" for an AI learning website.

The guide should be:
- Written in an Instructables-style format: clear, step-by-step, and approachable
- Appropriate for ${topic.difficulty} level readers
- Use everyday analogies and examples to explain concepts
- Include practical applications where relevant
- Be engaging and easy to follow

Structure the guide with these sections:
1. Introduction (2-3 sentences explaining what the reader will learn)
2. Prerequisites (if any, or state "No prerequisites needed")
3. Step-by-step explanation with clear headers (3-5 main sections)
4. Real-world examples or analogies
5. Try It Yourself (practical suggestions or thought experiments)
6. Key Takeaways (bullet points summarizing main concepts)
7. Further Reading (2-3 suggestions for learning more)

Write in Markdown format. Use headers (##, ###), bullet points, numbered lists, and **bold** for emphasis.
Do NOT include the front matter (YAML) - only the content body.
Keep the tone friendly, educational, and encouraging.`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ]
  });

  return message.content[0].text;
}

// Create filename from title
function createFilename(title) {
  const date = new Date().toISOString().split('T')[0];
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${date}-${slug}.md`;
}

// Generate guide description from title
function generateDescription(title, difficulty) {
  const starters = {
    beginner: 'A beginner-friendly introduction to',
    intermediate: 'Learn about',
    advanced: 'A deep dive into'
  };
  return `${starters[difficulty]} ${title.toLowerCase()}`;
}

// Generate image search query from topic
function generateImageQuery(topic) {
  // Extract main keywords for image search
  const keywords = topic.tags.slice(0, 2).join(' ');
  return `artificial intelligence ${keywords} technology`;
}

// Fetch and download image from Unsplash
async function fetchAndSaveImage(topic) {
  try {
    const query = generateImageQuery(topic);
    const slug = topic.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const filename = `${slug}.jpg`;
    const filepath = path.join(IMAGES_DIR, filename);

    // Check if image already exists
    if (fs.existsSync(filepath)) {
      console.log(`Image already exists: ${filename}`);
      return {
        path: `/assets/images/guides/${filename}`,
        credit: 'Unsplash',
        credit_url: 'https://unsplash.com'
      };
    }

    console.log(`Fetching image for: ${query}`);

    // Use Unsplash API if key is provided, otherwise use source API
    let imageUrl;
    let photographerName = 'Unsplash';
    let photographerUrl = 'https://unsplash.com';

    if (process.env.UNSPLASH_ACCESS_KEY) {
      // Use official Unsplash API
      const response = await axios.get('https://api.unsplash.com/search/photos', {
        params: {
          query: query,
          per_page: 1,
          orientation: 'landscape'
        },
        headers: {
          'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`
        }
      });

      if (response.data.results && response.data.results.length > 0) {
        const photo = response.data.results[0];
        imageUrl = photo.urls.regular;
        photographerName = photo.user.name;
        photographerUrl = photo.user.links.html;
      }
    }

    // Fallback to Unsplash Source API (no auth required, but less control)
    if (!imageUrl) {
      imageUrl = `https://source.unsplash.com/1200x600/?${encodeURIComponent(query)}`;
    }

    // Download image
    const imageResponse = await axios.get(imageUrl, {
      responseType: 'arraybuffer'
    });

    fs.writeFileSync(filepath, imageResponse.data);
    console.log(`Image saved: ${filename}`);

    return {
      path: `/assets/images/guides/${filename}`,
      credit: photographerName,
      credit_url: photographerUrl
    };
  } catch (error) {
    console.error('Error fetching image:', error.message);
    // Return null if image fetch fails - guide will work without image
    return null;
  }
}

// Create guide file
async function createGuideFile(topic, content, imageData) {
  const filename = createFilename(topic.title);
  const filepath = path.join(GUIDES_DIR, filename);

  const date = new Date().toISOString().split('T')[0];
  const description = generateDescription(topic.title, topic.difficulty);

  // Estimate reading time (rough: 200 words per minute)
  const wordCount = content.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200);

  // Build front matter with optional image data
  let frontMatter = `---
layout: guide
title: "${topic.title}"
date: ${date}
difficulty: ${topic.difficulty}
tags: [${topic.tags.map(tag => `"${tag}"`).join(', ')}]
description: "${description}"
estimated_time: "${readingTime} min read"`;

  if (imageData) {
    frontMatter += `
image: "${imageData.path}"
image_credit: "${imageData.credit}"
image_credit_url: "${imageData.credit_url}"`;
  }

  frontMatter += `
---

`;

  const fullContent = frontMatter + content;
  fs.writeFileSync(filepath, fullContent);

  console.log(`Created guide: ${filename}`);
  return filename;
}

// Main function
async function main() {
  try {
    console.log('Starting guide generation...');

    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }

    // Load topics
    const { topics, generatedTopics } = loadTopics();
    console.log(`Loaded ${topics.length} topics, ${generatedTopics.length} already generated`);

    // Select topic
    const topic = selectNextTopic(topics, generatedTopics);
    console.log(`Selected topic: ${topic.title} (${topic.difficulty})`);

    // Generate content
    console.log('Generating content with Claude...');
    const content = await generateGuideContent(topic);

    // Fetch image
    console.log('Fetching image...');
    const imageData = await fetchAndSaveImage(topic);

    // Create guide file
    const filename = await createGuideFile(topic, content, imageData);

    // Update generated topics
    if (!generatedTopics.includes(topic.title)) {
      generatedTopics.push(topic.title);
      saveGeneratedTopics(generatedTopics);
    }

    console.log('Guide generation complete!');
    console.log(`Total guides generated: ${generatedTopics.length}/${topics.length}`);

  } catch (error) {
    console.error('Error generating guide:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
