# This is currently not used anymore 

# Probot: Auto Assign Pull Requests

> A GitHub App that adds assignees to newly created pull requests.

## Usage
1. [Install GitHub app](https://github.com/apps/bitstone-pull-requests).
2. Create `.github/auto-assign.yml` in your repository.

```yaml
# GitHub usernames from which the app will randomly choose an assignee
users:
  - user1
  - user2


# slack channel incoming webhook URL
slack_channel_hook: http://slack_channel_hook.com

# slack handles for each of the users mentioned above (github_user: slack_id)
# Notice the map between github username and slack user_id
# notice the double quotes around user id 
# "@" is optional
slack_user_ids:
  - radugroza: "@U00022"


```
## Setup

```sh
# Install dependencies
npm install

# Run the bot
npm start
```

## Contributing

If you have suggestions for how auto-assign-issues could be improved, or want to report a bug, open an issue! We'd love all and any contributions.

For more, check out the [Contributing Guide](CONTRIBUTING.md).
