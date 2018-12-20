const axios = require('axios')

module.exports = app => {
  app.log('Yay, the app was loaded!')

  app.on('pull_request.opened', async context => {
    const {owner, repo} = context.repo({path: '.github/auto-assign.yml'})
    const p = context.payload

    if (p.pull_request.assignees.length) {
      return
    }

    let cfg = await context.config('auto-assign.yml', {})

    /* randomly select a user and assign the PR */
    cfg.users = cfg && cfg.users && cfg.users.filter((user) => user !== p.pull_request.user.login)

    if (!cfg || !cfg.users || !cfg.users.length) {
      /* comment on the PR, no users could be found */
      await context.github.issues.createComment({
        owner: owner,
        repo: repo,
        number: p.number,
        body: 'Could not auto-assign the PR because no users have been found. Make sure the **`.github/auto-assign.yml`** file exists and contains a `users` entry array'
      })
      return
    }

    const assignedUserIndex = Math.floor(Math.random() * cfg.users.length)
    const githubUser = cfg.users[assignedUserIndex]

    await context.github.issues.addAssignees({
      owner: owner,
      repo: repo,
      number: p.number,
      assignees: [githubUser]
    })

    /* post Slack message */
    if (cfg.slack_channel_hook && cfg.slack_user_ids && cfg.slack_user_ids[githubUser]) {
      const slackHandle = '@' + cfg.slack_user_ids[githubUser].replace(/^@/, '')
      await axios.post(cfg.slack_channel_hook, {
        channel: slackHandle,
        text: `Hey <${slackHandle}>, you have been assigned as a reviewer for the following PR: <${p.pull_request.url}|${p.pull_request.title}>`
      })
    }
  })
}
