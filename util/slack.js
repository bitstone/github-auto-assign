const axios = require('axios')

/**
 * Send a Slack message to a github user based on the configuration file
 *
 * @param {Object} cfg
 * @param {String} githubUser
 * @param {String} message
 * @returns {Promise<void>}
 */
async function sendMessage (cfg, githubUser, message) {
  let slackHandle = cfg && cfg.slack_user_ids && cfg.slack_user_ids[githubUser]

  if (slackHandle && cfg.slack_channel_hook) {
    slackHandle = '@' + slackHandle.replace(/^@/, '')

    return axios.post(cfg.slack_channel_hook, {
      channel: slackHandle,
      text: `Hey <${slackHandle}>, ${message}`
    })
  }
}

module.exports = sendMessage
