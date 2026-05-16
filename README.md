# Jarvis Techie

Jarvis Techie is an AI-powered voice assistant web application built with Next.js and deployed on Vercel. The app provides a simple browser-based interface where users can interact with an AI assistant using voice-based input.

## Live Demo

[Visit Jarvis Techie](https://jarvis-techie.vercel.app/)

## Overview

Jarvis Techie is designed as a modern AI voice assistant that allows users to start listening through the browser and interact with an intelligent assistant. The project focuses on creating a lightweight, responsive, and beginner-friendly AI assistant experience using modern web technologies.

This project demonstrates how voice interaction, frontend development, and AI-based assistant concepts can be combined into a simple web application.

## Features

- AI-powered assistant interface
- Voice-based interaction
- Start listening functionality
- Responsive web design
- Modern user interface
- Built with Next.js
- Developed using React and TypeScript
- Styled with Tailwind CSS
- Deployed on Vercel
- Beginner-friendly project structure

## Tech Stack

- Next.js
- React.js
- TypeScript
- JavaScript
- Tailwind CSS
- Vercel
- GitHub

## Project Structure

```text
jarvis-vercel/
├── public/
├── src/
├── .env.example
├── .gitignore
├── eslint.config.mjs
├── next.config.ts
├── next-env.d.ts
├── package.json
├── package-lock.json
├── postcss.config.mjs
├── README.md
└── tsconfig.json
```

## Getting Started

Follow the steps below to run this project locally.

### Prerequisites

Make sure you have the following installed on your system:

- Node.js
- npm
- Git

### Installation

Clone the repository:

```bash
git clone https://github.com/YOUR-USERNAME/jarvis-vercel.git
```

Navigate to the project directory:

```bash
cd jarvis-vercel
```

Install dependencies:

```bash
npm install
```

Create an environment file:

```bash
cp .env.example .env.local
```

Add the required environment variables inside `.env.local`.

Run the development server:

```bash
npm run dev
```

Open the project in your browser:

```text
http://localhost:3000
```

## Environment Variables

Create a `.env.local` file in the root directory and add the required environment variables.

Example:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

If your project uses AI APIs, authentication, or external services, add the required keys inside `.env.local`.

Do not push `.env`, `.env.local`, or secret API keys to GitHub.

## Deployment

This project is deployed using Vercel.

To deploy your own version:

1. Push the project to GitHub
2. Go to Vercel
3. Import your GitHub repository
4. Add environment variables if required
5. Deploy the project

## Files to Push to GitHub

```text
src/
public/
package.json
package-lock.json
next.config.ts
next-env.d.ts
tsconfig.json
postcss.config.mjs
eslint.config.mjs
README.md
.gitignore
.env.example
```

## Files Not to Push

```text
node_modules/
.next/
.vercel/
.env
.env.local
tsconfig.tsbuildinfo
```

## Recommended .gitignore

```gitignore
node_modules
.next
.vercel
.env
.env.local
*.tsbuildinfo
```

## Useful Commands

```bash
npm install
npm run dev
npm run build
npm start
```

## Future Improvements

- Add advanced AI response generation
- Improve voice recognition accuracy
- Add automatic recognition of my voice like " Hey Siri "
- Toggle Light / Dark mode
- Add chat history
- Add user authentication
- Add multilingual support
- Improve mobile responsiveness
- Add custom assistant commands
- Add **visual analysis for user inputs**, where the assistant can generate charts, summaries, and insights based on user-provided prompts, job data, resumes, or search results.
- Add **AI-powered job matching dashboard** to visually compare user skills with job requirements using match scores, missing skills, and recommended improvements.
- Add **structured job result cards** displaying job title, company, location, required skills, source link, and application status for better job search tracking.
- Add **job application analytics** with visual charts for saved, applied, shortlisted, rejected, and interview-stage applications.
- Currently if the user ask for job listing it only shows limited companies like anthropic , OpenAI , Microsoft , Groq , ... later I gonna integrate with all the companies.
- Plan to integrate an MCP server with a LiveKit-based voice agent, Sarvam/Saras-style speech-to-speech translation, live monitoring, visual presentations, and personalized greeting features to build a more interactive multilingual AI assistant experience.

## Author

**Nishith**

GitHub: [Your GitHub Profile](https://github.com/Techie03)

Github Portfolio :https://techie03.github.io/My-GitHub-Portfolio/

Github Portfolio repo : https://github.com/Techie03/My-GitHub-Portfolio/tree/main

## License

This project is open source and available under the MIT License.
