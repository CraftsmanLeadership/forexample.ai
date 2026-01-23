const axios = require('axios');
const fs = require('fs');
const path = require('path');

// NVIDIA API Configuration
const NVIDIA_API_BASE = 'https://integrate.api.nvidia.com/v1';
const NVIDIA_MODEL = 'meta/llama-3.1-70b-instruct'; // Free tier model

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

// Generate guide content using NVIDIA API
async function generateGuideContent(topic) {
  const prompt = `Create an educational guide about "${topic.title}" for an AI learning website called "For Example AI".

WRITING STYLE & PERSONALITY:
- Write with personality! Be conversational, enthusiastic, and human
- Use "I" and "we" occasionally to create connection with readers
- Include personal observations, opinions, or insights where appropriate
- Share why YOU think this topic is interesting or important
- Use humor sparingly but effectively
- Show passion for teaching - let your excitement about AI shine through
- Write like you're explaining to a curious friend over coffee, not lecturing
- Appropriate for ${topic.difficulty} level readers

VISUAL FORMATTING:
- Use callout boxes for important points: > **💡 Pro Tip:** for tips, > **⚠️ Watch Out:** for warnings, > **🎯 Key Insight:** for key concepts
- Add emojis strategically in headers and callouts to add visual interest
- Use **bold** liberally for emphasis
- Create variety in section structure

CONTENT STRUCTURE:
1. Introduction (2-3 sentences with personality - hook the reader!)
2. Prerequisites (if any, or state "No prerequisites needed")
3. Step-by-step explanation with clear headers (3-5 main sections with varied formatting)
4. Real-world examples with personal commentary on why they matter
5. Try It Yourself (practical, specific suggestions)
6. Key Takeaways (bullet points)
7. Further Reading (2-3 ACTUAL RESOURCES with real URLs as markdown links)

FURTHER READING FORMAT:
Make these REAL, CLICKABLE links to actual resources. Format as:
- [Resource Title](https://actual-url.com) - Brief description of what it offers

Example:
- [3Blue1Brown Neural Networks](https://www.youtube.com/playlist?list=PLZHQObOWTQDNU6R1_67000Dx_ZCJB-3pi) - Excellent visual explanation series
- [Fast.ai Practical Deep Learning](https://course.fast.ai/) - Free hands-on course

Write in Markdown format. Do NOT include the front matter (YAML) - only the content body.
Be friendly, be human, be helpful!`;

  try {
    const response = await axios.post(
      `${NVIDIA_API_BASE}/chat/completions`,
      {
        model: NVIDIA_MODEL,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        top_p: 1,
        max_tokens: 4096
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('NVIDIA API Error:', error.response?.data || error.message);
    throw error;
  }
}

// Find related guides based on shared tags
function findRelatedGuides(topic, maxRelated = 3) {
  try {
    const guides = fs.readdirSync(GUIDES_DIR)
      .filter(file => file.endsWith('.md'))
      .map(file => {
        const content = fs.readFileSync(path.join(GUIDES_DIR, file), 'utf-8');
        const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (!frontMatterMatch) return null;

        const frontMatter = frontMatterMatch[1];
        const titleMatch = frontMatter.match(/title:\s*"(.+?)"/);
        const tagsMatch = frontMatter.match(/tags:\s*\[(.*?)\]/);

        if (!titleMatch) return null;

        const title = titleMatch[1];
        const tags = tagsMatch ? tagsMatch[1].split(',').map(t => t.trim().replace(/"/g, '')) : [];

        return { title, tags, file };
      })
      .filter(guide => guide !== null);

    // Calculate relevance score based on shared tags
    const scoredGuides = guides
      .map(guide => {
        const sharedTags = guide.tags.filter(tag => topic.tags.includes(tag));
        return {
          ...guide,
          score: sharedTags.length
        };
      })
      .filter(guide => guide.score > 0 && guide.title !== topic.title)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxRelated);

    return scoredGuides.map(guide => ({
      title: guide.title,
      url: `/guides/${guide.file.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '')}/`
    }));
  } catch (error) {
    console.error('Error finding related guides:', error.message);
    return [];
  }
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

  // Find related guides
  const relatedGuides = findRelatedGuides(topic);

  // Add related guides section if any found
  if (relatedGuides.length > 0) {
    content += `\n\n## Related Guides\n\n`;
    content += `Want to learn more? Check out these related guides:\n\n`;
    relatedGuides.forEach(guide => {
      content += `- [${guide.title}](${guide.url})\n`;
    });
  }

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
  if (relatedGuides.length > 0) {
    console.log(`Added ${relatedGuides.length} related guide links`);
  }
  return filename;
}

// Main function
async function main() {
  try {
    console.log('Starting guide generation...');

    // Check for API key
    if (!process.env.NVIDIA_API_KEY) {
      throw new Error('NVIDIA_API_KEY environment variable is not set');
    }

    // Load topics
    const { topics, generatedTopics } = loadTopics();
    console.log(`Loaded ${topics.length} topics, ${generatedTopics.length} already generated`);

    // Select topic
    const topic = selectNextTopic(topics, generatedTopics);
    console.log(`Selected topic: ${topic.title} (${topic.difficulty})`);

    // Generate content
    console.log('Generating content with NVIDIA API...');
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
