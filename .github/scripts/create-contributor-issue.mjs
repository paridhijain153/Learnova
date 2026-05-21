/**
 * Script to create contributor-friendly issues for Learnova.
 *
 * Usage:
 *   GITHUB_TOKEN=<your_pat> node .github/scripts/create-contributor-issue.mjs
 *
 * Requirements:
 *   - Node.js 18+ (uses native fetch)
 *   - A GitHub Personal Access Token with `repo` scope set as GITHUB_TOKEN env var.
 */
const OWNER = "Premshaw23";
const REPO = "Learnova";
const TOKEN = process.env.GITHUB_TOKEN;

if (!TOKEN) {
  console.error("Error: GITHUB_TOKEN environment variable is not set.");
  process.exit(1);
}

const ISSUES = [
  {
    title: "FEATURE: Add Pagination & Search to API List Endpoints",
    body: `## 📝 Description

Currently, several API endpoints (like \`/api/exceptions/list\`, activity logs, etc.) return all records without pagination. This causes performance issues with large datasets and poor user experience.

## 🎯 Problem

- No pagination support means large datasets are loaded entirely into memory
- No search/filter capabilities on list endpoints
- Inefficient database queries for large collections
- Poor UX on slower networks

## 💡 Solution

Implement pagination and search filtering across key API endpoints:

### 1. **Pagination Support**
- Add \`page\` and \`limit\` query parameters to list endpoints
- Return metadata: \`total\`, \`page\`, \`totalPages\`, \`hasNextPage\`
- Use MongoDB's \`skip()\` and \`limit()\` methods

### 2. **Search/Filter Support**
- Add \`search\` parameter for text-based filtering
- Add \`sortBy\` and \`sortOrder\` parameters
- Implement field-specific filters where applicable

### 3. **API Endpoints to Update**
- \`/api/exceptions/list\`
- \`/api/exceptions/all\`
- Any other list-returning endpoints

## 📌 API Response Format

\`\`\`javascript
{
  success: true,
  data: [...],
  pagination: {
    total: 100,
    page: 1,
    limit: 10,
    totalPages: 10,
    hasNextPage: true
  }
}
\`\`\`

## ✅ Acceptance Criteria

- [ ] Pagination implemented on all list endpoints
- [ ] Search functionality working with case-insensitive matching
- [ ] Sorting options available (ascending/descending)
- [ ] API response includes pagination metadata
- [ ] Error handling for invalid page numbers
- [ ] Frontend updated to use pagination (if applicable)
- [ ] All existing tests passing
- [ ] Documentation updated with new query parameters

## 🛠️ Tech Stack

- **Backend:** Node.js, Express, MongoDB
- **Frontend:** React (for pagination UI)

## 🎓 Skills You'll Use

- MongoDB query optimization
- REST API design
- Database indexing
- Frontend pagination UI

## 📚 Resources

- [MongoDB Pagination Guide](https://docs.mongodb.com/drivers/node/)
- [REST API Best Practices](https://restfulapi.net/paging/)
- [Cursor-based vs Offset Pagination](https://www.apollographql.com/docs/apollo-server/data/pagination/)

## 🏷️ Labels

Good for: GSSoC contributors, intermediate level

---

**Questions?** Feel free to ask in the comments or reach out to the maintainers!
`,
    labels: ["enhancement", "gssoc-26", "good-first-issue", "backend", "React", "Node.js", "MongoDB"],
  },
];

async function createIssue(issue) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/issues`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `token ${TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(issue),
  });

  const data = await response.json();
  if (response.ok) {
    console.log(`✅ Created issue #${data.number}: ${data.title}`);
    console.log(`   🔗 ${data.html_url}`);
    return data;
  } else {
    console.error(
      `❌ Failed to create "${issue.title}": ${data.message || JSON.stringify(data)}`
    );
    throw new Error(data.message);
  }
}

console.log(`🚀 Creating contributor issue on ${OWNER}/${REPO}...\n`);

for (const issue of ISSUES) {
  try {
    const createdIssue = await createIssue(issue);
    console.log(`\n📋 Issue Details:`);
    console.log(`   Number: #${createdIssue.number}`);
    console.log(`   Title: ${createdIssue.title}`);
    console.log(`   State: ${createdIssue.state}`);
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
  // Small delay to avoid rate-limiting
  await new Promise((resolve) => setTimeout(resolve, 500));
}

console.log("\n✨ Issue created successfully!");
