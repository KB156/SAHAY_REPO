# SAHAY (Software-Assisted Help & Augmented Yield) 🇮🇳

## Project Overview 📖

**SAHAY** is an intelligent, **multimodal AI support agent** providing real-time, interactive troubleshooting for software users in India. Functioning as a friendly expert looking over your shoulder, it guides users through confusing processes using **Hindi, English, or Hinglish**. By watching your screen share, listening to your voice, and tracking your mouse clicks, SAHAY understands the exact problem.

Powered by a fine-tuned **Google Gemini 1.5 Pro** model, **RAG**, and **YOLOv8**, SAHAY diagnoses issues contextually. It delivers clear, spoken instructions and uses on-screen "augmented reality" highlights to show exactly where to click. The core "guide-and-verify" loop ensures successful task completion, making complex digital tasks accessible to everyone. 🤝



---

## Core Features ✨

* **Real-Time Multimodal Diagnosis:** Fuses audio, screen visuals (OCR + UI elements), and interactions (clicks) for precise problem understanding.
* **Bilingual Conversational Guidance:** Offers natural, step-by-step voice guidance in **Hindi** and **English**, including mixed "Hinglish".
* **Augmented Reality (AR) Overlays:** Draws dynamic highlights (boxes, arrows) on the user's screen via WebSockets to pinpoint elements.
* **Intelligent Action Verification:** Monitors user actions to confirm step completion before proceeding, preventing errors.
* **Hybrid AI Engine:** Combines a fine-tuned Gemini 1.5 Pro, RAG for knowledge, and YOLOv8 for UI detection.
* **Scalable L1 Support:** Automates common troubleshooting tasks, available 24/7.

---

## Tech Stack 🛠️

* **Frontend:** React + TypeScript (Vite)
* **Backend:** Node.js + Express.js
* **Real-time Communication:** WebRTC (Media Streams), WebSockets (Commands/Control)
* **AI/ML APIs & Models:**
    * **Core Logic:** Fine-Tuned Google Gemini 1.5 Pro (via Vertex AI)
    * **Speech-to-Text:** Google Cloud Speech-to-Text API
    * **Text-to-Speech:** Google Cloud Text-to-Speech API
    * **Screen OCR:** Google Cloud Vision API
    * **Knowledge Retrieval (RAG):** Vector Database (e.g., Vertex AI Vector Search) + Embedding Model
    * **UI Element Detection:** Self-Hosted YOLOv8 Model
* **State Management:** Redis
* **Deployment:** Docker, Google Cloud Run / Google Kubernetes Engine (GKE)

---

## Project Status 🚀

**Live & Operational.** The SAHAY system is deployed and actively assisting users. Ongoing development focuses on expanding the knowledge base, improving model accuracy, and optimizing performance.

---

## Accessing the Application 🌐

SAHAY is typically integrated into the host application (e.g., a banking website, e-governance portal) via a "Help" button or widget.

1.  Navigate to the partner application incorporating SAHAY.
2.  Initiate a support session by clicking the designated "SAHAY Help" / "\hindi{सहायता}" button.
3.  Choose your preferred language (Hindi/English).
4.  Grant the necessary browser permissions for microphone and screen sharing when prompted.
5.  Describe your problem, and the AI agent will begin the guided troubleshooting process.

*(For developers contributing to the project, local development setup instructions can be found in `CONTRIBUTING.md` or the development wiki.)*

---

## Architecture Overview 🏗️

SAHAY operates on a continuous, real-time loop:

1.  **Perception:** Backend receives user streams/events. Google APIs & YOLOv8 process these into a structured "State Snapshot".
2.  **Cognition:** The snapshot + RAG context feeds the fine-tuned Gemini model, which diagnoses and generates a JSON plan for the next step.
3.  **Action:** Backend generates TTS audio and calculates AR overlay commands, sending both to the frontend.
4.  **Verification:** Backend pauses, monitors user actions against the plan's condition. On success, triggers the next Cognition step; on failure/timeout, triggers a re-prompt.



---

## Configuration (for Administrators/Deployers) ⚙️

The deployed application relies on environment variables for configuration:

* `GOOGLE_APPLICATION_CREDENTIALS`: Path to service account key file.
* `GEMINI_API_KEY` / `VERTEX_AI_PROJECT_ID` / `VERTEX_AI_LOCATION`: Credentials for the Gemini model endpoint.
* `PORT`: Server listening port.
* `REDIS_URL`: Connection string for the Redis instance.
* `VECTOR_DB_ENDPOINT`: URL and credentials for the RAG Vector Database.
* `YOLO_INFERENCE_URL`: Endpoint for the self-hosted YOLOv8 service.
* `ALLOWED_ORIGINS`: CORS configuration for trusted frontend domains.
* *(Add any other relevant deployment-specific variables)*

These are typically managed via the deployment platform (e.g., Cloud Run environment variables, Kubernetes Secrets).

---

## Future Work & Contributing 🚀

SAHAY is continuously evolving. Key areas for future development include:

* Expanding the RAG knowledge base for broader software/task support.
* Improving STT accuracy for diverse Indian accents and dialects.
* Optimizing end-to-end latency for a more fluid conversation.
* Adding support for more complex interactions (e.g., form filling, typing verification).
* Developing more sophisticated graceful degradation paths when the AI is uncertain.

Contributions are welcome! Please see `CONTRIBUTING.md` for guidelines on setting up a local development environment, coding standards, and pull request processes.

---

## License 📜

(Specify your chosen license here, e.g., MIT, Apache 2.0, or Proprietary)
