const { sources, workspace, commands } = require("coc.nvim"); // Import Base configuration for CoC
const { Octokit } = require("@octokit/rest");

const fetchGitHubIssues = (token, repos, username, mineOnly) => {
  const octokit = new Octokit({
    auth: token,
  });

  return octokit.issues.list().then((issues) =>
    issues.data.map((issue) => ({
      repo: issue.repository.name,
      gid: issue.number,
      description: issue.title,
    }))
  );
};

async function listIssuesCommand(token, repos, username, mineOnly) {
  fetchGitHubIssues(token, repos, username, mineOnly);
}

exports.activate = async (context) => {
  // fetch configuration for the extension from CocConfig
  const config = workspace.getConfiguration("gh");

  // Extract Config Dict into respective components.
  const token = config.get("token");
  const repos = config.get("repos");
  const username = config.get("username");
  const mineOnly = config.get("mineOnly");

  if (!token) {
    workspace.showMessage(
      "GitHub Token configuration missing. Please run :CocConfig to setup access Token",
      "warning"
    );
    return;
  }

  let issues = [];
  try {
    issues = await fetchGitHubIssues(token, repos, username, mineOnly);
  } catch (error) {
    workspace.showMessage(
      "[coc-git-complete] Failed to fetch GitHub issus. Check :CocOpenLog for details.",
      "error"
    );
    console.error("Failed to fetch GitHub issues due to ", error);
  }

  let source = {
    name: "git-complete",
    triggerOnly: false,
    doComplete: async () => {
      return {
        items: issues.map((issue) => {
          return {
            word: `${issue.gid}: ${issue.description}`,
            abbr: `${issue.repo} -> ${issue.gid}: ${issue.description}`,
          };
        }),
      };
    },
  };

  context.subscriptions.push(sources.createSource(source));
  context.subscriptions.push(
    commands.registerCommand("gh.issues", () =>
      listIssuesCommand(token, repos, username, mineOnly)
    )
  );
};
