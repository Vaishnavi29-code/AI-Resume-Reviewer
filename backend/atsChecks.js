// function checkTextExtractionQuality(text) {
//     if (!text || text.trim().length < 50) {
//         return {
//             name: "Text Extraction Quality",
//             passed: false,
//             score: 0,
//             message: "Resume text could not be extracted cleanly. This usually means the PDF uses images, unusual fonts, or complex formatting that real ATS systems also struggle with."
//         };
//     }

//     const totalChars = text.length;
//     const readableChars = (text.match(/[a-zA-Z0-9\s.,;:()\-]/g) || []).length;
//     const readableRatio = readableChars / totalChars;

//     if (readableRatio < 0.85) {
//         return {
//             name: "Text Extraction Quality",
//             passed: false,
//             score: 5,
//             message: "Resume contains a high amount of unusual characters, possibly from tables, columns, or special symbols that may confuse ATS parsers."
//         };
//     }

//     return {
//         name: "Text Extraction Quality",
//         passed: true,
//         score: 10,
//         message: "Resume text extracts cleanly, which is a good sign for ATS compatibility."
//     };
// }
function checkTextExtractionQuality(text) {
    if (!text || text.trim().length < 50) {
        return {
            name: "Text Extraction Quality",
            passed: false,
            score: 0,
            message: "Resume text could not be extracted cleanly. This usually means the PDF uses images, unusual fonts, or complex formatting that real ATS systems also struggle with."
        };
    }

    if (text.trim().length < 300) {
        return {
            name: "Text Extraction Quality",
            passed: false,
            score: 2,
            message: "Very little text was found in this resume. It may be too sparse, mostly image-based, or missing key content sections."
        };
    }

    const totalChars = text.length;
    const readableChars = (text.match(/[a-zA-Z0-9\s.,;:()\-]/g) || []).length;
    const readableRatio = readableChars / totalChars;

    if (readableRatio < 0.85) {
        return {
            name: "Text Extraction Quality",
            passed: false,
            score: 5,
            message: "Resume contains a high amount of unusual characters, possibly from tables, columns, or special symbols that may confuse ATS parsers."
        };
    }

    return {
        name: "Text Extraction Quality",
        passed: true,
        score: 10,
        message: "Resume text extracts cleanly, which is a good sign for ATS compatibility."
    };
}

function checkSectionHeadings(text) {
    const lowerText = text.toLowerCase();

    const requiredSections = {
        experience: ["experience", "work history", "employment"],
        education: ["education", "academic"],
        skills: ["skills", "technical skills", "competencies"],
        projects: ["projects"]
    };

    const found = [];
    const missing = [];

    for (const [section, keywords] of Object.entries(requiredSections)) {
        const hasSection = keywords.some(keyword => lowerText.includes(keyword));
        if (hasSection) found.push(section);
        else missing.push(section);
    }

    const score = Math.round((found.length / Object.keys(requiredSections).length) * 10);

    return {
        name: "Standard Section Headings",
        passed: missing.length === 0,
        score: score,
        message: missing.length === 0
            ? "All standard sections detected (experience, education, skills, projects)."
            : `Missing standard section headings for: ${missing.join(", ")}. ATS systems often look for these exact section names.`
    };
}

function checkContactInfo(structuredData) {
    const email = structuredData?.contact?.email || "";
    const phone = structuredData?.contact?.phone || "";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /[\d\-\+\(\)\s]{7,}/;

    const hasValidEmail = emailRegex.test(email.trim());
    const hasValidPhone = phoneRegex.test(phone.trim());

    let score = 0;
    if (hasValidEmail) score += 5;
    if (hasValidPhone) score += 5;

    let message;
    if (hasValidEmail && hasValidPhone) {
        message = "Email and phone number both detected in a valid format.";
    } else if (!hasValidEmail && !hasValidPhone) {
        message = "No valid email or phone number detected. ATS systems and recruiters need this to contact you.";
    } else {
        message = `${hasValidEmail ? "Phone number" : "Email"} missing or not detected in a valid format.`;
    }

    return {
        name: "Contact Information",
        passed: hasValidEmail && hasValidPhone,
        score: score,
        message: message
    };
}

function checkDateConsistency(structuredData) {
    const dateRegex = /\b(19|20)\d{2}\b/;

    const allEntries = [
        ...(structuredData?.experience || []),
        ...(structuredData?.education || [])
    ];

    if (allEntries.length === 0) {
        return {
            name: "Date Formatting",
            passed: false,
            score: 0,
            message: "No experience or education entries detected to check dates against."
        };
    }

    const entriesWithDates = allEntries.filter(entry => {
        const dateField = entry.duration || entry.year || "";
        return dateRegex.test(dateField);
    });

    const ratio = entriesWithDates.length / allEntries.length;
    const score = Math.round(ratio * 10);

    return {
        name: "Date Formatting",
        passed: ratio === 1,
        score: score,
        message: ratio === 1
            ? "All experience and education entries include clear dates."
            : `${allEntries.length - entriesWithDates.length} of ${allEntries.length} entries are missing clear dates. Consistent dates help ATS systems parse your timeline correctly.`
    };
}

function calculateATSScore(checks) {
    const totalScore = checks.reduce((sum, check) => sum + check.score, 0);
    const maxScore = checks.length * 10;
    const percentage = Math.round((totalScore / maxScore) * 100);

    return {
        overallScore: percentage,
        breakdown: checks
    };
}


function checkJDKeywordOverlap(resumeSkills, jdSkills) {
    if (!jdSkills || jdSkills.length === 0) {
        return null;
    }

    const normalize = (arr) => (arr || []).map(s => s.toLowerCase().trim());
    const resumeSkillsLower = normalize(resumeSkills);
    const jdSkillsLower = normalize(jdSkills);

    const matched = [];
    const missing = [];

    jdSkillsLower.forEach((skill, i) => {
        const isMatched = resumeSkillsLower.some(
            rs => rs.includes(skill) || skill.includes(rs)
        );
        if (isMatched) matched.push(jdSkills[i]);
        else missing.push(jdSkills[i]);
    });

    const overlapRatio = jdSkillsLower.length > 0
        ? matched.length / jdSkillsLower.length
        : 0;
    const score = Math.round(overlapRatio * 10);

    return {
        name: "Job Description Keyword Match",
        passed: overlapRatio >= 0.6,
        score: score,
        message: missing.length === 0
            ? "Resume covers all key skills mentioned in the job description."
            : `Missing skills from job description: ${missing.join(", ")}.`,
        matched: matched,
        missing: missing
    };
}

module.exports = {
    checkTextExtractionQuality,
    checkSectionHeadings,
    checkContactInfo,
    checkDateConsistency,
    checkJDKeywordOverlap,
    calculateATSScore
};