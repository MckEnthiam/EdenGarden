# Eden Garden

Eden Garden is a modern application designed to manage documents, compartments, and contradictions with an integrated AI-powered chat and analysis system.

## Features

- **Document Management**: Upload and organize documents within compartments.
- **AI Chat**: Interact with your documents using advanced LLM providers (Anthropic, OpenAI, Groq, Google).
- **Contradiction Detection**: Automatically identify contradictions within your document sets.
- **Quiz & Exams**: Generate quizzes and exams based on your content for learning and verification.
- **Local-First**: Works locally with a Python backend and ChromaDB for vector storage.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Docker](https://www.docker.com/) (Recommended for the backend)
- [NPM](https://www.npmjs.com/)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/EdenGarden.git
cd EdenGarden
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
```

### 3. Start the Backend (Docker - Recommended)

To avoid Python dependency and import issues, it is highly recommended to run the backend using Docker:

- **Windows**: Double-click `start-docker.bat` or run:
  ```bash
  docker compose up --build -d
  ```
- **Linux/Mac**: Run:
  ```bash
  ./start-docker.sh
  ```

### 4. Start the Frontend & Electron App

In a new terminal, install dependencies and start the development environment:

```bash
npm install
npm run dev
```

The Electron app will automatically detect the backend running on port 8000 and connect to it.

## Development

If you prefer to run the backend without Docker:

1. Create a virtual environment in the `backend/` directory.
2. Install dependencies: `pip install -r backend/requirements.txt`
3. Start the backend: `python backend/main.py`

## License

[MIT License](LICENSE)
