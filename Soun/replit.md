# Soun - Student Study Assistant Application

## Overview
Soun is a comprehensive student study assistant web application designed to enhance learning through intelligent document management, personalized support, and advanced voice interaction. Its core purpose is to provide robust document upload, storage, and retrieval mechanisms, seamlessly integrated with Soun, a global voice assistant that can access course-specific uploaded materials from anywhere in the application. The platform aims to streamline the study process by offering contextual AI responses based on a user's own learning materials, making it an indispensable tool for academic success.

## User Preferences
- Focus on voice-based interaction as the primary learning interface
- All uploaded course materials must be accessible to Soun
- Global accessibility - Soun should work from any page in the application
- Course-specific intelligent responses based on actual uploaded content

## System Architecture
The application is built with a modern web stack. The frontend uses **React with TypeScript** and Wouter for routing, styled with **shadcn/ui components and Tailwind CSS**. The backend is powered by **Express.js** with session-based authentication. **PostgreSQL** is used as the database, managed with **Drizzle ORM**. The **Web Speech API** is utilized for voice processing, enabling the intelligent content access functionality of Soun.

Key architectural decisions include:
- **Soun (Global Voice Assistant)**: A floating, persistent voice assistant accessible from any page, capable of contextual interaction.
- **Wake Word Detection**: Continuous background listening for the wake word "Soun" enables hands-free voice navigation throughout the entire application. Users can say commands like "Hi Soun, I want to study [course name]" to navigate directly to courses, or "Hi Soun, show me my courses" for navigation to different pages.
- **Voice-Activated Navigation**: Intelligent command parsing for natural language navigation commands, supporting course-specific navigation (by course name) and general page navigation (courses, settings, dashboard, etc.).
- **Course-Centric Design**: The application is structured around courses, with documents and AI interactions tied to specific course contexts.
- **Secure File Upload**: Multi-layered validation system protects against malicious file uploads while supporting common document formats. Modern formats (.docx, .pptx, .pdf) are strongly validated via magic number detection. Legacy formats (.doc, .ppt) include CFB/OLE container inspection with stream validation, though users are recommended to prefer modern formats for enhanced security. All files are validated in memory before being written to disk, with filename sanitization and comprehensive audit logging.
- **AI Integration**: Leverages OpenAI's GPT-4o for intelligent document analysis, content extraction, learning objective generation, contextual study questions, presentation feedback, and cross-file search.
- **Authentication**: Secure session-based user authentication with PostgreSQL for session persistence.
- **UI/UX**: Emphasis on a clean, intuitive interface with enhanced navigation, prominent course cards, and visually appealing voice assistant integration.
- **Voice Settings Persistence**: User voice preferences (selection, rate, pitch, volume) are saved locally and persist across sessions.
- **Cross-File Navigation**: AI-powered search and information synthesis across all uploaded documents, with automatic source attribution.
- **Course Exclusivity**: Strict isolation of documents to their respective courses, ensuring contextual relevance for Soun.
- **Quiz Functionality**: Post-explanation quizzes generate adaptive questions based on AI-processed document content, with intelligent evaluation and feedback.

## Security Architecture

### File Upload Security (November 2025)
The application implements a multi-layered defense-in-depth approach to file upload validation:

**Validation Pipeline:**
1. **Memory-based validation**: Files are buffered in memory and validated before any disk write
2. **Magic number detection**: The `file-type` library inspects file signatures to verify actual content type
3. **CFB/OLE parsing**: Legacy Office containers (.doc, .ppt) are parsed and validated using the CFB library to verify internal stream structure
4. **Strict allowlist**: Only validated formats are accepted (both modern and legacy Office formats)
5. **Filename sanitization**: All filenames sanitized with unique suffixes to prevent collisions
6. **Audit logging**: All validation attempts logged with detailed information
7. **Error handling**: HTTP 415 responses for unsupported/invalid file types

**Supported File Types:**
- **Modern Office documents**: DOCX, PPTX (strongly validated via magic number detection - ZIP-based, most secure)
- **Legacy Office documents**: DOC, PPT (validated via CFB/OLE structure parsing with stream inspection)
- **PDF**: Validated via magic number detection
- **Images**: JPEG, PNG, GIF (validated via magic number detection)
- **Plain text**: ASCII heuristic for files <1KB

**Not Supported:**
- **Legacy Excel**: .xls files are not supported (use .xlsx instead)
- **Unknown CFB containers**: CFB files without recognized Word/PowerPoint streams are rejected

**Security Implementation:**
- Modern formats (.docx, .pptx) are ZIP-based and validated via magic numbers (highest security)
- Legacy formats (.doc, .ppt) use CFB library to parse and validate internal structure:
  - PowerPoint: Validates presence of "PowerPoint Document", "Current User", or "Slide" streams
  - Word: Validates presence of "WordDocument", "1Table", or "0Table" streams
- Unknown or malformed CFB files are rejected with clear error messages
- All file validations occur in memory before disk write

**Known Limitations:**
- Plain text detection uses simple ASCII heuristics
- No antivirus scanning integrated (could be added as future enhancement)
- Legacy Excel (.xls) not supported due to complexity (use .xlsx instead)

## External Dependencies
- **OpenAI API**: Used for advanced AI capabilities including document analysis, content extraction, question generation, presentation analysis, and intelligent cross-file search (GPT-4o).
- **PostgreSQL**: Relational database used for storing application data, user information, documents, course details, and session data.
- **Drizzle ORM**: Used for interacting with the PostgreSQL database.
- **Multer**: Middleware for handling multipart/form-data, primarily for file uploads with memory storage.
- **file-type**: Magic number detection library for validating actual file content types.
- **cfb**: Compound File Binary (CFB/OLE) parser for validating legacy Office formats.