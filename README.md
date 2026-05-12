# StoryLens 📖✨

StoryLens is a modern, professional-grade web application that combines an immersive manga-reading experience with a powerful RAG-based (Retrieval-Augmented Generation) Q&A system. It leverages advanced AI models (Google Gemini) to interact with users, answer questions, and provide a seamless content consumption experience.

## 🌟 Features

*   **Immersive Manga Reader:** Multi-view modes, accessible keyboard controls, and a high-quality user interface for an optimal reading experience.
*   **Intelligent Q&A System (RAG):** Ask questions and get context-aware answers powered by Google Gemini AI and an integrated RAG pipeline.
*   **File Upload & Processing:** Drag-and-drop file upload pipelines with real-time feedback.
*   **Modern & Responsive UI:** Professional, dark-themed manga-inspired aesthetics with smooth animations, ensuring consistency across all devices.
*   **Persistent Theme Management:** Customizable viewing experiences.

## 🛠️ Technology Stack

*   **Frontend:** Next.js, React, TypeScript, Modern CSS / Tailwind (for responsive and dynamic design).
*   **Backend:** Python, FastAPI, PostgreSQL (via Render/Supabase) for robust API handling and database management.
*   **AI & ML Pipeline:** Google Gemini API (`google.genai`), HuggingFace for model deployment and RAG processing.
*   **Hosting:** Render (Backend), Vercel (Frontend), HuggingFace Spaces (AI Services).

## 📁 Project Structure

```text
storylen/
├── backend/            # FastAPI server, Database models, API endpoints
├── frontend/           # Next.js web application, UI components, pages
├── ai_service/         # AI pipelines, RAG implementations, Gemini integration
├── docs/               # Project documentation and specifications
└── render.yaml         # Render deployment configuration
```

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   Python (3.10+)
*   PostgreSQL
*   Google Gemini API Key

### 1. Backend Setup

```bash
cd backend
# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows use: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY, Database URL, etc.

# Run the backend server
uvicorn main:app --reload
```

### 2. Frontend Setup

```bash
cd frontend
# Install dependencies
npm install  # or yarn install / pnpm install

# Run the development server
npm run dev  # or yarn dev / pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### 3. AI Service Setup (If running separately)
```bash
cd ai_service
# Similar to backend, install requirements and run the specific AI pipeline scripts.
```

## ☁️ Deployment

*   **Backend:** Configured for deployment on Render via `render.yaml`.
*   **AI Services:** Can be deployed to HuggingFace Spaces using Docker.
*   **Frontend:** Optimized for Vercel deployment.

## 📄 License

This project is proprietary and confidential.
