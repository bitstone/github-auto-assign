const slackAPI = require('./util/slack')

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
    await slackAPI.sendMessage(cfg, githubUser, `you have been assigned as a reviewer for the following PR: <${p.pull_request.html_url}|${p.pull_request.title}>`)
  })

  app.on('pull_request_review.submitted', async context => {
    const githubUser = context.payload.pull_request.user.login

    if (!githubUser) {
      return
    }

    /* if other review type, ignore */
    if (context.payload.review.state !== 'changes_requested') {
      return
    }

    let cfg = await context.config('auto-assign.yml', {})
    await slackAPI.sendMessage(cfg, githubUser, `changes have been requested by *${context.payload.review.user.login}* on the following PR: <${context.payload.pull_request.html_url}|${context.payload.pull_request.title}>`)
  })

  /**
   * On PR synchronize, send slack message to the user assigned to the PR
   */
  app.on('pull_request.synchronize', async context => {
    const pr = context.payload.pull_request

    if (!pr.assignees.length) {
      return
    }

    let cfg = await context.config('auto-assign.yml', {})

    pr.assignees.forEach(async user => {
      await slackAPI.sendMessage(cfg, user.login, `a new update has been pushed on your assigned PR: <${pr.html_url}|${pr.title}>. Review the changes and approve them or request some more:)`)
    })
  })
}
