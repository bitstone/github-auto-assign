const slackAPI = require('./util/slack')
const codeReviewLabel = 'Code Review required :grimacing:'

/**
 * Assign github label. First, attempt to create it to make sure it exists.
 *
 * @param context
 * @param owner
 * @param repo
 * @return {Promise<void>}
 */
const assignLabel = async function (context, owner, repo) {
  try {
    /* create label if it does not exist */
    await context.github.issues.createLabel({owner, repo, name: codeReviewLabel, color: 'f4adae'})
  } catch (e) {
  }

  /* assign it */
  try {
    await context.github.issues.addLabels({owner, repo, number: context.payload.number, labels: [codeReviewLabel]})
  } catch (e) {
  }
}

module.exports = app => {
  app.log('Yay, the app was loaded!')

  /**
   * On PR opened =>
   * 1. auto-assign the ticket
   * 2. add a label "Code Review Required"
   */
  app.on('pull_request.opened', async context => {
    const {owner, repo} = context.repo({path: '.github/auto-assign.yml'})
    const p = context.payload

    /**
     * add the "Code Review required" label
     */
    await assignLabel(context, owner, repo)

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
  })

  /**
   * On PR assigned -> notify slack user about assignment
   */
  app.on('pull_request.assigned', async context => {
    const {owner, repo} = context.repo({path: '.github/auto-assign.yml'})
    const p = context.payload
    if (!p.pull_request.assignees.length) {
      return
    }

    let cfg = await context.config('auto-assign.yml', {})
    if (!cfg || !cfg.users || !cfg.users.length) {
      /* comment on the PR, no users could be found */
      await context.github.issues.createComment({
        owner: owner,
        repo: repo,
        number: p.number,
        body: 'Could not send slack notification because no users have been found. Make sure the **`.github/auto-assign.yml`** file exists and contains a `users` entry array'
      })
      return
    }

    p.pull_request.assignees.forEach(async user => {
      /* post Slack message */
      await slackAPI.sendMessage(cfg, user.login, `you have been assigned as a reviewer for the following PR: <${p.pull_request.html_url}|${p.pull_request.title}>`)
    })
  })

  /**
   * When a review is submitted, check its state. if "changes_requested" => notify the PR opener on slack
   */
  app.on('pull_request_review.submitted', async context => {
    const {owner, repo} = context.repo({path: '.github/auto-assign.yml'})
    const githubUser = context.payload.pull_request.user.login

    if (!githubUser) {
      return
    }

    /* remove the CR required label */
    if (context.payload.review.state !== 'commented') {
      try {
        await context.github.issues.removeLabel({
          owner,
          repo,
          number: context.payload.pull_request.number,
          name: codeReviewLabel
        })
      } catch (e) {}
    }

    /* if other review type, ignore */
    if (context.payload.review.state !== 'changes_requested') {
      return
    }

    let cfg = await context.config('auto-assign.yml', {})
    await slackAPI.sendMessage(cfg, githubUser, `changes have been requested by *${context.payload.review.user.login}* on the following PR: <${context.payload.pull_request.html_url}|${context.payload.pull_request.title}>`)
  })

  /**
   * On PR labeled, check if added label is CR required and send slack message to the user assigned to the PR
   */
  app.on('pull_request.labeled', async context => {
    const pr = context.payload.pull_request
    const label = context.payload.label

    /**
     * if from bot, do not resend slack notifications
     * label is assigned from script when PR is created. we do not need to send slack notifications then
     */
    if (!label || label.name !== codeReviewLabel || context.payload.sender.login === 'bitstone-pull-requests[bot]') {
      return
    }

    if (!pr.assignees.length) {
      return
    }

    let cfg = await context.config('auto-assign.yml', {})

    pr.assignees.forEach(async user => {
      await slackAPI.sendMessage(cfg, user.login, `The following PR requires your attention: <${pr.html_url}|${pr.title}>. Review the changes and approve them or request some more:)`)
    })
  })
}
