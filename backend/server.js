
require("dotenv").config();
const {
    checkTextExtractionQuality,
    checkSectionHeadings,
    checkContactInfo,
    checkDateConsistency,
    checkJDKeywordOverlap,
    calculateATSScore
} = require("./atsChecks");
// console.log("FRONTEND_ORIGIN:", process.env.FRONTEND_ORIGIN);
// console.log("PORT:", process.env.PORT);
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY
);

const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    generationConfig: {
        maxOutputTokens: 6144
    }
});
console.log("UPDATED SERVER FILE RUNNING");
const fs = require("fs");
const pdfParse = require("pdf-parse");
console.log(pdfParse);
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const app = express();

const upload = multer({ storage: multer.memoryStorage() });

app.use(cors({
    origin: process.env.FRONTEND_ORIGIN
}));
app.get("/test", (req, res) => {
    res.send("CORS is working!");
});

app.get("/", (req, res) => {
    res.send("AI Resume Reviewer Backend Running");
});

app.get("/analysis", (req, res) => {

    res.json({
        score: "8.5/10",
        strengths: [
            "Good DSA skills",
            "Good Projects"
        ],
        weaknesses: [
            "Need backend skills"
        ],
        suggestions: [
            "Learn Node.js",
            "Build full-stack projects"
        ]
    });

});


app.post("/upload", upload.single("resume"), async (req, res) => {

    try {

        // const pdfData = await pdfParse(req.file.buffer);
        let pdfData;
        try {
            pdfData = await pdfParse(req.file.buffer);
        } catch (pdfErr) {
            console.log("PDF parsing failed:", pdfErr.message);
            return res.status(400).json({
                error: "We couldn't read this PDF file. It may be corrupted or saved in an unsupported format. Please try re-saving or re-exporting your resume as a PDF and upload again."
            });
        }
        const jobDescription = req.body.jobDescription || "";

        const combinedPrompt = `
            Return ONLY valid JSON.
            Do not use markdown.
            Do not use \`\`\`json.

            Analyze the resume below and return a single JSON object with this exact structure:

            {
              "structuredData": {
                "skills": [],
                "experience": [{"role": "", "company": "", "duration": "", "description": ""}],
                "education": [{"degree": "", "institution": "", "year": ""}],
                "projects": [{"name": "", "description": "", "technologies": []}],
                "contact": {"email": "", "phone": ""}
              },
              "analysis": {
                "score": "8/10",
                "strengths": [],
                "weaknesses": [],
                "suggestions": []
              },
              "jdSkills": [],
              "suggestedRoles": [
                    {"title": "", "reason": ""}
                ],
                "interviewQuestions": [
                    {"question": "", "type": "technical", "basedOn": ""}
                ]    
            }

            Rules:
            - "structuredData" is the extracted resume content. Never omit a key, use empty string or array if not found.
            - "analysis" is your assessment of the resume's overall quality.
            - "jdSkills" is a flat array of key skills, technologies, and qualifications mentioned in the Job Description below. If no Job Description is provided, return an empty array.
            - "suggestedRoles" should contain 2 to 4 job titles/roles that genuinely fit this resume's skills and experience level (e.g. "Backend Developer Intern", "Frontend Developer"), each with a one-sentence reason based on specific resume content. Be realistic about experience level, do not suggest senior roles for an entry-level resume.
            - "interviewQuestions" should contain 5 to 7 questions. Mix two types: "technical" (questions probing specific skills, especially any skills mentioned in the Job Description that are missing or weakly represented on the resume) and "behavioral" (questions based on specific projects or experience entries from the resume, asking the candidate to elaborate). For each question, "type" must be either "technical" or "behavioral", and "basedOn" should briefly state what resume or JD detail the question is targeting (e.g. "Missing skill: Docker" or "Project: Chat App"). If no Job Description is provided, base technical questions on the candidate's listed skills instead.
            
            Resume:
            ${pdfData.text}

            Job Description:
            ${jobDescription || "(none provided)"}
        `;

        console.log("Calling Gemini (single combined call)...");
        const result = await model.generateContent(combinedPrompt);
        let response = result.response.text();

        response = response
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();
        console.log("RAW GEMINI RESPONSE:", response);
        const parsed = JSON.parse(response);
        const { structuredData, analysis, jdSkills } = parsed;

        console.log("Parsed structuredData:", structuredData);
        console.log("Parsed analysis:", analysis);
        console.log("Parsed jdSkills:", jdSkills);

        const checks = [
            checkTextExtractionQuality(pdfData.text),
            checkSectionHeadings(pdfData.text),
            checkContactInfo(structuredData),
            checkDateConsistency(structuredData)
        ];

        const jdCheck = checkJDKeywordOverlap(structuredData.skills, jdSkills);
        if (jdCheck) {
            checks.push(jdCheck);
        }
        let jobMatch = null;
        if (jdCheck) {
            const totalJdSkills = jdCheck.matched.length + jdCheck.missing.length;
            const matchPercentage = totalJdSkills > 0
                ? Math.round((jdCheck.matched.length / totalJdSkills) * 100)
                : 0;

            jobMatch = {
                matchPercentage: matchPercentage,
                matched: jdCheck.matched,
                missing: jdCheck.missing
            };
        }
        const atsResult = calculateATSScore(checks);

        res.json({
            structuredData: structuredData,
            analysis: analysis,
            atsScore: atsResult,
            jobMatch: jobMatch,
            suggestedRoles: parsed.suggestedRoles || [],
            interviewQuestions: parsed.interviewQuestions || []
        });

        console.log("Response sent");

    } catch (err) {

        console.log(err);

        res.status(500).json({
            error: err.message
        });

    }

});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
