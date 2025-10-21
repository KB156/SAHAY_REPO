# SAHAY.AI

**Software-Assisted Help & Augmented Yield**

SAHAY.AI is a next-generation, smart multimodal AI assistant designed to solve all technical software errors in real time. It functions as an "over-the-shoulder" digital expert, guiding non-technical users through complex software tasks step-by-step in their preferred language.

## 💡 What SAHAY.AI Does

The core capability of SAHAY.AI is its real-time **"guide-and-verify" loop**:

1. **Problem Detection**: When a user is stuck on a website and an error pops up, they start a session with the tool.

2. **Multimodal Input**: The system watches their screen and listens to their voice as they explain the problem. By seeing the error message and hearing the user's frustration, the AI instantly understands the exact issue.

3. **Guided Instruction**: It delivers a single, spoken instruction (e.g., "First, click the 'Settings' button in the top-right corner") and an Augmented Reality (AR) highlight on the screen so the user can't miss the correct button.

4. **Verification**: The system then pauses and monitors the user's mouse/keyboard actions to verify task completion before giving the next instruction, patiently walking them through the solution.

This system aims to revolutionize digital accessibility in India by helping non-technical users with government services like AADHAAR or bills.

## ✨ Core Features & Services

| Feature | Description |
|---------|-------------|
| **Real-Time, Step-by-Step Guidance** | Provides live, spoken instructions to walk users through a problem in their preferred language. |
| **Multimodal Problem Diagnosis** | Automatically identifies the issue by listening to the user's description (audio) and watching their screen (video). |
| **On-Screen Visual Assistance** | Draws circles, arrows, and highlights (AR components) on the user's screen to show them exactly where to click. |
| **Instant & On-Demand Support** | Acts as an immediate, 24/7 expert technician, eliminating the need to wait for human support. |
| **Contextual Language Support** | Designed for the Indian audience, supporting spoken problems in Hindi, English, or "Hinglish". |

## 🎯 Objectives

The main goals for the SAHAY.AI project are:

- **Empower Non-Technical Users**: To empower users, regardless of their technical skill level, to resolve complex software issues independently, bridging the "confidence gap".

- **Minimize User Frustration**: To create a calm, guided, and error-proof experience by removing the stress and guesswork of navigating confusing software menus.

- **High-Fidelity Problem Diagnosis**: To move beyond simple keyword-based chatbots by fusing audio intent with the visual state of the screen to diagnose the true, contextual root cause.

- **Reduce Dependency**: To minimize dependency on human customer support services by over 70%.

## 🏗 System Architecture

The system works through a continuous cycle of four stages: **Perception → Cognition → Action → Verification**.

### Stage 1: Perception Engine ("Senses")

Converts raw data streams into structured, meaningful information, packaged as a single "State Snapshot" JSON object.

| Pipeline | Raw Input Data | Processes | Structured Output |
|----------|----------------|-----------|-------------------|
| **Audio** | Raw Audio Stream (Microphone) | Speech-to-Text (STT) model | Transcript_Text |
| **Screen** | Raw Screen Stream (Desktop Video Feed) | UI Element Detector (e.g., YOLO) + OCR | UI_BBoxes + Screen_Text |
| **Interaction** | Raw Interaction Events (Mouse/Keyboard) | Interaction Parser | User_Action |

### Stage 2: Cognition Engine ("Brain")

The central LLM/VLM that receives the State Snapshot, understands the context, and creates a solution.

- **State Fusion**: Combines all perception outputs for contextual understanding.
- **Problem Diagnosis**: Analyzes the complete state to identify the problem and its root cause (e.g., Login_Fail due to Empty_Password_Field).
- **Plan Generation (RAG)**: Uses the diagnosis to query a Knowledge Base (Vector Database) of troubleshooting guides.
- **Output**: A Solution_Plan (list of steps and verification conditions) and the Current_Step.

### Stage 3: Action Engine ("Instructor")

Delivers the guidance plan to the user in a natural, multimodal form.

- **Guidance Generation**: Generates the human-friendly instruction (Guide_Text).
- **AR Overlay Generation**: Identifies the target region on the screen and generates AR_Data (e.g., coordinates for a red box highlight).
- **Speech Generation**: Sends the Guide_Text to a Text-to-Speech (TTS) model to create a Generated_Audio_Stream.

### Stage 4: Verification Loop ("Feedback")

The critical step where the agent pauses, watches, and waits for a new user action.

- Compares the new User_Action against the expected verify_condition.
- **If Condition Met**: Un-pauses the Cognition Engine to load the next step.
- **If Condition Not Met**: Alerts the Cognition Engine, which generates a corrective instruction, and the loop repeats on the current step.

## 💻 Technology Stack

| Component | Technology / Model Used |
|-----------|-------------------------|
| **Cognition Engine** | Gemini 1.5 Pro |
| **Language Models** | GPT/LLAMA/Claude |
| **Speech-to-Text (STT)** | Google Speech-to-Text / Whisper |
| **UI Element Detection** | YOLOv8 Model |
| **OCR** | Google Cloud Vision OCR / EasyOCR |
| **Text-to-Speech (TTS)** | Google Text-to-Speech / gTTS / Coqui / Amazon Polly |
| **Backend** | Python (FastAPI/Flask) / Node.js |
| **State Management** | Redis / Postgres |
| **Knowledge Base (RAG)** | Vector Database (FAISS / Pinecone) |

## 🚀 Getting Started

*Instructions for installation and setup will be added here.*

## 📝 License

*License information will be added here.*

## 🤝 Contributing

*Contribution guidelines will be added here.*

## 📧 Contact

*Contact information will be added here.*
