const fs = require('fs').promises;
const path = require('path');

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const TOPICS_FILE = path.join(__dirname, '..', 'topics.json');
const GENERATED_TOPICS_FILE = path.join(__dirname, '..', 'generated-topics.json');
const GUIDES_DIR = path.join(__dirname, '..', '_guides');

const SYSTEM_PROMPT = `You are creating educational content for Craftsman Leadership, a government contracting education platform founded by Dr. Jesse W. Johnson, DSL, MAOM - who holds a Doctorate in Strategic Leadership from Regent University and has over 25 years of experience in Air Force acquisition and innovation.
Write in Dr. Johnson's direct, no-nonsense voice. Every piece of content should reinforce the three-tier strategic framework: Strategic Foundations (Think), Operational Leadership (Lead), and Tactical Execution (Do). Start with strategic context, include buyer perspective from Air Force experience, provide actionable guidance, and end with strategic takeaways.

Key principles: Partners not products, strategic patience, innovation within constraints, values-based decisions. Write 1500-2500 word guides that transform how people think about government contracting.`;

async function loadTopics() {
  try {
    const data = await fs.readFile(TOPICS_FILE, 'utf8');
    const json = JSON.parse(data);
    return json.topics || [];
  } catch (error) {
    console.error('Error loading topics:', error);
    return [];
  }
}

async function loadGeneratedTopics() {
  try {
    const data = await fs.readFile(GENERATED_TOPICS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function saveGeneratedTopics(topics) {
  await fs.writeFile(GENERATED_TOPICS_FILE, JSON.stringify(topics, null, 2));
}

async function selectUnusedTopic(topics, generatedTopics) {
  const unusedTopics = topics.filter(topic => 
    !generatedTopics.some(gen => gen.title === topic.title)
  );
  
  if (unusedTopics.length === 0) {
    console.log('All topics have been generated! Resetting...');
    await saveGeneratedTopics([]);
    return topics[Math.floor(Math.random() * topics.length)];
  }
  
  return unusedTopics[Math.floor(Math.random() * unusedTopics.length)];
}

async function generateGuide(topic) {
  const prompt = `Create a comprehensive guide on: "${topic.title}"

Difficulty Level: ${topic.difficulty}
Strategic Tier: ${topic.tier}
Tags: ${topic.tags.join(', ')}

Write this guide following the Craftsman Leadership framework and voice.`;

  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NVIDIA_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'meta/llama-3.1-70b-instruct',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 4000
    })
  });

  if (!response.ok) {
    throw new Error(`NVIDIA API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

function createSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function saveGuide(topic, content) {
  const slug = createSlug(topic.title);
  const filename = `${slug}.md`;
  const filepath = path.join(GUIDES_DIR, filename);
  
  const frontMatter = `---
layout: guide
title: "${topic.title}"
difficulty: ${topic.difficulty}
tier: ${topic.tier}
tags: [${topic.tags.map(t => `"${t}"`).join(', ')}]
date: ${new Date().toISOString().split('T')[0]}
author: "Dr. Jesse W. Johnson, DSL, MAOM"
---

`;

  await fs.mkdir(GUIDES_DIR, { recursive: true });
  await fs.writeFile(filepath, frontMatter + content);
  
  console.log(`✓ Guide saved: ${filename}`);
  return filename;
}

async function main() {
  if (!NVIDIA_API_KEY) {
    console.error('Error: NVIDIA_API_KEY environment variable not set');
    process.exit(1);
  }

  console.log('Loading topics...');
  const topics = await loadTopics();
  const generatedTopics = await loadGeneratedTopics();
  
  console.log(`Total topics: ${topics.length}`);
  console.log(`Generated: ${generatedTopics.length}`);
  console.log(`Remaining: ${topics.length - generatedTopics.length}`);
  
  const topic = await selectUnusedTopic(topics, generatedTopics);
  console.log(`\nGenerating guide: "${topic.title}"`);
  console.log(`Difficulty: ${topic.difficulty} | Tier: ${topic.tier}`);
  
  const content = await generateGuide(topic);
  const filename = await saveGuide(topic, content);
  
  generatedTopics.push({
    title: topic.title,
    filename: filename,
    date: new Date().toISOString()
  });
  
  await saveGeneratedTopics(generatedTopics);
  
  console.log('\n✓ Guide generation complete!');
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
