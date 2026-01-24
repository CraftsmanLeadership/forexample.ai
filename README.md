# For Example AI

An AI education website that automatically generates and publishes step-by-step guides on AI topics. Built with Jekyll and powered by NVIDIA's free AI models, new educational content is automatically created and deployed on every commit.

## Features

- **Automatic Content Generation**: AI-powered guide generation using NVIDIA's free Llama 3.1 70B model
- **Daily Publishing**: New guides automatically generated and published every day
- **Link Validation**: Automatic checking of external links to ensure quality resources
- **Visual Engagement**: Automatic image fetching from Unsplash for each guide
- **Instructables-Style Design**: Clear, step-by-step guides with approachable language
- **Difficulty Levels**: Beginner, Intermediate, and Advanced topics
- **Cross-Linking**: Related guides automatically linked based on shared topics
- **Responsive Design**: Works beautifully on desktop and mobile
- **Search & Filter**: Find guides by difficulty level or search keywords
- **GitHub Pages Deployment**: Automatically deployed and hosted for free

## Live Site

Visit the site at: [https://forexample.ai](https://forexample.ai) (configure your domain)

## How It Works

1. Every day at 10:00 AM UTC, a GitHub Actions workflow automatically runs
2. The workflow runs a Node.js script that:
   - Selects an unused topic from the curated list (50+ topics available)
   - Calls NVIDIA's free API to generate an educational guide
   - Validates all external links to ensure quality resources
   - Fetches a relevant image from Unsplash
   - Finds related guides based on shared tags
   - Creates a markdown file with proper front matter and image attribution
   - Commits the new guide back to the repository
3. GitHub Pages automatically rebuilds and deploys the updated site

You can also trigger generation manually or on every push to main branch.

## Setup Instructions

### Prerequisites

- Node.js 20 or higher
- A GitHub account
- A free NVIDIA API key ([get one here](https://build.nvidia.com/))

### Getting Your Free NVIDIA API Key

1. Visit [build.nvidia.com](https://build.nvidia.com/)
2. Click "Get API Key" or sign in with your NVIDIA account (free to create)
3. Navigate to any model page (e.g., "meta/llama-3.1-70b-instruct")
4. Click "Get API Key" button
5. Copy your API key - you'll use this for both local development and GitHub

**Note**: NVIDIA's API is completely free with generous rate limits - no credit card required!

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/forexample.ai.git
   cd forexample.ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install Jekyll** (for local preview)
   ```bash
   gem install bundler jekyll
   ```

4. **Set up your API key**
   ```bash
   export NVIDIA_API_KEY='your-api-key-here'
   ```

5. **Generate a guide locally** (optional)
   ```bash
   npm run generate
   ```

6. **Run Jekyll locally**
   ```bash
   jekyll serve
   ```
   Visit `http://localhost:4000` to preview the site

### GitHub Setup

1. **Create a new repository**
   - Create a new repository on GitHub
   - Name it `forexample.ai` (or your preferred name)

2. **Add your NVIDIA API key as a secret**
   - Go to repository Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NVIDIA_API_KEY`
   - Value: Your free NVIDIA API key from build.nvidia.com
   - Click "Add secret"

3. **Push your code**
   ```bash
   git remote add origin https://github.com/yourusername/forexample.ai.git
   git branch -M main
   git push -u origin main
   ```

4. **Enable GitHub Pages**
   - Go to repository Settings → Pages
   - Source: Deploy from a branch
   - Branch: `main` / `root`
   - Click Save

5. **Wait for deployment**
   - The first workflow run will generate a new guide
   - GitHub Pages will build and deploy your site
   - Visit `https://yourusername.github.io/forexample.ai`

### Custom Domain (Optional)

1. **Add a CNAME file**
   ```bash
   echo "forexample.ai" > CNAME
   git add CNAME
   git commit -m "Add custom domain"
   git push
   ```

2. **Configure DNS**
   - Add a CNAME record pointing to `yourusername.github.io`
   - Or add A records pointing to GitHub Pages IPs
   - See [GitHub's documentation](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)

3. **Update `_config.yml`**
   ```yaml
   url: "https://forexample.ai"
   ```

## Configuration

### Adding Topics

**Interactive Method (Recommended)**:
```bash
npm run add-topic
```

This will interactively prompt you for:
- Topic title
- Difficulty level (beginner/intermediate/advanced)
- Tags (comma-separated)

**Manual Method**:
Edit `topics.json` directly:

```json
{
  "title": "Your Topic Title",
  "difficulty": "beginner|intermediate|advanced",
  "tags": ["tag1", "tag2", "tag3"]
}
```

**View Popular Tags**:
```bash
npm run show-tags
```

See `CONTENT_STRATEGY.md` for comprehensive content planning guidance.

### Customizing the Design

- **Colors**: Edit CSS variables in `assets/css/main.css`
- **Layout**: Modify templates in `_layouts/`
- **Components**: Edit includes in `_includes/`

### Adjusting Content Generation

Edit `scripts/generate-guide.js` to:
- Change the AI model (currently using NVIDIA's Llama 3.1 70B - see other free models at build.nvidia.com)
- Modify the prompt for different content styles
- Adjust the guide structure or format

### Configuring Images

The site automatically fetches images from Unsplash for each guide:

**Using Unsplash API (Recommended)**:
1. Get a free API key from [Unsplash Developers](https://unsplash.com/developers)
2. Add it as a GitHub secret: `UNSPLASH_ACCESS_KEY`
3. Update `.github/workflows/generate-content.yml` to include:
   ```yaml
   env:
     ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
     UNSPLASH_ACCESS_KEY: ${{ secrets.UNSPLASH_ACCESS_KEY }}
   ```

**Without API Key**:
- The script uses Unsplash's source API (rate-limited, less reliable)
- Images are still functional but may occasionally fail to fetch

**Switching to AI-Generated Images**:
To use DALL-E or Stable Diffusion instead:
1. Update `scripts/generate-guide.js` - replace the `fetchAndSaveImage` function
2. Add appropriate API keys to GitHub secrets
3. Update image generation logic to call your chosen API

**Adding Images to Existing Guides**:
Add these fields to the front matter of any guide:
```yaml
image: "/assets/images/guides/your-image.jpg"
image_credit: "Photographer Name"
image_credit_url: "https://unsplash.com/@photographer"
```

## Available Commands

```bash
# Generate a new guide manually
npm run generate

# Check all guides for broken links
npm run check-links

# Add a new topic interactively
npm run add-topic

# Show most used tags
npm run show-tags
```

## Project Structure

```
forexample.ai/
├── .github/workflows/
│   └── generate-content.yml       # GitHub Actions workflow (daily at 10am UTC)
├── _layouts/
│   ├── default.html               # Base template
│   ├── guide.html                 # Guide page template
│   └── home.html                  # Homepage template
├── _includes/
│   ├── header.html                # Site header
│   ├── footer.html                # Site footer
│   └── guide-card.html            # Guide preview card
├── _guides/                       # AI-generated guides (auto-created)
├── assets/
│   ├── css/main.css              # Site styling
│   ├── js/main.js                # Interactive features
│   └── images/guides/            # Guide images (auto-fetched)
├── scripts/
│   ├── generate-guide.js         # Content generation script
│   ├── check-links.js            # Link validation script
│   └── add-topic.js              # Interactive topic adding tool
├── topics.json                    # Curated AI topics (50+ topics)
├── generated-topics.json          # Tracking file
├── CONTENT_STRATEGY.md            # Content planning guide
├── _config.yml                    # Jekyll configuration
├── index.html                     # Homepage
├── package.json                   # Node dependencies
└── README.md                      # This file
```

## Guide Format

Each guide includes:
- **Introduction**: What you'll learn
- **Prerequisites**: Required background (if any)
- **Step-by-step sections**: Clear explanations with headers
- **Real-world examples**: Practical applications
- **Try It Yourself**: Hands-on activities
- **Key Takeaways**: Summary bullet points
- **Further Reading**: Resources for deeper learning

## Troubleshooting

### Workflow fails with "NVIDIA_API_KEY not set"

Make sure you've added your API key as a GitHub secret (see GitHub Setup step 2).

### Site not updating after push

1. Check the Actions tab for workflow status
2. Ensure GitHub Pages is enabled in settings
3. Wait a few minutes for Pages deployment to complete

### Generated guide has formatting issues

Check the NVIDIA API response in the workflow logs. You may need to adjust the prompt in `generate-guide.js`.

### Running out of topics

The script will automatically reset and reuse topics when all have been generated. Edit `generated-topics.json` to manually reset.

## Cost Considerations

- **GitHub Pages**: Free for public repositories
- **GitHub Actions**: 2,000 minutes/month free for public repositories
- **NVIDIA API**: **Completely FREE** with generous rate limits
  - No credit card required
  - Access to powerful models like Llama 3.1 70B
  - Perfect for educational and personal projects

## Customization Ideas

- Add RSS feed for new guides
- Include image generation for guide headers
- Add user comments via GitHub Discussions
- Create themed collections of guides
- Add interactive code examples
- Implement multiple guides per workflow run
- Add a "request a topic" feature via GitHub Issues

## Contributing

Contributions are welcome! Feel free to:
- Add new topics to `topics.json`
- Improve the design and layout
- Enhance the content generation prompt
- Add new features

## License

MIT License - feel free to use this for your own educational sites!

## Acknowledgments

- Built with [Jekyll](https://jekyllrb.com/)
- Powered by [NVIDIA AI](https://build.nvidia.com/) - free AI models
- Hosted on [GitHub Pages](https://pages.github.com/)
- Design inspired by [Instructables](https://www.instructables.com/)
- Images from [Unsplash](https://unsplash.com/)
