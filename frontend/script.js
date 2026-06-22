let analyzeBtn=document.querySelector("#btn");
let resumeInput=document.querySelector("#resume");
let resultSec=document.querySelector("#result");
console.log(resultSec);
function parseScoreToPercent(scoreStr) {
    const match = String(scoreStr).match(/(\d+(\.\d+)?)\s*\/\s*(\d+)/);
    if (!match) return 0;
    const numerator = parseFloat(match[1]);
    const denominator = parseFloat(match[3]);
    return Math.round((numerator / denominator) * 100);
}
async function getAnalysis() {
    try {
        const file = resumeInput.files[0];
        analyzeBtn.disabled = true;
        analyzeBtn.textContent = "ANALYZING...";
        resultSec.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Analyzing your resume, this may take a few seconds...</p>
            </div>
        `;
        const formData = new FormData();

        formData.append("resume", file);
        const jobDescription = document.querySelector("#jobDescription").value;
        formData.append("jobDescription", jobDescription);
        
        const response = await fetch(
            `${API_BASE_URL}/upload`,
            {
                method: "POST",
                body: formData
            }
        );

        console.log("Fetch completed");
        const data = await response.json();
        const analysis = data.analysis;
        const structuredData = data.structuredData;
        const atsScore = data.atsScore;
        const jobMatch = data.jobMatch;
        const suggestedRoles = data.suggestedRoles || [];
        const interviewQuestions = data.interviewQuestions || [];
        console.log("Data received:", data);
        if (!response.ok || data.error) {
            resultSec.innerHTML = `
                <div class="section">
                    <h3>⚠️ Something went wrong</h3>
                    <p>${data.error || "Unknown error occurred. Please try again."}</p>
                </div>
            `;
            return;
        }
        console.log("Updating UI");

        
       const scorePercent = parseScoreToPercent(analysis.score);

        resultSec.innerHTML = `
            <div class="section section-score">
                <h3>Resume Score: ${analysis.score}</h3>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${scorePercent}%"></div>
                </div>
            </div>

            <div class="section section-analysis">
                <h3>Strengths ✅</h3>
                <ul>
                    ${(analysis.strengths || []).map(s => `<li>${s}</li>`).join("")}
                </ul>
            </div>

            <div class="section section-analysis">
                <h3>Weaknesses ⚠️</h3>
                <ul>
                    ${(analysis.weaknesses || []).map(w => `<li>${w}</li>`).join("")}
                </ul>
            </div>

            <div class="section section-analysis">
                <h3>Suggestions 💡</h3>
                <ul>
                    ${(analysis.suggestions || []).map(s => `<li>${s}</li>`).join("")}
                </ul>
            </div>

            <div class="section section-ats">
                <h3>ATS Compatibility Score: ${atsScore.overallScore}%</h3>
                <div class="progress-bar">
                    <div class="progress-fill ats-fill" style="width: ${atsScore.overallScore}%"></div>
                </div>
                <ul>
                    ${atsScore.breakdown
                        .map(check => `<li>${check.passed ? "✅" : "⚠️"} <b>${check.name}</b> (${check.score}/10): ${check.message}</li>`)
                        .join("")}
                </ul>
            </div>

            ${suggestedRoles.length > 0 ? `
                <div class="section section-roles">
                    <h3>Suggested Roles 🎯</h3>
                    <ul>
                        ${suggestedRoles.map(r => `<li><b>${r.title}</b>: ${r.reason}</li>`).join("")}
                    </ul>
                </div>
            ` : ""}

            ${jobMatch ? `
                <div class="section section-match">
                    <h3>Job Match: ${jobMatch.matchPercentage}%</h3>
                    <div class="progress-bar">
                        <div class="progress-fill match-fill" style="width: ${jobMatch.matchPercentage}%"></div>
                    </div>
                    <p><b>✅ Matched Skills:</b> ${jobMatch.matched.length > 0 ? jobMatch.matched.join(", ") : "None"}</p>
                    <p><b>⚠️ Missing Skills:</b> ${jobMatch.missing.length > 0 ? jobMatch.missing.join(", ") : "None"}</p>
                </div>
            ` : `
                <div class="section">
                    <p>💡 Paste a job description above to see how well your resume matches a specific role.</p>
                </div>
            `}

            ${interviewQuestions.length > 0 ? `
                <div class="section section-questions">
                    <h3>Interview Questions 🎤</h3>
                    <ul>
                        ${interviewQuestions
                            .map(q => `<li><b>${q.type === "technical" ? "🔧" : "💬"} ${q.question}</b><br><span class="question-meta">Based on: ${q.basedOn}</span></li>`)
                            .join("")}
                    </ul>
                </div>
            ` : ""}

            <button type="button" id="resetBtn" class="reset-btn">Analyze Another Resume</button>
        `;

        document.querySelector("#resetBtn").addEventListener("click", () => {
            resumeInput.value = "";
            document.querySelector("#jobDescription").value = "";
            resultSec.innerHTML = `<p class="placeholder-text">Upload your resume and click "Analyze Resume" to see your results here.</p>`;
            window.scrollTo({ top: 0, behavior: "smooth" });
        });

        resultSec.scrollIntoView({ behavior: "smooth", block: "start" });

        console.log("UI updated");
        

    } catch (err) {
        console.error("ERROR:", err);
        resultSec.innerHTML = `
            <div class="section">
                <h3>⚠️ Something went wrong</h3>
                <p>${err.message || "Please check your connection and try again."}</p>
            </div>
        `;
    } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = "ANALYZE RESUME";
    }
}


analyzeBtn.addEventListener("click", async (event) => {

    event.preventDefault();
    event.stopPropagation();
    if (resumeInput.files.length === 0) {
        alert("Please upload your resume first");
        return;
    }

    let file = resumeInput.files[0];

    if (file.type !== "application/pdf") {
        alert("Please upload a PDF file only");
        return;
    }

    await getAnalysis();

});